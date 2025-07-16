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
            mode: 'idle', // idle, dragging, connecting
            activePointers: new Map(),
            dragTarget: null,
            dragStart: null
        };
        
        // Configuration
        this.config = {
            dragThreshold: 10, // Standard threshold for drag detection
            doubleTapDelay: 300,
            longPressDelay: 500,
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
                e.stopPropagation();
            }
        });
        
        // Also prevent legacy context menu on nodes for touch events
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.node') && e.pointerType === 'touch') {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
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
            // Defer to mobile-nav.js for pinch handling
            // Don't handle pinch in this manager
        }
        
        // Capture pointer for consistent events
        e.target.setPointerCapture(e.pointerId);
    }
    
    handleSinglePointerDown(e) {
        const pointer = this.state.activePointers.get(e.pointerId);
        const element = this.getInteractiveElement(e);
        
        // Check for double tap (only for touch events)
        const now = Date.now();
        const tapDelta = now - this.lastTap.time;
        const distance = this.getDistance(
            e.clientX, e.clientY,
            this.lastTap.x, this.lastTap.y
        );
        
        if (e.pointerType === 'touch' &&
            tapDelta < this.config.doubleTapDelay && 
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
        
        // Start long press timer (only for touch events)
        if (e.pointerType === 'touch') {
            this.clearTimer('longPress');
            this.timers.longPress = setTimeout(() => {
                if (this.state.mode === 'idle' && this.state.activePointers.has(e.pointerId)) {
                    this.handleLongPress(e, element);
                }
            }, this.config.longPressDelay);
        }
        
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
            // Defer to mobile-nav.js for pinch handling
            // Don't handle pinch in this manager
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
            }
            // Canvas panning is now handled by mobile-nav.js
        }
        
        // Continue current action only if not in multi-touch mode
        if (this.state.activePointers.size === 1) {
            switch (this.state.mode) {
                case 'dragging':
                    this.updateNodeDrag(pointer);
                    break;
                // panning is now handled by mobile-nav.js
            }
            
            // Removed swipe gesture - using double-tap instead
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
                // It's a tap - but check if we recently had a pinch
                this.clearTimer('longPress');
                
                // Don't process tap if we recently ended a pinch
                if (window.mobileNavigationManager && 
                    window.mobileNavigationManager.state.lastPinchEndTime && 
                    Date.now() - window.mobileNavigationManager.state.lastPinchEndTime < 300) {
                    return;
                }
                
                const element = this.getInteractiveElement(e);
                this.handleTap(e, element);
            } else if (this.state.mode === 'dragging') {
                this.endNodeDrag();
            }
        } else if (pointerCount === 2) {
            // Pinch handling is deferred to mobile-nav.js
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
        console.log('handleTap called with element:', element, 'e.target:', e.target);
        
        // Don't process tap if we're currently pinching or recently ended a pinch
        if (window.mobileNavigationManager && 
            (window.mobileNavigationManager.state.isPinching ||
             (window.mobileNavigationManager.state.lastPinchEndTime && 
              Date.now() - window.mobileNavigationManager.state.lastPinchEndTime < 300))) {
            return;
        }
        
        if (!element) {
            console.log('Tap on empty canvas - deselecting');
            // Tap on canvas - deselect and remove context menu
            if (typeof deselectAll === 'function') {
                deselectAll();
            }
            this.removeContextMenu();
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
        console.log('Double tap detected on element:', element, 'target:', e.target);
        
        // Don't show context menu if we recently ended a pinch zoom OR if we're currently pinching
        if (window.mobileNavigationManager && 
            (window.mobileNavigationManager.state.isPinching ||
             (window.mobileNavigationManager.state.lastPinchEndTime && 
              Date.now() - window.mobileNavigationManager.state.lastPinchEndTime < 500))) {
            console.log('Double tap blocked due to recent pinch');
            return;
        }
        
        if (!element) {
            // Double tap on canvas - create node
            console.log('Double tap on empty canvas detected');
            const coords = this.getCanvasCoordinates(e);
            console.log('Canvas coordinates:', coords);
            this.createNodeAtPosition(coords.x, coords.y);
        } else if (element.classList.contains('node')) {
            // Double tap on node - automatically create a new connected node
            const node = nodes.find(n => n.id === element.id);
            if (node) {
                this.createConnectedNode(node);
            }
        } else if (element.classList.contains('connection')) {
            // Double tap on connection - show simple connection menu
            const connection = connections.find(c => c.id === element.id);
            if (connection) {
                this.showSimpleConnectionMenu(e.clientX, e.clientY, connection);
            }
        }
        
        this.showVisualFeedback(element || canvas, 'double-tap');
    }
    
    handleLongPress(e, element) {
        // Don't show menu if we're currently pinching or recently ended a pinch
        if (window.mobileNavigationManager && 
            (window.mobileNavigationManager.state.isPinching ||
             (window.mobileNavigationManager.state.lastPinchEndTime && 
              Date.now() - window.mobileNavigationManager.state.lastPinchEndTime < 500))) {
            return;
        }
        
        if (element && element.classList.contains('node')) {
            // Long press on node - show quick action menu
            const node = nodes.find(n => n.id === element.id);
            if (node) {
                this.showQuickActionMenu(e.clientX, e.clientY, node);
            }
        } else if (element && element.classList.contains('connection')) {
            // Long press on connection - show simple connection menu
            const connection = connections.find(c => c.id === element.id);
            if (connection) {
                this.showSimpleConnectionMenu(e.clientX, e.clientY, connection);
            }
        } else {
            // Long press on canvas - create new node
            const coords = this.getCanvasCoordinates(e);
            this.createNodeAtPosition(coords.x, coords.y);
        }
        
        this.showVisualFeedback(element || canvas, 'long-press');
    }
    
    // Pinch zoom and canvas panning functionality moved to mobile-nav.js
    
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
    
    // Create connected node with smart positioning
    createConnectedNode(parentNode) {
        if (typeof createNode !== 'function' || typeof findNonOverlappingPosition !== 'function') {
            console.log('Required functions not available');
            return;
        }
        
        const distance = 150;
        
        // Try positions in order: right, up, down, left
        const positions = [
            { x: parentNode.x + distance, y: parentNode.y },      // Right
            { x: parentNode.x, y: parentNode.y - distance },      // Up
            { x: parentNode.x, y: parentNode.y + distance },      // Down
            { x: parentNode.x - distance, y: parentNode.y }       // Left
        ];
        
        // Find the first position that doesn't overlap
        let finalPos = null;
        for (const pos of positions) {
            const nonOverlappingPos = findNonOverlappingPosition(pos.x, pos.y);
            // Check if the position is close to the desired position (no major adjustment needed)
            const dx = Math.abs(nonOverlappingPos.x - pos.x);
            const dy = Math.abs(nonOverlappingPos.y - pos.y);
            if (dx < 50 && dy < 50) {
                finalPos = nonOverlappingPos;
                break;
            }
        }
        
        // If no good position found, use the first position with adjustment
        if (!finalPos) {
            finalPos = findNonOverlappingPosition(positions[0].x, positions[0].y);
        }
        
        // Create the new node
        const newNode = createNode(
            'Nieuw idee',
            '',
            parentNode.color,
            finalPos.x,
            finalPos.y,
            'rounded',
            parentNode.id
        );
        
        this.showToast('Nieuwe node aangemaakt!');
        
        // Don't auto-edit to avoid the issue you mentioned
    }
    
    // Canvas panning functionality moved to mobile-nav.js
    
    // Simple connection menu for connections
    showSimpleConnectionMenu(x, y, connection) {
        // Remove any existing menus first
        this.removeContextMenu();
        this.removeQuickActionMenu();
        
        const menu = document.createElement('div');
        menu.className = 'touch-quick-action-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            padding: 12px;
            z-index: 10000;
            display: flex;
            gap: 8px;
            animation: quickMenuPop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;
        
        this.currentQuickActionMenu = menu;
        
        // Simple actions for connections
        const actions = [
            {
                icon: '✏️',
                label: 'Bewerken',
                action: () => {
                    if (typeof openConnectionEditor === 'function') {
                        openConnectionEditor(connection);
                    }
                }
            },
            {
                icon: '🗑️',
                label: 'Verwijder',
                action: () => {
                    if (typeof deleteConnection === 'function') {
                        deleteConnection(connection.id);
                    }
                }
            }
        ];
        
        actions.forEach(action => {
            const button = document.createElement('div');
            button.className = 'quick-action-button';
            button.style.cssText = `
                width: 50px;
                height: 50px;
                background: rgba(255, 255, 255, 0.9);
                border-radius: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 20px;
                color: #333;
                user-select: none;
            `;
            
            button.innerHTML = `
                <div style="font-size: 16px; margin-bottom: 2px;">${action.icon}</div>
                <div style="font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${action.label}</div>
            `;
            
            button.addEventListener('click', () => {
                action.action();
                this.removeQuickActionMenu();
            });
            
            button.addEventListener('pointerenter', () => {
                button.style.transform = 'scale(1.1)';
                button.style.background = 'rgba(255, 255, 255, 1)';
            });
            
            button.addEventListener('pointerleave', () => {
                button.style.transform = 'scale(1)';
                button.style.background = 'rgba(255, 255, 255, 0.9)';
            });
            
            menu.appendChild(button);
        });
        
        document.body.appendChild(menu);
        
        // Auto-remove after delay
        this.quickActionMenuTimeout = setTimeout(() => this.removeQuickActionMenu(), 4000);
        
        // Remove on outside click
        const removeOnOutside = (e) => {
            if (this.currentQuickActionMenu && !this.currentQuickActionMenu.contains(e.target)) {
                this.removeQuickActionMenu();
                document.removeEventListener('pointerdown', removeOnOutside);
            }
        };
        setTimeout(() => document.addEventListener('pointerdown', removeOnOutside), 100);
    }
    
    // Quick action menu for long-press on nodes (more streamlined)
    showQuickActionMenu(x, y, node) {
        // Don't show if pinching
        if (window.mobileNavigationManager && window.mobileNavigationManager.state.isPinching) {
            return;
        }
        
        // Remove any existing menus first
        this.removeContextMenu();
        this.removeQuickActionMenu();
        
        const menu = document.createElement('div');
        menu.className = 'touch-quick-action-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            padding: 12px;
            z-index: 10000;
            display: flex;
            gap: 8px;
            animation: quickMenuPop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;
        
        // Store reference
        this.currentQuickActionMenu = menu;
        
        // Quick action buttons
        const actions = [
            {
                icon: '✏️',
                label: 'Bewerken',
                action: () => {
                    if (typeof openNodeEditor === 'function') {
                        openNodeEditor(node);
                    }
                }
            },
            {
                icon: '🔗',
                label: 'Verbind',
                action: () => this.startConnectionMode(node)
            },
            {
                icon: '➕',
                label: 'Nieuw',
                action: () => {
                    if (typeof createNode === 'function' && typeof findNonOverlappingPosition === 'function') {
                        const distance = 150;
                        const pos = findNonOverlappingPosition(node.x + distance, node.y);
                        createNode(
                            'Nieuw idee',
                            '',
                            node.color,
                            pos.x,
                            pos.y,
                            'rounded',
                            node.id
                        );
                    }
                }
            },
            {
                icon: '🗑️',
                label: 'Verwijder',
                action: () => {
                    if (typeof deleteNode === 'function') {
                        deleteNode(node.id);
                    }
                }
            }
        ];
        
        actions.forEach(action => {
            const button = document.createElement('div');
            button.className = 'quick-action-button';
            button.style.cssText = `
                width: 50px;
                height: 50px;
                background: rgba(255, 255, 255, 0.9);
                border-radius: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 20px;
                color: #333;
                user-select: none;
            `;
            
            button.innerHTML = `
                <div style="font-size: 16px; margin-bottom: 2px;">${action.icon}</div>
                <div style="font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${action.label}</div>
            `;
            
            button.addEventListener('click', () => {
                action.action();
                this.removeQuickActionMenu();
            });
            
            button.addEventListener('pointerenter', () => {
                button.style.transform = 'scale(1.1)';
                button.style.background = 'rgba(255, 255, 255, 1)';
            });
            
            button.addEventListener('pointerleave', () => {
                button.style.transform = 'scale(1)';
                button.style.background = 'rgba(255, 255, 255, 0.9)';
            });
            
            menu.appendChild(button);
        });
        
        document.body.appendChild(menu);
        
        // Auto-remove after delay
        this.quickActionMenuTimeout = setTimeout(() => this.removeQuickActionMenu(), 4000);
        
        // Remove on outside click
        const removeOnOutside = (e) => {
            if (this.currentQuickActionMenu && !this.currentQuickActionMenu.contains(e.target)) {
                this.removeQuickActionMenu();
                document.removeEventListener('pointerdown', removeOnOutside);
            }
        };
        setTimeout(() => document.addEventListener('pointerdown', removeOnOutside), 100);
    }
    
    removeQuickActionMenu() {
        if (this.currentQuickActionMenu) {
            this.currentQuickActionMenu.remove();
            this.currentQuickActionMenu = null;
        }
        if (this.quickActionMenuTimeout) {
            clearTimeout(this.quickActionMenuTimeout);
            this.quickActionMenuTimeout = null;
        }
    }

    // Removed verbose context menu - now using quick action menu for all interactions
    
    removeContextMenu() {
        // Legacy method for compatibility - just remove quick action menu
        this.removeQuickActionMenu();
    }
    
    // Removed getContextMenuItems - no longer needed
    
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
        // First check if we clicked directly on a node or its children
        const clickedElement = e.target;
        console.log('getInteractiveElement - clicked element:', clickedElement, 'class:', clickedElement.className, 'id:', clickedElement.id);
        
        // Check if the clicked element is a node or inside a node
        const node = clickedElement.closest('.node');
        console.log('Closest node found:', node);
        
        if (node) {
            // Verify this is an actual node click by checking if click is within node bounds
            const nodeRect = node.getBoundingClientRect();
            const withinBounds = e.clientX >= nodeRect.left && e.clientX <= nodeRect.right &&
                                e.clientY >= nodeRect.top && e.clientY <= nodeRect.bottom;
            console.log('Node bounds check:', withinBounds, 'click:', e.clientX, e.clientY, 'bounds:', nodeRect);
            
            if (withinBounds) {
                return node;
            }
        }
        
        // Check for other interactive elements
        const interactive = clickedElement.closest('.connection, .tool-btn, button, .modal, .hamburger-menu, .touch-context-menu, .touch-quick-action-menu');
        console.log('Other interactive element:', interactive);
        
        // Return the interactive element if found, otherwise null for canvas clicks
        return interactive;
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
        console.log('createNodeAtPosition called with:', x, y);
        if (typeof createNode !== 'function') {
            console.log('createNode function not available');
            return;
        }
        
        const gridSize = typeof window.gridSize !== 'undefined' ? window.gridSize : 20;
        const snapX = Math.round(x / gridSize) * gridSize;
        const snapY = Math.round(y / gridSize) * gridSize;
        console.log('Snapped coordinates:', snapX, snapY);
        
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
            
            @keyframes quickMenuPop {
                0% {
                    transform: translate(-50%, -50%) scale(0.5);
                    opacity: 0;
                }
                100% {
                    transform: translate(-50%, -50%) scale(1);
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
        console.log('Visual feedback for:', type, 'on element:', element);
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
    
    // Zoom indicator functionality moved to mobile-nav.js
    
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
        this.state.dragStart = null;
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
        
        // Remove context menus
        this.removeContextMenu();
        this.removeQuickActionMenu();
        
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
window.initializeModernTouch = initializeModernTouch;