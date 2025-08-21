/**
 * ui.js - Bevat UI-gerelateerde functies en event handlers
 */

// Event handler voor mouseup (na verplaatsen)
function handleMouseUp(e) {
    // Handle CTRL+drag drop for smart node placement
    if (window.ctrlDraggingNode && isDragging && draggedNode) {
        // Find target connection
        const targetConnection = document.querySelector('.connection.connection-drop-target');
        
        if (targetConnection && targetConnection.id) {
            // The node is already positioned correctly from dragging
            // Just update the nodes array to make sure position is saved
            const nodeIndex = nodes.findIndex(n => n.id === draggedNode.id);
            if (nodeIndex !== -1) {
                nodes[nodeIndex].x = draggedNode.x;
                nodes[nodeIndex].y = draggedNode.y;
            }
            
            // First, keep the temporary bridge connections as permanent
            // These connect the nodes that were originally connected through the dragged node
            if (window.ctrlDraggingNode.temporaryConnections) {
                window.ctrlDraggingNode.temporaryConnections.forEach(tempConnId => {
                    const tempConn = connections.find(c => c.id === tempConnId);
                    if (tempConn) {
                        // Change the temporary connection to a permanent one
                        tempConn.isTemporary = false;
                        tempConn.styleClass = '';
                        // Update its ID to be permanent
                        const newId = 'conn-' + tempConn.source + '-' + tempConn.target;
                        
                        // Update the DOM element ID
                        const tempEl = document.getElementById(tempConnId);
                        if (tempEl) {
                            tempEl.id = newId;
                        }
                        
                        tempConn.id = newId;
                    }
                });
            }
            
            // Remove original connections (they were only hidden visually)
            window.ctrlDraggingNode.originalConnections.incoming.forEach(conn => {
                const existingConn = connections.find(c => c.id === conn.id);
                if (existingConn) {
                    deleteConnection(conn.id);
                }
            });
            
            window.ctrlDraggingNode.originalConnections.outgoing.forEach(conn => {
                const existingConn = connections.find(c => c.id === conn.id);
                if (existingConn) {
                    deleteConnection(conn.id);
                }
            });
            
            // Drop the node into the connection (use actual node position)
            dropNodeIntoConnection(draggedNode.id, targetConnection.id, draggedNode.x, draggedNode.y);
            
            // Refresh all connections to ensure proper rendering
            if (typeof refreshConnections === 'function') {
                refreshConnections();
            }
        } else {
            // No valid drop target - restore original connections
            window.ctrlDraggingNode.originalConnections.incoming.forEach(conn => {
                // Unhide the connection
                const connEl = document.getElementById(conn.id);
                if (connEl) {
                    connEl.classList.remove('temporarily-hidden');
                    connEl.style.display = ''; // Show them again
                }
            });
            
            window.ctrlDraggingNode.originalConnections.outgoing.forEach(conn => {
                // Unhide the connection
                const connEl = document.getElementById(conn.id);
                if (connEl) {
                    connEl.classList.remove('temporarily-hidden');
                    connEl.style.display = ''; // Show them again
                }
            });
            
            // Refresh to ensure proper rendering
            if (typeof refreshConnections === 'function') {
                refreshConnections();
            }
        }
        
        // Clean up temporary connections only if we DIDN'T drop on a valid target
        // (If we did drop on a valid target, they've been converted to permanent)
        if (!targetConnection && window.ctrlDraggingNode.temporaryConnections) {
            window.ctrlDraggingNode.temporaryConnections.forEach(tempConnId => {
                // Remove from connections array
                const index = connections.findIndex(c => c.id === tempConnId);
                if (index !== -1) {
                    connections.splice(index, 1);
                }
                
                // Remove DOM element
                const tempConnEl = document.getElementById(tempConnId);
                if (tempConnEl) {
                    tempConnEl.remove();
                }
            });
        }
        
        // Clean up visual states
        const nodeEl = document.getElementById(draggedNode.id);
        if (nodeEl) {
            nodeEl.classList.remove('ctrl-dragging');
            nodeEl.style.opacity = '1';
            nodeEl.style.zIndex = currentSelectedNode === draggedNode.id ? 10 : 2;
            
            // Restore selection style if selected
            if (currentSelectedNode === draggedNode.id) {
                nodeEl.style.boxShadow = '0 0 0 4px #2196F3, 0 0 0 8px rgba(33, 150, 243, 0.3), 0 0 20px rgba(33, 150, 243, 0.6), 0 8px 25px rgba(0,0,0,0.4)';
            } else {
                nodeEl.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            }
        }
        
        // Clean up connection highlights
        document.querySelectorAll('.connection').forEach(conn => {
            conn.classList.remove('connection-drop-target', 'connection-drop-invalid', 'temporarily-hidden');
        });
        
        // Hide preview
        hideDropPreview();
        
        // Clear CTRL drag state
        window.ctrlDraggingNode = null;
        
        // Mark drag as complete
        isDragging = false;
        draggedNode = null;
        
        return; // Exit early to prevent other handlers
    }
    
    // Handle reconnect drop (ALT+drag)
    if (window.reconnectingNode && isDragging) {
        const dropTarget = document.elementFromPoint(e.clientX, e.clientY)?.closest('.node');
        
        if (dropTarget && dropTarget.id !== window.reconnectingNode.node.id) {
            const wouldCreateCycle = checkWouldCreateCycle(dropTarget.id, window.reconnectingNode.node.id);
            
            if (!wouldCreateCycle) {
                // Verwijder oude verbindingen
                window.reconnectingNode.originalParents.forEach(parentId => {
                    const conn = connections.find(
                        c => c.source === parentId && c.target === window.reconnectingNode.node.id
                    );
                    if (conn) {
                        deleteConnection(conn.id);
                    }
                });
                
                // Maak nieuwe verbinding
                createConnection(dropTarget.id, window.reconnectingNode.node.id);
                
                showToast('Node succesvol herverbonden!');
            } else {
                showToast('Kan geen circulaire verbinding maken', true);
            }
        }
        
        // Cleanup
        document.querySelectorAll('.node').forEach(n => {
            n.classList.remove('reconnecting', 'potential-new-parent');
        });
        window.reconnectingNode = null;
    }
    
    // Clean up any remaining highlights
    document.querySelectorAll('.connection').forEach(conn => {
        conn.classList.remove('connection-drop-target', 'connection-drop-invalid', 'temporarily-hidden');
    });
    hideDropPreview();
    
    // Reset drag status
    if (isDragging && draggedNode) {
        // Controleer of de node daadwerkelijk is verplaatst
        // Gebruik een kleine marge om te voorkomen dat kleine verschuivingen worden geregistreerd
        const hasNodeMoved = (
            Math.abs(nodeStartPos.x - draggedNode.x) > 1 || 
            Math.abs(nodeStartPos.y - draggedNode.y) > 1
        );
        
        // Log de beweging, maar sla niet opnieuw een staat op
        // (de staat is al opgeslagen bij mousedown)
        if (hasNodeMoved) {
            // Zorg ervoor dat de positie goed is bijgewerkt in het node object
            const nodeIndex = nodes.findIndex(n => n.id === draggedNode.id);
            if (nodeIndex !== -1) {
                nodes[nodeIndex].x = draggedNode.x;
                nodes[nodeIndex].y = draggedNode.y;
            }
            
            // Reset de cache voor deze node omdat zijn positie is veranderd
            resetConnectionCache(draggedNode.id);
            
            // Bereken verbindingen opnieuw voor een betere visuele ervaring
            // Specificeer false als tweede parameter om aan te geven dat dit
            // een finale update is, geen sleepactie
            updateRelatedConnections(draggedNode.id, false);
            
            // Na het verplaatsen, doe een volledige refresh van alle verbindingen
            // om zeker te zijn dat alles correct wordt getekend
            refreshConnections();
        } else {
            // Omdat de node niet is verplaatst, kunnen we de undo-actie weer verwijderen
            // om te voorkomen dat er onnodig undo's op de stack komen
            if (undoStack.length > 0 && typeof undoStack.pop === 'function') {
                undoStack.pop();
            }
        }
        
        // Reset stijlen van het versleepte element
        const nodeEl = document.getElementById(draggedNode.id);
        if (nodeEl) {
            nodeEl.style.zIndex = 2;
            
            // Blijf geselecteerd na verslepen
            if (currentSelectedNode === draggedNode.id) {
                nodeEl.style.boxShadow = '0 0 0 4px #2196F3, 0 0 0 8px rgba(33, 150, 243, 0.3), 0 0 20px rgba(33, 150, 243, 0.6), 0 8px 25px rgba(0,0,0,0.4)';
            } else {
                nodeEl.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            }
        }
        
        isDragging = false;
        draggedNode = null;
    }
    
    // Reset canvas drag status
    if (canvasDragging) {
        canvasDragging = false;
        canvas.style.cursor = tempPanMode ? 'grab' : 'default';
    }
    
    // Als de spatiebalk wordt losgelaten, ga terug naar de vorige modus
    if (tempPanMode && e.code === 'Space') {
        tempPanMode = false;
        canvas.style.cursor = 'default';
        // Herstel vorige tool
        selectToolHandler(currentTool + '-tool');
    }
    
    // Verwijder tijdelijke verbindingslijn als connect modus wordt beëindigd
    if (currentTool !== 'connect' && activeTempLine) {
        removeTemporaryConnectionLine();
    }
}

// Cache voor het bijhouden van node verbindingen
let nodeConnectionsCache = {};

// Queue voor connection updates om race conditions te voorkomen
let connectionUpdateQueue = [];
let isProcessingConnectionQueue = false;

/**
 * Calculate the distance from a point to a line segment
 * @param {number} px - Point X coordinate
 * @param {number} py - Point Y coordinate
 * @param {number} x1 - Line start X
 * @param {number} y1 - Line start Y
 * @param {number} x2 - Line end X
 * @param {number} y2 - Line end Y
 * @returns {number} Distance from point to line segment
 */
function distanceFromPointToLineSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    // If the line segment is actually a point
    if (dx === 0 && dy === 0) {
        return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));
    }
    
    // Calculate the t that minimizes the distance
    let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    
    // Clamp t to the range [0, 1] to handle points outside the segment
    t = Math.max(0, Math.min(1, t));
    
    // Find the nearest point on the line segment
    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;
    
    // Calculate distance from the point to the nearest point
    return Math.sqrt(Math.pow(px - nearestX, 2) + Math.pow(py - nearestY, 2));
}

/**
 * Reset de cache voor een specifieke node of voor alle nodes
 * @param {string|null} nodeId - Optionele node ID om voor te resetten, null voor alle nodes
 */
function resetConnectionCache(nodeId = null) {
    if (nodeId === null) {
        // Reset de hele cache
        nodeConnectionsCache = {};
    } else {
        // Reset alleen voor deze specifieke node
        delete nodeConnectionsCache[nodeId];
    }
}

/**
 * Helper functie om circulaire dependencies te detecteren
 * @param {string} sourceId - ID van source node
 * @param {string} targetId - ID van target node
 * @returns {boolean} - True als een circulaire dependency zou ontstaan
 */
function checkWouldCreateCycle(sourceId, targetId) {
    const visited = new Set();
    const queue = [targetId];
    
    while (queue.length > 0) {
        const current = queue.shift();
        if (current === sourceId) return true;
        
        if (!visited.has(current)) {
            visited.add(current);
            const children = connections
                .filter(c => c.source === current)
                .map(c => c.target);
            queue.push(...children);
        }
    }
    
    return false;
}

/**
 * Performance-geoptimaliseerde functie om alleen verbindingen te updaten
 * die gerelateerd zijn aan de gegeven node ID, inclusief aftakkingspunten
 * @param {string} nodeId - ID van de node waarvan verbindingen moeten worden bijgewerkt
 * @param {boolean} isForDrag - Geeft aan of deze update voor het slepen van een node is
 */
