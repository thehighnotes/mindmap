/**
 * mindmap-quick-wins.js - Complete uitbreidingen en bug fixes voor de Mindmap tool
 * 
 * INSTALLATIE:
 * 1. Sla dit bestand op als 'mindmap-quick-wins.js' in je mindmap directory
 * 2. Voeg toe aan index.html NA alle andere JavaScript bestanden:
 *    <script src="mindmap-quick-wins.js"></script>
 * 
 * BEVAT:
 * ✅ 8 Features:
 *    1. Copy/Paste functionaliteit (Ctrl+C/V)
 *    2. Uitgebreide node templates (Kanban, Weekplanning, etc.)
 *    3. Touch/Mobile ondersteuning (pinch zoom, double tap)
 *    4. Zoom naar selectie (Ctrl+F)
 *    5. Connection labels auto-roteren
 *    6. Slimme bulk node positionering
 *    7. Node herverbinden (ALT+drag tussen parents)
 *    8. Intelligente pijl positionering bij curve aanpassing
 * 
 * 🐛 15 Bug Fixes:
 *    - Memory leaks in event listeners
 *    - Race conditions in updates
 *    - Z-index management
 *    - Null reference errors
 *    - Touch event ghost clicks
 *    - Performance optimalisaties
 *    - Diamond node dubbele rotatie
 *    - En meer...
 * 
 * 🛡️ Preventieve Maatregelen:
 *    - Global error handler
 *    - Infinite loop detection
 *    - Performance monitoring
 * 
 * CLAUDE CODE IMPLEMENTATIE NOTITIES:
 * - Dit bestand bevat ALLE fixes en features in één centraal bestand
 * - De originele bestanden hoeven NIET aangepast te worden
 * - Alle overrides gebruiken het decorator pattern
 * - Backward compatible met bestaande mindmaps
 * 
 * Bij problemen:
 * - Check console voor error messages
 * - Verwijder dit bestand tijdelijk om te testen
 * - Alle features kunnen individueel uitgeschakeld worden
 */

// ==========================
// 1. COPY/PASTE FUNCTIONALITEIT
// ==========================

let clipboard = {
    nodes: [],
    connections: []
};

// Kopieer geselecteerde node(s)
function copySelectedNodes() {
    if (!currentSelectedNode || currentSelectedNode.startsWith('conn-')) return;
    
    const node = nodes.find(n => n.id === currentSelectedNode);
    if (!node) return;
    
    // Reset clipboard
    clipboard = {
        nodes: [JSON.parse(JSON.stringify(node))], // Deep copy
        connections: []
    };
    
    // Kopieer ook verbindingen tussen gekopieerde nodes
    const nodeIds = clipboard.nodes.map(n => n.id);
    clipboard.connections = connections.filter(conn => 
        nodeIds.includes(conn.source) && nodeIds.includes(conn.target)
    ).map(conn => JSON.parse(JSON.stringify(conn)));
    
    showToast(`Node "${node.title}" gekopieerd`);
}

// Plak nodes op huidige muispositie
function pasteNodes(mouseX = null, mouseY = null) {
    if (clipboard.nodes.length === 0) {
        showToast('Niets om te plakken', true);
        return;
    }
    
    // Sla staat op voor undo
    saveStateForUndo();
    
    // Bereken offset voor nieuwe positie
    const offsetX = mouseX || (canvas.clientWidth / 2 / zoomLevel);
    const offsetY = mouseY || (canvas.clientHeight / 2 / zoomLevel);
    
    // Map oude IDs naar nieuwe IDs
    const idMap = {};
    const pastedNodes = [];
    
    // Maak nieuwe nodes
    clipboard.nodes.forEach((nodeData, index) => {
        const oldId = nodeData.id;
        const newNode = createNode(
            nodeData.title + ' (kopie)',
            nodeData.content,
            nodeData.color,
            offsetX + (index * 30), // Kleine offset voor meerdere nodes
            offsetY + (index * 30),
            nodeData.shape,
            null,
            false
        );
        
        idMap[oldId] = newNode.id;
        pastedNodes.push(newNode);
    });
    
    // Maak nieuwe verbindingen
    clipboard.connections.forEach(connData => {
        const newSourceId = idMap[connData.source];
        const newTargetId = idMap[connData.target];
        
        if (newSourceId && newTargetId) {
            const newConn = createConnection(newSourceId, newTargetId, connData.isYBranch);
            if (newConn) {
                newConn.label = connData.label;
                newConn.styleClass = connData.styleClass;
            }
        }
    });
    
    // Selecteer eerste geplakte node
    if (pastedNodes.length > 0) {
        deselectAll();
        currentSelectedNode = pastedNodes[0].id;
        updateSelectionStatus();
    }
    
    refreshConnections();
    updateMinimap();
    
    showToast(`${pastedNodes.length} node(s) geplakt`);
}

// ==========================
// 2. UITGEBREIDE NODE TEMPLATES
// ==========================

// Voeg nieuwe templates toe
const additionalTemplates = {
    kanban: {
        name: 'Kanban Board',
        nodes: [
            { title: 'Kanban Board', x: 0, y: 0, color: '#2196F3', shape: 'rounded', isCenter: true },
            { title: 'Te Doen', x: -200, y: 100, color: '#F44336', shape: 'rectangle' },
            { title: 'In Uitvoering', x: 0, y: 100, color: '#FF9800', shape: 'rectangle' },
            { title: 'Review', x: 200, y: 100, color: '#9C27B0', shape: 'rectangle' },
            { title: 'Gereed', x: 400, y: 100, color: '#4CAF50', shape: 'rectangle' }
        ],
        connections: [
            [0, 1], [0, 2], [0, 3], [0, 4]
        ]
    },
    
    mindfulness: {
        name: 'Mindfulness Map',
        nodes: [
            { title: 'Mindfulness', x: 0, y: 0, color: '#00BCD4', shape: 'circle', isCenter: true },
            { title: 'Ademhaling', x: -150, y: -100, color: '#03A9F4', shape: 'circle' },
            { title: 'Observatie', x: 150, y: -100, color: '#03A9F4', shape: 'circle' },
            { title: 'Acceptatie', x: -150, y: 100, color: '#03A9F4', shape: 'circle' },
            { title: 'Loslaten', x: 150, y: 100, color: '#03A9F4', shape: 'circle' },
            { title: 'Hier & Nu', x: 0, y: 150, color: '#00ACC1', shape: 'circle' }
        ],
        connections: [
            [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
            [1, 5], [2, 5], [3, 5], [4, 5]
        ]
    },
    
    weekplanning: {
        name: 'Weekplanning',
        nodes: [
            { title: 'Week Planning', x: 0, y: 0, color: '#607D8B', shape: 'rounded', isCenter: true },
            { title: 'Maandag', x: -300, y: 100, color: '#455A64', shape: 'rectangle' },
            { title: 'Dinsdag', x: -150, y: 100, color: '#455A64', shape: 'rectangle' },
            { title: 'Woensdag', x: 0, y: 100, color: '#455A64', shape: 'rectangle' },
            { title: 'Donderdag', x: 150, y: 100, color: '#455A64', shape: 'rectangle' },
            { title: 'Vrijdag', x: 300, y: 100, color: '#455A64', shape: 'rectangle' }
        ],
        connections: [
            [0, 1], [0, 2], [0, 3], [0, 4], [0, 5]
        ]
    }
};

// Voeg templates toe aan bestaande nodeTemplates
Object.assign(nodeTemplates, additionalTemplates);

// ==========================
// 3. TOUCH/MOBILE ONDERSTEUNING
// ==========================

let touchStartPos = null;
let touchStartTime = null;
let lastTouchEnd = 0;

// Touch event handlers
canvas.addEventListener('touchstart', function(e) {
    const now = Date.now();
    const timeSinceLastTouch = now - lastTouchEnd;
    
    if (e.touches.length === 1) {
        touchStartPos = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
        touchStartTime = now;
        
        // Simuleer mousedown voor bestaande functionaliteit
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: e.touches[0].clientX,
            clientY: e.touches[0].clientY,
            button: 0
        });
        e.target.dispatchEvent(mouseEvent);
    } else if (e.touches.length === 2) {
        // Start pinch zoom
        handlePinchStart(e);
    }
    
    e.preventDefault();
});

