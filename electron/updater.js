const { autoUpdater } = require('electron-updater');
const { dialog, BrowserWindow } = require('electron');
const isDev = process.env.NODE_ENV === 'development';

class AppUpdater {
  constructor() {
    this.mainWindow = null;
    this.updateAvailable = false;
    this.downloadInProgress = false;
    
    if (!isDev) {
      // this.init(); // The auto-updater will only work with a public repo
    }
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  init() {
    // Configure auto-updater
    autoUpdater.autoDownload = false; // Don't auto-download, ask user first
    autoUpdater.allowPrerelease = false;
    autoUpdater.allowDowngrade = false;

    // Auto-updater events
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for updates...');
      this.sendToRenderer('update-checking');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info.version);
      this.updateAvailable = true;
      this.sendToRenderer('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate
      });
      this.showUpdateDialog(info);
    });

    autoUpdater.on('update-not-available', () => {
      console.log('No updates available');
      this.sendToRenderer('update-not-available');
    });

    autoUpdater.on('error', (error) => {
      console.error('Update error:', error);
      this.sendToRenderer('update-error', error.message);
      this.showErrorDialog(error);
    });

    autoUpdater.on('download-progress', (progress) => {
      console.log(`Download progress: ${Math.round(progress.percent)}%`);
      this.sendToRenderer('update-download-progress', {
        percent: Math.round(progress.percent),
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info.version);
      this.downloadInProgress = false;
      this.sendToRenderer('update-downloaded', {
        version: info.version
      });
      this.showRestartDialog(info);
    });
  }

  async checkForUpdates() {
    if (isDev) {
      console.log('Skipping update check in development mode');
      return;
    }

    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }

  async downloadUpdate() {
    if (!this.updateAvailable || this.downloadInProgress) {
      return;
    }

    this.downloadInProgress = true;
    this.sendToRenderer('update-download-started');
    
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('Failed to download update:', error);
      this.downloadInProgress = false;
      this.sendToRenderer('update-error', error.message);
    }
  }

  quitAndInstall() {
    autoUpdater.quitAndInstall(false, true);
  }

  showUpdateDialog(info) {
    if (!this.mainWindow) return;

    const options = {
      type: 'info',
      title: 'עדכון זמין',
      message: `גרסה חדשה ${info.version} זמינה להורדה`,
      detail: 'האם תרצה להוריד ולהתקין את העדכון?',
      buttons: ['הורד עכשיו', 'הזכר לי מאוחר יותר', 'דלג על עדכון זה'],
      defaultId: 0,
      cancelId: 1
    };

    dialog.showMessageBox(this.mainWindow, options).then((response) => {
      if (response.response === 0) {
        // Download now
        this.downloadUpdate();
      } else if (response.response === 2) {
        // Skip this version
        console.log('User chose to skip this version');
        this.sendToRenderer('update-skipped', { version: info.version });
      }
      // Option 1 (remind later) does nothing
    });
  }

  showRestartDialog(info) {
    if (!this.mainWindow) return;

    const options = {
      type: 'info',
      title: 'עדכון מוכן להתקנה',
      message: `גרסה ${info.version} הורדה בהצלחה`,
      detail: 'האפליקציה תופעל מחדש כדי להשלים את העדכון.',
      buttons: ['הפעל מחדש עכשיו', 'הפעל מחדש מאוחר יותר'],
      defaultId: 0,
      cancelId: 1
    };

    dialog.showMessageBox(this.mainWindow, options).then((response) => {
      if (response.response === 0) {
        this.quitAndInstall();
      }
    });
  }

  showErrorDialog(error) {
    if (!this.mainWindow) return;

    dialog.showErrorBox(
      'שגיאה בעדכון',
      `לא ניתן היה לבדוק עדכונים:\n${error.message}`
    );
  }

  sendToRenderer(channel, data = null) {
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  // Manual update check (called from menu or user action)
  async checkForUpdatesManual() {
    if (isDev) {
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'מצב פיתוח',
        message: 'בדיקת עדכונים לא זמינה במצב פיתוח',
        buttons: ['אישור']
      });
      return;
    }

    try {
      const result = await autoUpdater.checkForUpdates();
      if (!result || !result.updateInfo) {
        dialog.showMessageBox(this.mainWindow, {
          type: 'info',
          title: 'אין עדכונים',
          message: 'אתה משתמש בגרסה העדכנית ביותר',
          buttons: ['אישור']
        });
      }
    } catch (error) {
      this.showErrorDialog(error);
    }
  }
}

module.exports = AppUpdater;
