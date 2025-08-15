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
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { Warning } from '@mui/icons-material';

interface ConsecutiveSessionsWarningModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  warnings: Array<{
    patientId: string;
    patientName?: string;
    warning: string;
    consecutiveCount: number;
  }>;
  title?: string;
}

const ConsecutiveSessionsWarningModal: React.FC<ConsecutiveSessionsWarningModalProps> = ({
  open,
  onClose,
  onConfirm,
  warnings,
  title = 'אזהרה - טיפולים רצופים'
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Warning color="warning" />
        {title}
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            זוהו מטופלים שיהיו עם יותר משני טיפולים רצופים ללא הפסקה:
          </Typography>
        </Alert>

        <List>
          {warnings.map((warning, index) => (
            <ListItem key={index} sx={{ pl: 0 }}>
              <ListItemText
                primary={
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {warning.patientName || `מטופל ${warning.patientId}`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {warning.consecutiveCount} טיפולים רצופים
                    </Typography>
                  </Box>
                }
                secondary={warning.warning}
              />
            </ListItem>
          ))}
        </List>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          טיפולים רצופים ללא הפסקה עלולים להיות מתישים למטופלים. 
          מומלץ להשאיר הפסקה של לפחות 15 דקות בין טיפולים.
        </Typography>

        <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>
          האם אתה בטוח שברצונך להמשיך עם השמת המטופלים?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          ביטול
        </Button>
        <Button 
          onClick={onConfirm} 
          variant="contained" 
          color="warning"
          autoFocus
        >
          כן, המשך בכל זאת
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConsecutiveSessionsWarningModal;
