/**
 * connections/core.js - Core connection management functionality
 */

// Registreer module bij de loader
if (typeof ConnectionModules !== 'undefined') {
    ConnectionModules.registerModule('core', function() {
        console.log('Core module laden - verbinding basisfuncties exporteren');
        
        // Verbinding maken tussen knooppunten
        window.createConnection = function(sourceId, targetId, isYBranch = false) {
            // Valideer eerst of beide nodes bestaan
            const sourceExists = nodes.some(n => n.id === sourceId);
            const targetExists = nodes.some(n => n.id === targetId);
            
            if (!sourceExists || !targetExists) {
                console.error(`[createConnection] Kan geen verbinding maken - nodes bestaan niet`);
                console.error(`  Source (${sourceId}) bestaat: ${sourceExists}`);
                console.error(`  Target (${targetId}) bestaat: ${targetExists}`);
                console.error('Beschikbare nodes:', nodes.map(n => n.id));
                return null;
            }
            
            // Controleer of de verbinding al bestaat
            if (!isYBranch && connections.some(conn => 
                (conn.source === sourceId && conn.target === targetId) || 
                (conn.source === targetId && conn.target === sourceId)
            )) {
                return null;
            }
            
            // Generate unique connection ID
            const connectionId = IDGenerator.generateConnectionId();
            
            // Maak verbinding object
            const newConnection = {
                id: connectionId,
                source: sourceId,
                target: targetId,
                isYBranch: isYBranch,
                label: '',
                styleClass: ''
            };
            
            // Voeg toe aan array
            connections.push(newConnection);
            
            // Teken de verbinding
            drawConnection(newConnection);
            
            return newConnection;
        };

        // Verbinding verwijderen
        window.deleteConnection = function(connectionId) {
            // Sla huidige staat op voor undo functionaliteit
            if (typeof saveStateForUndo === 'function') {
                saveStateForUndo();
            }
            
            // Vind de index
            const connIndex = connections.findIndex(c => c.id === connectionId);
            
            if (connIndex !== -1) {
                // Verwijder uit de array
                connections.splice(connIndex, 1);
                
                // Verwijder het DOM element
                const connEl = document.getElementById(connectionId);
                if (connEl) {
                    connEl.remove();
                }
                
                // Reset selectie als deze connectie was geselecteerd
                if (currentSelectedNode === connectionId) {
                    currentSelectedNode = null;
                    currentSelectedConnection = null;
                }
                
                showSubtleToast('Verbinding verwijderd');
            }
        };

        // Valideer verbindingen
        window.validateConnections = function() {
            let invalidConnections = [];
            
            connections.forEach((conn, index) => {
                const sourceExists = nodes.some(n => n.id === conn.source);
                const targetExists = nodes.some(n => n.id === conn.target);
                
                if (!sourceExists || !targetExists) {
                    console.warn(`[validateConnections] Ongeldige verbinding gevonden: ${conn.id}`);
                    console.warn(`  Source (${conn.source}) bestaat: ${sourceExists}`);
                    console.warn(`  Target (${conn.target}) bestaat: ${targetExists}`);
                    
                    // VERWIJDERD: Automatisch herstel logica
                    // Dit veroorzaakte problemen waarbij opzettelijk verwijderde verbindingen
                    // weer werden "hersteld" tijdens refreshConnections
                    
                    // Markeer direct voor verwijdering als nodes niet bestaan
                    invalidConnections.push(index);
                }
            });
            
            // Verwijder ongeldige verbindingen (van achter naar voren om indices intact te houden)
            for (let i = invalidConnections.length - 1; i >= 0; i--) {
                const index = invalidConnections[i];
                const conn = connections[index];
                console.warn(`[validateConnections] Verwijder ongeldige verbinding: ${conn.id}`);
                
                // Verwijder DOM element
                const connEl = document.getElementById(conn.id);
                if (connEl) {
                    connEl.remove();
                }
                
                // Verwijder uit array
                connections.splice(index, 1);
            }
            
            return {
                removed: invalidConnections.length,
                repaired: 0  // Geen herstel meer
            };
        };

        // Vernieuw alle verbindingen
        window.refreshConnections = function() {
            console.log("[DEBUG refreshConnections] Start - Aantal verbindingen:", connections.length);
            console.log("[DEBUG refreshConnections] Verbindingen voor validatie:", connections.map(c => ({ id: c.id, source: c.source, target: c.target })));
            
            // Valideer eerst alle verbindingen
            const validationResult = validateConnections();
            
            if (validationResult.removed > 0 || validationResult.repaired > 0) {
                console.log(`[refreshConnections] Validatie resultaat: ${validationResult.removed} verwijderd, ${validationResult.repaired} hersteld`);
            }
            
            console.log("[DEBUG refreshConnections] Na validatie - Aantal verbindingen:", connections.length);
            console.log("[DEBUG refreshConnections] Verbindingen na validatie:", connections.map(c => ({ id: c.id, source: c.source, target: c.target })));
            
            // Teken alle geldige verbindingen
            connections.forEach(conn => {
                drawConnection(conn);
            });
        };
        
        console.log('Connections core module geladen');
    });
}