const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
    saveFile: (filePath, data) => ipcRenderer.invoke('save-file', filePath, data),
    loadFile: (filePath) => ipcRenderer.invoke('load-file', filePath),
    exportImage: (dataUrl) => ipcRenderer.invoke('export-image', dataUrl),
    
    // Advanced file management
    getRecentFiles: () => ipcRenderer.invoke('get-recent-files'),
    clearRecentFiles: () => ipcRenderer.invoke('clear-recent-files'),
    showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),
    watchFile: (filePath) => ipcRenderer.invoke('watch-file', filePath),
    createVersionBackup: (filePath, content) => ipcRenderer.invoke('create-version-backup', filePath, content),
    getVersionHistory: (filePath) => ipcRenderer.invoke('get-version-history', filePath),
    restoreVersion: (versionPath) => ipcRenderer.invoke('restore-version', versionPath),
    
    // State tracking
    setUnsavedChanges: (isDirty) => ipcRenderer.send('set-unsaved-changes', isDirty),
    setCurrentFile: (filePath) => ipcRenderer.send('set-current-file', filePath),
    setTitle: (title) => ipcRenderer.send('set-title', title),
    
    // Menu actions
    onMenuAction: (callback) => {
        ipcRenderer.on('menu-action', (event, action) => callback(action));
    },
    
    // File change notifications
    onFileChanged: (callback) => {
        ipcRenderer.on('file-changed', (event, filePath) => callback(filePath));
    },
    
    // Recent file opened
    onOpenRecentFile: (callback) => {
        ipcRenderer.on('open-recent-file', (event, filePath) => callback(filePath));
    },
    
    // Save before close
    onSaveBeforeClose: (callback) => {
        ipcRenderer.on('save-before-close', () => callback());
    },
    
    // Platform info
    platform: process.platform,
    
    // User management for collaboration
    getUserName: () => ipcRenderer.invoke('get-user-name'),
    setUserName: (name) => ipcRenderer.invoke('set-user-name', name),
    
    // Lock file operations for collaboration
    readLockFile: (lockPath) => ipcRenderer.invoke('read-lock-file', lockPath),
    writeLockFile: (lockPath, data) => ipcRenderer.invoke('write-lock-file', lockPath, data),
    deleteLockFile: (lockPath) => ipcRenderer.invoke('delete-lock-file', lockPath),
    
    // Check if running in Electron
    isElectron: true
});

// Log that preload script is loaded
console.log('Electron preload script loaded');
console.log('Platform:', process.platform);
console.log('Node version:', process.versions.node);
console.log('Electron version:', process.versions.electron);