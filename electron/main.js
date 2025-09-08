const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// Initialize electron store for persistent data
const store = new Store({
    defaults: {
        recentFiles: [],
        windowBounds: { width: 1400, height: 900 }
    }
});

let mainWindow;
let hasUnsavedChanges = false;
let currentFilePath = null;
let fileToOpen = null; // Store file path to open after window is ready
let fileWatcher = null; // File system watcher

// User name storage for collaboration
ipcMain.handle('get-user-name', async () => {
    return store.get('userName', null);
});

ipcMain.handle('set-user-name', async (event, name) => {
    store.set('userName', name);
    return { success: true };
});

// Lock file operations for collaboration
ipcMain.handle('read-lock-file', async (event, lockPath) => {
    try {
        if (fs.existsSync(lockPath)) {
            return fs.readFileSync(lockPath, 'utf-8');
        }
        return null;
    } catch (error) {
        console.error('Error reading lock file:', error);
        return null;
    }
});

ipcMain.handle('write-lock-file', async (event, lockPath, data) => {
    try {
        fs.writeFileSync(lockPath, data, 'utf-8');
        return { success: true };
    } catch (error) {
        console.error('Error writing lock file:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('delete-lock-file', async (event, lockPath) => {
    try {
        if (fs.existsSync(lockPath)) {
            fs.unlinkSync(lockPath);
        }
        return { success: true };
    } catch (error) {
        console.error('Error deleting lock file:', error);
        return { success: false, error: error.message };
    }
});

// Manage recent files
const MAX_RECENT_FILES = 10;

function addToRecentFiles(filePath) {
    let recentFiles = store.get('recentFiles', []);
    // Remove if already exists
    recentFiles = recentFiles.filter(f => f !== filePath);
    // Add to beginning
    recentFiles.unshift(filePath);
    // Keep only MAX_RECENT_FILES
    recentFiles = recentFiles.slice(0, MAX_RECENT_FILES);
    // Filter out non-existent files
    recentFiles = recentFiles.filter(f => fs.existsSync(f));
    store.set('recentFiles', recentFiles);
    updateRecentFilesMenu();
}

function getRecentFiles() {
    return store.get('recentFiles', []).filter(f => fs.existsSync(f));
}

function buildRecentFilesMenu() {
    const recentFiles = getRecentFiles();
    if (recentFiles.length === 0) {
        return [{ label: 'Geen recente bestanden', enabled: false }];
    }
    
    return recentFiles.map((filePath, index) => ({
        label: `${index + 1}. ${path.basename(filePath)}`,
        click: () => {
            mainWindow.webContents.send('open-recent-file', filePath);
        }
    }));
}

function updateRecentFilesMenu() {
    const menu = Menu.getApplicationMenu();
    const recentFilesMenu = menu.getMenuItemById('recent-files');
    if (recentFilesMenu) {
        recentFilesMenu.submenu = Menu.buildFromTemplate(buildRecentFilesMenu());
    }
}

function setupFileWatcher(filePath) {
    // Clear existing watcher
    if (fileWatcher) {
        fileWatcher.close();
        fileWatcher = null;
    }
    
    if (!filePath || !fs.existsSync(filePath)) return;
    
    // Watch for external changes
    fileWatcher = fs.watch(filePath, (eventType) => {
        if (eventType === 'change') {
            mainWindow.webContents.send('file-changed', filePath);
        }
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        icon: path.join(__dirname, '../assets/icon.png'),
        title: 'Mindmap - Electron'
    });
    
    // Load the existing HTML file
    mainWindow.loadFile(path.join(__dirname, '../index.html'));
    
    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
    
    // When the window is ready, open any file that was passed
    mainWindow.webContents.on('did-finish-load', () => {
        if (fileToOpen) {
            mainWindow.webContents.send('open-file', fileToOpen);
            fileToOpen = null;
        }
    });
    
    // Handle window close with unsaved changes
    mainWindow.on('close', (e) => {
        if (hasUnsavedChanges) {
            const choice = dialog.showMessageBoxSync(mainWindow, {
                type: 'question',
                buttons: ['Opslaan', 'Niet Opslaan', 'Annuleren'],
                defaultId: 0,
                message: 'Wilt u uw wijzigingen opslaan voordat u afsluit?',
                title: 'Niet-opgeslagen wijzigingen'
            });
            
            if (choice === 2) {
                // Cancel
                e.preventDefault();
            } else if (choice === 0) {
                // Save
                e.preventDefault();
                mainWindow.webContents.send('save-before-close');
            }
            // If choice === 1 (Don't Save), let it close
        }
    });
    
    // Create application menu
    createMenu();
}

function createMenu() {
    const template = [
        {
            label: 'Bestand',
            submenu: [
                {
                    label: 'Nieuw',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'new');
                    }
                },
                {
                    label: 'Openen...',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'open');
                    }
                },
                {
                    label: 'Opslaan',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'save');
                    }
                },
                {
                    label: 'Opslaan Als...',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'save-as');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Recente Bestanden',
                    id: 'recent-files',
                    submenu: buildRecentFilesMenu()
                },
                {
                    label: 'Wis Recente Bestanden',
                    click: () => {
                        store.set('recentFiles', []);
                        updateRecentFilesMenu();
                    }
                },
                { type: 'separator' },
                {
                    label: 'Open in Verkenner',
                    accelerator: 'CmdOrCtrl+Shift+O',
                    enabled: false,
                    id: 'show-in-folder',
                    click: () => {
                        if (currentFilePath) {
                            shell.showItemInFolder(currentFilePath);
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exporteren',
                    submenu: [
                        {
                            label: 'Als Afbeelding...',
                            click: () => {
                                mainWindow.webContents.send('menu-action', 'export-image');
                            }
                        },
                        {
                            label: 'Als Mermaid...',
                            click: () => {
                                mainWindow.webContents.send('menu-action', 'export-mermaid');
                            }
                        }
                    ]
                },
                { type: 'separator' },
                {
                    label: 'Afsluiten',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Bewerken',
            submenu: [
                {
                    label: 'Ongedaan maken',
                    accelerator: 'CmdOrCtrl+Z',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'undo');
                    }
                },
                {
                    label: 'Opnieuw',
                    accelerator: 'CmdOrCtrl+Y',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'redo');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Knippen',
                    accelerator: 'CmdOrCtrl+X',
                    role: 'cut'
                },
                {
                    label: 'Kopiëren',
                    accelerator: 'CmdOrCtrl+C',
                    role: 'copy'
                },
                {
                    label: 'Plakken',
                    accelerator: 'CmdOrCtrl+V',
                    role: 'paste'
                },
                { type: 'separator' },
                {
                    label: 'Alles selecteren',
                    accelerator: 'CmdOrCtrl+A',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'select-all');
                    }
                }
            ]
        },
        {
            label: 'Beeld',
            submenu: [
                {
                    label: 'Inzoomen',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'zoom-in');
                    }
                },
                {
                    label: 'Uitzoomen',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'zoom-out');
                    }
                },
                {
                    label: 'Reset Zoom',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'zoom-reset');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Centreren',
                    accelerator: 'CmdOrCtrl+Shift+C',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'center');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Volledig scherm',
                    accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
                    click: () => {
                        mainWindow.setFullScreen(!mainWindow.isFullScreen());
                    }
                }
            ]
        },
        {
            label: 'Gereedschappen',
            submenu: [
                {
                    label: 'Selecteren',
                    accelerator: 'S',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'tool-select');
                    }
                },
                {
                    label: 'Pannen',
                    accelerator: 'H',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'tool-pan');
                    }
                },
                {
                    label: 'Verbinden',
                    accelerator: 'C',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'tool-connect');
                    }
                },
                {
                    label: 'Knooppunt toevoegen',
                    accelerator: 'N',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'tool-node');
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Documentatie',
                    click: () => {
                        shell.openExternal('https://github.com/your-repo/mindmap-electron');
                    }
                },
                {
                    label: 'Sneltoetsen',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'show-shortcuts');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Over',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Over Mindmap',
                            message: 'Mindmap Electron App',
                            detail: 'Versie 2.0.0\nGemaakt door Mark Wind\n\nEen krachtige mindmapping tool gebouwd met Electron.',
                            buttons: ['OK']
                        });
                    }
                }
            ]
        }
    ];
    
    // macOS specific adjustments
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services', submenu: [] },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });
    }
    
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC handlers for file operations
ipcMain.on('set-unsaved-changes', (event, isDirty) => {
    hasUnsavedChanges = isDirty;
    const title = currentFilePath 
        ? `${path.basename(currentFilePath)}${isDirty ? ' •' : ''} - Mindmap`
        : `Mindmap${isDirty ? ' •' : ''}`;
    mainWindow.setTitle(title);
});