function updateRelatedConnections(nodeId, isForDrag = true) {
    // Voeg update toe aan queue om race conditions te voorkomen
    connectionUpdateQueue.push({ nodeId, isForDrag });
    
    if (!isProcessingConnectionQueue) {
        isProcessingConnectionQueue = true;
        
        requestAnimationFrame(() => {
            try {
                // Process alle queued updates
                while (connectionUpdateQueue.length > 0) {
                    const { nodeId, isForDrag } = connectionUpdateQueue.shift();
                    
                    try {
                        // Bouw de cache op als die nog niet bestaat voor deze node
                        if (!nodeConnectionsCache[nodeId]) {
                            nodeConnectionsCache[nodeId] = connections.filter(conn => 
                                conn.source === nodeId || conn.target === nodeId ||
                                (conn.isTrueBranch && conn.branchNodeId === nodeId)
                            );
                        }
                        
                        // Cache van de update zodat alleen de relevante verbindingen worden bijgewerkt
                        const relatedConnections = nodeConnectionsCache[nodeId];
                        
                        // Optimalisatie: Als er geen verbindingen zijn voor deze node, ga naar volgende
                        if (relatedConnections.length === 0) continue;
                        
                        // Bereken eerst alle controlepunten opnieuw bij een sleepactie
                        if (isForDrag) {
                            relatedConnections.forEach(conn => {
                                try {
                                    recalculateControlPoint(conn, true);
                                } catch (e) {
                                    console.error('Error in recalculateControlPoint:', e, conn);
                                }
                            });
                        }
                        
                        // Teken alle verbindingen opnieuw
                        relatedConnections.forEach(conn => {
                            try {
                                drawConnection(conn);
                            } catch (e) {
                                console.error('Error in drawConnection:', e, conn);
                            }
                        });
                        
                        // Update ook alle aftakkingspunten die aan deze node gerelateerd zijn
                        try {
                            updateBranchStartPointsForNode(nodeId);
                        } catch (e) {
                            console.error('Error in updateBranchStartPointsForNode:', e, nodeId);
                        }
                    } catch (e) {
                        console.error('Error processing connection update for node:', nodeId, e);
                    }
                }
            } finally {
                // CRITICAL: Always reset the flag, even if an error occurred
                isProcessingConnectionQueue = false;
            }
        });
    }
}

// Event handler voor mousemove
function handleMouseMove(e) {
    // Verplaats knooppunt tijdens drag
    if (isDragging && draggedNode) {
        // Extra check - is er een element in edit mode? 
        // Als een element actief bewerkt wordt, voorkom verslepen
        const activeEditElement = document.querySelector('[contenteditable="true"]');
        if (activeEditElement) {
            // Als er een contentEditable element actief is, annuleer drag operatie
            isDragging = false;
            draggedNode = null;
            return;
        }
        
        // Zorg ervoor dat we altijd met de werkelijke node werken
        const actualNode = nodes.find(n => n.id === draggedNode.id);
        if (!actualNode) {
            console.error(`[handleMouseMove] Kon draggedNode niet vinden in nodes array: ${draggedNode.id}`);
            isDragging = false;
            draggedNode = null;
            return;
        }
        draggedNode = actualNode;
        
        // Bereken de verplaatsing van de muis ten opzichte van de startpositie
        const deltaX = e.clientX - mouseStartPos.x;
        const deltaY = e.clientY - mouseStartPos.y;
        
        // Bereken de verplaatsing in canvas coördinaten (rekening houdend met zoom)
        const canvasDeltaX = deltaX / zoomLevel;
        const canvasDeltaY = deltaY / zoomLevel;
        
        // Bereken de nieuwe positie door de verplaatsing toe te passen op de startpositie
        const x = nodeStartPos.x + canvasDeltaX;
        const y = nodeStartPos.y + canvasDeltaY;
        
        // Snap naar grid
        const snapX = Math.round(x / gridSize) * gridSize;
        const snapY = Math.round(y / gridSize) * gridSize;
        
        // Update node positie in data - maak er afgeronde integers van
        draggedNode.x = snapX;
        draggedNode.y = snapY;
        
        // Update ook het bijbehorende node object in de nodes array
        const nodeIndex = nodes.findIndex(n => n.id === draggedNode.id);
        if (nodeIndex !== -1) {
            nodes[nodeIndex].x = snapX;
            nodes[nodeIndex].y = snapY;
        } else {
            console.error(`[handleMouseMove] Kon node niet vinden in nodes array: ${draggedNode.id}`);
        }
        
        // Update DOM element
        const nodeEl = document.getElementById(draggedNode.id);
        if (nodeEl) {
            nodeEl.style.left = snapX + 'px';
            nodeEl.style.top = snapY + 'px';
        }
        
        // Performance optimalisatie: Update alleen de verbindingen die gerelateerd zijn 
        // aan de huidige node in plaats van alle verbindingen
        updateRelatedConnections(draggedNode.id, true);
        
        // Alleen update minimap bij elke 5e beweging om performance te verbeteren
        if (Math.random() < 0.2 && showMinimap) {
            updateMinimap();
        }
    }
    
    // Highlight potential nieuwe parents tijdens ALT+drag
    if (window.reconnectingNode && isDragging) {
        const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
        const targetNode = elementUnderMouse?.closest('.node');
        
        // Reset alle highlights
        document.querySelectorAll('.node').forEach(n => {
            n.classList.remove('potential-new-parent');
        });
        
        if (targetNode && targetNode.id !== window.reconnectingNode.node.id) {
            // Check voor circulaire dependencies
            const targetId = targetNode.id;
            const wouldCreateCycle = checkWouldCreateCycle(targetId, window.reconnectingNode.node.id);
            
            if (!wouldCreateCycle) {
                targetNode.classList.add('potential-new-parent');
            }
        }
    }
    
    // CTRL+drag: Highlight connections for smart node placement
    if (window.ctrlDraggingNode && isDragging && draggedNode) {
        // Get all connection elements (they're divs with SVG inside)
        const allConnections = document.querySelectorAll('#connections-container .connection:not(.temporarily-hidden)');
        
        // Get the node element to check its position
        const nodeEl = document.getElementById(draggedNode.id);
        if (!nodeEl) return;
        
        const nodeRect = nodeEl.getBoundingClientRect();
        const nodeCenterX = nodeRect.left + nodeRect.width / 2;
        const nodeCenterY = nodeRect.top + nodeRect.height / 2;
        
        // Reset all connection highlights first
        allConnections.forEach(conn => {
            conn.classList.remove('connection-drop-target', 'connection-drop-invalid');
        });
        
        let hoveredConnection = null;
        let minDistance = 50; // Maximum distance to consider a hover (in pixels)
        
        // Check each connection to see if node is close to it
        allConnections.forEach(connEl => {
            if (!connEl.id || connEl.id.startsWith('temp-conn-')) return;
            
            // Get the connection data
            const connection = connections.find(c => c.id === connEl.id);
            if (!connection) return;
            
            // Get the source and target nodes
            const sourceNode = nodes.find(n => n.id === connection.source);
            const targetNode = nodes.find(n => n.id === connection.target);
            if (!sourceNode || !targetNode) return;
            
            // Get the source and target elements to find their screen positions
            const sourceEl = document.getElementById(connection.source);
            const targetEl = document.getElementById(connection.target);
            if (!sourceEl || !targetEl) return;
            
            const sourceRect = sourceEl.getBoundingClientRect();
            const targetRect = targetEl.getBoundingClientRect();
            
            // Calculate the line between source and target
            const sourceCenterX = sourceRect.left + sourceRect.width / 2;
            const sourceCenterY = sourceRect.top + sourceRect.height / 2;
            const targetCenterX = targetRect.left + targetRect.width / 2;
            const targetCenterY = targetRect.top + targetRect.height / 2;
            
            // Check distance from node center to the line segment
            const distance = distanceFromPointToLineSegment(
                nodeCenterX, nodeCenterY,
                sourceCenterX, sourceCenterY,
                targetCenterX, targetCenterY
            );
            
            // If this connection is close enough and is the closest so far
            if (distance < minDistance) {
                minDistance = distance;
                hoveredConnection = connEl;
            }
        });
        
        // Highlight the hovered connection
        if (hoveredConnection) {
            const connectionId = hoveredConnection.id;
            const connection = connections.find(c => c.id === connectionId);
            
            if (connection) {
                // Always allow dropping - just show as valid target
                hoveredConnection.classList.add('connection-drop-target');
                
                // Show preview tooltip
                const sourceNode = nodes.find(n => n.id === connection.source);
                const targetNode = nodes.find(n => n.id === connection.target);
                showDropPreview(e.clientX, e.clientY, `Invoegen tussen "${sourceNode?.title}" en "${targetNode?.title}"`);
            }
        } else {
            hideDropPreview();
        }
    }
    // Regular drag: clean up highlights
    else if (isDragging && draggedNode && !window.reconnectingNode && !window.ctrlDraggingNode) {
        // Clean up any connection highlights
        document.querySelectorAll('.connection').forEach(conn => {
            conn.classList.remove('connection-drop-target', 'connection-drop-invalid');
        });
        hideDropPreview();
    } else if (!isDragging) {
        // Clean up when not dragging
        document.querySelectorAll('.connection').forEach(conn => {
            conn.classList.remove('connection-drop-target', 'connection-drop-invalid');
        });
        hideDropPreview();
        
        // Also clean up ctrl tooltips if not in ctrl mode
        if (!ctrlSelectMode) {
            hideCtrlTooltip();
        }
    }
    
    // Pan canvas
    if (canvasDragging) {
        const moveX = e.clientX - canvasDragStart.x;
        const moveY = e.clientY - canvasDragStart.y;
        
        canvasOffset.x += moveX;
        canvasOffset.y += moveY;
        
        canvasDragStart = { x: e.clientX, y: e.clientY };
        
        updateCanvasTransform();
    }
    
    // Update tijdelijke verbindingslijn
    if (currentTool === 'connect' && sourceNode) {
        const sourceNodeObj = nodes.find(n => n.id === sourceNode);
        if (sourceNodeObj) {
            showTemporaryConnectionLine(sourceNodeObj, e);
        }
    }
}

