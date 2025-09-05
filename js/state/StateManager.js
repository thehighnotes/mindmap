/**
 * StateManager - Centralized state management system
 * Provides encapsulation, subscriptions, and immutable state updates
 */

class StateManager {
    #state = {
        nodes: new Map(),
        connections: new Map(),
        ui: {
            selectedNode: null,
            selectedConnection: null,
            selectedElements: new Set(),
            zoomLevel: 1,
            offset: { x: 0, y: 0 },
            currentTool: 'select',
            canvasSize: { width: 10000, height: 10000 }
        },
        history: {
            past: [],
            future: [],
            maxHistorySize: 50
        },
        preferences: {
            autoSave: true,
            snapToGrid: false,
            gridSize: 20,
            theme: 'light'
        },
        metadata: {
            version: '0.932',
            created: Date.now(),
            lastModified: Date.now(),
            format: 'mindmap2'
        }
    };

    #listeners = new Map(); // event -> Set of callbacks
    #middleware = [];
    #computedCache = new Map();
    #isDirty = false;
    #transactionDepth = 0;
    #pendingChanges = [];

    constructor(initialState = {}) {
        // Deep merge initial state
        if (initialState) {
            this.#mergeState(initialState);
        }
    }

    // ==================== State Access ====================
    
    getState() {
        // Return immutable copy
        return this.#deepClone(this.#state);
    }

    getNode(id) {
        return this.#deepClone(this.#state.nodes.get(id));
    }

    getConnection(id) {
        return this.#deepClone(this.#state.connections.get(id));
    }

    getNodes() {
        return Array.from(this.#state.nodes.values()).map(node => this.#deepClone(node));
    }

    getConnections() {
        return Array.from(this.#state.connections.values()).map(conn => this.#deepClone(conn));
    }

    getUIState() {
        return this.#deepClone(this.#state.ui);
    }

    getPreferences() {
        return this.#deepClone(this.#state.preferences);
    }

    // ==================== State Mutations ====================

    updateNode(id, changes) {
        return this.#dispatch({
            type: 'UPDATE_NODE',
            payload: { id, changes }
        });
    }

    addNode(node) {
        if (!node.id) {
            throw new Error('Node must have an id');
        }
        return this.#dispatch({
            type: 'ADD_NODE',
            payload: node
        });
    }

    removeNode(id) {
        return this.#dispatch({
            type: 'REMOVE_NODE',
            payload: { id }
        });
    }

    updateConnection(id, changes) {
        return this.#dispatch({
            type: 'UPDATE_CONNECTION',
            payload: { id, changes }
        });
    }

    addConnection(connection) {
        if (!connection.id) {
            throw new Error('Connection must have an id');
        }
        return this.#dispatch({
            type: 'ADD_CONNECTION',
            payload: connection
        });
    }

    removeConnection(id) {
        return this.#dispatch({
            type: 'REMOVE_CONNECTION',
            payload: { id }
        });
    }

    updateUI(changes) {
        return this.#dispatch({
            type: 'UPDATE_UI',
            payload: changes
        });
    }

    updatePreferences(changes) {
        return this.#dispatch({
            type: 'UPDATE_PREFERENCES',
            payload: changes
        });
    }

    // ==================== Batch Operations ====================

    transaction(callback) {
        this.#transactionDepth++;
        try {
            const result = callback(this);
            if (this.#transactionDepth === 1 && this.#pendingChanges.length > 0) {
                // Commit all pending changes
                const changes = [...this.#pendingChanges];
                this.#pendingChanges = [];
                this.#notify({
                    type: 'TRANSACTION_COMMIT',
                    changes
                });
            }
            return result;
        } finally {
            this.#transactionDepth--;
        }
    }

    // ==================== History Management ====================

    undo() {
        if (this.#state.history.past.length === 0) return false;
        
        const previousState = this.#state.history.past.pop();
        this.#state.history.future.unshift(this.#getCurrentSnapshot());
        this.#restoreSnapshot(previousState);
        this.#notify({ type: 'UNDO' });
        return true;
    }

    redo() {
        if (this.#state.history.future.length === 0) return false;
        
        const nextState = this.#state.history.future.shift();
        this.#state.history.past.push(this.#getCurrentSnapshot());
        this.#restoreSnapshot(nextState);
        this.#notify({ type: 'REDO' });
        return true;
    }

    clearHistory() {
        this.#state.history.past = [];
        this.#state.history.future = [];
        this.#notify({ type: 'HISTORY_CLEARED' });
    }

    // ==================== Subscriptions ====================

    subscribe(event, callback) {
        if (!this.#listeners.has(event)) {
            this.#listeners.set(event, new Set());
        }
        this.#listeners.get(event).add(callback);
        
        // Return unsubscribe function
        return () => {
            const callbacks = this.#listeners.get(event);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    this.#listeners.delete(event);
                }
            }
        };
    }

    subscribeAll(callback) {
        return this.subscribe('*', callback);
    }

    // ==================== Computed Properties ====================

    computed(key, computeFn) {
        // Invalidate cache on state change
        const unsubscribe = this.subscribeAll(() => {
            this.#computedCache.delete(key);
        });

        return {
            get: () => {
                if (!this.#computedCache.has(key)) {
                    this.#computedCache.set(key, computeFn(this.#state));
                }
                return this.#computedCache.get(key);
            },
            dispose: () => {
                unsubscribe();
                this.#computedCache.delete(key);
            }
        };
    }

    // ==================== Middleware ====================

    use(middleware) {
        this.#middleware.push(middleware);
    }

    // ==================== Private Methods ====================

    #dispatch(action) {
        // Run through middleware
        let modifiedAction = action;
        for (const middleware of this.#middleware) {
            modifiedAction = middleware(modifiedAction, this.#state) || modifiedAction;
        }

        // Save history before mutation
        if (this.#shouldSaveHistory(modifiedAction)) {
            this.#saveHistory();
        }

        // Apply the action
        const oldState = this.#deepClone(this.#state);
        this.#applyAction(modifiedAction);
        
        // Update metadata
        this.#state.metadata.lastModified = Date.now();
        this.#isDirty = true;

        // Handle transaction or immediate notification
        if (this.#transactionDepth > 0) {
            this.#pendingChanges.push(modifiedAction);
        } else {
            this.#notify(modifiedAction);
        }

        return true;
    }

    #applyAction(action) {
        switch (action.type) {
            case 'ADD_NODE':
                this.#state.nodes.set(action.payload.id, action.payload);
                break;
            
            case 'UPDATE_NODE': {
                const node = this.#state.nodes.get(action.payload.id);
                if (node) {
                    this.#state.nodes.set(action.payload.id, {
                        ...node,
                        ...action.payload.changes
                    });
                }
                break;
            }
            
            case 'REMOVE_NODE':
                this.#state.nodes.delete(action.payload.id);
                // Also remove connections to this node
                for (const [connId, conn] of this.#state.connections) {
                    if (conn.from === action.payload.id || conn.to === action.payload.id) {
                        this.#state.connections.delete(connId);
                    }
                }
                break;
            
            case 'ADD_CONNECTION':
                this.#state.connections.set(action.payload.id, action.payload);
                break;
            
            case 'UPDATE_CONNECTION': {
                const conn = this.#state.connections.get(action.payload.id);
                if (conn) {
                    this.#state.connections.set(action.payload.id, {
                        ...conn,
                        ...action.payload.changes
                    });
                }
                break;
            }
            
            case 'REMOVE_CONNECTION':
                this.#state.connections.delete(action.payload.id);
                break;
            
            case 'UPDATE_UI':
                this.#state.ui = {
                    ...this.#state.ui,
                    ...action.payload
                };
                break;
            
            case 'UPDATE_PREFERENCES':
                this.#state.preferences = {
                    ...this.#state.preferences,
                    ...action.payload
                };
                break;
            
            case 'RESTORE_STATE':
                this.#mergeState(action.payload);
                break;
        }
    }

    #notify(change) {
        // Notify specific event listeners
        const listeners = this.#listeners.get(change.type);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(change);
                } catch (error) {
                    console.error(`Error in state listener for ${change.type}:`, error);
                }
            });
        }

        // Notify wildcard listeners
        const wildcardListeners = this.#listeners.get('*');
        if (wildcardListeners) {
            wildcardListeners.forEach(callback => {
                try {
                    callback(change);
                } catch (error) {
                    console.error('Error in wildcard state listener:', error);
                }
            });
        }
    }

    #saveHistory() {
        const snapshot = this.#getCurrentSnapshot();
        this.#state.history.past.push(snapshot);
        
        // Clear future on new action
        this.#state.history.future = [];
        
        // Limit history size
        if (this.#state.history.past.length > this.#state.history.maxHistorySize) {
            this.#state.history.past.shift();
        }
    }

    #shouldSaveHistory(action) {
        // Don't save history for UI-only changes
        const uiOnlyActions = ['UPDATE_UI', 'UPDATE_PREFERENCES'];
        return !uiOnlyActions.includes(action.type);
    }

    #getCurrentSnapshot() {
        return {
            nodes: new Map(this.#state.nodes),
            connections: new Map(this.#state.connections)
        };
    }

    #restoreSnapshot(snapshot) {
        this.#state.nodes = new Map(snapshot.nodes);
        this.#state.connections = new Map(snapshot.connections);
    }

    #mergeState(newState) {
        if (newState.nodes) {
            if (Array.isArray(newState.nodes)) {
                this.#state.nodes = new Map(newState.nodes.map(n => [n.id, n]));
            } else if (newState.nodes instanceof Map) {
                this.#state.nodes = new Map(newState.nodes);
            }
        }
        
        if (newState.connections) {
            if (Array.isArray(newState.connections)) {
                this.#state.connections = new Map(newState.connections.map(c => [c.id, c]));
            } else if (newState.connections instanceof Map) {
                this.#state.connections = new Map(newState.connections);
            }
        }
        
        if (newState.ui) {
            this.#state.ui = { ...this.#state.ui, ...newState.ui };
        }
        
        if (newState.preferences) {
            this.#state.preferences = { ...this.#state.preferences, ...newState.preferences };
        }
        
        if (newState.metadata) {
            this.#state.metadata = { ...this.#state.metadata, ...newState.metadata };
        }
    }

    #deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Map) {
            const cloned = new Map();
            for (const [key, value] of obj) {
                cloned.set(key, this.#deepClone(value));
            }
            return cloned;
        }
        if (obj instanceof Set) {
            const cloned = new Set();
            for (const value of obj) {
                cloned.add(this.#deepClone(value));
            }
            return cloned;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.#deepClone(item));
        }
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.#deepClone(obj[key]);
            }
        }
        return cloned;
    }

    // ==================== Persistence ====================

    isDirty() {
        return this.#isDirty;
    }

    markClean() {
        this.#isDirty = false;
    }

    serialize() {
        return {
            nodes: Array.from(this.#state.nodes.values()),
            connections: Array.from(this.#state.connections.values()),
            ui: this.#state.ui,
            preferences: this.#state.preferences,
            metadata: this.#state.metadata
        };
    }

    deserialize(data) {
        this.#dispatch({
            type: 'RESTORE_STATE',
            payload: data
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
} else {
    window.StateManager = StateManager;
}