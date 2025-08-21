import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Download,
  Print,
  HelpOutline,
  Google as GoogleIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { Schedule } from '../types';
import GoogleSettings from './GoogleSettings';
import { googleAuthService } from '../services';

interface ScheduleSelectorProps {
  schedules: Schedule[];
  selectedScheduleId: string | null;
  selectedSchedule: Schedule | null;
  loading: boolean;
  error: string | null;
  isExportingGoogleSheets?: boolean;
  onScheduleSelect: (scheduleId: string | null) => void;
  onCreateSchedule: (name: string) => Promise<Schedule>;
  onUpdateScheduleName: (scheduleId: string, name: string) => Promise<Schedule>;
  onDeleteSchedule: (scheduleId: string) => Promise<void>;
  onExportExcel: () => void;
  onExportGoogleSheets: () => void;
  onOpenGoogleSettings?: () => void;
  onPrint: () => void;
  onShowHelp: () => void;
}

const ScheduleSelector: React.FC<ScheduleSelectorProps> = ({
  schedules,
  selectedScheduleId,
  selectedSchedule,
  loading,
  error,
  isExportingGoogleSheets = false,
  onScheduleSelect,
  onCreateSchedule,
  onUpdateScheduleName,
  onDeleteSchedule,
  onExportExcel,
  onExportGoogleSheets,
  onOpenGoogleSettings,
  onPrint,
  onShowHelp,
}) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [schedulesToDelete, setSchedulesToDelete] = useState<Schedule | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [googleSettingsOpen, setGoogleSettingsOpen] = useState(false);

  // Handle Google Sheets export with authentication check
  const handleGoogleSheetsExport = async () => {
    try {
      // Check if user is authenticated
      const authStatus = await googleAuthService.getAuthStatus();
      
      if (!authStatus.isAuthenticated) {
        // User not connected - open Google Settings dialog
        if (onOpenGoogleSettings) {
          onOpenGoogleSettings();
        } else {
          // Fallback: open the settings dialog directly
          setGoogleSettingsOpen(true);
        }
        return;
      }

      // User is authenticated, proceed with export
      onExportGoogleSheets();
    } catch (error) {
      console.error('Error checking Google authentication:', error);
      // On error, open settings dialog to let user reconnect
      if (onOpenGoogleSettings) {
        onOpenGoogleSettings();
      } else {
        setGoogleSettingsOpen(true);
      }
    }
  };

  // Generate suggested name (current year - next year)
  const getSuggestedName = () => {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    return `${currentYear} - ${nextYear}`;
  };

  const handleScheduleChange = (event: SelectChangeEvent<string>) => {
    const scheduleId = event.target.value;
    onScheduleSelect(scheduleId === '' ? null : scheduleId);
  };

  const handleCreateSchedule = async () => {
    if (!newScheduleName.trim()) return;

    try {
      setIsProcessing(true);
      const newSchedule = await onCreateSchedule(newScheduleName.trim());
      setCreateDialogOpen(false);
      setNewScheduleName('');
      onScheduleSelect(newSchedule.id);
    } catch (error) {
      console.error('Error creating schedule:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditSchedule = async () => {
    if (!editingSchedule || !newScheduleName.trim()) return;

    try {
      setIsProcessing(true);
      await onUpdateScheduleName(editingSchedule.id, newScheduleName.trim());
      setEditDialogOpen(false);
      setEditingSchedule(null);
      setNewScheduleName('');
    } catch (error) {
      console.error('Error updating schedule name:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!schedulesToDelete) return;

    try {
      setIsProcessing(true);
      await onDeleteSchedule(schedulesToDelete.id);
      setDeleteDialogOpen(false);
      setSchedulesToDelete(null);
    } catch (error) {
      console.error('Error deleting schedule:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const openCreateDialog = () => {
    setNewScheduleName(getSuggestedName());
    setCreateDialogOpen(true);
  };

  const openEditDialog = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setNewScheduleName(schedule.name);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (schedule: Schedule) => {
    setSchedulesToDelete(schedule);
    setDeleteDialogOpen(true);
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Typography variant="h6" component="label">
          לוח זמנים:
        </Typography>
        
        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel>בחר לוח זמנים</InputLabel>
          <Select
            value={selectedScheduleId || ''}
            onChange={handleScheduleChange}
            label="בחר לוח זמנים"
            disabled={loading || schedules.length === 0}
          >
            {schedules.map((schedule) => (
              <MenuItem key={schedule.id} value={schedule.id}>
                {schedule.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
          size="small"
          disabled={loading}
        >
          הוסף לוח
        </Button>

        {selectedSchedule && (
          <>
            <IconButton
              onClick={() => openEditDialog(selectedSchedule)}
              size="small"
              disabled={loading}
              title="ערוך שם לוח זמנים"
            >
              <EditIcon />
            </IconButton>

            <IconButton
              onClick={() => openDeleteDialog(selectedSchedule)}
              size="small"
              disabled={loading || !selectedSchedule}
              color="error"
              title="מחק לוח זמנים"
            >
              <DeleteIcon />
            </IconButton>
          </>
        )}

        {selectedSchedule && (
          <>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={onExportExcel}
              disabled={loading || !selectedSchedule?.id}
              size="small"
            >
              ייצא ל Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={isExportingGoogleSheets ? <CircularProgress size={16} sx={{ color: '#4285f4' }} /> : <CloudUploadIcon />}
              onClick={handleGoogleSheetsExport}
              disabled={loading || !selectedSchedule?.id || isExportingGoogleSheets}
              size="small"
              sx={{
                color: '#4285f4',
                borderColor: '#4285f4',
                '&:hover': {
                  borderColor: '#3367d6',
                  backgroundColor: 'rgba(66, 133, 244, 0.04)',
                },
              }}
            >
              {isExportingGoogleSheets ? 'מייצא ל-Google Sheets...' : 'ייצא ל-Google Sheets'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={onPrint}
              disabled={loading || !selectedSchedule?.id}
              size="small"
            >
              הדפס
            </Button>
          </>
        )}

        {/* Google Settings Button */}
        <IconButton
          onClick={() => setGoogleSettingsOpen(true)}
          size="small"
          title="הגדרות Google Sheets"
          sx={{ 
            color: '#4285f4',
            '&:hover': {
              backgroundColor: 'rgba(66, 133, 244, 0.04)',
            },
          }}
        >
          <GoogleIcon sx={{ fontSize: 20 }} />
        </IconButton>

        {/* Help Button */}
        <IconButton
          color="primary"
          onClick={onShowHelp}
          size="small"
          title="עזרה"
        >
          <HelpOutline sx={{ fontSize: 20 }} />
        </IconButton>

        {loading && <CircularProgress size={20} />}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {schedules.length === 0 && !loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          אין לוחות זמנים. צור לוח זמנים חדש כדי להתחיל.
        </Alert>
      )}

      {/* Create Schedule Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>צור לוח זמנים חדש</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="שם לוח הזמנים"
            value={newScheduleName}
            onChange={(e) => setNewScheduleName(e.target.value)}
            placeholder={getSuggestedName()}
            margin="normal"
            variant="outlined"
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={isProcessing}>
            ביטול
          </Button>
          <Button
            onClick={handleCreateSchedule}
            variant="contained"
            disabled={!newScheduleName.trim() || isProcessing}
          >
            {isProcessing ? <CircularProgress size={20} /> : 'צור'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ערוך שם לוח זמנים</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="שם לוח הזמנים"
            value={newScheduleName}
            onChange={(e) => setNewScheduleName(e.target.value)}
            margin="normal"
            variant="outlined"
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={isProcessing}>
            ביטול
          </Button>
          <Button
            onClick={handleEditSchedule}
            variant="contained"
            disabled={!newScheduleName.trim() || isProcessing}
          >
            {isProcessing ? <CircularProgress size={20} /> : 'שמור'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Schedule Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm">
        <DialogTitle>
          <WarningIcon color="warning" sx={{ verticalAlign: 'middle', mr: 1 }} />
          מחק לוח זמנים
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            האם אתה בטוח שברצונך למחוק את לוח הזמנים "{schedulesToDelete?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            פעולה זו תמחק את כל הטיפולים בלוח זמנים זה ואינה ניתנת לביטול.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isProcessing}>
            ביטול
          </Button>
          <Button
            onClick={handleDeleteSchedule}
            color="error"
            autoFocus
            disabled={isProcessing}
          >
            {isProcessing ? <CircularProgress size={20} /> : 'מחק לוח זמנים'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Google Settings Dialog */}
      <GoogleSettings
        open={googleSettingsOpen}
        onClose={() => setGoogleSettingsOpen(false)}
      />
    </Box>
  );
};

export default ScheduleSelector;
