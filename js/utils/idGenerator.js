/**
 * ID Generator - Guaranteed unique ID generation system
 * Replaces sequential counters with timestamp-based unique IDs
 */

class IdGenerator {
    static #counters = new Map();
    
    /**
     * Generate a unique ID with a prefix
     * Uses timestamp + random component to guarantee uniqueness
     * @param {string} prefix - Prefix for the ID (e.g., 'node', 'conn', 'branch')
     * @returns {string} - Unique ID
     */
    static generate(prefix = 'id') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 9);
        const counter = this.#getAndIncrementCounter(prefix);
        
        return `${prefix}-${timestamp}-${random}-${counter}`;
    }
    
    /**
     * Generate a short unique ID (useful for temporary IDs)
     * @param {string} prefix - Prefix for the ID
     * @returns {string} - Short unique ID
     */
    static generateShort(prefix = 'id') {
        const random = Math.random().toString(36).substring(2, 8);
        return `${prefix}-${random}`;
    }
    
    /**
     * Generate a UUID v4 compliant ID
     * @returns {string} - UUID v4
     */
    static generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    /**
     * Generate ID for specific entity types
     */
    static node() {
        return this.generate('node');
    }
    
    static connection() {
        return this.generate('conn');
    }
    
    static branch() {
        return this.generate('branch');
    }
    
    static version() {
        return this.generate('ver');
    }
    
    /**
     * Get and increment counter for a prefix
     * @private
     */
    static #getAndIncrementCounter(prefix) {
        const current = this.#counters.get(prefix) || 0;
        this.#counters.set(prefix, current + 1);
        return current.toString(36);
    }
    
    /**
     * Validate if an ID follows the expected format
     * @param {string} id - ID to validate
     * @returns {boolean} - True if valid
     */
    static isValid(id) {
        if (typeof id !== 'string') return false;
        
        // Check for basic format: prefix-timestamp-random-counter
        const pattern = /^[a-z]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/i;
        return pattern.test(id);
    }
    
    /**
     * Extract prefix from an ID
     * @param {string} id - ID to parse
     * @returns {string|null} - Prefix or null if invalid
     */
    static getPrefix(id) {
        if (!this.isValid(id)) return null;
        return id.split('-')[0];
    }
    
    /**
     * Check if ID is for a specific entity type
     */
    static isNodeId(id) {
        return this.getPrefix(id) === 'node';
    }
    
    static isConnectionId(id) {
        return this.getPrefix(id) === 'conn';
    }
    
    static isBranchId(id) {
        return this.getPrefix(id) === 'branch';
    }
    
    /**
     * Reset counters (useful for testing)
     */
    static reset() {
        this.#counters.clear();
    }
}

/**
 * Migration helper to convert old sequential IDs to new format
 */
class IdMigrator {
    /**
     * Migrate old ID to new format
     * @param {string} oldId - Old ID format (e.g., 'node-1')
     * @param {string} type - Entity type
     * @returns {string} - New ID or original if already new format
     */
    static migrate(oldId, type = 'node') {
        if (!oldId) return IdGenerator.generate(type);
        
        // Check if already in new format
        if (IdGenerator.isValid(oldId)) {
            return oldId;
        }
        
        // Old format: prefix-number
        const oldPattern = /^([a-z]+)-(\d+)$/i;
        const match = oldId.match(oldPattern);
        
        if (match) {
            const [, prefix, number] = match;
            // Create a deterministic new ID based on old ID
            const hash = this.#hashString(oldId);
            return `${prefix}-migrated-${hash}-${number}`;
        }
        
        // If format is unrecognized, generate new ID
        return IdGenerator.generate(type);
    }
    
    /**
     * Simple hash function for deterministic migration
     * @private
     */
    static #hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }
    
    /**
     * Migrate a collection of entities
     * @param {Array} entities - Array of entities with IDs
     * @param {string} idField - Name of the ID field
     * @param {string} type - Entity type
     * @returns {Array} - Entities with migrated IDs
     */
    static migrateCollection(entities, idField = 'id', type = 'node') {
        const idMap = new Map();
        
        return entities.map(entity => {
            const oldId = entity[idField];
            let newId = idMap.get(oldId);
            
            if (!newId) {
                newId = this.migrate(oldId, type);
                idMap.set(oldId, newId);
            }
            
            return {
                ...entity,
                [idField]: newId
            };
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { IdGenerator, IdMigrator };
}

// Make available globally for gradual migration
window.IdGenerator = IdGenerator;
window.IdMigrator = IdMigrator;