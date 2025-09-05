/**
 * StateAdapter - Bridges the new StateManager with existing global state
 * Provides backward compatibility while migrating to new state system
 */

class StateAdapter {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.#setupGlobalProxies();
        this.#setupEventBridge();
    }

    // ==================== Global Variable Proxies ====================
    
    #setupGlobalProxies() {
        // Proxy nodes array
        Object.defineProperty(window, 'nodes', {
            get: () => this.stateManager.getNodes(),
            set: (value) => {
                console.warn('Direct assignment to nodes array is deprecated. Use StateManager.');
                if (Array.isArray(value)) {
                    // Clear existing nodes
                    const currentNodes = this.stateManager.getNodes();
                    currentNodes.forEach(node => {
                        this.stateManager.removeNode(node.id);
                    });
                    // Add new nodes
                    value.forEach(node => {
                        this.stateManager.addNode(node);
                    });
                }
            },
            configurable: true
        });

        // Proxy connections array
        Object.defineProperty(window, 'connections', {
            get: () => this.stateManager.getConnections(),
            set: (value) => {
                console.warn('Direct assignment to connections array is deprecated. Use StateManager.');
                if (Array.isArray(value)) {
                    // Clear existing connections
                    const currentConnections = this.stateManager.getConnections();
                    currentConnections.forEach(conn => {
                        this.stateManager.removeConnection(conn.id);
                    });
                    // Add new connections
                    value.forEach(conn => {
                        this.stateManager.addConnection(conn);
                    });
                }
            },
            configurable: true
        });

        // Proxy UI state variables
        const uiState = this.stateManager.getUIState();
        
        Object.defineProperty(window, 'currentSelectedNode', {
            get: () => this.stateManager.getUIState().selectedNode,
            set: (value) => {
                this.stateManager.updateUI({ selectedNode: value });
            },
            configurable: true
        });

        Object.defineProperty(window, 'currentSelectedConnection', {
            get: () => this.stateManager.getUIState().selectedConnection,
            set: (value) => {
                this.stateManager.updateUI({ selectedConnection: value });
            },
            configurable: true
        });

        Object.defineProperty(window, 'zoomLevel', {
            get: () => this.stateManager.getUIState().zoomLevel,
            set: (value) => {
                this.stateManager.updateUI({ zoomLevel: value });
            },
            configurable: true
        });

        Object.defineProperty(window, 'canvasOffset', {
            get: () => this.stateManager.getUIState().offset,
            set: (value) => {
                this.stateManager.updateUI({ offset: value });
            },
            configurable: true
        });

        Object.defineProperty(window, 'currentTool', {
            get: () => this.stateManager.getUIState().currentTool,
            set: (value) => {
                this.stateManager.updateUI({ currentTool: value });
            },
            configurable: true
        });
    }

    // ==================== Event Bridge ====================
    
    #setupEventBridge() {
        // Bridge StateManager events to existing EventBus if available
        if (window.EventBus) {
            // Node events
            this.stateManager.subscribe('ADD_NODE', (change) => {
                window.EventBus.emit('node:created', change.payload);
            });

            this.stateManager.subscribe('REMOVE_NODE', (change) => {
                window.EventBus.emit('node:deleted', change.payload);
            });

            this.stateManager.subscribe('UPDATE_NODE', (change) => {
                window.EventBus.emit('node:updated', change.payload);
            });

            // Connection events
            this.stateManager.subscribe('ADD_CONNECTION', (change) => {
                window.EventBus.emit('connection:created', change.payload);
            });

            this.stateManager.subscribe('REMOVE_CONNECTION', (change) => {
                window.EventBus.emit('connection:deleted', change.payload);
            });

            this.stateManager.subscribe('UPDATE_CONNECTION', (change) => {
                window.EventBus.emit('connection:updated', change.payload);
            });

            // UI events
            this.stateManager.subscribe('UPDATE_UI', (change) => {
                window.EventBus.emit('ui:updated', change.payload);
            });
        }
    }

    // ==================== Method Adapters ====================
    
    // Adapt existing global functions to use StateManager
    installGlobalMethods() {
        // Save original functions for fallback
        const originals = {
            createNode: window.createNode,
            deleteNode: window.deleteNode,
            createConnection: window.createConnection,
            deleteConnection: window.deleteConnection,
            updateNodePosition: window.updateNodePosition,
            selectNode: window.selectNode,
            selectConnection: window.selectConnection,
            saveStateForUndo: window.saveStateForUndo,
            undoLastAction: window.undoLastAction
        };

        // Override with StateManager versions
        window.createNode = (options) => {
            const node = {
                id: options.id || window.IdGenerator?.generate('node') || `node-${Date.now()}`,
                title: options.title || 'Nieuw Knooppunt',
                x: options.x || 0,
                y: options.y || 0,
                color: options.color || '#4CAF50',
                shape: options.shape || 'rounded',
                ...options
            };
            
            this.stateManager.addNode(node);
            
            // Call original for DOM updates if it exists
            if (originals.createNode) {
                originals.createNode(options);
            }
            
            return node;
        };

        window.deleteNode = (nodeId) => {
            this.stateManager.removeNode(nodeId);
            
            // Call original for DOM cleanup if it exists
            if (originals.deleteNode) {
                originals.deleteNode(nodeId);
            }
        };

        window.createConnection = (from, to, options = {}) => {
            const connection = {
                id: options.id || window.IdGenerator?.generate('conn') || `conn-${Date.now()}`,
                from: from,
                to: to,
                type: options.type || 'default',
                label: options.label || '',
                style: options.style || 'solid',
                ...options
            };
            
            this.stateManager.addConnection(connection);
            
            // Call original for DOM updates if it exists
            if (originals.createConnection) {
                originals.createConnection(from, to, options);
            }
            
            return connection;
        };

        window.deleteConnection = (connectionId) => {
            this.stateManager.removeConnection(connectionId);
            
            // Call original for DOM cleanup if it exists
            if (originals.deleteConnection) {
                originals.deleteConnection(connectionId);
            }
        };

        window.updateNodePosition = (nodeId, x, y) => {
            this.stateManager.updateNode(nodeId, { x, y });
            
            // Call original for DOM updates if it exists
            if (originals.updateNodePosition) {
                originals.updateNodePosition(nodeId, x, y);
            }
        };

        window.selectNode = (nodeId) => {
            this.stateManager.updateUI({ selectedNode: nodeId });
            
            // Call original for UI updates if it exists
            if (originals.selectNode) {
                originals.selectNode(nodeId);
            }
        };

        window.selectConnection = (connectionId) => {
            this.stateManager.updateUI({ selectedConnection: connectionId });
            
            // Call original for UI updates if it exists
            if (originals.selectConnection) {
                originals.selectConnection(connectionId);
            }
        };

        window.saveStateForUndo = () => {
            // StateManager handles this automatically
            console.log('Undo state saved automatically by StateManager');
        };

        window.undoLastAction = () => {
            const success = this.stateManager.undo();
            
            if (success) {
                // Refresh UI
                if (window.refreshConnections) {
                    window.refreshConnections();
                }
                if (window.refreshNodes) {
                    window.refreshNodes();
                }
            }
            
            return success;
        };

        // Store reference to originals for restoration if needed
        this.originalMethods = originals;
    }

    // ==================== Data Migration ====================
    
    migrateExistingState() {
        // Migrate nodes if they exist globally
        if (window.nodes && Array.isArray(window.nodes)) {
            window.nodes.forEach(node => {
                if (node && node.id) {
                    this.stateManager.addNode(node);
                }
            });
        }

        // Migrate connections if they exist globally
        if (window.connections && Array.isArray(window.connections)) {
            window.connections.forEach(conn => {
                if (conn && conn.id) {
                    this.stateManager.addConnection(conn);
                }
            });
        }

        // Migrate UI state
        const uiState = {};
        
        if (window.currentSelectedNode !== undefined) {
            uiState.selectedNode = window.currentSelectedNode;
        }
        
        if (window.currentSelectedConnection !== undefined) {
            uiState.selectedConnection = window.currentSelectedConnection;
        }
        
        if (window.zoomLevel !== undefined) {
            uiState.zoomLevel = window.zoomLevel;
        }
        
        if (window.canvasOffset !== undefined) {
            uiState.offset = window.canvasOffset;
        }
        
        if (window.currentTool !== undefined) {
            uiState.currentTool = window.currentTool;
        }
        
        if (Object.keys(uiState).length > 0) {
            this.stateManager.updateUI(uiState);
        }
    }

    // ==================== Export/Import Compatibility ====================
    
    getExportData() {
        const state = this.stateManager.serialize();
        
        // Convert to legacy format if needed
        return {
            formatVersion: state.metadata?.format || 'mindmap2',
            nodes: state.nodes,
            connections: state.connections,
            ui: state.ui,
            metadata: state.metadata
        };
    }

    importData(data) {
        // Clear current state
        this.stateManager.deserialize({
            nodes: [],
            connections: []
        });

        // Import new data
        this.stateManager.deserialize(data);

        // Refresh UI
        if (window.refreshConnections) {
            window.refreshConnections();
        }
        if (window.refreshNodes) {
            window.refreshNodes();
        }
    }

    // ==================== Utility Methods ====================
    
    isInitialized() {
        return this.stateManager !== null;
    }

    getStateManager() {
        return this.stateManager;
    }

    restore() {
        // Restore original methods if needed
        if (this.originalMethods) {
            Object.keys(this.originalMethods).forEach(key => {
                if (this.originalMethods[key]) {
                    window[key] = this.originalMethods[key];
                }
            });
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateAdapter;
} else {
    window.StateAdapter = StateAdapter;
}