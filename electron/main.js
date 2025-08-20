const { app, BrowserWindow, dialog, Menu, ipcMain } = require('electron');
const path = require('path');
const { startEmbeddedServer, stopEmbeddedServer } = require('./server');
const AppUpdater = require('./updater');
const { SecureConfigManager } = require('./secure-config');
const isDev = process.env.NODE_ENV === 'development';

// Initialize secure config for Electron
const secureConfig = new SecureConfigManager();

// Keep a global reference of the window object
let mainWindow;
let updater;

// Server management is handled by server.js module

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance is already running. Quitting this instance.');
  app.quit();
} else {
  console.log('Successfully acquired single instance lock. This is the primary instance.');
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('Second instance detected. Focusing the primary window.');
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  const createWindow = async () => {
    try {
      // Set up secure environment for server
      const serverEnv = secureConfig.getServerEnvironment();
      Object.assign(process.env, serverEnv);

      // Optionally enable Chromium logging when requested
      if (process.env.ELECTRON_ENABLE_LOGGING === '1') {
        app.commandLine.appendSwitch('enable-logging');
      }

      // Create the browser window
      mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          enableRemoteModule: false,
          preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'icons', process.platform === 'win32' ? 'oti-icon.ico' : 'oti-icon.png'),
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        show: false // Don't show until ready
      });

      // Start the embedded server in the background (do not block the UI)
      startEmbeddedServer().catch((error) => {
        console.error('Embedded server failed to start:', error);
        dialog.showErrorBox('Server Startup Error', `Failed to start the embedded server.\n${error?.message || error}`);
      });

      // Load the React app
      if (isDev) {
        const devUrl = 'http://localhost:3000';
        console.log('Loading URL (dev):', devUrl);
        await mainWindow.loadURL(devUrl);
      } else {
        const indexHtml = path.join(__dirname, '..', 'client', 'build', 'index.html');
        console.log('Loading file (prod):', indexHtml);
        await mainWindow.loadFile(indexHtml);
      }

      // Show window when ready
      mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Initialize updater
        updater = new AppUpdater();
        updater.setMainWindow(mainWindow);
        
        // Check for updates on startup (after a delay)
        setTimeout(() => {
          updater.checkForUpdates();
        }, 5000);
        
        // Open DevTools in development
        if (isDev) {
          mainWindow.webContents.openDevTools();
        }
      });

      // Extra diagnostics for renderer problems
      mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        console.error('did-fail-load', { errorCode, errorDescription, validatedURL, isMainFrame });
        if (!mainWindow.isVisible()) {
          mainWindow.show();
        }
      });
      mainWindow.webContents.on('render-process-gone', (event, details) => {
        console.error('render-process-gone', details);
      });
      mainWindow.webContents.on('unresponsive', () => {
        console.error('window unresponsive');
      });

      // Fallback: ensure we show something even if 'ready-to-show' never fires
      setTimeout(() => {
        if (mainWindow && !mainWindow.isVisible()) {
          console.warn('Forcing window to show after timeout');
          try { mainWindow.show(); } catch {}
        }
      }, 15000);

      // Handle window closed
      mainWindow.on('closed', () => {
        mainWindow = null;
      });

      // Handle external links
      mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
      });

      // Set up application menu
      createApplicationMenu();

    } catch (error) {
      console.error('Error during application startup:', error);
      dialog.showErrorBox('Startup Error', `Failed to start application: ${error.message}. Please ensure the server can start successfully.`);
      app.quit();
    }
  };

  // Setup IPC handlers for printing
  ipcMain.handle('print:schedule', async (event, htmlContent) => {
    console.log('🖨️ [ELECTRON PRINT DEBUG] Print handler called');
    console.log('🖨️ [ELECTRON PRINT DEBUG] HTML content length:', htmlContent?.length || 0);
    
    try {
      console.log('🖨️ [ELECTRON PRINT DEBUG] Creating print window...');
      // Create a new hidden window for printing
      const printWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      console.log('🖨️ [ELECTRON PRINT DEBUG] Print window created, loading HTML content...');
      // Load the HTML content
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      console.log('🖨️ [ELECTRON PRINT DEBUG] Waiting for content to finish loading...');
      // Wait for content to be ready
      await new Promise(resolve => {
        printWindow.webContents.once('did-finish-load', () => {
          console.log('🖨️ [ELECTRON PRINT DEBUG] Content finished loading');
          resolve();
        });
      });

      console.log('🖨️ [ELECTRON PRINT DEBUG] Starting print operation...');
      // Print silently (will show system print dialog)
      await printWindow.webContents.print({
        silent: false, // Show print dialog
        printBackground: true,
        margins: {
          marginType: 'minimum'
        }
      });

      console.log('🖨️ [ELECTRON PRINT DEBUG] Print operation completed, closing window...');
      // Close the print window
      printWindow.close();
      
      console.log('🖨️ [ELECTRON PRINT DEBUG] Print process completed successfully');
      return { success: true };
    } catch (error) {
      console.error('🖨️ [ELECTRON PRINT DEBUG] Print error:', error);
      console.error('🖨️ [ELECTRON PRINT DEBUG] Error stack:', error.stack);
      return { success: false, error: error.message };
    }
  });

  // App event handlers
  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    // Stop embedded server
    stopEmbeddedServer();
    
    // On macOS, keep app running even when all windows are closed
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

