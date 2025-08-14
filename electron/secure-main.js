const { app, ipcMain, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');

class SecureStorageManager {
  constructor() {
    this.storageDir = path.join(app.getPath('userData'), 'secure');
    this.ensureStorageDir();
    this.checkEncryptionAvailability();
    this.setupIpcHandlers();
  }

  checkEncryptionAvailability() {
    console.log('Platform:', process.platform);
    console.log('Encryption available:', safeStorage.isEncryptionAvailable());
    
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('Safe storage encryption not available on this system');
      console.warn('Falling back to basic file storage (less secure)');
    }
  }

  ensureStorageDir() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  setupIpcHandlers() {
    // Set encrypted item
    ipcMain.handle('secure-storage-set', async (event, key, value) => {
      try {
        const filePath = path.join(this.storageDir, `${key}.enc`);
        
        if (safeStorage.isEncryptionAvailable()) {
          // Use OS-level encryption (Windows Credential Manager, macOS Keychain, Linux Secret Service)
          const encrypted = safeStorage.encryptString(value);
          fs.writeFileSync(filePath, encrypted);
        } else {
          // Fallback: Basic file storage with restricted permissions
          console.warn(`Storing ${key} without encryption (platform limitation)`);
          fs.writeFileSync(filePath, value, { mode: 0o600 }); // User-only access
        }
        return true;
      } catch (error) {
        console.error('Secure storage set error:', error);
        throw error;
      }
    });

    // Get encrypted item
    ipcMain.handle('secure-storage-get', async (event, key) => {
      try {
        const filePath = path.join(this.storageDir, `${key}.enc`);
        
        if (!fs.existsSync(filePath)) {
          return null;
        }

        if (safeStorage.isEncryptionAvailable()) {
          // Decrypt using OS-level encryption
          const encrypted = fs.readFileSync(filePath);
          const decrypted = safeStorage.decryptString(encrypted);
          return decrypted;
        } else {
          // Fallback: Read plain text (still better than localStorage)
          const content = fs.readFileSync(filePath, 'utf8');
          return content;
        }
      } catch (error) {
        console.error('Secure storage get error:', error);
        return null;
      }
    });

    // Remove encrypted item
    ipcMain.handle('secure-storage-remove', async (event, key) => {
      try {
        const filePath = path.join(this.storageDir, `${key}.enc`);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        return true;
      } catch (error) {
        console.error('Secure storage remove error:', error);
        throw error;
      }
    });
  }
}

module.exports = { SecureStorageManager };
