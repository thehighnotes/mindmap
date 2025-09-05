/**
 * Compatibility Layer - Ensures backwards compatibility with existing mindmap files
 * Handles migration between old and new ID formats while preserving functionality
 */

class CompatibilityManager {
    static #isLegacyFormat = false;
    static #idMapping = new Map();
    static #currentFileName = null;
    static #pendingMigration = null;
    
    /**
     * Check if file is legacy format based on extension
     * @param {string} filename - File name to check
     * @returns {boolean} - True if legacy format
     */
    static isLegacyFile(filename) {
        if (!filename) return false;
        const ext = filename.toLowerCase();
        return ext.endsWith('.mindmap') || ext.endsWith('.json');
    }
    
    /**
     * Check if file is modern format
     * @param {string} filename - File name to check
     * @returns {boolean} - True if modern format
     */
    static isModernFile(filename) {
        if (!filename) return false;
        return filename.toLowerCase().endsWith('.mindmap2');
    }
    
    /**
     * Set current file name for tracking
     * @param {string} filename - Current file name
     */
    static setCurrentFile(filename) {
        this.#currentFileName = filename;
        window.currentFileFormat = this.isModernFile(filename) ? 'mindmap2' : 'mindmap';
    }
    
    /**
     * Check if data is in legacy format
     * @param {Object} data - Mindmap data to check
     * @returns {boolean} - True if legacy format
     */
    static isLegacyFormat(data) {
        if (!data) return false;
        
        // Check for format version marker (new in mindmap2)
        if (data.formatVersion === 'mindmap2') {
            return false;
        }
        
        // Check nodes for old ID format (node-123)
        if (data.nodes && data.nodes.length > 0) {
            const firstNode = data.nodes[0];
            if (firstNode.id && /^node-\d+$/.test(firstNode.id)) {
                return true;
            }
        }
        
        // Check connections for old ID format
        if (data.connections && data.connections.length > 0) {
            const firstConn = data.connections[0];
            if (firstConn.id && /^connection-\d+$/.test(firstConn.id)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Prepare data for loading (maintain compatibility)
     * @param {Object} data - Mindmap data to prepare
     * @returns {Object} - Prepared data
     */
    static prepareDataForLoading(data) {
        if (!data) return data;
        
        // Detect format
        this.#isLegacyFormat = this.isLegacyFormat(data);
        
        if (this.#isLegacyFormat) {
            // Set flag to use old ID generation during load
            window.isLoadingFile = true;
            window.useNewIdSystem = false;
            
            if (window.Logger) {
                Logger.info('Loading legacy format mindmap file');
            }
        } else {
            window.isLoadingFile = false;
            window.useNewIdSystem = true;
            
            if (window.Logger) {
                Logger.info('Loading new format mindmap file');
            }
        }
        
        // Ensure all required fields exist
        data.nodes = data.nodes || [];
        data.connections = data.connections || [];
        
        // Fix any missing fields in nodes
        data.nodes = data.nodes.map(node => ({
            id: node.id,
            title: node.title || 'Untitled',
            content: node.content || '',
            x: node.x || 0,
            y: node.y || 0,
            color: node.color || '#4CAF50',
            shape: node.shape || 'rectangle',
            isRoot: node.isRoot || false,
            ...node // Preserve any additional fields
        }));
        
        // Fix any missing fields in connections
        data.connections = data.connections.map(conn => ({
            id: conn.id,
            from: conn.from,
            to: conn.to,
            type: conn.type || 'straight',
            label: conn.label || '',
            style: conn.style || 'solid',
            color: conn.color || '#666',
            ...conn // Preserve any additional fields
        }));
        
        return data;
    }
    
    /**
     * Prepare data for saving (maintain format consistency)
     * @param {Object} data - Mindmap data to prepare
     * @returns {Object} - Prepared data for saving
     */
    static prepareDataForSaving(data) {
        if (!data) return data;
        
        // If we're working with a legacy file, maintain its format
        if (this.#isLegacyFormat && !window.forceMigrationToNewFormat) {
            // Keep old format
            if (window.Logger) {
                Logger.debug('Saving in legacy format to maintain compatibility');
            }
            return data;
        }
        
        // For new files or migrated files, use new format
        return data;
    }
    
    /**
     * Migrate IDs from old to new format (optional)
     * @param {Object} data - Data to migrate
     * @returns {Object} - Migrated data
     */
    static migrateToNewFormat(data) {
        if (!data || !window.IdMigrator) return data;
        
        const migratedData = { ...data };
        this.#idMapping.clear();
        
        // Migrate node IDs
        if (migratedData.nodes) {
            migratedData.nodes = migratedData.nodes.map(node => {
                const oldId = node.id;
                const newId = IdMigrator.migrate(oldId, 'node');
                this.#idMapping.set(oldId, newId);
                
                return {
                    ...node,
                    id: newId
                };
            });
        }
        
        // Migrate connection IDs and references
        if (migratedData.connections) {
            migratedData.connections = migratedData.connections.map(conn => {
                const newId = IdMigrator.migrate(conn.id, 'connection');
                
                return {
                    ...conn,
                    id: newId,
                    from: this.#idMapping.get(conn.from) || conn.from,
                    to: this.#idMapping.get(conn.to) || conn.to
                };
            });
        }
        
        if (window.Logger) {
            Logger.info('Migrated mindmap to new ID format');
        }
        
        return migratedData;
    }
    
    /**
     * Reset compatibility state after loading
     */
    static resetLoadingState() {
        window.isLoadingFile = false;
        // Don't change useNewIdSystem here - let user preference persist
    }
    
    /**
     * Get current format mode
     * @returns {string} - 'legacy' or 'modern'
     */
    static getCurrentMode() {
        return this.#isLegacyFormat ? 'legacy' : 'modern';
    }
    
    /**
     * Enable gradual migration features
     */
    static enableGradualMigration() {
        // Add migration notice to UI if needed
        if (this.#isLegacyFormat && window.Logger) {
            Logger.info('Legacy file loaded. New features will use improved ID system.');
        }
    }
    
    /**
     * Show migration dialog to user
     * @param {Function} onAccept - Callback when user accepts
     * @param {Function} onDecline - Callback when user declines
     */
    static showMigrationDialog(onAccept, onDecline) {
        const modal = document.getElementById('migrationModal');
        if (!modal) {
            Logger.warn('Migration modal not found');
            return;
        }
        
        // Store callbacks
        window.acceptMigration = () => {
            modal.style.display = 'none';
            if (onAccept) onAccept();
        };
        
        window.declineMigration = () => {
            modal.style.display = 'none';
            if (onDecline) {
                onDecline();
            } else {
                // Default decline action - show web version message
                alert('Voor oudere mindmap bestanden kunt u de web versie gebruiken op: https://mindmap-web.example.com');
                if (window.Logger) {
                    Logger.info('User declined migration, referred to web version');
                }
            }
        };
        
        // Show modal
        modal.style.display = 'flex';
    }
    
    /**
     * Perform migration to modern format
     * @param {Object} data - Data to migrate
     * @returns {Object} - Migrated data with modern format
     */
    static migrateToModernFormat(data) {
        const migratedData = this.migrateToNewFormat(data);
        
        // Add format version marker
        migratedData.formatVersion = 'mindmap2';
        
        // Ensure all nodes have modern IDs
        if (migratedData.nodes) {
            migratedData.nodes = migratedData.nodes.map(node => {
                // If still has old format ID, generate new one
                if (/^node-\d+$/.test(node.id)) {
                    const newId = window.IdGenerator ? IdGenerator.node() : node.id;
                    this.#idMapping.set(node.id, newId);
                    return { ...node, id: newId };
                }
                return node;
            });
        }
        
        // Update connection references
        if (migratedData.connections) {
            migratedData.connections = migratedData.connections.map(conn => {
                return {
                    ...conn,
                    from: this.#idMapping.get(conn.from) || conn.from,
                    to: this.#idMapping.get(conn.to) || conn.to
                };
            });
        }
        
        return migratedData;
    }
}

/**
 * Initialize compatibility settings on load
 */
document.addEventListener('DOMContentLoaded', () => {
    // Set default to not break existing functionality
    window.useNewIdSystem = false; // Conservative default
    window.isLoadingFile = false;
    window.forceMigrationToNewFormat = false;
    
    // Allow opt-in to new features via settings or flag
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('newFeatures') === 'true') {
        window.useNewIdSystem = true;
        if (window.Logger) {
            Logger.info('New features enabled via URL parameter');
        }
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CompatibilityManager };
}

// Make available globally
window.CompatibilityManager = CompatibilityManager;