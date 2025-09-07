/**
 * connections/utils.js - Utility functions for connections
 */

// Registreer module bij de loader
if (typeof ConnectionModules !== 'undefined') {
    ConnectionModules.registerModule('utils', function() {
        console.log('Utils module laden - utility functies exporteren');
        
        // Toon subtiele toast melding
        window.showSubtleToast = function(message) {
            // Verwijder bestaande subtiele toast
            const existingToast = document.querySelector('.subtle-toast');
            if (existingToast) existingToast.remove();
            
            // Maak nieuwe toast
            const toast = document.createElement('div');
            toast.className = 'subtle-toast';
            toast.textContent = message;
            
            // Voeg toe aan body
            document.body.appendChild(toast);
            
            // Animeer in
            setTimeout(() => toast.classList.add('show'), 10);
            
            // Animeer uit en verwijder
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 2000);
        };

        // VOLLEDIG VERBETERDE VERSIE van de addIntermediateNode functie
        // Deze functie wordt aangeroepen wanneer op het plusje van een verbindingslijn wordt geklikt
        // Maakt een tussennode (intermediate node) tussen twee verbonden nodes
        window.addIntermediateNode = function(connection, x, y) {
            // Sla huidige staat op voor undo functionaliteit
            if (typeof saveStateForUndo === 'function') {
                saveStateForUndo();
            }
            
            // Vind de bron- en doelknooppunten
            const sourceNode = nodes.find(n => n.id === connection.source);
            const targetNode = nodes.find(n => n.id === connection.target);
            
            if (!sourceNode || !targetNode) {
                console.error("[ERROR] Bron- of doelnode niet gevonden voor verbinding:", connection.id);
                showToast('Kon bron- of doelnode niet vinden', true);
                return;
            }
            
            // Bereken een offset om de node te centreren op het pluspunt
            const nodeWidth = 120;
            const nodeHeight = 60;
            
            const nodeX = x - (nodeWidth / 2);
            const nodeY = y - (nodeHeight / 2);
            
            // Bewaar de oorspronkelijke verbinding 
            const originalConnection = connection;
            const originalStyle = connection.styleClass || '';
            const originalLabel = connection.label || '';
            
            try {
                // 1. Eerst een nieuwe tussennode maken
                const newNode = createNode(
                    "Tussennode", 
                    '', 
                    sourceNode.color, 
                    nodeX,
                    nodeY,
                    'rounded',
                    null,
                    false
                );
                
                if (!newNode) {
                    console.error("[ERROR] Fout bij het aanmaken van de nieuwe tussennode");
                    showToast('Fout bij het aanmaken van de tussennode', true);
                    return;
                }
                
                // 2. Nieuwe verbindingen maken
                const conn1 = createConnection(sourceNode.id, newNode.id);
                const conn2 = createConnection(newNode.id, targetNode.id);
                
                if (!conn1 || !conn2) {
                    console.error("[ERROR] Kon geen nieuwe verbindingen maken tussen de nodes");
                    showToast('Fout bij het maken van verbindingen', true);
                    return;
                }
                
                // 3. Kopieer de stijl en eventueel label van de originele verbinding
                if (originalStyle) {
                    conn1.styleClass = originalStyle;
                    conn2.styleClass = originalStyle;
                }
                
                if (originalLabel) {
                    // Verplaats het label naar de eerste verbinding
                    conn1.label = originalLabel;
                }
                
                // 4. NU pas de originele verbinding verwijderen
                console.log("[DEBUG] Voor verwijderen - Aantal verbindingen:", connections.length);
                console.log("[DEBUG] Te verwijderen verbinding:", originalConnection.id);
                console.log("[DEBUG] Huidige verbindingen:", connections.map(c => ({ id: c.id, source: c.source, target: c.target })));
                
                const connectionIndex = connections.findIndex(c => c.id === originalConnection.id);
                
                if (connectionIndex !== -1) {
                    connections.splice(connectionIndex, 1);
                    console.log("[DEBUG] Na verwijderen - Aantal verbindingen:", connections.length);
                    
                    // Verwijder het DOM-element
                    const connEl = document.getElementById(originalConnection.id);
                    if (connEl) {
                        connEl.remove();
                        console.log("[DEBUG] DOM element verwijderd:", originalConnection.id);
                    } else {
                        console.warn("[WARNING] Kon DOM element voor verbinding niet vinden");
                    }
                } else {
                    console.warn("[WARNING] Kon verbinding niet vinden in connections array");
                }
                
                // 5. Vernieuw alle verbindingen om de stijlen toe te passen
                console.log("[DEBUG] Voor refreshConnections - Aantal verbindingen:", connections.length);
                console.log("[DEBUG] Verbindingen voor refresh:", connections.map(c => ({ id: c.id, source: c.source, target: c.target })));
                
                // Kleine vertraging om ervoor te zorgen dat DOM volledig is bijgewerkt
                setTimeout(() => {
                    refreshConnections();
                    console.log("[DEBUG] Na refreshConnections - Aantal verbindingen:", connections.length);
                }, 10);
                
                // 6. Selecteer de nieuwe node en maak deze meteen bewerkbaar
                // Controleer of er momenteel een selectie is
                if (currentSelectedNode || currentSelectedConnection) {
                    // Reset huidige geselecteerde elementen
                    const currentlySelectedNodeEl = document.getElementById(currentSelectedNode);
                    if (currentlySelectedNodeEl) {
                        currentlySelectedNodeEl.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                    }
                    
                    // Verwijder selectie zonder alle verbindingen opnieuw te tekenen
                    currentSelectedNode = null;
                    currentSelectedConnection = null;
                }
                
                // Stel nieuwe node in als geselecteerd
                currentSelectedNode = newNode.id;
                currentSelectedConnection = null; // Zorg dat er geen connection geselecteerd is
                
                const nodeEl = document.getElementById(newNode.id);
                
                if (nodeEl) {
                    // Markeer de node als geselecteerd
                    nodeEl.style.boxShadow = '0 0 0 2px #2196F3, 0 5px 15px rgba(0,0,0,0.3)';
                    
                    // Maak de titel direct bewerkbaar
                    const titleEl = nodeEl.querySelector('.node-title');
                    if (titleEl) {
                        // Klein vertraging om te zorgen dat de DOM volledig is bijgewerkt
                        setTimeout(() => {
                            // Scroll naar de node indien nodig
                            nodeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            makeEditable(titleEl, newNode);
                        }, 100);
                    } else {
                        console.warn("[WARNING] Kon titel element niet vinden");
                    }
                } else {
                    console.warn("[WARNING] Kon nieuwe node DOM element niet vinden");
                }
                
                // 7. Vernieuw de minimap
                updateMinimap();
                
                // 8. Gebruiksvriendelijk bericht
                showToast('Tussennode toegevoegd en verbonden');
                
            } catch (error) {
                console.error("%c[ERROR] Fout bij het toevoegen van de tussennode:", 
                    "background: #F44336; color: white; padding: 4px; border-radius: 4px");
                console.error(error);
                showToast('Er is een fout opgetreden bij het maken van de tussennode', true);
            }
        };
        
        console.log('Utils module geladen');
    });
}