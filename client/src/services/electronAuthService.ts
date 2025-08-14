// Electron-specific secure authentication service
export class ElectronAuthService {
  private static readonly TOKEN_KEY = 'scheduling_auth_token';
  private static readonly USER_KEY = 'scheduling_auth_user';

  // Check if we're in Electron
  private static isElectron(): boolean {
    return window.navigator.userAgent.toLowerCase().includes('electron');
  }

  // Store token securely using Electron's safeStorage
  static async setToken(token: string): Promise<void> {
    if (!this.isElectron()) {
      localStorage.setItem(this.TOKEN_KEY, token);
      return;
    }

    try {
      // Use Electron's secure storage via IPC
      await window.electronAPI?.secureStorage.setItem(this.TOKEN_KEY, token);
    } catch (error) {
      console.warn('Secure storage failed, falling back to localStorage:', error);
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  // Get token securely
  static async getToken(): Promise<string | null> {
    if (!this.isElectron()) {
      return localStorage.getItem(this.TOKEN_KEY);
    }

    try {
      // Use Electron's secure storage via IPC
      return await window.electronAPI?.secureStorage.getItem(this.TOKEN_KEY) || null;
    } catch (error) {
      console.warn('Secure storage failed, falling back to localStorage:', error);
      return localStorage.getItem(this.TOKEN_KEY);
    }
  }

  // Store user data (less sensitive, can use localStorage)
  static setUser(user: any): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  // Get user data
  static getUser(): any | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  // Clear all auth data
  static async clearAuth(): Promise<void> {
    localStorage.removeItem(this.USER_KEY);
    
    if (!this.isElectron()) {
      localStorage.removeItem(this.TOKEN_KEY);
      return;
    }

    try {
      await window.electronAPI?.secureStorage.removeItem(this.TOKEN_KEY);
    } catch (error) {
      console.warn('Secure storage failed, falling back to localStorage:', error);
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }
}

// Global types for Electron APIs
declare global {
  interface Window {
    electronAPI?: {
      secureStorage: {
        setItem: (key: string, value: string) => Promise<void>;
        getItem: (key: string) => Promise<string | null>;
        removeItem: (key: string) => Promise<void>;
      };
    };
  }
}
