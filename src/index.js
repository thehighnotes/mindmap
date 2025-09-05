/**
 * Main Entry Point - Modern ES6 Module System
 * Mindmap Application with ES6+ features
 */

// Polyfills
import './polyfills';

// Core modules
import { StateManager } from './state/StateManager';
import { StateAdapter } from './state/StateAdapter';

// Utils
import { Logger } from './utils/Logger';
import { DOMSanitizer } from './utils/DOMSanitizer';
import { IdGenerator } from './utils/IdGenerator';
import { EventBus } from './utils/EventBus';
import { DOMCache } from './utils/DOMCache';
import * as Performance from './utils/Performance';
import { CompatibilityManager } from './utils/CompatibilityManager';

// Rendering
import { RenderQueue } from './rendering/RenderQueue';
import { VirtualConnectionRenderer } from './rendering/VirtualConnectionRenderer';
import { OptimizedRenderer } from './rendering/OptimizedRenderer';
import { PerformanceMonitor } from './rendering/PerformanceMonitor';

// Application modules
import { NodeManager } from './modules/NodeManager';
import { ConnectionManager } from './modules/ConnectionManager';
import { UIController } from './modules/UIController';
import { ExportManager } from './modules/ExportManager';
import { StorageManager } from './modules/StorageManager';

// Phase 6: UX Components
import { KeyboardNavigation } from './a11y/KeyboardNavigation';
import { SafeExecutor } from './utils/SafeExecutor';
import { HelpSystem, helpSystem } from './ui/HelpSystem';
import { NotificationSystem, notifications } from './ui/NotificationSystem';
import { OnboardingTutorial } from './ui/OnboardingTutorial';

// Styles
import '../css/styles.css';

/**
 * Main Application Class
 */
class MindmapApplication {
    #stateManager = null;
    #nodeManager = null;
    #connectionManager = null;
    #uiController = null;
    #exportManager = null;
    #storageManager = null;
    #renderQueue = null;
    #performanceMonitor = null;
    #keyboardNavigation = null;
    #helpSystem = null;
    #isInitialized = false;

    constructor(config = {}) {
        this.config = {
            enablePerformanceMonitoring: true,
            enableAutoSave: true,
            enableOptimizedRendering: true,
            logLevel: 'INFO',
            ...config
        };
    }

    /**
     * Initialize the application
     */
    async init() {
        if (this.#isInitialized) {
            Logger.warn('Application already initialized');
            return;
        }

        try {
            Logger.info('Initializing Mindmap Application...');

            // Initialize utilities
            await this.#initializeUtilities();

            // Initialize state management
            await this.#initializeState();

            // Initialize rendering system
            await this.#initializeRendering();

            // Initialize application modules
            await this.#initializeModules();

            // Initialize UX components (Phase 6)
            await this.#initializeUXComponents();

            // Setup event listeners
            this.#setupEventListeners();

            // Load saved data if exists
            await this.#loadSavedData();

            // Mark as initialized
            this.#isInitialized = true;

            Logger.info('Application initialized successfully');
            
            // Emit ready event
            EventBus.emit('app:ready', { timestamp: Date.now() });

        } catch (error) {
            Logger.error('Failed to initialize application', error);
            this.#handleInitError(error);
        }
    }

    /**
     * Initialize utility modules
     */
    async #initializeUtilities() {
        // Set up logger
        Logger.setLevel(this.config.logLevel);
        Logger.info('Utilities initialization started');

        // Initialize DOM cache
        DOMCache.init();

        // Initialize event bus
        EventBus.init();

