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
        
        // Context menu state
        this.contextMenuActive = false;
        this.activeContextMenuNode = null;
        
        // Configuration
        this.config = {
            dragThreshold: 10, // Standard threshold for drag detection
            doubleTapDelay: 500, // Increased from 300 to 500 for better mobile tolerance
            longPressDelay: 500,
            momentumFriction: 0.92
        };
        
        // Timers
        this.timers = {
            doubleTap: null,
            longPress: null,
            momentum: null,
            editTooltip: null
        };
        
        // Last tap info for double tap detection
        this.lastTap = {
            time: 0,
            target: null,
            x: 0,
            y: 0
        };
        
        // Flag to track if we just handled a double-tap
        this.justHandledDoubleTap = false;
        
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
        
        console.log('🔍 DOUBLE TAP DEBUG - Tap detected:', {
            pointerType: e.pointerType,
            tapDelta,
            distance,
            lastTarget: this.lastTap.target,
            currentElement: element,
            doubleTapDelay: this.config.doubleTapDelay,
            lastTapTime: this.lastTap.time,
            currentTime: now,
            lastTapPos: { x: this.lastTap.x, y: this.lastTap.y },
            currentPos: { x: e.clientX, y: e.clientY }
        });
        
        // Check each condition individually for debugging
        const isTouchEvent = e.pointerType === 'touch' || e.pointerType === 'pen';
        const isWithinTimeLimit = tapDelta < this.config.doubleTapDelay && tapDelta > 0;
        const isWithinDistance = distance < 50; // Increased from 30 to 50 for better mobile tolerance
        const targetsMatch = this.lastTap.target === element;
        
        console.log('🔍 DOUBLE TAP CONDITIONS:', {
            isTouchEvent,
            isWithinTimeLimit,
            isWithinDistance,
            targetsMatch,
            allConditionsMet: isTouchEvent && isWithinTimeLimit && isWithinDistance && targetsMatch
        });
        
        if (isTouchEvent && isWithinTimeLimit && isWithinDistance && targetsMatch) {
            console.log('✅ DOUBLE TAP DETECTED - Calling handleDoubleTap');
            this.justHandledDoubleTap = true;
            
            // Reset the flag after a short delay to prevent interference
            setTimeout(() => {
                this.justHandledDoubleTap = false;
            }, 100);
            
            // Reset last tap info to prevent triple-tap issues
            this.lastTap = {
                time: 0,
                target: null,
                x: 0,
                y: 0
            };
            
            this.handleDoubleTap(e, element);
            return;
        }
        
        // Update last tap info
        console.log('📝 Updating last tap info:', {
            time: now,
            target: element,
            x: e.clientX,
            y: e.clientY
        });
        
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
                
                // Don't process tap if we just handled a double-tap
                if (this.justHandledDoubleTap) {
                    console.log('Skipping tap handling - just handled double-tap');
                    this.justHandledDoubleTap = false;
                    return;
                }
                
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
            this.removeFloatingEditButton();
            // Hide edit tooltips when deselecting
            document.querySelectorAll('.node.show-edit-tooltip').forEach(node => {
                node.classList.remove('show-edit-tooltip');
            });
            this.clearTimer('editTooltip');
            return;
        }
        
        if (element.classList.contains('node')) {
            const nodeId = element.id;
            if (typeof selectNode === 'function') {
                selectNode(nodeId);
                // Show floating edit button on mobile after short delay
                if (e.pointerType === 'touch') {
                    // Remove any existing floating edit button first
                    this.removeFloatingEditButton();
                    // Show floating edit button after a brief delay
                    setTimeout(() => {
                        // Only show if there's no active context menu on this node
                        if (this.activeContextMenuNode !== element) {
                            console.log('Showing floating edit button for node', element.id);
                            this.showFloatingEditButton(element);
                        } else {
                            console.log('Not showing floating edit button - active context menu on node', element.id);
                        }
                    }, 150);
                    // Show temporary edit tooltip
                    this.showEditTooltip(element);
                    // Show help hint on first selection
                    if (!this.hasShownEditHint) {
                        this.showToast('Tik op ✏️ of houd lang ingedrukt voor opties');
                        this.hasShownEditHint = true;
                    }
                }
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
        console.log('🎯 DOUBLE TAP HANDLER CALLED on element:', element, 'target:', e.target);
        
        // Don't show context menu if we recently ended a pinch zoom OR if we're currently pinching
        if (window.mobileNavigationManager && 
            (window.mobileNavigationManager.state.isPinching ||
             (window.mobileNavigationManager.state.lastPinchEndTime && 
              Date.now() - window.mobileNavigationManager.state.lastPinchEndTime < 500))) {
            console.log('🎯 Double tap blocked due to recent pinch');
            return;
        }
        
        // Check if element is actually a node or connection that should be handled specially
        const isNode = element && element.classList.contains('node');
        const isConnection = element && element.classList.contains('connection');
        
        console.log('🎯 Element analysis:', {
            element,
            isNode,
            isConnection,
            isNull: element === null,
            isEmpty: !element
        });
        
        if (!element || (!isNode && !isConnection)) {
            // Double tap on canvas (empty space) - create node
            console.log('🎯 Double tap on empty canvas detected - creating new node');
            const coords = this.getCanvasCoordinates(e);
            console.log('🎯 Canvas coordinates:', coords);
            this.createNodeAtPosition(coords.x, coords.y);
            // Show feedback at tap coordinates for canvas double-tap
            this.showVisualFeedback(canvas, 'double-tap', { x: e.clientX, y: e.clientY });
        } else if (isNode) {
            const node = nodes.find(n => n.id === element.id);
            if (node) {
                // Double tap on any part of node - create connected node
                console.log('🎯 Double tap on node - creating connected node');
                this.createConnectedNode(node);
            }
            this.showVisualFeedback(element, 'double-tap');
        } else if (isConnection) {
            // Double tap on connection - show simple connection menu
            const connection = connections.find(c => c.id === element.id);
            if (connection) {
                this.showSimpleConnectionMenu(e.clientX, e.clientY, connection);
            }
            this.showVisualFeedback(element, 'double-tap');
        }
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
                // Store reference to the node with active context menu BEFORE showing menu
                this.activeContextMenuNode = element;
                console.log('Long press: setting activeContextMenuNode to', element.id);
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
        
        // Ensure the node is selected when dragging starts
        if (typeof selectNode === 'function') {
            selectNode(node.id);
        }
        
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
        
        const element = this.state.dragInfo.element;
        
        // Remove visual feedback
        element.classList.remove('dragging');
        
        // Final connection update
        if (typeof refreshConnections === 'function') {
            refreshConnections();
        }
        
        // Show floating edit button after drag ends on touch devices
        if ('ontouchstart' in window) {
            setTimeout(() => {
                // Only show if there's no active context menu on this node
                if (this.activeContextMenuNode !== element) {
                    this.showFloatingEditButton(element);
                }
            }, 300); // Shorter delay after drag for better responsiveness
        }
        
        this.state.dragInfo = null;
    }
    
    // Create connected node with smart positioning
    createConnectedNode(parentNode) {
        console.log('🎯 createConnectedNode called for parent:', parentNode.id);
        if (typeof createNode !== 'function' || typeof findNonOverlappingPosition !== 'function') {
            console.log('🎯 ERROR: Required functions not available');
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
        
        console.log('🎯 Creating connected node at position:', finalPos);
        
        // Reset any potentially corrupted state before creating node
        this.resetState();
        
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
        
        console.log('🎯 Connected node created:', newNode);
        
        // Ensure the touch manager is still working properly after node creation
        if (newNode && newNode.id) {
            const nodeElement = document.getElementById(newNode.id);
            if (nodeElement) {
                // Make sure the new node doesn't interfere with touch events
                nodeElement.style.pointerEvents = 'auto';
                nodeElement.style.touchAction = 'none';
                
                // Add a brief delay to ensure DOM is ready, then reset our state
                setTimeout(() => {
                    this.resetState();
                    console.log('🎯 Touch manager state reset after connected node creation');
                }, 50);
            }
        }
        
        this.showToast('Nieuwe verbonden node aangemaakt!');
        
        // Don't auto-edit to avoid the issue you mentioned
    }
    
    // Canvas panning functionality moved to mobile-nav.js
    
    // Simple connection menu for connections
    showSimpleConnectionMenu(x, y, connection) {
        // Remove any existing menus and floating elements first
        this.removeContextMenu();
        this.removeQuickActionMenu();
        this.removeFloatingEditButton();
        // Hide edit tooltips when showing context menu
        document.querySelectorAll('.node.show-edit-tooltip').forEach(node => {
            node.classList.remove('show-edit-tooltip');
        });
        this.clearTimer('editTooltip');
        
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
        
        // Remove any existing menus and floating elements first
        this.removeContextMenu();
        this.removeQuickActionMenu();
        
        // Force remove any floating edit button
        if (this.currentFloatingEditButton) {
            this.currentFloatingEditButton.remove();
            this.currentFloatingEditButton = null;
        }
        // Also remove by class in case it exists
        const existingEditButton = document.querySelector('.floating-edit-button');
        if (existingEditButton) {
            existingEditButton.remove();
        }
        
        console.log('showQuickActionMenu: forcefully removed floating edit button');
        
        // Hide edit tooltips when showing context menu
        document.querySelectorAll('.node.show-edit-tooltip').forEach(node => {
            node.classList.remove('show-edit-tooltip');
        });
        this.clearTimer('editTooltip');
        
        // Set the active context menu node to prevent edit button from showing
        const nodeElement = document.getElementById(node.id);
        if (nodeElement) {
            console.log('showQuickActionMenu: confirming activeContextMenuNode is', nodeElement.id);
            this.activeContextMenuNode = nodeElement;
        }
        
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
        this.contextMenuActive = true; // Flag to block edit button
        
        // Quick action buttons - Edit is now more prominent for mobile
        const actions = [
            {
                icon: '✏️',
                label: 'Bewerken',
                action: () => {
                    // For quick edit, directly edit the title instead of opening modal
                    const nodeElement = document.getElementById(node.id);
                    if (nodeElement) {
                        const titleElement = nodeElement.querySelector('.node-title');
                        if (titleElement && typeof makeEditable === 'function') {
                            makeEditable(titleElement, node);
                            // Reset context menu state to prevent future blocking
                            this.contextMenuActive = false;
                            this.activeContextMenuNode = null;
                            this.showToast('Tik Enter om op te slaan');
                        }
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
        
        // Clear context menu flag
        this.contextMenuActive = false;
        
        // Clear active context menu node reference and restore floating edit button
        if (this.activeContextMenuNode) {
            console.log('removeQuickActionMenu: clearing activeContextMenuNode for', this.activeContextMenuNode.id);
            // Re-show floating edit button if the node is still selected
            if (this.activeContextMenuNode.classList.contains('selected')) {
                setTimeout(() => {
                    this.showFloatingEditButton(this.activeContextMenuNode);
                }, 100);
            }
            this.activeContextMenuNode = null;
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
        console.log('🎯 getInteractiveElement - clicked element:', clickedElement, 'class:', clickedElement.className, 'id:', clickedElement.id);
        
        // Check if the clicked element is a node or inside a node
        const node = clickedElement.closest('.node');
        console.log('🎯 Closest node found:', node);
        
        if (node) {
            // Verify this is an actual node click by checking if click is within node bounds
            const nodeRect = node.getBoundingClientRect();
            const withinBounds = e.clientX >= nodeRect.left && e.clientX <= nodeRect.right &&
                                e.clientY >= nodeRect.top && e.clientY <= nodeRect.bottom;
            console.log('🎯 Node bounds check:', withinBounds, 'click:', e.clientX, e.clientY, 'bounds:', nodeRect);
            
            if (withinBounds) {
                console.log('🎯 Returning node:', node.id);
                return node;
            }
        }
        
        // Check for other interactive elements, but exclude canvas itself
        const interactive = clickedElement.closest('.connection, .tool-btn, button, .modal, .hamburger-menu, .touch-context-menu, .touch-quick-action-menu');
        console.log('🎯 Other interactive element:', interactive);
        
        // If we found an interactive element, make sure it's not the canvas itself
        if (interactive && interactive.id === 'canvas') {
            console.log('🎯 Ignoring canvas as interactive element - treating as empty canvas');
            return null;
        }
        
        // Return the interactive element if found, otherwise null for canvas clicks
        const result = interactive;
        console.log('🎯 Final result:', result);
        return result;
    }
    
    getCanvasCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        const zoom = typeof zoomLevel !== 'undefined' ? zoomLevel : 1;
        
        // Use the same formula as desktop (from ui.js)
        // Don't subtract canvasOffset here as it's already applied in CSS transform
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;
        
        console.log('🎯 getCanvasCoordinates DEBUG (using desktop formula):', {
            clientX: e.clientX,
            clientY: e.clientY,
            rectLeft: rect.left,
            rectTop: rect.top,
            zoom,
            calculatedX: x,
            calculatedY: y
        });
        
        return { x, y };
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
        console.log('🎯 createNodeAtPosition called with:', x, y);
        if (typeof createNode !== 'function') {
            console.log('🎯 ERROR: createNode function not available');
            return;
        }
        
        const gridSize = typeof window.gridSize !== 'undefined' ? window.gridSize : 20;
        const snapX = Math.round(x / gridSize) * gridSize;
        const snapY = Math.round(y / gridSize) * gridSize;
        console.log('🎯 Snapped coordinates:', snapX, snapY);
        
        console.log('🎯 Creating node with parameters:', {
            title: 'Nieuw idee',
            content: '',
            color: '#4CAF50',
            x: snapX,
            y: snapY,
            shape: 'rounded'
        });
        
        // Reset any potentially corrupted state before creating node
        this.resetState();
        
        const node = createNode(
            'Nieuw idee',
            '',
            '#4CAF50',
            snapX,
            snapY,
            'rounded'
        );
        
        console.log('🎯 Node created:', node);
        
        // Ensure the touch manager is still working properly after node creation
        if (node && node.id) {
            const nodeElement = document.getElementById(node.id);
            if (nodeElement) {
                // Make sure the new node doesn't interfere with touch events
                nodeElement.style.pointerEvents = 'auto';
                nodeElement.style.touchAction = 'none';
                
                // Add a brief delay to ensure DOM is ready, then reset our state
                setTimeout(() => {
                    this.resetState();
                    console.log('🎯 Touch manager state reset after node creation');
                }, 50);
            }
        }
        
        // On mobile, don't auto-edit to avoid UI jumping and confusion
        // Users can tap the floating edit button or use long-press menu to edit
        this.showToast('Nieuwe node aangemaakt! Tik op het bewerkingsicoontje om te bewerken');
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
            
            /* Mobile-specific: show editable hint on selected nodes */
            @media (pointer: coarse) {
                .node.selected {
                    position: relative;
                }
                
                /* More prominent edit indicator - temporary tooltip */
                .node.selected.show-edit-tooltip::before {
                    content: 'Tik op ✏️ om te bewerken';
                    position: absolute;
                    bottom: -35px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 600;
                    white-space: nowrap;
                    z-index: 1000;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    animation: editTooltipFadeInOut 3s ease-in-out forwards;
                }
                
                /* Highlight the title area specifically */
                .node.selected .node-title {
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
                    border: 2px dashed rgba(102, 126, 234, 0.5);
                    border-radius: 8px;
                    padding: 8px 12px;
                    margin: -8px -12px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    animation: titlePulse 2s ease-in-out infinite;
                }
                
                @keyframes editTooltipFadeInOut {
                    0% { 
                        opacity: 0;
                        transform: translateX(-50%) scale(0.8);
                    }
                    15%, 85% { 
                        opacity: 1;
                        transform: translateX(-50%) scale(1);
                    }
                    100% { 
                        opacity: 0;
                        transform: translateX(-50%) scale(0.8);
                    }
                }
                
                @keyframes titlePulse {
                    0%, 100% { 
                        border-color: rgba(102, 126, 234, 0.5);
                        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
                    }
                    50% { 
                        border-color: rgba(102, 126, 234, 0.8);
                        background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
                    }
                }
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
            
            /* Edit mode visual feedback */
            .node-title[contenteditable="true"] {
                background-color: rgba(255, 255, 255, 0.95);
                outline: 2px solid #2196F3;
                outline-offset: 2px;
                border-radius: 4px;
                padding: 4px 8px;
                margin: -4px -8px;
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
            
            @keyframes editButtonPop {
                0% {
                    transform: scale(0.3) rotate(-180deg);
                    opacity: 0;
                }
                50% {
                    transform: scale(1.2) rotate(0deg);
                    opacity: 1;
                }
                100% {
                    transform: scale(1) rotate(0deg);
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
    
    showVisualFeedback(element, type, customCoords = null) {
        console.log('Visual feedback for:', type, 'on element:', element, 'customCoords:', customCoords);
        const feedback = document.createElement('div');
        feedback.className = 'touch-feedback';
        
        // Position at touch point
        const size = 40;
        feedback.style.width = size + 'px';
        feedback.style.height = size + 'px';
        feedback.style.position = 'fixed';
        
        if (customCoords) {
            // Use custom coordinates (for canvas double-tap)
            feedback.style.left = (customCoords.x - size / 2) + 'px';
            feedback.style.top = (customCoords.y - size / 2) + 'px';
        } else {
            // Use element's center position
            const rect = element.getBoundingClientRect();
            feedback.style.left = (rect.left + rect.width / 2 - size / 2) + 'px';
            feedback.style.top = (rect.top + rect.height / 2 - size / 2) + 'px';
        }
        
        document.body.appendChild(feedback);
        
        // Remove after animation
        feedback.addEventListener('animationend', () => feedback.remove());
    }
    
    // Zoom indicator functionality moved to mobile-nav.js
    
    showFloatingEditButton(nodeElement) {
        // Remove any existing floating edit button
        this.removeFloatingEditButton();
        
        const node = nodes.find(n => n.id === nodeElement.id);
        if (!node) return;
        
        // Don't show if context menu is active
        if (this.contextMenuActive) {
            console.log('Floating edit button blocked: context menu is active');
            return;
        }
        
        // Don't show if this node has an active context menu
        if (this.activeContextMenuNode === nodeElement) {
            console.log('Floating edit button blocked: active context menu on node', nodeElement.id);
            return;
        }
        
        // Check if element is still in DOM and visible
        if (!nodeElement.isConnected || !nodeElement.offsetParent) {
            return;
        }
        
        const rect = nodeElement.getBoundingClientRect();
        
        // Don't show if node is off-screen
        if (rect.right < 0 || rect.left > window.innerWidth || 
            rect.bottom < 0 || rect.top > window.innerHeight) {
            return;
        }
        
        const button = document.createElement('div');
        button.className = 'floating-edit-button';
        button.style.cssText = `
            position: fixed;
            left: ${Math.max(10, Math.min(window.innerWidth - 54, rect.right - 15))}px;
            top: ${Math.max(10, Math.min(window.innerHeight - 54, rect.top - 15))}px;
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            color: white;
            cursor: pointer;
            z-index: 10001;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            animation: editButtonPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            user-select: none;
            -webkit-tap-highlight-color: transparent;
        `;
        
        button.innerHTML = '✏️';
        button.title = 'Bewerk titel';
        
        // Store reference
        this.currentFloatingEditButton = button;
        
        // Add click handler
        button.addEventListener('click', () => {
            const titleElement = nodeElement.querySelector('.node-title');
            if (titleElement && typeof makeEditable === 'function') {
                makeEditable(titleElement, node);
                this.removeFloatingEditButton();
                // Reset context menu state to prevent future blocking
                this.contextMenuActive = false;
                this.activeContextMenuNode = null;
                this.showToast('Tik Enter om op te slaan');
            }
        });
        
        // Add hover effects
        button.addEventListener('pointerenter', () => {
            button.style.transform = 'scale(1.2)';
            button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
        });
        
        button.addEventListener('pointerleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
        });
        
        document.body.appendChild(button);
        
        // Auto-remove after 4 seconds (shorter than quick action menu)
        this.floatingEditButtonTimeout = setTimeout(() => {
            this.removeFloatingEditButton();
        }, 4000);
        
        // Remove when clicking elsewhere
        const removeOnOutside = (e) => {
            if (this.currentFloatingEditButton && 
                !this.currentFloatingEditButton.contains(e.target) && 
                !nodeElement.contains(e.target)) {
                this.removeFloatingEditButton();
                document.removeEventListener('pointerdown', removeOnOutside);
            }
        };
        setTimeout(() => document.addEventListener('pointerdown', removeOnOutside), 100);
    }
    
    removeFloatingEditButton() {
        if (this.currentFloatingEditButton) {
            this.currentFloatingEditButton.remove();
            this.currentFloatingEditButton = null;
        }
        if (this.floatingEditButtonTimeout) {
            clearTimeout(this.floatingEditButtonTimeout);
            this.floatingEditButtonTimeout = null;
        }
        // Also hide edit tooltips when removing floating button
        document.querySelectorAll('.node.show-edit-tooltip').forEach(node => {
            node.classList.remove('show-edit-tooltip');
        });
        this.clearTimer('editTooltip');
    }
    
    showEditTooltip(nodeElement) {
        // Remove tooltip from any previously selected nodes
        document.querySelectorAll('.node.show-edit-tooltip').forEach(node => {
            node.classList.remove('show-edit-tooltip');
        });
        
        // Clear any existing tooltip timer
        this.clearTimer('editTooltip');
        
        // Add tooltip class to current node
        nodeElement.classList.add('show-edit-tooltip');
        
        // Set timer to remove tooltip after animation completes
        this.timers.editTooltip = setTimeout(() => {
            nodeElement.classList.remove('show-edit-tooltip');
        }, 3000); // Matches the animation duration
    }
    
    showToast(message) {
        // Remove any existing toast first
        const existingToast = document.querySelector('.touch-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
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
        this.activeContextMenuNode = null;
        this.contextMenuActive = false;
        this.justHandledDoubleTap = false;
        
        // Clear all timers
        Object.keys(this.timers).forEach(timer => this.clearTimer(timer));
        
        // Reset visual states
        document.querySelectorAll('.dragging, .drag-mode, .connection-source, .show-edit-tooltip').forEach(el => {
            el.classList.remove('dragging', 'drag-mode', 'connection-source', 'show-edit-tooltip');
        });
        
        canvas.style.cursor = '';
    }
    
    // Public API
    cleanup() {
        this.resetState();
        this.state.activePointers.clear();
        
        // Remove context menus and floating elements
        this.removeContextMenu();
        this.removeQuickActionMenu();
        this.removeFloatingEditButton();
        
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