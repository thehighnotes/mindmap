/**
 * mobile-touch.js - Modern mobile touch support for mindmap
 * Implements best practices for touch interactions using Pointer Events API
 */

// ==========================
// MODERN TOUCH MANAGER
// ==========================

class ModernTouchManager {
    constructor() {
        // Touch state using simple state machine
        this.state = {
            mode: 'idle', // idle, panning, pinching, dragging, connecting
            activePointers: new Map(),
            dragTarget: null,
            panStart: null,
            pinchStart: null,
            lastPinchDistance: 0
        };
        
        // Configuration
        this.config = {
            dragThreshold: 10, // Standard threshold for drag detection
            doubleTapDelay: 300,
            longPressDelay: 500,
            pinchThreshold: 0.02, // 2% scale change threshold
            momentumFriction: 0.92
        };
        
        // Timers
        this.timers = {
            doubleTap: null,
            longPress: null,
            momentum: null
        };
        
        // Last tap info for double tap detection
        this.lastTap = {
            time: 0,
            target: null,
            x: 0,
            y: 0
        };
        
        // Momentum tracking
        this.momentum = {
            velocityX: 0,
            velocityY: 0,
            lastX: 0,
            lastY: 0,
            lastTime: 0
        };
        
        this.init();
    }
    
    init() {
        // Wait for canvas availability
        if (!this.waitForCanvas()) return;
        
        // Use single pointer event handler for all interactions
        this.setupPointerEvents();
        
        // Setup CSS for optimal touch behavior
        this.setupTouchCSS();
        
        // Setup visual feedback
        this.setupVisualFeedback();
        
        // Setup viewport handling
        this.setupViewportHandling();
        
        console.log('📱 Modern touch support initialized');
    }
    
    waitForCanvas() {
        if (typeof canvas === 'undefined' || !canvas) {
            console.warn('⚠️ Canvas not ready, retrying...');
            setTimeout(() => this.init(), 100);
            return false;
        }
        return true;
    }
    
    setupPointerEvents() {
        // Use pointer events for unified mouse/touch handling
        canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
        canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
        canvas.addEventListener('pointercancel', this.handlePointerCancel.bind(this));
        
        // Prevent default touch behaviors
        canvas.style.touchAction = 'none';
        
        // Handle context menu (for long press)
        canvas.addEventListener('contextmenu', (e) => {
            if (e.pointerType === 'touch') {
                e.preventDefault();
            }
        });
    }
    
    handlePointerDown(e) {
        // Store pointer info
        this.state.activePointers.set(e.pointerId, {
            id: e.pointerId,
            type: e.pointerType,
            startX: e.clientX,
            startY: e.clientY,
            currentX: e.clientX,
            currentY: e.clientY,
            startTime: Date.now(),
            target: e.target
        });
        
        const pointerCount = this.state.activePointers.size;
        
        if (pointerCount === 1) {
            this.handleSinglePointerDown(e);
        } else if (pointerCount === 2) {
            this.handlePinchStart();
        }
        
        // Capture pointer for consistent events
        e.target.setPointerCapture(e.pointerId);
    }
    
    handleSinglePointerDown(e) {
        const pointer = this.state.activePointers.get(e.pointerId);
        const element = this.getInteractiveElement(e);
        
        // Check for double tap
        const now = Date.now();
        const tapDelta = now - this.lastTap.time;
        const distance = this.getDistance(
            e.clientX, e.clientY,
            this.lastTap.x, this.lastTap.y
        );
        
        if (tapDelta < this.config.doubleTapDelay && 
            distance < 30 && 
            this.lastTap.target === element) {
            this.handleDoubleTap(e, element);
            return;
        }
        
        // Update last tap info
        this.lastTap = {
            time: now,
            target: element,
            x: e.clientX,
            y: e.clientY
        };
        
        // Start long press timer
        this.clearTimer('longPress');
        this.timers.longPress = setTimeout(() => {
            if (this.state.mode === 'idle' && this.state.activePointers.has(e.pointerId)) {
                this.handleLongPress(e, element);
            }
        }, this.config.longPressDelay);
        
        // Store potential drag target
        if (element && element.classList.contains('node')) {
            this.state.dragTarget = element;
        }
    }
    
