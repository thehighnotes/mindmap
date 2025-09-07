/**
 * storage-utils.js - Reliable localStorage utilities with fallbacks
 */

// Storage state tracking
let storageAvailable = null;
let fallbackStorage = {};

// Initialize localStorage with safe defaults on first load
function initializeStorageDefaults() {
    console.log('🔧 Initializing localStorage with safe defaults...');
    
    const defaults = {
        'mindmap_author': 'Anonymous',
        'mindmap-overlay-gezien': 'false',
        'mindmap_current_draft': JSON.stringify({
            projectName: 'Mindmap Project',
            nodes: [],
            connections: [],
            timestamp: Date.now()
        })
    };
    
    // Try to set defaults - if localStorage isn't available, they go to fallbackStorage
    Object.keys(defaults).forEach(key => {
        try {
            // Only set if not already exists
            const existing = StorageUtils.getItem(key);
            if (!existing) {
                StorageUtils.setItem(key, defaults[key]);
                console.log(`✅ Set default for ${key}`);
            }
        } catch (e) {
            console.warn(`Could not set default for ${key}:`, e);
        }
    });
    
    console.log('✅ Storage defaults initialized');
}

// Storage utilities
const StorageUtils = {
    
    /**
     * Check if localStorage is available
     */
    isLocalStorageAvailable() {
        if (storageAvailable !== null) {
            return storageAvailable;
        }
        
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            storageAvailable = true;
            return true;
        } catch (e) {
            console.warn('localStorage not available:', e);
            storageAvailable = false;
            return false;
        }
    },
    
    /**
     * Safe localStorage getItem with fallbacks
     */
    getItem(key) {
        try {
            if (this.isLocalStorageAvailable()) {
                return localStorage.getItem(key);
            }
        } catch (e) {
            console.warn(`Error reading localStorage key "${key}":`, e);
        }
        
        // Fallback to in-memory storage
        return fallbackStorage[key] || null;
    },
    
    /**
     * Safe localStorage setItem with fallbacks
     */
    setItem(key, value) {
        try {
            if (this.isLocalStorageAvailable()) {
                localStorage.setItem(key, value);
                return true;
            }
        } catch (e) {
            // Handle quota exceeded and other errors
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.warn('localStorage quota exceeded, attempting cleanup');
                this.cleanupOldData();
                
                // Try again after cleanup
                try {
                    localStorage.setItem(key, value);
                    return true;
                } catch (e2) {
                    console.warn('localStorage still not available after cleanup:', e2);
                }
            } else {
                console.warn(`Error writing localStorage key "${key}":`, e);
            }
        }
        
        // Fallback to in-memory storage
        fallbackStorage[key] = value;
        return false; // Indicate localStorage wasn't used
    },
    
    /**
     * Safe localStorage removeItem with fallbacks
     */
    removeItem(key) {
        try {
            if (this.isLocalStorageAvailable()) {
                localStorage.removeItem(key);
            }
        } catch (e) {
            console.warn(`Error removing localStorage key "${key}":`, e);
        }
        
        // Also remove from fallback storage
        delete fallbackStorage[key];
    },
    
    /**
     * Get all keys (localStorage + fallback)
     */
    getAllKeys() {
        const keys = new Set();
        
        try {
            if (this.isLocalStorageAvailable()) {
                for (let i = 0; i < localStorage.length; i++) {
                    keys.add(localStorage.key(i));
                }
            }
        } catch (e) {
            console.warn('Error reading localStorage keys:', e);
        }
        
        // Add fallback storage keys
        Object.keys(fallbackStorage).forEach(key => keys.add(key));
        
        return Array.from(keys);
    },
    
    /**
     * Clean up old data to free space
     */
    cleanupOldData() {
        try {
            if (!this.isLocalStorageAvailable()) return;
            
            const keysToCheck = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('mindmap_')) {
                    keysToCheck.push(key);
                }
            }
            
            // Remove old projects (keep only most recent 10)
            const projectKeys = keysToCheck.filter(key => key.startsWith('mindmap_projects'));
            if (projectKeys.length > 0) {
                try {
                    const projects = JSON.parse(localStorage.getItem('mindmap_projects') || '[]');
                    if (projects.length > 10) {
                        const recentProjects = projects.slice(-10);
                        localStorage.setItem('mindmap_projects', JSON.stringify(recentProjects));
                        console.log('Cleaned up old project metadata');
                    }
                } catch (e) {
                    console.warn('Error cleaning up projects:', e);
                }
            }
            
            // Remove very old drafts (older than 7 days)
            const draftKeys = keysToCheck.filter(key => key.includes('draft'));
            draftKeys.forEach(key => {
                try {
                    const data = JSON.parse(localStorage.getItem(key) || '{}');
                    if (data.timestamp && Date.now() - data.timestamp > 7 * 24 * 60 * 60 * 1000) {
                        localStorage.removeItem(key);
                        console.log(`Removed old draft: ${key}`);
                    }
                } catch (e) {
                    // If we can't parse it, it's probably corrupted, remove it
                    localStorage.removeItem(key);
                    console.log(`Removed corrupted draft: ${key}`);
                }
            });
            
        } catch (e) {
            console.warn('Error during localStorage cleanup:', e);
        }
    },
    
    /**
     * Get storage usage information
     */
    getStorageInfo() {
        let used = 0;
        let available = 0;
        
        try {
            if (this.isLocalStorageAvailable()) {
                // Estimate used space
                for (let key in localStorage) {
                    if (localStorage.hasOwnProperty(key)) {
                        used += localStorage[key].length + key.length;
                    }
                }
                
                // Skip storage size testing - it's causing freezes
                // Just report that we have localStorage available
                available = 5 * 1024; // Assume 5MB available (conservative estimate)
            }
        } catch (e) {
            console.warn('Error getting storage info:', e);
        }
        
        return {
            used: Math.round(used / 1024), // KB
            available: Math.round(available / 1024), // KB
            usingFallback: !this.isLocalStorageAvailable(),
            fallbackKeys: Object.keys(fallbackStorage).length
        };
    },
    
    /**
     * Safe JSON parse with fallback
     */
    parseJSON(data, fallback = null) {
        try {
            return JSON.parse(data);
        } catch (e) {
            console.warn('Error parsing JSON:', e);
            return fallback;
        }
    },
    
    /**
     * Safe JSON stringify with fallback
     */
    stringifyJSON(data, fallback = '{}') {
        try {
            return JSON.stringify(data);
        } catch (e) {
            console.warn('Error stringifying JSON:', e);
            return fallback;
        }
    },
    
    /**
     * Test localStorage functionality
     */
    testStorage() {
        const testKey = '__mindmap_storage_test__';
        const testData = { test: true, timestamp: Date.now() };
        
        try {
            // Test write
            const success = this.setItem(testKey, this.stringifyJSON(testData));
            
            // Test read
            const retrieved = this.parseJSON(this.getItem(testKey));
            
            // Test delete
            this.removeItem(testKey);
            
            const isWorking = success && retrieved && retrieved.test === true;
            
            return {
                working: isWorking,
                localStorage: this.isLocalStorageAvailable(),
                fallback: !this.isLocalStorageAvailable(),
                info: this.getStorageInfo()
            };
        } catch (e) {
            console.error('Storage test failed:', e);
            return {
                working: false,
                localStorage: false,
                fallback: true,
                error: e.message,
                info: this.getStorageInfo()
            };
        }
    }
};

// Export to global scope
window.StorageUtils = StorageUtils;

// Export initialization function for controlled startup
window.initializeStorageDefaults = initializeStorageDefaults;