app.on('before-quit', () => {
  // Clean up server process
  stopEmbeddedServer();
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    require('electron').shell.openExternal(navigationUrl);
  });
});

// Application menu
const createApplicationMenu = () => {
  const template = [
    {
      label: 'OTI Scheduler',
      submenu: [
        {
          label: 'אודות OTI Scheduler',
          role: 'about'
        },
        {
          label: 'בדוק עדכונים...',
          click: () => {
            if (updater) {
              updater.checkForUpdatesManual();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'העדפות...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            // TODO: Open preferences window
            console.log('Preferences clicked');
          }
        },
        { type: 'separator' },
        {
          label: 'הסתר OTI Scheduler',
          accelerator: 'CmdOrCtrl+H',
          role: 'hide'
        },
        {
          label: 'הסתר אחרים',
          accelerator: 'CmdOrCtrl+Shift+H',
          role: 'hideothers'
        },
        {
          label: 'הצג הכל',
          role: 'unhide'
        },
        { type: 'separator' },
        {
          label: 'יציאה',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'עריכה',
      submenu: [
        {
          label: 'בטל',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: 'חזור',
          accelerator: 'Shift+CmdOrCtrl+Z',
          role: 'redo'
        },
        { type: 'separator' },
        {
          label: 'גזור',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: 'העתק',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: 'הדבק',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: 'בחר הכל',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall'
        }
      ]
    },
    {
      label: 'תצוגה',
      submenu: [
        {
          label: 'טען מחדש',
          accelerator: 'CmdOrCtrl+R',
          click: (item, focusedWindow) => {
            if (focusedWindow) focusedWindow.reload();
          }
        },
        {
          label: 'טען מחדש כורח',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: (item, focusedWindow) => {
            if (focusedWindow) focusedWindow.webContents.reloadIgnoringCache();
          }
        },
        {
          label: 'כלי פיתוח',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: (item, focusedWindow) => {
            if (focusedWindow) focusedWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        {
          label: 'זום בפועל',
          accelerator: 'CmdOrCtrl+0',
          role: 'resetzoom'
        },
        {
          label: 'זום פנימה',
          accelerator: 'CmdOrCtrl+Plus',
          role: 'zoomin'
        },
        {
          label: 'זום החוצה',
          accelerator: 'CmdOrCtrl+-',
          role: 'zoomout'
        },
        { type: 'separator' },
        {
          label: 'מסך מלא',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
          role: 'togglefullscreen'
        }
      ]
    },
    {
      label: 'חלון',
      submenu: [
        {
          label: 'מזער',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize'
        },
        {
          label: 'סגור',
          accelerator: 'CmdOrCtrl+W',
          role: 'close'
        }
      ]
    },
    {
      label: 'עזרה',
      submenu: [
        {
          label: 'מדריך למשתמש',
          click: () => {
            require('electron').shell.openExternal('https://github.com/ygaller/oti-scheduler/blob/master/ELECTRON.md');
          }
        },
        {
          label: 'דווח על בעיה',
          click: () => {
            require('electron').shell.openExternal('https://github.com/ygaller/oti-scheduler/issues');
          }
        },
        { type: 'separator' },
        {
          label: 'אודות המערכת',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'אודות המערכת',
              message: 'OTI Scheduler',
              detail: `גרסה: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode.js: ${process.versions.node}\nChrome: ${process.versions.chrome}\nפלטפורמה: ${process.platform}`,
              buttons: ['אישור']
            });
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    // First menu should be the app name on macOS
    template[0].label = app.getName();
    
    // Add Window menu with macOS specific items
    template[3].submenu.push(
      { type: 'separator' },
      {
        label: 'הבא לחזית',
        role: 'front'
      }
    );
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};
