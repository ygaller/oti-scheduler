import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { Delete as DeleteIcon, Warning as WarningIcon, DataObject as DemoIcon } from '@mui/icons-material';
import { ScheduleConfig } from '../types';
import { systemService } from '../services';
import { demoService } from '../services/demoService';

interface ScheduleConfigurationProps {
  config: ScheduleConfig | null;
  setConfig: (config: ScheduleConfig) => Promise<void>;
  onDataChange?: () => Promise<void>; // Callback to refresh data after demo load
}

const ScheduleConfiguration: React.FC<ScheduleConfigurationProps> = ({ config, setConfig, onDataChange }) => {
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoSuccess, setDemoSuccess] = useState(false);
  const parseTime = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return '00:00';
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const handleTimeChange = async (
    period: keyof ScheduleConfig,
    field: 'startTime' | 'endTime',
    value: Date | null
  ) => {
    if (!value || !config) return;
    
    const timeString = formatTime(value);
    const newConfig = {
      ...config,
      [period]: {
        ...config[period],
        [field]: timeString
      }
    };

    try {
      setUpdateError(null);
      await setConfig(newConfig);
    } catch (error) {
      console.error('Error updating config:', error);
      setUpdateError(error instanceof Error ? error.message : 'Failed to update configuration');
    }
  };

  const handleResetData = async () => {
    try {
      setResetting(true);
      setResetError(null);
      await systemService.resetAllData();
      setResetDialogOpen(false);
      // The parent component should handle refetching data
      window.location.reload(); // Simple way to refresh all data
    } catch (error) {
      console.error('Error resetting data:', error);
      setResetError(error instanceof Error ? error.message : 'Failed to reset data');
    } finally {
      setResetting(false);
    }
  };

  const handleLoadDemoData = async () => {
    try {
      setLoadingDemo(true);
      setDemoError(null);
      setDemoSuccess(false);
      
      await demoService.loadDemoData();
      
      // Notify parent to refresh data
      if (onDataChange) {
        await onDataChange();
      }
      
      setDemoSuccess(true);
      // Hide success message after 3 seconds
      setTimeout(() => setDemoSuccess(false), 3000);
    } catch (error) {
      console.error('Error loading demo data:', error);
      setDemoError(error instanceof Error ? error.message : 'Failed to load demo data');
    } finally {
      setLoadingDemo(false);
    }
  };

  // Return loading state if config is not loaded yet
  if (!config) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          הגדרות מערכת הזמנים
        </Typography>
        <Box display="flex" gap={2}>
          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={loadingDemo ? <CircularProgress size={16} /> : <DemoIcon />}
              onClick={handleLoadDemoData}
              disabled={loadingDemo}
            >
              {loadingDemo ? 'טוען נתוני דמו...' : 'צור נתוני דמו'}
            </Button>
          )}
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setResetDialogOpen(true)}
          >
            איפוס כל הנתונים
          </Button>
        </Box>
      </Box>

      {/* Error and success messages */}
      {updateError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setUpdateError(null)}>
          {updateError}
        </Alert>
      )}

      {resetError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setResetError(null)}>
          {resetError}
        </Alert>
      )}

      {demoError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setDemoError(null)}>
          {demoError}
        </Alert>
      )}

      {demoSuccess && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setDemoSuccess(false)}>
          נתוני הדמו נוצרו בהצלחה! נוספו 3 עובדים ו-4 חדרי טיפול למערכת.
        </Alert>
      )}

      <Box display="flex" flexWrap="wrap" gap={3}>
        <Card sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.333% - 16px)' } }}>
          <CardContent>
            <Typography variant="h6" component="h2" mb={2} color="primary">
              ארוחת בוקר
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <TimePicker
                label="שעת התחלה"
                value={parseTime(config.breakfast.startTime)}
                onChange={(newValue) => handleTimeChange('breakfast', 'startTime', newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <TimePicker
                label="שעת סיום"
                value={parseTime(config.breakfast.endTime)}
                onChange={(newValue) => handleTimeChange('breakfast', 'endTime', newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.333% - 16px)' } }}>
          <CardContent>
            <Typography variant="h6" component="h2" mb={2} color="primary">
              מפגש בוקר
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <TimePicker
                label="שעת התחלה"
                value={parseTime(config.morningMeetup.startTime)}
                onChange={(newValue) => handleTimeChange('morningMeetup', 'startTime', newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <TimePicker
                label="שעת סיום"
                value={parseTime(config.morningMeetup.endTime)}
                onChange={(newValue) => handleTimeChange('morningMeetup', 'endTime', newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.333% - 16px)' } }}>
          <CardContent>
            <Typography variant="h6" component="h2" mb={2} color="primary">
              ארוחת צהריים
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <TimePicker
                label="שעת התחלה"
                value={parseTime(config.lunch.startTime)}
                onChange={(newValue) => handleTimeChange('lunch', 'startTime', newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <TimePicker
                label="שעת סיום"
                value={parseTime(config.lunch.endTime)}
                onChange={(newValue) => handleTimeChange('lunch', 'endTime', newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Box display="flex" flexWrap="wrap" gap={3} mt={3}>
        <Paper sx={{ p: 3, flex: process.env.NODE_ENV === 'development' ? { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } : '1 1 100%' }}>
          <Typography variant="h6" component="h3" mb={2}>
            תצוגה מקדימה של הגדרות הזמנים
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <Typography variant="body2" color="text.secondary">
              ארוחת בוקר: {config.breakfast.startTime} - {config.breakfast.endTime}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              מפגש בוקר: {config.morningMeetup.startTime} - {config.morningMeetup.endTime}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ארוחת צהריים: {config.lunch.startTime} - {config.lunch.endTime}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            <strong>הערה:</strong> בזמנים אלה לא ניתן לתזמן טיפולים. השינויים נשמרים אוטומטית.
          </Typography>
        </Paper>

        {process.env.NODE_ENV === 'development' && (
          <Paper sx={{ p: 3, flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
            <Typography variant="h6" component="h3" mb={2} color="primary">
              נתוני דמו
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              צירת נתוני דמו תוסיף למערכת:
            </Typography>
            <Box component="ul" sx={{ mt: 1, mb: 2, color: 'text.secondary' }}>
              <Typography component="li" variant="body2">3 עובדים עם תחומי התמחות שונים</Typography>
              <Typography component="li" variant="body2">4 חדרי טיפול מוכנים לשימוש</Typography>
              <Typography component="li" variant="body2">הגדרות זמנים מתאימות</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              זה יאפשר לך לראות איך המערכת עובדת ולבדוק את יצירת לוחות הזמנים.
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => !resetting && setResetDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          אישור איפוס נתונים
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>אזהרה:</strong> פעולה זו תמחק את כל הנתונים במערכת באופן בלתי הפיך!
            </Typography>
          </Alert>
          <Typography variant="body1">
            האם אתה בטוח שברצונך לאפס את כל הנתונים? פעולה זו תמחק:
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 2 }}>
            <li>כל העובדים ופרטיהם</li>
            <li>כל חדרי הטיפול</li>
            <li>כל לוחות הזמנים הקיימים</li>
            <li>כל ההגדרות המותאמות אישית</li>
          </Box>
          <Typography variant="body2" color="text.secondary">
            לאחר האיפוס, המערכת תחזור למצב ההתחלתי ותוכל להתחיל מחדש.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setResetDialogOpen(false)}
            disabled={resetting}
          >
            ביטול
          </Button>
          <Button 
            onClick={handleResetData}
            color="error"
            variant="contained"
            disabled={resetting}
            startIcon={resetting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {resetting ? 'מאפס...' : 'כן, אפס הכל'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScheduleConfiguration;
