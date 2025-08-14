import React, { useState } from 'react';
import {
  Box,
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

import { Delete as DeleteIcon, Warning as WarningIcon, DataObject as DemoIcon } from '@mui/icons-material';
import { ScheduleConfig } from '../types';
import { systemService } from '../services';
import { demoService } from '../services/demoService';
import { useBlockedPeriods } from '../hooks';
import BlockedPeriodManagement from './BlockedPeriodManagement';

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
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  // Use the blocked periods hook
  const {
    blockedPeriods,
    loading: blockedPeriodsLoading,
    error: blockedPeriodsError,
    refetch: refetchBlockedPeriods,
    createBlockedPeriod,
    updateBlockedPeriod,
    setBlockedPeriodActive,
    deleteBlockedPeriod
  } = useBlockedPeriods(false); // Include inactive for management


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

      {/* New Flexible Blocked Periods Management */}
      {blockedPeriodsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {blockedPeriodsError}
        </Alert>
      )}

      {blockedPeriodsLoading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <BlockedPeriodManagement
          blockedPeriods={blockedPeriods}
          onCreateBlockedPeriod={createBlockedPeriod}
          onUpdateBlockedPeriod={updateBlockedPeriod}
          onSetBlockedPeriodActive={setBlockedPeriodActive}
          onDeleteBlockedPeriod={deleteBlockedPeriod}
          showActiveOnly={showActiveOnly}
          onShowActiveToggle={setShowActiveOnly}
        />
      )}

      {process.env.NODE_ENV === 'development' && (
        <Box mt={3}>
          <Paper sx={{ p: 3 }}>
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
        </Box>
      )}

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
