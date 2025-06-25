/**
 * core.js - Bevat de kernconfiguratie en globale variabelen voor de mindmap tool
 */

// Status variabelen
let currentTool = 'select';
let nodes = [];
let connections = [];
let nextNodeId = 1;
let rootNodeId = null;
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
let canvasOffset = { x: 0, y: 0 };
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
function initMindmap() {
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
function clearMindmap() {
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
    
    // Reset minimap
    updateMinimap();
    
    showToast('Mindmap gewist');
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
    
    const nodeEl = document.createElement('div');
    nodeEl.id = node.id;
    nodeEl.className = 'node';
    if (node.isRoot) nodeEl.classList.add('root-node');
    
    // Zorg ervoor dat we absolute waarden gebruiken
    const x = Math.round(parseFloat(node.x));
    const y = Math.round(parseFloat(node.y));
    
    nodeEl.style.left = x + 'px';
    nodeEl.style.top = y + 'px';
    nodeEl.style.borderColor = node.color;
    
    // Stel nodestyle in op basis van vorm
    switch(node.shape) {
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
    
    if (node.shape === 'diamond') {
        innerContent = `
            <div class="node-title" style="transform: rotate(-45deg);">${node.title}</div>
            ${node.content ? `<div class="node-content" style="transform: rotate(-45deg);">${node.content}</div>` : ''}
        `;
    } else {
        innerContent = `
            <div class="node-title">${node.title}</div>
            ${node.content ? `<div class="node-content">${node.content}</div>` : ''}
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
            handleNodeMouseDown(e, node);
        }
    });
    
    nodeEl.addEventListener('dblclick', function(e) {
        // Als de klik in de titel was, maak direct bewerkbaar
        if (e.target.classList.contains('node-title')) {
            makeEditable(e.target, node);
        } else {
            // Anders open de editor modal
            openNodeEditor(node);
        }
    });
    
    nodeEl.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showContextMenu(e, node);
    });
    
    // Event voor connect tool en tijdelijke verbindingslijn
    nodeEl.addEventListener('mouseover', function(e) {
        if (currentTool === 'connect' && sourceNode && sourceNode !== node.id) {
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
            let newX = node.x;
            let newY = node.y;
            
            switch(direction) {
                case 'top':
                    newY = node.y - offset;
                    break;
                case 'right':
                    newX = node.x + offset;
                    break;
                case 'bottom':
                    newY = node.y + offset;
                    break;
                case 'left':
                    newX = node.x - offset;
                    break;
            }
            
            // Sla huidige staat op voordat we een nieuwe node toevoegen
            saveStateForUndo();
            
            // Maak nieuw knooppunt
            const childNode = createNode('Nieuw idee', '', node.color, newX, newY, 'rounded', node.id);
            
            // Focus op titel voor directe bewerking
            const childEl = document.getElementById(childNode.id);
            if (childEl) {
                const titleEl = childEl.querySelector('.node-title');
                if (titleEl) {
                    makeEditable(titleEl, childNode);
                }
            }
        });
    });
    
    // Voeg de node toe aan het canvas
    canvas.appendChild(nodeEl);
    
    return nodeEl;
}