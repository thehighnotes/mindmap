/**
 * core.js - Bevat de kernconfiguratie en globale variabelen voor de mindmap tool
 */

// Status variabelen
let currentTool = 'select';
let nodes = [];
let connections = [];
let nextNodeId = 1;
let rootNodeId = null;
let mindmapTitle = 'Mindmap Project'; // Titel van de mindmap
let draggedNode = null;
let dragOffset = { x: 0, y: 0 };
let mouseStartPos = { x: 0, y: 0 }; // Startpositie van de muis bij drag
let nodeStartPos = { x: 0, y: 0 };  // Startpositie van de node bij drag
let isDragging = false;
let sourceNode = null;
let currentSelectedNode = null;
let currentSelectedConnection = null;
let canvasDragging = false;
let canvasDragStart = { x: 0, y: 0 };
// Initialize with the same offset as the CSS transform
let canvasOffset = { x: -2000, y: -2000 };
let showGrid = true;
let showMinimap = false;
let zoomLevel = 1;
let tempPanMode = false;
let gridSize = 30;
let miniNodes = [];

// Branch-gerelateerde variabelen (consistent met originele implementatie)
let branchingMode = false;
let branchSourceConnection = null;
let branchSourceNode = null;
let branchingPosition = null;
let isCreatingBranch = false;

// Undo functionaliteit
let undoStack = [];
const MAX_UNDO_STACK_SIZE = 50; // Maximum aantal acties in de geschiedenis
let activeTempLine = false;
let ctrlSelectMode = false;   // Voor CTRL-selectie
let ctrlSelectedNode = null;  // Node geselecteerd met CTRL
let ctrlTooltip = null;       // Tooltip voor CTRL-functionaliteit

// Referenties naar DOM elementen
let canvas;
let canvasContainer;
let saveBtn;
let loadBtn;
let exportMermaidBtn;
let importMermaidBtn;
let exportImageBtn;
let centerBtn;
let clearBtn;
let helpBtn;
let toggleGridBtn;
let toggleMinimapBtn;
let zoomInBtn;
let zoomOutBtn;
let zoomResetBtn;
let zoomLevelDisplay;
let nodeModal;
let nodeTitle;
let nodeContent;
let nodeColor;
let nodeShape;
let cancelNodeEdit;
let saveNodeEdit;
let connectionModal;
let connectionLabel;
let connectionStyle;
let connectionType;
let cancelConnectionEdit;
let saveConnectionEdit;
let exportModal;
let exportContent;
let copyExport;
let closeExport;
let importModal;
let importContent;
let cancelImport;
let confirmImport;
let helpModal;
let closeHelp;
let showTipsBtn;
let contextMenu;
let connectionContextMenu;
let contextEdit;
let contextRename;
let contextCreateChild;
let contextBranch;
let contextSetRoot;
let contextDelete;
let fileInput;
let closeModalButtons;
let toast;
let miniMap;
let miniMapContent;
let miniMapViewport;
let autoLayoutBtn;
let undoBtn; // Referentie naar de ongedaan maken knop
let mindmapTitleEl; // Titel input element

// Functie om DOM referenties te initialiseren
function initializeReferences() {
    canvas = document.getElementById('mindmap-canvas');
    canvasContainer = document.querySelector('.canvas-container');
    saveBtn = document.getElementById('save-btn');
    loadBtn = document.getElementById('load-btn');
    exportMermaidBtn = document.getElementById('export-mermaid-btn');
    importMermaidBtn = document.getElementById('import-mermaid-btn'); // Will be null since button is removed
    exportImageBtn = document.getElementById('export-image-btn');
    centerBtn = document.getElementById('center-btn');
    clearBtn = document.getElementById('clear-btn');
    helpBtn = document.getElementById('help-btn');
    toggleGridBtn = document.getElementById('toggle-grid-btn');
    toggleMinimapBtn = document.getElementById('toggle-minimap-btn');
    undoBtn = document.getElementById('undo-btn'); // Ongedaan maken knop
    zoomInBtn = document.getElementById('zoom-in');
    zoomOutBtn = document.getElementById('zoom-out');
    zoomResetBtn = document.getElementById('zoom-reset');
    zoomLevelDisplay = document.getElementById('zoom-level');
    nodeModal = document.getElementById('node-modal');
    nodeTitle = document.getElementById('node-title');
    nodeContent = document.getElementById('node-content');
    nodeColor = document.getElementById('node-color');
    nodeShape = document.getElementById('node-shape');
    cancelNodeEdit = document.getElementById('cancel-node-edit');
    saveNodeEdit = document.getElementById('save-node-edit');
    connectionModal = document.getElementById('connection-modal');
    connectionLabel = document.getElementById('connection-label');
    connectionStyle = document.getElementById('connection-style');
    connectionType = document.getElementById('connection-type');
    cancelConnectionEdit = document.getElementById('cancel-connection-edit');
    saveConnectionEdit = document.getElementById('save-connection-edit');
    exportModal = document.getElementById('export-modal');
    exportContent = document.getElementById('export-content');
    copyExport = document.getElementById('copy-export');
    closeExport = document.getElementById('close-export');
    importModal = document.getElementById('import-modal');
    importContent = document.getElementById('import-content');
    cancelImport = document.getElementById('cancel-import');
    confirmImport = document.getElementById('confirm-import');
    helpModal = document.getElementById('help-modal');
    closeHelp = document.getElementById('close-help');
    showTipsBtn = document.getElementById('show-tips-btn');
    contextMenu = document.getElementById('context-menu');
    connectionContextMenu = document.getElementById('connection-context-menu');
    contextEdit = document.getElementById('context-edit');
    contextRename = document.getElementById('context-rename');
    contextCreateChild = document.getElementById('context-create-child');
    contextBranch = document.getElementById('context-branch');
    contextSetRoot = document.getElementById('context-set-root');
    contextDelete = document.getElementById('context-delete');
    fileInput = document.getElementById('file-input');
    closeModalButtons = document.querySelectorAll('.close-modal');
    toast = document.getElementById('toast');
    miniMap = document.getElementById('mini-map');
    miniMapContent = document.getElementById('mini-map-content');
    miniMapViewport = document.getElementById('mini-map-viewport');
    autoLayoutBtn = document.getElementById('auto-layout-btn');
    mindmapTitleEl = document.getElementById('mindmap-title');
}

// Canvas en weergave initialiseren
function initCanvas() {
    // Maak eerst een SVG layer voor alle verbindingen
    const connectionsContainer = document.createElement('div');
    connectionsContainer.id = 'connections-container';
    connectionsContainer.style.position = 'absolute';
    connectionsContainer.style.top = '0';
    connectionsContainer.style.left = '0';
    connectionsContainer.style.width = '100%';
    connectionsContainer.style.height = '100%';
    connectionsContainer.style.pointerEvents = 'none';
    connectionsContainer.style.zIndex = '1';
    canvas.appendChild(connectionsContainer);
    
    // Zet canvas transform
    updateCanvasTransform();
    
    // Stel grid in
    updateGridVisibility();
    
    // Initialiseer minimap
    updateMinimap();
    
    // We beginnen direct in select modus
    currentTool = 'select';
    canvas.style.cursor = 'default';
}

// Initialiseer de mindmap met een centraal knooppunt
function initMindmap(clearVersionHistory = true) {
    // Always clear version history for fresh mindmap unless explicitly told not to
    if (clearVersionHistory) {
        if (window.StorageUtils) {
            window.StorageUtils.removeItem('mindmap_current_project_data');
            window.StorageUtils.removeItem('mindmap_current_draft');
        } else {
            try {
                localStorage.removeItem('mindmap_current_project_data');
                localStorage.removeItem('mindmap_current_draft');
            } catch (e) {
                console.warn('Could not clear localStorage project data:', e);
            }
        }
    }
    
    // Maak het centrale knooppunt
    const rootNode = createNode(
        'Hoofdidee', 
        '', 
        '#4CAF50', 
        canvas.clientWidth / 2 - 60, 
        canvas.clientHeight / 2 - 30, 
        'rounded', 
        null, 
        true
    );
    
    rootNodeId = rootNode.id;
    
    // Centreer op het hoofdknooppunt
    centerOnNode(rootNode.id);
    
    // Toon een welkomstmelding
    showToast('Dubbelklik voor een nieuw knooppunt, of gebruik de + knoppen op bestaande knooppunten');
}

// Gereedschap selecteren
function selectToolHandler(toolId) {
    // Verwijder active class van alle tools
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    
    // Voeg active class toe aan geselecteerd gereedschap
    document.getElementById(toolId).classList.add('active');
    
    // Stel huidig gereedschap in
    currentTool = toolId.replace('-tool', '');
    
    // Reset toestanden
    sourceNode = null;
    
    // Verwijder highlighting van geselecteerde nodes
    document.querySelectorAll('.node').forEach(n => {
        n.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    });
    
    // Wijzig cursor op basis van gereedschap
    switch(currentTool) {
        case 'add-node':
            canvas.style.cursor = 'cell';
            break;
        case 'connect':
            canvas.style.cursor = 'crosshair';
            break;
        case 'delete':
            canvas.style.cursor = 'not-allowed';
            break;
        default:
            canvas.style.cursor = 'default';
            break;
    }
    
    // Verwijder tijdelijke verbindingslijn
    removeTemporaryConnectionLine();
}

// Update tool states based on current selection
function updateToolStates() {
    const batchTextTool = document.getElementById('batch-text-tool');
    
    if (batchTextTool) {
        // Batch text tool is only enabled when a node is selected
        if (currentSelectedNode && !currentSelectedNode.startsWith('conn-')) {
            batchTextTool.disabled = false;
            batchTextTool.title = "Voeg meerdere child nodes toe";
        } else {
            batchTextTool.disabled = true;
            batchTextTool.title = "Selecteer eerst een node om child nodes toe te voegen";
        }
    }
}

// Canvas offset en zoom bijwerken
function updateCanvasTransform() {
    canvas.style.transform = `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoomLevel})`;
    
    // Update minimap viewport
    updateMinimapViewport();
}

