/**
 * nodes.js - Bevat functies voor het beheren van knooppunten in de mindmap
 */

// Nieuw knooppunt maken
function createNode(title, content, color, x, y, shape = 'rectangle', parentNode = null, isRoot = false) {
    // Sla huidige staat op voor undo functionaliteit
    if (typeof saveStateForUndo === 'function') {
        saveStateForUndo();
    }
    
    // CRITICAL FIX: Ensure nextNodeId is correct before creating new node
    let maxNodeId = 0;
    nodes.forEach(node => {
        const nodeNum = parseInt(node.id.replace('node-', ''));
        if (!isNaN(nodeNum) && nodeNum > maxNodeId) {
            maxNodeId = nodeNum;
        }
    });
    
    // If nextNodeId would create a conflict, fix it
    if (nextNodeId <= maxNodeId) {
        const oldNextNodeId = nextNodeId;
        nextNodeId = maxNodeId + 1;
        console.warn(`[createNode] CORRECTING nextNodeId from ${oldNextNodeId} to ${nextNodeId} to avoid conflicts`);
    }
    
    const nodeId = 'node-' + nextNodeId++;
    
    // Check for ID conflicts (should not happen now)
    const existingNode = nodes.find(n => n.id === nodeId);
    if (existingNode) {
        console.error(`[createNode] ID CONFLICT! Node ${nodeId} already exists!`);
        console.error('Existing node:', existingNode);
        console.error('Current nextNodeId:', nextNodeId);
        console.error('All existing node IDs:', nodes.map(n => n.id));
        // This should not happen anymore, but if it does, we need to handle it
        return null;
    }
    
    // Maak knooppunt object
    const newNode = {
        id: nodeId,
        title: title || 'Nieuw knooppunt',
        content: content || '',
        color: color || '#4CAF50',
        x: x,
        y: y,
        shape: shape || 'rectangle',
        isRoot: isRoot
    };
    
    // Voeg node toe aan array
    nodes.push(newNode);
    
    // Maak DOM element voor de node
    const nodeEl = document.createElement('div');
    nodeEl.id = nodeId;
    nodeEl.className = 'node';
    if (isRoot) nodeEl.classList.add('root-node');
    nodeEl.style.left = x + 'px';
    nodeEl.style.top = y + 'px';
    nodeEl.style.borderColor = color;
    
    // Stel nodestyle in op basis van vorm
    switch(shape) {
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
            nodeEl.classList.add('diamond-node');
            nodeEl.style.transform = 'rotate(45deg)';
            nodeEl.style.width = '120px';
            nodeEl.style.height = '120px';
            nodeEl.style.display = 'flex';
            nodeEl.style.flexDirection = 'column';
            nodeEl.style.justifyContent = 'center';
            nodeEl.style.alignItems = 'center';
            nodeEl.style.textAlign = 'center';
            break;
        default: // rectangle
            nodeEl.style.borderRadius = '3px';
            break;
    }
    
    // Maak de inhoud van de node
    let innerContent = '';
    
    if (shape === 'diamond') {
        innerContent = `
            <div class="node-title">${newNode.title}</div>
            ${newNode.content ? `<div class="node-content">${newNode.content}</div>` : ''}
        `;
    } else {
        innerContent = `
            <div class="node-title">${newNode.title}</div>
            ${newNode.content ? `<div class="node-content">${newNode.content}</div>` : ''}
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
    
    // Event listeners voor de plusjes toevoegen
    nodeEl.querySelectorAll('.add-node-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); // Voorkom dat het click event naar de node gaat
            
            // Bereken positie voor nieuw knooppunt op basis van de positie van de knop
            const direction = this.classList.contains('top') ? 'top' : 
                             this.classList.contains('right') ? 'right' : 
                             this.classList.contains('bottom') ? 'bottom' : 'left';
            
            // Standaard offset
            const offset = 180;
            
            // Bepaal nieuwe positie
            let newX = newNode.x;
            let newY = newNode.y;
            
            switch(direction) {
                case 'top':
                    newY = newNode.y - offset;
                    break;
                case 'right':
                    newX = newNode.x + offset;
                    break;
                case 'bottom':
                    newY = newNode.y + offset;
                    break;
                case 'left':
                    newX = newNode.x - offset;
                    break;
            }
            
            // Maak nieuw knooppunt
            const childNode = createNode('Nieuw idee', '', newNode.color, newX, newY, 'rounded', newNode.id);
            
            // Focus op titel voor directe bewerking (alleen op desktop)
            if (!('ontouchstart' in window)) {
                const childEl = document.getElementById(childNode.id);
                if (childEl) {
                    const titleEl = childEl.querySelector('.node-title');
                    if (titleEl) {
                        makeEditable(titleEl, childNode);
                    }
                }
            }
        });
    });
    
    // Voeg event listeners toe
    nodeEl.addEventListener('mousedown', function(e) {
        if (e.button === 0) { // Alleen linkermuisknop
            handleNodeMouseDown(e, newNode);
        }
    });
    
    nodeEl.addEventListener('dblclick', function(e) {
        // Skip double-click handling for touch events (handled by mobile-touch.js)
        if (e.pointerType === 'touch' || 'ontouchstart' in window) {
            return;
        }
        
        // Desktop behavior: Als de klik in de titel was, maak direct bewerkbaar
        if (e.target.classList.contains('node-title')) {
            makeEditable(e.target, newNode);
        } else {
            // Anders open de editor modal
            openNodeEditor(newNode);
        }
    });
    
    nodeEl.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showContextMenu(e, newNode);
    });
    
    // Event voor connect tool en tijdelijke verbindingslijn
    nodeEl.addEventListener('mouseover', function(e) {
        if (currentTool === 'connect' && sourceNode && sourceNode !== newNode.id) {
            nodeEl.style.boxShadow = '0 0 0 2px #2196F3';
        }
    });
    
    nodeEl.addEventListener('mouseout', function(e) {
        if (currentTool === 'connect') {
            nodeEl.style.boxShadow = '';
        }
    });
    
    // Voeg de node toe aan het canvas
    canvas.appendChild(nodeEl);
    
    // Als er een parent is opgegeven, maak een verbinding
    // Gebruik requestAnimationFrame om er zeker van te zijn dat de DOM is bijgewerkt
    if (parentNode) {
        
        // Verifieer dat beide nodes bestaan voordat we de verbinding maken
        const parentExists = nodes.some(n => n.id === parentNode);
        const newNodeExists = nodes.some(n => n.id === newNode.id);
        
        if (parentExists && newNodeExists) {
            // Gebruik requestAnimationFrame om DOM update te garanderen
            requestAnimationFrame(() => {
                // Controleer of DOM elementen bestaan
                const parentEl = document.getElementById(parentNode);
                const newNodeEl = document.getElementById(newNode.id);
                
                if (parentEl && newNodeEl) {
                    createConnection(parentNode, newNode.id);
                }
            });
        }
    }
    
    // Update minimap
    updateMinimap();
    
    return newNode;
}

// Maak een element direct bewerkbaar
function makeEditable(element, node) {
    // Sla huidige staat op VOORDAT we de titel gaan bewerken
    if (typeof saveStateForUndo === 'function') {
        console.log("[DEBUG] Staat opslaan VOOR titelwijziging");
        saveStateForUndo();
    }
    
    // Bewaar de originele titel voor vergelijking
    const originalTitle = node.title;
    
    // Maak het element bewerkbaar
    element.contentEditable = true;
    
    // Focus without scrolling to prevent jumps
    element.focus({ preventScroll: true });
    
    // Selecteer alle tekst
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Event handlers - gebruik named functions voor cleanup
    const handlers = {
        blur: null,
        keydown: null,
        mousedown: null
    };
    
    const saveEdit = function() {
        const newText = element.innerText.trim();
        // Alleen opslaan als er tekst is
        if (newText) {
            // Controleer of er iets is gewijzigd
            if (originalTitle !== newText) {
                node.title = newText;
                
                // Update connections voor deze node vanwege mogelijke tekstlengte verandering
                if (typeof updateConnectionsForNodeChange === 'function') {
                    updateConnectionsForNodeChange(node.id);
                }
            } else {
                // Als de titel niet is gewijzigd, verwijder de onnodige undo-actie
                console.log("[DEBUG] Titel niet gewijzigd, undo-actie verwijderen");
                if (undoStack.length > 0 && typeof undoStack.pop === 'function') {
                    undoStack.pop();
                }
            }
        }
        
        element.contentEditable = false;
        // Zorg ervoor dat lege nodes een standaard tekst krijgen
        if (!newText) {
            element.innerText = node.title;
        }
        
        // Cleanup alle event listeners
        element.removeEventListener('blur', handlers.blur);
        element.removeEventListener('keydown', handlers.keydown);
        element.removeEventListener('mousedown', handlers.mousedown);
        
        // Markeer dat het bewerken is voltooid met een kleine vertraging
        // om onbedoelde drag initialisatie te voorkomen direct na bewerken
        setTimeout(() => {
            const nodeEl = document.getElementById(node.id);
            if (nodeEl) {
                // Reset alle edit-related classes/attributen
                nodeEl.dataset.editCompleted = 'true';
            }
        }, 100);
    };
    
    handlers.blur = saveEdit;
    handlers.keydown = function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            element.blur(); // Dit triggert de blur event handler
        } else if (e.key === 'Escape') {
            element.innerText = node.title;
            element.contentEditable = false;
            // Cleanup bij escape
            element.removeEventListener('blur', handlers.blur);
            element.removeEventListener('keydown', handlers.keydown);
            element.removeEventListener('mousedown', handlers.mousedown);
        }
    };
    
    handlers.mousedown = function(e) {
        // Wanneer in edit mode, laat de mousedown event niet doorgaan naar de parent node
        // zodat we niet onbedoeld het drag mechanisme activeren
        if (element.contentEditable === 'true') {
            e.stopPropagation();
        }
    };
    
    // Voeg event listeners toe
    element.addEventListener('blur', handlers.blur, { once: true });
    element.addEventListener('keydown', handlers.keydown);
    element.addEventListener('mousedown', handlers.mousedown);
}

// Event handler voor mousedown op een knooppunt
function handleNodeMouseDown(e, node) {
    e.stopPropagation();
    
    const nodeEl = document.getElementById(node.id);
    
    // Controleer of het event afkomstig is van een contentEditable element
    // of een andere interactieve component binnen de node
    const isFromContentEditable = e.target.isContentEditable || 
                                 e.target.classList.contains('add-node-btn') ||
                                 e.target.closest('.add-node-btn');
    
    // Verbinden van knooppunten in connect modus
    if (currentTool === 'connect') {
        if (!sourceNode) {
            // Start van een verbinding
            sourceNode = node.id;
            nodeEl.style.boxShadow = '0 0 0 2px #2196F3';
            canvas.addEventListener('mousemove', handleConnectMouseMove);
            showToast('Klik op een ander knooppunt om te verbinden');
        } else if (sourceNode !== node.id) {
            // Einde van een verbinding
            createConnection(sourceNode, node.id);
            
            // Reset verbinding status
            const sourceEl = document.getElementById(sourceNode);
            if (sourceEl) {
                sourceEl.style.boxShadow = '';
            }
            sourceNode = null;
            removeTemporaryConnectionLine();
            canvas.removeEventListener('mousemove', handleConnectMouseMove);
            
            showToast('Knooppunten verbonden');
        }
        return;
    }
    
    // ALT+drag voor node reconnection
    if (e.altKey && !e.ctrlKey && !isFromContentEditable) {
        e.preventDefault();
        
        // Sla de huidige staat op voor undo
        if (typeof saveStateForUndo === 'function') {
            saveStateForUndo();
        }
        
        const actualNode = nodes.find(n => n.id === node.id);
        if (!actualNode) {
            console.error(`[handleNodeMouseDown] Kon node niet vinden in nodes array: ${node.id}`);
            return;
        }
        
        // Start reconnect mode
        nodeEl.classList.add('reconnecting');
        window.reconnectingNode = {
            node: actualNode,
            originalParents: connections
                .filter(conn => conn.target === actualNode.id)
                .map(conn => conn.source)
        };
        
        // Start ook normale drag
        draggedNode = actualNode;
        mouseStartPos = { x: e.clientX, y: e.clientY };
        nodeStartPos = { x: actualNode.x, y: actualNode.y };
        isDragging = true;
        
        // Visual feedback
        nodeEl.style.zIndex = 10;
        nodeEl.style.boxShadow = '0 0 20px rgba(255, 152, 0, 0.8)';
        
        showToast('Sleep naar een andere node om te herverbinden');
        return;
    }
    
    // Verplaatsen van knooppunt starten - alleen als we niet op een contentEditable element hebben geklikt
    if (!e.ctrlKey && !isFromContentEditable) { // Ctrl voorkomt verplaatsen
        // Sla de huidige staat eerst op VOORDAT we gaan slepen
        if (typeof saveStateForUndo === 'function') {
            console.log("[DEBUG] Staat opslaan VOOR node verplaatsing");
            saveStateForUndo();
        }
        
        // Zorg ervoor dat we een referentie naar het werkelijke node object hebben
        const actualNode = nodes.find(n => n.id === node.id);
        if (!actualNode) {
            console.error(`[handleNodeMouseDown] Kon node niet vinden in nodes array: ${node.id}`);
            return;
        }
        
        draggedNode = actualNode;
        
        // Bewaar de begin muispositie en positie van de node
        mouseStartPos = { x: e.clientX, y: e.clientY };
        nodeStartPos = { x: actualNode.x, y: actualNode.y };
        
        console.log("[DEBUG] Starting drag from position:", nodeStartPos);
        
        isDragging = true;
        
        // Markeer het element als actief
        nodeEl.style.zIndex = 10;
        nodeEl.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
    }
    
    // Stel huidige geselecteerde knooppunt in
    // Alleen deselecteren als er geen CTRL+click actie wordt uitgevoerd
    if (!e.ctrlKey) {
        // Gebruik deselectAll als het beschikbaar is, anders gebruik fallback
        if (typeof deselectAll === 'function') {
            deselectAll();
        } else {
            // Fallback deselectie logica
            document.querySelectorAll('.node').forEach(n => {
                n.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                n.classList.remove('ctrl-select-source');
                n.classList.remove('ctrl-selectable');
                if (n.style.transform.includes('scale(1.03)')) {
                    n.style.transform = n.style.transform.replace(' scale(1.03)', '');
                } else if (n.style.transform === 'scale(1.03)') {
                    n.style.transform = '';
                }
                n.style.zIndex = '2';
            });
            currentSelectedNode = null;
            currentSelectedConnection = null;
        }
    }
    currentSelectedNode = node.id;
    
    // Gebruik updateSelectionStatus als het beschikbaar is, anders gebruik fallback
    if (typeof updateSelectionStatus === 'function') {
        updateSelectionStatus();
    } else {
        // Fallback selectie status logica
        const nodeEl = document.getElementById(node.id);
        if (nodeEl) {
            nodeEl.style.boxShadow = '0 0 0 4px #2196F3, 0 0 0 8px rgba(33, 150, 243, 0.3), 0 0 20px rgba(33, 150, 243, 0.6), 0 8px 25px rgba(0,0,0,0.4)';
            nodeEl.style.transform = nodeEl.style.transform.includes('rotate') ? nodeEl.style.transform + ' scale(1.03)' : 'scale(1.03)';
            nodeEl.style.zIndex = '10';
        }
        
        // Vernieuw verbindingen als functie beschikbaar is
        if (typeof refreshConnections === 'function') {
            refreshConnections();
        }
    }
    
    // Als we in branch modus zijn, maak een verbinding met dit knooppunt
    if (branchingMode && branchSourceNode && branchSourceNode !== node.id) {
        createConnection(branchSourceNode, node.id, true);
        
        // Reset branch modus
        branchingMode = false;
        branchSourceNode = null;
        canvas.style.cursor = 'default';
        
        showToast('Vertakking gemaakt');
    }
}

// Event handler voor mousemove in connect modus
function handleConnectMouseMove(e) {
    if (sourceNode && currentTool === 'connect') {
        const sourceNodeObj = nodes.find(n => n.id === sourceNode);
        if (sourceNodeObj) {
            showTemporaryConnectionLine(sourceNodeObj, e);
        }
    }
}

// Knooppunt bewerken
function openNodeEditor(node) {
    // Sla huidige staat op VOORDAT we gaan bewerken
    if (typeof saveStateForUndo === 'function') {
        console.log("[DEBUG] Staat opslaan VOOR node bewerking");
        saveStateForUndo();
    }
    
    // Vul editor met huidige waarden
    nodeTitle.value = node.title;
    nodeContent.value = node.content;
    nodeColor.value = node.color;
    nodeShape.value = node.shape;
    
    // Update color selection
    updateColorSelection(node.color);
    
    // Sla het te bewerken knooppunt id op voor later gebruik
    nodeModal.dataset.nodeId = node.id;
    
    // Toon de modal
    nodeModal.style.display = 'flex';
}

// Wijzigingen in knooppunt opslaan
function saveNodeEdits() {
     // Sla huidige staat op voor undo functionaliteit
     if (typeof saveStateForUndo === 'function') {
     saveStateForUndo();
    }
    
    const nodeId = nodeModal.dataset.nodeId;
    const node = nodes.find(n => n.id === nodeId);
    
    if (node) {
        // Oude waarden opslaan voor vergelijking
        const oldShape = node.shape;
        
        // Update node data
        node.title = nodeTitle.value;
        node.content = nodeContent.value;
        node.color = nodeColor.value;
        node.shape = nodeShape.value;
        
        // Update DOM element
        const nodeEl = document.getElementById(nodeId);
        if (nodeEl) {
            // Reset stijlen (voor vorm wijzigingen)
            nodeEl.style.transform = '';
            nodeEl.style.borderRadius = '';
            nodeEl.style.width = '';
            nodeEl.style.height = '';
            nodeEl.style.display = '';
            nodeEl.style.flexDirection = '';
            nodeEl.style.justifyContent = '';
            nodeEl.style.alignItems = '';
            
            // Stel nieuwe stijlen in
            nodeEl.style.borderColor = node.color;
            
            // Pas vorm aan
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
                    nodeEl.style.width = '120px';
                    nodeEl.style.height = '120px';
                    break;
                default: // rectangle
                    nodeEl.style.borderRadius = '3px';
                    break;
            }
            
            // Update inhoud
            let innerContent = '';
            
            if (node.shape === 'diamond') {
                innerContent = `
                    <div class="node-title">${node.title}</div>
                    ${node.content ? `<div class="node-content">${node.content}</div>` : ''}
                `;
            } else {
                innerContent = `
                    <div class="node-title">${node.title}</div>
                    ${node.content ? `<div class="node-content">${node.content}</div>` : ''}
                `;
            }
            
            // Bewaar de inhoud en voeg plusjes weer toe
            const addButtons = `
                <div class="add-node-btn top" title="Knooppunt boven toevoegen">+</div>
                <div class="add-node-btn right" title="Knooppunt rechts toevoegen">+</div>
                <div class="add-node-btn bottom" title="Knooppunt onder toevoegen">+</div>
                <div class="add-node-btn left" title="Knooppunt links toevoegen">+</div>
            `;
            
            nodeEl.innerHTML = innerContent + addButtons;
            
            // Voeg event listeners weer toe voor de plusjes
            nodeEl.querySelectorAll('.add-node-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    
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
        }
        
        // Als de vorm is gewijzigd, vernieuw dan de verbindingen
        if (oldShape !== node.shape) {
            refreshConnections();
        }
        
        showToast('Knooppunt bijgewerkt');
    }
    
    // Sluit de modal
    nodeModal.style.display = 'none';
}

// Toon contextmenu voor knooppunten
function showContextMenu(e, node) {
    // Sla node id op in het menu
    contextMenu.dataset.nodeId = node.id;
    
    // Sluit verbindingen contextmenu als dat open is
    connectionContextMenu.style.display = 'none';
    
    // Hide floating edit button if it exists (for mobile)
    if (window.mobileTouchManager && window.mobileTouchManager.removeFloatingEditButton) {
        window.mobileTouchManager.removeFloatingEditButton();
        // Mark this node as having an active context menu
        const nodeElement = document.getElementById(node.id);
        if (nodeElement) {
            window.mobileTouchManager.activeContextMenuNode = nodeElement;
        }
    }
    
    // Stel positie in
    contextMenu.style.left = e.pageX + 'px';
    contextMenu.style.top = e.pageY + 'px';
    
    // Toon/verberg opties afhankelijk van node
    contextSetRoot.style.display = node.isRoot ? 'none' : 'block';
    
    // Toon menu
    contextMenu.style.display = 'block';
    
    // Selecteer deze node
    currentSelectedNode = node.id;
    
    // Voorkom standaard contextmenu
    e.preventDefault();
    e.stopPropagation();
}

// Stel hoofdknooppunt in
function setRootNode(nodeId) {
    // Reset alle bestaande hoofdknooppunten
    nodes.forEach(node => {
        if (node.isRoot) {
            node.isRoot = false;
            const nodeEl = document.getElementById(node.id);
            if (nodeEl) {
                nodeEl.classList.remove('root-node');
            }
        }
    });
    
    // Stel nieuwe hoofdknooppunt in
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
        node.isRoot = true;
        rootNodeId = node.id;
        
        const nodeEl = document.getElementById(node.id);
        if (nodeEl) {
            nodeEl.classList.add('root-node');
        }
        
        showToast('Nieuw hoofdknooppunt ingesteld');
    }
}

// Knooppunt verwijderen
function deleteNode(nodeId) {
    // Sla huidige staat op voor undo functionaliteit
    if (typeof saveStateForUndo === 'function') {
        saveStateForUndo();
    }
    
    // Vind de index
    const nodeIndex = nodes.findIndex(n => n.id === nodeId);
    
    if (nodeIndex !== -1) {
        // Als dit het hoofdknooppunt is en er zijn andere knooppunten,
        // vraag om bevestiging of een nieuw hoofdknooppunt moet worden aangewezen
        if (nodes[nodeIndex].isRoot && nodes.length > 1) {
            if (confirm('Wil je het hoofdknooppunt verwijderen? Dit zal de structuur van je mindmap beïnvloeden.')) {
                // Verwijder het knooppunt
                nodes.splice(nodeIndex, 1);
                
                // Verwijder het DOM element
                const nodeEl = document.getElementById(nodeId);
                if (nodeEl) {
                    nodeEl.remove();
                }
                
                // Als er nog andere knooppunten zijn, wijs een nieuwe hoofdknooppunt aan
                if (nodes.length > 0) {
                    nodes[0].isRoot = true;
                    rootNodeId = nodes[0].id;
                    
                    const newRootEl = document.getElementById(rootNodeId);
                    if (newRootEl) {
                        newRootEl.classList.add('root-node');
                    }
                } else {
                    rootNodeId = null;
                }
            } else {
                return; // Annuleer verwijderen
            }
        } else {
            // Verwijder het knooppunt
            nodes.splice(nodeIndex, 1);
            
            // Verwijder het DOM element
            const nodeEl = document.getElementById(nodeId);
            if (nodeEl) {
                nodeEl.remove();
            }
        }
        
        // Verwijder alle verbindingen met dit knooppunt
        const connectionsToRemove = connections.filter(
            conn => conn.source === nodeId || conn.target === nodeId
        );
        
        connectionsToRemove.forEach(conn => {
            deleteConnection(conn.id);
        });
        
        showToast('Knooppunt verwijderd');
        
        // Update minimap
        updateMinimap();
    }
}

// Auto-layout van nodes - VERBETERDE VERSIE
function arrangeNodes() {
    // Als er geen nodes zijn, doe niets
    if (nodes.length === 0) return;
    
    // Vind de root node
    const rootNode = nodes.find(n => n.isRoot) || nodes[0];
    
    // Start positie
    const startX = canvas.clientWidth / 2 - 60;
    const startY = canvas.clientHeight / 3;
    
    // Update positie van root node
    rootNode.x = startX;
    rootNode.y = startY;
    
    // Bouw een hiërarchische structuur op
    const nodeMap = {};
    nodes.forEach(node => {
        nodeMap[node.id] = {
            node: node,
            children: [],
            parents: [],  // Nieuw: houd ouders bij voor bidirectionele analyse
            level: node.id === rootNode.id ? 0 : -1, // -1 = nog niet toegewezen
            visited: false // Gebruikt voor cyclus-detectie
        };
    });
    
    // Verbindingen toekennen (bidirectioneel voor betere structuuranalyse)
    connections.forEach(conn => {
        // Voeg doelnode toe als kind van de bronnode
        if (nodeMap[conn.source] && nodeMap[conn.target]) {
            nodeMap[conn.source].children.push(nodeMap[conn.target]);
            // Voeg bronnode toe als ouder van de doelnode
            nodeMap[conn.target].parents.push(nodeMap[conn.source]);
        }
    });
    
    // Wijs niveaus toe (breadth-first), met cyclus detectie
    const queue = [nodeMap[rootNode.id]];
    nodeMap[rootNode.id].visited = true;
    
    while (queue.length > 0) {
        const current = queue.shift();
        
        current.children.forEach(child => {
            // Als de node al eens is bezocht, moeten we kijken of we het niveau moeten aanpassen
            if (child.visited) {
                // Voor cycli: kies het hoogste niveau om overlap te voorkomen
                if (current.level + 1 > child.level) {
                    child.level = current.level + 1;
                    // Voeg opnieuw toe aan de wachtrij om downstream levels te updaten
                    queue.push(child);
                }
            } else {
                child.level = current.level + 1;
                child.visited = true;
                queue.push(child);
            }
        });
    }
    
    // Proces nodes die nog geen niveau hebben (geen pad van root)
    // Vind een beginpunt voor onverbonden componenten
    nodes.forEach(node => {
        const mapNode = nodeMap[node.id];
        if (mapNode.level === -1) {
            // Vind het beginpunt (node zonder inkomende verbindingen of met minste inkomende)
            const component = findConnectedComponent(mapNode, nodeMap);
            assignLevelsToComponent(component, nodeMap);
        }
    });
    
    // Verzamel nodes per niveau en sorteer
    const levelMap = {};
    Object.values(nodeMap).forEach(item => {
        const level = item.level;
        if (!levelMap[level]) {
            levelMap[level] = [];
        }
        levelMap[level].push(item);
    });
    
    // Sorteer nodes binnen elk niveau op basis van hun relaties
    // Dit helpt om nodes met vergelijkbare verbindingen bij elkaar te houden
    Object.keys(levelMap).forEach(level => {
        if (level > 0) { // Skip root level
            levelMap[level].sort((a, b) => {
                // Sorteer op basis van gemeenschappelijke ouders
                const aParents = a.parents.map(p => p.node.id);
                const bParents = b.parents.map(p => p.node.id);
                
                // Tel hoeveel ouders ze delen met de eerste ouder in de lijst
                if (aParents.length > 0 && bParents.length > 0) {
                    const aFirstParent = aParents[0];
                    if (bParents.includes(aFirstParent)) {
                        return -1; // a komt voor b
                    } else if (aParents.includes(bParents[0])) {
                        return 1; // b komt voor a
                    }
                }
                
                return 0; // geen specifieke volgorde
            });
        }
    });
    
    // Positioneer nodes per niveau met verbeterde spacing
    const levelSpacing = 200; // Verticale afstand tussen niveaus
    let maxNodesInLevel = 0;
    
    // Vind het maximum aantal nodes in een niveau
    Object.values(levelMap).forEach(levelNodes => {
        maxNodesInLevel = Math.max(maxNodesInLevel, levelNodes.length);
    });
    
    // Bereken hoeveel ruimte elke node nodig heeft
    const nodeSpacing = Math.max(160, canvas.clientWidth / (maxNodesInLevel + 1));
    
    // Positioneer nodes voor elk niveau
    Object.keys(levelMap).sort((a, b) => Number(a) - Number(b)).forEach(level => {
        const levelNodes = levelMap[level];
        const levelY = startY + Number(level) * levelSpacing;
        
        // Bereken totale breedte voor dit niveau
        const totalWidth = levelNodes.length * nodeSpacing;
        const startLevelX = startX - totalWidth / 2 + nodeSpacing / 2;
        
        // Positioneer elke node op dit niveau
        levelNodes.forEach((item, i) => {
            // Gebruik intelligent positioning om overlapping te verminderen
            item.node.x = startLevelX + i * nodeSpacing;
            item.node.y = levelY;
            
            // Voeg wat willekeurigheid toe om exacte overloop te voorkomen
            item.node.y += (Math.random() - 0.5) * 20;
            
            // Update DOM element
            const nodeEl = document.getElementById(item.node.id);
            if (nodeEl) {
                nodeEl.style.left = item.node.x + 'px';
                nodeEl.style.top = item.node.y + 'px';
            }
        });
    });
    
    // Vernieuw verbindingen
    refreshConnections();
    
    // Update minimap
    updateMinimap();
    
    showToast('Nodes automatisch georganiseerd');
}

// Vind alle nodes die verbonden zijn met de gegeven node (ongeacht richting)
function findConnectedComponent(startNode, nodeMap) {
    const component = [];
    const queue = [startNode];
    const visited = new Set();
    
    while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current.node.id)) continue;
        
        visited.add(current.node.id);
        component.push(current);
        
        // Verken alle kinderen en ouders
        [...current.children, ...current.parents].forEach(neighbor => {
            if (!visited.has(neighbor.node.id)) {
                queue.push(neighbor);
            }
        });
    }
    
    return component;
}

// Wijs niveaus toe aan een component zonder verbinding met de hoofdboom
function assignLevelsToComponent(component, nodeMap) {
    // Vind een geschikt beginpunt (bijv. node met minste inkomende verbindingen)
    let startNode = component[0];
    component.forEach(node => {
        if (node.parents.length === 0 || node.parents.length < startNode.parents.length) {
            startNode = node;
        }
    });
    
    // Wijs een beginwaarde toe aan het startpunt
    // Zoek het hoogste bezette level op
    let maxLevel = 0;
    Object.values(nodeMap).forEach(item => {
        if (item.level > maxLevel) maxLevel = item.level;
    });
    
    // Begin het toewijzen van niveaus vanaf maxLevel + 1
    const baseLevel = maxLevel + 1;
    
    // Doorloop de component breadth-first vanaf startNode
    const queue = [startNode];
    startNode.level = baseLevel;
    startNode.visited = true;
    
    while (queue.length > 0) {
        const current = queue.shift();
        
        current.children.forEach(child => {
            if (child.level === -1 || child.level < current.level + 1) {
                child.level = current.level + 1;
                if (!child.visited) {
                    child.visited = true;
                    queue.push(child);
                }
            }
        });
        
        // Voor nodes die alleen via ouders verbonden zijn
        current.parents.forEach(parent => {
            if (parent.level === -1 || parent.level > current.level - 1) {
                parent.level = current.level - 1;
                if (!parent.visited) {
                    parent.visited = true;
                    queue.push(parent);
                }
            }
        });
    }
}

/**
 * Batch Text Entry - Voegt meerdere child nodes toe aan geselecteerde node
 */
function createBatchChildNodes(parentNodeId, textInput, connectSiblings = false) {
    if (!parentNodeId || !textInput) {
        showToast('Geen parent node geselecteerd of tekst ingevoerd', true);
        return;
    }
    
    // Sla staat op voor undo
    saveStateForUndo();
    
    const parentNode = nodes.find(n => n.id === parentNodeId);
    if (!parentNode) {
        showToast('Parent node niet gevonden', true);
        return;
    }
    
    // Split tekst op regels en filter lege regels
    const lines = textInput.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    if (lines.length === 0) {
        showToast('Geen geldige tekst ingevoerd', true);
        return;
    }
    
    const createdNodes = [];
    
    // SLIMME POSITIONERING: Vind optimale sector voor nieuwe nodes
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
        
        const childNode = createNode(line, '', '#4CAF50', x, y, 'rounded', parentNode);
        createdNodes.push(childNode);
        
        // Verbind child met parent
        createConnection(parentNode.id, childNode.id);
    });
    
    // Verbind siblings onderling als optie is aangevinkt
    if (connectSiblings && createdNodes.length > 1) {
        for (let i = 0; i < createdNodes.length; i++) {
            const nextIndex = (i + 1) % createdNodes.length;
            createConnection(createdNodes[i].id, createdNodes[nextIndex].id);
        }
    }
    
    showToast(`${lines.length} child nodes toegevoegd!`);
    return createdNodes;
}

// Hulpfunctie voor slimme bulk node positionering
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
 * Template Node Groups - Predefinieerde node structuren
 */
const nodeTemplates = {
    swot: {
        name: 'SWOT Analyse',
        nodes: [
            { title: 'SWOT Analyse', x: 0, y: 0, color: '#2196F3', shape: 'rounded', isCenter: true },
            { title: 'Sterke punten', x: -150, y: -100, color: '#4CAF50', shape: 'rectangle' },
            { title: 'Zwakke punten', x: 150, y: -100, color: '#F44336', shape: 'rectangle' },
            { title: 'Kansen', x: -150, y: 100, color: '#FF9800', shape: 'rectangle' },
            { title: 'Bedreigingen', x: 150, y: 100, color: '#9C27B0', shape: 'rectangle' }
        ],
        connections: [
            [0, 1], [0, 2], [0, 3], [0, 4]
        ]
    },
    
    meeting: {
        name: 'Meeting Agenda',
        nodes: [
            { title: 'Meeting Agenda', x: 0, y: 0, color: '#2196F3', shape: 'rounded', isCenter: true },
            { title: 'Agenda punten', x: -120, y: -80, color: '#4CAF50', shape: 'rectangle' },
            { title: 'Actiepunten', x: 120, y: -80, color: '#FF9800', shape: 'rectangle' },
            { title: 'Deelnemers', x: -120, y: 80, color: '#9C27B0', shape: 'rectangle' },
            { title: 'Follow-up', x: 120, y: 80, color: '#607D8B', shape: 'rectangle' }
        ],
        connections: [
            [0, 1], [0, 2], [0, 3], [0, 4]
        ]
    },
    
    project: {
        name: 'Project Planning',
        nodes: [
            { title: 'Project', x: 0, y: 0, color: '#2196F3', shape: 'rounded', isCenter: true },
            { title: 'Planning', x: -150, y: -100, color: '#4CAF50', shape: 'rectangle' },
            { title: 'Resources', x: 150, y: -100, color: '#FF9800', shape: 'rectangle' },
            { title: 'Risicos', x: -150, y: 100, color: '#F44336', shape: 'rectangle' },
            { title: 'Milestones', x: 150, y: 100, color: '#9C27B0', shape: 'rectangle' }
        ],
        connections: [
            [0, 1], [0, 2], [0, 3], [0, 4]
        ]
    },
    
    decision: {
        name: 'Beslisboom',
        nodes: [
            { title: 'Beslissing', x: 0, y: 0, color: '#2196F3', shape: 'diamond', isCenter: true },
            { title: 'Optie A', x: -120, y: 100, color: '#4CAF50', shape: 'rectangle' },
            { title: 'Optie B', x: 120, y: 100, color: '#FF9800', shape: 'rectangle' },
            { title: 'Gevolgen A', x: -120, y: 200, color: '#8BC34A', shape: 'circle' },
            { title: 'Gevolgen B', x: 120, y: 200, color: '#FFC107', shape: 'circle' }
        ],
        connections: [
            [0, 1], [0, 2], [1, 3], [2, 4]
        ]
    },
    
    brainstorm: {
        name: 'Brainstorm Sessie',
        nodes: [
            { title: 'Brainstorm Topic', x: 0, y: 0, color: '#2196F3', shape: 'rounded', isCenter: true },
            { title: 'Idee 1', x: -100, y: -120, color: '#4CAF50', shape: 'circle' },
            { title: 'Idee 2', x: 100, y: -120, color: '#FF9800', shape: 'circle' },
            { title: 'Idee 3', x: -100, y: 120, color: '#9C27B0', shape: 'circle' },
            { title: 'Idee 4', x: 100, y: 120, color: '#F44336', shape: 'circle' }
        ],
        connections: [
            [0, 1], [0, 2], [0, 3], [0, 4]
        ]
    },
    
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

function createTemplateNodeGroup(templateKey, centerX = 400, centerY = 300) {
    const template = nodeTemplates[templateKey];
    if (!template) {
        showToast('Template niet gevonden', true);
        return;
    }
    
    // Sla staat op voor undo
    saveStateForUndo();
    
    const createdNodes = [];
    
    // Maak alle nodes
    template.nodes.forEach((nodeTemplate, index) => {
        const x = centerX + nodeTemplate.x;
        const y = centerY + nodeTemplate.y;
        
        const node = createNode(
            nodeTemplate.title,
            '',
            nodeTemplate.color,
            x,
            y,
            nodeTemplate.shape || 'rectangle',
            null,
            nodeTemplate.isCenter || false
        );
        
        createdNodes.push(node);
    });
    
    // Maak alle verbindingen
    template.connections.forEach(([fromIndex, toIndex]) => {
        if (createdNodes[fromIndex] && createdNodes[toIndex]) {
            createConnection(createdNodes[fromIndex].id, createdNodes[toIndex].id);
        }
    });
    
    showToast(`${template.name} template toegevoegd!`);
    return createdNodes;
}

// ==========================
// NODE DISCONNECTION FUNCTIONALITY
// ==========================

/**
 * IMPROVED: Visual disconnect mode - shows connection preview when hovering over nodes
 * @param {string} nodeId - The ID of the node to start disconnect mode for
 */
function startDisconnectMode(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
        showToast('Knooppunt niet gevonden', true);
        return;
    }
    
    // Vind alle verbindingen
    const incomingConnections = connections.filter(conn => conn.target === nodeId);
    const outgoingConnections = connections.filter(conn => conn.source === nodeId);
    
    if (incomingConnections.length === 0 && outgoingConnections.length === 0) {
        showToast('Knooppunt heeft geen verbindingen om te ontkoppelen', true);
        return;
    }
    
    // Enter disconnect mode
    window.disconnectMode = {
        nodeId: nodeId,
        connections: [...incomingConnections, ...outgoingConnections],
        previewConnections: [],
        active: true
    };
    
    // Visual feedback
    const nodeEl = document.getElementById(nodeId);
    if (nodeEl) {
        nodeEl.classList.add('disconnect-mode');
    }
    
    // Highlight all connections of this node
    [...incomingConnections, ...outgoingConnections].forEach(conn => {
        const connEl = document.getElementById(conn.id);
        if (connEl) {
            connEl.classList.add('disconnect-highlight');
        }
    });
    
    // Show instruction tooltip
    showDisconnectTooltip(nodeEl, 'Klik op een verbinding om deze te verwijderen, of sleep naar een ander knooppunt om te herverbinden');
    
    // Add escape handler
    document.addEventListener('keydown', handleDisconnectEscape);
    
    // Add outside click handler to cancel disconnect mode
    document.addEventListener('click', handleDisconnectOutsideClick);
    
    // Add connection click handlers
    [...incomingConnections, ...outgoingConnections].forEach(conn => {
        const connEl = document.getElementById(conn.id);
        if (connEl) {
            connEl.addEventListener('click', handleConnectionDisconnect);
        }
    });
}

/**
 * Handle clicking on a connection during disconnect mode
 */
function handleConnectionDisconnect(e) {
    if (!window.disconnectMode || !window.disconnectMode.active) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const connectionId = e.currentTarget.id;
    const connection = connections.find(conn => conn.id === connectionId);
    
    if (!connection) return;
    
    // Save state for undo
    if (typeof saveStateForUndo === 'function') {
        saveStateForUndo();
    }
    
    // Show reconnection options
    showReconnectionOptions(connection, e.clientX, e.clientY);
}

/**
 * Show reconnection options when disconnecting a connection
 */
function showReconnectionOptions(connection, x, y) {
    const modal = document.createElement('div');
    modal.className = 'reconnect-options-modal';
    modal.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        background: #2d2d2d;
        border: 1px solid #444;
        border-radius: 8px;
        padding: 12px;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        min-width: 200px;
    `;
    
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    
    modal.innerHTML = `
        <div style="color: #e0e0e0; font-size: 14px; margin-bottom: 8px;">Verbinding verwijderen:</div>
        <div style="color: #999; font-size: 12px; margin-bottom: 12px;">${sourceNode?.title || 'Node'} → ${targetNode?.title || 'Node'}</div>
        <button class="reconnect-btn" data-action="disconnect-only" style="
            display: block;
            width: 100%;
            padding: 8px;
            margin-bottom: 6px;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        ">Gewoon verwijderen</button>
        <button class="reconnect-btn" data-action="disconnect-reconnect" style="
            display: block;
            width: 100%;
            padding: 8px;
            margin-bottom: 6px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        ">Verwijderen en andere verbindingen aanpassen</button>
        <button class="reconnect-btn" data-action="cancel" style="
            display: block;
            width: 100%;
            padding: 8px;
            background: #666;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        ">Annuleren</button>
    `;
    
    document.body.appendChild(modal);
    
    // Handle button clicks
    modal.querySelectorAll('.reconnect-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            
            if (action === 'disconnect-only') {
                deleteConnection(connection.id);
                showToast('Verbinding verwijderd');
            } else if (action === 'disconnect-reconnect') {
                handleSmartDisconnect(connection);
            }
            
            modal.remove();
            exitDisconnectMode();
        });
    });
    
    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', function closeModal(e) {
            if (!modal.contains(e.target)) {
                modal.remove();
                exitDisconnectMode();
                document.removeEventListener('click', closeModal);
            }
        });
    }, 100);
}

