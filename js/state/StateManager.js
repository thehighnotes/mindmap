/**
 * StateManager.js - Centralized state management for the mindmap application
 * Provides a single source of truth for all application state
 */

class StateManager {
    constructor() {
        this.state = {
            nodes: [],
            connections: [],
            ui: {
                selectedNodeId: null,
                selectedConnectionId: null,
                currentTool: 'select',
                zoomLevel: 1,
                canvasOffset: { x: -2000, y: -2000 }
            },
            canvas: {
                isDragging: false,
                showGrid: true,
                gridSize: 30
            },
            project: {
                title: 'Mindmap Project',
                isDirty: false,
                lastSaved: null,
                created: Date.now(),
                rootNodeId: null
            }
        };
        this.listeners = new Map();
    }
    
    // Event emitter pattern
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return () => this.off(event, callback); // Return unsubscribe function
    }
    
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => {
                try {
                    cb(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
    
    // State getters
    getNodes() { 
        return [...this.state.nodes]; 
    }
    
    getConnections() { 
        return [...this.state.connections]; 
    }
    
    getNodeById(nodeId) {
        return this.state.nodes.find(n => n.id === nodeId);
    }
    
    getConnectionById(connectionId) {
        return this.state.connections.find(c => c.id === connectionId);
    }
    
    getSelectedNode() { 
        return this.state.nodes.find(n => n.id === this.state.ui.selectedNodeId); 
    }
    
    getSelectedConnection() {
        return this.state.connections.find(c => c.id === this.state.ui.selectedConnectionId);
    }
    
    getCurrentTool() {
        return this.state.ui.currentTool;
    }
    
    getZoomLevel() {
        return this.state.ui.zoomLevel;
    }
    
    getCanvasOffset() {
        return { ...this.state.ui.canvasOffset };
    }
    
    getRootNodeId() {
        return this.state.project.rootNodeId;
    }
    
    getProjectTitle() {
        return this.state.project.title;
    }
    
    // State setters with events
    addNode(node) {
        // Ensure node has all required properties
        const completeNode = {
            id: node.id,
            title: node.title || 'Nieuw knooppunt',
            content: node.content || '',
            color: node.color || '#4CAF50',
            x: node.x,
            y: node.y,
            shape: node.shape || 'rectangle',
            isRoot: node.isRoot || false,
            created: node.created || Date.now(),
            modified: Date.now()
        };
        
        this.state.nodes.push(completeNode);
        this.state.project.isDirty = true;
        this.emit('node:added', completeNode);
        this.emit('state:changed', { type: 'node:added', data: completeNode });
        return completeNode;
    }
    
    updateNode(nodeId, updates) {
        const node = this.state.nodes.find(n => n.id === nodeId);
        if (node) {
            Object.assign(node, updates, { modified: Date.now() });
            this.state.project.isDirty = true;
            this.emit('node:updated', node);
            this.emit('state:changed', { type: 'node:updated', data: node });
            return node;
        }
        return null;
    }
    
    deleteNode(nodeId) {
        const index = this.state.nodes.findIndex(n => n.id === nodeId);
        if (index !== -1) {
            const node = this.state.nodes[index];
            this.state.nodes.splice(index, 1);
            
            // Remove related connections
            const removedConnections = this.state.connections.filter(
                c => c.source === nodeId || c.target === nodeId
            );
            this.state.connections = this.state.connections.filter(
                c => c.source !== nodeId && c.target !== nodeId
            );
            
            // Clear selection if this node was selected
            if (this.state.ui.selectedNodeId === nodeId) {
                this.state.ui.selectedNodeId = null;
            }
            
            this.state.project.isDirty = true;
            this.emit('node:deleted', { node, removedConnections });
            this.emit('state:changed', { type: 'node:deleted', data: node });
            return true;
        }
        return false;
    }
    
    addConnection(connection) {
        // Ensure connection has all required properties
        const completeConnection = {
            id: connection.id,
            source: connection.source,
            target: connection.target,
            label: connection.label || '',
            style: connection.style || 'solid',
            type: connection.type || 'default',
            isYBranch: connection.isYBranch || false,
            styleClass: connection.styleClass || '',
            created: connection.created || Date.now(),
            modified: Date.now()
        };
        
        this.state.connections.push(completeConnection);
        this.state.project.isDirty = true;
        this.emit('connection:added', completeConnection);
        this.emit('state:changed', { type: 'connection:added', data: completeConnection });
        return completeConnection;
    }
    
    updateConnection(connectionId, updates) {
        const connection = this.state.connections.find(c => c.id === connectionId);
        if (connection) {
            Object.assign(connection, updates, { modified: Date.now() });
            this.state.project.isDirty = true;
            this.emit('connection:updated', connection);
            this.emit('state:changed', { type: 'connection:updated', data: connection });
            return connection;
        }
        return null;
    }
    
    deleteConnection(connectionId) {
        const index = this.state.connections.findIndex(c => c.id === connectionId);
        if (index !== -1) {
            const connection = this.state.connections[index];
            this.state.connections.splice(index, 1);
            
            // Clear selection if this connection was selected
            if (this.state.ui.selectedConnectionId === connectionId) {
                this.state.ui.selectedConnectionId = null;
            }
            
            this.state.project.isDirty = true;
            this.emit('connection:deleted', connection);
            this.emit('state:changed', { type: 'connection:deleted', data: connection });
            return true;
        }
        return false;
    }
    
    // UI state management
    setSelectedNode(nodeId) {
        const oldId = this.state.ui.selectedNodeId;
        this.state.ui.selectedNodeId = nodeId;
        this.state.ui.selectedConnectionId = null; // Clear connection selection
        this.emit('selection:changed', { 
            type: 'node', 
            oldId, 
            newId: nodeId 
        });
    }
    
    setSelectedConnection(connectionId) {
        const oldId = this.state.ui.selectedConnectionId;
        this.state.ui.selectedConnectionId = connectionId;
        this.state.ui.selectedNodeId = null; // Clear node selection
        this.emit('selection:changed', { 
            type: 'connection', 
            oldId, 
            newId: connectionId 
        });
    }
    
    clearSelection() {
        this.state.ui.selectedNodeId = null;
        this.state.ui.selectedConnectionId = null;
        this.emit('selection:cleared');
    }
    
    setCurrentTool(tool) {
        const oldTool = this.state.ui.currentTool;
        this.state.ui.currentTool = tool;
        this.emit('tool:changed', { oldTool, newTool: tool });
    }
    
    setZoomLevel(zoom) {
        this.state.ui.zoomLevel = zoom;
        this.emit('zoom:changed', zoom);
    }
    
    setCanvasOffset(offset) {
        this.state.ui.canvasOffset = { ...offset };
        this.emit('canvas:offset:changed', offset);
    }
    
    // Project state management
    setProjectTitle(title) {
        this.state.project.title = title;
        this.state.project.isDirty = true;
        this.emit('project:title:changed', title);
    }
    
    setRootNodeId(nodeId) {
        this.state.project.rootNodeId = nodeId;
        this.state.project.isDirty = true;
        this.emit('project:root:changed', nodeId);
    }
    
    markClean() {
        this.state.project.isDirty = false;
        this.state.project.lastSaved = Date.now();
        this.emit('project:saved');
    }
    
    // Canvas state management
    setShowGrid(show) {
        this.state.canvas.showGrid = show;
        this.emit('canvas:grid:changed', show);
    }
    
    setGridSize(size) {
        this.state.canvas.gridSize = size;
        this.emit('canvas:gridsize:changed', size);
    }
    
    // Bulk operations
    loadState(data) {
        // Preserve listeners
        const listeners = this.listeners;
        
        // Load nodes
        this.state.nodes = data.nodes || [];
        this.state.connections = data.connections || [];
        
        // Load project info
        if (data.project) {
            Object.assign(this.state.project, data.project);
        }
        if (data.title) {
            this.state.project.title = data.title;
        }
        if (data.rootNodeId !== undefined) {
            this.state.project.rootNodeId = data.rootNodeId;
        }
        
        // Load UI settings if provided
        if (data.settings) {
            if (data.settings.canvasOffset) {
                this.state.ui.canvasOffset = data.settings.canvasOffset;
            }
            if (data.settings.zoomLevel) {
                this.state.ui.zoomLevel = data.settings.zoomLevel;
            }
            if (data.settings.showGrid !== undefined) {
                this.state.canvas.showGrid = data.settings.showGrid;
            }
            if (data.settings.gridSize) {
                this.state.canvas.gridSize = data.settings.gridSize;
            }
        }
        
        // Mark as clean after loading
        this.state.project.isDirty = false;
        
        this.emit('state:loaded', data);
        this.emit('state:changed', { type: 'state:loaded', data });
    }
    
    clearAll() {
        this.state.nodes = [];
        this.state.connections = [];
        this.state.ui.selectedNodeId = null;
        this.state.ui.selectedConnectionId = null;
        this.state.project.rootNodeId = null;
        this.state.project.isDirty = false;
        
        this.emit('state:cleared');
        this.emit('state:changed', { type: 'state:cleared' });
    }
    
    // Get complete state for saving
    getState() {
        return {
            nodes: [...this.state.nodes],
            connections: [...this.state.connections],
            project: { ...this.state.project },
            ui: { ...this.state.ui },
            canvas: { ...this.state.canvas }
        };
    }
    
    // Transaction support for batch operations
    transaction(callback) {
        const events = [];
        const originalEmit = this.emit.bind(this);
        
        // Temporarily replace emit to collect events
        this.emit = (event, data) => {
            if (event !== 'state:changed') {
                events.push({ event, data });
            }
        };
        
        try {
            callback();
            
            // Restore original emit
            this.emit = originalEmit;
            
            // Emit all collected events
            events.forEach(({ event, data }) => {
                this.emit(event, data);
            });
            
            // Emit single state change for the entire transaction
            if (events.length > 0) {
                this.emit('state:changed', { 
                    type: 'transaction', 
                    changes: events 
                });
            }
        } catch (error) {
            // Restore original emit even if error occurs
            this.emit = originalEmit;
            throw error;
        }
    }
}

// Make available globally
window.StateManager = StateManager;