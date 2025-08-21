import { OAuth2Client } from 'google-auth-library';
import { GoogleTokenData, GoogleUserInfo, StoredGoogleAuth, GoogleAuthStatus } from '../types/google';

class GoogleAuthService {
  private oauth2Client: OAuth2Client;
  private readonly scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI_WEB || 'http://localhost:3000/auth/google/callback';

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials are not configured');
    }

    this.oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  generateAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      prompt: 'consent', // Force consent to ensure we get refresh token
      include_granted_scopes: true
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleTokenData> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens.access_token) {
        throw new Error('No access token received from Google');
      }

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || undefined,
        expires_in: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
        token_type: 'Bearer',
        scope: tokens.scope || this.scopes.join(' '),
        id_token: tokens.id_token || undefined
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Get user information from Google
   */
  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      
      const userInfoResponse = await this.oauth2Client.request({
        url: 'https://www.googleapis.com/oauth2/v2/userinfo'
      });

      const userData = userInfoResponse.data as any;
      
      return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        given_name: userData.given_name,
        family_name: userData.family_name
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      throw new Error('Failed to get user information from Google');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleTokenData> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      if (!credentials.access_token) {
        throw new Error('No access token received during refresh');
      }

      return {
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token || refreshToken, // Keep original if new one not provided
        expires_in: credentials.expiry_date ? Math.floor((credentials.expiry_date - Date.now()) / 1000) : 3600,
        token_type: 'Bearer',
        scope: credentials.scope || this.scopes.join(' ')
      };
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Create OAuth2Client with stored credentials
   */
  createAuthenticatedClient(accessToken: string, refreshToken?: string): OAuth2Client {
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI_WEB
    );

    client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    return client;
  }

  /**
   * Validate stored authentication
   */
  async validateStoredAuth(storedAuth: StoredGoogleAuth): Promise<GoogleAuthStatus> {
    try {
      // Check if token is expired (with 5 minute buffer)
      const now = Date.now();
      const buffer = 5 * 60 * 1000; // 5 minutes
      
      if (storedAuth.expiryDate - buffer < now) {
        // Token is expired or about to expire
        if (storedAuth.refreshToken) {
          // Try to refresh
          try {
            const newTokens = await this.refreshAccessToken(storedAuth.refreshToken);
            return {
              isAuthenticated: true,
              userInfo: storedAuth.userInfo,
              expiryDate: now + (newTokens.expires_in * 1000)
            };
          } catch (refreshError) {
            // Refresh failed, authentication invalid
            return { isAuthenticated: false };
          }
        } else {
          // No refresh token, authentication expired
          return { isAuthenticated: false };
        }
      }

      // Token is still valid
      return {
        isAuthenticated: true,
        userInfo: storedAuth.userInfo,
        expiryDate: storedAuth.expiryDate
      };
    } catch (error) {
      console.error('Error validating stored auth:', error);
      return { isAuthenticated: false };
    }
  }
}

export default GoogleAuthService;
