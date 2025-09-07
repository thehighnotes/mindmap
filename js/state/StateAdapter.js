/**
 * StateAdapter.js - Bridge between global variables and StateManager
 * Provides backward compatibility for existing code that uses global variables
 */

class StateAdapter {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.originalFunctions = {};
        this.installGlobalProxies();
        this.wrapExistingFunctions();
    }
    
    installGlobalProxies() {
        // Create proxy for nodes array
        Object.defineProperty(window, 'nodes', {
            get: () => this.stateManager.getNodes(),
            set: (value) => {
                console.warn('Direct assignment to nodes array detected. Use StateManager methods instead.');
                // Handle legacy code that tries to assign directly
                if (Array.isArray(value)) {
                    // Clear and reload nodes
                    this.stateManager.transaction(() => {
                        // Clear existing nodes
                        const currentNodes = this.stateManager.getNodes();
                        currentNodes.forEach(node => {
                            this.stateManager.deleteNode(node.id);
                        });
                        // Add new nodes
                        value.forEach(node => {
                            this.stateManager.addNode(node);
                        });
                    });
                }
                return true;
            },
            configurable: true
        });
        
        // Create proxy for connections array
        Object.defineProperty(window, 'connections', {
            get: () => this.stateManager.getConnections(),
            set: (value) => {
                console.warn('Direct assignment to connections array detected. Use StateManager methods instead.');
                if (Array.isArray(value)) {
                    // Clear and reload connections
                    this.stateManager.transaction(() => {
                        // Clear existing connections
                        const currentConnections = this.stateManager.getConnections();
                        currentConnections.forEach(conn => {
                            this.stateManager.deleteConnection(conn.id);
                        });
                        // Add new connections
                        value.forEach(conn => {
                            this.stateManager.addConnection(conn);
                        });
                    });
                }
                return true;
            },
            configurable: true
        });
        
        // Proxy for currentSelectedNode
        Object.defineProperty(window, 'currentSelectedNode', {
            get: () => {
                const nodeId = this.stateManager.state.ui.selectedNodeId;
                return nodeId ? this.stateManager.getNodeById(nodeId) : null;
            },
            set: (node) => {
                if (node && node.id) {
                    this.stateManager.setSelectedNode(node.id);
                } else {
                    this.stateManager.clearSelection();
                }
                return true;
            },
            configurable: true
        });
        
        // Proxy for currentSelectedConnection
        Object.defineProperty(window, 'currentSelectedConnection', {
            get: () => {
                const connId = this.stateManager.state.ui.selectedConnectionId;
                return connId ? this.stateManager.getConnectionById(connId) : null;
            },
            set: (conn) => {
                if (conn && conn.id) {
                    this.stateManager.setSelectedConnection(conn.id);
                } else if (!window.currentSelectedNode) {
                    this.stateManager.clearSelection();
                }
                return true;
            },
            configurable: true
        });
        
        // Proxy for currentTool
        Object.defineProperty(window, 'currentTool', {
            get: () => this.stateManager.getCurrentTool(),
            set: (tool) => {
                this.stateManager.setCurrentTool(tool);
                return true;
            },
            configurable: true
        });
        
        // Proxy for zoomLevel
        Object.defineProperty(window, 'zoomLevel', {
            get: () => this.stateManager.getZoomLevel(),
            set: (value) => {
                this.stateManager.setZoomLevel(value);
                return true;
            },
            configurable: true
        });
        
        // Proxy for canvasOffset
        Object.defineProperty(window, 'canvasOffset', {
            get: () => this.stateManager.getCanvasOffset(),
            set: (value) => {
                this.stateManager.setCanvasOffset(value);
                return true;
            },
            configurable: true
        });
        
        // Proxy for rootNodeId
        Object.defineProperty(window, 'rootNodeId', {
            get: () => this.stateManager.getRootNodeId(),
            set: (value) => {
                this.stateManager.setRootNodeId(value);
                return true;
            },
            configurable: true
        });
        
        // Proxy for showGrid
        Object.defineProperty(window, 'showGrid', {
            get: () => this.stateManager.state.canvas.showGrid,
            set: (value) => {
                this.stateManager.setShowGrid(value);
                return true;
            },
            configurable: true
        });
        
        // Proxy for gridSize
        Object.defineProperty(window, 'gridSize', {
            get: () => this.stateManager.state.canvas.gridSize,
            set: (value) => {
                this.stateManager.setGridSize(value);
                return true;
            },
            configurable: true
        });
        
        // Proxy for mindmapTitle (if getMindmapTitle exists)
        if (typeof window.getMindmapTitle === 'function') {
            const originalGetTitle = window.getMindmapTitle;
            window.getMindmapTitle = () => this.stateManager.getProjectTitle();
        }
        
        if (typeof window.setMindmapTitle === 'function') {
            const originalSetTitle = window.setMindmapTitle;
            window.setMindmapTitle = (title) => {
                this.stateManager.setProjectTitle(title);
                // Call original to update UI
                originalSetTitle(title);
            };
        }
    }
    
    wrapExistingFunctions() {
        // Wrap createNode if it exists and hasn't been wrapped yet
        if (typeof window.createNode === 'function' && !this.originalFunctions.createNode) {
            this.originalFunctions.createNode = window.createNode;
            window.createNode = (...args) => {
                const node = this.originalFunctions.createNode.apply(window, args);
                if (node) {
                    // Check if node already exists in state (might have been added by createNode)
                    if (!this.stateManager.getNodeById(node.id)) {
                        this.stateManager.addNode(node);
                    }
                }
                return node;
            };
            console.log('Wrapped createNode function');
        }
        
        // Wrap deleteNode if it exists and hasn't been wrapped yet
        if (typeof window.deleteNode === 'function' && !this.originalFunctions.deleteNode) {
            this.originalFunctions.deleteNode = window.deleteNode;
            window.deleteNode = (nodeId) => {
                const result = this.originalFunctions.deleteNode.call(window, nodeId);
                this.stateManager.deleteNode(nodeId);
                return result;
            };
            console.log('Wrapped deleteNode function');
        }
        
        // Wrap createConnection if it exists and hasn't been wrapped yet
        if (typeof window.createConnection === 'function' && !this.originalFunctions.createConnection) {
            this.originalFunctions.createConnection = window.createConnection;
            window.createConnection = (...args) => {
                const connection = this.originalFunctions.createConnection.apply(window, args);
                if (connection) {
                    // Check if connection already exists in state
                    if (!this.stateManager.getConnectionById(connection.id)) {
                        this.stateManager.addConnection(connection);
                    }
                }
                return connection;
            };
            console.log('Wrapped createConnection function');
        }
        
        // Wrap deleteConnection if it exists and hasn't been wrapped yet
        if (typeof window.deleteConnection === 'function' && !this.originalFunctions.deleteConnection) {
            this.originalFunctions.deleteConnection = window.deleteConnection;
            window.deleteConnection = (connectionId) => {
                const result = this.originalFunctions.deleteConnection.call(window, connectionId);
                this.stateManager.deleteConnection(connectionId);
                return result;
            };
            console.log('Wrapped deleteConnection function');
        }
        
        // Wrap updateNodePosition if it exists and hasn't been wrapped yet
        if (typeof window.updateNodePosition === 'function' && !this.originalFunctions.updateNodePosition) {
            this.originalFunctions.updateNodePosition = window.updateNodePosition;
            window.updateNodePosition = (nodeId, x, y) => {
                const result = this.originalFunctions.updateNodePosition.call(window, nodeId, x, y);
                this.stateManager.updateNode(nodeId, { x, y });
                return result;
            };
            console.log('Wrapped updateNodePosition function');
        }
        
        // Wrap loadMindmapData if it exists and hasn't been wrapped yet
        if (typeof window.loadMindmapData === 'function' && !this.originalFunctions.loadMindmapData) {
            this.originalFunctions.loadMindmapData = window.loadMindmapData;
            window.loadMindmapData = (data) => {
                // Load into StateManager first
                this.stateManager.loadState(data);
                // Then call original to update UI
                return this.originalFunctions.loadMindmapData.call(window, data);
            };
            console.log('Wrapped loadMindmapData function');
        }
        
        // Wrap initMindmap if it exists and hasn't been wrapped yet
        if (typeof window.initMindmap === 'function' && !this.originalFunctions.initMindmap) {
            this.originalFunctions.initMindmap = window.initMindmap;
            window.initMindmap = (clearVersionHistory) => {
                // Clear state
                this.stateManager.clearAll();
                // Call original
                const result = this.originalFunctions.initMindmap.call(window, clearVersionHistory);
                // Sync any nodes created during init
                const rootNode = window.nodes ? window.nodes[0] : null;
                if (rootNode && !this.stateManager.getNodeById(rootNode.id)) {
                    this.stateManager.addNode(rootNode);
                    this.stateManager.setRootNodeId(rootNode.id);
                }
                return result;
            };
            console.log('Wrapped initMindmap function');
        }
    }
    
    // Method to sync current global state to StateManager (for initial load)
    syncFromGlobals() {
        console.log('Syncing existing global state to StateManager...');
        
        // Don't use the proxied getters, access the actual arrays if they exist
        const actualNodes = window.nodes || [];
        const actualConnections = window.connections || [];
        
        this.stateManager.transaction(() => {
            // Clear current state
            this.stateManager.clearAll();
            
            // Add all existing nodes
            if (Array.isArray(actualNodes)) {
                actualNodes.forEach(node => {
                    if (node && node.id) {
                        this.stateManager.addNode(node);
                    }
                });
            }
            
            // Add all existing connections
            if (Array.isArray(actualConnections)) {
                actualConnections.forEach(conn => {
                    if (conn && conn.id) {
                        this.stateManager.addConnection(conn);
                    }
                });
            }
            
            // Sync UI state
            if (window.currentSelectedNode && window.currentSelectedNode.id) {
                this.stateManager.setSelectedNode(window.currentSelectedNode.id);
            }
            if (window.currentSelectedConnection && window.currentSelectedConnection.id) {
                this.stateManager.setSelectedConnection(window.currentSelectedConnection.id);
            }
            if (window.currentTool) {
                this.stateManager.setCurrentTool(window.currentTool);
            }
            if (window.zoomLevel) {
                this.stateManager.setZoomLevel(window.zoomLevel);
            }
            if (window.canvasOffset) {
                this.stateManager.setCanvasOffset(window.canvasOffset);
            }
            if (window.rootNodeId) {
                this.stateManager.setRootNodeId(window.rootNodeId);
            }
            if (window.showGrid !== undefined) {
                this.stateManager.setShowGrid(window.showGrid);
            }
            if (window.gridSize) {
                this.stateManager.setGridSize(window.gridSize);
            }
        });
        
        console.log('State sync complete. Nodes:', this.stateManager.getNodes().length, 
                    'Connections:', this.stateManager.getConnections().length);
    }
}

// Make available globally
window.StateAdapter = StateAdapter;