    handlePointerMove(e) {
        const pointer = this.state.activePointers.get(e.pointerId);
        if (!pointer) return;
        
        // Update pointer position
        pointer.currentX = e.clientX;
        pointer.currentY = e.clientY;
        
        const pointerCount = this.state.activePointers.size;
        
        if (pointerCount === 1) {
            this.handleSinglePointerMove(e, pointer);
        } else if (pointerCount === 2) {
            this.handlePinchMove();
        }
    }
    
    handleSinglePointerMove(e, pointer) {
        const dx = pointer.currentX - pointer.startX;
        const dy = pointer.currentY - pointer.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if we should start dragging
        // Only start actions if we truly have a single pointer (prevents conflicts with pinch)
        if (this.state.mode === 'idle' && distance > this.config.dragThreshold && this.state.activePointers.size === 1) {
            this.clearTimer('longPress'); // Cancel long press
            
            if (this.state.dragTarget) {
                this.startNodeDrag(this.state.dragTarget, pointer);
            } else {
                this.startCanvasPan(pointer);
            }
        }
        
        // Continue current action only if not in multi-touch mode
        if (this.state.activePointers.size === 1) {
            switch (this.state.mode) {
                case 'dragging':
                    this.updateNodeDrag(pointer);
                    break;
                case 'panning':
                    this.updateCanvasPan(pointer);
                    break;
            }
        }
    }
    
    handlePointerUp(e) {
        const pointer = this.state.activePointers.get(e.pointerId);
        if (!pointer) return;
        
        const pointerCount = this.state.activePointers.size;
        
        if (pointerCount === 1) {
            // Single pointer release
            const duration = Date.now() - pointer.startTime;
            const distance = this.getDistance(
                pointer.currentX, pointer.currentY,
                pointer.startX, pointer.startY
            );
            
            if (this.state.mode === 'idle' && distance < this.config.dragThreshold) {
                // It's a tap
                this.clearTimer('longPress');
                const element = this.getInteractiveElement(e);
                this.handleTap(e, element);
            } else if (this.state.mode === 'panning') {
                this.endCanvasPan();
            } else if (this.state.mode === 'dragging') {
                this.endNodeDrag();
            }
        } else if (pointerCount === 2 && this.state.mode === 'pinching') {
            // End pinch when one finger lifts
            this.endPinch();
        }
        
        // Clean up pointer
        this.state.activePointers.delete(e.pointerId);
        e.target.releasePointerCapture(e.pointerId);
        
        // Reset state if no more pointers
        if (this.state.activePointers.size === 0) {
            this.resetState();
        }
    }
    
    handlePointerCancel(e) {
        this.handlePointerUp(e);
    }
    
    // Gesture handlers
    handleTap(e, element) {
        if (!element) {
            // Tap on canvas - deselect
            if (typeof deselectAll === 'function') {
                deselectAll();
            }
            return;
        }
        
        if (element.classList.contains('node')) {
            const nodeId = element.id;
            if (typeof selectNode === 'function') {
                selectNode(nodeId);
            }
            this.showVisualFeedback(element, 'tap');
        } else if (element.classList.contains('connection')) {
            const connection = connections.find(c => c.id === element.id);
            if (connection && typeof selectConnection === 'function') {
                selectConnection(connection);
            }
            this.showVisualFeedback(element, 'tap');
        }
    }
    
    handleDoubleTap(e, element) {
        this.clearTimer('doubleTap');
        
        if (!element) {
            // Double tap on canvas - create node
            const coords = this.getCanvasCoordinates(e);
            this.createNodeAtPosition(coords.x, coords.y);
        } else if (element.classList.contains('node')) {
            // Double tap on node - show context menu
            const node = nodes.find(n => n.id === element.id);
            if (node) {
                this.showContextMenu(e.clientX, e.clientY, 'node', node);
            }
        } else if (element.classList.contains('connection')) {
            // Double tap on connection - show context menu
            const connection = connections.find(c => c.id === element.id);
            if (connection) {
                this.showContextMenu(e.clientX, e.clientY, 'connection', connection);
            }
        }
        
        this.showVisualFeedback(element || canvas, 'double-tap');
    }
    
