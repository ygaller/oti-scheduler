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
import { CheckCircleOutline, InfoOutlined, WarningAmber } from '@mui/icons-material';

type NotificationType = 'success' | 'info' | 'warning' | 'error';

interface NotificationModalProps {
  open: boolean;
  type: NotificationType;
  title: string;
  message: string;
  details?: string;
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  open,
  type,
  title,
  message,
  details,
  onClose
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleOutline color="success" />;
      case 'info':
        return <InfoOutlined color="info" />;
      case 'warning':
        return <WarningAmber color="warning" />;
      case 'error':
      default:
        return null; // ErrorModal has its own icon
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="notification-dialog-title"
    >
      <DialogTitle id="notification-dialog-title">
        <Box display="flex" alignItems="center" gap={1}>
          {getIcon()}
          {title}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity={type} sx={{ mb: 2 }}>
          <AlertTitle>
            {type === 'success' && 'הצלחה'}
            {type === 'info' && 'מידע'}
            {type === 'warning' && 'אזהרה'}
            {type === 'error' && 'שגיאה'}
          </AlertTitle>
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

export default NotificationModal;