// Context menu acties voor nodes
function setupContextMenuActions() {
    console.log('Setting up context menu actions...');
    
    // Controleer of alle DOM elementen bestaan
    const contextEditEl = document.getElementById('context-edit');
    if (!contextEditEl) {
        console.error('context-edit element not found');
        return;
    }
    
    console.log('context-edit element found, adding event listener...');
    
    // Bewerken via context menu
    contextEditEl.addEventListener('click', function(e) {
        console.log('Context edit clicked!');
        e.stopPropagation();
        e.preventDefault();
        const nodeId = contextMenu.dataset.nodeId;
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            openNodeEditor(node);
        }
        contextMenu.style.display = 'none';
    });
    
    // Hernoemen via context menu
    const contextRenameEl = document.getElementById('context-rename');
    if (contextRenameEl) {
        contextRenameEl.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const nodeId = contextMenu.dataset.nodeId;
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
                const nodeEl = document.getElementById(node.id);
                if (nodeEl) {
                    const titleEl = nodeEl.querySelector('.node-title');
                    if (titleEl) {
                        makeEditable(titleEl, node);
                    }
                }
            }
            contextMenu.style.display = 'none';
        });
    }
    
    // Nieuw subknooppunt via context menu
    const contextCreateChildEl = document.getElementById('context-create-child');
    if (contextCreateChildEl) {
        contextCreateChildEl.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const nodeId = contextMenu.dataset.nodeId;
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
                // Bereken positie voor nieuw knooppunt
                const angleOffset = Math.random() * Math.PI;
                const distance = 200;
                const childX = node.x + Math.cos(angleOffset) * distance;
                const childY = node.y + Math.sin(angleOffset) * distance;
                
                // Maak nieuw knooppunt
                const childNode = createNode('Nieuw idee', '', node.color, childX, childY, 'rounded', node.id);
                
                // Open direct bewerken van de titel
                const childEl = document.getElementById(childNode.id);
                if (childEl) {
                    const titleEl = childEl.querySelector('.node-title');
                    if (titleEl) {
                        makeEditable(titleEl, childNode);
                    }
                }
                
                showToast('Subknooppunt toegevoegd');
            }
            contextMenu.style.display = 'none';
        });
    }
    
    // Batch children via context menu
    const contextBatchChildrenEl = document.getElementById('context-batch-children');
    if (contextBatchChildrenEl) {
        contextBatchChildrenEl.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const nodeId = contextMenu.dataset.nodeId;
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
                // Selecteer de node en open batch text modal
                selectNode(nodeId);
                
                const batchModal = document.getElementById('batch-text-modal');
                const batchInput = document.getElementById('batch-text-input');
                batchInput.value = '';
                batchModal.style.display = 'flex';
                batchInput.focus();
            }
            contextMenu.style.display = 'none';
        });
    }
    
    // Y-vertakking via context menu
    const contextBranchEl = document.getElementById('context-branch');
    if (contextBranchEl) {
        contextBranchEl.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const nodeId = contextMenu.dataset.nodeId;
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
                // Start branch modus met deze node als bron
                branchingMode = true;
                branchSourceNode = node.id;
                
                showToast('Klik op een ander knooppunt om een Y-vertakking te maken', false);
                canvas.style.cursor = 'crosshair';
                
                // Tijdelijke globale klik handler om de bestemming te bepalen
                function handleBranchTarget(e) {
                    if (e.target.classList.contains('node') || e.target.closest('.node')) {
                        const targetNode = e.target.classList.contains('node') ? 
                            e.target : e.target.closest('.node');
                        const targetId = targetNode.id;
                        
                        // Maak alleen een verbinding als het een ander knooppunt is
                        if (targetId !== branchSourceNode) {
                            createConnection(branchSourceNode, targetId, true);
                            showToast('Y-vertakking gemaakt');
                        }
                        
                        // Reset branch modus
                        branchingMode = false;
                        branchSourceNode = null;
                        canvas.style.cursor = 'default';
                        
                        // Verwijder deze event listener
                        document.removeEventListener('click', handleBranchTarget);
                    }
                }
                
                document.addEventListener('click', handleBranchTarget);
            }
            
            contextMenu.style.display = 'none';
        });
    }
    
    // Hoofdknooppunt instellen via context menu
    const contextSetRootEl = document.getElementById('context-set-root');
    if (contextSetRootEl) {
        contextSetRootEl.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const nodeId = contextMenu.dataset.nodeId;
            setRootNode(nodeId);
            contextMenu.style.display = 'none';
        });
    }
    
    // Verbindingen bewerken via context menu
    const contextDisconnectModeEl = document.getElementById('context-disconnect-mode');
    if (contextDisconnectModeEl) {
        contextDisconnectModeEl.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const nodeId = contextMenu.dataset.nodeId;
            startDisconnectMode(nodeId);
            contextMenu.style.display = 'none';
        });
    }
    
    // Verwijderen via context menu
    const contextDeleteEl = document.getElementById('context-delete');
    if (contextDeleteEl) {
        contextDeleteEl.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const nodeId = contextMenu.dataset.nodeId;
            deleteNode(nodeId);
            contextMenu.style.display = 'none';
        });
    }
}

// Context menu acties voor verbindingen
function setupConnectionContextMenuActions() {
    // Bewerken via context menu
    const connectionEditEl = document.getElementById('connection-edit');
    if (connectionEditEl) {
        connectionEditEl.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const connectionId = connectionContextMenu.dataset.connectionId;
            const connection = connections.find(c => c.id === connectionId);
            if (connection) {
                openConnectionEditor(connection);
            }
            connectionContextMenu.style.display = 'none';
        });
    }
    
    // Vertakking maken via context menu
    const connectionBranchEl = document.getElementById('connection-branch');
    if (connectionBranchEl) {
        connectionBranchEl.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const connectionId = connectionContextMenu.dataset.connectionId;
            const connection = connections.find(c => c.id === connectionId);
            if (connection) {
                // Vind de verbinding element en controlepunt
                const connectionEl = document.getElementById(connection.id);
                if (connectionEl) {
                    const sourceNode = nodes.find(n => n.id === connection.source);
                    const targetNode = nodes.find(n => n.id === connection.target);
                    
                    if (sourceNode && targetNode) {
                        const sourceCenter = { x: sourceNode.x + 60, y: sourceNode.y + 30 };
                        const targetCenter = { x: targetNode.x + 60, y: targetNode.y + 30 };
                        
                        const midX = (sourceCenter.x + targetCenter.x) / 2;
                        const midY = (sourceCenter.y + targetCenter.y) / 2;
                        
                        startBranchFromConnection(connection, midX, midY);
                    }
                }
            }
            connectionContextMenu.style.display = 'none';
        });
    }
    
    // Stijlen instellen via context menu
    const connectionStyleSolidEl = document.getElementById('connection-style-solid');
    if (connectionStyleSolidEl) {
        connectionStyleSolidEl.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const connectionId = connectionContextMenu.dataset.connectionId;
            const connection = connections.find(c => c.id === connectionId);
            if (connection) {
                setConnectionStyle(connection, 'solid');
            }
            connectionContextMenu.style.display = 'none';
        });
    }
    
    const connectionStyleDashedEl = document.getElementById('connection-style-dashed');
    if (connectionStyleDashedEl) {
        connectionStyleDashedEl.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const connectionId = connectionContextMenu.dataset.connectionId;
            const connection = connections.find(c => c.id === connectionId);
            if (connection) {
                setConnectionStyle(connection, 'dashed');
            }
            connectionContextMenu.style.display = 'none';
        });
    }
    
    // Types instellen via context menu
    const connectionTypeDefaultEl = document.getElementById('connection-type-default');
    if (connectionTypeDefaultEl) {
        connectionTypeDefaultEl.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const connectionId = connectionContextMenu.dataset.connectionId;
            const connection = connections.find(c => c.id === connectionId);
            if (connection) {
                setConnectionType(connection, 'default');
            }
            connectionContextMenu.style.display = 'none';
        });
    }
    
    const connectionTypePrimaryEl = document.getElementById('connection-type-primary');
    if (connectionTypePrimaryEl) {
        connectionTypePrimaryEl.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const connectionId = connectionContextMenu.dataset.connectionId;
            const connection = connections.find(c => c.id === connectionId);
            if (connection) {
                setConnectionType(connection, 'primary');
            }
            connectionContextMenu.style.display = 'none';
        });
    }
    
    const connectionTypeSecondaryEl = document.getElementById('connection-type-secondary');
    if (connectionTypeSecondaryEl) {
        connectionTypeSecondaryEl.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const connectionId = connectionContextMenu.dataset.connectionId;
            const connection = connections.find(c => c.id === connectionId);
            if (connection) {
                setConnectionType(connection, 'secondary');
            }
            connectionContextMenu.style.display = 'none';
        });
    }
    
    // Verwijderen via context menu
    const connectionDeleteEl = document.getElementById('connection-delete');
    if (connectionDeleteEl) {
        connectionDeleteEl.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const connectionId = connectionContextMenu.dataset.connectionId;
            deleteConnection(connectionId);
            connectionContextMenu.style.display = 'none';
        });
    }
}

// Setup title editing functionality
function setupTitleEditing() {
    if (!mindmapTitleEl) return;
    
    // Update hint on focus/blur
    const hintEl = document.querySelector('.edit-title-hint');
    
    mindmapTitleEl.addEventListener('focus', function() {
        if (hintEl) hintEl.style.display = 'none';
        this.select(); // Select all text on focus
    });
    
    mindmapTitleEl.addEventListener('blur', function() {
        if (hintEl) hintEl.style.display = '';
        updateTitleFromInput();
    });
    
    mindmapTitleEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.blur();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            this.value = getMindmapTitle();
            this.blur();
        }
    });
    
    // Update title on input change
    mindmapTitleEl.addEventListener('input', function() {
        // Limit title length
        if (this.value.length > 100) {
            this.value = this.value.substring(0, 100);
        }
    });
}

