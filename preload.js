const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  openFile: () => ipcRenderer.invoke('open-file'),
  exportImage: (dataUrl) => ipcRenderer.invoke('export-image', dataUrl),
  exportMermaid: (content) => ipcRenderer.invoke('export-mermaid', content),

  // Menu commands
  onMenuAction: (callback) => {
    // Remove any existing listeners to prevent duplicates
    const channels = [
      'menu-new', 'menu-open', 'menu-undo', 'menu-redo',
      'menu-zoom-in', 'menu-zoom-out', 'menu-zoom-reset',
      'menu-center', 'menu-new-node', 'menu-edit-node',
      'menu-arrange', 'menu-delete', 'menu-select-all',
      'menu-export-image', 'menu-export-mermaid', 'menu-shortcuts',
      'folder-selected'
    ];

    channels.forEach(channel => {
      ipcRenderer.removeAllListeners(channel);
      ipcRenderer.on(channel, (event, ...args) => callback(channel, ...args));
    });
  },

  // Project folder operations
  openProjectFile: (relativePath, projectFolder) => ipcRenderer.invoke('open-project-file', relativePath, projectFolder),
  listProjectFiles: (projectFolder) => ipcRenderer.invoke('list-project-files', projectFolder),

  // Platform detection
  platform: process.platform,
  
  // Version info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});

// Add keyboard shortcut hints based on platform
window.addEventListener('DOMContentLoaded', () => {
  const isMac = process.platform === 'darwin';
  const modifier = isMac ? 'Cmd' : 'Ctrl';
  
  // Update any keyboard hint texts in the UI
  document.querySelectorAll('[data-shortcut]').forEach(el => {
    const shortcut = el.dataset.shortcut;
    el.textContent = shortcut.replace('CmdOrCtrl', modifier);
  });
});