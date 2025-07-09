/**
 * mobile-touch.js - Comprehensive mobile touch support for mindmap
 * Enhanced touch interactions for all mindmap features
 */

// ==========================
// TOUCH GESTURE SYSTEM
// ==========================

class TouchGestureManager {
    constructor() {
        this.activeGestures = new Map();
        this.touchStartTime = null;
        this.touchStartPos = null;
        this.lastTouchEnd = 0;
        this.touchSequence = [];
        this.longPressTimer = null;
        this.longPressThreshold = 500; // 500ms for long press
        this.doubleTapThreshold = 300; // 300ms for double tap
        this.dragThreshold = 10; // 10px minimum movement to start drag
        this.pinchThreshold = 10; // 10px minimum distance change for pinch
        this.velocityTracker = [];
        this.velocityThreshold = 0.3; // Minimum velocity for swipe
        
        // Touch state
        this.isTouching = false;
        this.isLongPressed = false;
        this.isPinching = false;
        this.isDragging = false;
        this.touchCount = 0;
        this.lastPinchDistance = 0;
        this.lastPinchCenter = null;
        
        // Gesture callbacks
        this.callbacks = {
            tap: [],
            doubleTap: [],
            longPress: [],
            drag: [],
            pinch: [],
            swipe: [],
            rotate: []
        };
        
        this.init();
    }
    
    init() {
        // Bind touch events with proper options
        canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        canvas.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
        
        console.log('🎯 Touch Gesture Manager initialized');
    }
    
    // Register callback for specific gesture
    on(gesture, callback) {
        if (this.callbacks[gesture]) {
            this.callbacks[gesture].push(callback);
        }
    }
    
    // Remove callback for specific gesture
    off(gesture, callback) {
        if (this.callbacks[gesture]) {
            const index = this.callbacks[gesture].indexOf(callback);
            if (index > -1) {
                this.callbacks[gesture].splice(index, 1);
            }
        }
    }
    