/**
 * Handle smart disconnect - removes connection and intelligently reconnects
 */
function handleSmartDisconnect(connection) {
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) return;
    
    // Find other connections that might need to be reconnected
    const sourceOtherConnections = connections.filter(conn => 
        conn.id !== connection.id && (conn.source === connection.source || conn.target === connection.source)
    );
    const targetOtherConnections = connections.filter(conn => 
        conn.id !== connection.id && (conn.source === connection.target || conn.target === connection.target)
    );
    
    // Delete the connection
    deleteConnection(connection.id);
    
    // Show preview of what will happen
    let message = `Verbinding ${sourceNode.title} → ${targetNode.title} verwijderd`;
    
    // If both nodes have other connections, suggest reconnecting
    if (sourceOtherConnections.length > 0 && targetOtherConnections.length > 0) {
        message += '. Andere verbindingen blijven intact.';
    }
    
    showToast(message);
    
    // Refresh connections
    if (typeof refreshConnections === 'function') {
        refreshConnections();
    }
    
    // Update minimap
    if (typeof updateMinimap === 'function') {
        updateMinimap();
    }
}

/**
 * Exit disconnect mode
 */
function exitDisconnectMode() {
    if (!window.disconnectMode) return;
    
    // Remove visual feedback
    const nodeEl = document.getElementById(window.disconnectMode.nodeId);
    if (nodeEl) {
        nodeEl.classList.remove('disconnect-mode');
    }
    
    // Remove connection highlights
    document.querySelectorAll('.connection').forEach(connEl => {
        connEl.classList.remove('disconnect-highlight');
        connEl.removeEventListener('click', handleConnectionDisconnect);
    });
    
    // Remove tooltip
    hideDisconnectTooltip();
    
    // Remove event listeners
    document.removeEventListener('keydown', handleDisconnectEscape);
    document.removeEventListener('click', handleDisconnectOutsideClick);
    
    // Clear mode
    window.disconnectMode = null;
}