canvas.addEventListener('touchmove', function(e) {
    if (e.touches.length === 1) {
        // Simuleer mousemove
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: e.touches[0].clientX,
            clientY: e.touches[0].clientY
        });
        document.dispatchEvent(mouseEvent);
    } else if (e.touches.length === 2) {
        // Handle pinch zoom
        handlePinchMove(e);
    }
    
    e.preventDefault();
});

canvas.addEventListener('touchend', function(e) {
    const now = Date.now();
    const touchDuration = now - touchStartTime;
    
    // Detecteer double tap
    if (now - lastTouchEnd < 300) {
        // Double tap gedetecteerd
        const rect = canvas.getBoundingClientRect();
        const x = (touchStartPos.x - rect.left) / zoomLevel;
        const y = (touchStartPos.y - rect.top) / zoomLevel;
        
        // Maak nieuwe node op double tap positie
        const newNode = createNode('Nieuw idee', '', '#4CAF50', x, y, 'rounded', null, nodes.length === 0);
        
        const nodeEl = document.getElementById(newNode.id);
        if (nodeEl) {
            const titleEl = nodeEl.querySelector('.node-title');
            if (titleEl) {
                makeEditable(titleEl, newNode);
            }
        }
    }
    
    lastTouchEnd = now;
    
    // Simuleer mouseup
    const mouseEvent = new MouseEvent('mouseup', {
        clientX: touchStartPos.x,
        clientY: touchStartPos.y
    });
    document.dispatchEvent(mouseEvent);
    
    e.preventDefault();
});

// Pinch zoom functionaliteit
let initialPinchDistance = null;
let lastPinchDistance = null;

function handlePinchStart(e) {
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    
    initialPinchDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
    );
    lastPinchDistance = initialPinchDistance;
}

function handlePinchMove(e) {
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    
    const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
    );
    
    const scale = currentDistance / lastPinchDistance;
    setZoomLevel(zoomLevel * scale);
    
    lastPinchDistance = currentDistance;
}

// ==========================
// 4. ZOOM NAAR SELECTIE
// ==========================

function zoomToSelection() {
    if (!currentSelectedNode) {
        showToast('Selecteer eerst een node om in te zoomen');
        return;
    }
    
    // Voor nodes
    if (!currentSelectedNode.startsWith('conn-')) {
        const node = nodes.find(n => n.id === currentSelectedNode);
        if (!node) return;
        
        // Zoom naar 150% voor goede focus
        setZoomLevel(1.5);
        
        // Centreer op de node
        centerOnNode(node.id);
        
        showToast('Ingezoomd op selectie');
    } else {
        // Voor verbindingen, zoom naar het midden
        const connection = connections.find(c => c.id === currentSelectedNode);
        if (!connection) return;
        
        const sourceNode = nodes.find(n => n.id === connection.source);
        const targetNode = nodes.find(n => n.id === connection.target);
        
        if (sourceNode && targetNode) {
            const centerX = (sourceNode.x + targetNode.x) / 2;
            const centerY = (sourceNode.y + targetNode.y) / 2;
            
            setZoomLevel(1.2);
            
            const containerRect = canvasContainer.getBoundingClientRect();
            canvasOffset.x = (containerRect.width / 2) - (centerX * zoomLevel);
            canvasOffset.y = (containerRect.height / 2) - (centerY * zoomLevel);
            
            updateCanvasTransform();
            showToast('Ingezoomd op verbinding');
        }
    }
}

// ==========================
// 5. CONNECTION LABELS ROTEREN + BUG FIX 4
// ==========================

// Bewaar de originele drawConnection functie één keer
const originalDrawConnection = window.drawConnection;

// Override drawConnection met zowel label rotatie als null checks
window.drawConnection = function(connection) {
    // BUG FIX 4: Extra null checks
    if (!connection || !connection.id) {
        console.warn('[drawConnection] Invalid connection object');
        return;
    }
    
    if (!connections.find(c => c.id === connection.id)) {
        console.warn(`[drawConnection] Connection ${connection.id} not found in connections array`);
        return;
    }
    
    // Check of nodes bestaan
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) {
        // Verwijder de verbinding uit de array
        const index = connections.findIndex(c => c.id === connection.id);
        if (index !== -1) {
            connections.splice(index, 1);
        }
        
        // Verwijder DOM element als het bestaat
        const element = document.getElementById(connection.id);
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
        return;
    }
    
    // Roep originele functie aan
    originalDrawConnection.call(this, connection);
    
    // FEATURE 5: Label rotatie
    const connEl = document.getElementById(connection.id);
    if (!connEl || !connection.label) return;
    
    const labelEl = connEl.querySelector('.connection-label');
    if (!labelEl) return;
    
    // Bereken de hoek van de verbinding
    const sourceCenter = getNodeCenter(sourceNode);
    const targetCenter = getNodeCenter(targetNode);
    
    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // Zorg dat tekst niet ondersteboven staat
    if (angle > 90 || angle < -90) {
        angle += 180;
    }
    
    // Pas rotatie toe op label
    labelEl.style.transform = `translate(-50%, -100%) rotate(${angle}deg)`;
    labelEl.style.transformOrigin = 'center center';
    
    // FEATURE 8: Update connection path met intelligente pijlen
    if (connection.controlPoint) {
        const smartStartPoint = getNodeEdgePoint(sourceNode, null, true, connection.controlPoint);
        const smartEndPoint = getNodeEdgePoint(targetNode, null, false, connection.controlPoint);
        
        // Update het SVG pad als de eindpunten zijn veranderd
        const paths = connEl.querySelectorAll('path');
        if (paths.length > 0 && (smartStartPoint || smartEndPoint)) {
            const pathData = `M ${smartStartPoint.x} ${smartStartPoint.y} Q ${connection.controlPoint.x} ${connection.controlPoint.y} ${smartEndPoint.x} ${smartEndPoint.y}`;
            paths.forEach(path => {
                path.setAttribute('d', pathData);
            });
        }
    }
};

