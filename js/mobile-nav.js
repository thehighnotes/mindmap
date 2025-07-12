/**
 * mobile-nav.js - Mobile navigation (pan & zoom) functionality
 * Based on the reliable pinch zoom implementation from mobile-pinch-standalone.md
 */

// ==========================
// MOBILE NAVIGATION MANAGER
// ==========================

class MobileNavigationManager {
    constructor() {
        // Navigation state
        this.state = {
            isPanning: false,
            isPinching: false,
            lastX: 0,
            lastY: 0,
            pinchStartDistance: 0,
            pinchStartZoom: 1,
            pinchFixedPoint: null,
            previousPinchCenter: null,
            touches: {},
            momentum: {
                velocityX: 0,
                velocityY: 0,
                lastX: 0,
                lastY: 0,
                lastTime: 0
            }
        };
        
        // Configuration
        this.config = {
            momentumFriction: 0.92,
            minZoom: 0.1,
            maxZoom: 3
        };
        
        // References
        this.canvas = null;
        this.canvasContainer = null;
        this.zoomIndicator = null;
        this.momentumTimer = null;
        
        this.init();
    }
    
    init() {
        // Wait for required globals
        if (!this.waitForDependencies()) return;
        
        // Setup event handlers
        this.setupEventHandlers();
        
        console.log('📱 Mobile navigation initialized');
    }
    
    waitForDependencies() {
        if (typeof canvas === 'undefined' || !canvas ||
            typeof canvasContainer === 'undefined' || !canvasContainer ||
            typeof canvasOffset === 'undefined' ||
            typeof zoomLevel === 'undefined' ||
            typeof setZoomLevel === 'undefined' ||
            typeof updateCanvasTransform === 'undefined') {
            console.warn('⚠️ Dependencies not ready, retrying...');
            setTimeout(() => this.init(), 100);
            return false;
        }
        
        this.canvas = canvas;
        this.canvasContainer = canvasContainer;
        return true;
    }
    