    // Emit gesture event
    emit(gesture, data) {
        if (this.callbacks[gesture]) {
            this.callbacks[gesture].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error('Touch gesture callback error:', e);
                }
            });
        }
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        
        const now = Date.now();
        const touch = e.touches[0];
        this.touchCount = e.touches.length;
        this.isTouching = true;
        this.touchStartTime = now;
        this.touchStartPos = {
            x: touch.clientX,
            y: touch.clientY,
            canvasX: this.getCanvasCoordinates(touch).x,
            canvasY: this.getCanvasCoordinates(touch).y
        };
        
        // Clear any existing long press timer
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
        }
        
        // Handle multi-touch
        if (this.touchCount === 1) {
            this.handleSingleTouch(e, touch, now);
        } else if (this.touchCount === 2) {
            this.handlePinchStart(e);
        }
        
        // Track velocity
        this.velocityTracker = [{
            time: now,
            x: touch.clientX,
            y: touch.clientY
        }];
        
        // Start long press timer
        this.longPressTimer = setTimeout(() => {
            if (this.isTouching && !this.isDragging && !this.isPinching) {
                this.handleLongPress(e);
            }
        }, this.longPressThreshold);
    }
    
    handleSingleTouch(e, touch, now) {
        const timeSinceLastTouch = now - this.lastTouchEnd;
        
        // Check for double tap
        if (timeSinceLastTouch < this.doubleTapThreshold) {
            this.handleDoubleTap(e, touch);
            return;
        }
        
        // Store touch info for potential drag
        this.touchStartPos = {
            x: touch.clientX,
            y: touch.clientY,
            canvasX: this.getCanvasCoordinates(touch).x,
            canvasY: this.getCanvasCoordinates(touch).y
        };
        
        // Emit touch start event
        this.emit('touchstart', {
            touch: touch,
            position: this.touchStartPos,
            target: e.target,
            originalEvent: e
        });
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        
        if (!this.isTouching) return;
        
        const touch = e.touches[0];
        const now = Date.now();
        
        // Update velocity tracker
        this.velocityTracker.push({
            time: now,
            x: touch.clientX,
            y: touch.clientY
        });
        
        // Keep only recent velocity data
        this.velocityTracker = this.velocityTracker.filter(v => now - v.time < 100);
        
        if (this.touchCount === 1) {
            this.handleSingleTouchMove(e, touch);
        } else if (this.touchCount === 2) {
            this.handlePinchMove(e);
        }
        
        // Cancel long press if we're moving
        if (this.longPressTimer && this.isDragging) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }
    
    handleSingleTouchMove(e, touch) {
        const deltaX = touch.clientX - this.touchStartPos.x;
        const deltaY = touch.clientY - this.touchStartPos.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Start drag if threshold exceeded
        if (!this.isDragging && distance > this.dragThreshold) {
            this.isDragging = true;
            this.emit('dragstart', {
                touch: touch,
                startPosition: this.touchStartPos,
                currentPosition: { x: touch.clientX, y: touch.clientY },
                delta: { x: deltaX, y: deltaY },
                target: e.target,
                originalEvent: e
            });
        }
        
        // Continue drag
        if (this.isDragging) {
            this.emit('drag', {
                touch: touch,
                startPosition: this.touchStartPos,
                currentPosition: { x: touch.clientX, y: touch.clientY },
                delta: { x: deltaX, y: deltaY },
                target: e.target,
                originalEvent: e
            });
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        
        const now = Date.now();
        this.lastTouchEnd = now;
        this.isTouching = false;
        this.touchCount = e.touches.length;
        
        // Clear timers
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        // Handle end of gestures
        if (this.isDragging) {
            this.handleDragEnd(e);
        } else if (this.isPinching) {
            this.handlePinchEnd(e);
        } else if (!this.isLongPressed && this.touchStartTime) {
            // Simple tap
            const touchDuration = now - this.touchStartTime;
            if (touchDuration < this.longPressThreshold) {
                this.handleTap(e);
            }
        }
        
        // Check for swipe
        if (this.velocityTracker.length > 1) {
            this.checkForSwipe(e);
        }
        
        // Reset state
        this.resetGestureState();
    }
    
    handleTouchCancel(e) {
        e.preventDefault();
        this.resetGestureState();
    }
    
    handleTap(e) {
        const touch = e.changedTouches[0];
        this.emit('tap', {
            touch: touch,
            position: this.touchStartPos,
            target: e.target,
            originalEvent: e
        });
    }
    
    handleDoubleTap(e) {
        const touch = e.touches[0];
        this.emit('doubleTap', {
            touch: touch,
            position: this.touchStartPos,
            target: e.target,
            originalEvent: e
        });
    }
    
    handleLongPress(e) {
        this.isLongPressed = true;
        const touch = e.touches[0];
        this.emit('longPress', {
            touch: touch,
            position: this.touchStartPos,
            target: e.target,
            originalEvent: e
        });
    }
    
    handleDragEnd(e) {
        const touch = e.changedTouches[0];
        this.emit('dragend', {
            touch: touch,
            startPosition: this.touchStartPos,
            endPosition: { x: touch.clientX, y: touch.clientY },
            target: e.target,
            originalEvent: e
        });
    }
    
    handlePinchStart(e) {
        if (e.touches.length !== 2) return;
        
        this.isPinching = true;
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        
        this.lastPinchDistance = this.getDistance(touch1, touch2);
        this.lastPinchCenter = this.getCenter(touch1, touch2);
        
        this.emit('pinchstart', {
            touches: [touch1, touch2],
            distance: this.lastPinchDistance,
            center: this.lastPinchCenter,
            originalEvent: e
        });
    }
    
    handlePinchMove(e) {
        if (e.touches.length !== 2 || !this.isPinching) return;
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        
        const currentDistance = this.getDistance(touch1, touch2);
        const currentCenter = this.getCenter(touch1, touch2);
        
        const scale = currentDistance / this.lastPinchDistance;
        const deltaX = currentCenter.x - this.lastPinchCenter.x;
        const deltaY = currentCenter.y - this.lastPinchCenter.y;
        
        this.emit('pinch', {
            touches: [touch1, touch2],
            distance: currentDistance,
            center: currentCenter,
            scale: scale,
            delta: { x: deltaX, y: deltaY },
            originalEvent: e
        });
        
        this.lastPinchDistance = currentDistance;
        this.lastPinchCenter = currentCenter;
    }
    
    handlePinchEnd(e) {
        this.emit('pinchend', {
            originalEvent: e
        });
    }
    
    checkForSwipe(e) {
        if (this.velocityTracker.length < 2) return;
        
        const recent = this.velocityTracker[this.velocityTracker.length - 1];
        const start = this.velocityTracker[0];
        
        const deltaTime = recent.time - start.time;
        const deltaX = recent.x - start.x;
        const deltaY = recent.y - start.y;
        
        const velocityX = deltaX / deltaTime;
        const velocityY = deltaY / deltaTime;
        const velocity = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        
        if (velocity > this.velocityThreshold) {
            let direction = 'unknown';
            if (Math.abs(velocityX) > Math.abs(velocityY)) {
                direction = velocityX > 0 ? 'right' : 'left';
            } else {
                direction = velocityY > 0 ? 'down' : 'up';
            }
            
            this.emit('swipe', {
                direction: direction,
                velocity: velocity,
                delta: { x: deltaX, y: deltaY },
                target: e.target,
                originalEvent: e
            });
        }
    }
    
    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    getCenter(touch1, touch2) {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    }
    
    getCanvasCoordinates(touch) {
        const canvasRect = canvas.getBoundingClientRect();
        return {
            x: (touch.clientX - canvasRect.left) / zoomLevel,
            y: (touch.clientY - canvasRect.top) / zoomLevel
        };
    }
    
    resetGestureState() {
        this.isDragging = false;
        this.isPinching = false;
        this.isLongPressed = false;
        this.touchStartTime = null;
        this.touchStartPos = null;
        this.velocityTracker = [];
        this.lastPinchDistance = 0;
        this.lastPinchCenter = null;
    }
    
    // Public method to check if currently touching
    isTouchActive() {
        return this.isTouching;
    }
    
    // Public method to get touch count
    getTouchCount() {
        return this.touchCount;
    }
}

