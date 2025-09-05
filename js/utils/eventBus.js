/**
 * EventBus - Centralized event system for decoupled communication
 * Implements pub/sub pattern for better state management
 */

class EventBus {
    #events = new Map();
    #onceEvents = new Map();
    #wildcardHandlers = new Set();
    
    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     * @returns {Function} - Unsubscribe function
     */
    on(event, handler) {
        if (typeof handler !== 'function') {
            throw new TypeError('Handler must be a function');
        }
        
        if (!this.#events.has(event)) {
            this.#events.set(event, new Set());
        }
        
        this.#events.get(event).add(handler);
        
        // Return unsubscribe function
        return () => this.off(event, handler);
    }
    
    /**
     * Subscribe to an event only once
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     * @returns {Function} - Unsubscribe function
     */
    once(event, handler) {
        if (typeof handler !== 'function') {
            throw new TypeError('Handler must be a function');
        }
        
        if (!this.#onceEvents.has(event)) {
            this.#onceEvents.set(event, new Set());
        }
        
        this.#onceEvents.get(event).add(handler);
        
        // Return unsubscribe function
        return () => this.#onceEvents.get(event)?.delete(handler);
    }
    
    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} handler - Handler to remove
     */
    off(event, handler) {
        this.#events.get(event)?.delete(handler);
        this.#onceEvents.get(event)?.delete(handler);
        
        // Clean up empty sets
        if (this.#events.get(event)?.size === 0) {
            this.#events.delete(event);
        }
        if (this.#onceEvents.get(event)?.size === 0) {
            this.#onceEvents.delete(event);
        }
    }
    
    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Data to pass to handlers
     */
    emit(event, data) {
        // Execute wildcard handlers
        this.#wildcardHandlers.forEach(handler => {
            this.#safeExecute(handler, { event, data });
        });
        
        // Execute regular handlers
        const handlers = this.#events.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                this.#safeExecute(handler, data);
            });
        }
        
        // Execute once handlers
        const onceHandlers = this.#onceEvents.get(event);
        if (onceHandlers) {
            onceHandlers.forEach(handler => {
                this.#safeExecute(handler, data);
            });
            // Clear once handlers after execution
            this.#onceEvents.delete(event);
        }
    }
    
    /**
     * Emit an event asynchronously
     * @param {string} event - Event name
     * @param {*} data - Data to pass to handlers
     * @returns {Promise} - Resolves when all handlers complete
     */
    async emitAsync(event, data) {
        const promises = [];
        
        // Wildcard handlers
        this.#wildcardHandlers.forEach(handler => {
            promises.push(this.#safeExecuteAsync(handler, { event, data }));
        });
        
        // Regular handlers
        const handlers = this.#events.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                promises.push(this.#safeExecuteAsync(handler, data));
            });
        }
        
        // Once handlers
        const onceHandlers = this.#onceEvents.get(event);
        if (onceHandlers) {
            onceHandlers.forEach(handler => {
                promises.push(this.#safeExecuteAsync(handler, data));
            });
            this.#onceEvents.delete(event);
        }
        
        return Promise.all(promises);
    }
    
    /**
     * Subscribe to all events
     * @param {Function} handler - Handler for all events
     * @returns {Function} - Unsubscribe function
     */
    onAll(handler) {
        if (typeof handler !== 'function') {
            throw new TypeError('Handler must be a function');
        }
        
        this.#wildcardHandlers.add(handler);
        
        return () => this.#wildcardHandlers.delete(handler);
    }
    
    /**
     * Clear all event handlers
     * @param {string} event - Optional specific event to clear
     */
    clear(event) {
        if (event) {
            this.#events.delete(event);
            this.#onceEvents.delete(event);
        } else {
            this.#events.clear();
            this.#onceEvents.clear();
            this.#wildcardHandlers.clear();
        }
    }
    
    /**
     * Get all registered events
     * @returns {Array<string>} - List of event names
     */
    getEvents() {
        const events = new Set([
            ...this.#events.keys(),
            ...this.#onceEvents.keys()
        ]);
        return Array.from(events);
    }
    
    /**
     * Get handler count for an event
     * @param {string} event - Event name
     * @returns {number} - Number of handlers
     */
    getHandlerCount(event) {
        const regular = this.#events.get(event)?.size || 0;
        const once = this.#onceEvents.get(event)?.size || 0;
        return regular + once;
    }
    
    /**
     * Execute handler safely with error handling
     * @private
     */
    #safeExecute(handler, data) {
        try {
            handler(data);
        } catch (error) {
            if (window.Logger) {
                Logger.error('Event handler error:', error);
            } else {
                console.error('Event handler error:', error);
            }
        }
    }
    
    /**
     * Execute handler asynchronously with error handling
     * @private
     */
    async #safeExecuteAsync(handler, data) {
        try {
            await handler(data);
        } catch (error) {
            if (window.Logger) {
                Logger.error('Async event handler error:', error);
            } else {
                console.error('Async event handler error:', error);
            }
        }
    }
}

/**
 * Global event bus instance
 */
const globalEventBus = new EventBus();

/**
 * Common event names (for consistency)
 */
const Events = {
    // Node events
    NODE_CREATED: 'node:created',
    NODE_UPDATED: 'node:updated',
    NODE_DELETED: 'node:deleted',
    NODE_SELECTED: 'node:selected',
    NODE_DESELECTED: 'node:deselected',
    NODE_MOVED: 'node:moved',
    
    // Connection events
    CONNECTION_CREATED: 'connection:created',
    CONNECTION_UPDATED: 'connection:updated',
    CONNECTION_DELETED: 'connection:deleted',
    CONNECTION_SELECTED: 'connection:selected',
    CONNECTION_DESELECTED: 'connection:deselected',
    
    // Canvas events
    CANVAS_ZOOM_CHANGED: 'canvas:zoom',
    CANVAS_PAN_CHANGED: 'canvas:pan',
    CANVAS_CLEARED: 'canvas:cleared',
    
    // Tool events
    TOOL_CHANGED: 'tool:changed',
    
    // State events
    STATE_SAVED: 'state:saved',
    STATE_LOADED: 'state:loaded',
    UNDO_EXECUTED: 'state:undo',
    REDO_EXECUTED: 'state:redo',
    
    // UI events
    MODAL_OPENED: 'ui:modal:opened',
    MODAL_CLOSED: 'ui:modal:closed',
    CONTEXT_MENU_OPENED: 'ui:contextmenu:opened',
    CONTEXT_MENU_CLOSED: 'ui:contextmenu:closed',
    
    // File events
    FILE_IMPORTED: 'file:imported',
    FILE_EXPORTED: 'file:exported',
    
    // Error events
    ERROR_OCCURRED: 'error:occurred'
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventBus, globalEventBus, Events };
}

// Make available globally for gradual migration
window.EventBus = EventBus;
window.globalEventBus = globalEventBus;
window.Events = Events;