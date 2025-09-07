/**
 * initState.js - Initialize StateManager and adapt existing code
 * This file sets up the state management system and ensures backward compatibility
 */

(function() {
    console.log('Initializing StateManager system...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeStateSystem);
    } else {
        // DOM is already ready, initialize immediately
        initializeStateSystem();
    }
    
    function initializeStateSystem() {
        // Create global state manager
        window.stateManager = new StateManager();
        console.log('StateManager created');
        
        // Install backward compatibility layer  
        // We need to wait a bit for all functions to be defined by other scripts
        // Since this runs after DOMContentLoaded, we use a small timeout
        setTimeout(() => {
            // Use the improved StateAdapterV2 that properly handles array operations
            window.stateAdapter = new StateAdapterV2(window.stateManager);
            console.log('StateAdapterV2 installed');
            
            // After adapter is installed, wrap any functions that were missed
            ensureFunctionsWrapped();
            
            // Set up state change listeners for debugging (can be removed in production)
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') {
                window.stateManager.on('state:changed', (change) => {
                    console.log('[StateManager] State changed:', change.type, change.data);
                });
            }
            
            // Set up listeners for UI updates
            setupStateListeners();
            
            console.log('StateManager initialization complete');
            
            // Dispatch event to signal ready
            window.dispatchEvent(new Event('statemanager:ready'));
        }, 100);
    }
    
    function ensureFunctionsWrapped() {
        // Double-check that critical functions are wrapped
        // This handles any timing issues with script loading
        if (window.stateAdapter) {
            console.log('Ensuring all functions are properly wrapped...');
            
            // Re-run the wrapping to catch any functions that weren't ready before
            window.stateAdapter.wrapExistingFunctions();
            
            // Also ensure global proxies are set up
            window.stateAdapter.installGlobalProxies();
            
            console.log('Function wrapping verified');
        }
    }
    
    function setupStateListeners() {
        // Listen for selection changes to update UI
        window.stateManager.on('selection:changed', (data) => {
            // Update any UI elements that show selection state
            if (data.type === 'node') {
                // Remove previous selection highlights
                document.querySelectorAll('.node.selected').forEach(el => {
                    el.classList.remove('selected');
                });
                // Add selection to new node
                if (data.newId) {
                    const nodeEl = document.getElementById(data.newId);
                    if (nodeEl) {
                        nodeEl.classList.add('selected');
                    }
                }
            } else if (data.type === 'connection') {
                // Remove previous selection highlights
                document.querySelectorAll('.connection.selected').forEach(el => {
                    el.classList.remove('selected');
                });
                // Add selection to new connection
                if (data.newId) {
                    const connEl = document.getElementById(data.newId);
                    if (connEl) {
                        connEl.classList.add('selected');
                    }
                }
            }
        });
        
        // Listen for tool changes to update UI
        window.stateManager.on('tool:changed', (data) => {
            // Update tool button states
            document.querySelectorAll('.tool-btn').forEach(btn => {
                btn.classList.remove('active-tool');
            });
            const newToolBtn = document.getElementById(data.newTool + '-btn');
            if (newToolBtn) {
                newToolBtn.classList.add('active-tool');
            }
            
            // Update cursor style based on tool
            const canvas = document.getElementById('canvas');
            if (canvas) {
                canvas.className = canvas.className.replace(/tool-\w+/g, '');
                canvas.classList.add('tool-' + data.newTool);
            }
        });
        
        // Listen for zoom changes
        window.stateManager.on('zoom:changed', (zoomLevel) => {
            // Update zoom display if it exists
            const zoomDisplay = document.getElementById('zoom-level');
            if (zoomDisplay) {
                zoomDisplay.textContent = Math.round(zoomLevel * 100) + '%';
            }
        });
        
        // Listen for project title changes
        window.stateManager.on('project:title:changed', (title) => {
            // Update title display if it exists
            const titleDisplay = document.getElementById('mindmap-title-display');
            if (titleDisplay) {
                titleDisplay.textContent = title;
            }
            // Update document title
            document.title = title + ' - Mindmap';
        });
        
        // Listen for save events
        window.stateManager.on('project:saved', () => {
            // Update any save indicators
            const saveIndicator = document.getElementById('save-indicator');
            if (saveIndicator) {
                saveIndicator.textContent = 'Opgeslagen';
                saveIndicator.classList.add('saved');
                setTimeout(() => {
                    saveIndicator.classList.remove('saved');
                }, 2000);
            }
        });
        
        // Listen for dirty state changes
        window.stateManager.on('state:changed', () => {
            // Update save button state if needed
            const saveBtn = document.getElementById('save-btn');
            if (saveBtn && window.stateManager.state.project.isDirty) {
                saveBtn.classList.add('has-changes');
            }
        });
    }
    
    // Expose initialization status
    window.stateManagerReady = new Promise((resolve) => {
        if (window.stateManager) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (window.stateManager) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 10);
        }
    });
    
    console.log('State initialization script loaded');
})();