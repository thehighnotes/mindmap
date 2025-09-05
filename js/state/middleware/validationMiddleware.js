/**
 * Validation Middleware for StateManager
 * Validates actions before they modify state
 */

const validationMiddleware = (action, state) => {
    switch (action.type) {
        case 'ADD_NODE':
            validateNode(action.payload);
            break;
        
        case 'UPDATE_NODE':
            if (!state.nodes.has(action.payload.id)) {
                throw new Error(`Cannot update non-existent node: ${action.payload.id}`);
            }
            if (action.payload.changes) {
                validateNodeChanges(action.payload.changes);
            }
            break;
        
        case 'REMOVE_NODE':
            if (!state.nodes.has(action.payload.id)) {
                console.warn(`Attempting to remove non-existent node: ${action.payload.id}`);
                return null; // Cancel action
            }
            break;
        
        case 'ADD_CONNECTION':
            validateConnection(action.payload, state);
            break;
        
        case 'UPDATE_CONNECTION':
            if (!state.connections.has(action.payload.id)) {
                throw new Error(`Cannot update non-existent connection: ${action.payload.id}`);
            }
            if (action.payload.changes) {
                validateConnectionChanges(action.payload.changes, state);
            }
            break;
        
        case 'REMOVE_CONNECTION':
            if (!state.connections.has(action.payload.id)) {
                console.warn(`Attempting to remove non-existent connection: ${action.payload.id}`);
                return null; // Cancel action
            }
            break;
        
        case 'UPDATE_UI':
            validateUIChanges(action.payload);
            break;
        
        case 'UPDATE_PREFERENCES':
            validatePreferences(action.payload);
            break;
    }

    return action;
};

function validateNode(node) {
    if (!node.id) {
        throw new Error('Node must have an id');
    }
    
    if (typeof node.x !== 'number' || typeof node.y !== 'number') {
        throw new Error('Node must have numeric x and y coordinates');
    }
    
    if (node.title && typeof node.title !== 'string') {
        throw new Error('Node title must be a string');
    }
    
    // Validate shape if provided
    const validShapes = ['rectangle', 'rounded', 'circle', 'diamond'];
    if (node.shape && !validShapes.includes(node.shape)) {
        throw new Error(`Invalid node shape: ${node.shape}`);
    }
    
    // Validate color if provided
    if (node.color && !isValidColor(node.color)) {
        throw new Error(`Invalid node color: ${node.color}`);
    }
}

function validateNodeChanges(changes) {
    if (changes.x !== undefined && typeof changes.x !== 'number') {
        throw new Error('Node x coordinate must be a number');
    }
    
    if (changes.y !== undefined && typeof changes.y !== 'number') {
        throw new Error('Node y coordinate must be a number');
    }
    
    if (changes.title !== undefined && typeof changes.title !== 'string') {
        throw new Error('Node title must be a string');
    }
    
    if (changes.shape) {
        const validShapes = ['rectangle', 'rounded', 'circle', 'diamond'];
        if (!validShapes.includes(changes.shape)) {
            throw new Error(`Invalid node shape: ${changes.shape}`);
        }
    }
    
    if (changes.color && !isValidColor(changes.color)) {
        throw new Error(`Invalid node color: ${changes.color}`);
    }
}

function validateConnection(connection, state) {
    if (!connection.id) {
        throw new Error('Connection must have an id');
    }
    
    if (!connection.from || !connection.to) {
        throw new Error('Connection must have from and to node ids');
    }
    
    // Check if nodes exist
    if (!state.nodes.has(connection.from)) {
        throw new Error(`Connection references non-existent from node: ${connection.from}`);
    }
    
    if (!state.nodes.has(connection.to)) {
        throw new Error(`Connection references non-existent to node: ${connection.to}`);
    }
    
    // Prevent self-connections (optional)
    if (connection.from === connection.to) {
        throw new Error('Cannot create connection from node to itself');
    }
    
    // Check for duplicate connections (optional)
    for (const [id, conn] of state.connections) {
        if (conn.from === connection.from && conn.to === connection.to) {
            console.warn(`Duplicate connection between ${connection.from} and ${connection.to}`);
        }
    }
    
    // Validate connection type if provided
    const validTypes = ['default', 'primary', 'secondary', 'branch'];
    if (connection.type && !validTypes.includes(connection.type)) {
        throw new Error(`Invalid connection type: ${connection.type}`);
    }
}

function validateConnectionChanges(changes, state) {
    if (changes.from && !state.nodes.has(changes.from)) {
        throw new Error(`Connection references non-existent from node: ${changes.from}`);
    }
    
    if (changes.to && !state.nodes.has(changes.to)) {
        throw new Error(`Connection references non-existent to node: ${changes.to}`);
    }
    
    if (changes.type) {
        const validTypes = ['default', 'primary', 'secondary', 'branch'];
        if (!validTypes.includes(changes.type)) {
            throw new Error(`Invalid connection type: ${changes.type}`);
        }
    }
    
    if (changes.style) {
        const validStyles = ['solid', 'dashed', 'dotted'];
        if (!validStyles.includes(changes.style)) {
            throw new Error(`Invalid connection style: ${changes.style}`);
        }
    }
}

function validateUIChanges(changes) {
    if (changes.zoomLevel !== undefined) {
        if (typeof changes.zoomLevel !== 'number' || changes.zoomLevel <= 0 || changes.zoomLevel > 5) {
            throw new Error('Zoom level must be a number between 0 and 5');
        }
    }
    
    if (changes.offset !== undefined) {
        if (!changes.offset || typeof changes.offset.x !== 'number' || typeof changes.offset.y !== 'number') {
            throw new Error('Offset must have numeric x and y properties');
        }
    }
    
    if (changes.currentTool !== undefined) {
        const validTools = ['select', 'node', 'connection', 'pan', 'delete'];
        if (!validTools.includes(changes.currentTool)) {
            throw new Error(`Invalid tool: ${changes.currentTool}`);
        }
    }
}

function validatePreferences(preferences) {
    if (preferences.autoSave !== undefined && typeof preferences.autoSave !== 'boolean') {
        throw new Error('autoSave must be a boolean');
    }
    
    if (preferences.snapToGrid !== undefined && typeof preferences.snapToGrid !== 'boolean') {
        throw new Error('snapToGrid must be a boolean');
    }
    
    if (preferences.gridSize !== undefined) {
        if (typeof preferences.gridSize !== 'number' || preferences.gridSize <= 0) {
            throw new Error('gridSize must be a positive number');
        }
    }
    
    if (preferences.theme !== undefined) {
        const validThemes = ['light', 'dark'];
        if (!validThemes.includes(preferences.theme)) {
            throw new Error(`Invalid theme: ${preferences.theme}`);
        }
    }
}

function isValidColor(color) {
    // Check for hex color
    if (/^#[0-9A-F]{6}$/i.test(color)) {
        return true;
    }
    
    // Check for rgb/rgba
    if (/^rgba?\([\d\s,]+\)$/i.test(color)) {
        return true;
    }
    
    // Check for named colors (basic set)
    const namedColors = [
        'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink',
        'black', 'white', 'gray', 'grey', 'brown', 'cyan', 'magenta'
    ];
    
    return namedColors.includes(color.toLowerCase());
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = validationMiddleware;
} else {
    window.validationMiddleware = validationMiddleware;
}