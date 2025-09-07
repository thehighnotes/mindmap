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
                }
                break;
                
            case 'open':
                electronOpen();
                break;
                
            case 'save':
                electronSave();
                break;
                
            case 'save-as':
                electronSaveAs();
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
    
    // Track state changes
    if (window.stateManager) {
        window.stateManager.on('state:changed', () => {
            if (window.stateManager.state.project.isDirty) {
                window.electronAPI.setUnsavedChanges(true);
            }
        });
        
        window.stateManager.on('project:saved', () => {
            window.electronAPI.setUnsavedChanges(false);
        });
    }
    
    // Electron-specific save function
    async function electronSave(callback) {
        if (!currentFilePath) {
            electronSaveAs(callback);
            return;
        }
        
        const data = prepareDataForSave();
        const result = await window.electronAPI.saveFile(currentFilePath, data);
        
        if (result.success) {
            if (window.stateManager) {
                window.stateManager.markClean();
            }
            showToast('Bestand opgeslagen');
            if (callback) callback();
        } else {
            showToast('Fout bij opslaan: ' + result.error, true);
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
    async function electronOpen() {
        // Check for unsaved changes
        if (window.stateManager && window.stateManager.state.project.isDirty) {
            if (!confirm('Er zijn niet-opgeslagen wijzigingen. Doorgaan zonder op te slaan?')) {
                return;
            }
        }
        
        const filePath = await window.electronAPI.showOpenDialog();
        
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
                
                if (window.stateManager) {
                    window.stateManager.markClean();
                }
                window.electronAPI.setUnsavedChanges(false);
                showToast('Bestand geladen');
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
                electronSaveAs();
            } else {
                electronSave();
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