/**
 * connections/branches.js - Branch connection management
 */

// Registreer module bij de loader
if (typeof ConnectionModules !== 'undefined') {
    ConnectionModules.registerModule('branches', function() {
        console.log('Branches module laden - vertakkingsfuncties exporteren');
        
        // Functie voor drag & drop van branch-points naar nodes
        window.startBranchDrag = function(connection, x, y, mouseEvent) {
            // Sla huidige staat op voor undo functionaliteit
            if (typeof saveStateForUndo === 'function') {
                saveStateForUndo();
            }
            
            // We maken een tijdelijke "branching drag" modus aan
            window.SharedState.isCreatingBranch = true;
            let dragEndedWithConnection = false;
            
            // We moeten nu bepalen welke node als bron voor de vertakking wordt gebruikt
            // We gebruiken ALTIJD de verbinding waar het bolletje op zit als bron
            const branchSourceConn = connection;
            const branchSourceNodeId = connection.source;
            
            // Sla de positie op waar de vertakking moet beginnen
            const startPos = { x, y };
            
            // Toon een tooltip om gebruiker te helpen
            showSubtleToast('Sleep naar een knooppunt om verbinding te maken');
            
            // Verander de cursor om aan te geven dat we in branch drag modus zijn
            canvas.style.cursor = 'grabbing';
            
            // Creëer een tijdelijke verbindingslijn voor de drag operatie
            const tempLineEl = document.createElement('div');
            tempLineEl.id = 'temp-branch-line';
            tempLineEl.style.position = 'absolute';
            tempLineEl.style.top = '0';
            tempLineEl.style.left = '0';
            tempLineEl.style.width = '100%';
            tempLineEl.style.height = '100%';
            tempLineEl.style.pointerEvents = 'none';
            tempLineEl.style.zIndex = '5';
            canvas.appendChild(tempLineEl);
            
            // Functie om tijdelijke lijn weer te geven tijdens het slepen
            function handleDragMove(e) {
                // Bereken muispositie relatief aan het canvas
                const canvasRect = canvas.getBoundingClientRect();
                const mouseX = (e.clientX - canvasRect.left) / zoomLevel;
                const mouseY = (e.clientY - canvasRect.top) / zoomLevel;
                
                // Bereken een controlepunt voor een lichte curve
                const cpX = (startPos.x + mouseX) / 2;
                const cpY = (startPos.y + mouseY) / 2 - 30; // Lichte curve naar boven
                
                // Update de tijdelijke lijn
                tempLineEl.innerHTML = `
                    <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0;">
                        <path 
                            d="M ${startPos.x} ${startPos.y} Q ${cpX} ${cpY} ${mouseX} ${mouseY}"
                            stroke="#2196F3"
                            stroke-width="2"
                            stroke-dasharray="5,5"
                            fill="none"
                        />
                        <!-- Visuele startpunt markering -->
                        <circle 
                            cx="${startPos.x}" 
                            cy="${startPos.y}" 
                            r="4" 
                            fill="#2196F3"
                        />
                    </svg>
                `;
                
                // Highlight mogelijke doelknooppunten
                highlightPotentialTargets(e);
            }
            
            // Functie om potentiële doelknooppunten te highlighten
            function highlightPotentialTargets(e) {
                // Verwijder eerst alle bestaande highlights
                document.querySelectorAll('.node.potential-target').forEach(node => {
                    node.classList.remove('potential-target');
                });
                
                // Controleer of de muis boven een node is
                const nodeUnderMouse = e.target.closest('.node');
                if (nodeUnderMouse && nodeUnderMouse.id !== branchSourceNodeId) {
                    nodeUnderMouse.classList.add('potential-target');
                }
            }
            
            // Functie om de drag te verwerken bij mouseup
            function handleDragEnd(e) {
                // Controleer of we boven een node zijn geëindigd
                const targetNodeEl = e.target.closest('.node');
                if (targetNodeEl && targetNodeEl.id !== branchSourceNodeId) {
                    // Haal de node id op
                    const targetId = targetNodeEl.id;
                    
                    // Maak de verbinding
                    createBranchedConnection(branchSourceConn, targetId, startPos);
                    
                    // Markeer dat we een verbinding hebben gemaakt
                    dragEndedWithConnection = true;
                }
                
                // Cleanup
                cleanupBranchDrag();
                
                // Toon feedback
                if (dragEndedWithConnection) {
                    showSubtleToast('Verbinding gemaakt');
                } else {
                    showSubtleToast('Geen verbinding gemaakt');
                }
            }
            
            // Functie om de drag operatie te annuleren bij ESC
            function handleDragEscape(e) {
                if (e.key === 'Escape') {
                    cleanupBranchDrag();
                    showSubtleToast('Verbinding maken geannuleerd');
                }
            }
            
            // Functie om alles op te ruimen na het voltooien of annuleren van de drag operatie
            function cleanupBranchDrag() {
                canvas.style.cursor = 'default';
                window.SharedState.isCreatingBranch = false;
                
                // Verwijder tijdelijke event listeners
                document.removeEventListener('mousemove', handleDragMove);
                document.removeEventListener('mouseup', handleDragEnd);
                document.removeEventListener('keydown', handleDragEscape);
                
                // Verwijder tijdelijke lijn
                if (tempLineEl) tempLineEl.remove();
                
                // Verwijder alle node highlights
                document.querySelectorAll('.node.potential-target').forEach(node => {
                    node.classList.remove('potential-target');
                });
            }
            
            // Maak een verbinding met de doelnode die visueel vanaf het bolletje op de verbindingslijn begint
            function createBranchedConnection(sourceConnection, targetNodeId, branchPointPos) {
                // Sla huidige staat op voor undo functionaliteit
                if (typeof saveStateForUndo === 'function') {
                    saveStateForUndo();
                }
                
                // Maak een nieuwe verbinding met dezelfde bron als de originele verbinding
                // Maar markeer het als een specifiek branch type
                // Gebruik een unieke timestamp om ervoor te zorgen dat elke verbinding een uniek ID heeft
                const uniqueTimestamp = Date.now() + Math.floor(Math.random() * 1000);
                const connectionId = 'conn-branch-' + sourceConnection.id + '-' + targetNodeId + '-' + uniqueTimestamp;
                
                // Bereken de relatieve positie (t-parameter) op de Bezier curve
                // Dit wordt gebruikt om de positie bij te werken wanneer de verbindingslijn beweegt
                // We moeten een punt op de verbindingslijn vinden dat het dichtst bij het branchPointPos ligt
                const relativeBranchPosition = findRelativePositionOnConnection(sourceConnection, branchPointPos);
                
                // Maak verbinding object met speciale eigenschappen
                const newConnection = {
                    id: connectionId,
                    source: sourceConnection.source, // We gebruiken dezelfde bron-node
                    target: targetNodeId,
                    isYBranch: true,             // Dit is een Y-vertakking
                    isTrueBranch: true,          // Dit is een aftakking vanaf een verbindingslijn
                    parentConnectionId: sourceConnection.id, // ID van de originele verbinding
                    branchPointPosition: {       // Positie van het vertakkingspunt op de originele verbinding
                        x: branchPointPos.x,
                        y: branchPointPos.y
                    },
                    // Sla de relatieve positie op om de branch te kunnen updaten als de parent verplaatst wordt
                    branchPointRelativePosition: relativeBranchPosition,
                    // Unieke identifier voor deze specifieke aftakking
                    branchId: 'branch-' + uniqueTimestamp,
                    label: '',
                    styleClass: sourceConnection.styleClass || ''
                };
                
                // Bereken een goed controlepunt voor de curve
                // We willen dat de curve mooi loopt van het branchpoint naar de doelnode
                const targetNode = nodes.find(n => n.id === targetNodeId);
                if (targetNode) {
                    // Bereken een controlepunt dat zorgt voor een elegante curve
                    const dx = targetNode.x - branchPointPos.x;
                    const dy = targetNode.y - branchPointPos.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Bereken een punt dat zorgt voor een mooie bocht
                    const midX = (branchPointPos.x + targetNode.x) / 2;
                    const midY = (branchPointPos.y + targetNode.y) / 2;
                    
                    // Bereken een punt loodrecht op de lijn voor een mooie curve
                    const angle = Math.atan2(dy, dx);
                    const perpAngle = angle + Math.PI / 2;
                    const perpDistance = distance * 0.3; // 30% van de afstand voor een mooie bocht
                    
                    // Sla dit op als controlepunt
                    newConnection.controlPoint = {
                        x: midX + Math.cos(perpAngle) * perpDistance,
                        y: midY + Math.sin(perpAngle) * perpDistance
                    };
                }
                
                // Voeg toe aan array
                connections.push(newConnection);
                
                // Teken de verbinding
                drawConnection(newConnection);
                
                // Vernieuw de verbindingen om de nieuwe positie toe te passen
                refreshConnections();
                
                // Selecteer de nieuwe verbinding zodat deze direct kan worden bewerkt
                currentSelectedNode = newConnection.id;
                currentSelectedConnection = newConnection;
                
                return newConnection;
            }
            
            // Voeg event listeners toe
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
            document.addEventListener('keydown', handleDragEscape);
            
            // Voorkom dat de event verder bubbelt
            mouseEvent.preventDefault();
            mouseEvent.stopPropagation();
        };

        // Oorspronkelijke functie - behouden voor compatibiliteit
        window.startBranchFromConnection = function(connection, x, y) {
            // Sla huidige staat op voor undo functionaliteit
            if (typeof saveStateForUndo === 'function') {
                saveStateForUndo();
            }
            
            // We maken een tijdelijke "branching" modus aan
            window.SharedState.branchingMode = true;
            window.SharedState.branchSourceConnection = connection;
            
            // We moeten nu bepalen welke node als bron voor de vertakking wordt gebruikt
            // Standaard gebruiken we de bron van de verbinding, maar we kunnen deze later aanpassen
            window.SharedState.branchSourceNode = connection.source;
            
            // Sla de positie op waar de vertakking moet beginnen
            if (!window.SharedState.branchingPosition) window.SharedState.branchingPosition = {};
            window.SharedState.branchingPosition.x = x;
            window.SharedState.branchingPosition.y = y;
            
            // Toon een tooltip om gebruiker te helpen
            showSubtleToast('Klik op een knooppunt om de aftakking te maken');
            
            // Verander de cursor om aan te geven dat we in branch modus zijn
            canvas.style.cursor = 'crosshair';
            
            // Creëer een tijdelijke verbindingslijn die de muis volgt
            document.addEventListener('mousemove', handleBranchMouseMove);
            
            // Wacht op een klik op een knooppunt om de vertakking te voltooien
            function handleBranchTarget(e) {
                // Als op een knooppunt wordt geklikt
                if (e.target.classList.contains('node') || e.target.closest('.node')) {
                    const targetNode = e.target.classList.contains('node') ? 
                        e.target : e.target.closest('.node');
                    const targetId = targetNode.id;
                    
                    // Maak de vertakking
                    if (window.SharedState.branchSourceNode && targetId && window.SharedState.branchSourceNode !== targetId) {
                        // Maak een nieuwe verbinding met Y-vertakking flag
                        const newConnection = createConnection(window.SharedState.branchSourceNode, targetId, true);
                        
                        if (newConnection) {
                            // Gebruik de opgeslagen positie voor het controlepunt
                            newConnection.controlPoint = {
                                x: window.SharedState.branchingPosition.x,
                                y: window.SharedState.branchingPosition.y
                            };
                            
                            // Vernieuw de verbindingen om de nieuwe positie toe te passen
                            refreshConnections();
                            
                            // Selecteer de nieuwe verbinding zodat deze direct kan worden bewerkt
                            currentSelectedNode = newConnection.id;
                            currentSelectedConnection = newConnection;
                            
                            showSubtleToast('Aftakking gemaakt');
                        }
                        
                        // Reset branching modus
                        cleanupBranchingMode();
                    } else {
                        showSubtleToast('Kan geen verbinding maken met hetzelfde knooppunt', true);
                    }
                }
            }
            
            // Voeg tijdelijke click handler toe
            document.addEventListener('click', handleBranchTarget);
            
            // Voeg een escape handler toe om de actie te kunnen annuleren
            function handleBranchEscape(e) {
                if (e.key === 'Escape' && window.SharedState.branchingMode) {
                    cleanupBranchingMode();
                    showSubtleToast('Aftakking geannuleerd');
                }
            }
            
            document.addEventListener('keydown', handleBranchEscape);
            
            // Functie om tijdelijke lijn weer te geven tijdens het maken van de vertakking
            function handleBranchMouseMove(e) {
                if (window.SharedState.branchingMode && window.SharedState.branchSourceNode) {
                    // Verwijder bestaande tijdelijke lijn
                    const tempLine = document.getElementById('temp-branch-line');
                    if (tempLine) tempLine.remove();
                    
                    // Bereken muispositie relatief aan het canvas
                    const canvasRect = canvas.getBoundingClientRect();
                    const mouseX = (e.clientX - canvasRect.left) / zoomLevel;
                    const mouseY = (e.clientY - canvasRect.top) / zoomLevel;
                    
                    // Maak tijdelijke lijn
                    const tempLineEl = document.createElement('div');
                    tempLineEl.id = 'temp-branch-line';
                    tempLineEl.style.position = 'absolute';
                    tempLineEl.style.top = '0';
                    tempLineEl.style.left = '0';
                    tempLineEl.style.width = '100%';
                    tempLineEl.style.height = '100%';
                    tempLineEl.style.pointerEvents = 'none';
                    tempLineEl.style.zIndex = '5';
                    
                    // Maak een gebogen SVG lijn van het vertakkingspunt naar de muis
                    // Bereken een controlepunt voor een lichte curve
                    const cpX = (window.SharedState.branchingPosition.x + mouseX) / 2;
                    const cpY = (window.SharedState.branchingPosition.y + mouseY) / 2 - 30; // Lichte curve naar boven
                    
                    tempLineEl.innerHTML = `
                        <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0;">
                            <path 
                                d="M ${window.SharedState.branchingPosition.x} ${window.SharedState.branchingPosition.y} Q ${cpX} ${cpY} ${mouseX} ${mouseY}"
                                stroke="#2196F3"
                                stroke-width="2"
                                stroke-dasharray="5,5"
                                fill="none"
                            />
                            <!-- Visuele startpunt markering -->
                            <circle 
                                cx="${window.SharedState.branchingPosition.x}" 
                                cy="${window.SharedState.branchingPosition.y}" 
                                r="4" 
                                fill="#2196F3"
                            />
                        </svg>
                    `;
                    
                    canvas.appendChild(tempLineEl);
                }
            }
            
            // Functie om alles op te ruimen na het voltooien of annuleren van de vertakking
            function cleanupBranchingMode() {
                window.SharedState.branchingMode = false;
                window.SharedState.branchSourceConnection = null;
                window.SharedState.branchSourceNode = null;
                window.SharedState.branchingPosition = null;
                canvas.style.cursor = 'default';
                
                // Verwijder tijdelijke event listeners
                document.removeEventListener('click', handleBranchTarget);
                document.removeEventListener('mousemove', handleBranchMouseMove);
                document.removeEventListener('keydown', handleBranchEscape);
                
                // Verwijder tijdelijke lijn
                const tempLine = document.getElementById('temp-branch-line');
                if (tempLine) tempLine.remove();
            }
        };

        // Update de startpunten van alle aftakkingen van een verbinding
        window.updateBranchStartPoints = function(connection) {
            if (!connection) return;
            
            // Vind alle aftakkingen die deze verbinding als parent hebben
            const branchConnections = connections.filter(conn => 
                conn.isTrueBranch && conn.parentConnectionId === connection.id
            );
            
            if (branchConnections.length === 0) return;
            
            // Update elke aftakking
            branchConnections.forEach(branch => {
                // Voor de actief versleepte branch (wanneer de branch zelf wordt gesleept), 
                // willen we de positie niet opnieuw berekenen
                const isActiveDrag = branch.id === window.SharedState.activeConnectionPath && 
                                   window.SharedState.isDraggingConnection;
                
                // Voor actief versleepte branches, willen we de positie niet opnieuw berekenen
                if (isActiveDrag) {
                    return;
                }
                
                // Controleer of de aftakking een opgeslagen relatieve positie heeft
                if (typeof branch.branchPointRelativePosition === 'number') {
                    // Bereken de nieuwe positie op basis van de relatieve t-waarde
                    const newPosition = calculatePointOnConnection(connection, branch.branchPointRelativePosition);
                    
                    if (newPosition) {
                        // Als deze aftakking een offset heeft, pas die toe
                        if (branch.branchPointOffset) {
                            // Pas de offset toe op de berekende positie, maar begrens deze om extreme offsets te voorkomen
                            const maxOffset = 100; // Maximum offset in pixels
                            const limitedOffset = {
                                x: Math.max(-maxOffset, Math.min(maxOffset, branch.branchPointOffset.x)),
                                y: Math.max(-maxOffset, Math.min(maxOffset, branch.branchPointOffset.y))
                            };
                            
                            branch.branchPointPosition = {
                                x: newPosition.x + limitedOffset.x,
                                y: newPosition.y + limitedOffset.y
                            };
                        } else {
                            // Update de absolute positie zonder offset
                            branch.branchPointPosition = newPosition;
                        }
                        
                        // Reset het controlepunt om een betere curve te krijgen
                        delete branch.controlPoint;
                        
                        // Bijgewerkt startpunt zoeken in de DOM
                        const branchEl = document.getElementById(branch.id);
                        if (branchEl) {
                            // Update de startmarker (bolletje op het vertakkingspunt)
                            const marker = branchEl.querySelector('.branch-point-marker');
                            if (marker) {
                                marker.setAttribute('cx', branch.branchPointPosition.x);
                                marker.setAttribute('cy', branch.branchPointPosition.y);
                            }
                            
                            // Optimaliseer het controlepunt van de aftakking
                            recalculateControlPoint(branch);
                            
                            // Trek de verbinding opnieuw om het pad bij te werken
                            drawConnection(branch);
                        }
                    }
                } else {
                    // Als er geen relatieve positie is opgeslagen, bereken deze nu
                    if (branch.branchPointPosition) {
                        const relPos = findRelativePositionOnConnection(connection, branch.branchPointPosition);
                        if (relPos !== null && relPos !== undefined) {
                            branch.branchPointRelativePosition = relPos;
                            
                            // Update nu met de nieuwe relatieve positie
                            const newPosition = calculatePointOnConnection(connection, relPos);
                            if (newPosition) {
                                // Als er een offset is, pas die toe
                                if (branch.branchPointOffset) {
                                    const maxOffset = 100;
                                    const limitedOffset = {
                                        x: Math.max(-maxOffset, Math.min(maxOffset, branch.branchPointOffset.x)),
                                        y: Math.max(-maxOffset, Math.min(maxOffset, branch.branchPointOffset.y))
                                    };
                                    
                                    branch.branchPointPosition = {
                                        x: newPosition.x + limitedOffset.x,
                                        y: newPosition.y + limitedOffset.y
                                    };
                                } else {
                                    branch.branchPointPosition = newPosition;
                                }
                                
                                // Optimaliseer het controlepunt van de aftakking
                                recalculateControlPoint(branch);
                                
                                // Trek de verbinding opnieuw
                                drawConnection(branch);
                            }
                        }
                    }
                }
            });
        };

        // Update alle aftakkingsstartpunten voor verbindingen gerelateerd aan een specifieke node
        window.updateBranchStartPointsForNode = function(nodeId) {
            if (!nodeId) return;
            
            // Vind alle verbindingen waar deze node deel van uitmaakt
            const nodeConnections = connections.filter(conn => 
                !conn.isTrueBranch && (conn.source === nodeId || conn.target === nodeId)
            );
            
            // Update elke verbinding eerst (inclusief het herberekenen van controlepunten)
            nodeConnections.forEach(connection => {
                // Optimaliseer controlepunt bij grote verplaatsingen
                recalculateControlPoint(connection);
                
                // Vind alle aftakkingen die deze verbinding als parent hebben
                const branchConnections = connections.filter(conn => 
                    conn.isTrueBranch && conn.parentConnectionId === connection.id
                );
                
                if (branchConnections.length > 0) {
                    // Update alle aftakkingen voor deze verbinding
                    updateBranchStartPoints(connection);
                }
            });
        };
        
        console.log('Branches module geladen');
    });
}