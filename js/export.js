/**
 * export.js - Bevat functies voor exporteren en importeren
 */

// Exporteer naar Mermaid syntax
function exportToMermaid() {
    // Als er geen knooppunten zijn, toon een waarschuwing
    if (nodes.length === 0) {
        showToast('Geen knooppunten om te exporteren', true);
        return;
    }
    
    // Begin met flowchart syntax (in plaats van mindmap)
    let mermaidCode = 'flowchart TD\n';
    
    // Wijs alfabetische ID's toe aan knooppunten
    const nodeMap = {};
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    // Functie voor het genereren van ID's (A, B, C, ... AA, AB, ...)
    function generateId(index) {
        if (index < 26) {
            return alphabet[index];
        } else {
            return generateId(Math.floor(index / 26) - 1) + alphabet[index % 26];
        }
    }
    
    // Wijs ID's toe aan alle knooppunten
    nodes.forEach((node, index) => {
        const id = generateId(index);
        nodeMap[node.id] = {
            mermaidId: id,
            node: node
        };
    });
    
    // Genereer knooppunten
    Object.values(nodeMap).forEach(item => {
        const { mermaidId, node } = item;
        // Escape speciale tekens in de titel
        const safeTitle = node.title.replace(/[()[\]{}]/g, "\\$&");
        
        // Voeg de node toe
        let shapeStart = '';
        let shapeEnd = '';
        
        // Kies vorm op basis van node.shape
        switch(node.shape) {
            case 'rounded':
                shapeStart = '(';
                shapeEnd = ')';
                break;
            case 'circle':
                shapeStart = '((';
                shapeEnd = '))';
                break;
            case 'diamond':
                shapeStart = '{';
                shapeEnd = '}';
                break;
            default: // rectangle
                shapeStart = '[';
                shapeEnd = ']';
                break;
        }
        
        // Genereer node definitie
        mermaidCode += `    ${mermaidId}${shapeStart}${safeTitle}${shapeEnd}\n`;
        
        // Voeg kleurstijl toe indien anders dan standaard
        if (node.color && node.color !== '#4CAF50') {
            // Verwerk kleur naar Mermaid-formaat
            const colorStyle = node.color.toLowerCase();
            mermaidCode += `    style ${mermaidId} fill:#${colorStyle.replace('#', '')}\n`;
        }
    });
    
    // Voeg lege regel toe voor betere leesbaarheid
    mermaidCode += '\n';
    
    // Genereer verbindingen
    connections.forEach(conn => {
        const sourceId = nodeMap[conn.source]?.mermaidId;
        const targetId = nodeMap[conn.target]?.mermaidId;
        
        if (sourceId && targetId) {
            // Bepaal lijnstijl
            let lineStyle = '-->';
            if (conn.styleClass && conn.styleClass.includes('dashed')) {
                lineStyle = '-.->';
            }
            
            // Voeg eventueel een label toe
            let label = '';
            if (conn.label) {
                label = `|${conn.label}|`;
            }
            
            // Bepaal lijnkleur op basis van type
            let lineColor = '';
            if (conn.styleClass && conn.styleClass.includes('primary')) {
                lineColor = ',#4CAF50'; // Groen
            } else if (conn.styleClass && conn.styleClass.includes('secondary')) {
                lineColor = ',#FFC107'; // Geel/amber
            }
            
            // Maak de verbinding
            mermaidCode += `    ${sourceId} ${lineStyle}${label} ${targetId}${lineColor}\n`;
        }
    });
    
    // Stel de code in in het exportveld
    exportContent.value = mermaidCode;
    
    // Toon export modal
    exportModal.style.display = 'flex';
}