// ==========================
// ENHANCED TOUCH SUPPORT
// ==========================

class MobileTouchManager {
    constructor() {
        this.gestureManager = new TouchGestureManager();
        this.touchTargets = new Map();
        this.touchFeedback = new Map();
        this.isInitialized = false;
        
        // Touch interaction modes
        this.modes = {
            NAVIGATE: 'navigate',
            SELECT: 'select',
            CREATE: 'create',
            EDIT: 'edit',
            CONNECT: 'connect'
        };
        
        this.currentMode = this.modes.NAVIGATE;
        this.activeElement = null;
        this.touchConnectionStart = null;
        this.touchConnectionLine = null;
        
        this.init();
    }
    
    init() {
        if (this.isInitialized) return;
        
        this.setupGestureHandlers();
        this.setupTouchStyles();
        this.setupTouchTargets();
        this.setupAccessibility();
        this.setupPerformanceOptimizations();
        
        this.isInitialized = true;
        console.log('📱 Mobile Touch Manager initialized');
    }
    
    setupGestureHandlers() {
        // Tap gesture - select nodes/connections
        this.gestureManager.on('tap', (data) => {
            this.handleTap(data);
        });
        
        // Double tap - create new node or edit existing
        this.gestureManager.on('doubleTap', (data) => {
            this.handleDoubleTap(data);
        });
        
        // Long press - context menu
        this.gestureManager.on('longPress', (data) => {
            this.handleLongPress(data);
        });
        
        // Drag - move nodes or pan canvas
        this.gestureManager.on('dragstart', (data) => {
            this.handleDragStart(data);
        });
        
        this.gestureManager.on('drag', (data) => {
            this.handleDrag(data);
        });
        
        this.gestureManager.on('dragend', (data) => {
            this.handleDragEnd(data);
        });
        
        // Pinch - zoom
        this.gestureManager.on('pinchstart', (data) => {
            this.handlePinchStart(data);
        });
        
        this.gestureManager.on('pinch', (data) => {
            this.handlePinch(data);
        });
        
        this.gestureManager.on('pinchend', (data) => {
            this.handlePinchEnd(data);
        });
        
        // Swipe - quick navigation
        this.gestureManager.on('swipe', (data) => {
            this.handleSwipe(data);
        });
    }
    
    handleTap(data) {
        const element = data.target.closest('.node, .connection, .tool-btn');
        
        if (element) {
            this.showTouchFeedback(element, 'tap');
            
            if (element.classList.contains('node')) {
                this.handleNodeTap(element, data);
            } else if (element.classList.contains('connection')) {
                this.handleConnectionTap(element, data);
            } else if (element.classList.contains('tool-btn')) {
                this.handleToolTap(element, data);
            }
        } else {
            // Tap on empty canvas
            this.handleCanvasTap(data);
        }
    }
    
    handleDoubleTap(data) {
        const element = data.target.closest('.node');
        
        if (element) {
            // Edit node
            const node = nodes.find(n => n.id === element.id);
            if (node) {
                this.showTouchFeedback(element, 'doubleTap');
                const titleEl = element.querySelector('.node-title');
                if (titleEl) {
                    makeEditable(titleEl, node);
                }
            }
        } else {
            // Create new node
            this.createNodeAtPosition(data.position.canvasX, data.position.canvasY);
        }
    }
    
