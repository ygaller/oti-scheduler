import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Avatar, Menu, MenuItem, Typography, Box, CircularProgress, Tooltip } from '@mui/material';
import { Google as GoogleIcon, Logout as LogoutIcon } from '@mui/icons-material';
import { authService, User } from '../services/authService';

// Extend Window interface for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

interface LoginButtonProps {
  user: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
}

export const LoginButton: React.FC<LoginButtonProps> = ({ user, onLogin, onLogout }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [showGoogleButton, setShowGoogleButton] = useState(false);

  const handleCredentialResponse = useCallback(async (response: { credential: string }) => {
    try {
      setLoading(true);
      console.log('Received credential from Google:', response.credential);
      
      // Send the JWT token to our backend for verification
      const result = await fetch('http://localhost:3001/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          credential: response.credential 
        }),
      });

      if (!result.ok) {
        const errorText = await result.text();
        throw new Error(`HTTP error! status: ${result.status}, message: ${errorText}`);
      }

      const data = await result.json();
      console.log('Login successful:', data);
      
      if (data.token && data.user) {
        // Store authentication data
        await authService.setAuthData(data.token, data.user);
        onLogin(data.user);
      }
    } catch (error) {
      console.error('Login failed:', error);
      if (error instanceof Error && error.message.includes('403')) {
        alert('שגיאת הרשאה בהתחברות Google. יש לבדוק את הגדרות OAuth Client ID. ראה הוראות במסמך README.');
      } else {
        alert('שגיאה בהתחברות. אנא נסה שוב.');
      }
    } finally {
      setLoading(false);
    }
  }, [onLogin]);

  const initializeGoogleSignIn = useCallback(() => {
    console.log('🔧 Initializing Google Sign-In...');
    console.log('🌍 Current origin:', window.location.origin);
    console.log('🌍 Current href:', window.location.href);
    
    if (!window.google?.accounts?.id) {
      console.error('❌ Google Identity Services not available');
      return;
    }

    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    console.log('🔑 Client ID:', clientId ? `${clientId.substring(0, 20)}...` : 'Not found');
    console.log('🔑 Full Client ID:', clientId);
    
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      console.error('❌ Google Client ID not configured properly. Please set REACT_APP_GOOGLE_CLIENT_ID in your .env file.');
      console.error('See README for setup instructions.');
      return;
    }

    try {
      console.log('🚀 Attempting to initialize Google Identity Services...');
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      console.log('✅ Google Identity Services initialized successfully');
      setGisLoaded(true);
      
      // Render the Google Sign-In button after initialization
      setTimeout(() => {
        if (googleButtonRef.current && window.google?.accounts?.id) {
          console.log('🎨 Rendering Google Sign-In button...');
          try {
            window.google.accounts.id.renderButton(googleButtonRef.current, {
              type: "standard",
              theme: "filled_blue",
              size: "large",
              text: "signin_with",
              shape: "rectangular",
              logo_alignment: "left",
              width: 250
            });
            console.log('✅ Google Sign-In button rendered successfully');
            setShowGoogleButton(true);
          } catch (renderError) {
            console.error('❌ Failed to render Google Sign-In button:', renderError);
          }
        } else {
          console.warn('⚠️ Google button ref or Google services not available for rendering');
        }
      }, 100);
    } catch (error) {
      console.error('❌ Failed to initialize Google Identity Services:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        origin: window.location.origin,
        clientId: clientId
      });
    }
  }, [handleCredentialResponse]);

  useEffect(() => {
    // Check if script is already loaded
    if (window.google?.accounts?.id) {
      console.log('Google Identity Services already loaded');
      initializeGoogleSignIn();
      return;
    }

    // Check if script is already in the DOM
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      console.log('Google Identity Services script already exists, waiting for load...');
      existingScript.addEventListener('load', initializeGoogleSignIn);
      return;
    }

    // Load Google Identity Services script
    console.log('Loading Google Identity Services script...');
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('Google Identity Services script loaded successfully');
      initializeGoogleSignIn();
    };
    script.onerror = () => {
      console.error('Failed to load Google Identity Services script');
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup script if component unmounts
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [initializeGoogleSignIn]);

  const handleLogin = () => {
    console.log('Login button clicked');
    console.log('GIS loaded:', gisLoaded);
    console.log('Google available:', !!window.google?.accounts?.id);
    
    if (window.google?.accounts?.id && gisLoaded) {
      console.log('Showing Google sign-in prompt...');
      window.google.accounts.id.prompt();
    } else {
      const message = `Google Sign-In is not ready. GIS loaded: ${gisLoaded}, Google available: ${!!window.google?.accounts?.id}`;
      console.error(message);
      alert('Google Sign-In is not ready. Please try again in a moment.');
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      onLogout();
      setAnchorEl(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  if (user) {
    return (
      <>
        <Button
          onClick={handleMenuOpen}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            textTransform: 'none',
            color: 'primary.main',
            border: '1px solid',
            borderColor: 'primary.main',
            borderRadius: 2,
            px: 2,
            py: 1,
            '&:hover': {
              backgroundColor: 'primary.main',
              color: 'white',
            },
          }}
        >
          <Avatar
            src={user.picture}
            sx={{ width: 24, height: 24 }}
          >
            {user.name?.[0] || user.email[0].toUpperCase()}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {user.name || user.email}
          </Typography>
        </Button>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              minWidth: 200,
              mt: 1,
            },
          }}
        >
          <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              מחובר כ:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {user.email}
            </Typography>
          </Box>
          
          <MenuItem onClick={handleLogout} sx={{ gap: 1, color: 'error.main' }}>
            <LogoutIcon fontSize="small" />
            התנתק
          </MenuItem>
        </Menu>
      </>
    );
  }

  // If Google button is ready and rendered, show it
  if (showGoogleButton && gisLoaded) {
    return (
      <Tooltip 
        title="ההתחברות תשמש כדי לייצא לוחות זמנים לחשבון שלך ב-Google Drive."
        arrow
        placement="bottom"
      >
        <Box>
          <div ref={googleButtonRef} style={{ display: loading ? 'none' : 'block' }} />
          {loading && (
            <Box display="flex" alignItems="center" gap={1} sx={{ 
              backgroundColor: '#4285f4',
              color: 'white',
              borderRadius: 2,
              px: 3,
              py: 1.5,
              width: 250,
              justifyContent: 'center'
            }}>
              <CircularProgress size={16} color="inherit" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                מתחבר...
              </Typography>
            </Box>
          )}
        </Box>
      </Tooltip>
    );
  }

  // Fallback: Show custom button while Google button loads
  return (
    <Tooltip 
      title="ההתחברות תשמש כדי לייצא לוחות זמנים לחשבון שלך ב-Google Drive."
      arrow
      placement="bottom"
    >
      <Box>
        <Button
          onClick={handleLogin}
          disabled={loading || !gisLoaded}
          variant="contained"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            textTransform: 'none',
            backgroundColor: '#4285f4',
            color: 'white',
            borderRadius: 2,
            px: 3,
            py: 1,
            '&:hover': {
              backgroundColor: '#3367d6',
            },
            '&:disabled': {
              backgroundColor: '#cccccc',
            },
          }}
        >
          {loading ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <GoogleIcon fontSize="small" />
          )}
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {loading ? 'מתחבר...' : gisLoaded ? 'התחבר עם Google' : 'טוען...'}
          </Typography>
        </Button>
        <div ref={googleButtonRef} style={{ display: 'none' }} />
      </Box>
    </Tooltip>
  );
};
