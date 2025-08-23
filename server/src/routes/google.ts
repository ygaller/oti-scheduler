import express from 'express';
import GoogleAuthService from '../services/googleAuthService';
import GoogleSheetsService from '../services/googleSheetsService';
import { GoogleTokenData, StoredGoogleAuth, GoogleAuthStatus, GoogleSheetsExportRequest } from '../types/google';

const router = express.Router();

// Initialize Google Services - defer initialization to avoid test failures
let googleAuthService: GoogleAuthService | undefined;
let googleSheetsService: GoogleSheetsService | undefined;

// Initialize services only if configuration is available
function initializeGoogleServices() {
  if (googleAuthService && googleSheetsService) {
    return; // Already initialized
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    console.log('Google OAuth configuration check:');
    console.log('- GOOGLE_CLIENT_ID:', clientId ? `${clientId.substring(0, 10)}...` : 'NOT SET');
    console.log('- GOOGLE_CLIENT_SECRET:', clientSecret ? 'SET' : 'NOT SET');

    if (clientId) {
      console.log('Initializing Google services...');
      googleAuthService = new GoogleAuthService();
      googleSheetsService = new GoogleSheetsService();
      console.log('Google services initialized successfully');
    } else {
      console.log('Google OAuth client ID not configured, Google services will be unavailable');
    }
  } catch (error) {
    console.error('Failed to initialize Google services:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * GET /api/google/desktop-client-id
 * Get desktop client ID for Electron PKCE flow
 */
router.get('/desktop-client-id', async (req, res) => {
  try {
    initializeGoogleServices();
    
    const clientId = process.env.GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      return res.status(500).json({
        error: 'Google client ID not configured',
        message: 'GOOGLE_CLIENT_ID environment variable is not set'
      });
    }

    res.json({ clientId });
  } catch (error) {
    console.error('Error getting client ID:', error);
    res.status(500).json({
      error: 'Failed to get client ID',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/google/auth/url
 * Generate OAuth authorization URL
 */
router.get('/auth/url', async (req, res) => {
  try {
    initializeGoogleServices();
    
    if (!googleAuthService) {
      return res.status(500).json({ 
        error: 'Google authentication not configured',
        message: 'Missing Google OAuth credentials' 
      });
    }

    const authUrl = googleAuthService.generateAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate authorization URL',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/google/auth/callback
 * Handle OAuth callback and exchange code for tokens
 */
router.post('/auth/callback', async (req, res) => {
  try {
    initializeGoogleServices();
    
    if (!googleAuthService) {
      return res.status(500).json({ 
        error: 'Google authentication not configured',
        message: 'Missing Google OAuth credentials' 
      });
    }

    const { code, state } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        error: 'Missing authorization code',
        message: 'Authorization code is required'
      });
    }

    // Exchange code for tokens (include state for PKCE)
    const tokenData: GoogleTokenData = await googleAuthService.exchangeCodeForTokens(code, state);
    
    // Get user information
    const userInfo = await googleAuthService.getUserInfo(tokenData.access_token);
    
    // Create stored auth object
    const storedAuth: StoredGoogleAuth = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiryDate: Date.now() + (tokenData.expires_in * 1000),
      userInfo
    };

    res.json({
      success: true,
      auth: storedAuth
    });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).json({ 
      error: 'OAuth callback failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/google/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/auth/refresh', async (req, res) => {
  try {
    initializeGoogleServices();
    
    if (!googleAuthService) {
      return res.status(500).json({ 
        error: 'Google authentication not configured',
        message: 'Missing Google OAuth credentials' 
      });
    }

    const { refreshToken, userInfo } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ 
        error: 'Missing refresh token',
        message: 'Refresh token is required'
      });
    }

    // Refresh the access token
    const newTokenData = await googleAuthService.refreshAccessToken(refreshToken);
    
    // Create updated stored auth object
    const storedAuth: StoredGoogleAuth = {
      accessToken: newTokenData.access_token,
      refreshToken: newTokenData.refresh_token || refreshToken,
      expiryDate: Date.now() + (newTokenData.expires_in * 1000),
      userInfo: userInfo || { id: '', email: '', name: '' } // Use provided userInfo or placeholder
    };

    res.json({
      success: true,
      auth: storedAuth
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ 
      error: 'Token refresh failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/google/auth/validate
 * Validate stored authentication
 */
router.post('/auth/validate', async (req, res) => {
  try {
    initializeGoogleServices();
    
    if (!googleAuthService) {
      return res.status(500).json({ 
        error: 'Google authentication not configured',
        message: 'Missing Google OAuth credentials' 
      });
    }

    const { auth } = req.body;
    
    if (!auth) {
      return res.json({ isAuthenticated: false });
    }

    const authStatus: GoogleAuthStatus = await googleAuthService.validateStoredAuth(auth);
    res.json(authStatus);
  } catch (error) {
    console.error('Error validating auth:', error);
    res.json({ isAuthenticated: false });
  }
});

/**
 * DELETE /api/google/auth/logout
 * Logout (revoke tokens)
 */
router.delete('/auth/logout', async (req, res) => {
  try {
    // For security, we'll just return success
    // The client will remove the stored tokens
    // Google tokens will naturally expire
    res.json({ success: true });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ 
      error: 'Logout failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/google/auth/status
 * Get current authentication status
 */
router.get('/auth/status', async (req, res) => {
  try {
    initializeGoogleServices();

    // This endpoint expects the client to provide auth data
    // It's mainly for checking if Google Auth is configured
    const isConfigured = !!googleAuthService;
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;

    console.log('Auth status check:');
    console.log('- isConfigured:', isConfigured);
    console.log('- hasClientId:', hasClientId);
    console.log('- hasClientSecret:', hasClientSecret);

    res.json({
      isConfigured,
      hasCredentials: hasClientId // Client ID is always required. Client secret is optional for Desktop clients.
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({
      error: 'Failed to check authentication status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/google/debug
 * Debug endpoint to check Google OAuth configuration
 */
router.get('/debug', async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUriWeb = process.env.GOOGLE_REDIRECT_URI_WEB;
    const redirectUriElectron = process.env.GOOGLE_REDIRECT_URI_ELECTRON;

    res.json({
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        ELECTRON: process.env.ELECTRON,
        PORT: process.env.PORT
      },
      googleConfig: {
        hasClientId: !!clientId,
        clientIdPrefix: clientId ? clientId.substring(0, 20) + '...' : 'NOT SET',
        hasClientSecret: !!clientSecret,
        redirectUriWeb: redirectUriWeb || 'NOT SET',
        redirectUriElectron: redirectUriElectron || 'NOT SET'
      },
      services: {
        googleAuthService: !!googleAuthService,
        googleSheetsService: !!googleSheetsService
      }
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({
      error: 'Debug endpoint failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/google/sheets/export
 * Export schedule to Google Sheets
 */
router.post('/sheets/export', async (req, res) => {
  try {
    initializeGoogleServices();
    
    if (!googleSheetsService) {
      return res.status(500).json({ 
        error: 'Google Sheets service not configured',
        message: 'Missing Google OAuth credentials' 
      });
    }

    const { auth, exportRequest }: { auth: StoredGoogleAuth, exportRequest: GoogleSheetsExportRequest } = req.body;
    
    if (!auth) {
      return res.status(400).json({ 
        error: 'Missing authentication data',
        message: 'Google authentication is required'
      });
    }

    if (!exportRequest) {
      return res.status(400).json({ 
        error: 'Missing export request data',
        message: 'Export request data is required'
      });
    }

    // Validate export request
    if (!exportRequest.scheduleData || !exportRequest.scheduleName) {
      return res.status(400).json({ 
        error: 'Invalid export request',
        message: 'Schedule data and name are required'
      });
    }

    if (exportRequest.exportType === 'patient' && !exportRequest.patientId) {
      return res.status(400).json({ 
        error: 'Invalid export request',
        message: 'Patient ID is required for patient export'
      });
    }

    // Perform the export
    const result = await googleSheetsService.exportScheduleToSheets(auth, exportRequest);
    
    res.json(result);
  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    res.status(500).json({ 
      error: 'Export failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
