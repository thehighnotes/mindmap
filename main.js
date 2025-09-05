const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;
let currentFilePath = null;

function createWindow() {
  // Set app user model ID for Windows to fix cache issues
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.mindmap.brainstorm');
  }
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Add cache settings to fix permission issues
      partition: 'persist:mindmap'
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'default' : 'default'
  });

  mainWindow.loadFile('index.html');

  // Open links in external browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
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
            mainWindow.webContents.send('menu-new');
          }
        },
        {
          label: 'Openen...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'Mindmap Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });

            if (!result.canceled && result.filePaths[0]) {
              const data = await fs.readFile(result.filePaths[0], 'utf8');
              currentFilePath = result.filePaths[0];
              mainWindow.webContents.send('menu-open', data, path.basename(currentFilePath));
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Opslaan',
          accelerator: 'CmdOrCtrl+S',
          click: async () => {
            // Get the complete project data including folder path
            const data = await mainWindow.webContents.executeJavaScript(`
              (function() {
                // Access global variables directly (not via window in renderer)
                return JSON.stringify({
                  nodes: typeof nodes !== 'undefined' ? nodes : [],
                  connections: typeof connections !== 'undefined' ? connections : [],
                  nextNodeId: typeof nextNodeId !== 'undefined' ? nextNodeId : 1,
                  rootNodeId: typeof rootNodeId !== 'undefined' ? rootNodeId : null,
                  projectFolder: typeof window !== 'undefined' && window.currentProjectFolder ? window.currentProjectFolder : null,
                  metadata: {
                    version: '1.0.0',
                    created: new Date().toISOString(),
                    lastModified: new Date().toISOString()
                  }
                });
              })()
            `);
            
            if (currentFilePath) {
              await fs.writeFile(currentFilePath, data);
              mainWindow.webContents.send('show-toast', 'Mindmap opgeslagen');
            } else {
              saveAs();
            }
          }
        },
        {
          label: 'Opslaan als...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: saveAs
        },
        { type: 'separator' },
        {
          label: 'Exporteren als PNG',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('menu-export-image');
          }
        },
        {
          label: 'Exporteren als Mermaid',
          click: () => {
            mainWindow.webContents.send('menu-export-mermaid');
          }
        },
        { type: 'separator' },
        {
          label: 'Project Map Selecteren...',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory'],
              title: 'Selecteer Project Map'
            });

            if (!result.canceled && result.filePaths[0]) {
              const folderPath = result.filePaths[0];
              mainWindow.webContents.send('folder-selected', folderPath);
            }
          }
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
            mainWindow.webContents.send('menu-undo');
          }
        },
        {
          label: 'Opnieuw',
          accelerator: 'CmdOrCtrl+Y',
          click: () => {
            mainWindow.webContents.send('menu-redo');
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
            mainWindow.webContents.send('menu-select-all');
          }
        },
        {
          label: 'Verwijderen',
          accelerator: 'Delete',
          click: () => {
            mainWindow.webContents.send('menu-delete');
          }
        }
      ]
    },
    {
      label: 'Weergave',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            mainWindow.webContents.send('menu-zoom-in');
          }
        },
        {
          label: 'Zoom Uit',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            mainWindow.webContents.send('menu-zoom-out');
          }
        },
        {
          label: 'Zoom Resetten',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow.webContents.send('menu-zoom-reset');
          }
        },
        { type: 'separator' },
        {
          label: 'Centreren',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            mainWindow.webContents.send('menu-center');
          }
        },
        { type: 'separator' },
        {
          label: 'Volledig scherm',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
          click: () => {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          }
        },
        { type: 'separator' },
        {
          label: 'Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    },
    {
      label: 'Knooppunten',
      submenu: [
        {
          label: 'Nieuw knooppunt',
          accelerator: 'N',
          click: () => {
            mainWindow.webContents.send('menu-new-node');
          }
        },
        {
          label: 'Bewerk knooppunt',
          accelerator: 'Enter',
          click: () => {
            mainWindow.webContents.send('menu-edit-node');
          }
        },
        { type: 'separator' },
        {
          label: 'Rangschikken',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => {
            mainWindow.webContents.send('menu-arrange');
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Over',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Over Mindmap Brainstorm Tool',
              message: 'Mindmap Brainstorm Tool',
              detail: 'Versie 0.932\n\nEen geavanceerde mindmap visualisatie tool gebouwd met Electron.\n\n© 2024',
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Sneltoetsen',
          click: () => {
            mainWindow.webContents.send('menu-shortcuts');
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
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

async function saveAs() {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'Mindmap Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    defaultPath: 'mindmap.json'
  });

  if (!result.canceled) {
    // Get the complete project data including folder path
    const data = await mainWindow.webContents.executeJavaScript(`
      (function() {
        // Access global variables directly (not via window in renderer)
        return JSON.stringify({
          nodes: typeof nodes !== 'undefined' ? nodes : [],
          connections: typeof connections !== 'undefined' ? connections : [],
          nextNodeId: typeof nextNodeId !== 'undefined' ? nextNodeId : 1,
          rootNodeId: typeof rootNodeId !== 'undefined' ? rootNodeId : null,
          projectFolder: typeof window !== 'undefined' && window.currentProjectFolder ? window.currentProjectFolder : null,
          metadata: {
            version: '1.0.0',
            created: new Date().toISOString(),
            lastModified: new Date().toISOString()
          }
        });
      })()
    `);
    await fs.writeFile(result.filePath, data);
    currentFilePath = result.filePath;
    mainWindow.setTitle(`Mindmap - ${path.basename(currentFilePath)}`);
  }
}

// IPC handlers for file operations
ipcMain.handle('save-file', async (event, data) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled) {
    await fs.writeFile(result.filePath, data);
    return { success: true, path: result.filePath };
  }
  return { success: false };
});

ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths[0]) {
    const data = await fs.readFile(result.filePaths[0], 'utf8');
    return { success: true, data, path: result.filePaths[0] };
  }
  return { success: false };
});