        // Check compatibility
        const isCompatible = await CompatibilityManager.checkCompatibility();
        if (!isCompatible) {
            throw new Error('Browser compatibility check failed');
        }
    }

    /**
     * Initialize state management
     */
    async #initializeState() {
        Logger.info('Initializing state management');

        // Create state manager
        this.#stateManager = new StateManager();

        // Add middleware
        const { loggerMiddleware, validationMiddleware, persistenceMiddleware } = 
            await import('./state/middleware');
        
        this.#stateManager.use(loggerMiddleware);
        this.#stateManager.use(validationMiddleware);
        
        if (this.config.enableAutoSave) {
            this.#stateManager.use(persistenceMiddleware);
        }

        // Create adapter for backward compatibility
        const adapter = new StateAdapter(this.#stateManager);
        adapter.installGlobalMethods();

        // Expose globally for compatibility
        window.appState = this.#stateManager;
        window.stateAdapter = adapter;
    }

    /**
     * Initialize rendering system
     */
    async #initializeRendering() {
        if (!this.config.enableOptimizedRendering) {
            Logger.info('Optimized rendering disabled');
            return;
        }

        Logger.info('Initializing rendering system');

        // Create render queue
        this.#renderQueue = new RenderQueue();

        // Create optimized renderer
        const canvas = document.getElementById('canvas');
        const renderer = new OptimizedRenderer({
            container: canvas,
            renderQueue: this.#renderQueue,
            enableVirtualDOM: true,
            enableBatching: true
        });

        // Initialize performance monitor
        if (this.config.enablePerformanceMonitoring) {
            this.#performanceMonitor = new PerformanceMonitor();
            this.#performanceMonitor.start();

            // Subscribe to warnings
            this.#performanceMonitor.subscribe((warning) => {
                Logger.warn('Performance issue', warning);
                this.#handlePerformanceWarning(warning);
            });
        }

        window.optimizedRenderer = renderer;
    }

    /**
     * Initialize application modules
     */
    async #initializeModules() {
        Logger.info('Initializing application modules');

        // Create managers
        this.#nodeManager = new NodeManager(this.#stateManager, this.#renderQueue);
        this.#connectionManager = new ConnectionManager(this.#stateManager, this.#renderQueue);
        this.#uiController = new UIController(this.#stateManager);
        this.#exportManager = new ExportManager(this.#stateManager);
        this.#storageManager = new StorageManager(this.#stateManager);

        // Initialize each module
        await Promise.all([
            this.#nodeManager.init(),
            this.#connectionManager.init(),
            this.#uiController.init(),
            this.#exportManager.init(),
            this.#storageManager.init()
        ]);
    }

    /**
     * Initialize UX components (Phase 6)
     */
    async #initializeUXComponents() {
        Logger.info('Initializing UX components');

        try {
            // Initialize KeyboardNavigation
            this.#keyboardNavigation = new KeyboardNavigation(document.body);
            
            // Register all UI elements for keyboard navigation
            this.#registerUIElementsForKeyboard();
            
            // Setup tooltips for all UI elements
            this.#setupTooltips();
            
            // Initialize help system (use global instance)
            this.#helpSystem = helpSystem;
            
            // Setup onboarding for first-time users
            if (OnboardingTutorial.shouldShowOnboarding()) {
                // Delay onboarding to ensure app is fully loaded
                setTimeout(() => {
                    OnboardingTutorial.start({
                        onComplete: () => {
                            notifications.success('Welkom! U bent klaar om te starten met mindmappen.');
                        },
                        onSkip: () => {
                            notifications.info('U kunt de rondleiding altijd starten via Help → Rondleiding');
                        }
                    });
                }, 2000);
            }
            
            // Wrap critical operations with SafeExecutor
            this.#wrapCriticalOperations();
            
            // Expose globally for compatibility
            window.keyboardNavigation = this.#keyboardNavigation;
            window.helpSystem = this.#helpSystem;
            window.notifications = notifications;
            window.SafeExecutor = SafeExecutor;
            
            Logger.info('UX components initialized successfully');
            
        } catch (error) {
            Logger.error('Failed to initialize UX components', error);
            // Don't fail the entire app if UX components fail
            notifications.error('Sommige gebruikersfuncties zijn mogelijk niet beschikbaar');
        }
    }

    /**
     * Register UI elements for keyboard navigation
     */
    #registerUIElementsForKeyboard() {
        // Register main toolbar buttons
        const toolbarButtons = document.querySelectorAll('.toolbar button, .header button');
        toolbarButtons.forEach((btn, index) => {
            if (btn.id) {
                this.#keyboardNavigation.registerElement(btn.id, btn, {
                    label: btn.title || btn.textContent || `Button ${index + 1}`,
                    role: 'button',
                    group: 'toolbar',
                    order: index
                });
            }
        });
        
        // Register zoom controls
        const zoomControls = document.querySelectorAll('.zoom-controls button');
        zoomControls.forEach((btn, index) => {
            if (btn.id) {
                this.#keyboardNavigation.registerElement(btn.id, btn, {
                    label: btn.title || btn.textContent || `Zoom ${index + 1}`,
                    role: 'button',
                    group: 'zoom',
                    order: index
                });
            }
        });
        
        // Register canvas for main workspace
        const canvas = document.getElementById('canvas');
        if (canvas) {
            this.#keyboardNavigation.registerElement('canvas', canvas, {
                label: 'Mindmap werkruimte',
                role: 'application',
                group: 'main',
                order: 0,
                onActivate: () => {
                    // Focus canvas for creation
                    canvas.focus();
                }
            });
        }
    }

    /**
     * Setup tooltips for UI elements
     */
    #setupTooltips() {
        // Toolbar tooltips
        helpSystem.registerTooltip('[title]', null, {
            content: (el) => el.getAttribute('title'),
            position: 'bottom'
        });
        
        // Custom tooltips for complex elements
        helpSystem.registerTooltip('.version-info-btn', 
            'Klik om te zien wat er nieuw is in deze versie', 
            { position: 'bottom' }
        );
        
        helpSystem.registerTooltip('.mindmap-title', 
            'Klik om de titel van uw mindmap te bewerken', 
            { position: 'bottom' }
        );
        
        helpSystem.registerTooltip('#canvas', 
            'Dubbelklik om een nieuw knooppunt te maken. Gebruik Spatie + sleep om te pannen.', 
            { position: 'center', delay: 1000 }
        );
    }

    /**
     * Wrap critical operations with SafeExecutor
     */
    #wrapCriticalOperations() {
        // Wrap save operations
        const originalSave = this.save.bind(this);
        this.save = SafeExecutor.wrap(originalSave, {
            userMessage: 'Fout bij opslaan van mindmap',
            fallback: false,
            critical: false,
            retry: true,
            retryAttempts: 2
        });
        
        // Wrap load operations  
        const originalLoad = this.load.bind(this);
        this.load = SafeExecutor.wrap(originalLoad, {
            userMessage: 'Fout bij laden van mindmap', 
            fallback: false,
            critical: true, // Critical as it could lose work
            retry: true,
            retryAttempts: 2
        });
        
        // Wrap export operations
        const originalExport = this.export.bind(this);
        this.export = SafeExecutor.wrap(originalExport, {
            userMessage: 'Fout bij exporteren van mindmap',
            fallback: null,
            critical: false,
            retry: true,
            retryAttempts: 1
        });
    }

    /**
     * Setup global event listeners
     */
    #setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', this.#handleKeyDown.bind(this));
        
        // Window resize
        window.addEventListener('resize', Performance.debounce(() => {
            EventBus.emit('window:resize', {
                width: window.innerWidth,
                height: window.innerHeight
            });
        }, 250));

        // Before unload
        window.addEventListener('beforeunload', (e) => {
            if (this.#stateManager?.isDirty()) {
                e.preventDefault();
                e.returnValue = 'U heeft onopgeslagen wijzigingen. Weet u zeker dat u wilt afsluiten?';
            }
        });

        // Error handling
        window.addEventListener('error', this.#handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.#handleUnhandledRejection.bind(this));
    }

    /**
     * Handle keyboard shortcuts
     */
    #handleKeyDown(event) {
        const { ctrlKey, metaKey, shiftKey, key } = event;
        const cmd = ctrlKey || metaKey;

        // Undo/Redo
        if (cmd && key === 'z' && !shiftKey) {
            event.preventDefault();
            this.undo();
        } else if (cmd && (key === 'y' || (key === 'z' && shiftKey))) {
            event.preventDefault();
            this.redo();
        }
        // Save
        else if (cmd && key === 's') {
            event.preventDefault();
            this.save();
        }
        // Export
        else if (cmd && key === 'e') {
            event.preventDefault();
            this.export();
        }
        // New node
        else if (cmd && key === 'n') {
            event.preventDefault();
            this.createNode();
        }
    }

    /**
     * Load saved data
     */
    async #loadSavedData() {
        try {
            const hasAutoSave = await this.#storageManager.hasAutoSave();
            
            if (hasAutoSave) {
                const shouldRestore = confirm('Er is een automatische opslag gevonden. Wilt u deze herstellen?');
                
                if (shouldRestore) {
                    await this.#storageManager.loadAutoSave();
                    Logger.info('Auto-save restored successfully');
                }
            }
        } catch (error) {
            Logger.error('Failed to load saved data', error);
        }
    }

    /**
     * Handle initialization errors
     */
    #handleInitError(error) {
        console.error('Initialization failed:', error);
        
        // Show user-friendly error message
        const errorContainer = document.createElement('div');
        errorContainer.className = 'init-error';
        errorContainer.innerHTML = DOMSanitizer.sanitizeHTML(`
            <h2>Initialisatie Fout</h2>
            <p>De applicatie kon niet worden gestart.</p>
            <p>Fout: ${error.message}</p>
            <button onclick="location.reload()">Probeer Opnieuw</button>
        `);
        
        document.body.appendChild(errorContainer);
    }

    /**
     * Handle performance warnings
     */
    #handlePerformanceWarning(warning) {
        // Adapt rendering strategy based on warning
        if (warning.type === 'low-fps' && this.#renderQueue) {
            // Increase batch size to reduce render calls
            this.#renderQueue.updateConfig({ batchSize: 100 });
        }
        
        // Notify user if critical
        if (warning.severity === 'critical') {
            EventBus.emit('ui:showNotification', {
                type: 'warning',
                message: 'Performance problemen gedetecteerd. Overweeg om het aantal elementen te verminderen.'
            });
        }
    }

    /**
     * Handle global errors
     */
    #handleGlobalError(event) {
        Logger.error('Global error', {
            message: event.message,
            filename: event.filename,
            line: event.lineno,
            column: event.colno,
            error: event.error
        });
    }

    /**
     * Handle unhandled promise rejections
     */
    #handleUnhandledRejection(event) {
        Logger.error('Unhandled promise rejection', {
            reason: event.reason,
            promise: event.promise
        });
    }

    // ==================== Public API ====================

    /**
     * Create a new node
     */
    async createNode(options = {}) {
        return this.#nodeManager.create(options);
    }

    /**
     * Create a new connection
     */
    async createConnection(fromId, toId, options = {}) {
        return this.#connectionManager.create(fromId, toId, options);
    }

    /**
     * Save the mindmap
     */
    async save() {
        return this.#storageManager.save();
    }

    /**
     * Load a mindmap
     */
    async load(file) {
        return this.#storageManager.load(file);
    }

    /**
     * Export the mindmap
     */
    async export(format = 'json') {
        return this.#exportManager.export(format);
    }

    /**
     * Undo last action
     */
    undo() {
        return this.#stateManager.undo();
    }

    /**
     * Redo last undone action
     */
    redo() {
        return this.#stateManager.redo();
    }

    /**
     * Get performance report
     */
    getPerformanceReport() {
        return this.#performanceMonitor?.getReport();
    }

    /**
     * Destroy the application
     */
    async destroy() {
        Logger.info('Destroying application');

        // Stop monitoring
        this.#performanceMonitor?.stop();

        // Save state if dirty
        if (this.#stateManager?.isDirty()) {
            await this.#storageManager.save();
        }

        // Cleanup modules
        await Promise.all([
            this.#nodeManager?.destroy(),
            this.#connectionManager?.destroy(),
            this.#uiController?.destroy(),
            this.#exportManager?.destroy(),
            this.#storageManager?.destroy()
        ]);

        // Clear state
        this.#stateManager = null;
        this.#isInitialized = false;

        Logger.info('Application destroyed');
    }
}

// ==================== Application Bootstrap ====================

// Create and initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Create global application instance
    window.mindmapApp = new MindmapApplication({
        enablePerformanceMonitoring: true,
        enableAutoSave: true,
        enableOptimizedRendering: true,
        logLevel: process.env.NODE_ENV === 'development' ? 'DEBUG' : 'INFO'
    });

    // Initialize application
    try {
        await window.mindmapApp.init();
        console.log('✅ Mindmap application ready');
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
    }
});

// Export for module usage
export default MindmapApplication;