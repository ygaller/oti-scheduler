import React, { useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

const AuthCallback: React.FC = () => {
  useEffect(() => {
    const handleCallback = () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const state = urlParams.get('state');
        
        console.log('OAuth callback received:', { code: !!code, error, state });
        
        // Send message to parent window (popup opener)
        if (window.opener && !window.opener.closed) {
          const message = error ? {
            type: 'GOOGLE_AUTH_ERROR',
            error: error
          } : {
            type: 'GOOGLE_AUTH_SUCCESS',
            code: code,
            state: state
          };
          
          window.opener.postMessage(message, window.location.origin);
          
          // Close popup after sending message
          setTimeout(() => {
            window.close();
          }, 500);
        } else {
          // If no opener, redirect to main app
          console.log('No opener found, redirecting to main app');
          window.location.href = '/';
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: 'Callback processing failed: ' + (err as Error).message
          }, window.location.origin);
        }
        
        // Close popup or redirect
        if (window.opener) {
          window.close();
        } else {
          window.location.href = '/';
        }
      }
    };

    // Handle callback immediately
    handleCallback();
  }, []);

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        gap: 2
      }}
    >
      <CircularProgress />
      <Typography variant="body1">
        מעבד אימות...
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Processing authentication...
      </Typography>
    </Box>
  );
};

export default AuthCallback;