// Stel alle event listeners in
function setupEventListeners() {
    // Hamburger menu setup
    setupHamburgerMenu();
    
    // Title editing functionality
    setupTitleEditing();
    
    // Canvas navigatie
    canvas.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Zoom handlers
    canvasContainer.addEventListener('wheel', function(e) {
        e.preventDefault();
        
        // Add debugging for desktop testing
        console.log('🖱️ Wheel zoom event:', { deltaY: e.deltaY, zoomLevel });
        
        // Bereken canvas positie onder cursor
        const rect = canvasContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        console.log('📍 Mouse position:', { 
            clientX: e.clientX, 
            clientY: e.clientY, 
            rectLeft: rect.left, 
            rectTop: rect.top,
            mouseX, 
            mouseY 
        });
        
        // Bereken schaal verandering
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(3, zoomLevel * delta));
        
        console.log('🔍 Zoom change:', { oldZoom: zoomLevel, delta, newZoom });
        
        // Use the same algorithm as mobile-pinch-standalone.md
        // Calculate the world coordinates at the mouse position
        const worldX = (mouseX - canvasOffset.x) / zoomLevel;
        const worldY = (mouseY - canvasOffset.y) / zoomLevel;
        
        console.log('🌍 World coords:', { 
            canvasOffsetBefore: { ...canvasOffset },
            worldX, 
            worldY 
        });
        
        // Update zoom
        setZoomLevel(newZoom);
        
        // Keep the world point fixed at the mouse position
        const oldOffsetX = canvasOffset.x;
        const oldOffsetY = canvasOffset.y;
        canvasOffset.x = mouseX - worldX * newZoom;
        canvasOffset.y = mouseY - worldY * newZoom;
        
        console.log('📍 Offset change:', {
            old: { x: oldOffsetX, y: oldOffsetY },
            new: { x: canvasOffset.x, y: canvasOffset.y },
            delta: { x: canvasOffset.x - oldOffsetX, y: canvasOffset.y - oldOffsetY }
        });
        
        // Apply the transform
        updateCanvasTransform();
        
        // Bijwerk zoom UI
        updateMinimapViewport();
    });
    
    // Knooppunt toevoegen via canvas klik
    canvas.addEventListener('mousedown', function(e) {
        // Controleer rechtermuisknop of ctrl+klik voor context menu
        if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
            return; // Laat het contextmenu afhandelen
        }
        
        // Verberg context menu indien open
        closeAllContextMenus();
        
        // Als pannen (spatiebalk) actief is
        if (tempPanMode || e.button === 1) { // Middle mouse button
            canvasDragging = true;
            canvasDragStart = { x: e.clientX, y: e.clientY };
            canvas.style.cursor = 'grabbing';
            return;
        }
        
        // Als we in branch modus zijn, maar niet op een node klikken, annuleer de branch mode
        if (branchingMode && !e.target.classList.contains('node') && !e.target.closest('.node')) {
            branchingMode = false;
            branchSourceConnection = null;
            branchSourceNode = null;
            canvas.style.cursor = 'default';
            showToast('Vertakking geannuleerd', false);
            return;
        }
        
        // Als connect tool actief is en er is geen sourceNode, annuleer operatie bij klik op canvas
        if (currentTool === 'connect' && sourceNode && !e.target.classList.contains('node') && !e.target.closest('.node')) {
            const sourceEl = document.getElementById(sourceNode);
            if (sourceEl) {
                sourceEl.style.boxShadow = '';
            }
            sourceNode = null;
            removeTemporaryConnectionLine();
            showToast('Verbinding geannuleerd', false);
            return;
        }
        
        // Als dubbelklik, voeg een nieuw knooppunt toe
        if (e.detail === 2) {
            // Bereken positie in canvas coördinaten
            const canvasRect = canvas.getBoundingClientRect();
            // Correcte berekening zonder dubbele aftrek van offset
            const x = (e.clientX - canvasRect.left) / zoomLevel;
            const y = (e.clientY - canvasRect.top) / zoomLevel;
            
            // Snap naar grid
            const snapX = Math.round(x / gridSize) * gridSize;
            const snapY = Math.round(y / gridSize) * gridSize;
            
            // Maak nieuw knooppunt
            const newNode = createNode('Nieuw idee', '', '#4CAF50', snapX, snapY, 'rounded', null, nodes.length === 0);
            
            // Direct titel bewerken
            const nodeEl = document.getElementById(newNode.id);
            if (nodeEl) {
                const titleEl = nodeEl.querySelector('.node-title');
                if (titleEl) {
                    makeEditable(titleEl, newNode);
                }
            }
            
            // Selecteer het nieuwe knooppunt
            selectNode(newNode.id);
            
            showToast('Knooppunt toegevoegd');
        }
    });
    
    // Zoom knoppen
    zoomInBtn.addEventListener('click', function() {
        setZoomLevel(zoomLevel * 1.2);
    });
    
    zoomOutBtn.addEventListener('click', function() {
        setZoomLevel(zoomLevel / 1.2);
    });
    
    zoomResetBtn.addEventListener('click', function() {
        setZoomLevel(1);
    });
    
    // Opslag operaties
    saveBtn.addEventListener('click', function() {
        if (typeof showSmartSaveDialog === 'function') {
            showSmartSaveDialog();
        } else if (typeof exportToJson === 'function') {
            exportToJson();
        } else {
            showToast('Save functie niet beschikbaar', true);
        }
    });
    loadBtn.addEventListener('click', function() {
        fileInput.click();
    });
    
    // Version browser button
    const versionBrowserBtn = document.getElementById('version-browser-btn');
    if (versionBrowserBtn) {
        versionBrowserBtn.addEventListener('click', function() {
            if (window.VersionBrowser) {
                window.VersionBrowser.show();
            } else {
                showToast('Version browser niet beschikbaar', true);
            }
        });
    }
    
    // Bestandsinvoer
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            importFromJson(e.target.files[0]);
            fileInput.value = ''; // Reset zodat hetzelfde bestand opnieuw kan worden geselecteerd
        }
    });
    
    // Mermaid export
    exportMermaidBtn.addEventListener('click', exportToMermaid);
    copyExport.addEventListener('click', function() {
        exportContent.select();
        document.execCommand('copy');
        showToast('Mermaid code gekopieerd naar klembord');
    });
    closeExport.addEventListener('click', function() {
        exportModal.style.display = 'none';
    });
    
    // Mermaid import
    if (importMermaidBtn) {
        importMermaidBtn.addEventListener('click', function() {
            importContent.value = '';
            importModal.style.display = 'flex';
        });
    }
    cancelImport.addEventListener('click', function() {
        importModal.style.display = 'none';
    });
    confirmImport.addEventListener('click', importFromMermaid);
    
    // Afbeelding export
    exportImageBtn.addEventListener('click', exportAsImage);
    
    // Auto-layout (removed button, add null check)
    if (autoLayoutBtn) {
        autoLayoutBtn.addEventListener('click', arrangeNodes);
    }
    
    // Hulp tonen
    helpBtn.addEventListener('click', function() {
        helpModal.style.display = 'flex';
        // Reset help modal to first tab when opened
        resetHelpModalToFirstTab();
    });
    closeHelp.addEventListener('click', function() {
        helpModal.style.display = 'none';
    });
    
    // Releases tonen (Wat is nieuw)
    const versionInfoBtn = document.getElementById('version-info-btn');
    const versionNumber = document.getElementById('version-number');
    const releasesModal = document.getElementById('releases-modal');
    const closeReleases = document.getElementById('close-releases');
    const menuReleasesBtn = document.getElementById('menu-releases-btn');
    
    // Version info button click
    if (versionInfoBtn) {
        versionInfoBtn.addEventListener('click', function() {
            releasesModal.style.display = 'flex';
        });
    }
    
    // Version number click
    if (versionNumber) {
        versionNumber.addEventListener('click', function() {
            releasesModal.style.display = 'flex';
        });
    }
    
    if (menuReleasesBtn) {
        menuReleasesBtn.addEventListener('click', function() {
            releasesModal.style.display = 'flex';
            // Close hamburger menu
            const hamburgerMenu = document.getElementById('hamburger-menu');
            if (hamburgerMenu) {
                hamburgerMenu.classList.remove('active');
            }
        });
    }
    
    if (closeReleases) {
        closeReleases.addEventListener('click', function() {
            releasesModal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    if (releasesModal) {
        releasesModal.addEventListener('click', function(e) {
            if (e.target === releasesModal) {
                releasesModal.style.display = 'none';
            }
        });
        
        // Close button in modal header
        const closeModalBtn = releasesModal.querySelector('.close-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', function() {
                releasesModal.style.display = 'none';
            });
        }
    }
    
    // Toon beginners tips knop
    if (showTipsBtn) {
        showTipsBtn.addEventListener('click', function() {
            helpModal.style.display = 'none';
            // Roep showFirstTimeOverlay aan met forceShow = true
            if (typeof showFirstTimeOverlay === 'function') {
                showFirstTimeOverlay(true);
            }
        });
    }
    
    // Initialize modern help system
    initializeHelpSystem();
    
    // Connection editor
    cancelConnectionEdit.addEventListener('click', function() {
        connectionModal.style.display = 'none';
    });
    saveConnectionEdit.addEventListener('click', saveConnectionEdits);
    
    // Node editor
    cancelNodeEdit.addEventListener('click', function() {
        nodeModal.style.display = 'none';
    });
    saveNodeEdit.addEventListener('click', saveNodeEdits);
    
    // Sluit modals
    closeModalButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });
    
    // Centreren knop
    centerBtn.addEventListener('click', function() {
        if (rootNodeId) {
            centerOnNode(rootNodeId);
        } else {
            // Centreer canvas als er geen hoofdknooppunt is
            const containerRect = canvasContainer.getBoundingClientRect();
            canvasOffset.x = containerRect.width / 2;
            canvasOffset.y = containerRect.height / 2;
            updateCanvasTransform();
        }
    });
    
    // Wissen knop
    clearBtn.addEventListener('click', function() {
        if (confirm('Weet je zeker dat je de mindmap wilt wissen?')) {
            clearMindmap(true); // Clear version history when explicitly clearing
        }
    });
    
    // Grid aan/uit
    toggleGridBtn.addEventListener('click', function() {
        showGrid = !showGrid;
        updateGridVisibility();
        showToast(showGrid ? 'Raster ingeschakeld' : 'Raster uitgeschakeld');
    });
    
    // Minimap aan/uit
    toggleMinimapBtn.addEventListener('click', function() {
        showMinimap = !showMinimap;
        miniMap.style.display = showMinimap ? 'block' : 'none';
        if (showMinimap) {
            updateMinimap();
        }
        showToast(showMinimap ? 'Minimap ingeschakeld' : 'Minimap uitgeschakeld');
    });
    
    // Ongedaan maken knop
    undoBtn.addEventListener('click', function() {
        undoLastAction();
    });
    
    // Zoom to selection knop
    const zoomToSelectionBtn = document.getElementById('zoom-to-selection');
    if (zoomToSelectionBtn) {
        zoomToSelectionBtn.addEventListener('click', function() {
            zoomToSelection();
        });
    }
    
    // Sluit contextmenu bij klik elders - dit moet VOOR de context menu actions worden ingesteld
    document.addEventListener('click', function(e) {
        // Gebruik een setTimeout om ervoor te zorgen dat context menu klik handlers eerst kunnen uitvoeren
        setTimeout(() => {
            // Controleer of de klik binnen het contextmenu is
            if (!contextMenu.contains(e.target) && !connectionContextMenu.contains(e.target)) {
                closeAllContextMenus();
            }
        }, 0);
    });
    
    // Voeg de contextmenu actions toe NADAT de document listener is ingesteld
    setupContextMenuActions();
    setupConnectionContextMenuActions();
    
    // Voorkom standaard contextmenu
    canvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        // Sluit bestaande context menu's als op canvas wordt geklikt
        closeAllContextMenus();
        
        // Alleen als we niet op een node of verbinding hebben geklikt
        if (!e.target.classList.contains('node') && 
            !e.target.closest('.node') && 
            !e.target.classList.contains('connection-line') && 
            !e.target.closest('.connection')) {
            
            // Eenvoudig contextmenu voor canvas
            const canvasContextMenu = document.createElement('div');
            canvasContextMenu.className = 'context-menu';
            canvasContextMenu.style.left = e.pageX + 'px';
            canvasContextMenu.style.top = e.pageY + 'px';
            canvasContextMenu.style.display = 'block';
            canvasContextMenu.style.zIndex = '1000';
            
            // Opties
            canvasContextMenu.innerHTML = `
                <div class="context-menu-item" id="ctx-add-node">Nieuw knooppunt</div>
                <div class="context-menu-divider"></div>
                <div class="context-menu-item" id="ctx-auto-layout">Auto-layout</div>
                <div class="context-menu-item" id="ctx-center-view">Centreren</div>
            `;
            
            document.body.appendChild(canvasContextMenu);
            
            // Event listeners voor de opties
            document.getElementById('ctx-add-node').addEventListener('click', function() {
                // Bereken positie in canvas coördinaten
                const canvasRect = canvas.getBoundingClientRect();
                const x = (e.clientX - canvasRect.left) / zoomLevel;
                const y = (e.clientY - canvasRect.top) / zoomLevel;
                
                // Snap naar grid
                const snapX = Math.round(x / gridSize) * gridSize;
                const snapY = Math.round(y / gridSize) * gridSize;
                
                // Maak nieuw knooppunt
                const newNode = createNode('Nieuw idee', '', '#4CAF50', snapX, snapY, 'rounded', null, nodes.length === 0);
                
                // Direct titel bewerken
                const nodeEl = document.getElementById(newNode.id);
                if (nodeEl) {
                    const titleEl = nodeEl.querySelector('.node-title');
                    if (titleEl) {
                        makeEditable(titleEl, newNode);
                    }
                }
                
                // Selecteer het nieuwe knooppunt
                selectNode(newNode.id);
                
                canvasContextMenu.remove();
            });
            
            document.getElementById('ctx-auto-layout').addEventListener('click', function() {
                arrangeNodes();
                canvasContextMenu.remove();
            });
            
            document.getElementById('ctx-center-view').addEventListener('click', function() {
                if (rootNodeId) {
                    centerOnNode(rootNodeId);
                } else {
                    // Centreer canvas als er geen hoofdknooppunt is
                    const containerRect = canvasContainer.getBoundingClientRect();
                    canvasOffset.x = containerRect.width / 2;
                    canvasOffset.y = containerRect.height / 2;
                    updateCanvasTransform();
                }
                canvasContextMenu.remove();
            });
            
            // Sluit menu bij klik ergens anders
            setTimeout(() => {
                const closeContextMenu = function() {
                    canvasContextMenu.remove();
                    document.removeEventListener('click', closeContextMenu);
                };
                document.addEventListener('click', closeContextMenu);
            }, 0);
        }
    });
    
    // Toetsenbord shortcuts
    document.addEventListener('keydown', function(e) {
        // Temporary pan mode with space
        if (e.code === 'Space' && !tempPanMode) {
            tempPanMode = true;
            canvas.style.cursor = 'grab';
        }
        
        // Verwijderen met Delete of Backspace
        if ((e.code === 'Delete' || e.code === 'Backspace') && currentSelectedNode) {
            // Eerst controleren of er een element bewerkt wordt (contentEditable)
            const activeElement = document.activeElement;
            const isEditing = activeElement && 
                              (activeElement.isContentEditable || 
                               activeElement.tagName === 'INPUT' || 
                               activeElement.tagName === 'TEXTAREA');
            
            // Alleen doorgaan met verwijderen als er geen element bewerkt wordt
            if (!isEditing) {
                if (e.ctrlKey || confirm('Weet je zeker dat je dit item wilt verwijderen?')) {
                    // Check of het een verbinding of knooppunt is
                    if (currentSelectedNode.startsWith('conn-')) {
                        deleteConnection(currentSelectedNode);
                    } else {
                        deleteNode(currentSelectedNode);
                    }
                    currentSelectedNode = null;
                }
            }
        }
        
        // Bestandsoperaties
        if (e.ctrlKey && e.code === 'KeyS') {
            e.preventDefault();
            if (typeof showSmartSaveDialog === 'function') {
                showSmartSaveDialog();
            } else if (typeof exportToJson === 'function') {
                exportToJson();
            } else {
                showToast('Save functie niet beschikbaar', true);
            }
        } else if (e.ctrlKey && e.code === 'KeyO') {
            e.preventDefault();
            fileInput.click();
        } else if (e.ctrlKey && e.code === 'KeyE') {
            e.preventDefault();
            exportToMermaid();
        } else if (e.ctrlKey && e.code === 'KeyI') {
            e.preventDefault();
            importContent.value = '';
            importModal.style.display = 'flex';
        } 
        
        // Ongedaan maken met Ctrl+Z
        else if (e.ctrlKey && e.code === 'KeyZ') {
            e.preventDefault();
            undoLastAction();
        }
        
        // Copy met Ctrl+C
        else if (e.ctrlKey && e.code === 'KeyC') {
            e.preventDefault();
            copySelectedNodes();
        }
        
        // Paste met Ctrl+V
        else if (e.ctrlKey && e.code === 'KeyV') {
            e.preventDefault();
            const rect = canvasContainer.getBoundingClientRect();
            const centerX = ((-canvasOffset.x + rect.width / 2) / zoomLevel);
            const centerY = ((-canvasOffset.y + rect.height / 2) / zoomLevel);
            pasteNodes(centerX, centerY);
        }
        
        // Zoom to selection met Ctrl+F
        else if (e.ctrlKey && e.code === 'KeyF') {
            e.preventDefault();
            zoomToSelection();
        }
        
        // Grid aan/uit toggle met G
        if (e.code === 'KeyG' && !e.ctrlKey) {
            showGrid = !showGrid;
            updateGridVisibility();
        }
        
        // Minimap aan/uit toggle met M
        if (e.code === 'KeyM' && !e.ctrlKey) {
            showMinimap = !showMinimap;
            miniMap.style.display = showMinimap ? 'block' : 'none';
            if (showMinimap) {
                updateMinimap();
            }
        }
        
        // Tab voor quick child node
        if (e.code === 'Tab' && currentSelectedNode && !currentSelectedNode.startsWith('conn-')) {
            e.preventDefault();
            const node = nodes.find(n => n.id === currentSelectedNode);
            if (node) {
                const angle = Math.random() * Math.PI * 2;
                const distance = 150;
                const childNode = createNode(
                    'Nieuw idee',
                    '',
                    node.color,
                    node.x + Math.cos(angle) * distance,
                    node.y + Math.sin(angle) * distance,
                    'rounded',
                    node.id
                );
                
                // Maak direct bewerkbaar
                const childEl = document.getElementById(childNode.id);
                if (childEl) {
                    const titleEl = childEl.querySelector('.node-title');
                    if (titleEl) {
                        makeEditable(titleEl, childNode);
                    }
                }
            }
        }
    });
    
    document.addEventListener('keyup', function(e) {
        if (e.code === 'Space' && tempPanMode) {
            tempPanMode = false;
            canvas.style.cursor = 'default';
        }
    });
    
    // Minimap interactie
    miniMap.addEventListener('mousedown', function(e) {
        e.stopPropagation(); // Voorkom dat de event bubblet naar de canvas
        
        // Zorg ervoor dat eventuele actieve drag/interacties worden gereset
        if (isDragging) {
            isDragging = false;
            draggedNode = null;
        }
        
        const rect = miniMapContent.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Schaal tussen minimap en canvas
        const canvasSize = {
            width: canvas.scrollWidth,
            height: canvas.scrollHeight
        };
        
        const miniMapSize = {
            width: miniMap.clientWidth,
            height: miniMap.clientHeight
        };
        
        const scale = Math.min(miniMapSize.width / canvasSize.width, miniMapSize.height / canvasSize.height);
        
        // Bereken nieuwe positie van view in canvas
        const containerRect = canvasContainer.getBoundingClientRect();
        
        // Centreer op de klikpositie
        canvasOffset.x = (containerRect.width / 2) - ((clickX / scale) * zoomLevel);
        canvasOffset.y = (containerRect.height / 2) - ((clickY / scale) * zoomLevel);
        
        updateCanvasTransform();
        
        // Blokkeer alle andere klikacties tot mouseup
        function blockOtherClicks(ev) {
            ev.stopPropagation();
            document.removeEventListener('mouseup', blockOtherClicks, true);
        }
        
        document.addEventListener('mouseup', blockOtherClicks, true);
    });
    
    // Tool buttons (with null checks for removed buttons)
    const selectTool = document.getElementById('select-tool');
    if (selectTool) {
        selectTool.addEventListener('click', function() {
            selectToolHandler('select-tool');
        });
    }
    
    const addNodeTool = document.getElementById('add-node-tool');
    if (addNodeTool) {
        addNodeTool.addEventListener('click', function() {
            selectToolHandler('add-node-tool');
        });
    }
    
    const connectTool = document.getElementById('connect-tool');
    if (connectTool) {
        connectTool.addEventListener('click', function() {
            selectToolHandler('connect-tool');
        });
    }
    
    document.getElementById('delete-tool').addEventListener('click', function() {
        selectToolHandler('delete-tool');
    });
    
    // Batch Text Entry event handlers
    const batchTextTool = document.getElementById('batch-text-tool');
    if (batchTextTool) {
        batchTextTool.addEventListener('click', function() {
            if (!currentSelectedNode) {
                showToast('Selecteer eerst een node om child nodes aan toe te voegen', true);
                return;
            }
            
            const batchModal = document.getElementById('batch-text-modal');
            const batchInput = document.getElementById('batch-text-input');
            batchInput.value = '';
            batchModal.style.display = 'flex';
            batchInput.focus();
        });
    }
    
    const confirmBatchText = document.getElementById('confirm-batch-text');
    if (confirmBatchText) {
        confirmBatchText.addEventListener('click', function() {
            const textInput = document.getElementById('batch-text-input').value;
            
            if (textInput.trim() && currentSelectedNode) {
                createBatchChildNodes(currentSelectedNode, textInput, false);
                document.getElementById('batch-text-modal').style.display = 'none';
            } else {
                showToast('Voer tekst in en zorg dat er een node geselecteerd is', true);
            }
        });
    }
    
    const cancelBatchText = document.getElementById('cancel-batch-text');
    if (cancelBatchText) {
        cancelBatchText.addEventListener('click', function() {
            document.getElementById('batch-text-modal').style.display = 'none';
        });
    }
    
    // Template Dropdown event handlers
    const templateTool = document.getElementById('template-tool');
    const templateDropdown = document.getElementById('template-dropdown');
    
    if (templateTool && templateDropdown) {
        templateTool.addEventListener('click', function(e) {
            e.stopPropagation();
            templateDropdown.classList.toggle('show');
        });
        
        // Sluit dropdown bij klik buiten
        document.addEventListener('click', function() {
            templateDropdown.classList.remove('show');
        });
        
        // Template selectie handlers
        document.querySelectorAll('.template-item').forEach(item => {
            item.addEventListener('click', function() {
                const templateKey = this.getAttribute('data-template');
                const centerX = canvas.offsetWidth / 2 + Math.random() * 200 - 100;
                const centerY = canvas.offsetHeight / 2 + Math.random() * 200 - 100;
                
                createTemplateNodeGroup(templateKey, centerX, centerY);
                templateDropdown.classList.remove('show');
            });
        });
    }
    
    // Installeer verbeterde event listeners
    setupImprovedEventListeners();
    
    // Installeer CTRL-selectie functionaliteit
    setupCtrlConnectMode();
    
    // Verbeter node interacties voor CTRL-selectie
    enhanceNodeInteractions();
    
    // Integreer UI verbeteringen
    integrateUIEnhancements();
}

