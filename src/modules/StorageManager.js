/**
 * StorageManager - Modern async file operations with ES6+
 * Handles saving, loading, and auto-save functionality
 */

import { Logger } from '../utils/Logger';

export class StorageManager {
    #stateManager = null;
    #autoSaveInterval = null;
    #autoSaveDelay = 30000; // 30 seconds
    #lastSaveTime = null;
    #isSaving = false;
    #storageAdapter = null;

    constructor(stateManager) {
        this.#stateManager = stateManager;
        this.#initializeStorageAdapter();
    }

    /**
     * Initialize storage adapter based on environment
     */
    async #initializeStorageAdapter() {
        if (window.showSaveFilePicker) {
            // Use File System Access API if available
            const { FileSystemAdapter } = await import('./storage/FileSystemAdapter');
            this.#storageAdapter = new FileSystemAdapter();
        } else if (window.require && window.require('electron')) {
            // Use Electron file system
            const { ElectronAdapter } = await import('./storage/ElectronAdapter');
            this.#storageAdapter = new ElectronAdapter();
        } else {
            // Fallback to browser storage
            const { BrowserAdapter } = await import('./storage/BrowserAdapter');
            this.#storageAdapter = new BrowserAdapter();
        }
    }

    /**
     * Initialize storage manager
     */
    async init() {
        Logger.info('Initializing StorageManager');

        // Setup auto-save if enabled
        const preferences = this.#stateManager.getPreferences();
        if (preferences.autoSave) {
            this.startAutoSave();
        }

        // Subscribe to state changes
        this.#stateManager.subscribe('*', () => {
            this.#onStateChange();
        });

        return true;
    }

    /**
     * Save mindmap to file
     */
    async save(filename = null) {
        if (this.#isSaving) {
            Logger.warn('Save already in progress');
            return false;
        }

        this.#isSaving = true;

        try {
            Logger.info('Saving mindmap...');

            // Get current state
            const data = this.#stateManager.serialize();
            
            // Add metadata
            const saveData = {
                ...data,
                metadata: {
                    ...data.metadata,
                    savedAt: new Date().toISOString(),
                    version: '1.0.0',
                    format: 'mindmap2'
                }
            };

            // Convert to JSON
            const json = JSON.stringify(saveData, null, 2);

            // Save using adapter
            const result = await this.#storageAdapter.save(json, filename);

            if (result.success) {
                this.#lastSaveTime = Date.now();
                this.#stateManager.markClean();
                Logger.info(`Mindmap saved successfully to ${result.filename}`);
                
                // Emit save event
                this.#emitEvent('storage:saved', { 
                    filename: result.filename,
                    size: json.length 
                });

                return true;
            } else {
                throw new Error(result.error || 'Save failed');
            }

        } catch (error) {
            Logger.error('Failed to save mindmap', error);
            this.#emitEvent('storage:error', { 
                operation: 'save',
                error: error.message 
            });
            return false;
        } finally {
            this.#isSaving = false;
        }
    }

    /**
     * Load mindmap from file
     */
    async load(file = null) {
        try {
            Logger.info('Loading mindmap...');

            // Load using adapter
            const result = await this.#storageAdapter.load(file);

            if (!result.success) {
                throw new Error(result.error || 'Load failed');
            }

            // Parse JSON
            const data = JSON.parse(result.content);

            // Check format version
            if (data.metadata?.format === 'mindmap2') {
                // Modern format - load directly
                await this.#loadModernFormat(data);
            } else {
                // Legacy format - needs migration
                await this.#loadLegacyFormat(data, result.filename);
            }

            Logger.info(`Mindmap loaded successfully from ${result.filename}`);
            
            // Emit load event
            this.#emitEvent('storage:loaded', { 
                filename: result.filename,
                nodeCount: data.nodes?.length || 0,
                connectionCount: data.connections?.length || 0
            });

            return true;

        } catch (error) {
            Logger.error('Failed to load mindmap', error);
            this.#emitEvent('storage:error', { 
                operation: 'load',
                error: error.message 
            });
            return false;
        }
    }

    /**
     * Load modern format
     */
    async #loadModernFormat(data) {
        // Clear current state
        this.#stateManager.deserialize({ nodes: [], connections: [] });

        // Load new state
        this.#stateManager.deserialize(data);
        this.#stateManager.markClean();

        // Refresh UI
        this.#refreshUI();
    }

    /**
     * Load legacy format with migration
     */
    async #loadLegacyFormat(data, filename) {
        return new Promise((resolve) => {
            // Show migration dialog
            this.#showMigrationDialog(
                async () => {
                    // User accepted migration
                    const migrated = await this.#migrateData(data);
                    await this.#loadModernFormat(migrated);
                    
                    // Save with new format
                    const newFilename = filename.replace(/\.(mindmap|json)$/i, '.mindmap2');
                    await this.save(newFilename);
                    
                    resolve(true);
                },
                () => {
                    // User declined migration
                    Logger.info('User declined format migration');
                    resolve(false);
                }
            );
        });
    }

    /**
     * Migrate data to modern format
     */
    async #migrateData(data) {
        Logger.info('Migrating data to modern format');

        const migrated = {
            formatVersion: 'mindmap2',
            nodes: [],
            connections: [],
            metadata: {
                version: '1.0.0',
                format: 'mindmap2',
                migrated: true,
                migratedAt: new Date().toISOString()
            }
        };

        // Migrate nodes with modern IDs
        const idMap = new Map();
        
        for (const node of (data.nodes || [])) {
            const newId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            idMap.set(node.id, newId);
            
            migrated.nodes.push({
                ...node,
                id: newId,
                created: node.created || Date.now(),
                modified: Date.now()
            });
        }

        // Migrate connections with updated IDs
        for (const conn of (data.connections || [])) {
            migrated.connections.push({
                ...conn,
                id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                from: idMap.get(conn.from) || conn.from,
                to: idMap.get(conn.to) || conn.to,
                created: conn.created || Date.now(),
                modified: Date.now()
            });
        }

        return migrated;
    }

    /**
     * Export mindmap in various formats
     */
    async export(format = 'json') {
        try {
            Logger.info(`Exporting mindmap as ${format}`);

            const data = this.#stateManager.serialize();
            let content;
            let mimeType;
            let extension;

            switch (format) {
                case 'json':
                    content = JSON.stringify(data, null, 2);
                    mimeType = 'application/json';
                    extension = 'json';
                    break;

                case 'mermaid':
                    content = await this.#exportToMermaid(data);
                    mimeType = 'text/plain';
                    extension = 'mmd';
                    break;

                case 'svg':
                    content = await this.#exportToSVG();
                    mimeType = 'image/svg+xml';
                    extension = 'svg';
                    break;

                case 'png':
                    content = await this.#exportToPNG();
                    mimeType = 'image/png';
                    extension = 'png';
                    break;

                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }

            // Create filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `mindmap-export-${timestamp}.${extension}`;

            // Download file
            await this.#downloadFile(content, filename, mimeType);

            Logger.info(`Export completed: ${filename}`);
            this.#emitEvent('storage:exported', { format, filename });

            return true;

        } catch (error) {
            Logger.error('Export failed', error);
            this.#emitEvent('storage:error', { 
                operation: 'export',
                error: error.message 
            });
            return false;
        }
    }

    /**
     * Export to Mermaid format
     */
    async #exportToMermaid(data) {
        const lines = ['graph TD'];
        
        // Add nodes
        for (const node of data.nodes) {
            const shape = node.shape === 'circle' ? '((' : node.shape === 'diamond' ? '{' : '[';
            const shapeEnd = node.shape === 'circle' ? '))' : node.shape === 'diamond' ? '}' : ']';
            lines.push(`    ${node.id}${shape}"${node.title}"${shapeEnd}`);
        }

        // Add connections
        for (const conn of data.connections) {
            const arrow = conn.style === 'dashed' ? '-..->' : '-->';
            const label = conn.label ? `|${conn.label}|` : '';
            lines.push(`    ${conn.from} ${arrow}${label} ${conn.to}`);
        }

        return lines.join('\n');
    }

    /**
     * Export to SVG format
     */
    async #exportToSVG() {
        const canvas = document.getElementById('canvas');
        const svg = canvas.querySelector('svg') || this.#createSVGFromCanvas(canvas);
        return new XMLSerializer().serializeToString(svg);
    }

    /**
     * Export to PNG format
     */
    async #exportToPNG() {
        return new Promise((resolve, reject) => {
            const canvas = document.getElementById('canvas');
            
            // Use html2canvas or similar library
            html2canvas(canvas).then(canvas => {
                canvas.toBlob(blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create PNG'));
                    }
                }, 'image/png');
            }).catch(reject);
        });
    }

    /**
     * Auto-save functionality
     */
    startAutoSave() {
        if (this.#autoSaveInterval) {
            return; // Already running
        }

        Logger.info('Starting auto-save');

        this.#autoSaveInterval = setInterval(async () => {
            if (this.#stateManager.isDirty() && !this.#isSaving) {
                await this.saveToLocalStorage();
            }
        }, this.#autoSaveDelay);
    }

    stopAutoSave() {
        if (this.#autoSaveInterval) {
            clearInterval(this.#autoSaveInterval);
            this.#autoSaveInterval = null;
            Logger.info('Auto-save stopped');
        }
    }

    /**
     * Save to local storage (for auto-save)
     */
    async saveToLocalStorage() {
        try {
            const data = this.#stateManager.serialize();
            const json = JSON.stringify(data);
            
            localStorage.setItem('mindmap_autosave', json);
            localStorage.setItem('mindmap_autosave_time', Date.now().toString());
            
            Logger.debug('Auto-saved to local storage');
            return true;
        } catch (error) {
            Logger.error('Auto-save failed', error);
            return false;
        }
    }

    /**
     * Check if auto-save exists
     */
    async hasAutoSave() {
        const autoSave = localStorage.getItem('mindmap_autosave');
        const autoSaveTime = localStorage.getItem('mindmap_autosave_time');
        
        if (!autoSave || !autoSaveTime) {
            return false;
        }

        // Check if auto-save is recent (within 24 hours)
        const age = Date.now() - parseInt(autoSaveTime, 10);
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        return age < maxAge;
    }

    /**
     * Load auto-saved data
     */
    async loadAutoSave() {
        try {
            const autoSave = localStorage.getItem('mindmap_autosave');
            
            if (!autoSave) {
                throw new Error('No auto-save found');
            }

            const data = JSON.parse(autoSave);
            await this.#loadModernFormat(data);
            
            // Clear auto-save after successful load
            localStorage.removeItem('mindmap_autosave');
            localStorage.removeItem('mindmap_autosave_time');
            
            Logger.info('Auto-save loaded successfully');
            return true;
        } catch (error) {
            Logger.error('Failed to load auto-save', error);
            return false;
        }
    }

    /**
     * Helper methods
     */
    #onStateChange() {
        // Reset auto-save timer on changes
        if (this.#autoSaveInterval) {
            // Auto-save will handle it
        }
    }

    #refreshUI() {
        // Trigger UI refresh
        if (window.refreshConnections) {
            window.refreshConnections();
        }
        if (window.refreshNodes) {
            window.refreshNodes();
        }
    }

    #showMigrationDialog(onAccept, onDecline) {
        // Implementation would show actual dialog
        // For now, auto-accept for testing
        setTimeout(() => onAccept(), 0);
    }

    async #downloadFile(content, filename, mimeType) {
        const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    #emitEvent(event, data) {
        if (window.EventBus) {
            window.EventBus.emit(event, data);
        }
    }

    /**
     * Cleanup
     */
    async destroy() {
        this.stopAutoSave();
        
        // Save if dirty
        if (this.#stateManager?.isDirty()) {
            await this.saveToLocalStorage();
        }
        
        this.#stateManager = null;
        this.#storageAdapter = null;
    }
}

export default StorageManager;