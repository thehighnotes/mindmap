/**
 * connections/editor.js - Connection editing UI and functionality
 */

// Registreer module bij de loader
if (typeof ConnectionModules !== 'undefined') {
    ConnectionModules.registerModule('editor', function() {
        console.log('Editor module laden - verbinding editor functies exporteren');
        
        // Open verbinding bewerken modal
        window.openConnectionEditor = function(connection) {
            // Sla huidige staat op VOORDAT we de verbinding gaan bewerken
            if (typeof saveStateForUndo === 'function') {
                saveStateForUndo();
            }
            
            // Vul formulier met huidige waarden
            connectionLabel.value = connection.label || '';
            
            // Bepaal stijl en type uit de styleClass
            connectionStyle.value = connection.styleClass?.includes('dashed') ? 'dashed' : 'solid';
            
            if (connection.styleClass?.includes('primary')) {
                connectionType.value = 'primary';
            } else if (connection.styleClass?.includes('secondary')) {
                connectionType.value = 'secondary';
            } else {
                connectionType.value = 'default';
            }
            
            // Sla het te bewerken verbinding id op voor later gebruik
            connectionModal.dataset.connectionId = connection.id;
            
            // Toon de modal
            connectionModal.style.display = 'flex';
        };

        // Wijzigingen in verbinding opslaan
        window.saveConnectionEdits = function() {
            // Sla huidige staat op voor undo functionaliteit
            if (typeof saveStateForUndo === 'function') {
                saveStateForUndo();
            }
            
            const connectionId = connectionModal.dataset.connectionId;
            const connection = connections.find(c => c.id === connectionId);
            
            if (connection) {
                // Update verbinding
                connection.label = connectionLabel.value;
                
                // Reset stijlklasse
                connection.styleClass = '';
                
                // Stel lijnstijl in
                if (connectionStyle.value !== 'solid') {
                    connection.styleClass += ' ' + connectionStyle.value;
                }
                
                // Stel type in
                if (connectionType.value !== 'default') {
                    connection.styleClass += ' ' + connectionType.value;
                }
                
                // Teken de verbinding opnieuw
                refreshConnections();
                
                showSubtleToast('Verbinding bijgewerkt');
            }
            
            // Sluit de modal
            connectionModal.style.display = 'none';
        };

        // Verbindingsstijl instellen
        window.setConnectionStyle = function(connection, style) {
            // Verwijder bestaande stijlklassen
            connection.styleClass = connection.styleClass || '';
            connection.styleClass = connection.styleClass.replace(/\b(dashed|solid)\b/g, '').trim();
            
            // Voeg nieuwe stijlklasse toe
            if (style && style !== 'solid') {
                connection.styleClass += ' ' + style;
            }
            
            // Vernieuw de verbinding
            refreshConnections();
            
            showSubtleToast(`Verbinding stijl ingesteld op: ${style}`);
        };

        // Verbindingstype instellen
        window.setConnectionType = function(connection, type) {
            // Verwijder bestaande typeklassen
            connection.styleClass = connection.styleClass || '';
            connection.styleClass = connection.styleClass.replace(/\b(default|primary|secondary)\b/g, '').trim();
            
            // Voeg nieuwe typeklasse toe als het niet default is
            if (type && type !== 'default') {
                connection.styleClass += ' ' + type;
            }
            
            // Vernieuw de verbinding
            refreshConnections();
            
            showSubtleToast(`Verbinding type ingesteld op: ${type}`);
        };

        // Verbindingslabel instellen
        window.setConnectionLabel = function(connection, label) {
            connection.label = label || '';
            refreshConnections();
            
            if (label) {
                showSubtleToast('Verbindingslabel bijgewerkt');
            } else {
                showSubtleToast('Verbindingslabel verwijderd');
            }
        };

        // Toon context menu voor verbindingen
        window.showConnectionContextMenu = function(e, connection) {
            // Sluit bestaande context menu's
            contextMenu.style.display = 'none';
            
            // Sla connection id op in het menu
            connectionContextMenu.dataset.connectionId = connection.id;
            
            // Check huidige stijl en type om visuele feedback te geven
            document.querySelectorAll('[id^=connection-style-]').forEach(item => {
                const style = item.id.replace('connection-style-', '');
                item.style.fontWeight = connection.styleClass?.includes(style) ? 'bold' : 'normal';
            });
            
            document.querySelectorAll('[id^=connection-type-]').forEach(item => {
                const type = item.id.replace('connection-type-', '');
                if (type === 'default') {
                    item.style.fontWeight = !connection.styleClass?.includes('primary') && 
                                        !connection.styleClass?.includes('secondary') ? 'bold' : 'normal';
                } else {
                    item.style.fontWeight = connection.styleClass?.includes(type) ? 'bold' : 'normal';
                }
            });
            
            // Plaats en toon het menu
            connectionContextMenu.style.left = e.pageX + 'px';
            connectionContextMenu.style.top = e.pageY + 'px';
            connectionContextMenu.style.display = 'block';
            
            // Stel huidige geselecteerde verbinding in
            currentSelectedConnection = connection;
            currentSelectedNode = connection.id;
            
            // Teken de connectie opnieuw om geselecteerde staat te tonen
            drawConnection(connection);
            
            e.preventDefault();
        };
        
        console.log('Editor module geladen');
    });
}