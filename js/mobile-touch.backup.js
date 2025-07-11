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
        this.dragThreshold = 8; // 8px minimum movement to start drag (optimized for touch accuracy)
        this.pinchThreshold = 15; // 15px minimum distance change for pinch (prevents accidental activation)
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
        // Check if canvas is available
        if (typeof canvas === 'undefined' || !canvas) {
            console.warn('⚠️ Canvas not available for touch gesture manager, retrying...');
            setTimeout(() => this.init(), 100);
            return;
        }
        
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
        // Better event handling - only prevent default when necessary
        const isInteractiveElement = e.target.closest('button, input, textarea, select, [contenteditable="true"], .btn, .menu-item, .hamburger-btn');
        
        if (!isInteractiveElement) {
            e.preventDefault();
        }
        
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
        // Only prevent default if we're actively handling the gesture
        if (this.isTouching && this.touchCount > 0) {
            e.preventDefault();
        }
        
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
        this.velocityTracker = this.velocityTracker.filter(v => now - v.time < 50); // Reduced time window for more responsive tracking
        
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
        
        // Start drag if threshold exceeded with improved detection
        if (!this.isDragging && distance > this.dragThreshold) {
            this.isDragging = true;
            
            // Clear long press timer since we're now dragging
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
            
            this.emit('dragstart', {
                touch: touch,
                startPosition: this.touchStartPos,
                currentPosition: { x: touch.clientX, y: touch.clientY },
                delta: { x: deltaX, y: deltaY },
                target: e.target,
                originalEvent: e
            });
        }
        
        // Continue drag with immediate response
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
        
        // Only emit pinch events if distance change is significant enough
        const distanceChange = Math.abs(currentDistance - this.lastPinchDistance);
        if (distanceChange < this.pinchThreshold) return;
        
        const scale = currentDistance / this.lastPinchDistance;
        const deltaX = currentCenter.x - this.lastPinchCenter.x;
        const deltaY = currentCenter.y - this.lastPinchCenter.y;
        
        // Prevent extreme scale values
        const clampedScale = Math.max(0.5, Math.min(2.0, scale));
        
        this.emit('pinch', {
            touches: [touch1, touch2],
            distance: currentDistance,
            center: currentCenter,
            scale: clampedScale,
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
        if (!canvas) {
            console.warn('⚠️ Canvas not available for coordinate calculation');
            return { x: 0, y: 0 };
        }
        
        const canvasRect = canvas.getBoundingClientRect();
        const zoom = typeof zoomLevel !== 'undefined' ? zoomLevel : 1;
        return {
            x: (touch.clientX - canvasRect.left) / zoom,
            y: (touch.clientY - canvasRect.top) / zoom
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
        
        // Gesture conflict resolution
        this.gesturesPriority = {
            'pinch': 1,      // Highest priority
            'longPress': 2,
            'drag': 3,
            'doubleTap': 4,
            'tap': 5,        // Lowest priority
            'swipe': 6
        };
        this.activeGestures = new Set();
        this.gestureConflictTimer = null;
        
        this.currentMode = this.modes.NAVIGATE;
        this.activeElement = null;
        this.touchConnectionStart = null;
        this.touchConnectionLine = null;
        
        // Drag mode state
        this.isDragModeEnabled = false;
        this.dragModeNode = null;
        this.dragModeElement = null;
        this.dragModeStartPos = null;
        this.dragModeActive = false;
        
        // Connection mode state
        this.isConnectionModeEnabled = false;
        this.connectionStartNode = null;
        this.connectionStartElement = null;
        this.connectionPreviewLine = null;
        
        this.init();
    }
    
    init() {
        if (this.isInitialized) return;
        
        this.setupGestureHandlers();
        this.setupTouchStyles();
        this.setupTouchTargets();
        this.setupAccessibility();
        this.setupPerformanceOptimizations();
        this.setupGestureConflictResolution();
        
        this.isInitialized = true;
        console.log('📱 Mobile Touch Manager initialized');
    }
    
    setupGestureConflictResolution() {
        // Method to resolve gesture conflicts based on priority
        this.resolveGestureConflict = (newGesture) => {
            const newPriority = this.gesturesPriority[newGesture] || 999;
            
            // Check if any active gesture has higher priority
            for (const activeGesture of this.activeGestures) {
                const activePriority = this.gesturesPriority[activeGesture] || 999;
                if (activePriority < newPriority) {
                    console.log(`🚫 Gesture conflict: ${newGesture} blocked by ${activeGesture}`);
                    return false; // Block the new gesture
                }
            }
            
            // Remove lower priority gestures
            for (const activeGesture of this.activeGestures) {
                const activePriority = this.gesturesPriority[activeGesture] || 999;
                if (activePriority > newPriority) {
                    this.activeGestures.delete(activeGesture);
                    console.log(`⚡ Gesture override: ${newGesture} overrode ${activeGesture}`);
                }
            }
            
            this.activeGestures.add(newGesture);
            
            // Clear gesture after timeout
            if (this.gestureConflictTimer) {
                clearTimeout(this.gestureConflictTimer);
            }
            
            this.gestureConflictTimer = setTimeout(() => {
                this.activeGestures.clear();
            }, 1000);
            
            return true; // Allow the new gesture
        };
    }
    
    setupGestureHandlers() {
        // Tap gesture - select nodes/connections
        this.gestureManager.on('tap', (data) => {
            if (this.resolveGestureConflict('tap')) {
                this.handleTap(data);
            }
        });
        
        // Double tap - create new node or edit existing
        this.gestureManager.on('doubleTap', (data) => {
            if (this.resolveGestureConflict('doubleTap')) {
                this.handleDoubleTap(data);
            }
        });
        
        // Long press - context menu
        this.gestureManager.on('longPress', (data) => {
            if (this.resolveGestureConflict('longPress')) {
                this.handleLongPress(data);
            }
        });
        
        // Drag - move nodes or pan canvas
        this.gestureManager.on('dragstart', (data) => {
            if (this.resolveGestureConflict('drag')) {
                this.handleDragStart(data);
            }
        });
        
        this.gestureManager.on('drag', (data) => {
            // Continue drag if already active, no need to resolve conflict again
            if (this.activeGestures.has('drag')) {
                this.handleDrag(data);
            }
        });
        
        this.gestureManager.on('dragend', (data) => {
            if (this.activeGestures.has('drag')) {
                this.handleDragEnd(data);
                this.activeGestures.delete('drag'); // Remove drag from active gestures
            }
        });
        
        // Pinch - zoom (highest priority)
        this.gestureManager.on('pinchstart', (data) => {
            if (this.resolveGestureConflict('pinch')) {
                this.handlePinchStart(data);
            }
        });
        
        this.gestureManager.on('pinch', (data) => {
            if (this.activeGestures.has('pinch')) {
                this.handlePinch(data);
            }
        });
        
        this.gestureManager.on('pinchend', (data) => {
            if (this.activeGestures.has('pinch')) {
                this.handlePinchEnd(data);
                this.activeGestures.delete('pinch'); // Remove pinch from active gestures
            }
        });
        
        // Swipe - quick navigation
        this.gestureManager.on('swipe', (data) => {
            if (this.resolveGestureConflict('swipe')) {
                this.handleSwipe(data);
            }
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
        const element = data.target.closest('.node, .connection');
        
        if (element) {
            this.showTouchFeedback(element, 'doubleTap');
            
            if (element.classList.contains('node')) {
                // Open context menu for node
                const node = nodes.find(n => n.id === element.id);
                if (node) {
                    this.showTouchContextMenu(data.position.x, data.position.y, 'node', node);
                }
            } else if (element.classList.contains('connection')) {
                // Open context menu for connection
                const connection = connections.find(c => c.id === element.id);
                if (connection) {
                    this.showTouchContextMenu(data.position.x, data.position.y, 'connection', connection);
                }
            }
        } else {
            // Create new node
            this.createNodeAtPosition(data.position.canvasX, data.position.canvasY);
        }
    }
    
    handleLongPress(data) {
        const element = data.target.closest('.node');
        
        if (element && element.classList.contains('node')) {
            // Long press on node - enable dragging mode
            const node = nodes.find(n => n.id === element.id);
            if (node) {
                this.showTouchFeedback(element, 'longPress');
                
                // Select the node first
                selectNode(node.id);
                
                // Enable dragging mode
                this.enableDragMode(element, node, data);
                
                // Show visual feedback for drag mode
                this.showToast('Drag-modus ingeschakeld (sleep om te verplaatsen)', false);
            }
        } else {
            // Long press on canvas or connection - show context menu
            const connectionElement = data.target.closest('.connection');
            if (connectionElement) {
                const connection = connections.find(c => c.id === connectionElement.id);
                if (connection) {
                    this.showTouchContextMenu(data.position.x, data.position.y, 'connection', connection);
                }
            } else {
                // Long press on canvas
                this.showTouchContextMenu(data.position.x, data.position.y, 'canvas', null);
            }
        }
    }
    
    handleDragStart(data) {
        // Check if we're in drag mode and should handle this differently
        if (this.isDragModeEnabled && this.dragModeNode) {
            // Already in drag mode, don't start new drag
            return;
        }
        
        const element = data.target.closest('.node, .connection');
        
        if (element) {
            this.activeElement = element;
            this.showTouchFeedback(element, 'dragStart');
            
            if (element.classList.contains('node')) {
                // Don't start regular node drag, require long press for drag mode
                // This prevents accidental dragging
                return;
            } else if (element.classList.contains('connection')) {
                this.startConnectionDrag(element, data);
            }
        } else {
            // Start canvas pan immediately for real-time dragging
            this.startCanvasPan(data);
        }
    }
    
    handleDrag(data) {
        // Check if we're in drag mode
        if (this.isDragModeEnabled && this.dragModeNode) {
            this.handleDragModeMove(data);
            return;
        }
        
        if (this.activeElement) {
            if (this.activeElement.classList.contains('node')) {
                // Regular node drag is disabled, only drag mode allowed
                return;
            } else if (this.activeElement.classList.contains('connection')) {
                this.updateConnectionDrag(this.activeElement, data);
            }
        } else {
            // Update canvas pan with real-time response
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
        this.initialZoom = typeof zoomLevel !== 'undefined' ? zoomLevel : 1;
        this.initialOffset = typeof canvasOffset !== 'undefined' ? { ...canvasOffset } : { x: 0, y: 0 };
        
        // Store the initial pinch center
        this.initialPinchCenter = { x: data.center.x, y: data.center.y };
        
        // Show zoom indicator at screen center for better visibility
        this.showZoomIndicator(window.innerWidth / 2, window.innerHeight / 2);
    }
    
    handlePinch(data) {
        // Check if required globals are available
        if (typeof setZoomLevel === 'undefined' || typeof updateCanvasTransform === 'undefined') {
            console.warn('⚠️ Required zoom functions not available');
            return;
        }
        
        // Calculate new zoom level with better scaling
        const scaleChange = data.scale;
        const newZoom = Math.max(0.1, Math.min(3, this.initialZoom * scaleChange));
        
        // Get pinch center relative to viewport
        const centerX = data.center.x;
        const centerY = data.center.y;
        
        // Apply zoom
        setZoomLevel(newZoom);
        
        // Adjust offset to zoom towards pinch center
        if (typeof canvasOffset !== 'undefined') {
            // Calculate the point in canvas coordinates that should remain fixed
            const fixedPointX = (centerX - this.initialOffset.x) / this.initialZoom;
            const fixedPointY = (centerY - this.initialOffset.y) / this.initialZoom;
            
            // Calculate new offset to keep the fixed point at the same screen position
            canvasOffset.x = centerX - (fixedPointX * newZoom);
            canvasOffset.y = centerY - (fixedPointY * newZoom);
        }
        
        updateCanvasTransform();
        
        // Update zoom indicator
        this.updateZoomIndicator(Math.round(newZoom * 100) + '%');
    }
    
    handlePinchEnd(data) {
        this.hideZoomIndicator();
    }
    
    handleSwipe(data) {
        // Swipe gesture handling disabled for pure real-time dragging experience
        // All navigation is now handled through real-time drag operations
        console.log('🚀 Swipe detected but ignored (real-time dragging active):', data.direction, 'velocity:', data.velocity);
        
        // Optional: Show swipe feedback but don't navigate
        // this.showToast(`Swipe ${data.direction} gedetecteerd (gebruik drag voor navigatie)`, false);
    }
    
    enableDragMode(element, node, data) {
        // Set dragging mode state
        this.isDragModeEnabled = true;
        this.dragModeNode = node;
        this.dragModeElement = element;
        this.dragModeStartPos = data.position;
        this.dragModeNodeStartPos = { x: node.x, y: node.y }; // Store original node position
        this.dragModeLastPos = null; // Track last position for relative movement
        
        // Visual feedback for drag mode
        element.style.transform = 'scale(1.05)';
        element.style.opacity = '0.8';
        element.style.zIndex = '1000';
        element.classList.add('drag-mode-active');
        
        // Save state for undo
        if (typeof saveStateForUndo !== 'undefined') {
            saveStateForUndo();
        }
        
        // Set up drag listener
        this.setupDragModeListeners();
    }
    
    setupDragModeListeners() {
        // Override normal gesture handlers while in drag mode
        this.dragModeActive = true;
        
        // Listen for drag gestures
        this.gestureManager.on('drag', (data) => {
            if (this.isDragModeEnabled && this.dragModeNode) {
                this.handleDragModeMove(data);
            }
        });
        
        // Listen for drag end
        this.gestureManager.on('dragend', (data) => {
            if (this.isDragModeEnabled) {
                this.disableDragMode();
            }
        });
        
        // Listen for tap to disable drag mode
        this.gestureManager.on('tap', (data) => {
            if (this.isDragModeEnabled) {
                this.disableDragMode();
            }
        });
    }
    
    handleDragModeMove(data) {
        if (!this.dragModeNode || !this.dragModeElement) return;
        
        const currentZoom = typeof zoomLevel !== 'undefined' ? zoomLevel : 1;
        const currentOffset = typeof canvasOffset !== 'undefined' ? canvasOffset : { x: 0, y: 0 };
        
        // Get canvas rectangle for proper coordinate transformation
        const canvasRect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
        
        // Calculate position relative to canvas, accounting for zoom and offset
        const canvasX = (data.currentPosition.x - canvasRect.left - currentOffset.x) / currentZoom;
        const canvasY = (data.currentPosition.y - canvasRect.top - currentOffset.y) / currentZoom;
        
        // Calculate delta from the original drag start position in canvas coordinates
        const startCanvasX = (this.dragModeStartPos.x - canvasRect.left - currentOffset.x) / currentZoom;
        const startCanvasY = (this.dragModeStartPos.y - canvasRect.top - currentOffset.y) / currentZoom;
        
        const deltaX = canvasX - startCanvasX;
        const deltaY = canvasY - startCanvasY;
        
        // Calculate new position based on original node position + delta
        const newX = this.dragModeNodeStartPos.x + deltaX;
        const newY = this.dragModeNodeStartPos.y + deltaY;
        
        // Snap to grid for better alignment
        const currentGridSize = typeof gridSize !== 'undefined' ? gridSize : 20;
        const snapX = Math.round(newX / currentGridSize) * currentGridSize;
        const snapY = Math.round(newY / currentGridSize) * currentGridSize;
        
        // Update node position
        this.dragModeNode.x = snapX;
        this.dragModeNode.y = snapY;
        
        // Update DOM element position with requestAnimationFrame for smooth movement
        requestAnimationFrame(() => {
            if (this.dragModeElement) {
                this.dragModeElement.style.left = snapX + 'px';
                this.dragModeElement.style.top = snapY + 'px';
            }
        });
        
        // Update connections with throttling for performance
        if (typeof updateRelatedConnections !== 'undefined') {
            if (!this.connectionUpdateThrottle) {
                this.connectionUpdateThrottle = true;
                requestAnimationFrame(() => {
                    updateRelatedConnections(this.dragModeNode.id, true);
                    this.connectionUpdateThrottle = false;
                });
            }
        }
    }
    
    disableDragMode() {
        if (!this.isDragModeEnabled) return;
        
        // Reset visual feedback for current drag element
        if (this.dragModeElement) {
            this.dragModeElement.style.transform = '';
            this.dragModeElement.style.opacity = '';
            this.dragModeElement.style.zIndex = '';
            this.dragModeElement.classList.remove('drag-mode-active');
        }
        
        // Force cleanup of any lingering drag mode indicators
        this.forceCleanupDragModeIndicators();
        
        // Final connection update
        if (this.dragModeNode && typeof refreshConnections !== 'undefined') {
            refreshConnections();
        }
        
        // Reset state
        this.isDragModeEnabled = false;
        this.dragModeNode = null;
        this.dragModeElement = null;
        this.dragModeStartPos = null;
        this.dragModeNodeStartPos = null;
        this.dragModeLastPos = null;
        this.dragModeActive = false;
        
        this.showToast('Drag-modus uitgeschakeld', false);
    }
    
    forceCleanupDragModeIndicators() {
        // Remove drag-mode-active class from all nodes
        const allNodes = document.querySelectorAll('.node');
        allNodes.forEach(node => {
            node.classList.remove('drag-mode-active');
            node.style.transform = '';
            node.style.opacity = '';
            node.style.zIndex = '';
        });
    }
    
    enableConnectionMode(element, node) {
        // Disable drag mode if active
        if (this.isDragModeEnabled) {
            this.disableDragMode();
        }
        
        // Set connection mode state
        this.isConnectionModeEnabled = true;
        this.connectionStartNode = node;
        this.connectionStartElement = element;
        
        // Visual feedback for connection mode
        element.style.border = '3px solid #2196F3';
        element.style.boxShadow = '0 0 15px rgba(33, 150, 243, 0.6)';
        element.classList.add('connection-mode-active');
        
        // Show instruction toast
        this.showToast('Tik op een andere node om te verbinden', false);
        
        // Set up connection mode listeners
        this.setupConnectionModeListeners();
    }
    
    setupConnectionModeListeners() {
        // Listen for taps on other nodes
        this.connectionModeActive = true;
        
        // Override normal tap handler for connection mode
        this.originalTapHandler = this.handleTap;
        this.handleTap = (data) => {
            if (this.isConnectionModeEnabled) {
                this.handleConnectionModeTap(data);
            } else {
                this.originalTapHandler(data);
            }
        };
    }
    
    handleConnectionModeTap(data) {
        const element = data.target.closest('.node');
        
        if (element && element.classList.contains('node')) {
            const targetNode = nodes.find(n => n.id === element.id);
            
            if (targetNode && targetNode.id !== this.connectionStartNode.id) {
                // Create connection
                if (typeof createConnection !== 'undefined') {
                    createConnection(this.connectionStartNode.id, targetNode.id);
                    this.showToast('Verbinding gemaakt!', false);
                } else {
                    this.showToast('Fout bij maken verbinding', true);
                }
                
                // Disable connection mode
                this.disableConnectionMode();
            } else if (targetNode && targetNode.id === this.connectionStartNode.id) {
                // Clicked on same node, cancel connection mode
                this.disableConnectionMode();
            }
        } else {
            // Clicked on canvas, cancel connection mode
            this.disableConnectionMode();
        }
    }
    
    disableConnectionMode() {
        if (!this.isConnectionModeEnabled) return;
        
        // Reset visual feedback
        if (this.connectionStartElement) {
            this.connectionStartElement.style.border = '';
            this.connectionStartElement.style.boxShadow = '';
            this.connectionStartElement.classList.remove('connection-mode-active');
        }
        
        // Remove connection preview line if exists
        if (this.connectionPreviewLine) {
            this.connectionPreviewLine.remove();
            this.connectionPreviewLine = null;
        }
        
        // Reset state
        this.isConnectionModeEnabled = false;
        this.connectionStartNode = null;
        this.connectionStartElement = null;
        this.connectionModeActive = false;
        
        // Restore original tap handler
        if (this.originalTapHandler) {
            this.handleTap = this.originalTapHandler;
            this.originalTapHandler = null;
        }
        
        this.showToast('Verbindingsmodus uitgeschakeld', false);
    }
    
    createIntermediateNode(connection, screenX, screenY) {
        // Get the canvas coordinates for the new node
        const canvasCoords = this.gestureManager.getCanvasCoordinates({ clientX: screenX, clientY: screenY });
        
        // Get source and target nodes
        const sourceNode = nodes.find(n => n.id === connection.source);
        const targetNode = nodes.find(n => n.id === connection.target);
        
        if (!sourceNode || !targetNode) {
            this.showToast('Fout: Kan bron- of doelnode niet vinden', true);
            return;
        }
        
        // Create new intermediate node
        const intermediateNode = createNode(
            'Tussennode',
            '',
            sourceNode.color,
            canvasCoords.x,
            canvasCoords.y,
            'rounded'
        );
        
        // Save state for undo
        if (typeof saveStateForUndo !== 'undefined') {
            saveStateForUndo();
        }
        
        // Delete original connection
        if (typeof deleteConnection !== 'undefined') {
            deleteConnection(connection.id);
        }
        
        // Create two new connections
        if (typeof createConnection !== 'undefined') {
            createConnection(sourceNode.id, intermediateNode.id);
            createConnection(intermediateNode.id, targetNode.id);
        }
        
        // Auto-edit the new node
        setTimeout(() => {
            const nodeEl = document.getElementById(intermediateNode.id);
            if (nodeEl) {
                const titleEl = nodeEl.querySelector('.node-title');
                if (titleEl && typeof makeEditable !== 'undefined') {
                    makeEditable(titleEl, intermediateNode);
                }
            }
        }, 100);
        
        this.showToast('Tussennode toegevoegd', false);
    }
    
    // Node-specific touch handlers
    handleNodeTap(element, data) {
        // First, disable any active drag mode
        if (this.isDragModeEnabled) {
            this.disableDragMode();
        }
        
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
        // Check if required globals are available
        if (typeof canvasOffset === 'undefined' || typeof updateCanvasTransform === 'undefined') {
            console.warn('⚠️ Canvas pan functions not available');
            return;
        }
        
        this.canvasDragging = true;
        this.canvasDragStart = {
            x: data.currentPosition.x,
            y: data.currentPosition.y
        };
        this.canvasStartOffset = { ...canvasOffset };
        this.lastTouchPosition = {
            x: data.currentPosition.x,
            y: data.currentPosition.y
        };
        
        // Disable transitions for real-time movement
        if (canvas) {
            canvas.style.cursor = 'grabbing';
            canvas.style.transition = 'none';
        }
        
        // Initialize velocity tracking
        this.canvasPanVelocity = { x: 0, y: 0 };
        this.canvasPanHistory = [{
            time: Date.now(),
            x: data.currentPosition.x,
            y: data.currentPosition.y
        }];
    }
    
    updateCanvasPan(data) {
        if (!this.canvasDragging || typeof canvasOffset === 'undefined') return;
        
        const now = Date.now();
        const currentX = data.currentPosition.x;
        const currentY = data.currentPosition.y;
        
        // Calculate real-time delta from last position for instant response
        const deltaX = currentX - this.lastTouchPosition.x;
        const deltaY = currentY - this.lastTouchPosition.y;
        
        // Apply smoothing for better user experience
        const smoothingFactor = 0.8; // Adjust for responsiveness vs smoothness
        const smoothedDeltaX = deltaX * smoothingFactor;
        const smoothedDeltaY = deltaY * smoothingFactor;
        
        // Apply movement with improved responsiveness
        canvasOffset.x += smoothedDeltaX;
        canvasOffset.y += smoothedDeltaY;
        
        // Update last position for next frame
        this.lastTouchPosition.x = currentX;
        this.lastTouchPosition.y = currentY;
        
        // Track velocity for momentum (using position history)
        this.canvasPanHistory.push({
            time: now,
            x: currentX,
            y: currentY
        });
        
        // Keep only recent history for velocity calculation
        this.canvasPanHistory = this.canvasPanHistory.filter(entry => now - entry.time < 100);
        
        // Calculate velocity for momentum
        if (this.canvasPanHistory.length > 1) {
            const recent = this.canvasPanHistory[this.canvasPanHistory.length - 1];
            const older = this.canvasPanHistory[0];
            const timeDiff = recent.time - older.time;
            if (timeDiff > 0) {
                this.canvasPanVelocity.x = (recent.x - older.x) / timeDiff;
                this.canvasPanVelocity.y = (recent.y - older.y) / timeDiff;
            }
        }
        
        // Update canvas transform immediately
        updateCanvasTransform();
        
        // Show real-time feedback (optional - can be disabled for performance)
        const totalDeltaX = currentX - this.canvasDragStart.x;
        const totalDeltaY = currentY - this.canvasDragStart.y;
        const totalDistance = Math.sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY);
        
        if (totalDistance > 10) { // Only show if significant total movement
            const directionX = totalDeltaX > 0 ? 'rechts' : 'links';
            const directionY = totalDeltaY > 0 ? 'omhoog' : 'omlaag';
            const primaryDirection = Math.abs(totalDeltaX) > Math.abs(totalDeltaY) ? directionX : directionY;
            const primaryDistance = Math.round(Math.abs(totalDeltaX) > Math.abs(totalDeltaY) ? Math.abs(totalDeltaX) : Math.abs(totalDeltaY));
            
            this.showRealTimePanFeedback(primaryDirection, primaryDistance);
        }
    }
    
    endCanvasPan(data) {
        if (!this.canvasDragging) return;
        
        this.canvasDragging = false;
        
        // Reset canvas cursor and transitions
        if (canvas) {
            canvas.style.cursor = 'default';
            canvas.style.transition = '';
        }
        
        // Hide real-time pan feedback
        this.hideRealTimePanFeedback();
        
        // Calculate final movement distance for feedback
        const finalDeltaX = data.endPosition.x - this.canvasDragStart.x;
        const finalDeltaY = data.endPosition.y - this.canvasDragStart.y;
        const totalDistance = Math.sqrt(finalDeltaX * finalDeltaX + finalDeltaY * finalDeltaY);
        
        // Apply momentum if velocity is significant
        if (this.canvasPanVelocity && (Math.abs(this.canvasPanVelocity.x) > 0.2 || Math.abs(this.canvasPanVelocity.y) > 0.2)) {
            this.applyCanvasMomentum();
        }
        
        // Clean up
        this.canvasDragStart = null;
        this.canvasStartOffset = null;
        this.lastTouchPosition = null;
        this.canvasPanHistory = [];
    }
    
    applyCanvasMomentum() {
        if (!this.canvasPanVelocity || typeof canvasOffset === 'undefined') return;
        
        const friction = 0.88; // Balanced friction for natural feel
        const minVelocity = 0.05;
        const velocityMultiplier = 12; // Optimized for smooth momentum
        
        const animate = () => {
            // Apply velocity to offset with smooth control
            canvasOffset.x += this.canvasPanVelocity.x * velocityMultiplier;
            canvasOffset.y += this.canvasPanVelocity.y * velocityMultiplier;
            
            // Apply friction
            this.canvasPanVelocity.x *= friction;
            this.canvasPanVelocity.y *= friction;
            
            updateCanvasTransform();
            
            // Continue animation if velocity is still significant
            if (Math.abs(this.canvasPanVelocity.x) > minVelocity || Math.abs(this.canvasPanVelocity.y) > minVelocity) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    handleToolTap(element, data) {
        // Simulate click on tool button
        element.click();
    }
    
    // Touch-specific UI methods
    createNodeAtPosition(x, y) {
        const currentGridSize = typeof gridSize !== 'undefined' ? gridSize : 20;
        const snapX = Math.round(x / currentGridSize) * currentGridSize;
        const snapY = Math.round(y / currentGridSize) * currentGridSize;
        
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
                { label: 'Tekst bewerken', action: () => {
                    const titleEl = document.querySelector(`#${target.id} .node-title`);
                    if (titleEl) makeEditable(titleEl, target);
                }},
                { label: 'Drag-modus', action: () => {
                    const element = document.getElementById(target.id);
                    if (element) {
                        this.enableDragMode(element, target, { position: { x: x, y: y } });
                    }
                }},
                { label: 'Verbind met...', action: () => {
                    const element = document.getElementById(target.id);
                    if (element) {
                        this.enableConnectionMode(element, target);
                    }
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
                { label: 'Tussennode toevoegen', action: () => {
                    this.createIntermediateNode(target, x, y);
                }},
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
        const currentZoom = typeof zoomLevel !== 'undefined' ? zoomLevel : 1;
        this.zoomIndicator.textContent = Math.round(currentZoom * 100) + '%';
        
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
    
    showRealTimePanFeedback(direction, distance) {
        // Disable real-time feedback during dragging to reduce visual noise
        // and improve performance for smoother dragging experience
        return;
        
        /* Original implementation kept for reference
        if (!this.panIndicator) {
            this.panIndicator = document.createElement('div');
            this.panIndicator.className = 'pan-indicator';
            this.panIndicator.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: bold;
                z-index: 10000;
                pointer-events: none;
                transition: opacity 0.1s ease;
            `;
            document.body.appendChild(this.panIndicator);
        }
        
        this.panIndicator.textContent = `Pan ${direction}: ${distance}px`;
        this.panIndicator.style.opacity = '1';
        */
    }
    
    hideRealTimePanFeedback() {
        if (this.panIndicator) {
            this.panIndicator.style.opacity = '0';
            setTimeout(() => {
                if (this.panIndicator && this.panIndicator.parentNode) {
                    this.panIndicator.remove();
                    this.panIndicator = null;
                }
            }, 200);
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
                    min-width: 60px !important;
                    min-height: 50px !important;
                    font-size: 16px !important;
                    padding: 14px !important;
                    border-width: 3px !important; /* Thicker borders for better visibility */
                }
                
                .node-title {
                    font-size: 17px !important;
                    font-weight: 600 !important;
                    line-height: 1.3 !important;
                }
                
                .node-content {
                    font-size: 15px !important;
                    line-height: 1.4 !important;
                }
                
                .add-node-btn {
                    width: 36px !important;
                    height: 36px !important;
                    font-size: 20px !important;
                    border-width: 2px !important;
                }
                
                .connection-hitzone {
                    stroke-width: 24px !important; /* Wider hit areas for connections */
                }
                
                .connection-control-point {
                    r: 14px !important; /* Larger control points */
                }
                
                .tool-btn {
                    min-width: 52px !important;
                    min-height: 52px !important;
                    font-size: 18px !important;
                    padding: 14px !important;
                }
                
                .context-menu-item {
                    padding: 18px 24px !important;
                    font-size: 17px !important;
                    min-height: 52px !important;
                }
                
                .zoom-controls button {
                    min-width: 52px !important;
                    min-height: 52px !important;
                    font-size: 22px !important;
                }
                
                /* Better touch feedback */
                .node:active {
                    transform: scale(0.97) !important;
                    transition: transform 0.1s ease !important;
                }
                
                .tool-btn:active, .context-menu-item:active {
                    transform: scale(0.95) !important;
                    transition: transform 0.1s ease !important;
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
                
                /* Prevent keyboard popup by removing focus from non-editable elements */
                .node:not(.editing) .node-title,
                .node:not(.editing) .node-content,
                .canvas-container,
                #mindmap-canvas,
                .connection,
                .tool-btn:not(input):not(textarea) {
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                    outline: none;
                }
                
                /* Prevent focus on canvas elements */
                .node:not(.editing),
                .connection,
                .canvas-container,
                #mindmap-canvas {
                    -webkit-tap-highlight-color: transparent;
                    -webkit-focus-ring-color: transparent;
                    outline: none;
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
            
            /* Drag mode styles */
            .drag-mode-active {
                border: 2px solid #FF9800 !important;
                box-shadow: 0 0 20px rgba(255, 152, 0, 0.6) !important;
                animation: dragModePulse 1.5s ease-in-out infinite alternate;
            }
            
            @keyframes dragModePulse {
                0% { 
                    box-shadow: 0 0 20px rgba(255, 152, 0, 0.6);
                }
                100% { 
                    box-shadow: 0 0 30px rgba(255, 152, 0, 0.8);
                }
            }
            
            /* Connection mode styles */
            .connection-mode-active {
                border: 3px solid #2196F3 !important;
                box-shadow: 0 0 20px rgba(33, 150, 243, 0.6) !important;
                animation: connectionModePulse 1.5s ease-in-out infinite alternate;
            }
            
            @keyframes connectionModePulse {
                0% { 
                    box-shadow: 0 0 15px rgba(33, 150, 243, 0.6);
                }
                100% { 
                    box-shadow: 0 0 25px rgba(33, 150, 243, 0.8);
                }
            }
            
            /* Enhanced swipe feedback */
            .swipe-feedback {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 20px;
                border-radius: 25px;
                font-size: 14px;
                font-weight: bold;
                z-index: 10000;
                pointer-events: none;
                animation: swipeFeedback 0.8s ease-out;
            }
            
            @keyframes swipeFeedback {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                30% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(1.1);
                }
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
        
        // Prevent keyboard popup on canvas interactions
        this.setupKeyboardPrevention();
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
        // Remove throttling for real-time dragging experience
        // Touch events are now processed immediately for instant response
        
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
        
        // Optimize canvas transforms for better performance
        if (canvas) {
            canvas.style.willChange = 'transform';
            canvas.style.transformStyle = 'preserve-3d';
        }
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
    
    setupKeyboardPrevention() {
        // Prevent keyboard popup by ensuring canvas and non-editable elements don't get focus
        const preventFocus = (e) => {
            const target = e.target;
            const isEditableNode = target.contentEditable === 'true' || target.closest('[contenteditable="true"]');
            const isFormElement = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
            
            if (!isEditableNode && !isFormElement) {
                e.preventDefault();
                target.blur();
            }
        };
        
        // Add to canvas and nodes
        document.addEventListener('focusin', preventFocus);
        document.addEventListener('touchstart', (e) => {
            const target = e.target;
            if (target.classList.contains('node') || target.closest('.node')) {
                const node = target.closest('.node');
                if (node && !node.classList.contains('editing')) {
                    e.preventDefault();
                }
            }
        });
        
        // Prevent long press context menu on non-editable elements
        document.addEventListener('contextmenu', (e) => {
            const target = e.target;
            const isEditableNode = target.contentEditable === 'true' || target.closest('[contenteditable="true"]');
            const isFormElement = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
            
            if (!isEditableNode && !isFormElement) {
                e.preventDefault();
            }
        });
    }
    
    cleanup() {
        // Remove event listeners and clean up
        this.gestureManager.resetGestureState();
        this.activeElement = null;
        this.touchConnectionStart = null;
        this.touchConnectionLine = null;
        
        // Clean up drag mode
        if (this.isDragModeEnabled) {
            this.disableDragMode();
        }
        
        // Clean up connection mode
        if (this.isConnectionModeEnabled) {
            this.disableConnectionMode();
        }
    }
}

// ==========================
// INITIALIZATION
// ==========================

let mobileTouchManager = null;

function initializeMobileTouch() {
    // Check if required globals are available
    if (typeof canvas === 'undefined' || !canvas) {
        console.warn('⚠️ Canvas not available for mobile touch initialization, retrying...');
        setTimeout(initializeMobileTouch, 100);
        return;
    }
    
    if (mobileTouchManager) {
        mobileTouchManager.cleanup();
    }
    
    mobileTouchManager = new MobileTouchManager();
    
    // Export for global access
    window.mobileTouchManager = mobileTouchManager;
    
    console.log('📱 Enhanced mobile touch support initialized');
}

// Auto-initialize when DOM is ready and canvas is available
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMobileTouch);
} else {
    // Wait a bit for the canvas to be initialized
    setTimeout(initializeMobileTouch, 100);
}

// Export for manual initialization
window.initializeMobileTouch = initializeMobileTouch;