// Grid zichtbaarheid bijwerken
function updateGridVisibility() {
    if (showGrid) {
        canvas.style.backgroundImage = 'radial-gradient(#333 1px, transparent 1px)';
        canvas.style.backgroundSize = (gridSize * zoomLevel) + 'px ' + (gridSize * zoomLevel) + 'px';
    } else {
        canvas.style.backgroundImage = 'none';
    }
}

// Zoom niveau bijwerken
function setZoomLevel(newZoom) {
    // Begrens zoom niveau
    zoomLevel = Math.max(0.1, Math.min(3, newZoom));
    
    // Update transform
    updateCanvasTransform();
    
    // Update grid
    updateGridVisibility();
    
    // Update display
    zoomLevelDisplay.textContent = Math.round(zoomLevel * 100) + '%';
}

// Centreer canvas op knooppunt
function centerOnNode(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const containerRect = canvasContainer.getBoundingClientRect();
    
    // Bereken centrering
    canvasOffset.x = (containerRect.width / 2) - (node.x * zoomLevel);
    canvasOffset.y = (containerRect.height / 2) - (node.y * zoomLevel);
    
    // Update canvas
    updateCanvasTransform();
}

// Toastmelding tonen
function showToast(message, isError = false) {
    toast.textContent = message;
    toast.className = 'toast' + (isError ? ' error' : '');
    toast.classList.add('show');
    
    // Verberg na 3 seconden
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Tijdelijke verbindingslijn tonen tijdens het verbinden
function showTemporaryConnectionLine(sourceNode, event) {
    // Verwijder bestaande tijdelijke lijn
    removeTemporaryConnectionLine();
    
    // Bereken de startpositie (middelpunt van de source node)
    const sourceEl = document.getElementById(sourceNode);
    if (!sourceEl) return;
    
    const sourceRect = sourceEl.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    // Bereken middenpunt van de source node in canvas coördinaten
    const sourceX = (sourceNode.x !== undefined) 
        ? sourceNode.x + sourceEl.offsetWidth / 2 
        : (sourceRect.left + sourceRect.width / 2 - canvasRect.left) / zoomLevel;
    
    const sourceY = (sourceNode.y !== undefined)
        ? sourceNode.y + sourceEl.offsetHeight / 2
        : (sourceRect.top + sourceRect.height / 2 - canvasRect.top) / zoomLevel;
    
    // Bereken muispositie relatief aan het canvas
    const mouseX = (event.clientX - canvasRect.left) / zoomLevel;
    const mouseY = (event.clientY - canvasRect.top) / zoomLevel;
    
    // Maak tijdelijke lijn
    const tempLine = document.createElement('div');
    tempLine.id = 'temp-connection-line';
    tempLine.style.position = 'absolute';
    tempLine.style.top = '0';
    tempLine.style.left = '0';
    tempLine.style.width = '100%';
    tempLine.style.height = '100%';
    tempLine.style.pointerEvents = 'none';
    tempLine.style.zIndex = '5';
    
    // Maak een gebogen lijn
    const midX = (sourceX + mouseX) / 2;
    const midY = (sourceY + mouseY) / 2 - 30; // Lichte curve naar boven
    
    tempLine.innerHTML = `
        <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0;">
            <path 
                d="M ${sourceX} ${sourceY} Q ${midX} ${midY} ${mouseX} ${mouseY}"
                stroke="#2196F3"
                stroke-width="2"
                stroke-dasharray="5,5"
                fill="none"
            />
        </svg>
    `;
    
    canvas.appendChild(tempLine);
    activeTempLine = true;
}

// Tijdelijke verbindingslijn verwijderen
function removeTemporaryConnectionLine() {
    const tempLine = document.getElementById('temp-connection-line');
    if (tempLine) {
        tempLine.remove();
        activeTempLine = false;
    }
}

// Minimap bijwerken
function updateMinimap() {
    if (!showMinimap) return;
    
    // Verwijder oude mini-nodes maar behoud de viewport
    const nodesToRemove = miniMapContent.querySelectorAll('.mini-node');
    nodesToRemove.forEach(node => {
        miniMapContent.removeChild(node);
    });
    
    // Schaal en positie berekenen
    const canvasSize = {
        width: canvas.scrollWidth,
        height: canvas.scrollHeight
    };
    
    const miniMapSize = {
        width: miniMap.clientWidth,
        height: miniMap.clientHeight
    };
    
    // Schaal tussen canvas en minimap
    const scaleX = miniMapSize.width / canvasSize.width;
    const scaleY = miniMapSize.height / canvasSize.height;
    const scale = Math.min(scaleX, scaleY);
    
    // Reset miniNodes array
    miniNodes = [];
    
    // Teken alle knooppunten op de minimap
    nodes.forEach(node => {
        const miniNode = document.createElement('div');
        miniNode.className = 'mini-node';
        
        // Bereken positie in minimap
        const miniX = node.x * scale;
        const miniY = node.y * scale;
        
        // Hoofdknooppunt is groter en anders gekleurd
        if (node.isRoot) {
            miniNode.style.width = '6px';
            miniNode.style.height = '6px';
            miniNode.style.backgroundColor = '#FF5722';
        } else {
            miniNode.style.backgroundColor = node.color;
        }
        
        miniNode.style.left = miniX + 'px';
        miniNode.style.top = miniY + 'px';
        
        miniMapContent.appendChild(miniNode);
        
        // Voeg toe aan array voor later gebruik
        miniNodes.push({
            element: miniNode,
            x: miniX,
            y: miniY,
            id: node.id
        });
    });
    
    // Update viewport locatie
    updateMinimapViewport();
}

// Minimap viewport bijwerken
function updateMinimapViewport() {
    if (!showMinimap) return;
    
    // Bereken zichtbaar gebied van de canvas in de container
    const containerRect = canvasContainer.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    // Schaal tussen canvas en minimap
    const canvasSize = {
        width: canvas.scrollWidth,
        height: canvas.scrollHeight
    };
    
    const miniMapSize = {
        width: miniMap.clientWidth,
        height: miniMap.clientHeight
    };
    
    const scale = Math.min(miniMapSize.width / canvasSize.width, miniMapSize.height / canvasSize.height);
    
    // Bereken zichtbaar gebied in de schaal van de minimap
    const visibleLeft = (containerRect.left - canvasRect.left) / zoomLevel;
    const visibleTop = (containerRect.top - canvasRect.top) / zoomLevel;
    const visibleWidth = containerRect.width / zoomLevel;
    const visibleHeight = containerRect.height / zoomLevel;
    
    // Stel viewport afmetingen in
    miniMapViewport.style.left = (visibleLeft * scale) + 'px';
    miniMapViewport.style.top = (visibleTop * scale) + 'px';
    miniMapViewport.style.width = (visibleWidth * scale) + 'px';
    miniMapViewport.style.height = (visibleHeight * scale) + 'px';
}

// Wis de mindmap
function clearMindmap(clearVersionHistory = true) {
    // Sla huidige staat op voordat we wissen voor undo
    saveStateForUndo();
    
    // Verwijder alle knooppunten
    const nodeElements = document.querySelectorAll('.node');
    nodeElements.forEach(el => el.remove());
    
    // Verwijder alle verbindingen
    const connectionElements = document.querySelectorAll('.connection');
    connectionElements.forEach(el => el.remove());
    
    // Reset arrays
    nodes = [];
    connections = [];
    nextNodeId = 1;
    rootNodeId = null;
    
    // Reset variabelen
    draggedNode = null;
    sourceNode = null;
    currentSelectedNode = null;
    currentSelectedConnection = null;
    
    // Clear version control data only when starting a completely new project
    if (clearVersionHistory) {
        if (window.StorageUtils) {
            window.StorageUtils.removeItem('mindmap_current_project_data');
            window.StorageUtils.removeItem('mindmap_current_draft');
        } else {
            try {
                localStorage.removeItem('mindmap_current_project_data');
                localStorage.removeItem('mindmap_current_draft');
            } catch (e) {
                console.warn('Could not clear localStorage version data:', e);
            }
        }
    }
    
    // Reset minimap
    updateMinimap();
    
    showToast('Mindmap gewist');
}

// ----- COPY/PASTE FUNCTIONALITEIT -----

// Clipboard voor copy/paste functionaliteit
let clipboard = {
    nodes: [],
    connections: []
};

// Kopieer geselecteerde node(s)
function copySelectedNodes() {
    if (!currentSelectedNode || currentSelectedNode.startsWith('conn-')) {
        showToast('Selecteer eerst een node om te kopiëren', true);
        return;
    }
    
    const node = nodes.find(n => n.id === currentSelectedNode);
    if (!node) {
        showToast('Geselecteerde node niet gevonden', true);
        return;
    }
    
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
    const rect = canvasContainer.getBoundingClientRect();
    const offsetX = mouseX || ((-canvasOffset.x + rect.width / 2) / zoomLevel);
    const offsetY = mouseY || ((-canvasOffset.y + rect.height / 2) / zoomLevel);
    
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
                if (connData.label) newConn.label = connData.label;
                if (connData.styleClass) newConn.styleClass = connData.styleClass;
                if (connData.type) newConn.type = connData.type;
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

// Zoom naar selectie functionaliteit
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

// ----- ONGEDAAN MAKEN FUNCTIONALITEIT -----

// Functie om een snapshot van de huidige staat te maken voor undo
function saveStateForUndo() {
    // Maak diepe kopieën van nodes en connections om te voorkomen dat ze by reference worden opgeslagen
    const nodesSnapshot = JSON.parse(JSON.stringify(nodes));
    const connectionsSnapshot = JSON.parse(JSON.stringify(connections));
    
    // Controleer of de laatste staat significant verschilt van de huidige staat
    // om dubbele entries in de stack te voorkomen
    if (undoStack.length > 0) {
        const lastState = undoStack[undoStack.length - 1];
        
        // Eenvoudige controle om te zien of er iets is gewijzigd
        const nodesChanged = JSON.stringify(lastState.nodes) !== JSON.stringify(nodesSnapshot);
        const connectionsChanged = JSON.stringify(lastState.connections) !== JSON.stringify(connectionsSnapshot);
        
        if (!nodesChanged && !connectionsChanged) {
            console.log("[DEBUG] Geen significante wijzigingen gedetecteerd, skip undo-staat opslaan");
            return;
        }
    }
    
    // Voeg snapshot toe aan undo stack
    undoStack.push({
        nodes: nodesSnapshot,
        connections: connectionsSnapshot,
        nextNodeId: nextNodeId,
        rootNodeId: rootNodeId
    });
    
    // Beperk de grootte van de undo stack
    if (undoStack.length > MAX_UNDO_STACK_SIZE) {
        undoStack.shift(); // Verwijder de oudste staat
    }
    
    // Activeer de undo knop (visuele feedback)
    if (undoBtn) {
        undoBtn.classList.add('active-tool');
        undoBtn.disabled = false;
    }
    
    console.log("[DEBUG] Staat opgeslagen voor ongedaan maken. Stack grootte:", undoStack.length);
}

// Functie om de laatste actie ongedaan te maken
function undoLastAction() {
    // Controleer of er iets is om ongedaan te maken
    if (undoStack.length === 0) {
        showToast('Niets om ongedaan te maken');
        return;
    }
    
    // Haal de vorige staat op
    const previousState = undoStack.pop();
    
    console.log("[DEBUG] Undo: Vorige staat wordt hersteld", {
        nodes: previousState.nodes.length,
        connections: previousState.connections.length
    });
    
    // Reset de UI elementen
    // Verwijder alle huidige nodes van het canvas
    const nodeElements = document.querySelectorAll('.node');
    nodeElements.forEach(el => el.remove());
    
    // Verwijder alle huidige verbindingen van het canvas
    const connectionElements = document.querySelectorAll('.connection');
    connectionElements.forEach(el => el.remove());
    
    // Reset huidige selecties
    currentSelectedNode = null;
    currentSelectedConnection = null;
    draggedNode = null;
    isDragging = false;
    
    // Herstel de vorige staat met extra logging voor debugging
    console.log("[DEBUG] Undo: Node posities voor herstellen:", 
        nodes.map(n => ({ id: n.id, x: n.x, y: n.y })));
    console.log("[DEBUG] Undo: Node posities die worden hersteld:", 
        previousState.nodes.map(n => ({ id: n.id, x: n.x, y: n.y })));
    
    // Volledig vervangen van de huidige staat met de vorige
    nodes = JSON.parse(JSON.stringify(previousState.nodes));
    connections = JSON.parse(JSON.stringify(previousState.connections));
    nextNodeId = previousState.nextNodeId;
    rootNodeId = previousState.rootNodeId;
    
    // Herbouw de visuele elementen
    // Maak node elementen voor alle herstelde nodes
    nodes.forEach(node => {
        createNodeElement(node);
    });
    
    // Post-load initialization to ensure all managers are updated
    if (typeof initializeAfterLoad === 'function') {
        initializeAfterLoad();
    }
    
    // Teken alle verbindingen opnieuw
    refreshConnections();
    
    // Update minimap
    updateMinimap();
    
    // Deactiveer de undo knop als de stack leeg is
    if (undoStack.length === 0 && undoBtn) {
        undoBtn.classList.remove('active-tool');
        undoBtn.disabled = true;
    }
    
    showToast('Laatste actie ongedaan gemaakt');
    console.log("Laatste actie ongedaan gemaakt. Resterende acties:", undoStack.length);
}

// Helper functie om een node element op het canvas te maken
function createNodeElement(node) {
    console.log("[DEBUG] Aanmaken van node element met positie:", { id: node.id, x: node.x, y: node.y });
    
    // CRITICAL: Ensure we're working with the actual node from the nodes array
    const actualNode = nodes.find(n => n.id === node.id);
    if (!actualNode) {
        console.error(`[createNodeElement] Node not found in nodes array: ${node.id}`);
        return null;
    }
    
    const nodeEl = document.createElement('div');
    nodeEl.id = actualNode.id;
    nodeEl.className = 'node';
    if (actualNode.isRoot) nodeEl.classList.add('root-node');
    
    // Zorg ervoor dat we absolute waarden gebruiken
    const x = Math.round(parseFloat(actualNode.x));
    const y = Math.round(parseFloat(actualNode.y));
    
    nodeEl.style.left = x + 'px';
    nodeEl.style.top = y + 'px';
    nodeEl.style.borderColor = actualNode.color;
    
    // Stel nodestyle in op basis van vorm
    switch(actualNode.shape) {
        case 'rounded':
            nodeEl.style.borderRadius = '10px';
            break;
        case 'circle':
            nodeEl.style.borderRadius = '50%';
            nodeEl.style.width = '120px';
            nodeEl.style.height = '120px';
            nodeEl.style.display = 'flex';
            nodeEl.style.flexDirection = 'column';
            nodeEl.style.justifyContent = 'center';
            nodeEl.style.alignItems = 'center';
            break;
        case 'diamond':
            nodeEl.style.transform = 'rotate(45deg)';
            nodeEl.style.width = '100px';
            nodeEl.style.height = '100px';
            break;
        default: // rectangle
            nodeEl.style.borderRadius = '3px';
            break;
    }
    
    // Maak de inhoud van de node
    let innerContent = '';
    
    if (actualNode.shape === 'diamond') {
        innerContent = `
            <div class="node-title" style="transform: rotate(-45deg);">${actualNode.title}</div>
            ${actualNode.content ? `<div class="node-content" style="transform: rotate(-45deg);">${actualNode.content}</div>` : ''}
        `;
    } else {
        innerContent = `
            <div class="node-title">${actualNode.title}</div>
            ${actualNode.content ? `<div class="node-content">${actualNode.content}</div>` : ''}
        `;
    }
    
    nodeEl.innerHTML = innerContent;
    
    // Voeg plusjes toe voor directe toevoeging van knooppunten
    const addButtons = `
        <div class="add-node-btn top" title="Knooppunt boven toevoegen">+</div>
        <div class="add-node-btn right" title="Knooppunt rechts toevoegen">+</div>
        <div class="add-node-btn bottom" title="Knooppunt onder toevoegen">+</div>
        <div class="add-node-btn left" title="Knooppunt links toevoegen">+</div>
    `;
    nodeEl.insertAdjacentHTML('beforeend', addButtons);
    
    // Voeg event listeners toe
    nodeEl.addEventListener('mousedown', function(e) {
        if (e.button === 0) { // Alleen linkermuisknop
            handleNodeMouseDown(e, actualNode);
        }
    });
    
    nodeEl.addEventListener('dblclick', function(e) {
        // Skip double-click handling for touch events (handled by mobile-touch.js)
        if (e.pointerType === 'touch' || 'ontouchstart' in window) {
            return;
        }
        
        // Desktop behavior: Als de klik in de titel was, maak direct bewerkbaar
        if (e.target.classList.contains('node-title')) {
            makeEditable(e.target, actualNode);
        } else {
            // Anders open de editor modal
            openNodeEditor(actualNode);
        }
    });
    
    nodeEl.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showContextMenu(e, actualNode);
    });
    
    // Event voor connect tool en tijdelijke verbindingslijn
    nodeEl.addEventListener('mouseover', function(e) {
        if (currentTool === 'connect' && sourceNode && sourceNode !== actualNode.id) {
            nodeEl.style.boxShadow = '0 0 0 2px #2196F3';
        }
    });
    
    nodeEl.addEventListener('mouseout', function(e) {
        if (currentTool === 'connect') {
            nodeEl.style.boxShadow = '';
        }
    });
    
    // Voeg event listeners toe aan de add-node buttons
    const addNodeBtns = nodeEl.querySelectorAll('.add-node-btn');
    addNodeBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); // Voorkom dat het click event naar de node gaat
            
            // Bereken positie voor nieuw knooppunt op basis van de positie van de knop
            const direction = this.classList.contains('top') ? 'top' : 
                             this.classList.contains('right') ? 'right' : 
                             this.classList.contains('bottom') ? 'bottom' : 'left';
            
            // Standaard offset
            const offset = 180;
            
            // Bepaal nieuwe positie
            let newX = actualNode.x;
            let newY = actualNode.y;
            
            switch(direction) {
                case 'top':
                    newY = actualNode.y - offset;
                    break;
                case 'right':
                    newX = actualNode.x + offset;
                    break;
                case 'bottom':
                    newY = actualNode.y + offset;
                    break;
                case 'left':
                    newX = actualNode.x - offset;
                    break;
            }
            
            // Sla huidige staat op voordat we een nieuwe node toevoegen
            saveStateForUndo();
            
            
            // Maak nieuw knooppunt
            const childNode = createNode('Nieuw idee', '', actualNode.color, newX, newY, 'rounded', actualNode.id);
            
            if (!childNode) {
                return;
            }
            
            // Focus op titel voor directe bewerking
            // Gebruik requestAnimationFrame om zeker te zijn dat DOM is bijgewerkt
            requestAnimationFrame(() => {
                const childEl = document.getElementById(childNode.id);
                if (childEl) {
                    const titleEl = childEl.querySelector('.node-title');
                    if (titleEl) {
                        makeEditable(titleEl, childNode);
                    }
                }
            });
        });
    });
    
    // Mobile touch integration - ensure proper touch handling
    nodeEl.style.touchAction = 'none'; // Prevent default touch behaviors
    
    // Voeg de node toe aan het canvas
    canvas.appendChild(nodeEl);
    
    // Notify mobile touch manager if available
    if (window.mobileTouchManager && typeof window.mobileTouchManager.addNode === 'function') {
        window.mobileTouchManager.addNode(nodeEl);
    }
    
    return nodeEl;
}