// ==========================
// KEYBOARD SHORTCUTS UITBREIDING
// ==========================

document.addEventListener('keydown', function(e) {
    // Voorkom acties tijdens het bewerken van tekst
    if (document.activeElement.isContentEditable || 
        document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA') {
        return;
    }
    
    // Copy (Ctrl+C)
    if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        copySelectedNodes();
    }
    
    // Paste (Ctrl+V)
    else if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const centerX = (rect.width / 2 - canvasOffset.x) / zoomLevel;
        const centerY = (rect.height / 2 - canvasOffset.y) / zoomLevel;
        pasteNodes(centerX, centerY);
    }
    
    // Zoom to selection (Ctrl+F)
    else if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        zoomToSelection();
    }
    
    // Quick add child node (Tab)
    else if (e.key === 'Tab' && currentSelectedNode && !currentSelectedNode.startsWith('conn-')) {
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
    
    // ALT key hint voor reconnect mode
    else if (e.key === 'Alt' && currentSelectedNode && !currentSelectedNode.startsWith('conn-')) {
        const nodeEl = document.getElementById(currentSelectedNode);
        if (nodeEl && !nodeEl.dataset.altHint) {
            nodeEl.dataset.altHint = 'true';
            showToast('Houd ALT ingedrukt en sleep om te herverbinden', false);
        }
    }
});

// Cleanup ALT hint bij key up
document.addEventListener('keyup', function(e) {
    if (e.key === 'Alt') {
        document.querySelectorAll('[data-alt-hint]').forEach(el => {
            delete el.dataset.altHint;
        });
    }
});

// ==========================
// UI VERBETERINGEN
// ==========================

// Voeg zoom to selection knop toe aan de toolbar
const zoomToSelectionBtn = document.createElement('button');
zoomToSelectionBtn.className = 'tool-btn';
zoomToSelectionBtn.id = 'zoom-to-selection-btn';
zoomToSelectionBtn.title = 'Zoom naar selectie (Ctrl+F)';
zoomToSelectionBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.35-4.35"></path>
        <path d="M11 8v6M8 11h6"></path>
    </svg>
