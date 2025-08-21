import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  Google as GoogleIcon,
  CloudUpload as CloudUploadIcon,
  Logout as LogoutIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { googleAuthService } from '../services';
import { GoogleAuthStatus, GoogleUserInfo } from '../types/google';

interface GoogleSettingsProps {
  open: boolean;
  onClose: () => void;
}

const GoogleSettings: React.FC<GoogleSettingsProps> = ({ open, onClose }) => {
  const [authStatus, setAuthStatus] = useState<GoogleAuthStatus>({ isAuthenticated: false });
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState({ isConfigured: false, hasCredentials: false });

  useEffect(() => {
    if (open) {
      checkAuthStatus();
      checkConfiguration();
    }
  }, [open]);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const status = await googleAuthService.getAuthStatus();
      setAuthStatus(status);
      setError(null);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setError('Failed to check authentication status');
    } finally {
      setLoading(false);
    }
  };

  const checkConfiguration = async () => {
    try {
      const status = await googleAuthService.checkConfiguration();
      setConfigStatus(status);
    } catch (error) {
      console.error('Error checking configuration:', error);
    }
  };

  const handleConnect = async () => {
    try {
      setAuthenticating(true);
      setError(null);
      
      const result = await googleAuthService.authenticateWithPopup();
      
      if (result.success) {
        await checkAuthStatus();
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await googleAuthService.logout();
      await checkAuthStatus();
    } catch (error) {
      console.error('Disconnect error:', error);
      setError('Failed to disconnect from Google');
    } finally {
      setLoading(false);
    }
  };

  const formatExpiryDate = (expiryDate?: number): string => {
    if (!expiryDate) return 'Unknown';
    
    const date = new Date(expiryDate);
    const now = new Date();
    const diffMinutes = Math.floor((expiryDate - now.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `Expires in ${diffMinutes} minutes`;
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60);
      return `Expires in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('he-IL');
    }
  };

  const renderConfigurationStatus = () => {
    if (!configStatus.hasCredentials) {
      return (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Google OAuth is not configured. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the server environment.
          </Typography>
        </Alert>
      );
    }

    if (!configStatus.isConfigured) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Google services are not available. Please check server configuration.
          </Typography>
        </Alert>
      );
    }

    return null;
  };

  const renderAuthenticatedView = (userInfo: GoogleUserInfo) => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Avatar 
          src={userInfo.picture} 
          alt={userInfo.name}
          sx={{ width: 64, height: 64, mr: 2 }}
        >
          {userInfo.name.charAt(0)}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">{userInfo.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {userInfo.email}
          </Typography>
          <Chip 
            icon={<CheckCircleIcon />}
            label="Connected"
            color="success"
            size="small"
            sx={{ mt: 1 }}
          />
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Token {formatExpiryDate(authStatus.expiryDate)}
      </Typography>

      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="body2">
          You can now export schedules to Google Sheets. Your spreadsheets will be created in your Google Drive.
        </Typography>
      </Alert>

      <Button
        variant="outlined"
        color="error"
        startIcon={<LogoutIcon />}
        onClick={handleDisconnect}
        disabled={loading}
        fullWidth
      >
        Disconnect from Google
      </Button>
    </Box>
  );

  const renderUnauthenticatedView = () => (
    <Box sx={{ textAlign: 'center' }}>
      <CloudUploadIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      
      <Typography variant="h6" gutterBottom>
        Connect to Google Sheets
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Connect your Google account to export schedules directly to Google Sheets. 
        Your data will be securely stored in your Google Drive.
      </Typography>

      <Button
        variant="contained"
        startIcon={<GoogleIcon />}
        onClick={handleConnect}
        disabled={authenticating || !configStatus.isConfigured}
        size="large"
        fullWidth
        sx={{
          backgroundColor: '#4285f4',
          color: 'white',
          '&:hover': {
            backgroundColor: '#3367d6',
          },
        }}
      >
        {authenticating ? (
          <>
            <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
            Connecting...
          </>
        ) : (
          'Connect to Google'
        )}
      </Button>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        This will open a popup window for Google authentication
      </Typography>
    </Box>
  );

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <GoogleIcon sx={{ mr: 1, color: '#4285f4' }} />
          Google Sheets Integration
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {renderConfigurationStatus()}
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setError(null)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : authStatus.isAuthenticated && authStatus.userInfo ? (
          renderAuthenticatedView(authStatus.userInfo)
        ) : (
          renderUnauthenticatedView()
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GoogleSettings;