ipcMain.handle('export-image', async (event, dataUrl) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'PNG Images', extensions: ['png'] }
    ],
    defaultPath: 'mindmap.png'
  });

  if (!result.canceled) {
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    await fs.writeFile(result.filePath, base64Data, 'base64');
    return { success: true, path: result.filePath };
  }
  return { success: false };
});

ipcMain.handle('export-mermaid', async (event, content) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'Mermaid Files', extensions: ['mmd', 'md'] },
      { name: 'Text Files', extensions: ['txt'] }
    ],
    defaultPath: 'mindmap.mmd'
  });

  if (!result.canceled) {
    await fs.writeFile(result.filePath, content);
    return { success: true, path: result.filePath };
  }
  return { success: false };
});

// IPC handler for opening files in project folder
ipcMain.handle('open-project-file', async (event, relativePath, projectFolder) => {
  if (!projectFolder) {
    return { success: false, error: 'No project folder set' };
  }
  
  const fullPath = path.join(projectFolder, relativePath);
  
  try {
    // Check if file exists
    await fs.access(fullPath);
    // Open the file with default application
    shell.openPath(fullPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler for listing files in project folder
ipcMain.handle('list-project-files', async (event, projectFolder) => {
  if (!projectFolder) {
    return { success: false, error: 'No project folder set', files: [] };
  }
  
  try {
    const files = await fs.readdir(projectFolder);
    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message, files: [] };
  }
});

// App event handlers
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Prevent window from closing if there are unsaved changes
app.on('before-quit', async (event) => {
  // Check if window exists and is not destroyed
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  
  const hasUnsavedChanges = await mainWindow.webContents.executeJavaScript('window.hasUnsavedChanges || false');
  
  if (hasUnsavedChanges) {
    event.preventDefault();
    
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['Opslaan', 'Niet opslaan', 'Annuleren'],
      defaultId: 0,
      message: 'Wilt u de wijzigingen opslaan voordat u afsluit?'
    });

    if (choice === 0) {
      await saveAs();
      app.quit();
    } else if (choice === 1) {
      mainWindow.webContents.executeJavaScript('window.hasUnsavedChanges = false');
      app.quit();
    }
  }
});