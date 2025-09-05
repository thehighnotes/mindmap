/**
 * Initialization Module - Sets up new utilities with proper configuration
 * Ensures backward compatibility and gradual migration
 */

(function() {
    'use strict';
    
    // Configuration flags - NEW FEATURES ON BY DEFAULT
    const config = {
        enableNewFeatures: true, // Modern features enabled by default
        logLevel: 'INFO',
        enablePerformanceMonitoring: true,
        enableEventTracking: true,
        maxUndoHistory: 50,
        cacheEnabled: true
    };
    
    /**
     * Initialize utilities on DOM ready
     */
    function initializeUtilities() {
        // Parse URL parameters for configuration
        const urlParams = new URLSearchParams(window.location.search);
        
        // Check for development mode
        const isDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1' ||
                             urlParams.get('dev') === 'true';
        
        // Initialize Logger
        if (window.Logger) {
            Logger.init({
                level: isDevelopment ? LogLevel.DEBUG : LogLevel.INFO,
                storeHistory: true,
                maxHistorySize: 100
            });
            Logger.info('Mindmap Utilities Initialized');
        }
        
        // Set compatibility flags - NEW SYSTEM IS DEFAULT
        window.useNewIdSystem = true; // Always use new ID system
        window.isLoadingFile = false;
        window.forceMigrationToNewFormat = false;
        window.currentFileFormat = 'mindmap2'; // Default to new format
        
        // Initialize DOM Cache
        if (window.domCache) {
            Logger.debug('DOM Cache initialized');
        }
        
        // Initialize Event Bus
        if (window.globalEventBus) {
            setupEventListeners();
            Logger.debug('Event Bus initialized');
        }
        
        // Initialize Performance Monitoring
        if (config.enablePerformanceMonitoring && window.PerformanceMonitor) {
            setupPerformanceMonitoring();
        }
        
        // Add global error handler
        window.addEventListener('error', handleGlobalError);
        
        // Log initialization complete
        if (window.Logger) {
            const mode = window.CompatibilityManager ? 
                CompatibilityManager.getCurrentMode() : 'unknown';
            Logger.info(`Utilities initialized in ${mode} mode`);
        }
    }
    
    /**
     * Setup event listeners for the Event Bus
     */
    function setupEventListeners() {
        if (!window.globalEventBus || !window.Events) return;
        
        // Log important events in development
        if (window.Logger && Logger.getLevel() >= LogLevel.DEBUG) {
            globalEventBus.on(Events.NODE_CREATED, (data) => {
                Logger.debug('Node created:', data);
            });
            
            globalEventBus.on(Events.CONNECTION_CREATED, (data) => {
                Logger.debug('Connection created:', data);
            });
            
            globalEventBus.on(Events.STATE_SAVED, () => {
                Logger.debug('State saved');
            });
            
            globalEventBus.on(Events.ERROR_OCCURRED, (error) => {
                Logger.error('Error occurred:', error);
            });
        }
    }
    
    /**
     * Setup performance monitoring
     */
    function setupPerformanceMonitoring() {
        if (!window.PerformanceMonitor) return;
        
        // Monitor critical functions
        const criticalFunctions = [
            'createNode',
            'deleteNode',
            'createConnection',
            'deleteConnection',
            'refreshConnections',
            'updateMinimap',
            'saveStateForUndo'
        ];
        
        criticalFunctions.forEach(fnName => {
            if (window[fnName] && typeof window[fnName] === 'function') {
                const originalFn = window[fnName];
                window[fnName] = function(...args) {
                    return PerformanceMonitor.measure(fnName, () => {
                        return originalFn.apply(this, args);
                    });
                };
            }
        });
        
        Logger.info('Performance monitoring enabled for critical functions');
    }
    
    /**
     * Global error handler
     */
    function handleGlobalError(event) {
        if (window.Logger) {
            Logger.error('Global error:', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        }
        
        // Emit error event
        if (window.globalEventBus && window.Events) {
            globalEventBus.emit(Events.ERROR_OCCURRED, {
                message: event.message,
                error: event.error
            });
        }
    }
    
    /**
     * Apply performance optimizations
     */
    function applyOptimizations() {
        // Debounce expensive operations
        if (window.debounce) {
            // Debounce minimap updates
            if (window.updateMinimap && typeof window.updateMinimap === 'function') {
                const originalUpdateMinimap = window.updateMinimap;
                window.updateMinimap = debounce(originalUpdateMinimap, 100, {
                    leading: false,
                    trailing: true
                });
                Logger.debug('Minimap updates debounced');
            }
            
            // Debounce connection refresh
            if (window.refreshConnections && typeof window.refreshConnections === 'function') {
                const originalRefreshConnections = window.refreshConnections;
                window.refreshConnections = debounce(originalRefreshConnections, 50, {
                    leading: true,
                    trailing: true,
                    maxWait: 200
                });
                Logger.debug('Connection refresh debounced');
            }
        }
        
        // Use RAF throttling for drag operations
        if (window.rafThrottle) {
            // This would be applied to specific drag handlers
            Logger.debug('RAF throttling available for animations');
        }
    }
    
    /**
     * Provide migration utilities
     */
    window.MigrationUtils = {
        /**
         * Enable new features globally
         */
        enableNewFeatures: function() {
            window.useNewIdSystem = true;
            window.forceMigrationToNewFormat = true;
            Logger.info('New features enabled');
            showToast('Nieuwe functies ingeschakeld');
        },
        
        /**
         * Migrate current mindmap to new format
         */
        migrateCurrentMindmap: function() {
            if (!window.CompatibilityManager || !window.IdMigrator) {
                Logger.warn('Migration tools not available');
                return;
            }
            
            const data = {
                nodes: window.nodes || [],
                connections: window.connections || []
            };
            
            const migrated = CompatibilityManager.migrateToNewFormat(data);
            Logger.info('Mindmap migrated to new format');
            
            // Reload with new data
            if (window.loadMindmapData) {
                loadMindmapData(migrated);
            }
        },
        
        /**
         * Get current system info
         */
        getSystemInfo: function() {
            return {
                mode: window.CompatibilityManager ? 
                    CompatibilityManager.getCurrentMode() : 'unknown',
                newIdSystem: window.useNewIdSystem,
                logLevel: window.Logger ? Logger.getLevel() : 'unknown',
                cacheSize: window.domCache ? 
                    domCache.getStats().cacheSize : 0,
                eventCount: window.globalEventBus ? 
                    globalEventBus.getEvents().length : 0
            };
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeUtilities();
            setTimeout(applyOptimizations, 100); // Apply after other scripts load
        });
    } else {
        initializeUtilities();
        setTimeout(applyOptimizations, 100);
    }
})();