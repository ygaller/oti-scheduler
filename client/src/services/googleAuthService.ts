import { StoredGoogleAuth, GoogleAuthStatus, GoogleAuthResponse, GoogleConfigStatus } from '../types/google';

class GoogleAuthService {
  private readonly STORAGE_KEY = 'google_auth_data';
  private readonly API_BASE = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/google`;

  /**
   * Check if Google OAuth is configured on the server
   */
  async checkConfiguration(): Promise<GoogleConfigStatus> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/status`);
      if (!response.ok) {
        throw new Error('Failed to check Google configuration');
      }
      return await response.json();
    } catch (error) {
      console.error('Error checking Google configuration:', error);
      return { isConfigured: false, hasCredentials: false };
    }
  }

  /**
   * Start OAuth flow by getting authorization URL
   */
  async startAuthFlow(): Promise<string> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/url`);
      if (!response.ok) {
        throw new Error('Failed to get authorization URL');
      }
      const data = await response.json();
      return data.authUrl;
    } catch (error) {
      console.error('Error starting auth flow:', error);
      throw new Error('Failed to start Google authentication');
    }
  }

  /**
   * Handle OAuth callback with authorization code
   */
  async handleAuthCallback(code: string): Promise<GoogleAuthResponse> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Authentication failed',
          message: data.message
        };
      }

      // Store the authentication data
      if (data.auth) {
        await this.storeAuth(data.auth);
      }

      return {
        success: true,
        auth: data.auth
      };
    } catch (error) {
      console.error('Error handling auth callback:', error);
      return {
        success: false,
        error: 'Network error during authentication',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get current authentication status
   */
  async getAuthStatus(): Promise<GoogleAuthStatus> {
    try {
      const storedAuth = await this.getStoredAuth();
      
      if (!storedAuth) {
        return { isAuthenticated: false };
      }

      // Check if token is expired (with 5 minute buffer)
      const now = Date.now();
      const buffer = 5 * 60 * 1000; // 5 minutes
      
      if (storedAuth.expiryDate - buffer < now && storedAuth.refreshToken) {
        // Try to refresh the token
        const refreshResult = await this.refreshToken();
        if (refreshResult.success && refreshResult.auth) {
          return {
            isAuthenticated: true,
            userInfo: refreshResult.auth.userInfo,
            expiryDate: refreshResult.auth.expiryDate
          };
        } else {
          // Refresh failed, remove stored auth
          await this.removeAuth();
          return { isAuthenticated: false };
        }
      } else if (storedAuth.expiryDate < now) {
        // Token expired and no refresh token
        await this.removeAuth();
        return { isAuthenticated: false };
      }

      return {
        isAuthenticated: true,
        userInfo: storedAuth.userInfo,
        expiryDate: storedAuth.expiryDate
      };
    } catch (error) {
      console.error('Error getting auth status:', error);
      return { isAuthenticated: false };
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<GoogleAuthResponse> {
    try {
      const storedAuth = await this.getStoredAuth();
      
      if (!storedAuth || !storedAuth.refreshToken) {
        return {
          success: false,
          error: 'No refresh token available'
        };
      }

      const response = await fetch(`${this.API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: storedAuth.refreshToken,
          userInfo: storedAuth.userInfo
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Token refresh failed',
          message: data.message
        };
      }

      // Store the updated authentication data
      if (data.auth) {
        await this.storeAuth(data.auth);
      }

      return {
        success: true,
        auth: data.auth
      };
    } catch (error) {
      console.error('Error refreshing token:', error);
      return {
        success: false,
        error: 'Network error during token refresh',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Logout and remove stored authentication
   */
  async logout(): Promise<void> {
    try {
      // Call server logout endpoint
      await fetch(`${this.API_BASE}/auth/logout`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error calling logout endpoint:', error);
    } finally {
      // Always remove local storage
      await this.removeAuth();
    }
  }

  /**
   * Get valid access token (refreshing if necessary)
   */
  async getValidAccessToken(): Promise<string | null> {
    const authStatus = await this.getAuthStatus();
    
    if (!authStatus.isAuthenticated) {
      return null;
    }

    const storedAuth = await this.getStoredAuth();
    return storedAuth?.accessToken || null;
  }

  /**
   * Get stored authentication data (public method for other services)
   */
  async getStoredAuthData(): Promise<StoredGoogleAuth | null> {
    return await this.getStoredAuth();
  }

  /**
   * Store authentication data securely
   */
  private async storeAuth(auth: StoredGoogleAuth): Promise<void> {
    try {
      // Check if running in Electron
      if (window.electronAPI && window.electronAPI.secureStorage) {
        await window.electronAPI.secureStorage.set(this.STORAGE_KEY, JSON.stringify(auth));
      } else {
        // Fallback to localStorage for web
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(auth));
      }
    } catch (error) {
      console.error('Error storing auth data:', error);
      // Fallback to localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(auth));
    }
  }

  /**
   * Get stored authentication data
   */
  private async getStoredAuth(): Promise<StoredGoogleAuth | null> {
    try {
      let authData: string | null = null;

      // Check if running in Electron
      if (window.electronAPI && window.electronAPI.secureStorage) {
        authData = await window.electronAPI.secureStorage.get(this.STORAGE_KEY);
      } else {
        // Fallback to localStorage for web
        authData = localStorage.getItem(this.STORAGE_KEY);
      }

      if (!authData) {
        return null;
      }

      return JSON.parse(authData);
    } catch (error) {
      console.error('Error getting stored auth data:', error);
      return null;
    }
  }

  /**
   * Remove stored authentication data
   */
  private async removeAuth(): Promise<void> {
    try {
      // Check if running in Electron
      if (window.electronAPI && window.electronAPI.secureStorage) {
        await window.electronAPI.secureStorage.remove(this.STORAGE_KEY);
      } else {
        // Fallback to localStorage for web
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error removing auth data:', error);
      // Fallback to localStorage
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Open OAuth popup window for authentication
   */
  async authenticateWithPopup(): Promise<GoogleAuthResponse> {
    try {
      const authUrl = await this.startAuthFlow();
      
      return new Promise((resolve, reject) => {
        // Create popup window
        const popup = window.open(
          authUrl,
          'google-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          reject(new Error('Failed to open popup window. Please check popup blocker settings.'));
          return;
        }

        // Listen for messages from popup
        const messageListener = async (event: MessageEvent) => {
          console.log('Received message from popup:', event.data, 'from origin:', event.origin);
          
          if (event.origin !== window.location.origin) {
            console.log('Message from different origin, ignoring');
            return;
          }

          if (event.data.type === 'GOOGLE_AUTH_SUCCESS' && event.data.code) {
            console.log('Google auth success, processing code:', event.data.code);
            window.removeEventListener('message', messageListener);
            clearInterval(checkClosed); // Clear the popup closed check
            popup.close();

            try {
              const result = await this.handleAuthCallback(event.data.code);
              console.log('Auth callback result:', result);
              resolve(result);
            } catch (error) {
              console.error('Error in auth callback:', error);
              reject(error);
            }
          } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
            console.error('Google auth error:', event.data.error);
            window.removeEventListener('message', messageListener);
            clearInterval(checkClosed); // Clear the popup closed check
            popup.close();
            reject(new Error(event.data.error || 'Authentication failed'));
          }
        };

        window.addEventListener('message', messageListener);

        // Check if popup was closed without authentication
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageListener);
            reject(new Error('Authentication was cancelled'));
          }
        }, 1000);
      });
    } catch (error) {
      console.error('Error in popup authentication:', error);
      throw error;
    }
  }
}

// Create singleton instance
const googleAuthService = new GoogleAuthService();
export default googleAuthService;
