/**
 * RenderQueue - Efficient rendering system with batching and RAF scheduling
 * Prevents unnecessary redraws and optimizes rendering performance
 */

class RenderQueue {
    #dirty = new Map(); // id -> { type: 'position' | 'style' | 'full', data: any }
    #frameRequested = false;
    #renderer = null;
    #performanceMonitor = null;
    #renderStats = {
        totalFrames: 0,
        droppedFrames: 0,
        averageRenderTime: 0,
        lastRenderTime: 0,
        batchSizes: []
    };
    
    constructor(renderer) {
        this.#renderer = renderer;
        this.#setupPerformanceMonitoring();
    }

    // ==================== Public API ====================

    /**
     * Mark an element as needing update
     * @param {string} id - Element ID
     * @param {string} updateType - Type of update: 'position', 'style', or 'full'
     * @param {object} data - Optional data for the update
     */
    markDirty(id, updateType = 'full', data = null) {
        if (!id) return;

        const current = this.#dirty.get(id);
        
        // If already marked for full update, no need to downgrade
        if (current?.type === 'full') return;
        
        // If new update is full, override any existing
        if (updateType === 'full') {
            this.#dirty.set(id, { type: 'full', data });
        }
        // Otherwise, only update if not already marked or upgrading
        else if (!current || this.#shouldUpgrade(current.type, updateType)) {
            this.#dirty.set(id, { type: updateType, data });
        }
        
        this.#scheduleRender();
    }

    /**
     * Mark multiple elements as dirty
     * @param {Array} elements - Array of {id, type, data} objects
     */
    markDirtyBatch(elements) {
        elements.forEach(({ id, type, data }) => {
            this.markDirty(id, type, data);
        });
    }

    /**
     * Force immediate render (use sparingly)
     */
    forceRender() {
        if (this.#frameRequested) {
            cancelAnimationFrame(this.#frameRequested);
        }
        this.#render();
    }

    /**
     * Clear all pending updates
     */
    clear() {
        this.#dirty.clear();
        if (this.#frameRequested) {
            cancelAnimationFrame(this.#frameRequested);
            this.#frameRequested = false;
        }
    }

    /**
     * Get current render statistics
     */
    getStats() {
        return { ...this.#renderStats };
    }

    /**
     * Reset render statistics
     */
    resetStats() {
        this.#renderStats = {
            totalFrames: 0,
            droppedFrames: 0,
            averageRenderTime: 0,
            lastRenderTime: 0,
            batchSizes: []
        };
    }

    // ==================== Private Methods ====================

    #shouldUpgrade(currentType, newType) {
        const priority = {
            'position': 1,
            'style': 2,
            'full': 3
        };
        return priority[newType] > priority[currentType];
    }

    #scheduleRender() {
        if (this.#frameRequested) return;
        
        this.#frameRequested = requestAnimationFrame(() => {
            this.#render();
        });
    }

    #render() {
        const startTime = performance.now();
        
        // Get all pending updates
        const updates = [...this.#dirty.entries()];
        this.#dirty.clear();
        this.#frameRequested = false;
        
        if (updates.length === 0) return;
        
        // Batch updates by type for efficiency
        const batches = {
            position: [],
            style: [],
            full: []
        };
        
        for (const [id, { type, data }] of updates) {
            if (batches[type]) {
                batches[type].push({ id, data });
            } else {
                batches.full.push({ id, data });
            }
        }
        
        // Apply updates in optimal order (cheapest operations first)
        try {
            if (batches.position.length > 0) {
                this.#applyPositionUpdates(batches.position);
            }
            
            if (batches.style.length > 0) {
                this.#applyStyleUpdates(batches.style);
            }
            
            if (batches.full.length > 0) {
                this.#applyFullUpdates(batches.full);
            }
        } catch (error) {
            console.error('Error during render:', error);
            if (window.Logger) {
                window.Logger.error('Render error', error);
            }
        }
        
        // Update performance stats
        const renderTime = performance.now() - startTime;
        this.#updateStats(renderTime, updates.length);
    }

    #applyPositionUpdates(updates) {
        if (!this.#renderer) return;
        
        // Check if renderer has position update method
        if (typeof this.#renderer.updatePositions === 'function') {
            this.#renderer.updatePositions(updates);
        } else {
            // Fallback: Update each element individually
            updates.forEach(({ id, data }) => {
                const element = document.getElementById(id);
                if (element && data) {
                    if (data.x !== undefined) element.style.left = `${data.x}px`;
                    if (data.y !== undefined) element.style.top = `${data.y}px`;
                }
            });
        }
    }

    #applyStyleUpdates(updates) {
        if (!this.#renderer) return;
        
        // Check if renderer has style update method
        if (typeof this.#renderer.updateStyles === 'function') {
            this.#renderer.updateStyles(updates);
        } else {
            // Fallback: Update each element individually
            updates.forEach(({ id, data }) => {
                const element = document.getElementById(id);
                if (element && data) {
                    Object.assign(element.style, data);
                }
            });
        }
    }

    #applyFullUpdates(updates) {
        if (!this.#renderer) return;
        
        // Check if renderer has full update method
        if (typeof this.#renderer.fullUpdate === 'function') {
            this.#renderer.fullUpdate(updates);
        } else if (typeof this.#renderer.render === 'function') {
            // Fallback: Re-render each element
            updates.forEach(({ id }) => {
                this.#renderer.render(id);
            });
        }
    }

    #updateStats(renderTime, batchSize) {
        this.#renderStats.totalFrames++;
        this.#renderStats.lastRenderTime = renderTime;
        this.#renderStats.batchSizes.push(batchSize);
        
        // Keep only last 100 batch sizes
        if (this.#renderStats.batchSizes.length > 100) {
            this.#renderStats.batchSizes.shift();
        }
        
        // Update average render time
        const alpha = 0.1; // Exponential moving average factor
        this.#renderStats.averageRenderTime = 
            alpha * renderTime + (1 - alpha) * this.#renderStats.averageRenderTime;
        
        // Check for dropped frames (>16ms is roughly 60fps threshold)
        if (renderTime > 16) {
            this.#renderStats.droppedFrames++;
        }
        
        // Log performance warning if render took too long
        if (renderTime > 32 && window.Logger) {
            window.Logger.warn(`Slow render detected: ${renderTime.toFixed(2)}ms for ${batchSize} updates`);
        }
    }

    #setupPerformanceMonitoring() {
        if (!window.performance || !window.Logger) return;
        
        // Log performance stats periodically (every 60 seconds)
        setInterval(() => {
            if (this.#renderStats.totalFrames > 0) {
                const avgBatchSize = this.#renderStats.batchSizes.length > 0
                    ? this.#renderStats.batchSizes.reduce((a, b) => a + b, 0) / this.#renderStats.batchSizes.length
                    : 0;
                    
                window.Logger.debug('Render Performance Stats', {
                    totalFrames: this.#renderStats.totalFrames,
                    droppedFrames: this.#renderStats.droppedFrames,
                    dropRate: `${((this.#renderStats.droppedFrames / this.#renderStats.totalFrames) * 100).toFixed(2)}%`,
                    averageRenderTime: `${this.#renderStats.averageRenderTime.toFixed(2)}ms`,
                    lastRenderTime: `${this.#renderStats.lastRenderTime.toFixed(2)}ms`,
                    averageBatchSize: avgBatchSize.toFixed(1)
                });
            }
        }, 60000);
    }

    // ==================== Integration Helpers ====================

    /**
     * Create a throttled update function
     * @param {Function} updateFn - Function to throttle
     * @param {string} id - Element ID
     * @param {string} type - Update type
     * @returns {Function} Throttled function
     */
    createThrottledUpdate(updateFn, id, type = 'full') {
        return (...args) => {
            const data = updateFn(...args);
            this.markDirty(id, type, data);
        };
    }

    /**
     * Wrap a renderer to use the queue
     * @param {object} renderer - Renderer to wrap
     * @returns {object} Wrapped renderer
     */
    static wrapRenderer(renderer) {
        const queue = new RenderQueue(renderer);
        
        return new Proxy(renderer, {
            get(target, prop) {
                // Intercept update methods
                if (prop === 'updatePosition') {
                    return (id, x, y) => {
                        queue.markDirty(id, 'position', { x, y });
                    };
                }
                if (prop === 'updateStyle') {
                    return (id, styles) => {
                        queue.markDirty(id, 'style', styles);
                    };
                }
                if (prop === 'render' || prop === 'update') {
                    return (id, data) => {
                        queue.markDirty(id, 'full', data);
                    };
                }
                if (prop === 'renderQueue') {
                    return queue;
                }
                
                // Pass through other methods
                return target[prop];
            }
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RenderQueue;
} else {
    window.RenderQueue = RenderQueue;
}