ipcMain.on('set-current-file', (event, filePath) => {
    currentFilePath = filePath;
    const title = filePath 
        ? `${path.basename(filePath)} - Mindmap`
        : 'Mindmap';
    mainWindow.setTitle(title);
    
    // Update menu items
    const menu = Menu.getApplicationMenu();
    const showInFolderItem = menu.getMenuItemById('show-in-folder');
    if (showInFolderItem) {
        showInFolderItem.enabled = !!filePath;
    }
    
    // Setup file watcher
    setupFileWatcher(filePath);
    
    // Add to recent files
    if (filePath) {
        addToRecentFiles(filePath);
    }
});

ipcMain.on('set-title', (event, title) => {
    if (mainWindow) {
        mainWindow.setTitle(title);
    }
});

ipcMain.handle('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        filters: [
            { name: 'Mindmap Files', extensions: ['mindmap2', 'mindmap'] },
            { name: 'JSON Files', extensions: ['json'] }
        ],
        defaultPath: options?.suggestedName || 'mindmap.mindmap2'
    });
    
    if (!result.canceled) {
        return result.filePath;
    }
    return null;
});

ipcMain.handle('show-open-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        filters: [
            { name: 'Mindmap Files', extensions: ['mindmap2', 'mindmap', 'json'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

ipcMain.handle('save-file', async (event, filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        currentFilePath = filePath;
        addToRecentFiles(filePath);
        return { success: true };
    } catch (error) {
        console.error('Error saving file:', error);
        return { success: false, error: error.message };
    }
});

// New IPC handlers for advanced features
ipcMain.handle('get-recent-files', () => {
    return getRecentFiles();
});

ipcMain.handle('clear-recent-files', () => {
    store.set('recentFiles', []);
    updateRecentFilesMenu();
    return true;
});

ipcMain.handle('show-in-folder', (event, filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        shell.showItemInFolder(filePath);
        return true;
    }
    return false;
});

ipcMain.handle('watch-file', (event, filePath) => {
    setupFileWatcher(filePath);
    return true;
});

ipcMain.handle('load-file', async (event, filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        currentFilePath = filePath;
        return { success: true, data: JSON.parse(data) };
    } catch (error) {
        console.error('Error loading file:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('export-image', async (event, dataUrl) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        filters: [
            { name: 'PNG Image', extensions: ['png'] }
        ],
        defaultPath: 'mindmap.png'
    });
    
    if (!result.canceled) {
        try {
            // Remove data URL prefix
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
            fs.writeFileSync(result.filePath, base64Data, 'base64');
            return { success: true };
        } catch (error) {
            console.error('Error saving image:', error);
            return { success: false, error: error.message };
        }
    }
    return { success: false };
});