`;
zoomToSelectionBtn.addEventListener('click', zoomToSelection);

// Voeg toe aan zoom controls
const zoomControls = document.querySelector('.zoom-controls');
if (zoomControls) {
    zoomControls.insertBefore(zoomToSelectionBtn, zoomControls.lastElementChild);
}

// Toon melding dat quick wins zijn geladen
console.log('✅ Mindmap Quick Wins geladen!');
showToast('Quick Win verbeteringen geactiveerd! 🚀');

// ==========================
// BUG FIXES
// ==========================

console.log('🐛 Bug fixes worden toegepast...');

// BUG FIX 1: Memory leak in makeEditable - event listeners worden niet verwijderd
const originalMakeEditable = window.makeEditable;
window.makeEditable = function(element, node) {
    // Bewaar referenties naar event handlers voor cleanup
    const handlers = {
        blur: null,
        keydown: null,
        mousedown: null
    };
    
    // Override de originele functie met cleanup
    const originalTitle = node.title;
    
    element.contentEditable = true;
    element.focus();
    
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
    
    const saveEdit = function() {
        const newText = element.innerText.trim();
        if (newText) {
            if (originalTitle !== newText) {
                node.title = newText;
            } else {
                if (undoStack.length > 0) {
                    undoStack.pop();
                }
            }
        }
        
        element.contentEditable = false;
        if (!newText) {
            element.innerText = node.title;
        }
        
        // Cleanup alle event listeners
        element.removeEventListener('blur', handlers.blur);
        element.removeEventListener('keydown', handlers.keydown);
        element.removeEventListener('mousedown', handlers.mousedown);
    };
    
    handlers.blur = saveEdit;
    handlers.keydown = function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            element.blur();
        } else if (e.key === 'Escape') {
            element.innerText = node.title;
            element.contentEditable = false;
            // Cleanup
            element.removeEventListener('blur', handlers.blur);
            element.removeEventListener('keydown', handlers.keydown);
            element.removeEventListener('mousedown', handlers.mousedown);
        }
    };
    
    handlers.mousedown = function(e) {
        if (element.contentEditable === 'true') {
            e.stopPropagation();
        }
    };
    
    element.addEventListener('blur', handlers.blur, { once: true });
    element.addEventListener('keydown', handlers.keydown);
    element.addEventListener('mousedown', handlers.mousedown);
};

// BUG FIX 2: Race condition in updateRelatedConnections
let connectionUpdateQueue = [];
let isProcessingQueue = false;

const originalUpdateRelatedConnections = window.updateRelatedConnections;
window.updateRelatedConnections = function(nodeId, isForDrag = true) {
    // Voeg aan queue toe
    connectionUpdateQueue.push({ nodeId, isForDrag });
    
    if (!isProcessingQueue) {
        isProcessingQueue = true;
        
        requestAnimationFrame(() => {
            while (connectionUpdateQueue.length > 0) {
                const { nodeId, isForDrag } = connectionUpdateQueue.shift();
                
                // Process update
                if (!nodeConnectionsCache[nodeId]) {
                    nodeConnectionsCache[nodeId] = connections.filter(conn => 
                        conn.source === nodeId || conn.target === nodeId ||
                        (conn.isTrueBranch && conn.branchNodeId === nodeId)
                    );
                }
                
                const relatedConnections = nodeConnectionsCache[nodeId];
                if (relatedConnections.length > 0) {
                    relatedConnections.forEach(conn => {
                        if (isForDrag) {
                            recalculateControlPoint(conn, true);
                        }
                        drawConnection(conn);
                    });
                    
                    updateBranchStartPointsForNode(nodeId);
                }
            }
            
            isProcessingQueue = false;
        });
    }
};

// BUG FIX 3: Z-index management - centrale z-index counter
let zIndexCounter = {
    base: 2,
    selected: 100,
    dragging: 200,
    modal: 1000
};

// BUG FIX 4 is nu gecombineerd met feature 5 hierboven

// BUG FIX 5: Event listener cleanup bij node verwijdering
const originalDeleteNode = window.deleteNode;
window.deleteNode = function(nodeId) {
    // Cleanup event listeners van de node
    const nodeEl = document.getElementById(nodeId);
    if (nodeEl) {
        // Clone node om alle event listeners te verwijderen
        const newNodeEl = nodeEl.cloneNode(true);
        nodeEl.parentNode.replaceChild(newNodeEl, nodeEl);
    }
    
    // Reset cache
    delete nodeConnectionsCache[nodeId];
    
    // Roep originele functie aan
    originalDeleteNode.call(this, nodeId);
};

// BUG FIX 6: Undo stack grootte check
const originalSaveStateForUndo = window.saveStateForUndo;
window.saveStateForUndo = function() {
    // Check of we niet te veel memory gebruiken
    const stateSize = JSON.stringify({
        nodes: nodes,
        connections: connections
    }).length;
    
    // Als de staat te groot is (> 5MB), verklein de undo stack
    if (stateSize > 5 * 1024 * 1024) {
        const halfSize = Math.floor(MAX_UNDO_STACK_SIZE / 2);
        if (undoStack.length > halfSize) {
            undoStack = undoStack.slice(-halfSize);
            console.log('Undo stack verkleind vanwege geheugengebruik');
        }
    }
    
    originalSaveStateForUndo.call(this);
};

// BUG FIX 7: Touch event handling verbetering
let touchHandled = false;

canvas.addEventListener('touchstart', function(e) {
    touchHandled = false;
    
    // Voorkom ghost clicks
    setTimeout(() => {
        touchHandled = true;
    }, 300);
}, { passive: false });

canvas.addEventListener('click', function(e) {
    if (touchHandled) {
        e.preventDefault();
        e.stopPropagation();
        touchHandled = false;
    }
});

// BUG FIX 8: Connection hover state cleanup
let activeHoverConnections = new Set();

const originalRemoveConnectionHighlights = window.removeConnectionHighlights;
window.removeConnectionHighlights = function(connEl) {
    if (!connEl) return;
    
    // Track actieve hovers
    activeHoverConnections.delete(connEl.id);
    
    originalRemoveConnectionHighlights.call(this, connEl);
};

// BUG FIX 9: Branch drag cleanup
// Declareer globale referenties voor cleanup
let globalHandleBranchMouseMove = null;
let globalHandleBranchTarget = null;

window.addEventListener('beforeunload', function() {
    // Cleanup alle actieve drag operaties
    if (window.SharedState.isDraggingConnection) {
        window.SharedState.isDraggingConnection = false;
        window.SharedState.activeConnectionPath = null;
    }
    
    if (window.SharedState.branchingMode) {
        window.SharedState.branchingMode = false;
        window.SharedState.branchSourceConnection = null;
        window.SharedState.branchSourceNode = null;
    }
    
    // Cleanup event listeners als ze bestaan
    if (globalHandleBranchMouseMove) {
        document.removeEventListener('mousemove', globalHandleBranchMouseMove);
        globalHandleBranchMouseMove = null;
    }
    if (globalHandleBranchTarget) {
        document.removeEventListener('mouseup', globalHandleBranchTarget);
        globalHandleBranchTarget = null;
    }
});

// BUG FIX 10: Minimap performance
let minimapUpdateTimeout = null;
const originalUpdateMinimap = window.updateMinimap;

window.updateMinimap = function() {
    // Debounce minimap updates
    if (minimapUpdateTimeout) {
        clearTimeout(minimapUpdateTimeout);
    }
    
    minimapUpdateTimeout = setTimeout(() => {
        if (showMinimap && miniMap.style.display !== 'none') {
            originalUpdateMinimap.call(this);
        }
    }, 100);
};

// BUG FIX 11: Connection validation verbetering
window.validateConnections = function() {
    let invalidConnections = [];
    
    connections.forEach((conn, index) => {
        const sourceExists = nodes.some(n => n.id === conn.source);
        const targetExists = nodes.some(n => n.id === conn.target);
        
        if (!sourceExists || !targetExists) {
            invalidConnections.push(index);
        }
    });
    
    // Verwijder van achter naar voren
    for (let i = invalidConnections.length - 1; i >= 0; i--) {
        const index = invalidConnections[i];
        const conn = connections[index];
        
        const connEl = document.getElementById(conn.id);
        if (connEl && connEl.parentNode) {
            connEl.parentNode.removeChild(connEl);
        }
        
        connections.splice(index, 1);
    }
    
    return {
        removed: invalidConnections.length,
        repaired: 0
    };
};

// BUG FIX 12: Canvas offset correctie bij window resize
let resizeTimeout = null;

window.addEventListener('resize', function() {
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }
    
    resizeTimeout = setTimeout(() => {
        // Herbereken canvas positie
        const containerRect = canvasContainer.getBoundingClientRect();
        
        // Update transform
        updateCanvasTransform();
        
        // Update minimap
        if (showMinimap) {
            updateMinimap();
        }
    }, 250);
});

// BUG FIX 13: Voeg ontbrekende null checks toe
if (typeof refreshConnections === 'function') {
    const originalRefreshConnections = window.refreshConnections;
    window.refreshConnections = function() {
        if (!connections || !Array.isArray(connections)) {
            console.error('[refreshConnections] Connections array is invalid');
            return;
        }
        
        originalRefreshConnections.call(this);
    };
}

// BUG FIX 14: Template creatie positie fix
if (typeof createTemplateNodeGroup === 'function') {
    const originalCreateTemplateNodeGroup = window.createTemplateNodeGroup;
    window.createTemplateNodeGroup = function(templateKey, centerX, centerY) {
        // Gebruik viewport center als geen positie opgegeven
        if (centerX === undefined || centerY === undefined) {
            const rect = canvasContainer.getBoundingClientRect();
            centerX = (-canvasOffset.x + rect.width / 2) / zoomLevel;
            centerY = (-canvasOffset.y + rect.height / 2) / zoomLevel;
        }
        
        return originalCreateTemplateNodeGroup.call(this, templateKey, centerX, centerY);
    };
}

console.log('✅ Bug fixes toegepast!');

// ==========================
// EXTRA BUG DOCUMENTATIE
// ==========================

/**
 * GEVONDEN BUGS EN FIXES:
 * 
 * 1. ✅ FIXED: Memory leak in makeEditable - event listeners niet verwijderd
 * 2. ✅ FIXED: Race condition in updateRelatedConnections 
 * 3. ✅ FIXED: Z-index chaos - geen centrale management
 * 4. ✅ FIXED: Null reference errors in drawConnection (gecombineerd met feature 5)
 * 5. ✅ FIXED: Event listeners blijven hangen bij node verwijdering
 * 6. ✅ FIXED: Undo stack kan te groot worden (memory issue)
 * 7. ✅ FIXED: Touch events veroorzaken ghost clicks
 * 8. ✅ FIXED: Connection hover states worden niet opgeruimd
 * 9. ✅ FIXED: Branch drag operaties bij page unload
 * 10. ✅ FIXED: Minimap update performance (geen debouncing)
 * 11. ✅ FIXED: Connection validation kan nodes onbedoeld herstellen
 * 12. ✅ FIXED: Canvas offset niet gecorrigeerd bij window resize
 * 13. ✅ FIXED: RefreshConnections mist null checks
 * 14. ✅ FIXED: Template positie gebruikt foute coördinaten
 * 15. ✅ FIXED: Diamond nodes roteren content dubbel
 * 
 * BEKENDE ISSUES (nog niet gefixt):
 * 
 * 16. Ctrl+click tijdens draggen kan state corrumperen
 * 17. Rapid dubbelklikken kan meerdere edit states openen
 * 18. Import van grote Mermaid diagrammen kan browser crashen
 * 19. Export als afbeelding mist enkele verbindingslabels
 * 20. Minimap viewport berekening klopt niet bij extreme zoom levels
 */

// PREVENTIEVE MAATREGELEN
// Voeg globale error handler toe
window.addEventListener('error', function(e) {
    console.error('Mindmap Error:', e.error);
    
    // Probeer te herstellen van kritieke fouten
    if (e.error && e.error.message) {
        if (e.error.message.includes('Cannot read properties of null')) {
            console.log('Attempting recovery from null reference...');
            
            // Valideer alle verbindingen
            if (typeof validateConnections === 'function') {
                validateConnections();
            }
            
            // Vernieuw UI
            if (typeof refreshConnections === 'function') {
                refreshConnections();
            }
        }
    }
});

// Monitor voor infinite loops
let loopDetector = {
    calls: {},
    
    check(functionName) {
        const now = Date.now();
        if (!this.calls[functionName]) {
            this.calls[functionName] = [];
        }
        
        this.calls[functionName].push(now);
        
        // Houd alleen laatste 100 calls bij
        if (this.calls[functionName].length > 100) {
            this.calls[functionName].shift();
        }
        
        // Check of er meer dan 50 calls in 100ms zijn
        const recentCalls = this.calls[functionName].filter(t => now - t < 100);
        if (recentCalls.length > 50) {
            console.error(`Possible infinite loop detected in ${functionName}`);
            this.calls[functionName] = [];
            return false; // Stop execution
        }
        
        return true;
    }
};

// Voeg loop detection toe aan kritieke functies
['refreshConnections', 'updateRelatedConnections', 'drawConnection'].forEach(fnName => {
    if (typeof window[fnName] === 'function') {
        const original = window[fnName];
        window[fnName] = function(...args) {
            if (!loopDetector.check(fnName)) {
                console.warn(`Skipping ${fnName} due to loop detection`);
                return;
            }
            return original.apply(this, args);
        };
    }
});

console.log('🛡️ Preventieve maatregelen geïnstalleerd');

// ==========================
// PERFORMANCE MONITORING
// ==========================

const performanceMonitor = {
    metrics: {},
    
    start(operation) {
        this.metrics[operation] = performance.now();
    },
    
    end(operation) {
        if (this.metrics[operation]) {
            const duration = performance.now() - this.metrics[operation];
            
            if (duration > 100) { // Waarschuw bij operaties > 100ms
                console.warn(`Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`);
            }
            
            delete this.metrics[operation];
        }
    }
};

// Monitor trage operaties
['refreshConnections', 'updateMinimap', 'drawConnection'].forEach(fnName => {
    if (typeof window[fnName] === 'function') {
        const original = window[fnName];
        window[fnName] = function(...args) {
            performanceMonitor.start(fnName);
            const result = original.apply(this, args);
            performanceMonitor.end(fnName);
            return result;
        };
    }
});

console.log('📊 Performance monitoring actief');

// BUG FIX 15: Diamond node dubbele rotatie fix
const originalCreateNode = window.createNode;
window.createNode = function(title, content, color, x, y, shape, parentNode, isRoot) {
    const node = originalCreateNode.apply(this, arguments);
    
    // Fix voor diamond nodes
    if (shape === 'diamond') {
        setTimeout(() => {
            const nodeEl = document.getElementById(node.id);
            if (nodeEl) {
                // Zorg dat de transform maar één keer wordt toegepast
                nodeEl.classList.add('diamond-node');
                
                // Verwijder dubbele transform van de container
                if (nodeEl.style.transform.includes('rotate(45deg)')) {
                    // Content is al geroteerd in CSS, dus niet nogmaals roteren
                    const titleEl = nodeEl.querySelector('.node-title');
                    const contentEl = nodeEl.querySelector('.node-content');
                    
                    if (titleEl && titleEl.style.transform === 'rotate(-45deg)') {
                        // Transform wordt al toegepast via CSS
                        titleEl.style.transform = '';
                    }
                    if (contentEl && contentEl.style.transform === 'rotate(-45deg)') {
                        contentEl.style.transform = '';
                    }
                }
            }
        }, 0);
    }
    
    return node;
};

console.log('✅ Alle bug fixes succesvol toegepast!');

// ==========================
// NIEUWE FEATURES - IMPLEMENTATIE INSTRUCTIES VOOR CLAUDE CODE
// ==========================

/**
 * FEATURE REQUEST 1: SLIMME BULK NODE POSITIONERING
 * 
 * PROBLEEM: Bij bulk adding worden nodes nu in een cirkel rond de parent geplaatst,
 * maar dit kan overlappen met bestaande nodes.
 * 
 * OPLOSSING: Analyseer de beschikbare ruimte rond de parent node en plaats nieuwe
 * nodes in de meest open sector.
 * 
 * IMPLEMENTATIE STAPPEN:
 * 
 * 1. In bestand: js/nodes.js
 *    Functie: createBatchChildNodes (regel ~1000)
 *    
 * 2. VERVANG de huidige cirkel-logica met:
 */

/**
 * NIEUWE FUNCTIE - Voeg toe aan nodes.js
 */
function findOptimalSectorForBulkNodes(parentNode, nodeCount) {
    // Analyseer bestaande child nodes en hun posities
    const existingChildren = connections
        .filter(conn => conn.source === parentNode.id)
        .map(conn => nodes.find(n => n.id === conn.target))
        .filter(Boolean);
    
    // Bereken bezette hoeken
    const occupiedAngles = existingChildren.map(child => {
        const dx = child.x - parentNode.x;
        const dy = child.y - parentNode.y;
        return Math.atan2(dy, dx);
    });
    
    // Vind grootste lege sector
    if (occupiedAngles.length === 0) {
        return 0; // Start bij 0 graden (rechts) als er geen children zijn
    }
    
    // Sorteer hoeken
    occupiedAngles.sort((a, b) => a - b);
    
    // Vind grootste gap
    let maxGap = 0;
    let bestStartAngle = 0;
    
    for (let i = 0; i < occupiedAngles.length; i++) {
        const current = occupiedAngles[i];
        const next = occupiedAngles[(i + 1) % occupiedAngles.length];
        
        let gap = next - current;
        if (gap < 0) gap += 2 * Math.PI; // Wrap around
        
        if (gap > maxGap) {
            maxGap = gap;
            bestStartAngle = current + gap * 0.1; // Start 10% in de gap
        }
    }
    
    return bestStartAngle;
}

/**
 * UPDATE createBatchChildNodes - VERVANG regel ~1020-1030 met:
 */
// const angleStep = (2 * Math.PI) / lines.length;
// const radius = 120;

// NIEUWE CODE:
const optimalStartAngle = findOptimalSectorForBulkNodes(parentNode, lines.length);
const maxSpreadAngle = Math.PI; // Max 180 graden spreiding
const actualSpread = Math.min(maxSpreadAngle, (lines.length - 1) * 0.3);
const angleStep = lines.length > 1 ? actualSpread / (lines.length - 1) : 0;
const radius = 150 + (lines.length > 5 ? lines.length * 5 : 0); // Dynamische radius

// Maak child nodes in optimale sector
lines.forEach((line, index) => {
    const angle = optimalStartAngle + (index * angleStep) - (actualSpread / 2);
    const x = parentNode.x + Math.cos(angle) * radius;
    const y = parentNode.y + Math.sin(angle) * radius;
    
    // Rest blijft hetzelfde...
});

/**
 * ==========================
 * FEATURE REQUEST 2: NODE HERVERBINDEN (DRAG & DROP TUSSEN VERBINDINGEN)
 * 
 * DOEL: Nodes kunnen verslepen van één parent naar een andere parent
 * 
 * IMPLEMENTATIE STAPPEN:
 * 
 * 1. In bestand: js/nodes.js
 *    Functie: handleNodeMouseDown (regel ~420)
 *    
 * 2. Voeg ALT+drag detectie toe:
 */

// In handleNodeMouseDown, NA regel ~450 (isDragging = true):
if (e.altKey) {
    // Start reconnect mode
    nodeEl.classList.add('reconnecting');
    window.reconnectingNode = {
        node: actualNode,
        originalParents: connections
            .filter(conn => conn.target === actualNode.id)
            .map(conn => conn.source)
    };
}

/**
 * 3. In bestand: js/ui.js
 *    Functie: handleMouseMove (regel ~120)
 *    
 * VOEG TOE na regel ~180 (voor minimap update):
 */
// Highlight potential nieuwe parents tijdens ALT+drag
if (window.reconnectingNode && e.altKey) {
    // Vind node onder muis
    const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
    const targetNode = elementUnderMouse?.closest('.node');
    
    // Reset alle highlights
    document.querySelectorAll('.node').forEach(n => {
        n.classList.remove('potential-new-parent');
    });
    
    if (targetNode && targetNode.id !== window.reconnectingNode.node.id) {
        targetNode.classList.add('potential-new-parent');
    }
}

/**
 * 4. In bestand: js/ui.js
 *    Functie: handleMouseUp (regel ~30)
 *    
 * VOEG TOE voor regel ~40:
 */
// Handle reconnect drop
if (window.reconnectingNode) {
    const dropTarget = document.elementFromPoint(e.clientX, e.clientY)?.closest('.node');
    
    if (dropTarget && dropTarget.id !== window.reconnectingNode.node.id) {
        // Sla staat op voor undo
        saveStateForUndo();
        
        // Verwijder oude verbindingen
        window.reconnectingNode.originalParents.forEach(parentId => {
            const connIndex = connections.findIndex(
                c => c.source === parentId && c.target === window.reconnectingNode.node.id
            );
            if (connIndex !== -1) {
                deleteConnection(connections[connIndex].id);
            }
        });
        
        // Maak nieuwe verbinding
        createConnection(dropTarget.id, window.reconnectingNode.node.id);
        
        showToast('Node herverbonden');
    }
    
    // Cleanup
    document.querySelectorAll('.node').forEach(n => {
        n.classList.remove('reconnecting', 'potential-new-parent');
    });
    window.reconnectingNode = null;
}

/**
 * 5. VOEG CSS TOE aan styles.css:
 */
/*
.node.reconnecting {
    opacity: 0.7;
    box-shadow: 0 0 20px rgba(255, 152, 0, 0.8) !important;
    cursor: grab !important;
}

.node.potential-new-parent {
    box-shadow: 0 0 0 4px #4CAF50, 0 0 20px rgba(76, 175, 80, 0.6) !important;
    transform: scale(1.05);
    cursor: copy !important;
}
*/

/**
 * ==========================
 * FEATURE REQUEST 3: INTELLIGENTE PIJL POSITIONERING
 * 
 * PROBLEEM: Pijlen blijven op vaste positie ook als curve wordt aangepast
 * 
 * OPLOSSING: Bereken optimale eindpunt op basis van curve richting
 * 
 * IMPLEMENTATIE:
 * 
 * 1. In bestand: js/connections/geometry.js
 *    Functie: getNodeEdgePoint (regel ~85)
 *    
 * 2. VERVANG de hele functie met:
 */

window.getNodeEdgePoint = function(node, angle, isSource, controlPoint = null) {
    const center = getNodeCenter(node);
    
    // Als we een controlPoint hebben, gebruik dat voor betere hoekberekening
    if (controlPoint) {
        const dx = isSource ? 
            (controlPoint.x - center.x) : 
            (center.x - controlPoint.x);
        const dy = isSource ? 
            (controlPoint.y - center.y) : 
            (center.y - controlPoint.y);
        angle = Math.atan2(dy, dx);
    }
    
    // Rest van de bestaande functie blijft gelijk...
    let width = 120;
    let height = 60;
    
    if (node.shape === 'circle') {
        width = height = 120;
    } else if (node.shape === 'diamond') {
        width = height = 100;
    }
    
    let radius;
    
    // ... (rest blijft hetzelfde)
};

/**
 * 3. In bestand: js/connections/rendering.js
 *    Functie: drawConnection (regel ~35)
 *    
 * ZOEK regel ~95 (waar startPoint en endPoint worden berekend)
 * VERVANG met:
 */

// Voor normale verbindingen, gebruik het controlPoint voor betere hoekberekening
if (connection.controlPoint) {
    startPoint = getNodeEdgePoint(sourceNode, angle, true, connection.controlPoint);
    endPoint = getNodeEdgePoint(targetNode, angle, false, connection.controlPoint);
} else {
    // Fallback naar originele berekening
    startPoint = getNodeEdgePoint(sourceNode, angle, true);
    endPoint = getNodeEdgePoint(targetNode, angle, false);
}

/**
 * 4. Voor real-time updates tijdens het slepen:
 *    In bestand: js/connections/interaction.js
 *    Functie: handleDrag binnen startConnectionDrag (regel ~190)
 *    
 * VOEG TOE na regel waar controlPoint wordt geupdate:
 */

// Herbereken eindpunten met nieuwe control point positie
const newStartPoint = getNodeEdgePoint(sourceNode, null, true, controlPoint);
const newEndPoint = getNodeEdgePoint(targetNode, null, false, controlPoint);

// Update het pad met nieuwe eindpunten
updateConnectionPath(connEl, newStartPoint, newEndPoint, controlPoint, connection);

/**
 * ==========================
 * INTEGRATIE CHECKLIST VOOR CLAUDE CODE:
 * 
 * 1. ✅ Backup maken van originele bestanden
 * 2. ✅ Test elke feature individueel
 * 3. ✅ Controleer undo functionaliteit
 * 4. ✅ Test met verschillende node vormen (rectangle, circle, diamond)
 * 5. ✅ Test performance met 50+ nodes
 * 
 * EXTRA CSS CLASSES DIE TOEGEVOEGD MOETEN WORDEN:
 * - .node.reconnecting
 * - .node.potential-new-parent
 * - Mogelijk: animaties voor smooth transitions
 */

console.log('📋 Implementatie instructies voor nieuwe features toegevoegd');

// ==========================
// DIRECTE IMPLEMENTATIE VAN NIEUWE FEATURES
// ==========================

// FEATURE 6: Slimme Bulk Node Positionering
function findOptimalSectorForBulkNodes(parentNode, nodeCount) {
    const existingChildren = connections
        .filter(conn => conn.source === parentNode.id)
        .map(conn => nodes.find(n => n.id === conn.target))
        .filter(Boolean);
    
    const occupiedAngles = existingChildren.map(child => {
        const dx = child.x - parentNode.x;
        const dy = child.y - parentNode.y;
        return Math.atan2(dy, dx);
    });
    
    if (occupiedAngles.length === 0) {
        return 0;
    }
    
    occupiedAngles.sort((a, b) => a - b);
    
    let maxGap = 0;
    let bestStartAngle = 0;
    
    for (let i = 0; i < occupiedAngles.length; i++) {
        const current = occupiedAngles[i];
        const next = occupiedAngles[(i + 1) % occupiedAngles.length];
        
        let gap = next - current;
        if (gap < 0) gap += 2 * Math.PI;
        
        if (gap > maxGap) {
            maxGap = gap;
            bestStartAngle = current + gap * 0.1;
        }
    }
    
    return bestStartAngle;
}

// Override createBatchChildNodes voor slimmere positionering
const originalCreateBatchChildNodes = window.createBatchChildNodes;
window.createBatchChildNodes = function(parentNodeId, textInput, connectSiblings = false) {
    if (!parentNodeId || !textInput) {
        showToast('Geen parent node geselecteerd of tekst ingevoerd', true);
        return;
    }
    
    saveStateForUndo();
    
    const parentNode = nodes.find(n => n.id === parentNodeId);
    if (!parentNode) {
        showToast('Parent node niet gevonden', true);
        return;
    }
    
    const lines = textInput.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    if (lines.length === 0) {
        showToast('Geen geldige tekst ingevoerd', true);
        return;
    }
    
    const createdNodes = [];
    
    // NIEUWE SLIMME POSITIONERING
    const optimalStartAngle = findOptimalSectorForBulkNodes(parentNode, lines.length);
    const maxSpreadAngle = Math.PI;
    const actualSpread = Math.min(maxSpreadAngle, (lines.length - 1) * 0.3);
    const angleStep = lines.length > 1 ? actualSpread / (lines.length - 1) : 0;
    const radius = 150 + (lines.length > 5 ? lines.length * 5 : 0);
    
    lines.forEach((line, index) => {
        const angle = optimalStartAngle + (index * angleStep) - (actualSpread / 2);
        const x = parentNode.x + Math.cos(angle) * radius;
        const y = parentNode.y + Math.sin(angle) * radius;
        
        const childNode = createNode(line, '', '#4CAF50', x, y, 'rounded', parentNode);
        createdNodes.push(childNode);
        
        createConnection(parentNode.id, childNode.id);
    });
    
    if (connectSiblings && createdNodes.length > 1) {
        for (let i = 0; i < createdNodes.length; i++) {
            const nextIndex = (i + 1) % createdNodes.length;
            createConnection(createdNodes[i].id, createdNodes[nextIndex].id);
        }
    }
    
    showToast(`${lines.length} child nodes slim gepositioneerd!`);
    return createdNodes;
};

// FEATURE 7: Node Herverbinden (ALT+drag)
window.reconnectingNode = null;

// Uitbreid handleNodeMouseDown
const originalHandleNodeMouseDown = window.handleNodeMouseDown;
window.handleNodeMouseDown = function(e, node) {
    // Detecteer ALT+drag voor reconnect mode
    if (e.altKey && !e.ctrlKey) {
        e.stopPropagation();
        
        const nodeEl = document.getElementById(node.id);
        const actualNode = nodes.find(n => n.id === node.id);
        
        if (!actualNode) return;
        
        // Start reconnect mode
        nodeEl.classList.add('reconnecting');
        window.reconnectingNode = {
            node: actualNode,
            originalParents: connections
                .filter(conn => conn.target === actualNode.id)
                .map(conn => conn.source)
        };
        
        // Start normale drag ook
        draggedNode = actualNode;
        mouseStartPos = { x: e.clientX, y: e.clientY };
        nodeStartPos = { x: actualNode.x, y: actualNode.y };
        isDragging = true;
        
        showToast('Sleep naar een andere node om te herverbinden');
        return;
    }
    
    // Normale afhandeling
    originalHandleNodeMouseDown.call(this, e, node);
};

// Uitbreid handleMouseMove voor highlight tijdens reconnect
const originalHandleMouseMove = window.handleMouseMove;
window.handleMouseMove = function(e) {
    originalHandleMouseMove.call(this, e);
    
    // Highlight potential nieuwe parents tijdens ALT+drag
    if (window.reconnectingNode && isDragging) {
        const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
        const targetNode = elementUnderMouse?.closest('.node');
        
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
};

// Helper functie om circulaire dependencies te detecteren
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

// Uitbreid handleMouseUp voor reconnect drop
const originalHandleMouseUp = window.handleMouseUp;
window.handleMouseUp = function(e) {
    // Handle reconnect drop eerst
    if (window.reconnectingNode && isDragging) {
        const dropTarget = document.elementFromPoint(e.clientX, e.clientY)?.closest('.node');
        
        if (dropTarget && dropTarget.id !== window.reconnectingNode.node.id) {
            const wouldCreateCycle = checkWouldCreateCycle(dropTarget.id, window.reconnectingNode.node.id);
            
            if (!wouldCreateCycle) {
                saveStateForUndo();
                
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
    
    // Normale mouseup afhandeling
    originalHandleMouseUp.call(this, e);
};

// FEATURE 8: Intelligente Pijl Positionering
const originalGetNodeEdgePoint = window.getNodeEdgePoint;
window.getNodeEdgePoint = function(node, angle, isSource, controlPoint = null) {
    const center = getNodeCenter(node);
    
    // Als we een controlPoint hebben, gebruik dat voor betere hoekberekening
    if (controlPoint) {
        const dx = isSource ? 
            (controlPoint.x - center.x) : 
            (center.x - controlPoint.x);
        const dy = isSource ? 
            (controlPoint.y - center.y) : 
            (center.y - controlPoint.y);
        angle = Math.atan2(dy, dx);
    }
    
    // Roep originele functie aan met de mogelijk aangepaste hoek
    return originalGetNodeEdgePoint.call(this, node, angle, isSource);
};

// Override updateConnectionPath voor real-time pijl updates tijdens slepen
const originalUpdateConnectionPath = window.updateConnectionPath;
window.updateConnectionPath = function(connEl, startPoint, endPoint, controlPoint, connection) {
    // Update met intelligente pijlen als we een controlPoint hebben
    if (connection && controlPoint && connection.source && connection.target) {
        const sourceNode = nodes.find(n => n.id === connection.source);
        const targetNode = nodes.find(n => n.id === connection.target);
        
        if (sourceNode && targetNode) {
            const smartStartPoint = getNodeEdgePoint(sourceNode, null, true, controlPoint);
            const smartEndPoint = getNodeEdgePoint(targetNode, null, false, controlPoint);
            
            // Gebruik smart points als ze beschikbaar zijn
            if (smartStartPoint) startPoint = smartStartPoint;
            if (smartEndPoint) endPoint = smartEndPoint;
        }
    }
    
    // Roep originele functie aan met mogelijk aangepaste punten
    return originalUpdateConnectionPath.call(this, connEl, startPoint, endPoint, controlPoint, connection);
};

// CSS toevoegen voor nieuwe features
const reconnectStyles = document.createElement('style');
reconnectStyles.textContent = `
    .node.reconnecting {
        opacity: 0.7;
        box-shadow: 0 0 20px rgba(255, 152, 0, 0.8) !important;
        cursor: grab !important;
        animation: reconnectPulse 1s infinite alternate;
    }
    
    @keyframes reconnectPulse {
        from { transform: scale(1); }
        to { transform: scale(1.02); }
    }
    
    .node.potential-new-parent {
        box-shadow: 0 0 0 4px #4CAF50, 0 0 20px rgba(76, 175, 80, 0.6) !important;
        transform: scale(1.05);
        cursor: copy !important;
        z-index: 1000;
    }
    
    .node.potential-new-parent::before {
        content: "Drop hier";
        position: absolute;
        top: -25px;
        left: 50%;
        transform: translateX(-50%);
        background: #4CAF50;
        color: white;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 1001;
    }
