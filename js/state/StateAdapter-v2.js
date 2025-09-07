/**
 * StateAdapter-v2.js - Improved bridge using Proxy arrays
 * This version properly intercepts array operations like push(), splice(), etc.
 */

class StateAdapterV2 {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.originalFunctions = {};
        this.setupArrayProxies();
        this.wrapExistingFunctions();
    }
    
    setupArrayProxies() {
        // Create proxy arrays that sync with StateManager
        const self = this;
        
        // Create nodes proxy array
        window.nodes = new Proxy([], {
            get(target, prop) {
                // Get the actual nodes from StateManager
                const actualNodes = self.stateManager.state.nodes;
                
                // Handle array methods
                if (prop === 'push') {
                    return function(...items) {
                        items.forEach(item => {
                            if (item && item.id) {
                                self.stateManager.addNode(item);
                            }
                        });
                        return actualNodes.length;
                    };
                }
                
                if (prop === 'splice') {
                    return function(start, deleteCount, ...items) {
                        const deleted = [];
                        // Handle deletions
                        if (deleteCount > 0) {
                            for (let i = 0; i < deleteCount; i++) {
                                const index = start + i;
                                if (index < actualNodes.length) {
                                    const nodeToDelete = actualNodes[index];
                                    deleted.push(nodeToDelete);
                                    self.stateManager.deleteNode(nodeToDelete.id);
                                }
                            }
                        }
                        // Handle insertions
                        items.forEach(item => {
                            if (item && item.id) {
                                self.stateManager.addNode(item);
                            }
                        });
                        return deleted;
                    };
                }
                
                if (prop === 'length') {
                    return actualNodes.length;
                }
                
                if (prop === 'forEach') {
                    return actualNodes.forEach.bind(actualNodes);
                }
                
                if (prop === 'map') {
                    return actualNodes.map.bind(actualNodes);
                }
                
                if (prop === 'filter') {
                    return actualNodes.filter.bind(actualNodes);
                }
                
                if (prop === 'find') {
                    return actualNodes.find.bind(actualNodes);
                }
                
                if (prop === 'findIndex') {
                    return actualNodes.findIndex.bind(actualNodes);
                }
                
                if (prop === 'some') {
                    return actualNodes.some.bind(actualNodes);
                }
                
                if (prop === 'every') {
                    return actualNodes.every.bind(actualNodes);
                }
                
                if (prop === 'indexOf') {
                    return actualNodes.indexOf.bind(actualNodes);
                }
                
                // Handle numeric indices
                if (!isNaN(prop)) {
                    return actualNodes[prop];
                }
                
                // Default
                return actualNodes[prop];
            },
            
            set(target, prop, value) {
                const actualNodes = self.stateManager.state.nodes;
                
                if (!isNaN(prop)) {
                    const index = Number(prop);
                    if (index < actualNodes.length) {
                        // Update existing node
                        const oldNode = actualNodes[index];
                        if (oldNode && oldNode.id) {
                            self.stateManager.updateNode(oldNode.id, value);
                        }
                    } else {
                        // Add new node
                        if (value && value.id) {
                            self.stateManager.addNode(value);
                        }
                    }
                    return true;
                }
                
                if (prop === 'length') {
                    // Handle array truncation
                    const newLength = Number(value);
                    const currentLength = actualNodes.length;
                    if (newLength < currentLength) {
                        // Remove nodes from the end
                        for (let i = currentLength - 1; i >= newLength; i--) {
                            const node = actualNodes[i];
                            if (node && node.id) {
                                self.stateManager.deleteNode(node.id);
                            }
                        }
                    }
                    return true;
                }
                
                return true;
            },
            
            has(target, prop) {
                const actualNodes = self.stateManager.state.nodes;
                if (!isNaN(prop)) {
                    return Number(prop) < actualNodes.length;
                }
                return prop in actualNodes;
            }
        });
        
        // Create connections proxy array
        window.connections = new Proxy([], {
            get(target, prop) {
                const actualConnections = self.stateManager.state.connections;
                
                if (prop === 'push') {
                    return function(...items) {
                        items.forEach(item => {
                            if (item && item.id) {
                                self.stateManager.addConnection(item);
                            }
                        });
                        return actualConnections.length;
                    };
                }
                
                if (prop === 'splice') {
                    return function(start, deleteCount, ...items) {
                        const deleted = [];
                        if (deleteCount > 0) {
                            for (let i = 0; i < deleteCount; i++) {
                                const index = start + i;
                                if (index < actualConnections.length) {
                                    const connToDelete = actualConnections[index];
                                    deleted.push(connToDelete);
                                    self.stateManager.deleteConnection(connToDelete.id);
                                }
                            }
                        }
                        items.forEach(item => {
                            if (item && item.id) {
                                self.stateManager.addConnection(item);
                            }
                        });
                        return deleted;
                    };
                }
                
                if (prop === 'length') {
                    return actualConnections.length;
                }
                
                if (prop === 'forEach') {
                    return actualConnections.forEach.bind(actualConnections);
                }
                
                if (prop === 'map') {
                    return actualConnections.map.bind(actualConnections);
                }
                
                if (prop === 'filter') {
                    return actualConnections.filter.bind(actualConnections);
                }
                
                if (prop === 'find') {
                    return actualConnections.find.bind(actualConnections);
                }
                
                if (prop === 'findIndex') {
                    return actualConnections.findIndex.bind(actualConnections);
                }
                
                if (prop === 'some') {
                    return actualConnections.some.bind(actualConnections);
                }
                
                if (!isNaN(prop)) {
                    return actualConnections[prop];
                }
                
                return actualConnections[prop];
            },
            
            set(target, prop, value) {
                const actualConnections = self.stateManager.state.connections;
                
                if (!isNaN(prop)) {
                    const index = Number(prop);
                    if (index < actualConnections.length) {
                        const oldConn = actualConnections[index];
                        if (oldConn && oldConn.id) {
                            self.stateManager.updateConnection(oldConn.id, value);
                        }
                    } else {
                        if (value && value.id) {
                            self.stateManager.addConnection(value);
                        }
                    }
                    return true;
                }
                
                if (prop === 'length') {
                    const newLength = Number(value);
                    const currentLength = actualConnections.length;
                    if (newLength < currentLength) {
                        for (let i = currentLength - 1; i >= newLength; i--) {
                            const conn = actualConnections[i];
                            if (conn && conn.id) {
                                self.stateManager.deleteConnection(conn.id);
                            }
                        }
                    }
                    return true;
                }
                
                return true;
            },
            
            has(target, prop) {
                const actualConnections = self.stateManager.state.connections;
                if (!isNaN(prop)) {
                    return Number(prop) < actualConnections.length;
                }
                return prop in actualConnections;
            }
        });
        
        // Setup other global proxies
        this.setupOtherProxies();
    }
    
    setupOtherProxies() {
        const self = this;
        
        // Proxy for currentSelectedNode
        Object.defineProperty(window, 'currentSelectedNode', {
            get: () => {
                const nodeId = self.stateManager.state.ui.selectedNodeId;
                return nodeId ? self.stateManager.getNodeById(nodeId) : null;
            },
            set: (node) => {
                if (node && node.id) {
                    self.stateManager.setSelectedNode(node.id);
                } else {
                    self.stateManager.clearSelection();
                }
                return true;
            },
            configurable: true
        });
        
        // Proxy for currentSelectedConnection
        Object.defineProperty(window, 'currentSelectedConnection', {
            get: () => {
                const connId = self.stateManager.state.ui.selectedConnectionId;
                return connId ? self.stateManager.getConnectionById(connId) : null;
            },
            set: (conn) => {
                if (conn && conn.id) {
                    self.stateManager.setSelectedConnection(conn.id);
                } else if (!window.currentSelectedNode) {
                    self.stateManager.clearSelection();
                }
                return true;
            },
            configurable: true
        });
        
        // Proxy for currentTool
        Object.defineProperty(window, 'currentTool', {
            get: () => self.stateManager.getCurrentTool(),
            set: (tool) => {
                self.stateManager.setCurrentTool(tool);
                return true;
            },
            configurable: true
        });
        
        // Proxy for zoomLevel
        Object.defineProperty(window, 'zoomLevel', {
            get: () => self.stateManager.getZoomLevel(),
            set: (value) => {
                self.stateManager.setZoomLevel(value);
                return true;
            },
            configurable: true
        });
        
        // Proxy for canvasOffset
        Object.defineProperty(window, 'canvasOffset', {
            get: () => self.stateManager.getCanvasOffset(),
            set: (value) => {
                self.stateManager.setCanvasOffset(value);
                return true;
            },
            configurable: true
        });
        
        // Proxy for rootNodeId
        Object.defineProperty(window, 'rootNodeId', {
            get: () => self.stateManager.getRootNodeId(),
            set: (value) => {
                self.stateManager.setRootNodeId(value);
                return true;
            },
            configurable: true
        });
        
        // Proxy for showGrid
        Object.defineProperty(window, 'showGrid', {
            get: () => self.stateManager.state.canvas.showGrid,
            set: (value) => {
                self.stateManager.setShowGrid(value);
                return true;
            },
            configurable: true
        });
        
        // Proxy for gridSize
        Object.defineProperty(window, 'gridSize', {
            get: () => self.stateManager.state.canvas.gridSize,
            set: (value) => {
                self.stateManager.setGridSize(value);
                return true;
            },
            configurable: true
        });
    }
    
    wrapExistingFunctions() {
        // We don't need to wrap createNode and deleteNode anymore
        // because the array proxies handle the state sync
        
        // But we still want to wrap some functions for additional functionality
        
        // Wrap updateNodePosition if it exists
        if (typeof window.updateNodePosition === 'function' && !this.originalFunctions.updateNodePosition) {
            this.originalFunctions.updateNodePosition = window.updateNodePosition;
            window.updateNodePosition = (nodeId, x, y) => {
                const result = this.originalFunctions.updateNodePosition.call(window, nodeId, x, y);
                this.stateManager.updateNode(nodeId, { x, y });
                return result;
            };
            console.log('Wrapped updateNodePosition function');
        }
        
        // Wrap loadMindmapData if it exists
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
        
        // Wrap initMindmap if it exists
        if (typeof window.initMindmap === 'function' && !this.originalFunctions.initMindmap) {
            this.originalFunctions.initMindmap = window.initMindmap;
            window.initMindmap = (clearVersionHistory) => {
                // Clear state
                this.stateManager.clearAll();
                // Call original
                const result = this.originalFunctions.initMindmap.call(window, clearVersionHistory);
                return result;
            };
            console.log('Wrapped initMindmap function');
        }
    }
}

// Make available globally
window.StateAdapterV2 = StateAdapterV2;