// Handle file opening on Windows when app is not running
// (user double-clicked a .mindmap2 file)
if (process.platform === 'win32' && process.argv.length >= 2) {
    const filePath = process.argv[1];
    if (filePath && (filePath.endsWith('.mindmap2') || filePath.endsWith('.mindmap'))) {
        fileToOpen = filePath;
    }
}

// Version history management
ipcMain.handle('create-version-backup', async (event, filePath, content) => {
    try {
        if (!filePath || !content) return { success: false };
        
        // Create versions folder in app data
        const userDataPath = app.getPath('userData');
        const versionsDir = path.join(userDataPath, 'versions');
        
        // Create file-specific version folder
        const fileName = path.basename(filePath, path.extname(filePath));
        const fileVersionsDir = path.join(versionsDir, fileName);
        
        if (!fs.existsSync(fileVersionsDir)) {
            fs.mkdirSync(fileVersionsDir, { recursive: true });
        }
        
        // Create version filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const versionFile = path.join(fileVersionsDir, `${fileName}_${timestamp}.mindmap2`);
        
        // Save version
        fs.writeFileSync(versionFile, content);
        
        // Clean up old versions (keep only last 20)
        const versions = fs.readdirSync(fileVersionsDir)
            .filter(f => f.endsWith('.mindmap2'))
            .sort()
            .reverse();
            
        if (versions.length > 20) {
            versions.slice(20).forEach(oldVersion => {
                fs.unlinkSync(path.join(fileVersionsDir, oldVersion));
            });
        }
        
        return { success: true, versionPath: versionFile };
    } catch (error) {
        console.error('Error creating version backup:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-version-history', async (event, filePath) => {
    try {
        if (!filePath) return { success: false, versions: [] };
        
        const userDataPath = app.getPath('userData');
        const versionsDir = path.join(userDataPath, 'versions');
        const fileName = path.basename(filePath, path.extname(filePath));
        const fileVersionsDir = path.join(versionsDir, fileName);
        
        if (!fs.existsSync(fileVersionsDir)) {
            return { success: true, versions: [] };
        }
        
        const versions = fs.readdirSync(fileVersionsDir)
            .filter(f => f.endsWith('.mindmap2'))
            .map(f => {
                const fullPath = path.join(fileVersionsDir, f);
                const stats = fs.statSync(fullPath);
                return {
                    name: f,
                    path: fullPath,
                    date: stats.mtime,
                    size: stats.size
                };
            })
            .sort((a, b) => b.date - a.date);
            
        return { success: true, versions };
    } catch (error) {
        console.error('Error getting version history:', error);
        return { success: false, error: error.message, versions: [] };
    }
});

ipcMain.handle('restore-version', async (event, versionPath) => {
    try {
        const data = fs.readFileSync(versionPath, 'utf-8');
        return { success: true, data: JSON.parse(data) };
    } catch (error) {
        console.error('Error restoring version:', error);
        return { success: false, error: error.message };
    }
});

// Handle file opening on macOS
app.on('open-file', (event, filePath) => {
    event.preventDefault();
    if (mainWindow) {
        mainWindow.webContents.send('open-file', filePath);
    } else {
        fileToOpen = filePath;
    }
});

// Handle second instance (Windows) - when user opens another file while app is running
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    // Another instance is already running, quit this one
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, focus our window instead
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            
            // Check if a file was passed in the command line
            const filePath = commandLine[commandLine.length - 1];
            if (filePath && (filePath.endsWith('.mindmap2') || filePath.endsWith('.mindmap'))) {
                mainWindow.webContents.send('open-file', filePath);
            }
        }
    });
    
    // App event handlers
    app.whenReady().then(() => {
        createWindow();
    });
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle protocol for deep linking (optional)
app.setAsDefaultProtocolClient('mindmap');