// ==========================
// ADVANCED PERFORMANCE MONITORING
// ==========================

const performanceMonitor = {
    metrics: {},
    slowOperations: [],
    isEnabled: true,
    
    /**
     * Start timing an operation
     * @param {string} operation - Name of the operation
     */
    start(operation) {
        if (!this.isEnabled) return;
        this.metrics[operation] = performance.now();
    },
    
    /**
     * End timing an operation and check for slow performance
     * @param {string} operation - Name of the operation
     * @param {number} threshold - Threshold in milliseconds (default: 100ms)
     */
    end(operation, threshold = 100) {
        if (!this.isEnabled) return;
        
        if (this.metrics[operation]) {
            const duration = performance.now() - this.metrics[operation];
            
            if (duration > threshold) {
                this.slowOperations.push({
                    operation,
                    duration: duration.toFixed(2),
                    timestamp: Date.now()
                });
                
                console.warn(`Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`);
                
                // Keep only last 10 slow operations
                if (this.slowOperations.length > 10) {
                    this.slowOperations.shift();
                }
                
                // Show toast for very slow operations (> 500ms)
                if (duration > 500) {
                    showToast(`Performance waarschuwing: ${operation} duurde ${duration.toFixed(0)}ms`, true);
                }
            }
            
            delete this.metrics[operation];
            return duration;
        }
        
        return 0;
    },
    
    /**
     * Get recent slow operations
     * @returns {Array} Array of slow operations
     */
    getSlowOperations() {
        return this.slowOperations;
    },
    
    /**
     * Clear slow operations history
     */
    clearHistory() {
        this.slowOperations = [];
    },
    
    /**
     * Enable/disable performance monitoring
     * @param {boolean} enabled - Whether to enable monitoring
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (enabled) {
            console.log('Performance monitoring enabled');
        } else {
            console.log('Performance monitoring disabled');
        }
    }
};

// Wrap critical functions with performance monitoring
const originalRefreshConnections = window.refreshConnections;
window.refreshConnections = function(...args) {
    performanceMonitor.start('refreshConnections');
    const result = originalRefreshConnections.apply(this, args);
    performanceMonitor.end('refreshConnections', 50);
    return result;
};

const originalUpdateMinimap = window.updateMinimap;
window.updateMinimap = function(...args) {
    performanceMonitor.start('updateMinimap');
    const result = originalUpdateMinimap ? originalUpdateMinimap.apply(this, args) : undefined;
    performanceMonitor.end('updateMinimap', 100);
    return result;
};

const originalDrawConnection = window.drawConnection;
if (originalDrawConnection) {
    window.drawConnection = function(...args) {
        performanceMonitor.start('drawConnection');
        const result = originalDrawConnection.apply(this, args);
        performanceMonitor.end('drawConnection', 30);
        return result;
    };
}

const originalCreateNode = window.createNode;
if (originalCreateNode) {
    window.createNode = function(...args) {
        performanceMonitor.start('createNode');
        const result = originalCreateNode.apply(this, args);
        performanceMonitor.end('createNode', 50);
        return result;
    };
}

// Export for global access
window.performanceMonitor = performanceMonitor;

console.log('📊 Performance monitoring activated');

// ==========================
// ADVANCED ERROR HANDLING
// ==========================

const errorHandler = {
    errors: [],
    isEnabled: true,
    
    /**
     * Log and handle errors
     * @param {Error} error - The error object
     * @param {string} context - Context where error occurred
     * @param {boolean} showUser - Whether to show error to user
     */
    handle(error, context = 'unknown', showUser = false) {
        if (!this.isEnabled) return;
        
        // Handle cases where error might be null or not an Error object
        const safeError = error || new Error('Unknown error');
        
        const errorInfo = {
            message: safeError.message || 'Unknown error message',
            stack: safeError.stack || 'No stack trace available',
            context,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        this.errors.push(errorInfo);
        
        // Keep only last 20 errors
        if (this.errors.length > 20) {
            this.errors.shift();
        }
        
        // Log to console
        console.error(`[${context}] Error:`, error);
        
        // Show to user if requested
        if (showUser) {
            showToast(`Fout: ${safeError.message}`, true);
        }
        
        // Attempt recovery for specific error types
        this.attemptRecovery(safeError, context);
    },
    
    /**
     * Attempt to recover from specific error types
     * @param {Error} error - The error object
     * @param {string} context - Context where error occurred
     */
    attemptRecovery(error, context) {
        if (error.message.includes('Cannot read properties of null')) {
            console.log('Attempting recovery from null reference...');
            
            // Validate and clean up connections
            if (typeof window.validateConnections === 'function') {
                window.validateConnections();
            }
            
            // Refresh connections
            if (typeof window.refreshConnections === 'function') {
                try {
                    window.refreshConnections();
                } catch (e) {
                    console.error('Recovery failed:', e);
                }
            }
        }
        
        if (error.message.includes('is not a function')) {
            console.log('Attempting recovery from missing function...');
            
            // Reset to safe state
            isDragging = false;
            draggedNode = null;
            canvasDragging = false;
            
            // Clear any active UI states
            document.querySelectorAll('.node').forEach(node => {
                node.classList.remove('reconnecting', 'potential-new-parent');
            });
            
            if (window.reconnectingNode) {
                window.reconnectingNode = null;
            }
        }
    },
    
    /**
     * Get recent errors
     * @returns {Array} Array of error objects
     */
    getErrors() {
        return this.errors;
    },
    
    /**
     * Clear error history
     */
    clearErrors() {
        this.errors = [];
    },
    
    /**
     * Enable/disable error handling
     * @param {boolean} enabled - Whether to enable error handling
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (enabled) {
            console.log('Error handling enabled');
        } else {
            console.log('Error handling disabled');
        }
    }
};

// Global error handler
window.addEventListener('error', function(e) {
    errorHandler.handle(e.error, 'global', false);
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(e) {
    errorHandler.handle(new Error(e.reason), 'promise', false);
});

// Wrap critical functions with error handling
const safeWrap = (fn, name) => {
    return function(...args) {
        try {
            return fn.apply(this, args);
        } catch (error) {
            errorHandler.handle(error, name, true);
            return null;
        }
    };
};

// Wrap key functions
if (window.createNode) {
    window.createNode = safeWrap(window.createNode, 'createNode');
}

if (window.deleteNode) {
    window.deleteNode = safeWrap(window.deleteNode, 'deleteNode');
}

if (window.createConnection) {
    window.createConnection = safeWrap(window.createConnection, 'createConnection');
}

if (window.deleteConnection) {
    window.deleteConnection = safeWrap(window.deleteConnection, 'deleteConnection');
}

if (window.makeEditable) {
    window.makeEditable = safeWrap(window.makeEditable, 'makeEditable');
}

// Export for global access
window.errorHandler = errorHandler;

console.log('🛡️ Advanced error handling activated');

// ==========================
// INFINITE LOOP DETECTION
// ==========================

const loopDetector = {
    calls: {},
    isEnabled: true,
    
    /**
     * Check if function is being called too frequently
     * @param {string} functionName - Name of the function
     * @param {number} threshold - Max calls per time window (default: 50)
     * @param {number} timeWindow - Time window in milliseconds (default: 100)
     * @returns {boolean} - True if execution should continue
     */
    check(functionName, threshold = 50, timeWindow = 100) {
        if (!this.isEnabled) return true;
        
        const now = Date.now();
        if (!this.calls[functionName]) {
            this.calls[functionName] = [];
        }
        
        this.calls[functionName].push(now);
        
        // Keep only calls within time window
        this.calls[functionName] = this.calls[functionName].filter(t => now - t < timeWindow);
        
        // Check if threshold exceeded
        if (this.calls[functionName].length > threshold) {
            console.error(`Possible infinite loop detected in ${functionName}`);
            showToast(`Oneindige lus gedetecteerd in ${functionName}`, true);
            this.calls[functionName] = [];
            return false;
        }
        
        return true;
    },
    
    /**
     * Clear loop detection for a function
     * @param {string} functionName - Name of the function
     */
    clear(functionName) {
        if (this.calls[functionName]) {
            this.calls[functionName] = [];
        }
    },
    
    /**
     * Enable/disable loop detection
     * @param {boolean} enabled - Whether to enable detection
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (enabled) {
            console.log('Loop detection enabled');
        } else {
            console.log('Loop detection disabled');
        }
    }
};

// Add loop detection to critical functions
const originalRefreshConnectionsWithLoop = window.refreshConnections;
window.refreshConnections = function(...args) {
    if (!loopDetector.check('refreshConnections')) {
        return;
    }
    return originalRefreshConnectionsWithLoop.apply(this, args);
};

const originalUpdateRelatedConnections = window.updateRelatedConnections;
if (originalUpdateRelatedConnections) {
    window.updateRelatedConnections = function(...args) {
        if (!loopDetector.check('updateRelatedConnections')) {
            return;
        }
        return originalUpdateRelatedConnections.apply(this, args);
    };
}

const originalDrawConnectionWithLoop = window.drawConnection;
if (originalDrawConnectionWithLoop) {
    window.drawConnection = function(...args) {
        if (!loopDetector.check('drawConnection')) {
            return;
        }
        return originalDrawConnectionWithLoop.apply(this, args);
    };
}

// Export for global access
window.loopDetector = loopDetector;

// Title management functions
function getMindmapTitle() {
    return mindmapTitle;
}

function setMindmapTitle(title) {
    mindmapTitle = title || 'Mindmap Project';
    if (mindmapTitleEl) {
        mindmapTitleEl.value = mindmapTitle;
    }
    // Update version control if available
    if (window.VersionControl && window.VersionControl.setProject && window.VersionControl.getCurrentProject) {
        const currentProject = window.VersionControl.getCurrentProject();
        if (currentProject && currentProject.version) {
            window.VersionControl.setProject(mindmapTitle, currentProject.version);
        }
    }
}

function updateTitleFromInput() {
    if (mindmapTitleEl) {
        const newTitle = mindmapTitleEl.value.trim() || 'Mindmap Project';
        setMindmapTitle(newTitle);
    }
}

// Export title functions to global scope
window.getMindmapTitle = getMindmapTitle;
window.setMindmapTitle = setMindmapTitle;
window.updateTitleFromInput = updateTitleFromInput;

console.log('🔄 Infinite loop detection activated');