/**
 * Deselecteert alle elementen
 */
function deselectAll() {
    // Reset node selecties
    document.querySelectorAll('.node').forEach(n => {
        n.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        n.classList.remove('ctrl-select-source');
        n.classList.remove('ctrl-selectable');
        // Reset transform en z-index
        if (n.style.transform.includes('scale(1.03)')) {
            n.style.transform = n.style.transform.replace(' scale(1.03)', '');
        } else if (n.style.transform === 'scale(1.03)') {
            n.style.transform = '';
        }
        n.style.zIndex = '2';
    });
    
    // Reset verbinding selecties
    currentSelectedNode = null;
    currentSelectedConnection = null;
    
    // Update tool states based on selection
    if (typeof updateToolStates === 'function') {
        updateToolStates();
    }
    
    // Vernieuw verbindingen om selectiestatus te updaten
    refreshConnections();
    
    // Reset CTRL-selectie
    resetCtrlSelectMode();
}

/**
 * Update status van geselecteerde elementen
 */
function updateSelectionStatus() {
    // Geef visuele feedback voor geselecteerde node
    if (currentSelectedNode && !currentSelectedNode.startsWith('conn-')) {
        const nodeEl = document.getElementById(currentSelectedNode);
        if (nodeEl) {
            nodeEl.style.boxShadow = '0 0 0 4px #2196F3, 0 0 0 8px rgba(33, 150, 243, 0.3), 0 0 20px rgba(33, 150, 243, 0.6), 0 8px 25px rgba(0,0,0,0.4)';
            nodeEl.style.transform = nodeEl.style.transform.includes('rotate') ? nodeEl.style.transform + ' scale(1.03)' : 'scale(1.03)';
            nodeEl.style.zIndex = '10';
        }
    }
    
    // Update tool states based on selection
    if (typeof updateToolStates === 'function') {
        updateToolStates();
    }
    
    // Vernieuw verbindingen om selectiestatus te updaten
    refreshConnections();
}

// Aangepaste event handler voor canvas click
function handleCanvasClick(e) {
    // Alleen afhandelen als er geen specifiek element is aangeklikt
    if (e.target === canvas || e.target === document.getElementById('connections-container')) {
        // Als er momenteel een selectie is, deselecteer
        if (currentSelectedNode) {
            deselectAll();
        }
    }
}

// Aangepaste event handler voor node click
function selectNode(nodeOrId) {
    // Deselecteer huidige selectie
    deselectAll();
    
    // Accepteer zowel node object als node ID
    const node = typeof nodeOrId === 'string' ? 
        nodes.find(n => n.id === nodeOrId) : nodeOrId;
    
    if (!node) {
        console.error('Node not found:', nodeOrId);
        return;
    }
    
    // Selecteer nieuwe node
    currentSelectedNode = node.id;
    
    // Update visuele status
    updateSelectionStatus();
    
    // BELANGRIJK: We willen bij selectie GEEN verandering in de curves
    // Zoek alle relevante verbindingen en zorg dat hun controlepunten stabiel blijven
    const relatedConnections = connections.filter(conn => 
        conn.source === node.id || conn.target === node.id
    );
    
    // Reset de cache voor deze node zodat we correcte verbindingen zien  
    resetConnectionCache(node.id);
    
    // Verwerk de verbindingen zorgvuldig met behoud van richting
    relatedConnections.forEach(conn => {
        // Herbereken controlepunten met behoud van richting
        recalculateControlPoint(conn, true); // true = preserveDirection
        
        // Vind alle branches die aan deze verbinding hangen en stabiliseer ook die
        const branches = connections.filter(branch => 
            branch.isTrueBranch && branch.parentConnectionId === conn.id
        );
        
        branches.forEach(branch => {
            // Ook hier willen we de controlepunten behouden van de branch
            recalculateControlPoint(branch, true);
        });
    });
    
    // Vernieuw de tekening
    refreshConnections();
}