    handleLongPress(data) {
        const element = data.target.closest('.node, .connection');
        
        if (element) {
            this.showTouchFeedback(element, 'longPress');
            
            if (element.classList.contains('node')) {
                const node = nodes.find(n => n.id === element.id);
                if (node) {
                    this.showTouchContextMenu(data.position.x, data.position.y, 'node', node);
                }
            } else if (element.classList.contains('connection')) {
                const connection = connections.find(c => c.id === element.id);
                if (connection) {
                    this.showTouchContextMenu(data.position.x, data.position.y, 'connection', connection);
                }
            }
        } else {
            // Long press on canvas
            this.showTouchContextMenu(data.position.x, data.position.y, 'canvas', null);
        }
    }
    
    handleDragStart(data) {
        const element = data.target.closest('.node, .connection');
        
        if (element) {
            this.activeElement = element;
            this.showTouchFeedback(element, 'dragStart');
            
            if (element.classList.contains('node')) {
                this.startNodeDrag(element, data);
            } else if (element.classList.contains('connection')) {
                this.startConnectionDrag(element, data);
            }
        } else {
            // Start canvas pan
            this.startCanvasPan(data);
        }
    }
    
    handleDrag(data) {
        if (this.activeElement) {
            if (this.activeElement.classList.contains('node')) {
                this.updateNodeDrag(this.activeElement, data);
            } else if (this.activeElement.classList.contains('connection')) {
                this.updateConnectionDrag(this.activeElement, data);
            }
        } else {
            // Update canvas pan
            this.updateCanvasPan(data);
        }
    }
    
    handleDragEnd(data) {
        if (this.activeElement) {
            this.showTouchFeedback(this.activeElement, 'dragEnd');
            
            if (this.activeElement.classList.contains('node')) {
                this.endNodeDrag(this.activeElement, data);
            } else if (this.activeElement.classList.contains('connection')) {
                this.endConnectionDrag(this.activeElement, data);
            }
            
            this.activeElement = null;
        } else {
            // End canvas pan
            this.endCanvasPan(data);
        }
    }
    
    handlePinchStart(data) {
        // Store initial zoom state
        this.initialZoom = zoomLevel;
        this.initialOffset = { ...canvasOffset };
        
        // Show zoom indicator
        this.showZoomIndicator(data.center.x, data.center.y);
    }
    
    handlePinch(data) {
        // Calculate new zoom level
        const newZoom = Math.max(0.1, Math.min(3, this.initialZoom * data.scale));
        
        // Calculate zoom center in canvas coordinates
        const canvasRect = canvas.getBoundingClientRect();
        const centerX = (data.center.x - canvasRect.left) / this.initialZoom;
        const centerY = (data.center.y - canvasRect.top) / this.initialZoom;
        
        // Apply zoom
        setZoomLevel(newZoom);
        
        // Adjust offset to zoom towards center
        const containerRect = canvasContainer.getBoundingClientRect();
        canvasOffset.x = this.initialOffset.x + (containerRect.width / 2 - data.center.x) * (newZoom - this.initialZoom);
        canvasOffset.y = this.initialOffset.y + (containerRect.height / 2 - data.center.y) * (newZoom - this.initialZoom);
        
        updateCanvasTransform();
        
        // Update zoom indicator
        this.updateZoomIndicator(Math.round(newZoom * 100) + '%');
    }
    
    handlePinchEnd(data) {
        this.hideZoomIndicator();
    }
    
    handleSwipe(data) {
        // Quick navigation based on swipe direction
        switch (data.direction) {
            case 'up':
                // Zoom in
                setZoomLevel(zoomLevel * 1.2);
                break;
            case 'down':
                // Zoom out
                setZoomLevel(zoomLevel / 1.2);
                break;
            case 'left':
                // Pan right
                canvasOffset.x += 100;
                updateCanvasTransform();
                break;
            case 'right':
                // Pan left
                canvasOffset.x -= 100;
                updateCanvasTransform();
                break;
        }
    }
    
    // Node-specific touch handlers
    handleNodeTap(element, data) {
        const node = nodes.find(n => n.id === element.id);
        if (node) {
            selectNode(node.id);
        }
    }
    
