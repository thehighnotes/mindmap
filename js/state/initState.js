/**
 * State Initialization Module
 * Sets up the new StateManager and integrates it with the existing application
 */

(function() {
    'use strict';

    // Feature flag to enable/disable new state management
    const USE_NEW_STATE_MANAGER = true;

    // Initialize StateManager on DOM ready
    function initializeStateManagement() {
        if (!USE_NEW_STATE_MANAGER) {
            console.log('New StateManager disabled via feature flag');
            return;
        }

        try {
            // Create StateManager instance
            const stateManager = new StateManager();

            // Add middleware
            if (window.loggerMiddleware) {
                stateManager.use(window.loggerMiddleware);
            }
            
            if (window.validationMiddleware) {
                stateManager.use(window.validationMiddleware);
            }
            
            if (window.persistenceMiddleware) {
                stateManager.use(window.persistenceMiddleware);
            }

            // Create adapter for backward compatibility
            const adapter = new StateAdapter(stateManager);

            // Check for auto-saved data
            if (window.loadAutoSave) {
                const autoSaved = window.loadAutoSave();
                if (autoSaved) {
                    console.log('Found auto-saved data');
                    
                    // Ask user if they want to restore
                    const shouldRestore = confirm('Er is een automatische opslag gevonden. Wilt u deze herstellen?');
                    if (shouldRestore) {
                        stateManager.deserialize(autoSaved);
                        console.log('Auto-saved data restored');
                    } else {
                        // Clear auto-save if user declines
                        if (window.clearAutoSave) {
                            window.clearAutoSave();
                        }
                    }
                }
            }

            // Migrate existing global state
            adapter.migrateExistingState();

            // Install global method overrides
            adapter.installGlobalMethods();

            // Set up computed properties
            const nodeCount = stateManager.computed('nodeCount', (state) => {
                return state.nodes.size;
            });

            const connectionCount = stateManager.computed('connectionCount', (state) => {
                return state.connections.size;
            });

            const hasUnsavedChanges = stateManager.computed('hasUnsavedChanges', (state) => {
                return stateManager.isDirty();
            });

            // Subscribe to state changes for debugging
            if (window.Logger && window.Logger.isEnabled('DEBUG')) {
                stateManager.subscribeAll((change) => {
                    window.Logger.debug('State changed:', change);
                });
            }

            // Subscribe to state changes for UI updates
            stateManager.subscribe('ADD_NODE', () => {
                updateUICounters();
            });

            stateManager.subscribe('REMOVE_NODE', () => {
                updateUICounters();
            });

            stateManager.subscribe('ADD_CONNECTION', () => {
                updateUICounters();
            });

            stateManager.subscribe('REMOVE_CONNECTION', () => {
                updateUICounters();
            });

            // Function to update UI counters
            function updateUICounters() {
                // Update node count in UI if element exists
                const nodeCountEl = document.getElementById('nodeCount');
                if (nodeCountEl) {
                    nodeCountEl.textContent = nodeCount.get();
                }

                // Update connection count in UI if element exists
                const connCountEl = document.getElementById('connectionCount');
                if (connCountEl) {
                    connCountEl.textContent = connectionCount.get();
                }

                // Update save indicator if needed
                if (hasUnsavedChanges.get()) {
                    const saveIndicator = document.getElementById('saveIndicator');
                    if (saveIndicator) {
                        saveIndicator.classList.add('unsaved');
                    }
                }
            }

            // Expose StateManager and adapter globally for access
            window.appState = stateManager;
            window.stateAdapter = adapter;

            // Log successful initialization
            console.log('StateManager initialized successfully');
            
            if (window.Logger) {
                window.Logger.info('State Management System', {
                    version: '1.0.0',
                    middleware: ['logger', 'validation', 'persistence'],
                    nodeCount: nodeCount.get(),
                    connectionCount: connectionCount.get()
                });
            }

            // Set up keyboard shortcuts for undo/redo
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    if (e.key === 'z' && !e.shiftKey) {
                        e.preventDefault();
                        if (stateManager.undo()) {
                            console.log('Undo performed');
                            if (window.refreshConnections) window.refreshConnections();
                            if (window.refreshNodes) window.refreshNodes();
                        }
                    } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
                        e.preventDefault();
                        if (stateManager.redo()) {
                            console.log('Redo performed');
                            if (window.refreshConnections) window.refreshConnections();
                            if (window.refreshNodes) window.refreshNodes();
                        }
                    }
                }
            });

            // Set up beforeunload warning for unsaved changes
            window.addEventListener('beforeunload', (e) => {
                if (stateManager.isDirty() && !window.isElectronApp) {
                    e.preventDefault();
                    e.returnValue = 'U heeft onopgeslagen wijzigingen. Weet u zeker dat u wilt afsluiten?';
                }
            });

            // Integration with existing save/load functions
            const originalSaveToJson = window.exportToJson;
            if (originalSaveToJson) {
                window.exportToJson = function() {
                    // Mark state as clean after save
                    stateManager.markClean();
                    
                    // Use adapter to get export data
                    const exportData = adapter.getExportData();
                    
                    // Call original function with adapted data
                    return originalSaveToJson.call(this, exportData);
                };
            }

            const originalImportFromJson = window.importFromJson;
            if (originalImportFromJson) {
                window.importFromJson = function(data) {
                    // Import through adapter
                    adapter.importData(data);
                    
                    // Mark as clean after import
                    stateManager.markClean();
                    
                    // Call original if needed for DOM updates
                    if (originalImportFromJson) {
                        return originalImportFromJson.call(this, data);
                    }
                };
            }

            // Transaction example for batch operations
            window.batchOperation = function(operations) {
                return stateManager.transaction(() => {
                    operations();
                });
            };

            // Performance monitoring
            if (window.performance && window.Logger) {
                setInterval(() => {
                    const metrics = {
                        nodeCount: nodeCount.get(),
                        connectionCount: connectionCount.get(),
                        historySize: stateManager.getState().history.past.length,
                        isDirty: stateManager.isDirty()
                    };
                    
                    window.Logger.debug('State metrics', metrics);
                }, 60000); // Log every minute
            }

        } catch (error) {
            console.error('Failed to initialize StateManager:', error);
            
            if (window.Logger) {
                window.Logger.error('StateManager initialization failed', error);
            }
            
            // Fall back to legacy state management
            console.warn('Falling back to legacy state management');
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeStateManagement);
    } else {
        // DOM already loaded
        initializeStateManagement();
    }

})();