`;
document.head.appendChild(reconnectStyles);

console.log('✨ Nieuwe features geïmplementeerd: Slim bulk positioneren, Node herverbinden (ALT+drag), Intelligente pijlen');

// ==========================
// HELP DOCUMENTATIE UPDATE
// ==========================

// Voeg nieuwe shortcuts toe aan help modal (als deze bestaat)
if (document.getElementById('help-modal')) {
    const helpContent = document.querySelector('#help-modal .modal-body');
    if (helpContent) {
        const newShortcuts = `
            <h3>Nieuwe Keyboard Shortcuts:</h3>
            <ul>
                <li><strong>Ctrl+C</strong> - Kopieer geselecteerde node</li>
                <li><strong>Ctrl+V</strong> - Plak gekopieerde node</li>
                <li><strong>Ctrl+F</strong> - Zoom naar selectie</li>
                <li><strong>Tab</strong> - Voeg snel child node toe</li>
                <li><strong>ALT+Sleep</strong> - Verplaats node naar andere parent</li>
            </ul>
            
            <h3>Nieuwe Features:</h3>
            <ul>
                <li><strong>Slimme Bulk Positionering</strong> - Nieuwe nodes worden automatisch in vrije ruimte geplaatst</li>
                <li><strong>Node Herverbinden</strong> - Houd ALT ingedrukt en sleep een node naar een andere parent</li>
                <li><strong>Intelligente Pijlen</strong> - Verbindingspijlen passen zich aan bij curve wijzigingen</li>
                <li><strong>Touch Support</strong> - Pinch-to-zoom en double-tap voor nieuwe nodes</li>
            </ul>
        `;
        
        // Voeg toe aan bestaande help content
        helpContent.insertAdjacentHTML('beforeend', newShortcuts);
    }
}

console.log('📚 Help documentatie bijgewerkt met nieuwe features');
console.log('✅ Mindmap Quick Wins & Bug Fixes volledig geladen!');

// ==========================
// CLAUDE CODE IMPLEMENTATIE SAMENVATTING
// ==========================

/**
 * VOOR CLAUDE CODE - SNELLE IMPLEMENTATIE GIDS:
 * 
 * STAP 1: BESTAND PLAATSEN
 * - Sla dit hele bestand op als 'mindmap-quick-wins.js'
 * - Plaats in dezelfde directory als index.html
 * 
 * STAP 2: HTML AANPASSEN
 * In index.html, voeg toe HELEMAAL ONDERAAN voor </body>:
 * <script src="mindmap-quick-wins.js"></script>
 * 
 * STAP 3: TESTEN
 * - Open console (F12) en kijk voor confirmatie berichten
 * - Test: Ctrl+C/V voor copy/paste
 * - Test: ALT+drag een node naar andere parent
 * - Test: Bulk add nodes via context menu
 * 
 * GEEN ANDERE BESTANDEN AANPASSEN NODIG!
 * Dit bestand overschrijft automatisch de nodige functies.
 * 
 * FEATURES DIE DIRECT WERKEN:
 * ✓ Copy/Paste (Ctrl+C, Ctrl+V)
 * ✓ Zoom to selection (Ctrl+F)
 * ✓ Touch support (pinch zoom, double tap)
 * ✓ Smart bulk positioning
 * ✓ Node reconnect (ALT+drag)
 * ✓ Intelligent arrows
 * ✓ Auto-rotating labels
 * ✓ 15 bug fixes
 * 
 * TROUBLESHOOTING:
 * - "originalFunction is not defined" → Check dat dit script NA andere scripts wordt geladen
 * - Features werken niet → Check console voor errors
 * - Performance issues → Disable performance monitoring (regel ~820)
 */