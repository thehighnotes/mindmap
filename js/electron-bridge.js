/**
 * electron-bridge.js - Bridge between Electron API and the web app
 * This file handles Electron-specific functionality when running in Electron
 */

(function() {
    // Check if we're running in Electron
    const isElectron = window.electronAPI && window.electronAPI.isElectron;
    
    if (!isElectron) {
        console.log('Running in browser mode - Electron features disabled');
        return;
    }
    
    console.log('Electron environment detected - initializing Electron bridge');
    
    // Override file operations with Electron versions
    let currentFilePath = null;
    
    // Listen for recent file opened
    window.electronAPI.onOpenRecentFile((filePath) => {
        console.log('Opening recent file:', filePath);
        electronOpen(filePath);
    });
    
    // Listen for external file changes
    window.electronAPI.onFileChanged((filePath) => {
        if (filePath === currentFilePath) {
            if (confirm('Het bestand is extern gewijzigd. Wilt u het herladen?')) {
                electronOpen(filePath);
            }
        }
    });
    
    // Listen for menu actions from Electron
    window.electronAPI.onMenuAction((action) => {
        console.log('Menu action received:', action);
        
        switch(action) {
            case 'new':
                if (confirm('Dit zal de huidige mindmap wissen. Doorgaan?')) {
                    initMindmap(true);
                    currentFilePath = null;
                    window.electronAPI.setCurrentFile(null);
                    window.electronAPI.setUnsavedChanges(false);
                    
                    // Stop collaboration on new file
                    if (window.Collaboration && window.Collaboration.initialized) {
                        window.Collaboration.onFileClosed();
                    }
                }
                break;
                
            case 'open':
                electronOpen();
                break;
                
            case 'save':
                // Use the same smart save dialog as the in-app button
                if (typeof showSmartSaveDialog === 'function') {
                    showSmartSaveDialog();
                } else {
                    // Fallback to direct save if dialog not available
                    electronSave();
                }
                break;
                
            case 'save-as':
                // Force save-as dialog
                if (typeof showSmartSaveDialog === 'function') {
                    // Pass true to force save-as mode
                    showSmartSaveDialog(true);
                } else {
                    electronSaveAs();
                }
                break;
                
            case 'undo':
                if (typeof undo === 'function') undo();
                break;
                
            case 'redo':
                if (typeof redo === 'function') redo();
                break;
                
            case 'export-image':
                if (typeof exportAsImage === 'function') {
                    exportAsImage();
                }
                break;
                
            case 'export-mermaid':
                if (typeof exportToMermaid === 'function') {
                    exportToMermaid();
                }
                break;
                
            case 'zoom-in':
                if (typeof zoomIn === 'function') zoomIn();
                break;
                
            case 'zoom-out':
                if (typeof zoomOut === 'function') zoomOut();
                break;
                
            case 'zoom-reset':
                if (typeof resetZoom === 'function') resetZoom();
                break;
                
            case 'center':
                if (typeof centerView === 'function') centerView();
                break;
                
            case 'tool-select':
                if (typeof setTool === 'function') setTool('select');
                break;
                
            case 'tool-pan':
                if (typeof setTool === 'function') setTool('pan');
                break;
                
            case 'tool-connect':
                if (typeof setTool === 'function') setTool('connect');
                break;
                
            case 'tool-node':
                if (typeof setTool === 'function') setTool('node');
                break;
                
            case 'select-all':
                selectAllNodes();
                break;
                
            case 'show-shortcuts':
                if (document.getElementById('help-btn')) {
                    document.getElementById('help-btn').click();
                }
                break;
        }
    });
    
    // Handle save before close
    window.electronAPI.onSaveBeforeClose(() => {
        electronSave(() => {
            // After save, tell Electron it's safe to close
            window.electronAPI.setUnsavedChanges(false);
            window.close();
        });
    });
    
    // Track state changes and setup auto-save
    function setupChangeTracking() {
        // Listen for any changes to trigger auto-save
        const triggerAutoSave = () => {
            window.electronAPI.setUnsavedChanges(true);
            updateTitleBar();
            setupAutoSave();
        };
        
        // Monitor various change events
        document.addEventListener('nodeCreated', triggerAutoSave);
        document.addEventListener('nodeEdited', triggerAutoSave);
        document.addEventListener('nodeDeleted', triggerAutoSave);
        document.addEventListener('connectionCreated', triggerAutoSave);
        document.addEventListener('connectionDeleted', triggerAutoSave);
        
        // StateManager events if available
        if (window.stateManager) {
            window.stateManager.on('state:changed', () => {
                if (window.stateManager.state.project.isDirty) {
                    triggerAutoSave();
                }
            });
            
            window.stateManager.on('project:saved', () => {
                window.electronAPI.setUnsavedChanges(false);
                updateTitleBar();
            });
        }
        
        // Monitor direct changes to nodes and connections arrays
        if (typeof nodes !== 'undefined' && typeof connections !== 'undefined') {
            setInterval(() => {
                const currentState = JSON.stringify({ nodes, connections });
                if (currentState !== lastKnownState) {
                    lastKnownState = currentState;
                    triggerAutoSave();
                }
            }, 1000);
        }
    }
    
    let lastKnownState = '';
    
    // Initialize change tracking when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupChangeTracking);
    } else {
        setupChangeTracking();
    }
    
    // Auto-save functionality for Electron
    let autoSaveInterval = null;
    let lastSaveTime = Date.now();
    let lastSavedContent = ''; // Track last saved content to detect real changes
    let lastContentHash = '';
    const AUTO_SAVE_DELAY = 5000; // 5 seconds after changes
    const VERSION_INTERVAL = 600000; // Create version backup every 10 minutes if changed
    let lastVersionTime = Date.now();
    
    // Simple hash function to detect content changes
    function hashContent(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
    
    // Electron-specific save function
    async function electronSave(callback, silent = false, createVersion = false) {
        if (!currentFilePath) {
            electronSaveAs(callback);
            return;
        }
        
        const data = prepareDataForSave();
        const dataStr = JSON.stringify(data);
        const currentHash = hashContent(dataStr);
        
        // Check if content actually changed
        if (currentHash === lastContentHash && !createVersion) {
            if (!silent) {
                showToast('Geen wijzigingen om op te slaan');
            }
            if (callback) callback();
            return;
        }
        
        // Create version backup if enough time passed and content changed
        const timeSinceVersion = Date.now() - lastVersionTime;
        if (createVersion || (timeSinceVersion > VERSION_INTERVAL && lastContentHash !== '' && lastSavedContent !== '')) {
            // Only create backup if we have previous content
            if (lastSavedContent) {
                await window.electronAPI.createVersionBackup(currentFilePath, lastSavedContent);
                lastVersionTime = Date.now();
            }
        }
        
        const result = await window.electronAPI.saveFile(currentFilePath, data);
        
        if (result.success) {
            lastSavedContent = dataStr;
            lastContentHash = currentHash;
            if (window.stateManager) {
                window.stateManager.markClean();
            }
            lastSaveTime = Date.now();
            if (!silent) {
                showToast('Bestand opgeslagen');
            }
            updateTitleBar();
            if (callback) callback();
        } else {
            showToast('Fout bij opslaan: ' + result.error, true);
        }
    }
    
    // Auto-save when file is already open
    function setupAutoSave() {
        if (!currentFilePath) return;
        
        // Clear existing interval
        if (autoSaveInterval) {
            clearTimeout(autoSaveInterval);
        }
        
        // Set new auto-save
        autoSaveInterval = setTimeout(() => {
            if (currentFilePath && isDirty()) {
                electronSave(null, true); // Silent save
            }
        }, AUTO_SAVE_DELAY);
    }
    
    // Check if there are unsaved changes
    function isDirty() {
        return window.stateManager?.state?.project?.isDirty || 
               (typeof getUnsavedChanges === 'function' && getUnsavedChanges());
    }
    
    // Update title bar with file name and save status
    function updateTitleBar() {
        if (!currentFilePath) return;
        
        const fileName = currentFilePath.split(/[\\/]/).pop();
        const dirty = isDirty();
        const title = `${fileName}${dirty ? ' •' : ''} - Mindmap`;
        
        // Update window title via Electron API
        if (window.electronAPI.setTitle) {
            window.electronAPI.setTitle(title);
        }
        
        // Update status in UI
        const statusEl = document.getElementById('file-status');
        if (statusEl) {
            statusEl.textContent = dirty ? 'Niet opgeslagen' : 'Opgeslagen';
            statusEl.className = dirty ? 'status-unsaved' : 'status-saved';
        }
    }
    
    // Electron-specific save as function
    async function electronSaveAs(callback) {
        const suggestedName = (getMindmapTitle ? getMindmapTitle() : 'mindmap') + '.mindmap2';
        const filePath = await window.electronAPI.showSaveDialog({ suggestedName });
        
        if (filePath) {
            currentFilePath = filePath;
            window.electronAPI.setCurrentFile(filePath);
            
            const data = prepareDataForSave();
            const result = await window.electronAPI.saveFile(filePath, data);
            
            if (result.success) {
                // Initialize content tracking for new file
                const dataStr = JSON.stringify(data);
                lastSavedContent = dataStr;
                lastContentHash = hashContent(dataStr);
                lastVersionTime = Date.now();
                
                if (window.stateManager) {
                    window.stateManager.markClean();
                }
                showToast('Bestand opgeslagen als ' + filePath.split(/[\\/]/).pop());
                if (callback) callback();
            } else {
                showToast('Fout bij opslaan: ' + result.error, true);
            }
        }
    }
    
    // Electron-specific open function
    async function electronOpen(filePathToOpen) {
        // Check for unsaved changes
        if (window.stateManager && window.stateManager.state.project.isDirty) {
            if (!confirm('Er zijn niet-opgeslagen wijzigingen. Doorgaan zonder op te slaan?')) {
                return;
            }
        }
        
        const filePath = filePathToOpen || await window.electronAPI.showOpenDialog();
        
        if (filePath) {
            const result = await window.electronAPI.loadFile(filePath);
            
            if (result.success) {
                currentFilePath = filePath;
                window.electronAPI.setCurrentFile(filePath);
                
                // Check if it's old format and needs conversion
                const filename = filePath.split(/[\\/]/).pop();
                if (isOldFormatFile && isOldFormatFile(filename, result.data)) {
                    // Show conversion dialog
                    if (confirm('Dit bestand is in het oude formaat. Converteren naar nieuw formaat?')) {
                        const converted = convertToNewFormat(result.data, filename);
                        loadMindmapData(converted);
                        // Mark as dirty so user can save in new format
                        if (window.stateManager) {
                            window.stateManager.state.project.isDirty = true;
                            window.electronAPI.setUnsavedChanges(true);
                        }
                        showToast('Bestand geconverteerd naar nieuw formaat. Sla op om de conversie te behouden.');
                    } else {
                        loadMindmapData(result.data);
                    }
                } else {
                    loadMindmapData(result.data);
                }
                
                // Initialize content tracking for version history
                const dataStr = JSON.stringify(prepareDataForSave());
                lastSavedContent = dataStr;
                lastContentHash = hashContent(dataStr);
                lastVersionTime = Date.now();
                
                if (window.stateManager) {
                    window.stateManager.markClean();
                }
                window.electronAPI.setUnsavedChanges(false);
                showToast('Bestand geladen');
                
                // Start collaboration if available
                if (window.Collaboration && window.Collaboration.initialized) {
                    window.Collaboration.onFileOpened(filePath);
                }
            } else {
                showToast('Fout bij laden: ' + result.error, true);
            }
        }
    }
    
    // Prepare data for saving
    function prepareDataForSave() {
        const now = new Date().toISOString();
        
        return {
            version: '2.0.0',
            format: 'mindmap2',
            title: getMindmapTitle ? getMindmapTitle() : 'Mindmap Project',
            nodes: nodes,
            connections: connections,
            rootNodeId: rootNodeId,
            metadata: {
                created: window.stateManager?.state.project.created || now,
                lastModified: now,
                appVersion: '2.0.0',
                electronVersion: true
            },
            settings: {
                canvasOffset: canvasOffset,
                zoomLevel: zoomLevel,
                showGrid: showGrid,
                gridSize: gridSize
            }
        };
    }
    
    // Override the export functions for Electron
    if (typeof window.exportAsImage === 'function') {
        const originalExportAsImage = window.exportAsImage;
        window.exportAsImage = function() {
            // In Electron, we can save directly to file
            const canvas = document.getElementById('canvas');
            if (canvas) {
                html2canvas(canvas, {
                    backgroundColor: '#1a1a1a',
                    scale: 2
                }).then(async (canvasImg) => {
                    const dataUrl = canvasImg.toDataURL('image/png');
                    const result = await window.electronAPI.exportImage(dataUrl);
                    if (result.success) {
                        showToast('Afbeelding geëxporteerd');
                    } else {
                        showToast('Fout bij exporteren', true);
                    }
                });
            }
        };
    }
    
    // Override keyboard shortcuts for Electron
    document.addEventListener('keydown', (e) => {
        // Ctrl+S or Cmd+S
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (e.shiftKey) {
                // Shift+Ctrl+S for Save As
                if (typeof showSmartSaveDialog === 'function') {
                    showSmartSaveDialog(true); // Force save-as mode
                } else {
                    electronSaveAs();
                }
            } else {
                // Ctrl+S for normal save - use smart dialog
                if (typeof showSmartSaveDialog === 'function') {
                    showSmartSaveDialog();
                } else {
                    electronSave();
                }
            }
        }
        
        // Ctrl+O or Cmd+O
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            electronOpen();
        }
        
        // Ctrl+N or Cmd+N
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            if (confirm('Dit zal de huidige mindmap wissen. Doorgaan?')) {
                initMindmap(true);
                currentFilePath = null;
                window.electronAPI.setCurrentFile(null);
                window.electronAPI.setUnsavedChanges(false);
            }
        }
    });
    
    // Helper function to select all nodes
    function selectAllNodes() {
        // This would need to be implemented based on your selection system
        const allNodeElements = document.querySelectorAll('.node');
        allNodeElements.forEach(el => {
            el.classList.add('selected');
        });
        showToast(`${allNodeElements.length} knooppunten geselecteerd`);
    }
    
    console.log('Electron bridge initialized successfully');
})();