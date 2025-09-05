/**
 * Logger Middleware for StateManager
 * Logs all state changes for debugging
 */

const loggerMiddleware = (action, state) => {
    if (window.Logger && window.Logger.isEnabled('DEBUG')) {
        const timestamp = new Date().toISOString();
        const stateSize = {
            nodes: state.nodes ? state.nodes.size : 0,
            connections: state.connections ? state.connections.size : 0
        };

        window.Logger.debug('State Action', {
            timestamp,
            action: {
                type: action.type,
                payload: action.payload
            },
            stateSize
        });

        // Log specific details for debugging
        switch (action.type) {
            case 'ADD_NODE':
                window.Logger.debug(`Adding node: ${action.payload.id}`);
                break;
            case 'REMOVE_NODE':
                window.Logger.debug(`Removing node: ${action.payload.id}`);
                break;
            case 'ADD_CONNECTION':
                window.Logger.debug(`Adding connection: ${action.payload.id} (${action.payload.from} -> ${action.payload.to})`);
                break;
            case 'REMOVE_CONNECTION':
                window.Logger.debug(`Removing connection: ${action.payload.id}`);
                break;
            case 'UPDATE_UI':
                window.Logger.debug('UI state updated', action.payload);
                break;
        }
    }

    // Pass action through unchanged
    return action;
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = loggerMiddleware;
} else {
    window.loggerMiddleware = loggerMiddleware;
}