// Aangepaste event handler voor verbinding click
function selectConnection(connection) {
    // Deselecteer huidige selectie
    deselectAll();
    
    // Selecteer nieuwe verbinding
    currentSelectedNode = connection.id;
    currentSelectedConnection = connection;
    
    // Update visuele status
    updateSelectionStatus();
}

// Toetsenbordnavigatie voor geselecteerde elementen
function setupKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
        // Alleen afhandelen als er een element is geselecteerd en we niet in een inputveld zitten
        const activeElement = document.activeElement;
        const isEditing = activeElement && 
                          (activeElement.isContentEditable || 
                           activeElement.tagName === 'INPUT' || 
                           activeElement.tagName === 'TEXTAREA');
        
        if (currentSelectedNode && !isEditing) {
            // Verwijderen met Delete of Backspace
            if (e.code === 'Delete' || e.code === 'Backspace') {
                if (currentSelectedNode.startsWith('conn-')) {
                    if (e.ctrlKey || confirm('Weet je zeker dat je deze verbinding wilt verwijderen?')) {
                        deleteConnection(currentSelectedNode);
                    }
                } else {
                    if (e.ctrlKey || confirm('Weet je zeker dat je dit knooppunt wilt verwijderen?')) {
                        deleteNode(currentSelectedNode);
                    }
                }
                e.preventDefault();
            }
            
            // Bewerken met Enter
            else if (e.code === 'Enter') {
                if (currentSelectedNode.startsWith('conn-')) {
                    openConnectionEditor(currentSelectedConnection);
                } else {
                    const node = nodes.find(n => n.id === currentSelectedNode);
                    if (node) {
                        openNodeEditor(node);
                    }
                }
                e.preventDefault();
            }
        }
    });
}

// Event handler voor selectie bij klikken met Alt toets (alternatieve selectie)
function handleAltSelectMode(e) {
    if (e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        
        // Voorkom verslepen van nodes bij Alt+click
        if (draggedNode) {
            isDragging = false;
            draggedNode = null;
            
            // Reset UI elementen
            const nodeEl = document.getElementById(currentSelectedNode);
            if (nodeEl) {
                nodeEl.style.zIndex = 2;
                // Behoud wel de selectie-highlight
                nodeEl.style.boxShadow = '0 0 0 4px #2196F3, 0 0 0 8px rgba(33, 150, 243, 0.3), 0 0 20px rgba(33, 150, 243, 0.6), 0 8px 25px rgba(0,0,0,0.4)';
            }
        }
        
        // Toggle-selectie bij Alt+click
        if (e.target.classList.contains('node') || e.target.closest('.node')) {
            const nodeEl = e.target.classList.contains('node') ? 
                e.target : e.target.closest('.node');
            const nodeId = nodeEl.id;
            const nodeObj = nodes.find(n => n.id === nodeId);
            
            if (nodeObj) {
                selectNode(nodeId);
            }
        }
        else if (e.target.classList.contains('connection-hitzone') || 
                e.target.closest('.connection')) {
            const connEl = e.target.closest('.connection');
            if (connEl) {
                const connectionId = connEl.id;
                const connection = connections.find(c => c.id === connectionId);
                
                if (connection) {
                    selectConnection(connection);
                }
            }
        }
    }
}

// Installeer verbeterde event listeners
function setupImprovedEventListeners() {
    // Selectie deselecteren bij klik op canvas
    canvas.addEventListener('click', handleCanvasClick);
    
    // Knooppunt selecteren bij Alt+klik zonder te verslepen
    canvas.addEventListener('mousedown', handleAltSelectMode, true);
    
    // Toetsenbordnavigatie
    setupKeyboardNavigation();
    
    // Update selectie-specifiek contextmenu items
    document.addEventListener('contextmenu', function(e) {
        // Bij het openen van een context menu, controleer of er een selectie is
        if (currentSelectedNode) {
            // Als er een knooppunt is geselecteerd, geef het een highlight
            updateSelectionStatus();
        }
    });
    
    // Setup touch/mobile support
    setupTouchSupport();
}

// Implementatie van CTRL-selectie voor het maken van verbindingen
function setupCtrlConnectMode() {
    document.addEventListener('keydown', function(e) {
        // Activeer CTRL-selectie modus wanneer CTRL wordt ingedrukt
        if (e.key === 'Control' && !ctrlSelectMode) {
            ctrlSelectMode = true;
            
            // Als er al een knooppunt is geselecteerd, gebruik deze als bron
            if (currentSelectedNode && !currentSelectedNode.startsWith('conn-')) {
                ctrlSelectedNode = currentSelectedNode;
                
                // Toon visuele feedback
                const nodeEl = document.getElementById(ctrlSelectedNode);
                if (nodeEl) {
                    nodeEl.classList.add('ctrl-select-source');
                }
                
                // Toon tooltip met instructies
                showCtrlTooltip("Selecteer een doelknooppunt om te verbinden (Druk op Escape om te annuleren)");
                
                // Toon andere knooppunten als potentiële doelen
                document.querySelectorAll('.node').forEach(node => {
                    if (node.id !== ctrlSelectedNode) {
                        node.classList.add('ctrl-selectable');
                    }
                });
            }
        }
    });
    
    document.addEventListener('keyup', function(e) {
        // Deactiveer CTRL-selectie modus wanneer CTRL wordt losgelaten
        if (e.key === 'Control' && ctrlSelectMode) {
            resetCtrlSelectMode();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        // Annuleer CTRL-selectie met Escape
        if (e.key === 'Escape' && ctrlSelectMode) {
            resetCtrlSelectMode();
            showToast('Verbinden geannuleerd');
        }
    });
    
    // Event handler voor het selecteren van doelknooppunten in CTRL-selectie modus
    document.addEventListener('click', function(e) {
        if (ctrlSelectMode && ctrlSelectedNode) {
            const targetNode = e.target.closest('.node');
            if (targetNode && targetNode.id !== ctrlSelectedNode) {
                // Maak verbinding tussen bron en doel
                const sourceId = ctrlSelectedNode;
                const targetId = targetNode.id;
                
                // Creëer de verbinding
                const newConnection = createConnection(sourceId, targetId);
                if (newConnection) {
                    showToast('Verbinding gemaakt');
                    
                    // Toon de nieuwe verbinding
                    refreshConnections();
                    
                    // Selecteer de nieuwe verbinding
                    selectConnection(newConnection);
                }
                
                // Reset CTRL-selectie modus maar houd CTRL-toets status
                resetCtrlSelectMode(true);
            }
        }
    });
}

// Functie om CTRL-selectie modus te resetten
function resetCtrlSelectMode(keepCtrlStatus = false) {
    // Verwijder visuele feedback
    if (ctrlSelectedNode) {
        const nodeEl = document.getElementById(ctrlSelectedNode);
        if (nodeEl) {
            nodeEl.classList.remove('ctrl-select-source');
        }
    }
    
    // Verwijder selectable class van alle nodes
    document.querySelectorAll('.node').forEach(node => {
        node.classList.remove('ctrl-selectable');
    });
    
    // Verwijder tooltip
    hideCtrlTooltip();
    
    // Reset status variabelen
    ctrlSelectedNode = null;
    if (!keepCtrlStatus) {
        ctrlSelectMode = false;
    }
}

// Functie om tooltip te tonen met instructies
function showCtrlTooltip(message) {
    // Verwijder bestaande tooltip
    hideCtrlTooltip();
    
    // Maak nieuwe tooltip
    ctrlTooltip = document.createElement('div');
    ctrlTooltip.className = 'ctrl-tooltip';
    ctrlTooltip.textContent = message;
    document.body.appendChild(ctrlTooltip);
    
    // Positioneer tooltip bij de muis
    document.addEventListener('mousemove', updateCtrlTooltipPosition);
}

// Update de positie van de tooltip
function updateCtrlTooltipPosition(e) {
    if (ctrlTooltip) {
        ctrlTooltip.style.left = (e.clientX + 15) + 'px';
        ctrlTooltip.style.top = (e.clientY + 15) + 'px';
    }
}

// Verwijder tooltip
function hideCtrlTooltip() {
    if (ctrlTooltip) {
        document.removeEventListener('mousemove', updateCtrlTooltipPosition);
        ctrlTooltip.remove();
        ctrlTooltip = null;
    }
}

// Uitbreiden van de node interacties voor CTRL-selectie
function enhanceNodeInteractions() {
    // Bij het aanmaken van nodes wordt deze functie aangeroepen om de nieuwe nodes
    // te voorzien van CTRL-selectie functionaliteit
    document.querySelectorAll('.node').forEach(nodeEl => {
        if (!nodeEl.dataset.ctrlEnabled) {
            nodeEl.dataset.ctrlEnabled = "true";
            
            // Voeg event listener toe voor CTRL-selectie
            nodeEl.addEventListener('mousedown', function(e) {
                // Als we in CTRL-selectie modus zijn
                if (ctrlSelectMode && e.button === 0) {
                    e.stopPropagation();
                    
                    // Als we nog geen bron hebben, stel deze node als bron in
                    if (!ctrlSelectedNode) {
                        ctrlSelectedNode = this.id;
                        this.classList.add('ctrl-select-source');
                        
                        // Toon andere knooppunten als doelen
                        document.querySelectorAll('.node').forEach(node => {
                            if (node.id !== ctrlSelectedNode) {
                                node.classList.add('ctrl-selectable');
                            }
                        });
                        
                        showCtrlTooltip("Selecteer een doelknooppunt om te verbinden");
                    } 
                    // Als we al een bron hebben, maak verbinding met deze node
                    else if (this.id !== ctrlSelectedNode) {
                        // Creëer verbinding
                        const newConnection = createConnection(ctrlSelectedNode, this.id);
                        if (newConnection) {
                            showToast('Verbinding gemaakt');
                            
                            // Toon de nieuwe verbinding
                            refreshConnections();
                            
                            // Selecteer de nieuwe verbinding
                            selectConnection(newConnection);
                        }
                        
                        // Reset CTRL-selectie maar houd CTRL-toets status
                        resetCtrlSelectMode(true);
                    }
                }
            });
        }
    });
}

// Integratiefunctie voor UI verbeteringen
function integrateUIEnhancements() {
    // 1. Vernieuw alle verbindingen voor verbeterde weergave
    refreshConnections();
    
    // 2. Toon een informatieve melding voor de gebruiker
    showToast('UI-verbeteringen geactiveerd: gebruik CTRL+klik voor verbindingen, hover over verbindingen voor opties');
}

// ==========================
// ENHANCED TOUCH/MOBILE SUPPORT
// ==========================

let touchStartPos = null;
let touchStartTime = null;
let lastTouchEnd = 0;
let touchHandled = false;
// Pinch distance variables moved to mobile-nav.js
let mobileOptimized = false;

/**
 * Setup enhanced touch/mobile support for the mindmap
 */
function setupTouchSupport() {
    // Check if mobile touch system is available
    if (typeof window.initializeMobileTouch === 'function') {
        // Use comprehensive mobile touch system
        console.log('📱 Using comprehensive mobile touch system');
        
        // Initialize mobile touch manager if not already done
        if (!window.mobileTouchManager) {
            window.initializeMobileTouch();
        }
        
        // Add mobile-specific optimizations
        setupMobileOptimizations();
        
        mobileOptimized = true;
    } else {
        // Fallback to basic touch support
        console.log('📱 Using basic touch fallback');
        // Don't set up basic touch support if mobile touch manager exists
        if (!window.mobileTouchManager) {
            setupBasicTouchSupport();
        }
    }
    
    // Add CSS for touch interactions
    addTouchStyles();
}

/**
 * Setup mobile-specific optimizations
 */
function setupMobileOptimizations() {
    // Add mobile-specific viewport meta tag if not present
    if (!document.querySelector('meta[name="viewport"]')) {
        const viewport = document.createElement('meta');
        viewport.name = 'viewport';
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes';
        document.head.appendChild(viewport);
    }
    
    // Optimize canvas for touch
    canvas.style.touchAction = 'none';
    
    // Add mobile-specific keyboard handling
    setupMobileKeyboard();
    
    // Add connection creation for touch
    setupTouchConnectionCreation();
    
    // Add touch-friendly branch creation
    setupTouchBranchCreation();
    
    // Optimize modal dialogs for touch
    setupTouchModalOptimizations();
    
    // Add touch performance optimizations
    setupTouchPerformanceOptimizations();
}

/**
 * Setup basic touch support as fallback
 */
function setupBasicTouchSupport() {
    // DISABLED: mobile-nav.js now handles all touch events to prevent conflicts
    // Touch start handler
    // canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    // Touch move handler
    // canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    // Touch end handler
    // canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Prevent ghost clicks after touch
    canvas.addEventListener('click', handleGhostClick, { passive: false });
}

/**
 * Handle touch start events (fallback)
 */
function handleTouchStart(e) {
    if (mobileOptimized || window.mobileTouchManager) return; // Skip if using enhanced system or mobile touch manager is active
    
    const now = Date.now();
    
    if (e.touches.length === 1) {
        // Single touch
        touchStartPos = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
        touchStartTime = now;
        touchHandled = false;
        
        // Simulate mousedown for existing functionality
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: e.touches[0].clientX,
            clientY: e.touches[0].clientY,
            button: 0,
            bubbles: true,
            cancelable: true
        });
        e.target.dispatchEvent(mouseEvent);
        
    } else if (e.touches.length === 2) {
        // Two finger touch - handled by mobile-nav.js
        // No action needed here
    }
    
    e.preventDefault();
}