    setupEventHandlers() {
        // Touch events for mobile navigation
        // Use capture phase to handle before pointer events
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false, capture: true });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false, capture: true });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false, capture: true });
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false, capture: true });
        
        // Don't override touch-action as mobile-touch.js already sets it
        // this.canvas.style.touchAction = 'none';
    }
    
    // ===== Touch Event Handlers =====
    
    handleTouchStart(e) {
        // Check if mobile-touch.js is actively dragging
        if (window.mobileTouchManager && window.mobileTouchManager.state.mode === 'dragging') {
            return; // Don't interfere with active dragging
        }
        
        // Check if touch is on an interactive element (node, connection, button)
        const target = e.target.closest('.node, .connection, .tool-btn, button, input, [contenteditable]');
        
        // If touching an interactive element with single touch, don't handle navigation
        if (target && e.touches.length === 1) {
            // Don't prevent default - let pointer events through for mobile-touch.js
            return;
        }
        
        // Only prevent default for pan/zoom operations
        if (e.touches.length === 2 || (!target && e.touches.length === 1)) {
            e.preventDefault();
        }
        
        // Update touches registry
        this.state.touches = {};
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            this.state.touches[touch.identifier] = {
                x: touch.clientX,
                y: touch.clientY
            };
        }
        
        if (e.touches.length === 2) {
            // Start pinch zoom
            this.startPinch(e.touches);
        } else if (e.touches.length === 1) {
            // Start pan (only if not on interactive element)
            this.startPan(e.touches[0]);
        }
    }
    
    handleTouchMove(e) {
        // Check if mobile-touch.js is actively dragging
        if (window.mobileTouchManager && window.mobileTouchManager.state.mode === 'dragging') {
            return; // Don't interfere with active dragging
        }
        
        // Only handle if we're actively panning or pinching
        if (!this.state.isPanning && !this.state.isPinching) {
            return;
        }
        
        e.preventDefault();
        
        // Update touches registry
        this.state.touches = {};
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            this.state.touches[touch.identifier] = {
                x: touch.clientX,
                y: touch.clientY
            };
        }
        
        if (this.state.isPinching && e.touches.length === 2) {
            this.updatePinch(e.touches);
        } else if (this.state.isPanning && e.touches.length === 1) {
            this.updatePan(e.touches[0]);
        }
    }
    
    handleTouchEnd(e) {
        // Only prevent default if we were handling the gesture
        if (this.state.isPanning || this.state.isPinching) {
            e.preventDefault();
        }
        
        // Update touches registry
        this.state.touches = {};
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            this.state.touches[touch.identifier] = {
                x: touch.clientX,
                y: touch.clientY
            };
        }
        
        if (e.touches.length < 2) {
            this.endPinch();
        }
        
        if (e.touches.length === 0) {
            this.endPan();
        }
    }
    
    // ===== Pinch Zoom Functions =====
    
    startPinch(touches) {
        // Reset any momentum to prevent unwanted movement
        this.state.momentum = {
            velocityX: 0,
            velocityY: 0,
            lastX: 0,
            lastY: 0,
            lastTime: 0
        };
        
        this.state.isPinching = true;
        const touch1 = touches[0];
        const touch2 = touches[1];
        
        // Calculate initial distance
        this.state.pinchStartDistance = this.getDistance(
            touch1.clientX, touch1.clientY,
            touch2.clientX, touch2.clientY
        );
        
        this.state.pinchStartZoom = zoomLevel;
        
        // Calculate the fixed point (center between two fingers)
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        
        // Convert screen coordinates to world coordinates
        // Use canvas container instead of canvas to get proper viewport coordinates
        const rect = this.canvasContainer.getBoundingClientRect();
        const viewportX = centerX - rect.left;
        const viewportY = centerY - rect.top;
        
        // Convert viewport position to canvas coordinates
        const canvasX = (viewportX - canvasOffset.x) / zoomLevel;
        const canvasY = (viewportY - canvasOffset.y) / zoomLevel;
        
        this.state.pinchFixedPoint = {
            screenX: centerX,
            screenY: centerY,
            viewportX: viewportX,
            viewportY: viewportY,
            canvasX: canvasX,
            canvasY: canvasY
        };
        
        // Initialize previous center for smooth pan during pinch
        this.state.previousPinchCenter = { x: centerX, y: centerY };
        
        this.showZoomIndicator();
        
        console.log('Pinch started:', {
            distance: this.state.pinchStartDistance,
            center: { x: centerX, y: centerY },
            fixedPoint: this.state.pinchFixedPoint
        });
    }
    
    updatePinch(touches) {
        if (!this.state.pinchFixedPoint || touches.length < 2) return;
        
        const touch1 = touches[0];
        const touch2 = touches[1];
        
        // Calculate current distance
        const currentDistance = this.getDistance(
            touch1.clientX, touch1.clientY,
            touch2.clientX, touch2.clientY
        );
        
        // Calculate current center
        const currentCenterX = (touch1.clientX + touch2.clientX) / 2;
        const currentCenterY = (touch1.clientY + touch2.clientY) / 2;
        
        // If we have a previous center, calculate pan movement
        if (this.state.previousPinchCenter) {
            const panDX = currentCenterX - this.state.previousPinchCenter.x;
            const panDY = currentCenterY - this.state.previousPinchCenter.y;
            
            // Apply pan first
            canvasOffset.x += panDX;
            canvasOffset.y += panDY;
        }
        
        // Calculate new zoom
        const scale = currentDistance / this.state.pinchStartDistance;
        const newZoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, this.state.pinchStartZoom * scale));
        
        // Recalculate the fixed point based on current position
        // This prevents jumping when combining pan+zoom
        // Use canvas container instead of canvas to get proper viewport coordinates
        const rect = this.canvasContainer.getBoundingClientRect();
        const viewportX = currentCenterX - rect.left;
        const viewportY = currentCenterY - rect.top;
        const worldX = (viewportX - canvasOffset.x) / zoomLevel;
        const worldY = (viewportY - canvasOffset.y) / zoomLevel;
        
        // Update zoom
        setZoomLevel(newZoom);
        
        // Recalculate offset so the fixed point stays at current center
        canvasOffset.x = viewportX - worldX * newZoom;
        canvasOffset.y = viewportY - worldY * newZoom;
        
        // Update canvas transform
        updateCanvasTransform();
        
        // Save current center for next frame
        this.state.previousPinchCenter = { x: currentCenterX, y: currentCenterY };
        
        this.updateZoomIndicator(Math.round(newZoom * 100) + '%');
    }
    
    endPinch() {
        if (!this.state.isPinching) return;
        
        console.log('📌 Pinch ended');
        this.state.isPinching = false;
        this.state.pinchFixedPoint = null;
        this.state.previousPinchCenter = null;
        this.hideZoomIndicator();
    }
    
    // ===== Pan Functions =====
    
    startPan(touch) {
        if (this.state.isPinching) return; // Don't pan while pinching
        
        this.state.isPanning = true;
        this.state.lastX = touch.clientX;
        this.state.lastY = touch.clientY;
        
        // Initialize momentum tracking
        this.state.momentum = {
            velocityX: 0,
            velocityY: 0,
            lastX: touch.clientX,
            lastY: touch.clientY,
            lastTime: Date.now()
        };
    }
    
    updatePan(touch) {
        if (!this.state.isPanning || this.state.isPinching) return;
        
        const dx = touch.clientX - this.state.lastX;
        const dy = touch.clientY - this.state.lastY;
        
        // Update canvas offset
        canvasOffset.x += dx;
        canvasOffset.y += dy;
        
        // Update momentum tracking
        const now = Date.now();
        const dt = now - this.state.momentum.lastTime;
        
        if (dt > 0) {
            this.state.momentum.velocityX = dx / dt;
            this.state.momentum.velocityY = dy / dt;
        }
        
        this.state.momentum.lastX = touch.clientX;
        this.state.momentum.lastY = touch.clientY;
        this.state.momentum.lastTime = now;
        
        // Update last position
        this.state.lastX = touch.clientX;
        this.state.lastY = touch.clientY;
        
        // Update canvas transform
        updateCanvasTransform();
    }
    
    endPan() {
        if (!this.state.isPanning) return;
        
        this.state.isPanning = false;
        
        // Apply momentum if significant velocity
        if (Math.abs(this.state.momentum.velocityX) > 0.1 || 
            Math.abs(this.state.momentum.velocityY) > 0.1) {
            this.applyMomentum();
        }
    }
    
    // ===== Helper Functions =====
    
    getDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    
    applyMomentum() {
        const animate = () => {
            // Apply velocity
            canvasOffset.x += this.state.momentum.velocityX * 10;
            canvasOffset.y += this.state.momentum.velocityY * 10;
            
            // Apply friction
            this.state.momentum.velocityX *= this.config.momentumFriction;
            this.state.momentum.velocityY *= this.config.momentumFriction;
            
            updateCanvasTransform();
            
            // Continue if velocity is significant
            if (Math.abs(this.state.momentum.velocityX) > 0.01 || 
                Math.abs(this.state.momentum.velocityY) > 0.01) {
                this.momentumTimer = requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    // ===== UI Feedback Functions =====
    
    showZoomIndicator() {
        if (!this.zoomIndicator) {
            this.zoomIndicator = document.createElement('div');
            this.zoomIndicator.className = 'zoom-indicator';
            this.zoomIndicator.style.cssText = `
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
            `;
            document.body.appendChild(this.zoomIndicator);
        }
        
        this.zoomIndicator.textContent = Math.round(zoomLevel * 100) + '%';
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
    
    // ===== Public API =====
    
    cleanup() {
        // Remove event listeners
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
        
        // Cancel any ongoing momentum
        if (this.momentumTimer) {
            cancelAnimationFrame(this.momentumTimer);
        }
        
        // Hide zoom indicator
        this.hideZoomIndicator();
        
        // Reset state
        this.state = {
            isPanning: false,
            isPinching: false,
            lastX: 0,
            lastY: 0,
            pinchStartDistance: 0,
            pinchStartZoom: 1,
            pinchFixedPoint: null,
            previousPinchCenter: null,
            touches: {},
            momentum: {
                velocityX: 0,
                velocityY: 0,
                lastX: 0,
                lastY: 0,
                lastTime: 0
            }
        };
    }
}

// ==========================
// INITIALIZATION
// ==========================

let mobileNavigationManager = null;

function initializeMobileNavigation() {
    if (mobileNavigationManager) {
        mobileNavigationManager.cleanup();
    }
    
    mobileNavigationManager = new MobileNavigationManager();
    
    // Export for global access
    window.mobileNavigationManager = mobileNavigationManager;
    
    console.log('📱 Mobile navigation support initialized');
}

// Auto-initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMobileNavigation);
} else {
    setTimeout(initializeMobileNavigation, 100);
}

// Export initialization function
window.initializeMobileNavigation = initializeMobileNavigation;