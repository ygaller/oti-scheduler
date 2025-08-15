import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  AlertTitle
} from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

interface ErrorModalProps {
  open: boolean;
  title: string;
  message: string;
  details?: string;
  onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({
  open,
  title,
  message,
  details,
  onClose
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="error-dialog-title"
    >
      <DialogTitle id="error-dialog-title">
        <Box display="flex" alignItems="center" gap={1}>
          <ErrorOutline color="error" />
          {title}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>שגיאה</AlertTitle>
          {message}
        </Alert>
        
        {details && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              פרטים נוספים:
            </Typography>
            <Box
              sx={{
                backgroundColor: '#f5f5f5',
                padding: 2,
                borderRadius: 1,
                border: '1px solid #ddd',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
                maxHeight: 300,
                overflow: 'auto'
              }}
            >
              {details}
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          סגור
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ErrorModal;