/**
 * Handle touch move events (fallback)
 */
function handleTouchMove(e) {
    if (mobileOptimized || window.mobileTouchManager) return; // Skip if using enhanced system or mobile touch manager is active
    
    if (e.touches.length === 1) {
        // Single touch move - simulate mousemove
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: e.touches[0].clientX,
            clientY: e.touches[0].clientY,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(mouseEvent);
        
    } else if (e.touches.length === 2) {
        // Two finger move - handled by mobile-nav.js
        // No action needed here
    }
    
    e.preventDefault();
}

/**
 * Handle touch end events (fallback)
 */
function handleTouchEnd(e) {
    if (mobileOptimized || window.mobileTouchManager) return; // Skip if using enhanced system or mobile touch manager is active
    
    const now = Date.now();
    const touchDuration = touchStartTime ? now - touchStartTime : 0;
    
    // Check for double tap
    if (touchStartPos && now - lastTouchEnd < 300 && touchDuration < 300) {
        handleDoubleTap(e);
        touchHandled = true;
    }
    
    lastTouchEnd = now;
    
    // Simulate mouseup if we have a valid touch start position
    if (touchStartPos) {
        const mouseEvent = new MouseEvent('mouseup', {
            clientX: touchStartPos.x,
            clientY: touchStartPos.y,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(mouseEvent);
    }
    
    // Set flag to prevent ghost clicks
    setTimeout(() => {
        touchHandled = false;
    }, 300);
    
    e.preventDefault();
}

/**
 * Handle double tap to create new node
 */
function handleDoubleTap(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (touchStartPos.x - rect.left) / zoomLevel;
    const y = (touchStartPos.y - rect.top) / zoomLevel;
    
    // Snap to grid
    const snapX = Math.round(x / gridSize) * gridSize;
    const snapY = Math.round(y / gridSize) * gridSize;
    
    // Create new node
    const newNode = createNode('Nieuw idee', '', '#4CAF50', snapX, snapY, 'rounded', null, nodes.length === 0);
    
    // Make title editable
    setTimeout(() => {
        const nodeEl = document.getElementById(newNode.id);
        if (nodeEl) {
            const titleEl = nodeEl.querySelector('.node-title');
            if (titleEl) {
                makeEditable(titleEl, newNode);
            }
        }
    }, 100);
    
    showToast('Nieuwe node toegevoegd (dubbel-tik)');
}

/**
 * Prevent ghost clicks after touch events
 */
function handleGhostClick(e) {
    if (touchHandled) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
}

// Pinch zoom functions moved to mobile-nav.js
// The mobile navigation manager now handles all pinch and pan gestures

/**
 * Setup mobile keyboard handling
 */
function setupMobileKeyboard() {
    // Handle virtual keyboard appearance
    const originalHeight = window.innerHeight;
    
    window.addEventListener('resize', () => {
        const currentHeight = window.innerHeight;
        const heightDifference = originalHeight - currentHeight;
        
        // If keyboard is likely open (height reduced significantly)
        if (heightDifference > 150) {
            document.body.classList.add('keyboard-open');
            
            // Adjust canvas container
            if (canvasContainer) {
                canvasContainer.style.height = `${currentHeight - 100}px`;
            }
        } else {
            document.body.classList.remove('keyboard-open');
            
            // Restore canvas container
            if (canvasContainer) {
                canvasContainer.style.height = '';
            }
        }
    });
    
    // Handle input focus/blur
    document.addEventListener('focusin', (e) => {
        if (e.target.matches('input, textarea, [contenteditable="true"]')) {
            // Scroll into view for touch devices
            setTimeout(() => {
                if (e.target.scrollIntoView) {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        }
    });
}

/**
 * Setup touch connection creation
 */
function setupTouchConnectionCreation() {
    // Add touch-based connection creation
    // This integrates with the mobile touch manager's drag system
    
    // Enhanced connection creation for touch
    function startTouchConnection(startNode, touchPos) {
        if (window.mobileTouchManager && window.mobileTouchManager.startConnectionMode) {
            // Connection mode is now handled internally by the modern touch manager
            // via the context menu "Verbind met..." option
            window.mobileTouchManager.startConnectionMode(startNode);
        }
    }
    
    // Export for use by mobile touch manager
    window.startTouchConnection = startTouchConnection;
}

/**
 * Setup touch-friendly branch creation
 */
function setupTouchBranchCreation() {
    // Branch creation is now handled via context menus in the modern touch implementation
    // Two-finger gestures are now handled by mobile-nav.js for pinch-to-zoom
    // This function is kept for compatibility but no longer needed
}

/**
 * Setup touch modal optimizations
 */
function setupTouchModalOptimizations() {
    // Make all modal inputs touch-friendly
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
        // Improve input field sizes
        const inputs = modal.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.style.minHeight = '44px';
            input.style.fontSize = '16px';
            input.style.padding = '12px';
        });
        
        // Improve button sizes
        const buttons = modal.querySelectorAll('button');
        buttons.forEach(button => {
            button.style.minHeight = '44px';
            button.style.minWidth = '44px';
            button.style.fontSize = '16px';
            button.style.padding = '12px 20px';
        });
        
        // Add touch-friendly close behavior
        modal.addEventListener('touchstart', (e) => {
            if (e.target === modal) {
                // Close modal on background touch
                modal.style.display = 'none';
            }
        }, { passive: true });
    });
}

/**
 * Setup touch performance optimizations
 */
function setupTouchPerformanceOptimizations() {
    // Debounce touch events for better performance
    let touchMoveTimeout;
    
    // Optimize touch move events
    const originalTouchMove = canvas.addEventListener;
    
    // DISABLED: mobile-nav.js now handles all touch events to prevent conflicts
    // Use passive listeners where possible
    // canvas.addEventListener('touchstart', (e) => {
    //     // Only prevent default when necessary
    //     if (e.touches.length > 1 || e.target.closest('.node, .connection')) {
    //         e.preventDefault();
    //     }
    // }, { passive: false });
    
    // Add will-change for better performance
    const style = document.createElement('style');
    style.textContent = `
        .node, .connection {
            will-change: transform;
        }
        
        .node.dragging, .connection.dragging {
            will-change: transform, left, top;
        }
    `;
    document.head.appendChild(style);
    
    // Optimize repaints
    canvas.style.backfaceVisibility = 'hidden';
    canvas.style.perspective = '1000px';
}

/**
 * Add CSS styles for touch interactions
 */
function addTouchStyles() {
    const touchStyles = document.createElement('style');
    touchStyles.textContent = `
        /* Enhanced touch-friendly styles */
        @media (hover: none) and (pointer: coarse) {
            .node {
                min-width: 48px !important;
                min-height: 48px !important;
                font-size: 16px !important;
                padding: 12px !important;
            }
            
            .node-title {
                font-size: 16px !important;
                font-weight: 600 !important;
            }
            
            .context-menu {
                font-size: 18px !important;
            }
            
            .context-menu-item {
                padding: 16px 20px !important;
                min-height: 48px !important;
                display: flex !important;
                align-items: center !important;
            }
            
            .tool-btn {
                min-width: 48px !important;
                min-height: 48px !important;
                padding: 12px !important;
                font-size: 16px !important;
            }
            
            .zoom-controls button {
                min-width: 48px !important;
                min-height: 48px !important;
                font-size: 18px !important;
            }
            
            .add-node-btn {
                width: 32px !important;
                height: 32px !important;
                font-size: 18px !important;
            }
            
            .connection-hitzone {
                stroke-width: 20px !important;
            }
            
            /* Prevent text selection on touch devices */
            .node-title:not([contenteditable="true"]),
            .node-content:not([contenteditable="true"]),
            .tool-btn,
            .context-menu-item {
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                -khtml-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }
            
            /* Make editable elements selectable when in edit mode */
            .node-title[contenteditable="true"], 
            .node-content[contenteditable="true"],
            input,
            textarea {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
        }
        
        /* Visual feedback for touch interactions */
        .node:active {
            transform: scale(0.98);
            transition: transform 0.1s ease;
        }
        
        .tool-btn:active {
            background-color: rgba(0, 0, 0, 0.1);
            transform: scale(0.95);
        }
        
        /* Improve touch target sizes */
        .connection-label {
            min-width: 48px;
            min-height: 48px;
            padding: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        /* Touch-friendly scrollbars */
        ::-webkit-scrollbar {
            width: 12px;
            height: 12px;
        }
        
        ::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 6px;
        }
        
        ::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
        }
        
        /* Mobile keyboard adjustments */
        .keyboard-open {
            height: 100vh !important;
            overflow: hidden !important;
        }
        
        .keyboard-open .canvas-container {
            height: calc(100vh - 100px) !important;
        }
        
        /* Touch ripple effect */
        @keyframes touchRipple {
            0% {
                transform: scale(0);
                opacity: 1;
            }
            100% {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        .touch-ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.6);
            animation: touchRipple 0.6s ease-out;
            pointer-events: none;
        }
        
        /* Enhanced connection touch targets */
        .connection-dragging {
            stroke-width: 4px !important;
            stroke-dasharray: 5,5 !important;
            animation: connectionDragPulse 1s ease-in-out infinite alternate;
        }
        
        @keyframes connectionDragPulse {
            0% { stroke-opacity: 0.7; }
            100% { stroke-opacity: 1; }
        }
    `;
    document.head.appendChild(touchStyles);
}

// ==========================
// CONTEXT MENU CLEANUP
// ==========================

/**
 * Close all context menus and clean up tooltips
 */
function closeAllContextMenus() {
    // Close standard context menus
    contextMenu.style.display = 'none';
    connectionContextMenu.style.display = 'none';
    
    // Restore floating edit button if mobile touch manager exists
    if (window.mobileTouchManager && window.mobileTouchManager.activeContextMenuNode) {
        const activeNode = window.mobileTouchManager.activeContextMenuNode;
        // Re-show floating edit button if the node is still selected
        if (activeNode.classList.contains('selected')) {
            setTimeout(() => {
                window.mobileTouchManager.showFloatingEditButton(activeNode);
            }, 100);
        }
        window.mobileTouchManager.activeContextMenuNode = null;
    }
    
    // Close dynamically created canvas context menus
    document.querySelectorAll('.context-menu').forEach(menu => {
        if (menu !== contextMenu && menu !== connectionContextMenu) {
            menu.remove();
        }
    });
    
    // Clean up tooltips
    hideDropPreview();
    hideCtrlTooltip();
}

// ==========================
// DROP PREVIEW FUNCTIONS
// ==========================

let dropPreviewTooltip = null;

/**
 * Show a preview tooltip during drag operations
 * @param {number} x - X coordinate for tooltip position
 * @param {number} y - Y coordinate for tooltip position  
 * @param {string} message - Message to display in tooltip
 * @param {boolean} isError - Whether this is an error message (red styling)
 */
function showDropPreview(x, y, message, isError = false) {
    // Remove existing tooltip
    hideDropPreview();
    
    // Create new tooltip
    dropPreviewTooltip = document.createElement('div');
    dropPreviewTooltip.className = 'drop-preview-tooltip';
    dropPreviewTooltip.textContent = message;
    
    // Apply styling
    dropPreviewTooltip.style.cssText = `
        position: fixed;
        left: ${x + 15}px;
        top: ${y + 15}px;
        background: ${isError ? '#f44336' : '#4CAF50'};
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        z-index: 10000;
        pointer-events: none;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        white-space: nowrap;
        max-width: 200px;
        text-overflow: ellipsis;
        overflow: hidden;
        opacity: 0;
        transform: translateY(-5px);
        transition: opacity 0.2s ease, transform 0.2s ease;
    `;
    
    document.body.appendChild(dropPreviewTooltip);
    
    // Animate in
    requestAnimationFrame(() => {
        if (dropPreviewTooltip) {
            dropPreviewTooltip.style.opacity = '1';
            dropPreviewTooltip.style.transform = 'translateY(0)';
        }
    });
}

/**
 * Hide the drop preview tooltip
 */
function hideDropPreview() {
    if (dropPreviewTooltip) {
        dropPreviewTooltip.style.opacity = '0';
        dropPreviewTooltip.style.transform = 'translateY(-5px)';
        
        setTimeout(() => {
            if (dropPreviewTooltip) {
                dropPreviewTooltip.remove();
                dropPreviewTooltip = null;
            }
        }, 150); // Reduced timeout for faster cleanup
    }
}

// ==========================
// HAMBURGER MENU FUNCTIONS
// ==========================

/**
 * Setup hamburger menu functionality
 */
function setupHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const hamburgerMenu = document.getElementById('hamburger-menu');
    
    if (!hamburgerBtn || !hamburgerMenu) return;
    
    // Toggle menu on hamburger button click
    hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleHamburgerMenu();
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!hamburgerMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
            closeHamburgerMenu();
        }
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeHamburgerMenu();
        }
    });
    
    // Prevent menu content clicks from closing menu
    hamburgerMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // Mobile menu event listeners
    const menuSaveBtn = document.getElementById('menu-save-btn');
    const menuLoadBtn = document.getElementById('menu-load-btn');
    const menuExportMermaidBtn = document.getElementById('menu-export-mermaid-btn');
    const menuExportImageBtn = document.getElementById('menu-export-image-btn');
    const menuCenterBtn = document.getElementById('menu-center-btn');
    const menuClearBtn = document.getElementById('menu-clear-btn');
    const menuHelpBtn = document.getElementById('menu-help-btn');
    
    if (menuSaveBtn) {
        menuSaveBtn.addEventListener('click', () => {
            if (typeof showSmartSaveDialog === 'function') {
                showSmartSaveDialog();
            } else if (typeof exportToJson === 'function') {
                exportToJson();
            } else {
                showToast('Save functie niet beschikbaar', true);
            }
            closeHamburgerMenu();
        });
    }
    
    if (menuLoadBtn) {
        menuLoadBtn.addEventListener('click', () => {
            document.getElementById('file-input').click();
            closeHamburgerMenu();
        });
    }
    
    const menuVersionBrowserBtn = document.getElementById('menu-version-browser-btn');
    if (menuVersionBrowserBtn) {
        menuVersionBrowserBtn.addEventListener('click', () => {
            if (window.VersionBrowser) {
                window.VersionBrowser.show();
            } else {
                showToast('Version browser niet beschikbaar', true);
            }
            closeHamburgerMenu();
        });
    }
    
    if (menuExportMermaidBtn) {
        menuExportMermaidBtn.addEventListener('click', () => {
            exportToMermaid();
            closeHamburgerMenu();
        });
    }
    
    if (menuExportImageBtn) {
        menuExportImageBtn.addEventListener('click', () => {
            exportAsImage();
            closeHamburgerMenu();
        });
    }
    
    if (menuCenterBtn) {
        menuCenterBtn.addEventListener('click', () => {
            centerView();
            closeHamburgerMenu();
        });
    }
    
    if (menuClearBtn) {
        menuClearBtn.addEventListener('click', () => {
            if (confirm('Weet je zeker dat je de mindmap wilt wissen?')) {
                clearMindmap(true); // Clear version history when explicitly clearing
            }
            closeHamburgerMenu();
        });
    }
    
    if (menuHelpBtn) {
        menuHelpBtn.addEventListener('click', () => {
            helpModal.style.display = 'flex';
            closeHamburgerMenu();
            // Reset help modal to first tab when opened
            resetHelpModalToFirstTab();
        });
    }
}

