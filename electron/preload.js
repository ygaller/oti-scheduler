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
    schedule: (htmlContent) => {
      console.log('🖨️ [PRELOAD DEBUG] Print schedule called with content length:', htmlContent?.length || 0);
      console.log('🖨️ [PRELOAD DEBUG] Platform:', process.platform);
      console.log('🖨️ [PRELOAD DEBUG] About to invoke print:schedule IPC');

      const result = ipcRenderer.invoke('print:schedule', htmlContent);
      console.log('🖨️ [PRELOAD DEBUG] IPC invoke returned:', result);
      return result;
    },
    checkPrinters: () => {
      console.log('🖨️ [PRELOAD DEBUG] Checking printers...');
      return ipcRenderer.invoke('print:checkPrinters');
    }
  }
});

// Optional: Add some app-specific context
contextBridge.exposeInMainWorld('appContext', {
  isElectron: true,
  appName: 'ניהול לוח זמנים לגני תקשורת',
  version: '1.0.0'
});

console.log('🖨️ [PRELOAD DEBUG] Preload script loaded successfully');

// Add verification after contextBridge exposure
setTimeout(() => {
  console.log('🖨️ [PRELOAD DEBUG] electronAPI available:', !!window.electronAPI);
  console.log('🖨️ [PRELOAD DEBUG] electronAPI.print available:', !!window.electronAPI?.print);

  // Add test functions to the global scope for debugging
  window.testPrint = () => {
    console.log('🖨️ [TEST] Testing print functionality...');
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Test</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Print Test</h1>
          <p>This is a test print from the Electron app.</p>
          <p>Platform: ${window.electronAPI?.platform || 'unknown'}</p>
          <p>Time: ${new Date().toLocaleString()}</p>
        </body>
      </html>
    `;

    if (window.electronAPI && window.electronAPI.print) {
      window.electronAPI.print.schedule(testHtml)
        .then(result => {
          console.log('🖨️ [TEST] Print test result:', result);
        })
        .catch(error => {
          console.error('🖨️ [TEST] Print test error:', error);
        });
    } else {
      console.error('🖨️ [TEST] electronAPI.print not available');
    }
  };

  window.checkPrinters = () => {
    console.log('🖨️ [TEST] Checking available printers...');
    if (window.electronAPI && window.electronAPI.print && window.electronAPI.print.checkPrinters) {
      window.electronAPI.print.checkPrinters()
        .then(result => {
          console.log('🖨️ [TEST] Printer check result:', result);
          if (result.success) {
            console.log(`🖨️ [TEST] Found ${result.count} printers on ${result.platform}:`);
            result.printers.forEach((printer, index) => {
              console.log(`🖨️ [TEST] Printer ${index + 1}:`, printer);
            });
          } else {
            console.error('🖨️ [TEST] Printer check failed:', result.error);
          }
        })
        .catch(error => {
          console.error('🖨️ [TEST] Printer check error:', error);
        });
    } else {
      console.error('🖨️ [TEST] electronAPI.print.checkPrinters not available');
    }
  };

  console.log('🖨️ [PRELOAD DEBUG] Test functions added:');
  console.log('🖨️ [PRELOAD DEBUG] - Call window.testPrint() to test printing');
  console.log('🖨️ [PRELOAD DEBUG] - Call window.checkPrinters() to check available printers');
}, 100);
