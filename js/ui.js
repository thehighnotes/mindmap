/**
 * ui.js - Bevat UI-gerelateerde functies en event handlers
 */

// Event handler voor mouseup (na verplaatsen)
function handleMouseUp(e) {
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
 * Performance-geoptimaliseerde functie om alleen verbindingen te updaten
 * die gerelateerd zijn aan de gegeven node ID, inclusief aftakkingspunten
 * @param {string} nodeId - ID van de node waarvan verbindingen moeten worden bijgewerkt
 * @param {boolean} isForDrag - Geeft aan of deze update voor het slepen van een node is
 */
function updateRelatedConnections(nodeId, isForDrag = true) {
    // Bouw de cache op als die nog niet bestaat voor deze node
    if (!nodeConnectionsCache[nodeId]) {
        nodeConnectionsCache[nodeId] = connections.filter(conn => 
            conn.source === nodeId || conn.target === nodeId ||
            (conn.isTrueBranch && conn.branchNodeId === nodeId)
        );
    }
    
    // Cache van de update zodat alleen de relevante verbindingen worden bijgewerkt
    const relatedConnections = nodeConnectionsCache[nodeId];
    
    // Optimalisatie: Als er geen verbindingen zijn voor deze node, stoppen we
    if (relatedConnections.length === 0) return;
    
    // Update alleen de verbindingen die aan deze node gerelateerd zijn
    // Gebruik requestAnimationFrame voor vloeiendere beweging
    if (!window.isUpdatingConnections) {
        window.isUpdatingConnections = true;
        
        // Gebruik requestAnimationFrame voor soepelere animatie
        requestAnimationFrame(() => {
            // Bereken eerst alle controlepunten opnieuw bij een sleepactie
            // Dit zorgt voor mooiere curves bij het verslepen over grotere afstanden
            if (isForDrag) {
                relatedConnections.forEach(conn => {
                    // Herbereken het controlepunt voor een betere UX
                    // Behoud de richting van de curve tijdens het slepen
                    recalculateControlPoint(conn, true);
                });
            }
            
            // Teken alle verbindingen opnieuw
            relatedConnections.forEach(conn => {
                // Gebruik de bestaande drawConnection functie om deze verbinding te updaten
                drawConnection(conn);
            });
            
            // Update ook alle aftakkingspunten die aan deze node gerelateerd zijn
            // Dit is cruciaal voor het correct bijwerken van branch verbindingen
            updateBranchStartPointsForNode(nodeId);
            
            window.isUpdatingConnections = false;
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
    // Pan canvas
    else if (canvasDragging) {
        const moveX = e.clientX - canvasDragStart.x;
        const moveY = e.clientY - canvasDragStart.y;
        
        canvasOffset.x += moveX;
        canvasOffset.y += moveY;
        
        canvasDragStart = { x: e.clientX, y: e.clientY };
        
        updateCanvasTransform();
    }
    // Update tijdelijke verbindingslijn
    else if (currentTool === 'connect' && sourceNode) {
        const sourceNodeObj = nodes.find(n => n.id === sourceNode);
        if (sourceNodeObj) {
            showTemporaryConnectionLine(sourceNodeObj, e);
        }
    }
}

// Context menu acties voor nodes
function setupContextMenuActions() {
    // Bewerken via context menu
    document.getElementById('context-edit').addEventListener('click', function() {
        const nodeId = contextMenu.dataset.nodeId;
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            openNodeEditor(node);
        }
        contextMenu.style.display = 'none';
    });
    
    // Hernoemen via context menu
    document.getElementById('context-rename').addEventListener('click', function() {
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
    
    // Nieuw subknooppunt via context menu
    document.getElementById('context-create-child').addEventListener('click', function() {
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
    
    // Batch children via context menu
    document.getElementById('context-batch-children').addEventListener('click', function() {
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
    
    // Y-vertakking via context menu
    document.getElementById('context-branch').addEventListener('click', function() {
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
    
    // Hoofdknooppunt instellen via context menu
    document.getElementById('context-set-root').addEventListener('click', function() {
        const nodeId = contextMenu.dataset.nodeId;
        setRootNode(nodeId);
        contextMenu.style.display = 'none';
    });
    
    // Verwijderen via context menu
    document.getElementById('context-delete').addEventListener('click', function() {
        const nodeId = contextMenu.dataset.nodeId;
        deleteNode(nodeId);
        contextMenu.style.display = 'none';
    });
}

// Context menu acties voor verbindingen
function setupConnectionContextMenuActions() {
    // Bewerken via context menu
    document.getElementById('connection-edit').addEventListener('click', function() {
        const connectionId = connectionContextMenu.dataset.connectionId;
        const connection = connections.find(c => c.id === connectionId);
        if (connection) {
            openConnectionEditor(connection);
        }
        connectionContextMenu.style.display = 'none';
    });
    
    // Vertakking maken via context menu
    document.getElementById('connection-branch').addEventListener('click', function() {
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
    
    // Stijlen instellen via context menu
    document.getElementById('connection-style-solid').addEventListener('click', function() {
        const connectionId = connectionContextMenu.dataset.connectionId;
        const connection = connections.find(c => c.id === connectionId);
        if (connection) {
            setConnectionStyle(connection, 'solid');
        }
        connectionContextMenu.style.display = 'none';
    });
    
    document.getElementById('connection-style-dashed').addEventListener('click', function() {
        const connectionId = connectionContextMenu.dataset.connectionId;
        const connection = connections.find(c => c.id === connectionId);
        if (connection) {
            setConnectionStyle(connection, 'dashed');
        }
        connectionContextMenu.style.display = 'none';
    });
    
    // Types instellen via context menu
    document.getElementById('connection-type-default').addEventListener('click', function() {
        const connectionId = connectionContextMenu.dataset.connectionId;
        const connection = connections.find(c => c.id === connectionId);
        if (connection) {
            setConnectionType(connection, 'default');
        }
        connectionContextMenu.style.display = 'none';
    });
    
    document.getElementById('connection-type-primary').addEventListener('click', function() {
        const connectionId = connectionContextMenu.dataset.connectionId;
        const connection = connections.find(c => c.id === connectionId);
        if (connection) {
            setConnectionType(connection, 'primary');
        }
        connectionContextMenu.style.display = 'none';
    });
    
    document.getElementById('connection-type-secondary').addEventListener('click', function() {
        const connectionId = connectionContextMenu.dataset.connectionId;
        const connection = connections.find(c => c.id === connectionId);
        if (connection) {
            setConnectionType(connection, 'secondary');
        }
        connectionContextMenu.style.display = 'none';
    });
    
    // Verwijderen via context menu
    document.getElementById('connection-delete').addEventListener('click', function() {
        const connectionId = connectionContextMenu.dataset.connectionId;
        deleteConnection(connectionId);
        connectionContextMenu.style.display = 'none';
    });
}

// Stel alle event listeners in
function setupEventListeners() {
    // Canvas navigatie
    canvas.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Zoom handlers
    canvasContainer.addEventListener('wheel', function(e) {
        e.preventDefault();
        
        // Bereken canvas positie onder cursor
        const rect = canvasContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Bereken schaal verandering
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = zoomLevel * delta;
        
        // Schaalverandering toepassen
        setZoomLevel(newZoom);
        
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
        contextMenu.style.display = 'none';
        connectionContextMenu.style.display = 'none';
        
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
            selectNode(newNode);
            
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
    saveBtn.addEventListener('click', exportToJson);
    loadBtn.addEventListener('click', function() {
        fileInput.click();
    });
    
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
    });
    closeHelp.addEventListener('click', function() {
        helpModal.style.display = 'none';
    });
    
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
            clearMindmap();
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
    
    // Voeg de contextmenu actions toe
    setupContextMenuActions();
    setupConnectionContextMenuActions();
    
    // Sluit contextmenu bij klik elders
    document.addEventListener('click', function() {
        contextMenu.style.display = 'none';
        connectionContextMenu.style.display = 'none';
    });
    
    // Voorkom standaard contextmenu
    canvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        // Sluit bestaande context menu's als op canvas wordt geklikt
        contextMenu.style.display = 'none';
        connectionContextMenu.style.display = 'none';
        
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
                selectNode(newNode);
                
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
            exportToJson();
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
<<<<<<< HEAD
            const connectSiblings = document.getElementById('auto-connect-siblings').checked;
            
            if (textInput.trim() && currentSelectedNode) {
                createBatchChildNodes(currentSelectedNode, textInput, connectSiblings);
=======
            
            if (textInput.trim() && currentSelectedNode) {
                createBatchChildNodes(currentSelectedNode, textInput);
>>>>>>> 9a8c686 (Add test HTML for Ghost Connection bug fix with detailed steps and console commands)
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
    
<<<<<<< HEAD
=======
    // Update tool states based on selection
    if (typeof updateToolStates === 'function') {
        updateToolStates();
    }
    
>>>>>>> 9a8c686 (Add test HTML for Ghost Connection bug fix with detailed steps and console commands)
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
    
<<<<<<< HEAD
=======
    // Update tool states based on selection
    if (typeof updateToolStates === 'function') {
        updateToolStates();
    }
    
>>>>>>> 9a8c686 (Add test HTML for Ghost Connection bug fix with detailed steps and console commands)
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
function selectNode(node) {
    // Deselecteer huidige selectie
    deselectAll();
    
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
                selectNode(nodeObj);
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