import { generatePKCE, buildAuthUrl, exchangeCodeForTokens } from '../utils/pkce';

export interface ElectronAuthResult {
  success: boolean;
  auth?: {
    accessToken: string;
    refreshToken?: string;
    expiryDate: number;
    userInfo: {
      id: string;
      email: string;
      name: string;
      picture?: string;
    };
  };
  error?: string;
  message?: string;
}

/**
 * Electron-specific authentication service using PKCE flow
 * This avoids the need for client secrets in the desktop app
 */
class ElectronAuthService {
  private readonly STORAGE_KEY = 'electron_google_auth_data';
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  /**
   * Check if we're running in Electron
   */
  private isElectron(): boolean {
    return !!(window as any).electronAPI || navigator.userAgent.toLowerCase().includes('electron');
  }

  /**
   * Get client ID from environment
   */
  private getClientIdFromEnv(): string {
    // In Electron, this would be injected by the main process
    // For now, we'll get it from the server
    return process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
  }

  /**
   * Start PKCE authentication flow
   */
  async authenticate(): Promise<ElectronAuthResult> {
    if (!this.isElectron()) {
      return {
        success: false,
        error: 'Not running in Electron',
        message: 'This auth method is only for Electron apps'
      };
    }

    try {
      // Generate PKCE parameters
      const pkce = await generatePKCE();
      
      // Store code verifier for later use
      sessionStorage.setItem('pkce_code_verifier', pkce.codeVerifier);
      
      // Get client ID (we'll need to fetch this from server or config)
      const clientId = await this.getClientId();
      const redirectUri = 'http://localhost:8080/callback';
      
      // Build authorization URL
      const authUrl = buildAuthUrl({
        clientId,
        redirectUri,
        codeChallenge: pkce.codeChallenge,
        codeChallengeMethod: pkce.codeChallengeMethod,
        scopes: this.SCOPES,
        state: 'electron-auth'
      });

      // Open authorization URL in external browser
      await this.openExternalBrowser(authUrl);
      
      // Start local server to handle callback
      const authCode = await this.waitForCallback();
      
      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens({
        clientId,
        redirectUri,
        code: authCode,
        codeVerifier: pkce.codeVerifier
      });

      // Get user info
      const userInfo = await this.getUserInfo(tokens.access_token);
      
      // Create auth object
      const auth = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: Date.now() + (tokens.expires_in * 1000),
        userInfo
      };

      // Store auth data
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(auth));
      
      return { success: true, auth };

    } catch (error) {
      console.error('Electron auth error:', error);
      return {
        success: false,
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get client ID from server configuration
   */
  private async getClientId(): Promise<string> {
    try {
      const response = await fetch('/api/google/desktop-client-id');
      const data = await response.json();
      return data.clientId;
    } catch (error) {
      throw new Error('Failed to get Google client ID');
    }
  }

  /**
   * Open URL in external browser
   */
  private async openExternalBrowser(url: string): Promise<void> {
    if ((window as any).electronAPI?.openExternal) {
      await (window as any).electronAPI.openExternal(url);
    } else {
      // Fallback for development
      window.open(url, '_blank');
    }
  }

  /**
   * Start local server and wait for OAuth callback
   */
  private async waitForCallback(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create a temporary server to handle the callback
      const server = new EventSource('/api/google/electron-callback-stream');
      
      server.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'auth_code') {
          server.close();
          resolve(data.code);
        } else if (data.type === 'error') {
          server.close();
          reject(new Error(data.message));
        }
      };

      server.onerror = () => {
        server.close();
        reject(new Error('Failed to receive auth callback'));
      };

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(new Error('Authentication timeout'));
      }, 300000);
    });
  }

  /**
   * Get user information from Google
   */
  private async getUserInfo(accessToken: string): Promise<{
    id: string;
    email: string;
    name: string;
    picture?: string;
  }> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return response.json();
  }

  /**
   * Get stored authentication data
   */
  getStoredAuth(): any {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return null;

    try {
      const auth = JSON.parse(stored);
      
      // Check if token is still valid
      if (auth.expiryDate && Date.now() >= auth.expiryDate) {
        this.removeStoredAuth();
        return null;
      }

      return auth;
    } catch (error) {
      console.error('Error parsing stored auth:', error);
      this.removeStoredAuth();
      return null;
    }
  }

  /**
   * Remove stored authentication data
   */
  removeStoredAuth(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    sessionStorage.removeItem('pkce_code_verifier');
  }

  /**
   * Check authentication status
   */
  async getAuthStatus(): Promise<{ isAuthenticated: boolean; userInfo?: any }> {
    const auth = this.getStoredAuth();
    return {
      isAuthenticated: !!auth,
      userInfo: auth?.userInfo
    };
  }
}

export default new ElectronAuthService();
