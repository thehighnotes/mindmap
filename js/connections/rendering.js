/**
 * connections/rendering.js - Connection rendering and visual updates
 */

// Registreer module bij de loader
if (typeof ConnectionModules !== 'undefined') {
    ConnectionModules.registerModule('rendering', function() {
        console.log('Rendering module laden - verbinding tekenfuncties exporteren');
        
        // Teken een verbinding tussen knooppunten
        window.drawConnection = function(connection) {
            // Extra check: als de verbinding niet meer in de connections array staat, teken hem niet
            if (!connections.find(c => c.id === connection.id)) {
                console.warn(`[drawConnection] Verbinding ${connection.id} bestaat niet meer in connections array, skip tekenen`);
                return;
            }
            
            // Vind de knooppunten in de nodes array
            const sourceNode = nodes.find(n => n.id === connection.source);
            const targetNode = nodes.find(n => n.id === connection.target);
            
            if (!sourceNode || !targetNode) {
                console.warn(`[drawConnection] Kon nodes niet vinden voor verbinding ${connection.id}. Source: ${connection.source}, Target: ${connection.target}`);
                console.warn('Beschikbare nodes:', nodes.map(n => n.id));
                
                // Als de nodes niet bestaan, verwijder ook het DOM element als dat er nog is
                const existingEl = document.getElementById(connection.id);
                if (existingEl) {
                    existingEl.remove();
                }
                return;
            }
            
            // Controleer of deze verbinding al een element heeft
            let connEl = document.getElementById(connection.id);
            if (!connEl) {
                connEl = document.createElement('div');
                connEl.id = connection.id;
                connEl.className = 'connection';
                document.getElementById('connections-container').appendChild(connEl);
                
                // Voeg event listeners toe
                connEl.addEventListener('mousedown', function(e) {
                    // Allow interactions with connection
                    e.stopPropagation();
                    currentSelectedNode = connection.id;
                    currentSelectedConnection = connection;
                    
                    // Vernieuw alleen deze specifieke verbinding voor visuele feedback
                    // in plaats van alle verbindingen opnieuw te tekenen
                    drawConnection(connection);
                });
                
                // Rechtermuisklik voor verbindingsopties
                connEl.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Toon aangepast context menu voor verbindingen
                    showConnectionContextMenu(e, connection);
                });
                
                // Dubbelklik voor het bewerken van labels
                connEl.addEventListener('dblclick', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    openConnectionEditor(connection);
                });
            }
            
            // Zorg ervoor dat we geen dubbele elementen creëren
            // Verwijder alle oude child elementen voordat we nieuwe toevoegen
            while (connEl.firstChild) {
                connEl.removeChild(connEl.firstChild);
            }
            
            // Bepaal startpunt op basis van of dit een echte branch is
            let startPoint;
            let endPoint;
            let angle;
            
            // We behandelen een echte aftakking (vanaf het verbindingspunt) anders
            if (connection.isTrueBranch && connection.branchPointPosition) {
                // Voor een echte aftakking, gebruiken we het vertakkingspunt als beginpunt
                startPoint = connection.branchPointPosition;
                
                // We moeten nog steeds het eindpunt berekenen (op de rand van de doelnode)
                const targetCenter = getNodeCenter(targetNode);
                
                // Bereken de hoek van de lijn van vertakkingspunt naar doelknoop
                const dx = targetCenter.x - startPoint.x;
                const dy = targetCenter.y - startPoint.y;
                angle = Math.atan2(dy, dx);
                
                // Bereken het eindpunt op de rand van de doelknoop
                endPoint = getNodeEdgePoint(targetNode, angle, false);
            } else {
                // Normale verbinding tussen twee nodes
                const sourceCenter = getNodeCenter(sourceNode);
                const targetCenter = getNodeCenter(targetNode);
                
                // Bereken de hoek van de lijn
                const dx = targetCenter.x - sourceCenter.x;
                const dy = targetCenter.y - sourceCenter.y;
                angle = Math.atan2(dy, dx);
                
                // Bereken randpunten op beide knooppunten
                startPoint = getNodeEdgePoint(sourceNode, angle, true);
                endPoint = getNodeEdgePoint(targetNode, angle, false);
            }
            
            // Bereken de afstand tussen start- en eindpunt
            const dx = endPoint.x - startPoint.x;
            const dy = endPoint.y - startPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Bereken controlepunten voor gebogen verbindingen
            let controlPoint;
            
            // Als de connection een manual offset heeft, gebruik die om het control point te berekenen
            if (connection.controlPointOffset) {
                // Bereken het nieuwe control point op basis van de offset
                const midX = (startPoint.x + endPoint.x) / 2;
                const midY = (startPoint.y + endPoint.y) / 2;
                
                controlPoint = {
                    x: midX + connection.controlPointOffset.x,
                    y: midY + connection.controlPointOffset.y
                };
                
                // Update the stored control point
                connection.controlPoint = controlPoint;
            } else if (connection.controlPoint) {
                // Als er geen offset is maar wel een control point, bereken de offset
                // Dit gebeurt de eerste keer dat een verbinding wordt versleept
                const midX = (startPoint.x + endPoint.x) / 2;
                const midY = (startPoint.y + endPoint.y) / 2;
                
                // Bereken de offset van het bestaande control point
                connection.controlPointOffset = {
                    x: connection.controlPoint.x - midX,
                    y: connection.controlPoint.y - midY
                };
                
                controlPoint = connection.controlPoint;
            } else {
                // Geen control point en geen offset, gebruik centrale curve berekeningsfunctie
                const midX = (startPoint.x + endPoint.x) / 2;
                const midY = (startPoint.y + endPoint.y) / 2;
                
                const curveParams = window.calculateCurveParameters(distance, connection.isYBranch);
                
                if (curveParams.useStraightLine) {
                    // Voor rechte lijnen
                    controlPoint = {
                        x: midX,
                        y: midY
                    };
                } else {
                    // Voor curves
                    const perpAngle = angle + Math.PI / 2;
                    controlPoint = {
                        x: midX + Math.cos(perpAngle) * curveParams.perpDistance,
                        y: midY + Math.sin(perpAngle) * curveParams.perpDistance
                    };
                }
                
                // Sla het controlepunt op voor toekomstig gebruik
                connection.controlPoint = controlPoint;
            }
            
            // Bepaal of deze verbinding momenteel geselecteerd is
            const isSelected = currentSelectedNode === connection.id;
            
            // Bepaal kleur voor de verbinding
            let connectionColor = '#aaa'; // Standaard kleur
            
            if (isSelected) {
                connectionColor = '#2196F3'; // Blauw voor geselecteerde verbindingen
            } else if (connection.styleClass?.includes('primary')) {
                connectionColor = '#4CAF50'; // Groen voor primaire verbindingen
            } else if (connection.styleClass?.includes('secondary')) {
                connectionColor = '#FFC107'; // Geel voor secundaire verbindingen
            }
            
            // Bepaal classes voor de verbinding op basis van styling
            let connectionClasses = `connection-line ${isSelected ? 'selected' : ''} ${connection.styleClass || ''}`;
            
            // Voeg extra class toe voor echte aftakkingen
            if (connection.isTrueBranch) {
                connectionClasses += ' true-branch';
            }
            
            // Genereer unieke ID voor de pijlpunt (zodat elke verbinding zijn eigen kleur krijgt)
            // Gebruik branchId indien beschikbaar om te zorgen voor uniekheid bij aftakkingen
            const arrowId = connection.branchId ? 
                `arrow-${connection.branchId}` : 
                `arrow-${connection.id}`;
            
            // Bereken punten langs de verbindingslijn voor de interactie-elementen
            // Gebruik de globale getBezierPoint functie
            
            // Bereken de punten voor vertakkingen en een tussennode
            const point1 = getBezierPoint(startPoint, controlPoint, endPoint, 0.33);
            const point2 = getBezierPoint(startPoint, controlPoint, endPoint, 0.5);
            const point3 = getBezierPoint(startPoint, controlPoint, endPoint, 0.67);
            
            // Speciale markering voor het startpunt van een echte aftakking
            let branchStartMarker = '';
            if (connection.isTrueBranch) {
                branchStartMarker = `
                <!-- Markering van vertakkingspunt -->
                <circle 
                    cx="${startPoint.x}" 
                    cy="${startPoint.y}" 
                    r="3" 
                    fill="${connectionColor}"
                    class="branch-point-marker"
                />
                `;
            }
            
            // Nieuwe elegante aanpak: SVG voor de verbindingslijn met directe interactie
            const svg = `
            <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0; pointer-events: none;">
                <defs>
                    <marker 
                        id="${arrowId}" 
                        viewBox="0 0 10 10" 
                        refX="5" 
                        refY="5"
                        markerWidth="6" 
                        markerHeight="6"
                        orient="auto">
                        <path d="M 0 1 L 10 5 L 0 9 z" fill="${connectionColor}"/>
                    </marker>
                </defs>
                
                <!-- Pad voor de lijn zelf -->
                <path 
                    d="M ${startPoint.x} ${startPoint.y} Q ${controlPoint.x} ${controlPoint.y} ${endPoint.x} ${endPoint.y}"
                    class="${connectionClasses}"
                    style="pointer-events: none; marker-end: url(#${arrowId});"
                />
                
                <!-- Interactief pad gebied -->
                <path 
                    d="M ${startPoint.x} ${startPoint.y} Q ${controlPoint.x} ${controlPoint.y} ${endPoint.x} ${endPoint.y}"
                    class="connection-hitzone"
                    style="pointer-events: auto; stroke-width: 15; stroke: transparent; cursor: pointer; fill: none;"
                />
                
                ${branchStartMarker}
            </svg>
            `;
            
            // Update het verbinding element
            connEl.innerHTML = svg;
            
            // VERBETERD: Creëer actie-punten container met pointer-events: none
            // Verwijder eerst oude action points container als die bestaat
            const existingActionPoints = connEl.querySelector('.connection-action-points');
            if (existingActionPoints) {
                existingActionPoints.remove();
            }
            
            const actionPoints = document.createElement('div');
            actionPoints.className = 'connection-action-points';
            actionPoints.style.pointerEvents = 'none'; // Terug naar 'none' om event bubbeling te corrigeren
            connEl.appendChild(actionPoints);
            
            // Voeg actiepunten toe voor vertakkingen en tussennodes
            if (!connection.isYBranch) {
                // Vertakkingspunt 1
                const branchPoint1 = document.createElement('div');
                branchPoint1.className = 'action-point branch-point';
                branchPoint1.style.left = point1.x + 'px';
                branchPoint1.style.top = point1.y + 'px';
                branchPoint1.dataset.position = '0.33';
                branchPoint1.style.pointerEvents = 'all'; // BELANGRIJK: Zorg ervoor dat dit punt kliks opvangt!
                branchPoint1.title = 'Klik voor een nieuwe aftakking';
                
                // Vertakkingspunt 2
                const branchPoint2 = document.createElement('div');
                branchPoint2.className = 'action-point branch-point';
                branchPoint2.style.left = point3.x + 'px';
                branchPoint2.style.top = point3.y + 'px';
                branchPoint2.dataset.position = '0.67';
                branchPoint2.style.pointerEvents = 'all'; // BELANGRIJK: Zorg ervoor dat dit punt kliks opvangt!
                branchPoint2.title = 'Klik voor een nieuwe aftakking';
                
                // Controleer of deze verbinding al aftakkingen heeft
                const hasBranches = connections.some(conn => 
                    conn.isTrueBranch && conn.parentConnectionId === connection.id
                );
                
                // Event listeners toevoegen voor vertakkingspunten
                [branchPoint1, branchPoint2].forEach(point => {
                    point.addEventListener('mousedown', function(e) {
                        e.stopPropagation();
                        e.preventDefault(); // Voorkom eventuele bubbeling
                        
                        // Sla positie en connection op
                        const position = parseFloat(this.dataset.position);
                        // Gebruik startPoint, controlPoint en endPoint uit de huidige scope
                        const pointPos = getBezierPoint(startPoint, controlPoint, endPoint, position);
                        
                        // Start de drag-operatie
                        startBranchDrag(connection, pointPos.x, pointPos.y, e);
                    });
                });
                
                // Voeg vertakkingspunten toe aan container
                actionPoints.appendChild(branchPoint1);
                actionPoints.appendChild(branchPoint2);
                
                // Toon het plusje voor tussennodes alleen als er nog geen aftakkingen zijn
                if (!hasBranches) {
                    // Tussennode actiepunt - VERBETERD plusje
                    const addPoint = document.createElement('div');
                    addPoint.className = 'action-point add-point';
                    addPoint.style.left = point2.x + 'px';
                    addPoint.style.top = point2.y + 'px';
                    addPoint.style.pointerEvents = 'all'; // BELANGRIJK: Zorg ervoor dat dit punt kliks opvangt!
                    addPoint.style.zIndex = '100'; // Hogere z-index voor beter bereik
                    addPoint.title = 'Klik om een tussennode toe te voegen';
                    
                    // DUBBELE handlers voor het plusje om zeker te zijn dat het werkt
                    
                    // Normale click handler
                    addPoint.addEventListener('click', handleAddPointClick);
                    
                    // Mousedown handler als backup
                    addPoint.addEventListener('mousedown', handleAddPointClick);
                    
                    // Aanraakscherm support
                    addPoint.addEventListener('touchstart', handleAddPointClick);
                    
                    // Functie die de klik afhandelt
                    function handleAddPointClick(e) {
                        // Voorkom event bubbeling
                        e.stopPropagation();
                        e.preventDefault();
                        
                        // Visuele feedback voor actie
                        
                        // Directe activering
                        let currentAddPoint = e.currentTarget || e.target;
                        
                        // Visuele feedback dat er geklikt is
                        currentAddPoint.style.transform = 'translate(-50%, -50%) scale(1.5)';
                        currentAddPoint.style.backgroundColor = 'yellow';
                        
                        // Maak lokale kopie van de connection en punten
                        const connectionCopy = { ...connection };
                        const xPos = point2.x;
                        const yPos = point2.y;
                        
                        // Reset selectie eerst om te voorkomen dat de laatst aangemaakte verbinding actief blijft
                        currentSelectedNode = null;
                        currentSelectedConnection = null;
                        
                        // Call de functie om een tussennode toe te voegen
                        addIntermediateNode(connectionCopy, xPos, yPos);
                        
                        // Reset stijl na een korte vertraging
                        setTimeout(() => {
                            currentAddPoint.style.transform = 'translate(-50%, -50%) scale(1)';
                            currentAddPoint.style.backgroundColor = '';
                        }, 300);
                    }
                    
                    // Voeg plusje toe aan container
                    actionPoints.appendChild(addPoint);
                }
            }
            
            // Voeg label toe indien aanwezig
            if (connection.label) {
                const labelEl = document.createElement('div');
                labelEl.className = 'connection-label';
                labelEl.textContent = connection.label;
                labelEl.title = "Dubbelklik om te bewerken";
                
                // Plaats het label bij het controlepunt
                labelEl.style.left = controlPoint.x + 'px';
                labelEl.style.top = (controlPoint.y - 15) + 'px';
                labelEl.style.transform = 'translate(-50%, -100%)';
                
                // Event listener voor label bewerken
                labelEl.addEventListener('dblclick', function(e) {
                    e.stopPropagation();
                    openConnectionEditor(connection);
                });
                
                connEl.appendChild(labelEl);
            }
            
            // Lijn interactiefunctionaliteit
            connEl.addEventListener('mouseenter', function() {
                if (!window.SharedState.isDraggingConnection) {
                    highlightConnectionPath(connection, connEl, startPoint, controlPoint, endPoint);
                }
            });
            
            connEl.addEventListener('mouseleave', function() {
                if (!window.SharedState.isDraggingConnection && currentSelectedNode !== connection.id) {
                    removeConnectionHighlights(connEl);
                }
            });
            
            // Direct path manipulation - elegante directe interactie
            const hitzone = connEl.querySelector('.connection-hitzone');
            if (hitzone) {
                hitzone.addEventListener('mousedown', function(e) {
                    // Voorkom dat de event bubbelt
                    e.stopPropagation();
                    e.preventDefault();
                    
                    // Deselecteer eerst huidige selecties 
                    if (currentSelectedNode && currentSelectedNode !== connection.id) {
                        
                        // Als er een andere node of verbinding geselecteerd was, deselecteer deze
                        const currentlySelectedEl = document.getElementById(currentSelectedNode);
                        if (currentlySelectedEl) {
                            // Reset de styling van de vorige selectie
                            if (currentlySelectedEl.classList.contains('node')) {
                                currentlySelectedEl.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                            }
                        }
                    }
                    
                    // Selecteer de verbinding
                    currentSelectedNode = connection.id;
                    currentSelectedConnection = connection;
                    
                    // Vernieuw alleen deze specifieke verbinding voor visuele update
                    // Niet alle verbindingen hoeven opnieuw getekend te worden
                    drawConnection(connection);
                    
                    // Bereken positie t.o.v. de canvas
                    const canvasRect = canvas.getBoundingClientRect();
                    const mouseX = (e.clientX - canvasRect.left) / zoomLevel;
                    const mouseY = (e.clientY - canvasRect.top) / zoomLevel;
                    
                    // Bereken afstand tot het controlepunt
                    const distance = Math.sqrt(
                        Math.pow(mouseX - controlPoint.x, 2) + 
                        Math.pow(mouseY - controlPoint.y, 2)
                    );
                    
                    // Grotere interactiezone rondom het controlepunt
                    const distanceToControlPoint = 50; // Ruimere klikzone rondom het controlepunt
                    
                    // Als we binnen een bepaalde afstand van het controlepunt zijn, begin met slepen
                    // Of als we ergens op de lijn klikken (dan verplaatsen we het controlepunt daar naartoe)
                    if (distance < distanceToControlPoint) {
                        startConnectionDrag(e, connection, connEl, startPoint, controlPoint, endPoint);
                    } else {
                        // Bereken dichtstbijzijnde punt op de curve
                        const nearestPoint = findNearestPointOnCurve(
                            startPoint, controlPoint, endPoint, 
                            { x: mouseX, y: mouseY }, 
                            20 // aantal segmenten om te controleren
                        );
                        
                        if (nearestPoint) {
                            // Verplaats het controlepunt naar een logisch punt op basis van de klik
                            // Niet direct naar de klikpositie, maar een geïnterpoleerd punt
                            // dat de curve beïnvloedt in de richting van de klik
                            const influencePoint = {
                                x: controlPoint.x + (mouseX - controlPoint.x) * 0.6, // Verhoogd voor betere respons
                                y: controlPoint.y + (mouseY - controlPoint.y) * 0.6
                            };
                            
                            // Update controlepunt
                            controlPoint.x = influencePoint.x;
                            controlPoint.y = influencePoint.y;
                            connection.controlPoint = { x: controlPoint.x, y: controlPoint.y };
                            
                            // Teken verbinding opnieuw
                            refreshConnection(connection, connEl, startPoint, endPoint, controlPoint, true);
                            
                            // Start dan het normale sleep proces
                            startConnectionDrag(e, connection, connEl, startPoint, controlPoint, endPoint);
                        }
                    }
                });
            }
            
            // Update branch start points als deze connection branches heeft
            if (!connection.isTrueBranch) {
                // Vind branches die aan deze connection hangen
                const branchConnections = connections.filter(conn => 
                    conn.isTrueBranch && conn.parentConnectionId === connection.id
                );
                
                if (branchConnections.length > 0) {
                    updateBranchStartPoints(connection);
                }
            }
        };

        // Update het pad van een verbinding
        window.updateConnectionPath = function(connEl, startPoint, endPoint, controlPoint, connection) {
            // Controleer of alle benodigde coördinaten aanwezig zijn
            if (!connEl) return;
            if (!startPoint || !endPoint || !controlPoint) {
                // Als een van de punten ontbreekt, probeer ze te berekenen uit de verbinding
                if (connection) {
                    // Zoek de bijbehorende nodes op basis van de verbinding IDs
                    const sourceNode = nodes.find(n => n.id === connection.source);
                    const targetNode = nodes.find(n => n.id === connection.target);
                    
                    if (!sourceNode || !targetNode) {
                        console.warn(`[updateConnectionPath] Kon nodes niet vinden voor verbinding ${connection.id}. Source: ${connection.source}, Target: ${connection.target}`);
                        return; // Kan punten niet berekenen zonder beide nodes
                    }
                    
                    // Als startpunt ontbreekt, bereken deze uit de bron-node
                    if (!startPoint) {
                        const sourceCenter = getNodeCenter(sourceNode);
                        const targetCenter = getNodeCenter(targetNode);
                        const dx = targetCenter.x - sourceCenter.x;
                        const dy = targetCenter.y - sourceCenter.y;
                        const angle = Math.atan2(dy, dx);
                        startPoint = getNodeEdgePoint(sourceNode, angle, true);
                    }
                    
                    // Als eindpunt ontbreekt, bereken deze uit de doel-node
                    if (!endPoint) {
                        const sourceCenter = getNodeCenter(sourceNode);
                        const targetCenter = getNodeCenter(targetNode);
                        const dx = targetCenter.x - sourceCenter.x;
                        const dy = targetCenter.y - sourceCenter.y;
                        const angle = Math.atan2(dy, dx);
                        endPoint = getNodeEdgePoint(targetNode, angle, false);
                    }
                    
                    // Als controlepunt ontbreekt, bereken een standaard controlepunt
                    if (!controlPoint) {
                        // Gebruik het opgeslagen controlepunt indien beschikbaar
                        if (connection.controlPoint) {
                            controlPoint = connection.controlPoint;
                        } else {
                            // Bereken middenpunt tussen start en eind
                            const midX = (startPoint.x + endPoint.x) / 2;
                            const midY = (startPoint.y + endPoint.y) / 2;
                            
                            // Bereken een punt loodrecht op de lijn
                            const dx = endPoint.x - startPoint.x;
                            const dy = endPoint.y - startPoint.y;
                            const angle = Math.atan2(dy, dx);
                            const perpAngle = angle + Math.PI / 2;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            const perpDistance = distance * 0.2; // 20% van de afstand
                            
                            controlPoint = {
                                x: midX + Math.cos(perpAngle) * perpDistance,
                                y: midY + Math.sin(perpAngle) * perpDistance
                            };
                            
                            // Sla het controlepunt op voor toekomstig gebruik
                            connection.controlPoint = controlPoint;
                        }
                    }
                } else {
                    return; // Kan niet verder zonder verbinding als er punten ontbreken
                }
            }
            
            // Bereken afstand voor rechte lijn check
            const dx = endPoint.x - startPoint.x;
            const dy = endPoint.y - startPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Update de paden in de huidige verbinding
            const paths = connEl.querySelectorAll('path');
            const pathData = `M ${startPoint.x} ${startPoint.y} Q ${controlPoint.x} ${controlPoint.y} ${endPoint.x} ${endPoint.y}`;
            
            paths.forEach(path => {
                path.setAttribute('d', pathData);
            });
            
            // Update branch markers als die er zijn
            const branchMarker = connEl.querySelector('.branch-point-marker');
            if (branchMarker && connection && connection.isTrueBranch && connection.branchPointPosition) {
                branchMarker.setAttribute('cx', connection.branchPointPosition.x);
                branchMarker.setAttribute('cy', connection.branchPointPosition.y);
            }
            
            // Update ook de actiepunten posities
            const actionPoints = connEl.querySelectorAll('.action-point');
            if (actionPoints.length > 0) {
                // Gebruik de globale getBezierPoint functie
                const point1 = getBezierPoint(startPoint, controlPoint, endPoint, 0.33);
                const point2 = getBezierPoint(startPoint, controlPoint, endPoint, 0.5);
                const point3 = getBezierPoint(startPoint, controlPoint, endPoint, 0.67);
                
                // Update posities
                Array.from(actionPoints).forEach(point => {
                    if (point.classList.contains('branch-point')) {
                        const position = parseFloat(point.dataset.position || '0');
                        if (position === 0.33) {
                            point.style.left = point1.x + 'px';
                            point.style.top = point1.y + 'px';
                        } else if (position === 0.67) {
                            point.style.left = point3.x + 'px';
                            point.style.top = point3.y + 'px';
                        }
                    } else if (point.classList.contains('add-point')) {
                        point.style.left = point2.x + 'px';
                        point.style.top = point2.y + 'px';
                    }
                });
            }
            
            // Update label positie indien aanwezig
            const label = connEl.querySelector('.connection-label');
            if (label) {
                label.style.left = controlPoint.x + 'px';
                label.style.top = (controlPoint.y - 15) + 'px';
            }
            
            // Update gerelateerde aftakkingen in real-time tijdens het slepen
            // Voor vloeiende animatie tijdens zowel connection als node dragging
            if (connection && !connection.isTrueBranch && !window.SharedState.isUpdatingBranches) {
                // Gebruik requestAnimationFrame voor soepele animatie
                requestAnimationFrame(() => {
                    window.SharedState.isUpdatingBranches = true;
                    
                    // Direct updaten zonder extra checks voor real-time feedback
                    updateBranchStartPoints(connection);
                    
                    window.SharedState.isUpdatingBranches = false;
                });
            }
        };

        // Functie om alleen de UI-elementen van een verbinding bij te werken tijdens het slepen
        window.refreshConnection = function(connection, connEl, startPoint, endPoint, controlPoint, isSelected) {
            // Bepaal kleur voor de verbinding
            let connectionColor = '#aaa'; // Standaard kleur
            
            if (isSelected) {
                connectionColor = '#2196F3'; // Blauw voor geselecteerde verbindingen
            } else if (connection.styleClass?.includes('primary')) {
                connectionColor = '#4CAF50'; // Groen voor primaire verbindingen
            } else if (connection.styleClass?.includes('secondary')) {
                connectionColor = '#FFC107'; // Geel voor secundaire verbindingen
            }
            
            // Update alle paden met de nieuwe controlepunten
            updateConnectionPath(connEl, startPoint, endPoint, controlPoint);
        };

        // Elegante hint voor het aanpassen van de lijn die de muis volgt
        window.highlightConnectionPath = function(connection, connEl, startPoint, controlPoint, endPoint) {
            // Verwijder bestaande highlights
            removeConnectionHighlights(connEl);
            
            // Voeg hint toe voor aanpassing
            const hint = document.createElement('div');
            hint.className = 'connection-edit-hint cursor-following';
            
            // Initiële positie - wordt door mousemove bijgewerkt
            hint.style.left = '0px';
            hint.style.top = '0px';
            
            // Voeg visuele stijl toe
            hint.innerHTML = `
                <div class="hint-cursor"></div>
                <div class="hint-text">Versleep voor aanpassing</div>
            `;
            
            // Voeg toe aan het element
            document.body.appendChild(hint);
            
            // Sla de hint op voor gebruik in de mousemove handler
            connEl.currentHint = hint;
            
            // Voeg mousemove handler toe om hint bij de muis te houden
            function updateHintPosition(e) {
                if (hint) {
                    hint.style.left = (e.clientX + 25) + 'px';
                    hint.style.top = (e.clientY + 25) + 'px';
                }
            }
            
            // Sla de functie op voor cleanup
            connEl.updateHintPositionHandler = updateHintPosition;
            
            // Zorg ervoor dat de hint de cursor volgt
            document.addEventListener('mousemove', updateHintPosition);
            
            // Verwijder event handlers en tooltip als de muis buiten de verbinding komt
            connEl.addEventListener('mouseleave', function onLeave() {
                if (connEl.updateHintPositionHandler) {
                    document.removeEventListener('mousemove', connEl.updateHintPositionHandler);
                    connEl.updateHintPositionHandler = null;
                }
                
                if (connEl.currentHint) {
                    connEl.currentHint.remove();
                    connEl.currentHint = null;
                }
                
                // Verwijder deze handler
                connEl.removeEventListener('mouseleave', onLeave);
            }, { once: true });
            
            // Accentueer de lijn subtiel
            const paths = connEl.querySelectorAll('path');
            paths.forEach(path => {
                if (!path.classList.contains('connection-hitzone')) {
                    path.classList.add('highlight-path');
                }
            });
        };

        // Verwijder highlights - update deze functie
        window.removeConnectionHighlights = function(connEl) {
            // Verwijder hint element als het bestaat
            if (connEl.currentHint) {
                connEl.currentHint.remove();
                connEl.currentHint = null;
            }
            
            // Verwijder mousemove listener als deze bestaat
            if (connEl.updateHintPositionHandler) {
                document.removeEventListener('mousemove', connEl.updateHintPositionHandler);
                connEl.updateHintPositionHandler = null;
            }
            
            // Verwijder path highlight
            const paths = connEl.querySelectorAll('path');
            paths.forEach(path => {
                path.classList.remove('highlight-path');
            });
        };
        
        console.log('Rendering module geladen');
    });
}