/**
 * Handle escape key during disconnect mode
 */
function handleDisconnectEscape(e) {
    if (e.key === 'Escape' && window.disconnectMode) {
        exitDisconnectMode();
        showToast('Ontkoppelen geannuleerd');
    }
}

/**
 * Handle clicks outside disconnect mode to cancel it
 */
function handleDisconnectOutsideClick(e) {
    if (!window.disconnectMode) return;
    
    // Check if click is on a connection in disconnect mode
    const connectionElement = e.target.closest('.connection');
    if (connectionElement && connectionElement.classList.contains('disconnect-highlight')) {
        return; // Let the connection click handler handle this
    }
    
    // Check if click is on the disconnect mode node
    const nodeElement = e.target.closest('.node');
    if (nodeElement && nodeElement.id === window.disconnectMode.nodeId) {
        return; // Allow interaction with the disconnect mode node
    }
    
    // Check if click is on the modal
    if (e.target.closest('.reconnect-options-modal')) {
        return; // Allow interaction with the modal
    }
    
    // Exit disconnect mode for any other clicks
    exitDisconnectMode();
}

/**
 * Show tooltip for disconnect mode
 */
function showDisconnectTooltip(nodeEl, message) {
    hideDisconnectTooltip(); // Remove any existing tooltip
    
    const tooltip = document.createElement('div');
    tooltip.id = 'disconnect-tooltip';
    tooltip.style.cssText = `
        position: absolute;
        background: #333;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        max-width: 200px;
        z-index: 10001;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        border: 1px solid #555;
    `;
    tooltip.textContent = message;
    
    // Position tooltip above the node
    const rect = nodeEl.getBoundingClientRect();
    tooltip.style.left = (rect.left + rect.width / 2) + 'px';
    tooltip.style.top = (rect.top - 50) + 'px';
    tooltip.style.transform = 'translateX(-50%)';
    
    document.body.appendChild(tooltip);
}