    handleLongPress(e, element) {
        if (element && element.classList.contains('node')) {
            // Long press on node - enable drag mode
            const node = nodes.find(n => n.id === element.id);
            if (node) {
                this.enableDragMode(element, node);
                this.showToast('Sleep om te verplaatsen');
            }
        } else {
            // Long press elsewhere - show context menu
            this.showContextMenu(e.clientX, e.clientY, 'canvas', null);
        }
        
        this.showVisualFeedback(element || canvas, 'long-press');
    }
    
    // Verbeterde handlePinchStart functie
    handlePinchStart() {
        // Cancel any ongoing pan or drag operations
        if (this.state.mode === 'panning') {
            this.endCanvasPan();
        } else if (this.state.mode === 'dragging') {
            this.endNodeDrag();
        }
        
        // Reset momentum om ongewenste beweging te voorkomen
        this.momentum = {
            velocityX: 0,
            velocityY: 0,
            lastX: 0,
            lastY: 0,
            lastTime: 0
        };
        
        this.state.mode = 'pinching';
        const pointers = Array.from(this.state.activePointers.values());
        
        if (pointers.length >= 2) {
            const distance = this.getDistance(
                pointers[0].currentX, pointers[0].currentY,
                pointers[1].currentX, pointers[1].currentY
            );
            
            // Bereken het exacte pinch center
            const pinchCenterX = (pointers[0].currentX + pointers[1].currentX) / 2;
            const pinchCenterY = (pointers[0].currentY + pointers[1].currentY) / 2;
            
            // Haal canvas rectangle op voor berekeningen
            const rect = canvas.getBoundingClientRect();
            
            // Bereken het vaste punt in canvas coördinaten (dit punt moet vast blijven tijdens zoom)
            const currentZoom = typeof zoomLevel !== 'undefined' ? zoomLevel : 1;
            const currentOffsetX = typeof canvasOffset !== 'undefined' ? canvasOffset.x : 0;
            const currentOffsetY = typeof canvasOffset !== 'undefined' ? canvasOffset.y : 0;
            
            const fixedPointCanvasX = (pinchCenterX - rect.left - currentOffsetX) / currentZoom;
            const fixedPointCanvasY = (pinchCenterY - rect.top - currentOffsetY) / currentZoom;
            
            this.state.pinchStart = {
                distance: distance,
                scale: currentZoom,
                // Sla het pinch center op in viewport coördinaten
                centerX: pinchCenterX - rect.left,
                centerY: pinchCenterY - rect.top,
                // Sla het vaste punt op in canvas coördinaten
                fixedPointX: fixedPointCanvasX,
                fixedPointY: fixedPointCanvasY,
                // Sla de initiële offset op
                initialOffsetX: currentOffsetX,
                initialOffsetY: currentOffsetY
            };
            
            this.showZoomIndicator();
        }
    }
    
    
    // Verbeterde handlePinchMove functie
    handlePinchMove() {
        if (this.state.mode !== 'pinching' || !this.state.pinchStart) return;
        
        const pointers = Array.from(this.state.activePointers.values());
        if (pointers.length < 2) return;
        
        const currentDistance = this.getDistance(
            pointers[0].currentX, pointers[0].currentY,
            pointers[1].currentX, pointers[1].currentY
        );
        
        // Bereken de scale factor met smoothing
        const sensitivityFactor = 0.5;
        const rawScale = currentDistance / this.state.pinchStart.distance;
        const scale = 1 + (rawScale - 1) * sensitivityFactor;
        const smoothedScale = Math.pow(scale, 0.9);
        const newZoom = Math.max(0.1, Math.min(3, this.state.pinchStart.scale * smoothedScale));
        
        if (typeof setZoomLevel === 'function' && typeof updateCanvasTransform === 'function') {
            // Update zoom level
            setZoomLevel(newZoom);
            
            // Bereken nieuwe offset zodat het vaste punt op dezelfde viewport positie blijft
            if (typeof canvasOffset !== 'undefined') {
                // Het vaste punt moet op dezelfde viewport positie blijven
                // viewport positie = canvas positie * zoom + offset
                // Dus: offset = viewport positie - (canvas positie * zoom)
                canvasOffset.x = this.state.pinchStart.centerX - (this.state.pinchStart.fixedPointX * newZoom);
                canvasOffset.y = this.state.pinchStart.centerY - (this.state.pinchStart.fixedPointY * newZoom);
            }
            
            updateCanvasTransform();
            this.updateZoomIndicator(Math.round(newZoom * 100) + '%');
        }
    }
    