/**
 * Toggle hamburger menu open/close
 */
function toggleHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const hamburgerMenu = document.getElementById('hamburger-menu');
    
    if (!hamburgerBtn || !hamburgerMenu) return;
    
    const isOpen = hamburgerMenu.classList.contains('active');
    
    if (isOpen) {
        closeHamburgerMenu();
    } else {
        openHamburgerMenu();
    }
}

/**
 * Open hamburger menu
 */
function openHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const hamburgerMenu = document.getElementById('hamburger-menu');
    
    if (!hamburgerBtn || !hamburgerMenu) return;
    
    hamburgerBtn.classList.add('active');
    hamburgerMenu.classList.add('active');
    
    // Prevent body scroll when menu is open
    document.body.style.overflow = 'hidden';
}

/**
 * Close hamburger menu
 */
function closeHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const hamburgerMenu = document.getElementById('hamburger-menu');
    
    if (!hamburgerBtn || !hamburgerMenu) return;
    
    hamburgerBtn.classList.remove('active');
    hamburgerMenu.classList.remove('active');
    
    // Restore body scroll
    document.body.style.overflow = '';
}

/**
 * Initialize modern help system with tabs and search functionality
 */
function initializeHelpSystem() {
    const helpTabs = document.querySelectorAll('.help-tab');
    const helpTabContents = document.querySelectorAll('.help-tab-content');
    const helpSearchInput = document.getElementById('help-search');
    
    // Tab navigation
    helpTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            helpTabs.forEach(t => t.classList.remove('active'));
            helpTabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
    
    // Search functionality
    if (helpSearchInput) {
        let searchTimeout;
        helpSearchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performHelpSearch(this.value.toLowerCase().trim());
            }, 300); // Debounce search
        });
        
        // Clear search on escape
        helpSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                this.value = '';
                performHelpSearch('');
            }
        });
    }
}

/**
 * Perform search within help content
 */
function performHelpSearch(searchTerm) {
    const helpTabContents = document.querySelectorAll('.help-tab-content');
    const helpTabs = document.querySelectorAll('.help-tab');
    
    if (!searchTerm) {
        // Clear search - show all content and reset tabs
        helpTabContents.forEach(content => {
            content.style.display = '';
            const items = content.querySelectorAll('.help-feature-item, .help-shortcut-item');
            items.forEach(item => {
                item.style.display = '';
                // Remove search highlights
                item.innerHTML = item.innerHTML.replace(/<mark class="help-search-highlight">([^<]*)<\/mark>/gi, '$1');
            });
        });
        
        // Reset to first tab
        helpTabs.forEach(tab => tab.classList.remove('active'));
        helpTabContents.forEach(content => content.classList.remove('active'));
        if (helpTabs[0]) helpTabs[0].classList.add('active');
        if (helpTabContents[0]) helpTabContents[0].classList.add('active');
        
        return;
    }
    
    let hasResults = false;
    let firstResultTab = null;
    
    helpTabContents.forEach((content, index) => {
        const items = content.querySelectorAll('.help-feature-item, .help-shortcut-item');
        let tabHasResults = false;
        
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            
            if (text.includes(searchTerm)) {
                item.style.display = '';
                tabHasResults = true;
                hasResults = true;
                
                // Highlight search term
                const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
                item.innerHTML = item.innerHTML.replace(/<mark class="help-search-highlight">([^<]*)<\/mark>/gi, '$1');
                item.innerHTML = item.innerHTML.replace(regex, '<mark class="help-search-highlight">$1</mark>');
                
                if (!firstResultTab) {
                    firstResultTab = index;
                }
            } else {
                item.style.display = 'none';
            }
        });
        
        // Show/hide entire sections based on results
        const sections = content.querySelectorAll('.help-feature-group');
        sections.forEach(section => {
            const visibleItems = section.querySelectorAll('.help-feature-item:not([style*="display: none"]), .help-shortcut-item:not([style*="display: none"])');
            section.style.display = visibleItems.length > 0 ? '' : 'none';
        });
    });
    
    // Switch to first tab with results
    if (hasResults && firstResultTab !== null) {
        helpTabs.forEach(tab => tab.classList.remove('active'));
        helpTabContents.forEach(content => content.classList.remove('active'));
        
        if (helpTabs[firstResultTab]) helpTabs[firstResultTab].classList.add('active');
        if (helpTabContents[firstResultTab]) helpTabContents[firstResultTab].classList.add('active');
    }
    
    // Show no results message if needed
    if (!hasResults) {
        showNoSearchResults();
    } else {
        hideNoSearchResults();
    }
}

/**
 * Escape special regex characters for search
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Show no search results message
 */
function showNoSearchResults() {
    let noResultsDiv = document.querySelector('.help-no-results');
    if (!noResultsDiv) {
        noResultsDiv = document.createElement('div');
        noResultsDiv.className = 'help-no-results';
        noResultsDiv.innerHTML = `
            <div class="help-no-results-icon">🔍</div>
            <div>Geen resultaten gevonden</div>
            <div style="font-size: 0.9em; margin-top: 8px; color: #999;">Probeer andere zoektermen</div>
        `;
        
        const helpContent = document.querySelector('.help-content');
        if (helpContent) {
            helpContent.appendChild(noResultsDiv);
        }
    }
    noResultsDiv.style.display = 'flex';
}

/**
 * Hide no search results message
 */
function hideNoSearchResults() {
    const noResultsDiv = document.querySelector('.help-no-results');
    if (noResultsDiv) {
        noResultsDiv.style.display = 'none';
    }
}

/**
 * Reset help modal to first tab and clear search
 */
function resetHelpModalToFirstTab() {
    const helpTabs = document.querySelectorAll('.help-tab');
    const helpTabContents = document.querySelectorAll('.help-tab-content');
    const helpSearchInput = document.getElementById('help-search');
    
    // Clear search
    if (helpSearchInput) {
        helpSearchInput.value = '';
        performHelpSearch('');
    }
    
    // Reset to first tab
    helpTabs.forEach(tab => tab.classList.remove('active'));
    helpTabContents.forEach(content => content.classList.remove('active'));
    
    if (helpTabs[0]) helpTabs[0].classList.add('active');
    if (helpTabContents[0]) helpTabContents[0].classList.add('active');
    
    // Hide no results message
    hideNoSearchResults();
}