/**
 * ID Generator Module - Replaces broken nextNodeId counter
 * Generates globally unique IDs that won't conflict
 */
const IDGenerator = {
    /**
     * Generate a unique node ID
     * Format: node-{timestamp}-{random}
     * Example: node-1703123456789-x9k2m5
     */
    generateNodeId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `node-${timestamp}-${random}`;
    },
    
    /**
     * Generate a unique connection ID
     * Format: conn-{timestamp}-{random}
     */
    generateConnectionId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `conn-${timestamp}-${random}`;
    },
    
    /**
     * Migrate old ID to new format (for backward compatibility)
     * node-1 -> node-{timestamp}-{random}
     */
    migrateOldId(oldId, type = 'node') {
        // Keep a mapping for consistency during session
        if (!this._migrationMap) {
            this._migrationMap = new Map();
        }
        
        if (this._migrationMap.has(oldId)) {
            return this._migrationMap.get(oldId);
        }
        
        const newId = type === 'node' ? this.generateNodeId() : this.generateConnectionId();
        this._migrationMap.set(oldId, newId);
        return newId;
    },
    
    /**
     * Check if ID is old format
     */
    isOldFormat(id) {
        return /^(node|connection)-\d+$/.test(id);
    }
};

// Make available globally
window.IDGenerator = IDGenerator;