    startNodeDrag(element, data) {
        const node = nodes.find(n => n.id === element.id);
        if (node) {
            saveStateForUndo();
            draggedNode = node;
            isDragging = true;
            mouseStartPos = data.position;
            nodeStartPos = { x: node.x, y: node.y };
            
            // Visual feedback
            element.style.transform = 'scale(1.05)';
            element.style.zIndex = '1000';
            element.style.opacity = '0.8';
        }
    }
    
    updateNodeDrag(element, data) {
        if (draggedNode) {
            const deltaX = (data.currentPosition.x - data.startPosition.x) / zoomLevel;
            const deltaY = (data.currentPosition.y - data.startPosition.y) / zoomLevel;
            
            const newX = nodeStartPos.x + deltaX;
            const newY = nodeStartPos.y + deltaY;
            
            // Snap to grid
            const snapX = Math.round(newX / gridSize) * gridSize;
            const snapY = Math.round(newY / gridSize) * gridSize;
            
            draggedNode.x = snapX;
            draggedNode.y = snapY;
            
            element.style.left = snapX + 'px';
            element.style.top = snapY + 'px';
            
            // Update connections
            updateRelatedConnections(draggedNode.id, true);
        }
    }
    
    endNodeDrag(element, data) {
        if (draggedNode) {
            // Reset visual feedback
            element.style.transform = '';
            element.style.zIndex = '';
            element.style.opacity = '';
            
            // Check for drop into connection
            const connectionElement = this.findConnectionAtPosition(data.endPosition.x, data.endPosition.y);
            if (connectionElement && canDropNodeIntoConnection(draggedNode.id, connectionElement.id)) {
                const canvasCoords = this.gestureManager.getCanvasCoordinates(data.endPosition);
                dropNodeIntoConnection(draggedNode.id, connectionElement.id, canvasCoords.x, canvasCoords.y);
            }
            
            // Final connection update
            refreshConnections();
            
            isDragging = false;
            draggedNode = null;
        }
    }
    
    // Connection-specific touch handlers
    handleConnectionTap(element, data) {
        const connection = connections.find(c => c.id === element.id);
        if (connection) {
            selectConnection(connection);
        }
    }
    
    startConnectionDrag(element, data) {
        const connection = connections.find(c => c.id === element.id);
        if (connection) {
            saveStateForUndo();
            
            // Start connection curve manipulation
            currentSelectedConnection = connection;
            currentSelectedNode = connection.id;
            
            // Visual feedback
            element.classList.add('connection-dragging');
        }
    }
    
    updateConnectionDrag(element, data) {
        if (currentSelectedConnection) {
            const canvasCoords = this.gestureManager.getCanvasCoordinates(data.currentPosition);
            
            // Update connection control point
            currentSelectedConnection.controlPoint = {
                x: canvasCoords.x,
                y: canvasCoords.y
            };
            
            // Redraw connection
            if (typeof drawConnection === 'function') {
                drawConnection(currentSelectedConnection);
            }
        }
    }
    
    endConnectionDrag(element, data) {
        if (currentSelectedConnection) {
            element.classList.remove('connection-dragging');
            refreshConnections();
        }
    }
    
    // Canvas-specific touch handlers
    handleCanvasTap(data) {
        // Deselect all
        deselectAll();
    }
    
    startCanvasPan(data) {
        canvasDragging = true;
        canvasDragStart = data.position;
        canvas.style.cursor = 'grabbing';
    }
    
    updateCanvasPan(data) {
        if (canvasDragging) {
            const deltaX = data.currentPosition.x - canvasDragStart.x;
            const deltaY = data.currentPosition.y - canvasDragStart.y;
            
            canvasOffset.x += deltaX;
            canvasOffset.y += deltaY;
            
            canvasDragStart = data.currentPosition;
            updateCanvasTransform();
        }
    }
    
    endCanvasPan(data) {
        canvasDragging = false;
        canvas.style.cursor = 'default';
    }
    
    handleToolTap(element, data) {
        // Simulate click on tool button
        element.click();
    }
    
    // Touch-specific UI methods
    createNodeAtPosition(x, y) {
        const snapX = Math.round(x / gridSize) * gridSize;
        const snapY = Math.round(y / gridSize) * gridSize;
        
        const newNode = createNode('Nieuw idee', '', '#4CAF50', snapX, snapY, 'rounded', null, nodes.length === 0);
        
        // Auto-edit new node
        setTimeout(() => {
            const nodeEl = document.getElementById(newNode.id);
            if (nodeEl) {
                const titleEl = nodeEl.querySelector('.node-title');
                if (titleEl) {
                    makeEditable(titleEl, newNode);
                }
            }
        }, 100);
        
        this.showToast('Nieuwe node aangemaakt (dubbel-tik)', false);
    }
    