// Importeer van Mermaid syntax
function importFromMermaid() {
    // Haal de code op
    const mermaidCode = importContent.value.trim();
    
    if (!mermaidCode) {
        showToast('Geen Mermaid code ingevoerd', true);
        return;
    }
    
    // Controleer of het een flowchart of mindmap is
    if (!mermaidCode.startsWith('flowchart') && !mermaidCode.startsWith('graph') && !mermaidCode.startsWith('mindmap')) {
        showToast('Geen geldige Mermaid flowchart of mindmap code', true);
        return;
    }
    
    // Verwijder alle bestaande knooppunten en verbindingen
    if (confirm('Dit zal de huidige mindmap wissen. Doorgaan?')) {
        clearMindmap();
    } else {
        return;
    }
    
    // Parse de mermaid code
    const lines = mermaidCode.split('\n');
    
    // Sla de eerste regel over (diagram type declaratie)
    lines.shift();
    
    // Map om nodeIds bij te houden
    const mermaidNodeMap = {};
    
    // Eerste pas: verzamel alle nodes
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Als de lijn een verbinding bevat (-->), sla deze over voor nu
        if (line.includes('-->') || line.includes('==>') || line.includes('-.->')
            || line.includes('->>') || line.includes('--') || line.includes('--x')) {
            continue;
        }
        
        // Als het een style regel is, sla deze ook over voor nu
        if (line.startsWith('style ') || line.startsWith('classDef ') || line.startsWith('class ')) {
            continue;
        }
        
        // Probeer een node definitie te herkennen: ID[Titel] of ID(Titel) etc.
        const nodeMatch = line.match(/^\s*([A-Za-z0-9_-]+)(\[|\(|\{\{|\{\(|\[\(|\(\(|\{)([^})\]]*)(\]|\)|\}\}|\)\}|\)\]|\)\)|})$/);
        
        if (nodeMatch) {
            const mermaidId = nodeMatch[1];
            const shapeStart = nodeMatch[2];
            const title = nodeMatch[3].trim();
            
            // Bepaal de vorm op basis van de gebruikte symbolen
            let shape = 'rectangle';
            if (shapeStart === '(') {
                shape = 'rounded';
            } else if (shapeStart === '((') {
                shape = 'circle';
            } else if (shapeStart === '{') {
                shape = 'diamond';
            }
            
            // Bereken een willekeurige positie
            const x = 100 + Math.random() * 500;
            const y = 100 + Math.random() * 300;
            
            // Maak het knooppunt
            const node = createNode(title, '', '#4CAF50', x, y, shape, null, Object.keys(mermaidNodeMap).length === 0);
            
            // Houd de mapping bij
            mermaidNodeMap[mermaidId] = node.id;
        }
    }
    
    // Tweede pas: zoek naar stijlen
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || !line.startsWith('style ')) continue;
        
        // Parse style: style A fill:#f9f,stroke:#333,stroke-width:4px
        const styleMatch = line.match(/style\s+([A-Za-z0-9_-]+)\s+([^,]*)/);
        if (styleMatch) {
            const mermaidId = styleMatch[1];
            const styleStr = styleMatch[2];
            
            // Als de node bestaat in onze map, update de kleur
            const nodeId = mermaidNodeMap[mermaidId];
            if (nodeId) {
                const node = nodes.find(n => n.id === nodeId);
                if (node) {
                    // Zoek naar fill:#color
                    const fillMatch = styleStr.match(/fill:([^,;]+)/);
                    if (fillMatch) {
                        let color = fillMatch[1].trim();
                        // Voeg # toe als het ontbreekt
                        if (!color.startsWith('#')) {
                            color = '#' + color;
                        }
                        node.color = color;
                        
                        // Update DOM
                        const nodeEl = document.getElementById(node.id);
                        if (nodeEl) {
                            nodeEl.style.borderColor = color;
                        }
                    }
                }
            }
        }
    }
    
    // Derde pas: maak verbindingen
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Zoek naar verbindingen: A --> B of A -- "text" --> B
        const connMatch = line.match(/([A-Za-z0-9_-]+)(?:\s*--(?:-|>|\.-|\.>|\|(?:[^|]*)\|))\s*([A-Za-z0-9_-]+)/);
        
        if (connMatch) {
            const sourceMermaidId = connMatch[1];
            const targetMermaidId = connMatch[2];
            
            // Controleer of beide nodes bestaan
            const sourceId = mermaidNodeMap[sourceMermaidId];
            const targetId = mermaidNodeMap[targetMermaidId];
            
            if (sourceId && targetId) {
                // Maak verbinding
                const conn = createConnection(sourceId, targetId);
                
                // Zoek naar label: A -- "text" --> B
                const labelMatch = line.match(/--\|([^|]*)\|->/);
                if (labelMatch && conn) {
                    conn.label = labelMatch[1].trim();
                    refreshConnections();
                }
                
                // Zoek naar lijnstijl: A -.-> B
                if (line.includes('-.->') && conn) {
                    conn.styleClass += ' dashed';
                    refreshConnections();
                }
                
                // Zoek naar kleur: A --> B,#color
                const colorMatch = line.match(/-->[^,]*,([^,\s]+)/);
                if (colorMatch && conn) {
                    const color = colorMatch[1].trim();
                    if (color === '#4CAF50' || color === 'green') {
                        conn.styleClass += ' primary';
                    } else if (color === '#FFC107' || color === 'yellow') {
                        conn.styleClass += ' secondary';
                    }
                    refreshConnections();
                }
            }
        }
    }
    
    // Centreer de mindmap en update de UI
    centerOnNode(rootNodeId || nodes[0]?.id);
    updateMinimap();
    
    // Sluit de modal
    importModal.style.display = 'none';
    
    showToast('Mermaid diagram geïmporteerd');
}

