/**
 * module-loader.js - Module loader voor juiste laadvolgorde van connection modules
 */

// Globale shared state voor alle modules
window.SharedState = {
    isDraggingConnection: false,
    activeConnectionPath: null,
    isUpdatingBranches: false,
    branchingMode: false,
    branchSourceConnection: null,
    branchSourceNode: null,
    branchingPosition: null,
    isCreatingBranch: false
};

const ConnectionModules = {
    modules: {},
    isInitialized: false,
    
    registerModule: function(name, initFunction) {
        this.modules[name] = initFunction;
        console.log(`Connection module ${name} geregistreerd`);
    },
    
    initModules: function() {
        if (this.isInitialized) {
            console.warn('Connection modules zijn al geïnitialiseerd');
            return;
        }
        
        // Initialiseer connection modules in de juiste volgorde
        const loadOrder = [
            'geometry',       // Geometrische berekeningen
            'utils',          // Utility functies
            'core',           // Kern connection functies (connections/core.js)
            'rendering',      // Rendering logica
            'interaction',    // Interactie handlers
            'branches',       // Branch functionaliteit
            'editor'          // Editor functies
            
        ];
        
        loadOrder.forEach(moduleName => {
            if (this.modules[moduleName]) {
                console.log(`Initialiseer module: ${moduleName}`);
                try {
                    this.modules[moduleName]();
                } catch (error) {
                    console.error(`Fout bij initialiseren module ${moduleName}:`, error);
                }
            } else {
                console.warn(`Module ${moduleName} niet gevonden`);
            }
        });
        
        // Controleer na initialisatie of alles beschikbaar is
        this.checkAllFunctionsAvailable();
        
        this.isInitialized = true;
        console.log('Alle modules zijn geïnitialiseerd');
    },
    
    checkAllFunctionsAvailable: function() {
        const requiredFunctions = [
            'createConnection', 'drawConnection', 'updateConnectionPath',
            'startConnectionDrag', 'startBranchDrag', 'refreshConnections',
            'updateBranchStartPoints', 'recalculateControlPoint', 'getBezierPoint',
            'getNodeCenter', 'getNodeEdgePoint', 'findNearestPointOnCurve',
            'refreshConnection', 'deleteConnection', 'showSubtleToast'
        ];
        
        let allAvailable = true;
        requiredFunctions.forEach(funcName => {
            if (typeof window[funcName] !== 'function') {
                console.error(`[CRITICAL] Functie ${funcName} is niet beschikbaar op global scope!`);
                allAvailable = false;
            }
        });
        
        if (allAvailable) {
            console.log('Alle vereiste functies zijn beschikbaar en klaar voor gebruik.');
        }
    },
    
    reset: function() {
        this.modules = {};
        this.isInitialized = false;
    }
};

// Maak globaal beschikbaar
window.ConnectionModules = ConnectionModules;