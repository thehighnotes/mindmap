/**
 * nodes.js - Bevat functies voor het beheren van knooppunten in de mindmap
 */

// Nieuw knooppunt maken
function createNode(title, content, color, x, y, shape = 'rectangle', parentNode = null, isRoot = false) {
    // Sla huidige staat op voor undo functionaliteit
    if (typeof saveStateForUndo === 'function') {
        saveStateForUndo();
    }
    
    const nodeId = 'node-' + nextNodeId++;
    
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
            nodeEl.style.width = '100px';
            nodeEl.style.height = '100px';
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
            <div class="node-title" style="transform: rotate(-45deg);">${newNode.title}</div>
            ${newNode.content ? `<div class="node-content" style="transform: rotate(-45deg);">${newNode.content}</div>` : ''}
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
    
    // Voeg event listeners toe
    nodeEl.addEventListener('mousedown', function(e) {
        if (e.button === 0) { // Alleen linkermuisknop
            handleNodeMouseDown(e, newNode);
        }
    });
    
    nodeEl.addEventListener('dblclick', function(e) {
        // Als de klik in de titel was, maak direct bewerkbaar
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
    if (parentNode) {
        createConnection(parentNode, newNode.id);
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
    element.focus();
    
    // Selecteer alle tekst
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Event handlers
    const saveEdit = function() {
        const newText = element.innerText.trim();
        // Alleen opslaan als er tekst is
        if (newText) {
            // Controleer of er iets is gewijzigd
            if (originalTitle !== newText) {
                node.title = newText;
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
    
    // Event handlers voor opslaan bij blur of enter
    element.addEventListener('blur', saveEdit, { once: true });
    element.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            element.blur(); // Dit triggert de blur event handler
        } else if (e.key === 'Escape') {
            element.innerText = node.title;
            element.contentEditable = false;
        }
    });
    
    // Voorkom interferentie met drag evenementen
    element.addEventListener('mousedown', function(e) {
        // Wanneer in edit mode, laat de mousedown event niet doorgaan naar de parent node
        // zodat we niet onbedoeld het drag mechanisme activeren
        if (element.contentEditable === 'true') {
            e.stopPropagation();
        }
    });
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
        deselectAll();
    }
    currentSelectedNode = node.id;
    updateSelectionStatus();
    
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
                    nodeEl.style.width = '100px';
                    nodeEl.style.height = '100px';
                    break;
                default: // rectangle
                    nodeEl.style.borderRadius = '3px';
                    break;
            }
            
            // Update inhoud
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
<<<<<<< HEAD
function createBatchChildNodes(parentNodeId, textInput, connectSiblings = false) {
=======
function createBatchChildNodes(parentNodeId, textInput) {
>>>>>>> 9a8c686 (Add test HTML for Ghost Connection bug fix with detailed steps and console commands)
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
    const angleStep = (2 * Math.PI) / lines.length;
    const radius = 120;
    
    // Maak child nodes in cirkel rond parent
    lines.forEach((line, index) => {
        const angle = index * angleStep;
        const x = parentNode.x + Math.cos(angle) * radius;
        const y = parentNode.y + Math.sin(angle) * radius;
        
        const childNode = createNode(line, '', '#4CAF50', x, y, 'rounded', parentNode);
        createdNodes.push(childNode);
        
        // Verbind child met parent
        createConnection(parentNode.id, childNode.id);
    });
    
<<<<<<< HEAD
    // Verbind siblings onderling als optie is aangevinkt
    if (connectSiblings && createdNodes.length > 1) {
        for (let i = 0; i < createdNodes.length; i++) {
            const nextIndex = (i + 1) % createdNodes.length;
            createConnection(createdNodes[i].id, createdNodes[nextIndex].id);
        }
    }
    
=======
>>>>>>> 9a8c686 (Add test HTML for Ghost Connection bug fix with detailed steps and console commands)
    showToast(`${lines.length} child nodes toegevoegd!`);
    return createdNodes;
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