    endPinch() {
        this.state.mode = 'idle';
        this.state.pinchStart = null;
        this.hideZoomIndicator();
        
        // Clear any momentum that might have been built up
        this.momentum = {
            velocityX: 0,
            velocityY: 0,
            lastX: 0,
            lastY: 0,
            lastTime: 0
        };
    }
    
    // Node dragging
    startNodeDrag(element, pointer) {
        const node = nodes.find(n => n.id === element.id);
        if (!node) return;
        
        this.state.mode = 'dragging';
        
        // Save state for undo
        if (typeof saveStateForUndo === 'function') {
            saveStateForUndo();
        }
        
        // Store drag info
        this.state.dragInfo = {
            node: node,
            element: element,
            startX: node.x,
            startY: node.y,
            pointerStartX: pointer.startX,
            pointerStartY: pointer.startY
        };
        
        // Visual feedback
        element.classList.add('dragging');
        this.showVisualFeedback(element, 'drag-start');
    }
    
    updateNodeDrag(pointer) {
        if (!this.state.dragInfo) return;
        
        const zoom = typeof zoomLevel !== 'undefined' ? zoomLevel : 1;
        const offset = typeof canvasOffset !== 'undefined' ? canvasOffset : { x: 0, y: 0 };
        
        // Calculate new position
        const dx = (pointer.currentX - this.state.dragInfo.pointerStartX) / zoom;
        const dy = (pointer.currentY - this.state.dragInfo.pointerStartY) / zoom;
        
        const newX = this.state.dragInfo.startX + dx;
        const newY = this.state.dragInfo.startY + dy;
        
        // Snap to grid
        const gridSize = typeof window.gridSize !== 'undefined' ? window.gridSize : 20;
        const snapX = Math.round(newX / gridSize) * gridSize;
        const snapY = Math.round(newY / gridSize) * gridSize;
        
        // Update node position
        this.state.dragInfo.node.x = snapX;
        this.state.dragInfo.node.y = snapY;
        
        // Update DOM
        requestAnimationFrame(() => {
            this.state.dragInfo.element.style.left = snapX + 'px';
            this.state.dragInfo.element.style.top = snapY + 'px';
            
            // Update connections
            if (typeof updateRelatedConnections === 'function') {
                updateRelatedConnections(this.state.dragInfo.node.id, true);
            }
        });
    }
    
    endNodeDrag() {
        if (!this.state.dragInfo) return;
        
        // Remove visual feedback
        this.state.dragInfo.element.classList.remove('dragging');
        
        // Final connection update
        if (typeof refreshConnections === 'function') {
            refreshConnections();
        }
        
        this.state.dragInfo = null;
    }
    
    enableDragMode(element, node) {
        // Visual feedback for drag mode
        element.classList.add('drag-mode');
        
        // Store for future drag
        this.state.dragTarget = element;
    }
    
    // Canvas panning
    startCanvasPan(pointer) {
        if (typeof canvasOffset === 'undefined') return;
        
        this.state.mode = 'panning';
        this.state.panStart = {
            x: canvasOffset.x,
            y: canvasOffset.y,
            pointerX: pointer.startX,
            pointerY: pointer.startY
        };
        
        // Track momentum
        this.momentum = {
            velocityX: 0,
            velocityY: 0,
            lastX: pointer.startX,
            lastY: pointer.startY,
            lastTime: Date.now()
        };
        
        canvas.style.cursor = 'grabbing';
    }
    
    updateCanvasPan(pointer) {
        if (!this.state.panStart || typeof canvasOffset === 'undefined') return;
        
        const now = Date.now();
        const dt = now - this.momentum.lastTime;
        
        if (dt > 0) {
            // Calculate velocity for momentum
            this.momentum.velocityX = (pointer.currentX - this.momentum.lastX) / dt;
            this.momentum.velocityY = (pointer.currentY - this.momentum.lastY) / dt;
        }
        
        // Update canvas offset
        canvasOffset.x = this.state.panStart.x + (pointer.currentX - this.state.panStart.pointerX);
        canvasOffset.y = this.state.panStart.y + (pointer.currentY - this.state.panStart.pointerY);
        
        // Update momentum tracking
        this.momentum.lastX = pointer.currentX;
        this.momentum.lastY = pointer.currentY;
        this.momentum.lastTime = now;
        
        // Update transform
        if (typeof updateCanvasTransform === 'function') {
            updateCanvasTransform();
        }
    }
    