// Exporteer als JSON
function exportToJson() {
    const data = {
        nodes: nodes,
        connections: connections,
        nextNodeId: nextNodeId,
        rootNodeId: rootNodeId
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mindmap.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Mindmap opgeslagen');
}

// Importeer van JSON
function importFromJson(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Verwijder huidige mindmap
            clearMindmap();
            
            // Maak de container voor verbindingen opnieuw aan
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
            
            // Laad de gegevens
            nextNodeId = data.nextNodeId || 1;
            rootNodeId = data.rootNodeId || null;
            
            // Maak eerst alle knooppunten
            data.nodes.forEach(node => {
                const nodeEl = document.createElement('div');
                nodeEl.id = node.id;
                nodeEl.className = 'node';
                if (node.isRoot) nodeEl.classList.add('root-node');
                nodeEl.style.left = node.x + 'px';
                nodeEl.style.top = node.y + 'px';
                nodeEl.style.borderColor = node.color;
                
                // Pas stijl aan op basis van vorm
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
                
                // Maak de inhoud
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
                
                // Voeg plusjes toe
                const addButtons = `
                    <div class="add-node-btn top" title="Knooppunt boven toevoegen">+</div>
                    <div class="add-node-btn right" title="Knooppunt rechts toevoegen">+</div>
                    <div class="add-node-btn bottom" title="Knooppunt onder toevoegen">+</div>
                    <div class="add-node-btn left" title="Knooppunt links toevoegen">+</div>
                `;
                nodeEl.innerHTML = innerContent + addButtons;
                
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
                
                // Event listeners voor de plusjes
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
                
                // Voeg toe aan het canvas
                canvas.appendChild(nodeEl);
                
                // Voeg toe aan de nodes array
                nodes.push(node);
            });
            
            // Maak alle verbindingen
            data.connections.forEach(conn => {
                connections.push(conn);
                drawConnection(conn);
            });
            
            // Centreer op hoofdknooppunt
            if (rootNodeId) {
                centerOnNode(rootNodeId);
            }
            
            // Update minimap
            updateMinimap();
            
            showToast('Mindmap geladen');
        } catch (error) {
            console.error('Fout bij het laden van mindmap:', error);
            showToast('Fout bij het laden van de mindmap', true);
        }
    };
    
    reader.readAsText(file);
}

