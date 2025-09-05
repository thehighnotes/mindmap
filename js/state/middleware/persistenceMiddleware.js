/**
 * Persistence Middleware for StateManager
 * Handles auto-save and local storage persistence
 */

const persistenceMiddleware = (() => {
    let saveTimeout = null;
    const SAVE_DELAY = 2000; // 2 seconds debounce
    const STORAGE_KEY = 'mindmap_autosave';
    
    return (action, state) => {
        // Skip persistence for UI-only changes
        const skipPersistActions = ['UPDATE_UI'];
        if (skipPersistActions.includes(action.type)) {
            return action;
        }
        
        // Check if auto-save is enabled
        if (state.preferences && state.preferences.autoSave) {
            // Clear existing timeout
            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }
            
            // Schedule save
            saveTimeout = setTimeout(() => {
                saveToLocalStorage(state);
            }, SAVE_DELAY);
        }
        
        return action;
    };
    
    function saveToLocalStorage(state) {
        try {
            const dataToSave = {
                nodes: Array.from(state.nodes.values()),
                connections: Array.from(state.connections.values()),
                metadata: {
                    ...state.metadata,
                    lastAutoSave: Date.now()
                }
            };
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
            
            if (window.Logger) {
                window.Logger.debug('Auto-saved to local storage');
            }
        } catch (error) {
            console.error('Failed to auto-save:', error);
            
            // Check if it's a quota exceeded error
            if (error.name === 'QuotaExceededError') {
                console.warn('Local storage quota exceeded. Clearing old saves...');
                clearOldAutoSaves();
            }
        }
    }
    
    function clearOldAutoSaves() {
        // Remove old auto-saves to free up space
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('mindmap_autosave_old_')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }
})();

// Utility function to load auto-saved data
function loadAutoSave() {
    try {
        const saved = localStorage.getItem('mindmap_autosave');
        if (saved) {
            const data = JSON.parse(saved);
            
            // Check if auto-save is recent (within 24 hours)
            if (data.metadata && data.metadata.lastAutoSave) {
                const age = Date.now() - data.metadata.lastAutoSave;
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours
                
                if (age > maxAge) {
                    console.warn('Auto-save is too old, ignoring');
                    return null;
                }
            }
            
            return data;
        }
    } catch (error) {
        console.error('Failed to load auto-save:', error);
    }
    
    return null;
}

// Utility function to clear auto-save
function clearAutoSave() {
    localStorage.removeItem('mindmap_autosave');
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        persistenceMiddleware,
        loadAutoSave,
        clearAutoSave
    };
} else {
    window.persistenceMiddleware = persistenceMiddleware;
    window.loadAutoSave = loadAutoSave;
    window.clearAutoSave = clearAutoSave;
}