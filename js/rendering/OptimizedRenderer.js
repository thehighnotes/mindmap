/**
 * OptimizedRenderer - Integrates RenderQueue and VirtualDOM for optimal performance
 * Provides batching, throttling, and intelligent update strategies
 */

class OptimizedRenderer {
    #renderQueue = null;
    #virtualRenderer = null;
    #nodeRenderer = null;
    #connectionRenderer = null;
    #rafThrottle = new Map(); // For requestAnimationFrame throttling
    #performanceMonitor = null;
    #config = {
        batchSize: 50,
        maxBatchDelay: 100, // ms
        enableVirtualDOM: true,
        enableBatching: true,
        enableThrottling: true,
        throttleDelay: 16, // ~60fps
        performanceLogging: true
    };
    
    constructor(config = {}) {
        this.#config = { ...this.#config, ...config };
        this.#initialize();
    }

    // ==================== Initialization ====================

    #initialize() {
        // Create render queue
        this.#renderQueue = new RenderQueue(this);
        
        // Create virtual renderer for connections
        if (this.#config.enableVirtualDOM) {
            const canvas = document.getElementById('canvas');
            this.#virtualRenderer = new VirtualConnectionRenderer(canvas, this.#renderQueue);
        }
        
        // Set up performance monitoring
        if (this.#config.performanceLogging) {
            this.#setupPerformanceMonitor();
        }
        
        // Integrate with existing renderers if available
        this.#integrateWithExisting();
    }

    #integrateWithExisting() {
        // Override global refresh functions with optimized versions
        if (window.refreshConnections) {
            const originalRefresh = window.refreshConnections;
            window.refreshConnections = () => {
                if (this.#config.enableBatching) {
                    this.refreshConnectionsBatched();
                } else {
                    originalRefresh();
                }
            };
        }
        
        if (window.refreshNodes) {
            const originalRefresh = window.refreshNodes;
            window.refreshNodes = () => {
                if (this.#config.enableBatching) {
                    this.refreshNodesBatched();
                } else {
                    originalRefresh();
                }
            };
        }
    }

    // ==================== Public API ====================

    /**
     * Update node position with optimization
     */
    updateNodePosition(nodeId, x, y) {
        if (this.#config.enableThrottling) {
            this.#throttleUpdate('node-position', () => {
                this.#renderQueue.markDirty(nodeId, 'position', { x, y });
            });
        } else {
            this.#renderQueue.markDirty(nodeId, 'position', { x, y });
        }
    }

    /**
     * Update node style with optimization
     */
    updateNodeStyle(nodeId, styles) {
        this.#renderQueue.markDirty(nodeId, 'style', styles);
    }

    /**
     * Update connection with optimization
     */
    updateConnection(connectionId, changes) {
        if (this.#virtualRenderer && this.#config.enableVirtualDOM) {
            // Use virtual DOM for connections
            const connections = this.#getConnectionData();
            const connection = connections.find(c => c.id === connectionId);
            if (connection) {
                Object.assign(connection, changes);
                this.#virtualRenderer.render(connections);
            }
        } else {
            // Fall back to direct update
            this.#renderQueue.markDirty(connectionId, 'full', changes);
        }
    }

    /**
     * Batch refresh all connections
     */
    refreshConnectionsBatched() {
        const connections = this.#getConnectionData();
        
        if (this.#virtualRenderer && this.#config.enableVirtualDOM) {
            // Use virtual DOM rendering
            this.#virtualRenderer.render(connections);
        } else {
            // Batch updates through render queue
            const batches = this.#createBatches(connections, this.#config.batchSize);
            this.#processBatches(batches, 'connection');
        }
    }

    /**
     * Batch refresh all nodes
     */
    refreshNodesBatched() {
        const nodes = this.#getNodeData();
        const batches = this.#createBatches(nodes, this.#config.batchSize);
        this.#processBatches(batches, 'node');
    }

    /**
     * Force immediate render
     */
    forceRender() {
        this.#renderQueue.forceRender();
        if (this.#virtualRenderer) {
            const connections = this.#getConnectionData();
            this.#virtualRenderer.forceRender(connections);
        }
    }

    /**
     * Clear all renders
     */
    clear() {
        this.#renderQueue.clear();
        if (this.#virtualRenderer) {
            this.#virtualRenderer.clear();
        }
        this.#rafThrottle.clear();
    }

    // ==================== Batching ====================

    #createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    #processBatches(batches, type) {
        let delay = 0;
        
        batches.forEach((batch, index) => {
            if (index === 0) {
                // Process first batch immediately
                this.#processBatch(batch, type);
            } else {
                // Schedule subsequent batches with increasing delay
                delay += Math.min(this.#config.maxBatchDelay / batches.length, 16);
                setTimeout(() => {
                    this.#processBatch(batch, type);
                }, delay);
            }
        });
    }

    #processBatch(batch, type) {
        const updates = batch.map(item => ({
            id: item.id,
            type: 'full',
            data: item
        }));
        
        this.#renderQueue.markDirtyBatch(updates);
    }

    // ==================== Throttling ====================

    #throttleUpdate(key, updateFn, delay = null) {
        const throttleDelay = delay || this.#config.throttleDelay;
        
        // Cancel previous throttled update if exists
        if (this.#rafThrottle.has(key)) {
            cancelAnimationFrame(this.#rafThrottle.get(key));
        }
        
        // Schedule new update
        const rafId = requestAnimationFrame(() => {
            updateFn();
            this.#rafThrottle.delete(key);
        });
        
        this.#rafThrottle.set(key, rafId);
    }

    /**
     * Create a throttled function for frequent updates
     */
    createThrottledFunction(fn, delay = 16) {
        let lastCall = 0;
        let timeout = null;
        
        return (...args) => {
            const now = performance.now();
            const timeSinceLastCall = now - lastCall;
            
            if (timeSinceLastCall >= delay) {
                // Enough time has passed, call immediately
                lastCall = now;
                fn.apply(this, args);
            } else {
                // Schedule for later
                if (timeout) clearTimeout(timeout);
                timeout = setTimeout(() => {
                    lastCall = performance.now();
                    fn.apply(this, args);
                }, delay - timeSinceLastCall);
            }
        };
    }

    // ==================== Renderer Methods ====================

    /**
     * Update positions for multiple elements (called by RenderQueue)
     */
    updatePositions(updates) {
        updates.forEach(({ id, data }) => {
            const element = document.getElementById(id);
            if (element && data) {
                // Use transform for better performance
                element.style.transform = `translate(${data.x}px, ${data.y}px)`;
            }
        });
    }

    /**
     * Update styles for multiple elements (called by RenderQueue)
     */
    updateStyles(updates) {
        updates.forEach(({ id, data }) => {
            const element = document.getElementById(id);
            if (element && data) {
                Object.assign(element.style, data);
            }
        });
    }

    /**
     * Full update for multiple elements (called by RenderQueue)
     */
    fullUpdate(updates) {
        updates.forEach(({ id, data }) => {
            // Determine element type and update accordingly
            if (data && data.type === 'node') {
                this.#updateNode(id, data);
            } else if (data && data.type === 'connection') {
                this.#updateConnection(id, data);
            }
        });
    }

    #updateNode(id, data) {
        const element = document.getElementById(id);
        if (!element) return;
        
        // Update position
        if (data.x !== undefined && data.y !== undefined) {
            element.style.transform = `translate(${data.x}px, ${data.y}px)`;
        }
        
        // Update styles
        if (data.color) {
            element.style.backgroundColor = data.color;
        }
        
        // Update content
        if (data.title) {
            const titleEl = element.querySelector('.node-title');
            if (titleEl) {
                titleEl.textContent = data.title;
            }
        }
    }

    #updateConnection(id, data) {
        // Delegate to virtual renderer if available
        if (this.#virtualRenderer && this.#config.enableVirtualDOM) {
            const connections = this.#getConnectionData();
            this.#virtualRenderer.render(connections);
        } else {
            // Direct DOM update
            const element = document.getElementById(id);
            if (element && element.tagName === 'path') {
                if (data.path) element.setAttribute('d', data.path);
                if (data.stroke) element.setAttribute('stroke', data.stroke);
                if (data.strokeWidth) element.setAttribute('stroke-width', data.strokeWidth);
            }
        }
    }

    // ==================== Data Access ====================

    #getNodeData() {
        // Get nodes from state manager if available
        if (window.appState) {
            return window.appState.getNodes();
        }
        // Fall back to global nodes
        return window.nodes || [];
    }

    #getConnectionData() {
        // Get connections from state manager if available
        if (window.appState) {
            return window.appState.getConnections();
        }
        // Fall back to global connections
        return window.connections || [];
    }

    // ==================== Performance Monitoring ====================

    #setupPerformanceMonitor() {
        if (!window.performance) return;
        
        // Create performance observer for long tasks
        if (window.PerformanceObserver) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) {
                            console.warn(`Long task detected: ${entry.duration}ms`, entry);
                            if (window.Logger) {
                                window.Logger.warn('Long rendering task', {
                                    duration: entry.duration,
                                    name: entry.name
                                });
                            }
                        }
                    }
                });
                
                observer.observe({ entryTypes: ['longtask'] });
            } catch (e) {
                // Long task observer not supported
            }
        }
        
        // Monitor render performance
        setInterval(() => {
            const stats = {
                renderQueue: this.#renderQueue.getStats(),
                virtualRenderer: this.#virtualRenderer ? this.#virtualRenderer.getStats() : null,
                throttledUpdates: this.#rafThrottle.size
            };
            
            if (window.Logger) {
                window.Logger.debug('Renderer Performance', stats);
            }
        }, 30000); // Every 30 seconds
    }

    // ==================== Configuration ====================

    /**
     * Update renderer configuration
     */
    updateConfig(config) {
        this.#config = { ...this.#config, ...config };
        
        // Re-initialize if critical settings changed
        if (config.enableVirtualDOM !== undefined && !this.#virtualRenderer && config.enableVirtualDOM) {
            const canvas = document.getElementById('canvas');
            this.#virtualRenderer = new VirtualConnectionRenderer(canvas, this.#renderQueue);
        }
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.#config };
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return {
            renderQueue: this.#renderQueue.getStats(),
            virtualRenderer: this.#virtualRenderer ? this.#virtualRenderer.getStats() : null,
            activeThrottles: this.#rafThrottle.size,
            config: this.#config
        };
    }
}

// ==================== Auto-initialization ====================

(function() {
    'use strict';
    
    // Feature flag for optimized renderer
    const USE_OPTIMIZED_RENDERER = true;
    
    if (!USE_OPTIMIZED_RENDERER) return;
    
    // Initialize on DOM ready
    function initOptimizedRenderer() {
        try {
            // Create global instance
            window.optimizedRenderer = new OptimizedRenderer({
                enableVirtualDOM: true,
                enableBatching: true,
                enableThrottling: true,
                performanceLogging: window.Logger !== undefined
            });
            
            console.log('Optimized renderer initialized');
            
            if (window.Logger) {
                window.Logger.info('Performance optimization active', {
                    virtualDOM: true,
                    batching: true,
                    throttling: true
                });
            }
            
        } catch (error) {
            console.error('Failed to initialize optimized renderer:', error);
            if (window.Logger) {
                window.Logger.error('Optimized renderer initialization failed', error);
            }
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOptimizedRenderer);
    } else {
        initOptimizedRenderer();
    }
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OptimizedRenderer;
} else {
    window.OptimizedRenderer = OptimizedRenderer;
}