    endCanvasPan() {
        canvas.style.cursor = '';
        
        // Apply momentum if significant velocity
        if (Math.abs(this.momentum.velocityX) > 0.1 || Math.abs(this.momentum.velocityY) > 0.1) {
            this.applyMomentum();
        }
        
        this.state.panStart = null;
    }
    
    applyMomentum() {
        if (typeof canvasOffset === 'undefined' || typeof updateCanvasTransform === 'undefined') return;
        
        const animate = () => {
            // Apply velocity
            canvasOffset.x += this.momentum.velocityX * 10;
            canvasOffset.y += this.momentum.velocityY * 10;
            
            // Apply friction
            this.momentum.velocityX *= this.config.momentumFriction;
            this.momentum.velocityY *= this.config.momentumFriction;
            
            updateCanvasTransform();
            
            // Continue if velocity is significant
            if (Math.abs(this.momentum.velocityX) > 0.01 || Math.abs(this.momentum.velocityY) > 0.01) {
                this.timers.momentum = requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    // Context menu
    showContextMenu(x, y, type, target) {
        const menu = document.createElement('div');
        menu.className = 'touch-context-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            padding: 8px 0;
            min-width: 180px;
            z-index: 10000;
        `;
        
        const items = this.getContextMenuItems(type, target);
        
        items.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = item.label;
            menuItem.style.cssText = `
                padding: 12px 20px;
                cursor: pointer;
                font-size: 16px;
                color: ${item.danger ? '#f44336' : '#333'};
            `;
            
            menuItem.addEventListener('click', () => {
                item.action();
                menu.remove();
            });
            
            menuItem.addEventListener('pointerenter', () => {
                menuItem.style.backgroundColor = '#f5f5f5';
            });
            
            menuItem.addEventListener('pointerleave', () => {
                menuItem.style.backgroundColor = '';
            });
            
            menu.appendChild(menuItem);
        });
        
        document.body.appendChild(menu);
        
        // Auto-remove after delay
        setTimeout(() => menu.remove(), 5000);
        
        // Remove on outside click
        const removeOnOutside = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('pointerdown', removeOnOutside);
            }
        };
        setTimeout(() => document.addEventListener('pointerdown', removeOnOutside), 100);
    }
    
    getContextMenuItems(type, target) {
        const items = [];
        
        if (type === 'node' && target) {
            items.push(
                {
                    label: 'Bewerken',
                    action: () => {
                        if (typeof openNodeEditor === 'function') {
                            openNodeEditor(target);
                        }
                    }
                },
                {
                    label: 'Verbind met...',
                    action: () => this.startConnectionMode(target)
                },
                {
                    label: 'Nieuw subknooppunt',
                    action: () => {
                        if (typeof createNode === 'function') {
                            const angle = Math.random() * Math.PI * 2;
                            const distance = 150;
                            createNode(
                                'Nieuw idee',
                                '',
                                target.color,
                                target.x + Math.cos(angle) * distance,
                                target.y + Math.sin(angle) * distance,
                                'rounded',
                                target.id
                            );
                        }
                    }
                },
                {
                    label: 'Verwijderen',
                    danger: true,
                    action: () => {
                        if (typeof deleteNode === 'function') {
                            deleteNode(target.id);
                        }
                    }
                }
            );
        } else if (type === 'connection' && target) {
            items.push(
                {
                    label: 'Bewerken',
                    action: () => {
                        if (typeof openConnectionEditor === 'function') {
                            openConnectionEditor(target);
                        }
                    }
                },
                {
                    label: 'Verwijderen',
                    danger: true,
                    action: () => {
                        if (typeof deleteConnection === 'function') {
                            deleteConnection(target.id);
                        }
                    }
                }
            );
        } else if (type === 'canvas') {
            items.push(
                {
                    label: 'Nieuwe node',
                    action: () => {
                        const coords = this.getCanvasCoordinates({ clientX: x, clientY: y });
                        this.createNodeAtPosition(coords.x, coords.y);
                    }
                },
                {
                    label: 'Centreren',
                    action: () => {
                        if (typeof centerOnNode === 'function' && typeof rootNodeId !== 'undefined') {
                            centerOnNode(rootNodeId);
                        }
                    }
                }
            );
        }
        
        return items;
    }
    
    startConnectionMode(sourceNode) {
        // Simple connection mode - click another node to connect
        const element = document.getElementById(sourceNode.id);
        if (!element) return;
        
        element.classList.add('connection-source');
        this.showToast('Tik op een andere node om te verbinden');
        
        // Store connection state
        this.connectionMode = {
            sourceNode: sourceNode,
            element: element
        };
        
        // Override tap handler temporarily
        this.originalHandleTap = this.handleTap;
        this.handleTap = (e, targetElement) => {
            if (targetElement && targetElement.classList.contains('node')) {
                const targetNode = nodes.find(n => n.id === targetElement.id);
                if (targetNode && targetNode.id !== sourceNode.id) {
                    if (typeof createConnection === 'function') {
                        createConnection(sourceNode.id, targetNode.id);
                        this.showToast('Verbinding gemaakt!');
                    }
                }
            }
            
            // End connection mode
            element.classList.remove('connection-source');
            this.handleTap = this.originalHandleTap;
            this.connectionMode = null;
        };
    }
    
    // Helper methods
    getInteractiveElement(e) {
        return e.target.closest('.node, .connection, .tool-btn');
    }
    
    getCanvasCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        const zoom = typeof zoomLevel !== 'undefined' ? zoomLevel : 1;
        const offset = typeof canvasOffset !== 'undefined' ? canvasOffset : { x: 0, y: 0 };
        
        return {
            x: (e.clientX - rect.left - offset.x) / zoom,
            y: (e.clientY - rect.top - offset.y) / zoom
        };
    }
    
    getDistance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    getVisibleNodesCenter() {
        // Calculate the center of visible nodes for better zoom focus
        if (typeof nodes === 'undefined' || !nodes || nodes.length === 0) {
            // Fallback to viewport center
            return {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2
            };
        }
        
        const rect = canvas.getBoundingClientRect();
        const zoom = typeof zoomLevel !== 'undefined' ? zoomLevel : 1;
        const offset = typeof canvasOffset !== 'undefined' ? canvasOffset : { x: 0, y: 0 };
        
        // Find nodes that are currently visible in viewport
        const visibleNodes = nodes.filter(node => {
            const screenX = node.x * zoom + offset.x;
            const screenY = node.y * zoom + offset.y;
            
            return screenX >= -100 && screenX <= window.innerWidth + 100 &&
                   screenY >= -100 && screenY <= window.innerHeight + 100;
        });
        
        if (visibleNodes.length === 0) {
            // No visible nodes, use viewport center
            return {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2
            };
        }
        
        // Calculate center of visible nodes
        let sumX = 0, sumY = 0;
        visibleNodes.forEach(node => {
            const screenX = node.x * zoom + offset.x + rect.left;
            const screenY = node.y * zoom + offset.y + rect.top;
            sumX += screenX;
            sumY += screenY;
        });
        
        return {
            x: sumX / visibleNodes.length,
            y: sumY / visibleNodes.length
        };
    }
    
    createNodeAtPosition(x, y) {
        if (typeof createNode !== 'function') return;
        
        const gridSize = typeof window.gridSize !== 'undefined' ? window.gridSize : 20;
        const snapX = Math.round(x / gridSize) * gridSize;
        const snapY = Math.round(y / gridSize) * gridSize;
        
        // Store current canvas offset to restore after node creation
        const currentOffset = typeof canvasOffset !== 'undefined' ? { ...canvasOffset } : null;
        const currentZoom = typeof zoomLevel !== 'undefined' ? zoomLevel : 1;
        
        const node = createNode(
            'Nieuw idee',
            '',
            '#4CAF50',
            snapX,
            snapY,
            'rounded'
        );
        
        // Restore canvas position if it changed
        if (currentOffset && typeof canvasOffset !== 'undefined') {
            canvasOffset.x = currentOffset.x;
            canvasOffset.y = currentOffset.y;
            if (typeof updateCanvasTransform === 'function') {
                updateCanvasTransform();
            }
        }
        
        // Auto-edit new node with a longer delay to prevent jumping
        setTimeout(() => {
            const element = document.getElementById(node.id);
            if (element) {
                // Ensure the node is visible before editing
                const rect = element.getBoundingClientRect();
                const isVisible = rect.top >= 0 && rect.left >= 0 && 
                                rect.bottom <= window.innerHeight && 
                                rect.right <= window.innerWidth;
                
                if (isVisible) {
                    const title = element.querySelector('.node-title');
                    if (title && typeof makeEditable === 'function') {
                        // Prevent scrolling when focusing
                        const preventScroll = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        };
                        
                        // Temporarily block scroll events
                        window.addEventListener('scroll', preventScroll, { capture: true });
                        canvas.addEventListener('scroll', preventScroll, { capture: true });
                        
                        makeEditable(title, node);
                        
                        // Remove scroll block after a short delay
                        setTimeout(() => {
                            window.removeEventListener('scroll', preventScroll, { capture: true });
                            canvas.removeEventListener('scroll', preventScroll, { capture: true });
                        }, 300);
                    }
                }
            }
        }, 150);
    }
    
    // Visual feedback
    setupVisualFeedback() {
        const style = document.createElement('style');
        style.textContent = `
            /* Modern touch styles using CSS variables and proper specificity */
            :root {
                --touch-target-min: 44px;
                --touch-padding: 12px;
                --touch-highlight: rgba(0, 122, 255, 0.2);
            }
            
            /* Enhance touch targets */
            @media (pointer: coarse) {
                .node {
                    min-width: var(--touch-target-min);
                    min-height: var(--touch-target-min);
                    padding: var(--touch-padding);
                }
                
                .tool-btn {
                    min-width: var(--touch-target-min);
                    min-height: var(--touch-target-min);
                }
                
                .connection-hitzone {
                    stroke-width: 20px;
                }
            }
            
            /* Visual states */
            .node.dragging {
                opacity: 0.8;
                transform: scale(1.05);
                z-index: 1000;
                transition: transform 0.2s ease;
            }
            
            .node.drag-mode {
                box-shadow: 0 0 0 3px #ff9800;
                animation: pulse 2s infinite;
            }
            
            .node.connection-source {
                box-shadow: 0 0 0 3px #2196f3;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.8; }
            }
            
            /* Touch feedback */
            .touch-feedback {
                position: absolute;
                border-radius: 50%;
                background: var(--touch-highlight);
                pointer-events: none;
                animation: ripple 0.6s ease-out;
            }
            
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
            
            /* Context menu */
            .touch-context-menu {
                user-select: none;
                -webkit-tap-highlight-color: transparent;
            }
            
            .context-menu-item {
                user-select: none;
                transition: background-color 0.2s ease;
            }
            
            /* Zoom indicator */
            .zoom-indicator {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                pointer-events: none;
                z-index: 10000;
            }
            
            /* Toast messages */
            .touch-toast {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 20px;
                border-radius: 25px;
                font-size: 14px;
                pointer-events: none;
                z-index: 10000;
                animation: slideUp 0.3s ease-out;
            }
            
            @keyframes slideUp {
                from {
                    transform: translateX(-50%) translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setupTouchCSS() {
        // Set proper touch-action for different elements
        const style = document.createElement('style');
        style.textContent = `
            /* Prevent default touch behaviors on interactive elements */
            .node, .connection, .tool-btn {
                touch-action: none;
                -webkit-tap-highlight-color: transparent;
            }
            
            /* Allow scrolling on modals and menus */
            .modal-content, .context-menu {
                touch-action: pan-y;
            }
            
            /* Preserve text selection in editable areas */
            [contenteditable="true"], input, textarea {
                touch-action: auto;
                user-select: text;
                -webkit-user-select: text;
            }
        `;
        document.head.appendChild(style);
    }
    
    setupViewportHandling() {
        // Handle viewport changes (orientation, virtual keyboard, etc.)
        let viewportTimeout;
        
        const handleViewportChange = () => {
            clearTimeout(viewportTimeout);
            viewportTimeout = setTimeout(() => {
                // Force layout recalculation
                if (typeof updateCanvasTransform === 'function') {
                    updateCanvasTransform();
                }
                
                // Reset any stuck states
                this.resetState();
                
                // Update visual viewport if available
                if (window.visualViewport) {
                    const { height, width } = window.visualViewport;
                    document.documentElement.style.setProperty('--viewport-height', `${height}px`);
                    document.documentElement.style.setProperty('--viewport-width', `${width}px`);
                }
            }, 150);
        };
        
        // Listen for various viewport changes
        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('orientationchange', handleViewportChange);
        
        // Visual viewport API support (for virtual keyboard handling)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportChange);
            window.visualViewport.addEventListener('scroll', handleViewportChange);
        }
        
        // Handle iOS viewport issues
        const fixIOSViewport = () => {
            if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                // Fix iOS viewport height issues
                const vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', `${vh}px`);
            }
        };
        
        fixIOSViewport();
        window.addEventListener('resize', fixIOSViewport);
        window.addEventListener('orientationchange', fixIOSViewport);
    }
    
    showVisualFeedback(element, type) {
        const rect = element.getBoundingClientRect();
        const feedback = document.createElement('div');
        feedback.className = 'touch-feedback';
        
        // Position at touch point
        const size = 40;
        feedback.style.width = size + 'px';
        feedback.style.height = size + 'px';
        feedback.style.left = (rect.left + rect.width / 2 - size / 2) + 'px';
        feedback.style.top = (rect.top + rect.height / 2 - size / 2) + 'px';
        feedback.style.position = 'fixed';
        
        document.body.appendChild(feedback);
        
        // Remove after animation
        feedback.addEventListener('animationend', () => feedback.remove());
    }
    
    showZoomIndicator() {
        if (!this.zoomIndicator) {
            this.zoomIndicator = document.createElement('div');
            this.zoomIndicator.className = 'zoom-indicator';
            document.body.appendChild(this.zoomIndicator);
        }
        
        const zoom = typeof zoomLevel !== 'undefined' ? zoomLevel : 1;
        this.zoomIndicator.textContent = Math.round(zoom * 100) + '%';
    }
    
    updateZoomIndicator(text) {
        if (this.zoomIndicator) {
            this.zoomIndicator.textContent = text;
        }
    }
    
    hideZoomIndicator() {
        if (this.zoomIndicator) {
            this.zoomIndicator.remove();
            this.zoomIndicator = null;
        }
    }
    
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'touch-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease-out reverse';
            toast.addEventListener('animationend', () => toast.remove());
        }, 2000);
    }
    
    clearTimer(name) {
        if (this.timers[name]) {
            clearTimeout(this.timers[name]);
            this.timers[name] = null;
        }
    }
    
    resetState() {
        this.state.mode = 'idle';
        this.state.dragTarget = null;
        this.state.panStart = null;
        this.state.pinchStart = null;
        this.state.dragInfo = null;
        
        // Clear all timers
        Object.keys(this.timers).forEach(timer => this.clearTimer(timer));
        
        // Reset visual states
        document.querySelectorAll('.dragging, .drag-mode, .connection-source').forEach(el => {
            el.classList.remove('dragging', 'drag-mode', 'connection-source');
        });
        
        canvas.style.cursor = '';
    }
    
    // Public API
    cleanup() {
        this.resetState();
        this.state.activePointers.clear();
        
        // Remove event listeners
        canvas.removeEventListener('pointerdown', this.handlePointerDown);
        canvas.removeEventListener('pointermove', this.handlePointerMove);
        canvas.removeEventListener('pointerup', this.handlePointerUp);
        canvas.removeEventListener('pointercancel', this.handlePointerCancel);
    }
}

// ==========================
// INITIALIZATION
// ==========================

let modernTouchManager = null;

function initializeModernTouch() {
    if (modernTouchManager) {
        modernTouchManager.cleanup();
    }
    
    modernTouchManager = new ModernTouchManager();
    
    // Export for global access
    window.mobileTouchManager = modernTouchManager;
    
    console.log('📱 Modern mobile touch support initialized');
}

// Auto-initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeModernTouch);
} else {
    setTimeout(initializeModernTouch, 100);
}

// Export initialization function
window.initializeMobileTouch = initializeModernTouch;