import { OAuth2Client } from 'google-auth-library';
import { GoogleTokenData, GoogleUserInfo, StoredGoogleAuth, GoogleAuthStatus } from '../types/google';
import crypto from 'crypto';
// Use node-fetch for older Node versions if global fetch is not available
const fetch = globalThis.fetch || require('node-fetch');

class GoogleAuthService {
  private oauth2Client: OAuth2Client;
  private readonly scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ];
  
  // Store PKCE parameters for each session
  private pkceStore = new Map<string, { codeVerifier: string; codeChallenge: string }>();

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    // Prefer Electron redirect URI for desktop PKCE; fall back to web
    const redirectUri = process.env.GOOGLE_REDIRECT_URI_ELECTRON
      || process.env.GOOGLE_REDIRECT_URI_WEB
      || 'http://localhost:8080/callback';

    if (!clientId) {
      throw new Error('Google OAuth client ID is not configured');
    }

    // Support both public (PKCE) and confidential clients
    // If client secret is provided, use confidential client mode
    // If not provided, use public client mode (PKCE)
    this.oauth2Client = new OAuth2Client(clientId, clientSecret || undefined, redirectUri);
  }

  /**
   * Generate PKCE code verifier and challenge for Desktop clients
   */
  private generatePKCE(): { codeVerifier: string; codeChallenge: string; sessionId: string } {
    // Generate code verifier (43-128 characters)
    const codeVerifier = crypto.randomBytes(96).toString('base64url');
    
    // Generate code challenge
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    
    // Generate session ID to store PKCE parameters
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    // Store PKCE parameters
    this.pkceStore.set(sessionId, { codeVerifier, codeChallenge });
    
    // Clean up old sessions (simple cleanup - remove entries older than 10 minutes)
    setTimeout(() => {
      this.pkceStore.delete(sessionId);
    }, 10 * 60 * 1000);
    
    return { codeVerifier, codeChallenge, sessionId };
  }

  /**
   * Generate authorization URL for OAuth flow with PKCE for Desktop clients
   */
  generateAuthUrl(): string {
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (clientSecret) {
      // Confidential client - use traditional flow
      return this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: this.scopes,
        prompt: 'consent',
        include_granted_scopes: true
      });
    } else {
      // Public client (Desktop) - use PKCE flow
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI_ELECTRON
        || process.env.GOOGLE_REDIRECT_URI_WEB
        || 'http://localhost:8080/callback';
      const { codeChallenge, sessionId } = this.generatePKCE();
      
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId!);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', this.scopes.join(' '));
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('include_granted_scopes', 'true');
      // PKCE parameters
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('state', sessionId); // Use session ID as state to retrieve PKCE params later
      
      return authUrl.toString();
    }
  }

  /**
   * Exchange authorization code for tokens (supports both public and confidential clients)
   */
  async exchangeCodeForTokens(code: string, state?: string): Promise<GoogleTokenData> {
    try {
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      
      if (clientSecret) {
        // Use OAuth2Client for confidential clients (with client secret)
        console.log('Using confidential client flow with client secret');
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
      } else {
        // Use direct API call for public clients (PKCE)
        console.log('Using public client flow (PKCE) without client secret');
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI_ELECTRON
          || process.env.GOOGLE_REDIRECT_URI_WEB
          || 'http://localhost:8080/callback';
        
        if (!clientId) {
          throw new Error('Google client ID not configured');
        }

        // Retrieve PKCE parameters from state
        let codeVerifier: string | undefined;
        if (state && this.pkceStore.has(state)) {
          const pkceParams = this.pkceStore.get(state)!;
          codeVerifier = pkceParams.codeVerifier;
          // Clean up used PKCE parameters
          this.pkceStore.delete(state);
        }

        if (!codeVerifier) {
          throw new Error('PKCE code verifier not found. Invalid or expired session.');
        }

        const tokenParams = new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          code: code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier, // Include PKCE code verifier
        });

        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: tokenParams.toString(),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Token exchange error:', errorData);
          throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
        }

        const data = await response.json();

        if (!data.access_token) {
          throw new Error('No access token received from Google');
        }

        return {
          access_token: data.access_token,
          refresh_token: data.refresh_token || undefined,
          expires_in: data.expires_in || 3600,
          token_type: data.token_type || 'Bearer',
          scope: data.scope || this.scopes.join(' '),
          id_token: data.id_token || undefined
        };
      }
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
   * Refresh access token using refresh token (PKCE-compatible)
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleTokenData> {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      
      if (!clientId) {
        throw new Error('Google client ID not configured');
      }

      // Direct call to Google's token endpoint for PKCE refresh
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          // No client_secret needed for PKCE flows
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Token refresh failed: ${errorData.error_description || errorData.error}`);
      }

      const data = await response.json();

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken, // Keep original if new one not provided
        expires_in: data.expires_in || 3600,
        token_type: data.token_type || 'Bearer',
        scope: data.scope || this.scopes.join(' ')
      };
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error(`Failed to refresh access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create OAuth2Client with stored credentials (supports both public and confidential clients)
   */
  createAuthenticatedClient(accessToken: string, refreshToken?: string): OAuth2Client {
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET || undefined, // Use client secret if available
      process.env.GOOGLE_REDIRECT_URI_ELECTRON || process.env.GOOGLE_REDIRECT_URI_WEB || 'http://localhost:8080/callback'
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
