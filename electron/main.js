const { app, BrowserWindow, dialog, Menu } = require('electron');
const path = require('path');
const { startEmbeddedServer, stopEmbeddedServer } = require('./server');
const AppUpdater = require('./updater');
const isDev = process.env.NODE_ENV === 'development';

// Keep a global reference of the window object
let mainWindow;
let updater;

// Server management is handled by server.js module

const createWindow = async () => {
  try {
    // Start the server first
    await startEmbeddedServer();

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
      icon: path.join(__dirname, 'icons', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      show: false // Don't show until ready
    });

    // Load the React app
    const startUrl = isDev 
      ? 'http://localhost:3000' 
      : `file://${path.join(__dirname, '..', 'client', 'build', 'index.html')}`;
    
    console.log('Loading URL:', startUrl);
    await mainWindow.loadURL(startUrl);

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
    console.error('Error creating window:', error);
    dialog.showErrorBox('Startup Error', `Failed to start application: ${error.message}`);
    app.quit();
  }
};

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