// Exporteer als afbeelding
function exportAsImage() {
    // Maak een canvas element voor de afbeelding
    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');
    
    // Bereken de grenzen van de mindmap
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
        const nodeEl = document.getElementById(node.id);
        if (nodeEl) {
            const rect = nodeEl.getBoundingClientRect();
            const x = node.x;
            const y = node.y;
            const width = rect.width;
            const height = rect.height;
            
            minX = Math.min(minX, x - 20);
            minY = Math.min(minY, y - 20);
            maxX = Math.max(maxX, x + width + 20);
            maxY = Math.max(maxY, y + height + 20);
        }
    });
    
    // Als er geen nodes zijn, toon foutmelding
    if (minX === Infinity || nodes.length === 0) {
        showToast('Geen knooppunten om te exporteren', true);
        return;
    }
    
    // Canvas grootte instellen
    const canvasWidth = maxX - minX;
    const canvasHeight = maxY - minY;
    
    exportCanvas.width = canvasWidth;
    exportCanvas.height = canvasHeight;
    
    // Achtergrond tekenen
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Teken grid als het is ingeschakeld
    if (showGrid) {
        ctx.fillStyle = '#333';
        
        for (let x = 0; x < canvasWidth; x += gridSize) {
            for (let y = 0; y < canvasHeight; y += gridSize) {
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    // Eerst alle verbindingen tekenen
    connections.forEach(conn => {
        const sourceNode = nodes.find(n => n.id === conn.source);
        const targetNode = nodes.find(n => n.id === conn.target);
        
        if (sourceNode && targetNode) {
            // Bereken middenpunten
            const getNodeCenter = (node) => {
                let width = 120;
                let height = 60;
                
                if (node.shape === 'circle') {
                    width = height = 120;
                } else if (node.shape === 'diamond') {
                    width = height = 100;
                }
                
                return {
                    x: node.x + width / 2 - minX,
                    y: node.y + height / 2 - minY
                };
            };
            
            const sourceCenter = getNodeCenter(sourceNode);
            const targetCenter = getNodeCenter(targetNode);
            
            // Bereken de hoek van de lijn
            const dx = targetCenter.x - sourceCenter.x;
            const dy = targetCenter.y - sourceCenter.y;
            const angle = Math.atan2(dy, dx);
            
            // Bereken de afstand tussen de knooppunten
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Vind de randpunten om de lijn te verbinden met de randen
            const getNodeEdgePoint = (node, angle, isSource) => {
                const center = getNodeCenter(node);
                let radius;
                
                if (node.shape === 'circle') {
                    radius = 60;
                } else if (node.shape === 'diamond') {
                    const normalizedAngle = (angle + Math.PI * 2) % (Math.PI * 2);
                    const rotatedAngle = normalizedAngle - Math.PI / 4;
                    radius = 50 / Math.max(Math.abs(Math.cos(rotatedAngle)), Math.abs(Math.sin(rotatedAngle)));
                } else {
                    const width = 120;
                    const height = 60;
                    
                    const halfWidth = width / 2;
                    const halfHeight = height / 2;
                    
                    // Bepaal het snijpunt met de rechthoek
                    const abs_cos = Math.abs(Math.cos(angle));
                    const abs_sin = Math.abs(Math.sin(angle));
                    
                    if (abs_cos * halfHeight <= abs_sin * halfWidth) {
                        // Snijpunt met horizontale lijn
                        // Bepaal of het boven of onder is
                        const sign = Math.sin(angle) >= 0 ? 1 : -1;
                        const y = sign * halfHeight;
                        const x = y / Math.tan(angle) || 0;  // Voorkomt deling door nul
                        
                        // Bereken de afstand tot het centrum
                        radius = Math.sqrt(x*x + y*y);
                    } else {
                        // Snijpunt met verticale lijn
                        // Bepaal of het links of rechts is
                        const sign = Math.cos(angle) >= 0 ? 1 : -1;
                        const x = sign * halfWidth;
                        const y = x * Math.tan(angle);
                        
                        // Bereken de afstand tot het centrum
                        radius = Math.sqrt(x*x + y*y);
                    }
                    
                    // Kleine correctie
                    radius -= 1;
                }
                
                const dir = isSource ? 1 : -1;
                
                return {
                    x: center.x + Math.cos(angle) * radius * dir,
                    y: center.y + Math.sin(angle) * radius * dir
                };
            };
            
            const startPoint = getNodeEdgePoint(sourceNode, angle, true);
            const endPoint = getNodeEdgePoint(targetNode, angle, false);
            
            // Bereken controlepunt voor gebogen lijn
            let controlPoint;
            if (conn.controlPoint) {
                controlPoint = {
                    x: conn.controlPoint.x - minX,
                    y: conn.controlPoint.y - minY
                };
            } else {
                const bendFactor = Math.min(0.5, distance / 400);
                
                if (conn.isYBranch) {
                    const midX = (startPoint.x + endPoint.x) / 2;
                    const midY = (startPoint.y + endPoint.y) / 2;
                    const perpAngle = angle + Math.PI / 2;
                    const perpDistance = distance * 0.4;
                    
                    controlPoint = {
                        x: midX + Math.cos(perpAngle) * perpDistance,
                        y: midY + Math.sin(perpAngle) * perpDistance
                    };
                } else {
                    const midX = (startPoint.x + endPoint.x) / 2;
                    const midY = (startPoint.y + endPoint.y) / 2;
                    const perpAngle = angle + Math.PI / 2;
                    const perpDistance = distance * bendFactor;
                    
                    controlPoint = {
                        x: midX + Math.cos(perpAngle) * perpDistance,
                        y: midY + Math.sin(perpAngle) * perpDistance
                    };
                }
            }
            
            // Teken de verbinding als een gebogen lijn
            ctx.save();
            
            // Stel de lijnstijl in op basis van verbinding stijl
            if (conn.styleClass) {
                if (conn.styleClass.includes('primary')) {
                    ctx.strokeStyle = '#4CAF50';
                    ctx.lineWidth = 3;
                } else if (conn.styleClass.includes('secondary')) {
                    ctx.strokeStyle = '#FFC107';
                    ctx.lineWidth = 2;
                } else {
                    ctx.strokeStyle = '#aaa';
                    ctx.lineWidth = 2;
                }
                
                if (conn.styleClass.includes('dashed')) {
                    ctx.setLineDash([5, 5]);
                }
            } else {
                ctx.strokeStyle = '#aaa';
                ctx.lineWidth = 2;
            }
            
            // Teken de curve
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y);
            ctx.stroke();
            
            // Reset lineDash voor andere verbindingen
            ctx.setLineDash([]);
            
            // Teken label indien aanwezig
            if (conn.label) {
                ctx.font = '12px "Segoe UI", sans-serif';
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                
                // Voeg achtergrond toe aan label
                const textWidth = ctx.measureText(conn.label).width + 10;
                const textHeight = 16;
                
                ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
                ctx.fillRect(
                    controlPoint.x - textWidth / 2,
                    controlPoint.y - textHeight - 5,
                    textWidth,
                    textHeight
                );
                
                // Teken de tekst
                ctx.fillStyle = '#fff';
                ctx.fillText(conn.label, controlPoint.x, controlPoint.y - 5);
            }
            
            ctx.restore();
        }
    });
    
    // Teken alle knooppunten
    nodes.forEach(node => {
        // Bereken positie relatief aan de exportcanvas
        const x = node.x - minX;
        const y = node.y - minY;
        
        // Teken de node op basis van vorm
        ctx.save();
        ctx.fillStyle = '#3a3a3a';
        ctx.strokeStyle = node.color;
        ctx.lineWidth = node.isRoot ? 3 : 2;
        
        switch(node.shape) {
            case 'rounded':
                ctx.beginPath();
                ctx.roundRect(x, y, 120, 60, 10);
                ctx.fill();
                ctx.stroke();
                break;
            case 'circle':
                ctx.beginPath();
                ctx.arc(x + 60, y + 60, 60, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
            case 'diamond':
                ctx.translate(x + 50, y + 50);
                ctx.rotate(Math.PI / 4);
                ctx.beginPath();
                ctx.rect(-50, -50, 100, 100);
                ctx.fill();
                ctx.stroke();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                break;
            default: // rectangle
                ctx.beginPath();
                ctx.rect(x, y, 120, 60);
                ctx.fill();
                ctx.stroke();
                break;
        }
        
        // Teken tekst
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (node.shape === 'diamond') {
            // Voor diamond moet de tekst gedraaid worden
            ctx.translate(x + 50, y + 50);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(node.title, 0, 0, 80);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        } else {
            // Voor andere vormen
            const centerY = node.shape === 'circle' ? y + 60 : y + 30;
            ctx.fillText(node.title, x + 60, centerY, 110);
        }
        
        ctx.restore();
    });
    
    // Exporteer als PNG
    try {
        exportCanvas.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mindmap.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('Mindmap opgeslagen als afbeelding');
        });
    } catch (error) {
        console.error('Fout bij het exporteren als afbeelding:', error);
        showToast('Fout bij het exporteren als afbeelding', true);
    }
}