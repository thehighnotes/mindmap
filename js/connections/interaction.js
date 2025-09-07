/**
 * connections/interaction.js - User interaction handling for connections
 */

// Registreer module bij de loader
if (typeof ConnectionModules !== 'undefined') {
    ConnectionModules.registerModule('interaction', function() {
        console.log('Interaction module laden - interactie functies exporteren');
        
        // Toon elegant sleeppatroon
        window.showDragPattern = function(connEl, startPoint, endPoint, controlPoint) {
            // Verwijder bestaande patronen
            removeDragPattern(connEl);
            
            // Maak een element voor de "ghost trail" tijdens het slepen
            const dragPattern = document.createElement('div');
            dragPattern.className = 'connection-drag-pattern';
            
            // Voeg SVG toe met subtiel sleeppatroon
            dragPattern.innerHTML = `
                <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0; pointer-events: none;">
                    <!-- Hulplijnen voor intuïtieve feedback -->
                    <path 
                        d="M ${startPoint.x} ${startPoint.y} L ${controlPoint.x} ${controlPoint.y} L ${endPoint.x} ${endPoint.y}"
                        class="control-guide-line"
                    />
                    
                    <!-- Controlepunt indicator -->
                    <circle 
                        cx="${controlPoint.x}" 
                        cy="${controlPoint.y}" 
                        r="5" 
                        class="control-point-indicator"
                    />
                    
                    <!-- Richting indicatoren -->
                    <path 
                        d="M ${startPoint.x} ${startPoint.y} Q ${controlPoint.x} ${controlPoint.y} ${endPoint.x} ${endPoint.y}"
                        class="direction-indicator" 
                        stroke-dasharray="5,5"
                    />
                    
                    <!-- Interactie helper -->
                    <circle
                        cx="${controlPoint.x}"
                        cy="${controlPoint.y}"
                        r="30"
                        class="interaction-helper"
                        fill="none"
                        stroke="rgba(33, 150, 243, 0.1)"
                        stroke-width="1"
                        stroke-dasharray="3,3"
                    >
                        <animate attributeName="r" values="25;35;25" dur="4s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="4s" repeatCount="indefinite" />
                    </circle>
                </svg>
            `;
            
            // Voeg toe aan de verbinding element
            connEl.appendChild(dragPattern);
            
            // Voeg een animerende drag helper toe
            const dragHelper = document.createElement('div');
            dragHelper.className = 'drag-helper';
            
            // Creëer cirkel rondom controlepunt
            const dragGuide = document.createElement('div');
            dragGuide.className = 'drag-guide';
            dragGuide.style.left = `${controlPoint.x}px`;
            dragGuide.style.top = `${controlPoint.y}px`;
            
            dragHelper.appendChild(dragGuide);
            connEl.appendChild(dragHelper);
        };

        // Update sleeppatroon tijdens beweging
        window.updateDragPattern = function(connEl, startPoint, endPoint, controlPoint) {
            const dragPattern = connEl.querySelector('.connection-drag-pattern');
            if (dragPattern) {
                const svg = dragPattern.querySelector('svg');
                if (svg) {
                    // Update hulplijnen
                    const guideLine = svg.querySelector('.control-guide-line');
                    if (guideLine) {
                        guideLine.setAttribute('d', `M ${startPoint.x} ${startPoint.y} L ${controlPoint.x} ${controlPoint.y} L ${endPoint.x} ${endPoint.y}`);
                    }
                    
                    // Update controlepunt indicator
                    const controlIndicator = svg.querySelector('.control-point-indicator');
                    if (controlIndicator) {
                        controlIndicator.setAttribute('cx', controlPoint.x);
                        controlIndicator.setAttribute('cy', controlPoint.y);
                    }
                    
                    // Update richtingindicator
                    const directionIndicator = svg.querySelector('.direction-indicator');
                    if (directionIndicator) {
                        directionIndicator.setAttribute('d', `M ${startPoint.x} ${startPoint.y} Q ${controlPoint.x} ${controlPoint.y} ${endPoint.x} ${endPoint.y}`);
                    }
                    
                    // Update interactiehelper
                    const interactionHelper = svg.querySelector('.interaction-helper');
                    if (interactionHelper) {
                        interactionHelper.setAttribute('cx', controlPoint.x);
                        interactionHelper.setAttribute('cy', controlPoint.y);
                    }
                }
            }
            
            // Update dragGuide positie
            const dragGuide = connEl.querySelector('.drag-guide');
            if (dragGuide) {
                dragGuide.style.left = `${controlPoint.x}px`;
                dragGuide.style.top = `${controlPoint.y}px`;
            }
        };

        // Verwijder sleeppatroon
        window.removeDragPattern = function(connEl) {
            const dragPattern = connEl.querySelector('.connection-drag-pattern');
            if (dragPattern) dragPattern.remove();
            
            const dragHelper = connEl.querySelector('.drag-helper');
            if (dragHelper) dragHelper.remove();
        };

        // Start verslepen van een verbinding
        window.startConnectionDrag = function(e, connection, connEl, startPoint, controlPoint, endPoint) {
            // Sla huidige staat op VOOR het verslepen
            if (typeof saveStateForUndo === 'function') {
                saveStateForUndo();
            }
            
            // Set up de sleepstatus
            window.SharedState.isDraggingConnection = true;
            window.SharedState.activeConnectionPath = connection.id;
            
            // Zorg ervoor dat deze verbinding geselecteerd is
            currentSelectedNode = connection.id;
            currentSelectedConnection = connection;
            
            // Voeg actieve verbinding klasse toe voor visuele feedback
            connEl.classList.add('active-connection');
            
            // Toon elegant sleeppatroon
            showDragPattern(connEl, startPoint, endPoint, controlPoint);
            
            // Startpositie voor slepen
            const startX = e.clientX;
            const startY = e.clientY;
            const startPointX = controlPoint.x;
            const startPointY = controlPoint.y;
            
            // Bepaal of dit een aftakking is
            const isCurrentConnectionBranch = connection.isTrueBranch;
            
            // Als dit een hoofd-verbinding is en CTRL ingedrukt is tijdens het slepen,
            // reset alle offsets van de aftakkingen
            if (!isCurrentConnectionBranch && e.ctrlKey) {
                const branchConnections = connections.filter(conn => 
                    conn.isTrueBranch && conn.parentConnectionId === connection.id
                );
                
                if (branchConnections.length > 0) {
                    branchConnections.forEach(branch => {
                        if (branch.branchPointOffset) {
                            delete branch.branchPointOffset;
                        }
                    });
                    
                    showSubtleToast('Aftakkingen zijn gereset naar de hoofdverbinding');
                }
            }
            
            // Kijk of deze verbinding aftakkingen heeft voordat we gaan slepen
            const hasBranches = !isCurrentConnectionBranch && connections.some(conn => 
                conn.isTrueBranch && conn.parentConnectionId === connection.id
            );
            
            if (hasBranches) {
                // Toon een hint naar de gebruiker dat aftakkingen mee zullen bewegen
                showSubtleToast('Aftakkingen bewegen mee met deze verbinding');
                
                // Toon een hint over CTRL+slepen om de offsets te resetten, alleen als er al offsets zijn
                const hasOffsettedBranches = connections.some(conn => 
                    conn.isTrueBranch && 
                    conn.parentConnectionId === connection.id && 
                    conn.branchPointOffset
                );
                
                if (hasOffsettedBranches) {
                    setTimeout(() => {
                        showSubtleToast('CTRL+slepen om aftakkingen te resetten');
                    }, 2500);
                }
            }
            
            function handleDrag(e) {
                // Voorkom dat andere handelingen gebeuren tijdens het slepen
                e.preventDefault();
                e.stopPropagation();
                
                // Bereken nieuwe positie
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                controlPoint.x = startPointX + deltaX / zoomLevel;
                controlPoint.y = startPointY + deltaY / zoomLevel;
                
                // Update verbinding gegevens
                connection.controlPoint = { x: controlPoint.x, y: controlPoint.y };
                
                // Teken lijn opnieuw en update alle aftakkingen
                updateConnectionPath(connEl, startPoint, endPoint, controlPoint, connection);
                
                // Update sleeppatroon
                updateDragPattern(connEl, startPoint, endPoint, controlPoint);
            }
            
            function handleDragEnd(e) {
                // Controleer of het controlepunt daadwerkelijk is verplaatst
                // door te vergelijken met de startpositie
                const hasControlPointMoved = (
                    Math.abs(startPointX - controlPoint.x) > 1 || 
                    Math.abs(startPointY - controlPoint.y) > 1
                );
                
                // Bij het begin van de sleepactie hebben we al een staat opgeslagen,
                // dus hoeven we dat nu niet nog eens te doen
                if (hasControlPointMoved) {
                    // Zorg ervoor dat de controlPoint eigenschap goed is bijgewerkt
                    connection.controlPoint = { x: controlPoint.x, y: controlPoint.y };
                    
                    // We behandelen nu een aftakking en een gewone verbinding verschillend
                    if (isCurrentConnectionBranch) {
                        // Dit is een aftakking, update alleen deze specifieke aftakking
                        
                        // Bereken en bewaar de offset voor het controlepunt ook voor branches
                        const midX = (startPoint.x + endPoint.x) / 2;
                        const midY = (startPoint.y + endPoint.y) / 2;
                        
                        connection.controlPointOffset = {
                            x: controlPoint.x - midX,
                            y: controlPoint.y - midY
                        };
                        
                        updateConnectionPath(connEl, startPoint, endPoint, controlPoint, connection);
                        
                        // Als dit een trueBranch is (aftakking van de verbindingslijn),
                        // bewaren we de offset in plaats van de aftakking volledig los te koppelen
                        if (connection.isTrueBranch) {
                            // Bereken en bewaar de offset t.o.v. de originele positie op de parent-lijn
                            // Dit combineert individuele verplaatsing met meebewegen met de parent
                            
                            // Zoek eerst de parent verbinding
                            const parentConnection = connections.find(conn => conn.id === connection.parentConnectionId);
                            if (parentConnection) {
                                // Bereken waar dit punt zou moeten zijn zonder offset
                                const expectedPosition = calculatePointOnConnection(
                                    parentConnection, connection.branchPointRelativePosition
                                );
                                
                                if (expectedPosition) {
                                    // Bereken het verschil (offset) tussen de verwachte en de huidige positie
                                    connection.branchPointOffset = {
                                        x: connection.branchPointPosition.x - expectedPosition.x,
                                        y: connection.branchPointPosition.y - expectedPosition.y
                                    };
                                }
                            }
                        }
                    } else {
                        // Dit is een gewone verbinding, update standaard gegevens
                        
                        // Bereken en bewaar de offset voor het controlepunt
                        const midX = (startPoint.x + endPoint.x) / 2;
                        const midY = (startPoint.y + endPoint.y) / 2;
                        
                        connection.controlPointOffset = {
                            x: controlPoint.x - midX,
                            y: controlPoint.y - midY
                        };
                        
                        updateConnectionPath(connEl, startPoint, endPoint, controlPoint, connection);
                        
                        if (hasBranches) {
                            // Zorg ervoor dat alle branch verbindingen correct worden weergegeven
                            
                            // Update alle branch startpunten om ervoor te zorgen dat ze op de juiste plaats blijven
                            updateBranchStartPoints(connection);
                        }
                    }
                } else {
                    // Omdat het controlepunt niet is verplaatst, kunnen we de undo-actie verwijderen
                    if (undoStack.length > 0 && typeof undoStack.pop === 'function') {
                        undoStack.pop();
                    }
                }
                
                // Clean up
                window.SharedState.isDraggingConnection = false;
                window.SharedState.activeConnectionPath = null;
                connEl.classList.remove('active-connection');
                removeDragPattern(connEl);
                
                // Verwijder event listeners
                document.removeEventListener('mousemove', handleDrag);
                document.removeEventListener('mouseup', handleDragEnd);
                
                // Update gerelateerde Y-vertakkingen indien nodig, maar alleen voor gewone verbindingen
                if (connection.isYBranch && !connection.isTrueBranch) {
                    updateRelatedYBranches(connection);
                }
                
                // Vernieuw alle verbindingen voor consistente weergave
                refreshConnections();
                
                // Hint naar de gebruiker
                if (hasControlPointMoved) {
                    if (hasBranches && !isCurrentConnectionBranch) {
                        showSubtleToast('Verbinding en aftakkingen aangepast');
                    } else if (isCurrentConnectionBranch) {
                        showSubtleToast('Aftakking individueel aangepast');
                    } else {
                        showSubtleToast('Verbinding aangepast');
                    }
                }
            }
            
            // Voeg tijdelijke document-brede event listeners toe voor slepen
            document.addEventListener('mousemove', handleDrag);
            document.addEventListener('mouseup', handleDragEnd);
            
            // Voorkom dat de event bubbelt
            e.preventDefault();
            e.stopPropagation();
        };

        // Update gerelateerde Y-vertakkingen als er één wordt verplaatst
        window.updateRelatedYBranches = function(connection) {
            // Vind de bron-verbinding (als deze bestaat)
            const sourceConnections = connections.filter(conn => 
                !conn.isYBranch && 
                (conn.source === connection.source || conn.target === connection.source)
            );
            
            if (sourceConnections.length > 0) {
                // Zoek alle andere Y-vertakkingen die dezelfde bron hebben
                const relatedBranches = connections.filter(conn => 
                    conn.isYBranch && 
                    conn.source === connection.source && 
                    conn.id !== connection.id
                );
                
                // Update controlepunten van gerelateerde vertakkingen
                relatedBranches.forEach(branch => {
                    if (connection.controlPoint) {
                        branch.controlPoint = { 
                            x: connection.controlPoint.x, 
                            y: connection.controlPoint.y 
                        };
                    }
                });
                
                // Vernieuw de verbindingen
                refreshConnections();
            }
            
            // Update ook alle aftakkingen
            updateBranchStartPoints(connection);
        };
        
        console.log('Interaction module geladen');
    });
}