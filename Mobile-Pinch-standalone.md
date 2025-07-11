<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Pinch Zoom Test - Centrum Vast</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            font-family: Arial, sans-serif;
            touch-action: none;
            background: #222;
        }
        
        #canvas {
            position: absolute;
            top: 0;
            left: 0;
            cursor: move;
        }
        
        #info {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 1000;
            min-width: 200px;
        }
        
        #info div {
            margin: 5px 0;
        }
        
        .label {
            display: inline-block;
            width: 100px;
            color: #aaa;
        }
        
        .value {
            color: #0ff;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div id="info">
        <div><span class="label">Zoom:</span> <span class="value" id="zoom">1.00</span>x</div>
        <div><span class="label">Offset:</span> <span class="value" id="offset">0, 0</span></div>
        <div><span class="label">Pinch centrum:</span> <span class="value" id="pinch-center">-</span></div>
        <div><span class="label">Afstand:</span> <span class="value" id="distance">-</span></div>
        <div><span class="label">Status:</span> <span class="value" id="status">Wacht op touch</span></div>
    </div>
    
    <canvas id="canvas"></canvas>
    
    <script>
        // Canvas setup
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        
        // State variabelen
        let zoom = 1;
        let offsetX = 0;
        let offsetY = 0;
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;
        
        // Pinch zoom state
        let isPinching = false;
        let pinchStartDistance = 0;
        let pinchStartZoom = 1;
        let pinchFixedPoint = null;
        let previousPinchCenter = null;
        let touches = {};
        
        // Info elements
        const infoZoom = document.getElementById('zoom');
        const infoOffset = document.getElementById('offset');
        const infoPinchCenter = document.getElementById('pinch-center');
        const infoDistance = document.getElementById('distance');
        const infoStatus = document.getElementById('status');
        
        // Resize canvas
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            draw();
        }
        
        // Teken functie
        function draw() {
            ctx.save();
            
            // Clear canvas
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Apply transform
            ctx.translate(offsetX, offsetY);
            ctx.scale(zoom, zoom);
            
            // Teken grid
            const gridSize = 50;
            const startX = Math.floor(-offsetX / zoom / gridSize) * gridSize;
            const endX = Math.floor((canvas.width - offsetX) / zoom / gridSize) * gridSize;
            const startY = Math.floor(-offsetY / zoom / gridSize) * gridSize;
            const endY = Math.floor((canvas.height - offsetY) / zoom / gridSize) * gridSize;
            
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1 / zoom;
            
            for (let x = startX; x <= endX; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, startY);
                ctx.lineTo(x, endY);
                ctx.stroke();
            }
            
            for (let y = startY; y <= endY; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(startX, y);
                ctx.lineTo(endX, y);
                ctx.stroke();
            }
            
            // Teken origine
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2 / zoom;
            ctx.beginPath();
            ctx.moveTo(-1000, 0);
            ctx.lineTo(1000, 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, -1000);
            ctx.lineTo(0, 1000);
            ctx.stroke();
            
            // Teken test objecten
            const objects = [
                { x: 0, y: 0, r: 30, color: '#ff0000' },
                { x: 100, y: 100, r: 20, color: '#00ff00' },
                { x: -100, y: 100, r: 20, color: '#0000ff' },
                { x: 100, y: -100, r: 20, color: '#ffff00' },
                { x: -100, y: -100, r: 20, color: '#ff00ff' }
            ];
            
            objects.forEach(obj => {
                ctx.fillStyle = obj.color;
                ctx.beginPath();
                ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
                ctx.fill();
                
                // Label
                ctx.fillStyle = 'white';
                ctx.font = `${12 / zoom}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`(${obj.x}, ${obj.y})`, obj.x, obj.y);
            });
            
            ctx.restore();
            
            // Teken touch punten (niet getransformeerd)
            Object.values(touches).forEach(touch => {
                ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(touch.x, touch.y, 20, 0, Math.PI * 2);
                ctx.fill();
            });
            
            // Update info
            infoZoom.textContent = zoom.toFixed(2);
            infoOffset.textContent = `${Math.round(offsetX)}, ${Math.round(offsetY)}`;
        }
        
        // Bereken afstand tussen twee punten
        function getDistance(x1, y1, x2, y2) {
            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        }
        
        // Touch event handlers
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            
            // Update touches
            touches = {};
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                touches[touch.identifier] = {
                    x: touch.clientX,
                    y: touch.clientY
                };
            }
            
            if (e.touches.length === 2) {
                // Start pinch zoom
                isPinching = true;
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                
                pinchStartDistance = getDistance(
                    touch1.clientX, touch1.clientY,
                    touch2.clientX, touch2.clientY
                );
                
                pinchStartZoom = zoom;
                
                // Bereken het vaste punt (centrum tussen de twee vingers)
                const centerX = (touch1.clientX + touch2.clientX) / 2;
                const centerY = (touch1.clientY + touch2.clientY) / 2;
                
                // Converteer scherm coördinaten naar wereld coördinaten
                const worldX = (centerX - offsetX) / zoom;
                const worldY = (centerY - offsetY) / zoom;
                
                pinchFixedPoint = {
                    screenX: centerX,
                    screenY: centerY,
                    worldX: worldX,
                    worldY: worldY
                };
                
                // Initialiseer previous center voor smooth pan tijdens pinch
                previousPinchCenter = { x: centerX, y: centerY };
                
                infoStatus.textContent = 'Pinch zoom actief';
                infoPinchCenter.textContent = `${Math.round(centerX)}, ${Math.round(centerY)}`;
            } else if (e.touches.length === 1) {
                // Start pan
                isDragging = true;
                lastX = e.touches[0].clientX;
                lastY = e.touches[0].clientY;
                infoStatus.textContent = 'Pan actief';
            }
            
            draw();
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            // Update touches
            touches = {};
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                touches[touch.identifier] = {
                    x: touch.clientX,
                    y: touch.clientY
                };
            }
            
            if (isPinching && e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                
                // Bereken huidige afstand
                const currentDistance = getDistance(
                    touch1.clientX, touch1.clientY,
                    touch2.clientX, touch2.clientY
                );
                
                // Bereken het huidige centrum
                const currentCenterX = (touch1.clientX + touch2.clientX) / 2;
                const currentCenterY = (touch1.clientY + touch2.clientY) / 2;
                
                // Als we een vorig centrum hebben, bereken de pan beweging
                if (previousPinchCenter) {
                    const panDX = currentCenterX - previousPinchCenter.x;
                    const panDY = currentCenterY - previousPinchCenter.y;
                    
                    // Pas eerst de pan toe
                    offsetX += panDX;
                    offsetY += panDY;
                }
                
                // Bereken nieuwe zoom
                const scale = currentDistance / pinchStartDistance;
                const newZoom = Math.max(0.1, Math.min(5, pinchStartZoom * scale));
                
                // Bereken het vaste punt OPNIEUW op basis van de huidige positie
                // Dit voorkomt verspringen bij gecombineerde pan+zoom
                const worldX = (currentCenterX - offsetX) / zoom;
                const worldY = (currentCenterY - offsetY) / zoom;
                
                // Update zoom
                zoom = newZoom;
                
                // Herbereken offset zodat het nieuwe vaste punt op het huidige centrum blijft
                offsetX = currentCenterX - worldX * zoom;
                offsetY = currentCenterY - worldY * zoom;
                
                // Sla het huidige centrum op voor de volgende frame
                previousPinchCenter = { x: currentCenterX, y: currentCenterY };
                
                infoPinchCenter.textContent = `${Math.round(currentCenterX)}, ${Math.round(currentCenterY)}`;
                infoDistance.textContent = Math.round(currentDistance);
                
                draw();
            } else if (isDragging && e.touches.length === 1) {
                const touch = e.touches[0];
                const dx = touch.clientX - lastX;
                const dy = touch.clientY - lastY;
                
                offsetX += dx;
                offsetY += dy;
                
                lastX = touch.clientX;
                lastY = touch.clientY;
                
                draw();
            }
        });
        
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            
            // Update touches
            touches = {};
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                touches[touch.identifier] = {
                    x: touch.clientX,
                    y: touch.clientY
                };
            }
            
            if (e.touches.length < 2) {
                isPinching = false;
                pinchFixedPoint = null;
                previousPinchCenter = null;  // Reset vorige centrum
                infoPinchCenter.textContent = '-';
                infoDistance.textContent = '-';
            }
            
            if (e.touches.length === 0) {
                isDragging = false;
                infoStatus.textContent = 'Wacht op touch';
            }
            
            draw();
        });
        
        // Mouse events voor desktop testing
        let mouseDown = false;
        
        canvas.addEventListener('mousedown', (e) => {
            mouseDown = true;
            lastX = e.clientX;
            lastY = e.clientY;
            infoStatus.textContent = 'Mouse pan actief';
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (mouseDown) {
                const dx = e.clientX - lastX;
                const dy = e.clientY - lastY;
                
                offsetX += dx;
                offsetY += dy;
                
                lastX = e.clientX;
                lastY = e.clientY;
                
                draw();
            }
        });
        
        canvas.addEventListener('mouseup', () => {
            mouseDown = false;
            infoStatus.textContent = 'Wacht op input';
        });
        
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(0.1, Math.min(5, zoom * scaleFactor));
            
            // Zoom rond de muis positie
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            const worldX = (mouseX - offsetX) / zoom;
            const worldY = (mouseY - offsetY) / zoom;
            
            zoom = newZoom;
            
            offsetX = mouseX - worldX * zoom;
            offsetY = mouseY - worldY * zoom;
            
            draw();
        });
        
        // Initial setup
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
    </script>
</body>
</html>