    showTouchContextMenu(x, y, type, target) {
        // Create touch-friendly context menu
        const contextMenu = document.createElement('div');
        contextMenu.className = 'touch-context-menu';
        contextMenu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: rgba(0, 0, 0, 0.9);
            border-radius: 12px;
            padding: 8px;
            z-index: 10000;
            transform: translate(-50%, -50%);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
        `;
        
        let menuItems = [];
        
        if (type === 'node' && target) {
            menuItems = [
                { label: 'Bewerken', action: () => openNodeEditor(target) },
                { label: 'Hernoemen', action: () => {
                    const titleEl = document.querySelector(`#${target.id} .node-title`);
                    if (titleEl) makeEditable(titleEl, target);
                }},
                { label: 'Nieuw subknooppunt', action: () => {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 150;
                    const childNode = createNode('Nieuw idee', '', target.color, 
                        target.x + Math.cos(angle) * distance, 
                        target.y + Math.sin(angle) * distance, 
                        'rounded', target.id);
                }},
                { label: 'Verwijderen', action: () => deleteNode(target.id), style: 'color: #f44336;' }
            ];
        } else if (type === 'connection' && target) {
            menuItems = [
                { label: 'Bewerken', action: () => openConnectionEditor(target) },
                { label: 'Verwijderen', action: () => deleteConnection(target.id), style: 'color: #f44336;' }
            ];
        } else if (type === 'canvas') {
            menuItems = [
                { label: 'Nieuwe node', action: () => {
                    const canvasCoords = this.gestureManager.getCanvasCoordinates({ clientX: x, clientY: y });
                    this.createNodeAtPosition(canvasCoords.x, canvasCoords.y);
                }},
                { label: 'Centreren', action: () => {
                    if (rootNodeId) {
                        centerOnNode(rootNodeId);
                    }
                }},
                { label: 'Auto-layout', action: () => arrangeNodes() }
            ];
        }
        
        // Create menu items
        menuItems.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'touch-menu-item';
            itemEl.textContent = item.label;
            itemEl.style.cssText = `
                padding: 12px 20px;
                color: white;
                font-size: 16px;
                cursor: pointer;
                border-radius: 8px;
                margin: 2px 0;
                text-align: center;
                min-width: 120px;
                ${item.style || ''}
            `;
            
            itemEl.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                itemEl.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            });
            
            itemEl.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                item.action();
                contextMenu.remove();
            });
            
            contextMenu.appendChild(itemEl);
        });
        
        document.body.appendChild(contextMenu);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (contextMenu.parentNode) {
                contextMenu.remove();
            }
        }, 5000);
        
        // Hide on touch outside
        setTimeout(() => {
            const hideMenu = (e) => {
                if (!contextMenu.contains(e.target)) {
                    contextMenu.remove();
                    document.removeEventListener('touchstart', hideMenu);
                }
            };
            document.addEventListener('touchstart', hideMenu);
        }, 100);
    }
    
    showTouchFeedback(element, type) {
        // Create visual feedback for touch interactions
        const feedback = document.createElement('div');
        feedback.className = `touch-feedback touch-feedback-${type}`;
        
        const rect = element.getBoundingClientRect();
        feedback.style.cssText = `
            position: fixed;
            left: ${rect.left}px;
            top: ${rect.top}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            border-radius: 8px;
            pointer-events: none;
            z-index: 9999;
            transition: all 0.2s ease;
        `;
        
        // Different feedback styles for different actions
        switch (type) {
            case 'tap':
                feedback.style.background = 'rgba(33, 150, 243, 0.3)';
                feedback.style.transform = 'scale(1.05)';
                break;
            case 'doubleTap':
                feedback.style.background = 'rgba(76, 175, 80, 0.3)';
                feedback.style.transform = 'scale(1.1)';
                break;
            case 'longPress':
                feedback.style.background = 'rgba(255, 152, 0, 0.3)';
                feedback.style.transform = 'scale(1.08)';
                break;
            case 'dragStart':
                feedback.style.background = 'rgba(156, 39, 176, 0.3)';
                feedback.style.transform = 'scale(1.05)';
                break;
            case 'dragEnd':
                feedback.style.background = 'rgba(76, 175, 80, 0.3)';
                feedback.style.transform = 'scale(1)';
                break;
        }
        
        document.body.appendChild(feedback);
        
        // Remove after animation
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'scale(1)';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.remove();
                }
            }, 200);
        }, 300);
    }
    
    showZoomIndicator(x, y) {
        this.zoomIndicator = document.createElement('div');
        this.zoomIndicator.className = 'zoom-indicator';
        this.zoomIndicator.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
        `;
        this.zoomIndicator.textContent = Math.round(zoomLevel * 100) + '%';
        
        document.body.appendChild(this.zoomIndicator);
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
    
    findConnectionAtPosition(x, y) {
        const elements = document.elementsFromPoint(x, y);
        for (const element of elements) {
            if (element.classList.contains('connection')) {
                return element;
            }
        }
        return null;
    }
    
    setupTouchStyles() {
        // Enhanced touch styles
        const style = document.createElement('style');
        style.textContent = `
            /* Enhanced Touch Styles */
            @media (hover: none) and (pointer: coarse) {
                .node {
                    min-width: 48px !important;
                    min-height: 48px !important;
                    font-size: 16px !important;
                    padding: 12px !important;
                }
                
                .node-title {
                    font-size: 16px !important;
                    font-weight: 600 !important;
                }
                
                .node-content {
                    font-size: 14px !important;
                }
                
                .add-node-btn {
                    width: 32px !important;
                    height: 32px !important;
                    font-size: 18px !important;
                }
                
                .connection-hitzone {
                    stroke-width: 20px !important;
                }
                
                .connection-control-point {
                    r: 12px !important;
                }
                
                .tool-btn {
                    min-width: 48px !important;
                    min-height: 48px !important;
                    font-size: 16px !important;
                    padding: 12px !important;
                }
                
                .context-menu-item {
                    padding: 16px 20px !important;
                    font-size: 16px !important;
                    min-height: 48px !important;
                }
                
                .zoom-controls button {
                    min-width: 48px !important;
                    min-height: 48px !important;
                    font-size: 20px !important;
                }
                
                /* Touch feedback */
                .touch-feedback {
                    border: 2px solid transparent;
                    animation: touchPulse 0.3s ease-out;
                }
                
                @keyframes touchPulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
                
                .touch-context-menu {
                    animation: touchMenuSlide 0.3s ease-out;
                }
                
                @keyframes touchMenuSlide {
                    0% { 
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.8);
                    }
                    100% { 
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                }
                
                .touch-menu-item:active {
                    background-color: rgba(255, 255, 255, 0.2) !important;
                    transform: scale(0.95);
                }
                
                /* Prevent text selection on touch */
                .node-title:not([contenteditable="true"]),
                .node-content:not([contenteditable="true"]),
                .tool-btn,
                .context-menu-item {
                    -webkit-touch-callout: none;
                    -webkit-user-select: none;
                    -khtml-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                }
                
                /* Enable text selection for editable elements */
                .node-title[contenteditable="true"],
                .node-content[contenteditable="true"],
                input,
                textarea {
                    -webkit-user-select: text;
                    -moz-user-select: text;
                    -ms-user-select: text;
                    user-select: text;
                }
            }
            
            /* Touch-specific connection styles */
            .connection-dragging {
                stroke-width: 4px !important;
                stroke-dasharray: 5,5 !important;
                animation: connectionDragPulse 1s ease-in-out infinite alternate;
            }
            
            @keyframes connectionDragPulse {
                0% { stroke-opacity: 0.7; }
                100% { stroke-opacity: 1; }
            }
            
            /* Touch ripple effect */
            @keyframes touchRipple {
                0% {
                    transform: scale(0);
                    opacity: 1;
                }
                100% {
                    transform: scale(4);
                    opacity: 0;
                }
            }
            
            .touch-ripple {
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.6);
                animation: touchRipple 0.6s ease-out;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
    }
    
    setupTouchTargets() {
        // Enhance touch targets for better accessibility
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.enhanceTouchTargets(node);
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Enhance existing elements
        this.enhanceTouchTargets(document.body);
    }
    
    enhanceTouchTargets(container) {
        // Enhance nodes
        const nodes = container.querySelectorAll('.node');
        nodes.forEach(node => {
            if (!node.hasAttribute('data-touch-enhanced')) {
                node.setAttribute('data-touch-enhanced', 'true');
                
                // Add touch-specific event listeners
                node.addEventListener('touchstart', (e) => {
                    this.addTouchRipple(node, e.touches[0]);
                }, { passive: true });
            }
        });
        
        // Enhance connections
        const connections = container.querySelectorAll('.connection');
        connections.forEach(connection => {
            if (!connection.hasAttribute('data-touch-enhanced')) {
                connection.setAttribute('data-touch-enhanced', 'true');
                
                // Increase hit area for connections
                const hitzone = connection.querySelector('.connection-hitzone');
                if (hitzone) {
                    hitzone.style.strokeWidth = '20px';
                }
            }
        });
        
        // Enhance tools
        const tools = container.querySelectorAll('.tool-btn');
        tools.forEach(tool => {
            if (!tool.hasAttribute('data-touch-enhanced')) {
                tool.setAttribute('data-touch-enhanced', 'true');
                
                tool.addEventListener('touchstart', (e) => {
                    this.addTouchRipple(tool, e.touches[0]);
                }, { passive: true });
            }
        });
    }
    
    addTouchRipple(element, touch) {
        const rect = element.getBoundingClientRect();
        const ripple = document.createElement('div');
        ripple.className = 'touch-ripple';
        
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = size + 'px';
        ripple.style.height = size + 'px';
        ripple.style.left = (touch.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (touch.clientY - rect.top - size / 2) + 'px';
        
        element.appendChild(ripple);
        
        // Remove after animation
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.remove();
            }
        }, 600);
    }
    
    setupAccessibility() {
        // Add ARIA labels and roles for better accessibility
        const addAriaLabels = () => {
            // Nodes
            document.querySelectorAll('.node').forEach(node => {
                if (!node.getAttribute('role')) {
                    node.setAttribute('role', 'button');
                    node.setAttribute('aria-label', 'Mindmap node');
                    node.setAttribute('tabindex', '0');
                }
            });
            
            // Connections
            document.querySelectorAll('.connection').forEach(connection => {
                if (!connection.getAttribute('role')) {
                    connection.setAttribute('role', 'button');
                    connection.setAttribute('aria-label', 'Mindmap connection');
                    connection.setAttribute('tabindex', '0');
                }
            });
            
            // Tools
            document.querySelectorAll('.tool-btn').forEach(tool => {
                if (!tool.getAttribute('aria-label')) {
                    tool.setAttribute('aria-label', tool.title || 'Tool');
                }
            });
        };
        
        // Run initially and on DOM changes
        addAriaLabels();
        const observer = new MutationObserver(addAriaLabels);
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    setupPerformanceOptimizations() {
        // Throttle touch events for better performance
        let touchMoveThrottled = false;
        const originalTouchMove = this.gestureManager.handleTouchMove.bind(this.gestureManager);
        
        this.gestureManager.handleTouchMove = (e) => {
            if (!touchMoveThrottled) {
                touchMoveThrottled = true;
                requestAnimationFrame(() => {
                    originalTouchMove(e);
                    touchMoveThrottled = false;
                });
            }
        };
        
        // Add passive event listeners where possible
        const passiveEvents = ['touchstart', 'touchmove', 'touchend'];
        passiveEvents.forEach(event => {
            canvas.addEventListener(event, (e) => {
                // Prevent default only when necessary
                if (e.target.closest('.node, .connection, .tool-btn')) {
                    e.preventDefault();
                }
            }, { passive: false });
        });
    }
    
    showToast(message, isError = false) {
        if (typeof showToast === 'function') {
            showToast(message, isError);
        }
    }
    
    // Public API
    setMode(mode) {
        this.currentMode = mode;
    }
    
    getMode() {
        return this.currentMode;
    }
    
    isActive() {
        return this.gestureManager.isTouchActive();
    }
    
    cleanup() {
        // Remove event listeners and clean up
        this.gestureManager.resetGestureState();
        this.activeElement = null;
        this.touchConnectionStart = null;
        this.touchConnectionLine = null;
    }
}

// ==========================
// INITIALIZATION
// ==========================

let mobileTouchManager = null;

function initializeMobileTouch() {
    if (mobileTouchManager) {
        mobileTouchManager.cleanup();
    }
    
    mobileTouchManager = new MobileTouchManager();
    
    // Export for global access
    window.mobileTouchManager = mobileTouchManager;
    
    console.log('📱 Enhanced mobile touch support initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMobileTouch);
} else {
    initializeMobileTouch();
}

// Export for manual initialization
window.initializeMobileTouch = initializeMobileTouch;