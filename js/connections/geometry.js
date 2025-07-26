/**
 * connections/geometry.js - Geometric calculations for connections
 */

// Registreer module bij de loader
if (typeof ConnectionModules !== 'undefined') {
    ConnectionModules.registerModule('geometry', function() {
        console.log('Geometry module laden - geometrische functies exporteren');
        
        // CENTRALE CURVE CONFIGURATIE
        window.CURVE_CONFIG = {
            MIN_DISTANCE: 50,               // Minimale afstand voor bijna-rechte lijn
            TRANSITION_END: 400,            // Einde van transitie zone (volledige curve)
            MIN_CURVE_STRENGTH: 0.01,       // Minimale curve sterkte (nooit helemaal recht)
            MAX_CURVE_STRENGTH: 0.3         // Maximale curve sterkte voor lange verbindingen
        };
        
        // Centrale functie om curve parameters te berekenen
        window.calculateCurveParameters = function(distance, isYBranch = false) {
            const config = window.CURVE_CONFIG;
            
            // Resultaat object
            const result = {
                useStraightLine: false,
                curveStrength: 0,
                perpDistance: 0
            };
            
            // NIEUWE LOGICA: Curve neemt af naarmate nodes dichterbij komen
            let curveStrength;
            
            if (distance <= config.MIN_DISTANCE) {
                // Zeer korte afstand: minimale curve (bijna recht, maar niet helemaal)
                curveStrength = config.MIN_CURVE_STRENGTH;
            } else if (distance >= config.TRANSITION_END) {
                // Lange afstand: maximale curve
                curveStrength = config.MAX_CURVE_STRENGTH;
            } else {
                // Transitie zone: curve neemt geleidelijk af
                // Progress van 0 (bij MIN_DISTANCE) tot 1 (bij TRANSITION_END)
                const progress = (distance - config.MIN_DISTANCE) / 
                               (config.TRANSITION_END - config.MIN_DISTANCE);
                
                // Gebruik een inverse cubic easing voor natuurlijke overgang
                // Dit zorgt ervoor dat de curve sneller afvlakt bij kortere afstanden
                const eased = progress * progress * progress;
                
                // Interpoleer tussen minimum en maximum curve sterkte
                curveStrength = config.MIN_CURVE_STRENGTH + 
                               (config.MAX_CURVE_STRENGTH - config.MIN_CURVE_STRENGTH) * eased;
            }
            
            // Nooit een volledig rechte lijn gebruiken
            result.useStraightLine = false;
            
            // Y-vertakkingen krijgen extra curve
            if (isYBranch) {
                curveStrength *= 1.5;
            }
            
            // Bereken perpendicular distance
            // Gebruik een minimum perpDistance om te voorkomen dat de curve inklapt
            // Bij korte afstanden wordt de perpDistance een vaste minimale waarde
            result.curveStrength = curveStrength;
            
            // Bereken basis perpDistance
            let perpDistance = distance * curveStrength;
            
            // Zorg voor een minimum perpDistance om inklappen te voorkomen
            const minPerpDistance = 10; // pixels
            if (perpDistance < minPerpDistance && distance > config.MIN_DISTANCE) {
                perpDistance = minPerpDistance;
            }
            
            result.perpDistance = perpDistance;
            
            return result;
        };
        
        // Globale hulpfunctie voor consistente coördinaatberekeningen
        window.getMousePositionOnCanvas = function(e) {
            const canvasRect = canvas.getBoundingClientRect();
            return {
                x: (e.clientX - canvasRect.left) / zoomLevel,
                y: (e.clientY - canvasRect.top) / zoomLevel
            };
        };

        // Bereken middenpunt van knooppunten op basis van hun vorm en tekst
        window.getNodeCenter = function(node) {
            let width = 120;
            let height = 60;
            
            // Pas breedte en hoogte aan op basis van vorm
            if (node.shape === 'circle') {
                width = height = 120;
            } else if (node.shape === 'diamond') {
                width = height = 120;
            }
            
            // Voor rechthoekige nodes, bereken de werkelijke breedte op basis van tekst
            if (node.shape === 'rectangle' || node.shape === 'rounded') {
                const actualWidth = calculateActualNodeWidth(node);
                width = Math.max(width, actualWidth); // Gebruik minimaal 120px, maar meer als nodig
            }
            
            return {
                x: node.x + width / 2,
                y: node.y + height / 2
            };
        };

        // Bereken de werkelijke breedte van een node op basis van tekst inhoud
        window.calculateActualNodeWidth = function(node) {
            try {
                // Zoek het DOM element van de node
                const nodeEl = document.getElementById(node.id);
                if (!nodeEl) return 120; // Fallback naar standaard breedte
                
                // Gebruik de werkelijke breedte van het element
                const computedStyle = window.getComputedStyle(nodeEl);
                const actualWidth = nodeEl.offsetWidth;
                
                // Retourneer de werkelijke breedte, maar minimaal 120px
                return Math.max(120, actualWidth);
            } catch (error) {
                console.warn('Kon node breedte niet berekenen:', error);
                return 120; // Fallback
            }
        };

        // Bereken visueel middenpunt voor betere connection rendering
        window.getVisualNodeCenter = function(node) {
            try {
                const nodeEl = document.getElementById(node.id);
                if (!nodeEl) return getNodeCenter(node); // Fallback
                
                const rect = nodeEl.getBoundingClientRect();
                const canvasRect = canvas.getBoundingClientRect();
                
                // Bereken de werkelijke visuele center rekening houdend met zoom
                return {
                    x: node.x + (rect.width / zoomLevel) / 2,
                    y: node.y + (rect.height / zoomLevel) / 2
                };
            } catch (error) {
                console.warn('Kon visueel middenpunt niet berekenen:', error);
                return getNodeCenter(node); // Fallback
            }
        };

        // Functie om randpunten te berekenen voor verbindingen met nodes
        window.getNodeEdgePoint = function(node, angle, isSource, controlPoint = null) {
            const center = getVisualNodeCenter(node);
            
            // Als we een controlPoint hebben, gebruik dat voor betere hoekberekening
            if (controlPoint) {
                const dx = isSource ? 
                    (controlPoint.x - center.x) : 
                    (center.x - controlPoint.x);
                const dy = isSource ? 
                    (controlPoint.y - center.y) : 
                    (center.y - controlPoint.y);
                angle = Math.atan2(dy, dx);
            }
            
            // Bepaal werkelijke afmetingen van de node
            let width = 120;
            let height = 60;
            
            if (node.shape === 'circle') {
                width = height = 120;
            } else if (node.shape === 'diamond') {
                width = height = 120;
            } else if (node.shape === 'rectangle' || node.shape === 'rounded') {
                // Gebruik werkelijke breedte voor betere edge point berekening
                width = calculateActualNodeWidth(node);
            }
            
            let radius;
            
            // Bepaal de radius op basis van de vorm en de hoek
            if (node.shape === 'circle') {
                radius = 60; // Circle radius
            } else if (node.shape === 'diamond') {
                // Voor een ruit is de radius afhankelijk van de hoek
                const normalizedAngle = (angle + Math.PI * 2) % (Math.PI * 2);
                const rotatedAngle = normalizedAngle - Math.PI / 4; // Diamond is rotated 45 degrees
                radius = 50 / Math.max(Math.abs(Math.cos(rotatedAngle)), Math.abs(Math.sin(rotatedAngle)));
            } else {
                // Rechthoekige vormen - nauwkeurigere berekening
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
                
                // Kleine correctie voor visuele aansluiting
                radius -= 1;
            }
            
            // Pas de richting aan afhankelijk van of het een bron of doel is
            const dir = isSource ? 1 : -1;
            
            // Voeg een kleine offset toe voor betere visuele aansluiting
            // Dit voorkomt dat lijnen "in" de node lijken te eindigen
            const visualOffset = 2; // pixels
            const offsetRadius = radius + visualOffset;
            
            return {
                x: center.x + Math.cos(angle) * offsetRadius * dir,
                y: center.y + Math.sin(angle) * offsetRadius * dir
            };
        };

        // Helper functie om een punt op een bezier curve te vinden
        window.getBezierPoint = function(startPoint, controlPoint, endPoint, t) {
            // Quadratische Bezier formule: B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
            const x = Math.pow(1-t, 2) * startPoint.x + 
                    2 * (1-t) * t * controlPoint.x + 
                    Math.pow(t, 2) * endPoint.x;
            
            const y = Math.pow(1-t, 2) * startPoint.y + 
                    2 * (1-t) * t * controlPoint.y + 
                    Math.pow(t, 2) * endPoint.y;
            
            return { x, y };
        };

        // Helper functie om dichtstbijzijnde punt op curve te vinden
        window.findNearestPointOnCurve = function(startPoint, controlPoint, endPoint, targetPoint, numSegments = 20) {
            let minDistance = Infinity;
            let nearestPoint = null;
            
            // Bereken punten op de curve
            for (let i = 0; i <= numSegments; i++) {
                const t = i / numSegments;
                const x = Math.pow(1-t, 2) * startPoint.x + 2 * (1-t) * t * controlPoint.x + Math.pow(t, 2) * endPoint.x;
                const y = Math.pow(1-t, 2) * startPoint.y + 2 * (1-t) * t * controlPoint.y + Math.pow(t, 2) * endPoint.y;
                
                // Bereken afstand tot doelpunt
                const distance = Math.sqrt(Math.pow(x - targetPoint.x, 2) + Math.pow(y - targetPoint.y, 2));
                
                // Als dit dichterbij is, update nearest
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestPoint = { x, y, t };
                }
            }
            
            return nearestPoint;
        };

        // Vind de relatieve positie (t-waarde) van een punt op een verbindingslijn
        window.findRelativePositionOnConnection = function(connection, pointPos, numSegments = 50) {
            // Bereken start-, controle- en eindpunten van de verbindingslijn
            const sourceNode = nodes.find(n => n.id === connection.source);
            const targetNode = nodes.find(n => n.id === connection.target);
            
            if (!sourceNode || !targetNode) return 0.5; // Fallback
            
            // Bereken de noodzakelijke punten
            const sourceCenter = getVisualNodeCenter(sourceNode);
            const targetCenter = getVisualNodeCenter(targetNode);
            
            // Bereken de hoek van de lijn
            const dx = targetCenter.x - sourceCenter.x;
            const dy = targetCenter.y - sourceCenter.y;
            const angle = Math.atan2(dy, dx);
            
            // Bereken randpunten op beide knooppunten
            const startPoint = getNodeEdgePoint(sourceNode, angle, true);
            const endPoint = getNodeEdgePoint(targetNode, angle, false);
            
            // Gebruik het opgeslagen controlepunt indien beschikbaar
            let controlPoint;
            if (connection.controlPoint) {
                controlPoint = connection.controlPoint;
            } else {
                // Standaard controlepunt berekenen met afstand-gebaseerde curve
                const midX = (startPoint.x + endPoint.x) / 2;
                const midY = (startPoint.y + endPoint.y) / 2;
                
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Gebruik centrale curve berekeningsfunctie
                const curveParams = calculateCurveParameters(distance, false);
                
                // Bereken een punt loodrecht op de lijn voor een mooie curve
                const perpAngle = angle + Math.PI / 2;
                controlPoint = {
                    x: midX + Math.cos(perpAngle) * curveParams.perpDistance,
                    y: midY + Math.sin(perpAngle) * curveParams.perpDistance
                };
            }
            
            // Zoek het dichtstbijzijnde punt op de curve en de bijbehorende t-waarde
            const nearestPoint = findNearestPointOnCurve(startPoint, controlPoint, endPoint, pointPos, numSegments);
            
            return nearestPoint ? nearestPoint.t : 0.5; // Fallback naar het midden
        };

        // Bereken punt op de verbindingscurve voor een gegeven t-waarde
        window.calculatePointOnConnection = function(connection, tValue) {
            if (!connection) return null;
            
            // Vind de betrokken nodes
            const sourceNode = nodes.find(n => n.id === connection.source);
            const targetNode = nodes.find(n => n.id === connection.target);
            
            if (!sourceNode || !targetNode) {
                console.warn(`[calculatePointOnConnection] Kon nodes niet vinden voor verbinding. Source: ${connection.source}, Target: ${connection.target}`);
                return null;
            }
            
            // Bereken de noodzakelijke punten
            const sourceCenter = getVisualNodeCenter(sourceNode);
            const targetCenter = getVisualNodeCenter(targetNode);
            
            // Bereken de hoek van de lijn
            const dx = targetCenter.x - sourceCenter.x;
            const dy = targetCenter.y - sourceCenter.y;
            const angle = Math.atan2(dy, dx);
            
            // Bereken randpunten op beide knooppunten
            const startPoint = getNodeEdgePoint(sourceNode, angle, true);
            const endPoint = getNodeEdgePoint(targetNode, angle, false);
            
            // Gebruik het opgeslagen controlepunt indien beschikbaar
            let controlPoint;
            
            // Als de connection een controlPointOffset heeft, gebruik die om het control point te berekenen
            if (connection.controlPointOffset) {
                const midX = (startPoint.x + endPoint.x) / 2;
                const midY = (startPoint.y + endPoint.y) / 2;
                
                controlPoint = {
                    x: midX + connection.controlPointOffset.x,
                    y: midY + connection.controlPointOffset.y
                };
            } else if (connection.controlPoint) {
                controlPoint = connection.controlPoint;
            } else {
                // Standaard controlepunt berekenen met afstand-gebaseerde curve
                const midX = (startPoint.x + endPoint.x) / 2;
                const midY = (startPoint.y + endPoint.y) / 2;
                
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Gebruik centrale curve berekeningsfunctie
                const curveParams = calculateCurveParameters(distance, false);
                
                // Bereken een punt loodrecht op de lijn voor een mooie curve
                const perpAngle = angle + Math.PI / 2;
                controlPoint = {
                    x: midX + Math.cos(perpAngle) * curveParams.perpDistance,
                    y: midY + Math.sin(perpAngle) * curveParams.perpDistance
                };
            }
            
            // Bereken het punt op de Bezier curve
            const t = Math.max(0, Math.min(1, tValue)); // Begrens t tussen 0 en 1
            const x = Math.pow(1-t, 2) * startPoint.x + 2 * (1-t) * t * controlPoint.x + Math.pow(t, 2) * endPoint.x;
            const y = Math.pow(1-t, 2) * startPoint.y + 2 * (1-t) * t * controlPoint.y + Math.pow(t, 2) * endPoint.y;
            
            return { x, y };
        };

        // Optimaliseer het controlepunt van een verbinding
        window.recalculateControlPoint = function(connection, preserveDirection = false) {
            if (!connection) return;
            
            // Voor gewone verbindingen tussen nodes
            const sourceNode = nodes.find(n => n.id === connection.source);
            const targetNode = nodes.find(n => n.id === connection.target);
            
            // Voor aftakkingen met een branchPointPosition
            let startPoint, endPoint;
            
            if (connection.isTrueBranch && connection.branchPointPosition) {
                // Voor aftakkingen, gebruik het branchPointPosition als startpunt
                startPoint = connection.branchPointPosition;
                
                if (targetNode) {
                    const targetCenter = getVisualNodeCenter(targetNode);
                    const dx = targetCenter.x - startPoint.x;
                    const dy = targetCenter.y - startPoint.y;
                    const angle = Math.atan2(dy, dx);
                    endPoint = getNodeEdgePoint(targetNode, angle, false);
                } else {
                    return; // Kan niet verder zonder eindpunt
                }
            } else {
                // Voor normale verbindingen
                if (!sourceNode || !targetNode) return;
                
                const sourceCenter = getVisualNodeCenter(sourceNode);
                const targetCenter = getVisualNodeCenter(targetNode);
                
                // Bereken hoek tussen nodes
                const dx = targetCenter.x - sourceCenter.x;
                const dy = targetCenter.y - sourceCenter.y;
                const angle = Math.atan2(dy, dx);
                
                // Bereken rand punten
                startPoint = getNodeEdgePoint(sourceNode, angle, true);
                endPoint = getNodeEdgePoint(targetNode, angle, false);
            }
            
            // Bereken midpunt en afstand
            const midX = (startPoint.x + endPoint.x) / 2;
            const midY = (startPoint.y + endPoint.y) / 2;
            
            const dx = endPoint.x - startPoint.x;
            const dy = endPoint.y - startPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            const perpAngle = angle + Math.PI / 2;
            
            // Voor echte aftakkingen met een aftakkingspunt, speciale behandeling
            if (connection.isTrueBranch && connection.branchPointPosition) {
                // Voor aftakkingen gebruiken we een specifieke benadering
                const branchToTargetDistance = Math.sqrt(
                    Math.pow(endPoint.x - connection.branchPointPosition.x, 2) + 
                    Math.pow(endPoint.y - connection.branchPointPosition.y, 2)
                );
                
                // Gebruik een factor die afhangt van de afstand tussen aftakking en doel
                const branchBendFactor = Math.min(0.3, Math.max(0.15, branchToTargetDistance / 600));
                
                // Voor aftakkingen berekenen we een speciaal controlepunt
                const branchToTargetAngle = Math.atan2(
                    endPoint.y - connection.branchPointPosition.y,
                    endPoint.x - connection.branchPointPosition.x
                );
                
                // Bereken een controlepunt voor de aftakking
                const branchMidX = (connection.branchPointPosition.x + endPoint.x) / 2;
                const branchMidY = (connection.branchPointPosition.y + endPoint.y) / 2;
                
                // Gebruik de hoek vanaf het aftakkingspunt naar het doelpunt
                connection.controlPoint = {
                    x: branchMidX + Math.cos(branchToTargetAngle + Math.PI/2) * branchToTargetDistance * branchBendFactor,
                    y: branchMidY + Math.sin(branchToTargetAngle + Math.PI/2) * branchToTargetDistance * branchBendFactor
                };
                
                return; // We hebben de aftakking verwerkt, dus we zijn klaar
            }
            
            // Voor normale verbindingen: gebruik de centrale curve berekeningsfunctie
            const curveParams = calculateCurveParameters(distance, connection.isYBranch);
            
            // Als de verbinding al een controlepunt heeft en we willen de richting behouden
            if (connection.controlPoint && preserveDirection) {
                // Bereken de originele richting van de bocht (links of rechts van de lijn)
                const origDx = connection.controlPoint.x - midX;
                const origDy = connection.controlPoint.y - midY;
                
                // Bepaal of het controlepunt links of rechts van de verbindingslijn was
                const crossProduct = dx * origDy - dy * origDx;
                const signPreservation = Math.sign(crossProduct);
                
                // Voor curves, gebruik de berekende perpDistance met richting behoud
                connection.controlPoint = {
                    x: midX + Math.cos(perpAngle) * curveParams.perpDistance * signPreservation,
                    y: midY + Math.sin(perpAngle) * curveParams.perpDistance * signPreservation
                };
            } else {
                // Geen bestaand controlepunt - gebruik de centrale functie
                // Voor curves, standaard richting (perpendicular naar boven)
                connection.controlPoint = {
                    x: midX + Math.cos(perpAngle) * curveParams.perpDistance,
                    y: midY + Math.sin(perpAngle) * curveParams.perpDistance
                };
            }
        };
        
        // Optimaliseer connection rendering voor betere leesbaarheid
        window.optimizeConnectionRendering = function() {
            // Herbereken alle verbindingen met verbeterde centering
            connections.forEach(connection => {
                recalculateControlPoint(connection, false);
            });
            
            // Trigger een refresh van alle connections
            if (typeof refreshConnections === 'function') {
                refreshConnections();
            }
        };

        // Hulpfunctie om node wijzigingen te detecteren en connections te updaten
        window.updateConnectionsForNodeChange = function(nodeId) {
            // Vind alle verbindingen die deze node bevatten
            const affectedConnections = connections.filter(conn => 
                conn.source === nodeId || conn.target === nodeId
            );
            
            // Herbereken control points voor getroffen verbindingen
            affectedConnections.forEach(connection => {
                recalculateControlPoint(connection, false);
            });
            
            // Trigger refresh alleen voor getroffen verbindingen
            if (typeof refreshConnections === 'function') {
                refreshConnections();
            }
        };

        // Verbeterde connection point berekening met fallback
        window.getOptimalConnectionPoint = function(node, targetNode, isSource = true) {
            try {
                // Bereken visuele centers
                const nodeCenter = getVisualNodeCenter(node);
                const targetCenter = getVisualNodeCenter(targetNode);
                
                // Bereken hoek tussen nodes
                const dx = targetCenter.x - nodeCenter.x;
                const dy = targetCenter.y - nodeCenter.y;
                const angle = Math.atan2(dy, dx);
                
                // Gebruik source/target parameter om richting te bepalen
                const connectionAngle = isSource ? angle : angle + Math.PI;
                
                // Bereken het edge point
                return getNodeEdgePoint(node, connectionAngle, isSource);
            } catch (error) {
                console.warn('Fout bij berekenen optimaal connection point:', error);
                // Fallback naar standaard center
                return getNodeCenter(node);
            }
        };
        
        console.log('Geometry module geladen');
    });
}