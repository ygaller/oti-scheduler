import { api } from './api';
import { ElectronAuthService } from './electronAuthService';

export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

class AuthService {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly USER_KEY = 'auth_user';

  // Get stored token (async for secure storage)
  async getToken(): Promise<string | null> {
    return await ElectronAuthService.getToken();
  }

  // Get stored user
  getUser(): User | null {
    return ElectronAuthService.getUser();
  }

  // Check if user is authenticated (async for secure storage)
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    const user = this.getUser();
    return token !== null && user !== null;
  }

  // Store authentication data (async for secure storage)
  async setAuthData(token: string, user: User): Promise<void> {
    await ElectronAuthService.setToken(token);
    ElectronAuthService.setUser(user);
  }

  // Clear authentication data (async for secure storage)
  private async clearAuthData(): Promise<void> {
    await ElectronAuthService.clearAuth();
  }

  // Verify current session with server
  async verifySession(): Promise<User | null> {
    const token = await this.getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const user = await response.json();
        return user;
      } else {
        this.clearAuthData();
        return null;
      }
    } catch (error) {
      console.error('Session verification failed:', error);
      this.clearAuthData();
      return null;
    }
  }

  // Login with Google (using popup only - more reliable)
  async loginWithGoogle(): Promise<User> {
    return new Promise((resolve, reject) => {
      // Direct popup approach - more reliable than One Tap
      this.showGooglePopup(resolve, reject);
    });
  }

  private showGooglePopup(resolve: (user: User) => void, reject: (error: Error) => void): void {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      reject(new Error('Google Client ID not configured. Please add REACT_APP_GOOGLE_CLIENT_ID to your .env file.'));
      return;
    }

    // Check if we're in Electron
    const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
    
    let redirectUri;
    const isHttps = window.location.protocol === 'https:';
    
    if (isElectron) {
      // For Electron, use localhost redirect
      redirectUri = isHttps ? 'https://localhost:3000/auth/callback' : 'http://localhost:3000/auth/callback';
    } else {
      // For web, use the current origin
      redirectUri = window.location.origin + '/auth/callback';
    }

    const authUrl = new URL('https://accounts.google.com/oauth/authorize');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'openid email profile');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', Date.now().toString()); // CSRF protection

    const popup = window.open(
      authUrl.toString(),
      'google-login',
      'width=500,height=600,scrollbars=yes,resizable=yes,status=1,menubar=0,toolbar=0,noopener=false,noreferrer=false'
    );

    // Set a timeout to avoid hanging forever
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('focus', handleWindowFocus);
      popup?.close();
      reject(new Error('Login timeout - please try again'));
    }, 120000); // 2 minutes timeout

    // Alternative detection method - window focus indicates user might have closed popup
    let focusCheckInterval: NodeJS.Timeout | null = null;
    const handleWindowFocus = () => {
      // When parent window regains focus, assume popup might be closed
      // Set a timeout to check if we receive a message soon
      if (focusCheckInterval) clearTimeout(focusCheckInterval);
      focusCheckInterval = setTimeout(() => {
        // If no message received within 2 seconds of focus, assume popup was closed
        clearTimeout(timeout);
        window.removeEventListener('message', handleMessage);
        window.removeEventListener('focus', handleWindowFocus);
        reject(new Error('Login popup appears to have been closed'));
      }, 2000);
    };
    
    window.addEventListener('focus', handleWindowFocus);

    // Listen for the popup to send us the auth code
    const handleMessage = async (event: MessageEvent) => {
      // Accept messages from localhost (for Electron) or same origin (for web)
      const validOrigins = [
        window.location.origin, 
        'http://localhost:3000', 
        'https://localhost:3000'
      ];
      if (!validOrigins.includes(event.origin)) return;
      
      // Cancel focus timeout since we received a message
      if (focusCheckInterval) clearTimeout(focusCheckInterval);
      
      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        clearTimeout(timeout);
        if (focusCheckInterval) clearTimeout(focusCheckInterval);
        popup?.close();
        window.removeEventListener('message', handleMessage);
        window.removeEventListener('focus', handleWindowFocus);
        
        try {
          const authResponse = await api.post<AuthResponse>('/auth/google', {
            code: event.data.code
          });

          this.setAuthData(authResponse.token, authResponse.user);
          resolve(authResponse.user);
        } catch (error) {
          reject(error as Error);
        }
      } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        clearTimeout(timeout);
        if (focusCheckInterval) clearTimeout(focusCheckInterval);
        popup?.close();
        window.removeEventListener('message', handleMessage);
        window.removeEventListener('focus', handleWindowFocus);
        reject(new Error(event.data.error));
      }
    };

    window.addEventListener('message', handleMessage);
  }

  // Logout
  async logout(): Promise<void> {
    const token = await this.getToken();
    
    try {
      if (token) {
        await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthData();
    }
  }
}

// No longer needed - removed Google Identity Services

export const authService = new AuthService();
