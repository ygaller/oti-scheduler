const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform information
  platform: process.platform,
  
  // App information
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  
  // Database operations (if needed for future features)
  database: {
    backup: () => ipcRenderer.invoke('database:backup'),
    restore: (filePath) => ipcRenderer.invoke('database:restore', filePath)
  },
  
  // File operations (for CSV export, etc.)
  file: {
    showSaveDialog: (options) => ipcRenderer.invoke('file:showSaveDialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('file:showOpenDialog', options),
    writeFile: (filePath, data) => ipcRenderer.invoke('file:writeFile', filePath, data),
    readFile: (filePath) => ipcRenderer.invoke('file:readFile', filePath)
  },
  
  // System information
  system: {
    getSystemInfo: () => ipcRenderer.invoke('system:getInfo')
  },
  
  // Print functionality
  print: {
    schedule: (htmlContent) => ipcRenderer.invoke('print:schedule', htmlContent)
  }
});

// Optional: Add some app-specific context
contextBridge.exposeInMainWorld('appContext', {
  isElectron: true,
  appName: 'ניהול לוח זמנים לגני תקשורת',
  version: '1.0.0'
});

console.log('Preload script loaded successfully');
