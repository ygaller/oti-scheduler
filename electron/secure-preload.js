const { contextBridge, ipcRenderer } = require('electron');

// Expose secure storage APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  secureStorage: {
    setItem: (key, value) => ipcRenderer.invoke('secure-storage-set', key, value),
    getItem: (key) => ipcRenderer.invoke('secure-storage-get', key),
    removeItem: (key) => ipcRenderer.invoke('secure-storage-remove', key),
  }
});