/**
 * Hide disconnect tooltip
 */
function hideDisconnectTooltip() {
    const tooltip = document.getElementById('disconnect-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

/**
 * LEGACY: Keep for backward compatibility
 * @param {string} nodeId - The ID of the node to disconnect
 * @param {boolean} reconnectRemaining - Whether to reconnect the remaining nodes (default: true)
 */
function disconnectNode(nodeId, reconnectRemaining = true) {
    // Use the new visual disconnect mode instead
    startDisconnectMode(nodeId);
}

/**
 * Insert a node into an existing connection
 * @param {string} connectionId - The ID of the connection to insert into
 * @param {number} x - X coordinate for the new node
 * @param {number} y - Y coordinate for the new node
 * @param {string} title - Title for the new node (optional)
 * @param {string} color - Color for the new node (optional)
 * @param {string} shape - Shape for the new node (optional)
 */
function insertNodeIntoConnection(connectionId, x, y, title = 'Nieuw knooppunt', color = '#4CAF50', shape = 'rounded') {
    const connection = connections.find(conn => conn.id === connectionId);
    if (!connection) {
        showToast('Verbinding niet gevonden', true);
        return null;
    }
    
    // Sla huidige staat op voor undo functionaliteit
    if (typeof saveStateForUndo === 'function') {
        saveStateForUndo();
    }
    
    // Maak een nieuwe node
    const newNode = createNode(title, '', color, x, y, shape, null, false);
    
    if (!newNode) {
        showToast('Kon knooppunt niet maken', true);
        return null;
    }
    
    // Bewaar originele verbinding info
    const originalSource = connection.source;
    const originalTarget = connection.target;
    const originalLabel = connection.label;
    const originalStyleClass = connection.styleClass;
    
    // Verwijder de originele verbinding
    deleteConnection(connectionId);
    
    // Maak nieuwe verbindingen: source -> newNode -> target
    const conn1 = createConnection(originalSource, newNode.id);
    const conn2 = createConnection(newNode.id, originalTarget);
    
    // Kopieer originele eigenschappen naar beide nieuwe verbindingen
    if (conn1) {
        conn1.label = originalLabel;
        conn1.styleClass = originalStyleClass;
    }
    if (conn2) {
        conn2.label = originalLabel;
        conn2.styleClass = originalStyleClass;
    }
    
    // Vernieuw verbindingen
    if (typeof refreshConnections === 'function') {
        refreshConnections();
    }
    
    // Update minimap
    if (typeof updateMinimap === 'function') {
        updateMinimap();
    }
    
    // Selecteer de nieuwe node
    currentSelectedNode = newNode.id;
    
    showToast('Knooppunt ingevoegd in verbinding');
    return newNode;
}

/**
 * IMPROVED: Check if a node can be dropped into a connection with better validation
 * @param {string} nodeId - The ID of the node to check
 * @param {string} connectionId - The ID of the connection to check
 * @returns {boolean} True if the node can be dropped into the connection
 */
function canDropNodeIntoConnection(nodeId, connectionId) {
    const node = nodes.find(n => n.id === nodeId);
    const connection = connections.find(conn => conn.id === connectionId);
    
    if (!node || !connection) {
        return false;
    }
    
    // Kan niet droppen als de node al deel uitmaakt van deze verbinding
    if (connection.source === nodeId || connection.target === nodeId) {
        return false;
    }
    
    // Kan niet droppen als dit een circulaire verbinding zou creëren
    if (wouldCreateCircularConnection(nodeId, connection)) {
        return false;
    }
    
    // Extra check: don't allow dropping into branch connections
    if (connection.isYBranch || connection.isTrueBranch) {
        return false;
    }
    
    return true;
}

/**
 * Check if dropping a node into a connection would create a circular reference
 * @param {string} nodeId - The ID of the node to check
 * @param {object} connection - The connection object
 * @returns {boolean} True if it would create a circular reference
 */
function wouldCreateCircularConnection(nodeId, connection) {
    // Implementeer een eenvoudige cyclus-detectie
    const visited = new Set();
    const stack = [connection.source];
    
    while (stack.length > 0) {
        const current = stack.pop();
        
        if (current === nodeId) {
            return true; // Cyclus gevonden
        }
        
        if (!visited.has(current)) {
            visited.add(current);
            
            // Voeg alle ouders toe aan de stack
            const parentConnections = connections.filter(conn => conn.target === current);
            parentConnections.forEach(conn => {
                if (!visited.has(conn.source)) {
                    stack.push(conn.source);
                }
            });
        }
    }
    
    return false;
}

/**
 * Handle dropping a node into a connection
 * @param {string} nodeId - The ID of the node being dropped
 * @param {string} connectionId - The ID of the connection to drop into
 * @param {number} x - X coordinate of the drop position
 * @param {number} y - Y coordinate of the drop position
 */
function dropNodeIntoConnection(nodeId, connectionId, x, y) {
    if (!canDropNodeIntoConnection(nodeId, connectionId)) {
        showToast('Kan knooppunt niet in deze verbinding plaatsen', true);
        return;
    }
    
    const node = nodes.find(n => n.id === nodeId);
    const connection = connections.find(conn => conn.id === connectionId);
    
    if (!node || !connection) {
        showToast('Knooppunt of verbinding niet gevonden', true);
        return;
    }
    
    // Sla huidige staat op voor undo functionaliteit
    if (typeof saveStateForUndo === 'function') {
        saveStateForUndo();
    }
    
    // Verplaats het knooppunt naar de drop positie (exact waar gedropt)
    // Get actual node dimensions from DOM element
    const nodeEl = document.getElementById(nodeId);
    let nodeWidth = 120; // Default width
    let nodeHeight = 60; // Default height
    
    if (nodeEl) {
        const rect = nodeEl.getBoundingClientRect();
        nodeWidth = rect.width / zoomLevel;
        nodeHeight = rect.height / zoomLevel;
    }
    
    // Center the node on the drop position (subtract half width/height)
    node.x = x - (nodeWidth / 2);
    node.y = y - (nodeHeight / 2);
    
    // Update DOM positie
    if (nodeEl) {
        nodeEl.style.left = node.x + 'px';
        nodeEl.style.top = node.y + 'px';
    }
    
    // Bewaar originele verbinding info
    const originalSource = connection.source;
    const originalTarget = connection.target;
    const originalLabel = connection.label;
    const originalStyleClass = connection.styleClass;
    
    // Verwijder alle bestaande verbindingen van dit knooppunt
    const nodeConnections = connections.filter(conn => 
        conn.source === nodeId || conn.target === nodeId
    );
    nodeConnections.forEach(conn => {
        deleteConnection(conn.id);
    });
    
    // Verwijder de originele verbinding
    deleteConnection(connectionId);
    
    // Maak nieuwe verbindingen: source -> node -> target
    const conn1 = createConnection(originalSource, nodeId);
    const conn2 = createConnection(nodeId, originalTarget);
    
    // Kopieer originele eigenschappen naar beide nieuwe verbindingen
    if (conn1) {
        conn1.label = originalLabel;
        conn1.styleClass = originalStyleClass;
    }
    if (conn2) {
        conn2.label = originalLabel;
        conn2.styleClass = originalStyleClass;
    }
    
    // Force refresh van alle verbindingen om er zeker van te zijn dat ze correct getekend worden
    if (typeof resetConnectionCache === 'function') {
        resetConnectionCache(); // Reset cache voor alle nodes
    }
    
    // Update related connections voor alle betrokken nodes
    if (typeof updateRelatedConnections === 'function') {
        updateRelatedConnections(nodeId, false); // false = final update
        updateRelatedConnections(originalSource, false);
        updateRelatedConnections(originalTarget, false);
    }
    
    // Vernieuw verbindingen
    if (typeof refreshConnections === 'function') {
        refreshConnections();
    }
    
    // Update minimap
    if (typeof updateMinimap === 'function') {
        updateMinimap();
    }
    
    // Selecteer het knooppunt
    currentSelectedNode = nodeId;
    
    showToast('Knooppunt ingevoegd in verbinding');
}

// Helper function to find non-overlapping position for new node
function findNonOverlappingPosition(baseX, baseY, nodeWidth = 150, nodeHeight = 60, maxAttempts = 8) {
    const minDistance = Math.max(nodeWidth, nodeHeight) + 20; // Add some padding
    
    // Check if position overlaps with any existing node
    function hasOverlap(x, y) {
        return nodes.some(node => {
            const dx = Math.abs(node.x - x);
            const dy = Math.abs(node.y - y);
            return dx < minDistance && dy < minDistance;
        });
    }
    
    // If base position is free, use it
    if (!hasOverlap(baseX, baseY)) {
        return { x: baseX, y: baseY };
    }
    
    // Try positions in a spiral pattern
    const spiralOffsets = [
        { x: minDistance, y: 0 },      // Right
        { x: 0, y: minDistance },      // Down
        { x: -minDistance, y: 0 },     // Left
        { x: 0, y: -minDistance },     // Up
        { x: minDistance, y: minDistance },   // Down-right
        { x: -minDistance, y: minDistance },  // Down-left
        { x: -minDistance, y: -minDistance }, // Up-left
        { x: minDistance, y: -minDistance }   // Up-right
    ];
    
    // Try each offset
    for (let i = 0; i < Math.min(spiralOffsets.length, maxAttempts); i++) {
        const testX = baseX + spiralOffsets[i].x;
        const testY = baseY + spiralOffsets[i].y;
        
        if (!hasOverlap(testX, testY)) {
            return { x: testX, y: testY };
        }
    }
    
    // If all positions are taken, offset by a larger amount
    const angle = Math.random() * Math.PI * 2;
    const distance = minDistance * 2;
    return {
        x: baseX + Math.cos(angle) * distance,
        y: baseY + Math.sin(angle) * distance
    };
}

// Color selection functionality
function updateColorSelection(selectedColor) {
    const colorOptions = document.querySelectorAll('.color-option');
    const customColorInput = document.getElementById('node-color');
    
    // Clear previous selections
    colorOptions.forEach(option => option.classList.remove('selected'));
    
    // Check if selected color matches any standard color
    let foundMatch = false;
    colorOptions.forEach(option => {
        if (option.dataset.color === selectedColor) {
            option.classList.add('selected');
            foundMatch = true;
        }
    });
    
    // Update custom color input
    customColorInput.value = selectedColor;
}

function setupColorSelection() {
    const colorOptions = document.querySelectorAll('.color-option');
    const customColorInput = document.getElementById('node-color');
    
    // Add click handlers for standard color options
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            const selectedColor = this.dataset.color;
            
            // Update visual selection
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            
            // Update the custom color input
            customColorInput.value = selectedColor;
        });
    });
    
    // Add change handler for custom color input
    customColorInput.addEventListener('change', function() {
        // Clear standard color selections when custom color is used
        colorOptions.forEach(option => option.classList.remove('selected'));
    });
}