import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  Paper,

  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { 
  Activity, 
  CreateActivityDto, 
  UpdateActivityDto, 
  AVAILABLE_COLORS, 
  DAY_LABELS,
  WeekDay,
  WEEK_DAYS
} from '../types';
import ColorPicker from './ColorPicker';

interface ActivityManagementProps {
  activities: Activity[];
  onCreateActivity: (data: CreateActivityDto) => Promise<Activity>;
  onUpdateActivity: (id: string, data: UpdateActivityDto) => Promise<Activity>;
  onSetActivityActive: (id: string, isActive: boolean) => Promise<Activity>;
  onDeleteActivity: (id: string) => Promise<void>;
  showActiveOnly: boolean;
  onShowActiveToggle: (checked: boolean) => void;
}

interface FormData {
  name: string;
  color: string;
  defaultStartTime: string | null;
  defaultEndTime: string | null;
  dayOverrides: Record<WeekDay, { startTime: string; endTime: string } | null>;
  isBlocking: boolean;
  isActive: boolean;
}

const initialFormData: FormData = {
  name: '',
  color: AVAILABLE_COLORS[0],
  defaultStartTime: null,
  defaultEndTime: null,
  dayOverrides: {} as Record<WeekDay, { startTime: string; endTime: string } | null>,
  isBlocking: false,
  isActive: true
};

const ActivityManagement: React.FC<ActivityManagementProps> = ({
  activities,
  onCreateActivity,
  onUpdateActivity,
  onSetActivityActive,
  onDeleteActivity,
  showActiveOnly,
  onShowActiveToggle
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = editingId !== null;

  const handleOpenDialog = (activity?: Activity) => {
    if (activity) {
      setEditingId(activity.id);
      setFormData({
        name: activity.name,
        color: activity.color,
        defaultStartTime: activity.defaultStartTime,
        defaultEndTime: activity.defaultEndTime,
        dayOverrides: { ...activity.dayOverrides } as Record<WeekDay, { startTime: string; endTime: string } | null>,
        isBlocking: activity.isBlocking,
        isActive: activity.isActive
      });
    } else {
      setEditingId(null);
      setFormData(initialFormData);
    }
    setError(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormData(initialFormData);
    setError(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (isEditing) {
        const updateDto: UpdateActivityDto = {
          name: formData.name.trim(),
          color: formData.color,
          defaultStartTime: formData.defaultStartTime,
          defaultEndTime: formData.defaultEndTime,
          dayOverrides: formData.dayOverrides,
          isBlocking: formData.isBlocking,
          isActive: formData.isActive
        };
        await onUpdateActivity(editingId!, updateDto);
      } else {
        const createDto: CreateActivityDto = {
          name: formData.name.trim() || '',
          color: formData.color,
          defaultStartTime: formData.defaultStartTime,
          defaultEndTime: formData.defaultEndTime,
          dayOverrides: formData.dayOverrides,
          isBlocking: formData.isBlocking,
          isActive: formData.isActive
        };
        await onCreateActivity(createDto);
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Error saving activity:', error);
      setError(error instanceof Error ? error.message : 'Failed to save activity');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await onSetActivityActive(id, !currentStatus);
    } catch (error) {
      console.error('Error updating activity status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את התקופה החסומה?')) {
      try {
        await onDeleteActivity(id);
      } catch (error) {
        console.error('Error deleting activity:', error);
      }
    }
  };

  const parseTime = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const handleDayOverrideChange = (day: WeekDay, field: 'startTime' | 'endTime', value: Date | null) => {
    setFormData(prev => {
      const newOverrides = { ...prev.dayOverrides };
      
      if (!value) {
        // If clearing time, remove or nullify this day's override
        if (field === 'startTime') {
          newOverrides[day] = null;
        } else if (newOverrides[day]) {
          newOverrides[day] = { ...newOverrides[day]!, [field]: '' };
        }
      } else {
        const timeString = formatTime(value);
        const currentOverride = newOverrides[day];
        
        if (currentOverride === null) {
          // Create new override for this day
          newOverrides[day] = {
            startTime: field === 'startTime' ? timeString : '',
            endTime: field === 'endTime' ? timeString : ''
          };
        } else {
          // Update existing override
          newOverrides[day] = {
            startTime: currentOverride?.startTime || '',
            endTime: currentOverride?.endTime || '',
            [field]: timeString
          };
        }
      }
      
      return { ...prev, dayOverrides: newOverrides };
    });
  };

  const filteredActivities = showActiveOnly 
    ? activities.filter(activity => activity.isActive)
    : activities;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
        פעילויות שוטפות
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={showActiveOnly}
                onChange={(e) => onShowActiveToggle(e.target.checked)}
              />
            }
            label="הצג פעילות בלבד"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            הוסף פעילות שוטפת
          </Button>
        </Box>
      </Box>

      <Box 
        sx={{ 
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)'
          },
          gap: 3
        }}
      >
        {filteredActivities.map((activity) => (
          <Card key={activity.id} sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        backgroundColor: activity.color,
                        flexShrink: 0
                      }}
                    />
                    <Typography variant="h6" component="h2">
                      {activity.name}
                    </Typography>
                  </Box>
                  <Box display="flex" flexDirection="column" gap={0.5}>
                    <Chip
                      label={activity.isActive ? 'פעיל' : 'לא פעיל'}
                      color={activity.isActive ? 'success' : 'default'}
                      size="small"
                    />
                    <Chip
                      label={activity.isBlocking ? 'חוסם טיפולים' : 'לא חוסם טיפולים'}
                      color={activity.isBlocking ? 'warning' : 'info'}
                      size="small"
                    />
                  </Box>
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>שעות יומיות:</strong>
                  </Typography>
                  {activity.defaultStartTime && activity.defaultEndTime ? (
                    <Typography variant="body2">
                      {activity.defaultStartTime} - {activity.defaultEndTime}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      לא הוגדר
                    </Typography>
                  )}
                </Box>

                {Object.keys(activity.dayOverrides).length > 0 && (
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>שעות בימים ספציפיים:</strong>
                    </Typography>
                    {Object.entries(activity.dayOverrides).map(([day, override]) => (
                      override && (
                        <Typography key={day} variant="body2">
                          {DAY_LABELS[day as WeekDay]}: {override.startTime} - {override.endTime}
                        </Typography>
                      )
                    ))}
                  </Box>
                )}

                <Box display="flex" gap={1} mt={2}>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleOpenDialog(activity)}
                  >
                    ערוך
                  </Button>
                  <Button
                    size="small"
                    color={activity.isActive ? 'warning' : 'success'}
                    onClick={() => handleToggleActive(activity.id, activity.isActive)}
                  >
                    {activity.isActive ? 'השבת' : 'הפעל'}
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDelete(activity.id)}
                  >
                    מחק
                  </Button>
                </Box>
              </CardContent>
            </Card>
        ))}
      </Box>

      {filteredActivities.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 3 }}>
          <ScheduleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            אין פעילויות שוטפות
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            הוסף פעילויות שוטפות כדי לנהל זמנים שבהם לא ניתן לתזמן טיפולים
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            הוסף פעילות שוטפת ראשונה
          </Button>
        </Paper>
      )}

      {/* Dialog for creating/editing activities */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'ערוך פעילויות שוטפות' : 'הגדר פעילויות שוטפות'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box display="flex" flexDirection="column" gap={3} pt={1}>
            <TextField
              label="שם הפעילות"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
              placeholder="לדוגמה: ארוחת בוקר, פגישת צוות"
            />

            <ColorPicker
              label="צבע"
              value={formData.color}
              onChange={(color: string) => setFormData(prev => ({ ...prev, color }))}
            />

            <Box>
              <Typography variant="h6" gutterBottom>
                שעות יומיות
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                זמן שיחול על כל הימים (אלא אם כן הוגדרה חריגה יומית). ניתן להשאיר ריק ולהגדיר רק ימים ספציפיים.
              </Typography>
              <Box display="flex" gap={2}>
                <TimePicker
                  label="שעת התחלה"
                  value={formData.defaultStartTime ? parseTime(formData.defaultStartTime) : null}
                  onChange={(newValue) => {
                    const timeString = newValue ? formatTime(newValue) : null;
                    setFormData(prev => ({ ...prev, defaultStartTime: timeString }));
                  }}
                  ampm={false}
                  slotProps={{ textField: { fullWidth: true } }}
                />
                <TimePicker
                  label="שעת סיום"
                  value={formData.defaultEndTime ? parseTime(formData.defaultEndTime) : null}
                  onChange={(newValue) => {
                    const timeString = newValue ? formatTime(newValue) : null;
                    setFormData(prev => ({ ...prev, defaultEndTime: timeString }));
                  }}
                  ampm={false}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Box>
            </Box>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">לו״ז לפי יום</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  הגדר זמנים שונים לימים מסוימים או השבת את התקופה החסומה לימים מסוימים
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  {WEEK_DAYS.map((day) => {
                    const override = formData.dayOverrides[day];
                    return (
                      <Box key={day}>
                        <Typography variant="subtitle2" gutterBottom>
                          {DAY_LABELS[day]}
                        </Typography>
                        <Box display="flex" gap={2} alignItems="center">
                          <TimePicker
                            label="שעת התחלה"
                            value={override?.startTime ? parseTime(override.startTime) : null}
                            onChange={(newValue) => handleDayOverrideChange(day, 'startTime', newValue)}
                            ampm={false}
                            slotProps={{ textField: { size: 'small' } }}
                          />
                          <TimePicker
                            label="שעת סיום"
                            value={override?.endTime ? parseTime(override.endTime) : null}
                            onChange={(newValue) => handleDayOverrideChange(day, 'endTime', newValue)}
                            ampm={false}
                            slotProps={{ textField: { size: 'small' } }}
                          />
                          <Button
                            size="small"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                dayOverrides: { ...prev.dayOverrides, [day]: null }
                              }));
                            }}
                          >
                            נקה
                          </Button>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </AccordionDetails>
            </Accordion>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isBlocking}
                  onChange={(e) => setFormData(prev => ({ ...prev, isBlocking: e.target.checked }))}
                />
              }
              label="חסימת תזמון טיפולים"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                />
              }
              label="תקופה פעילה"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            ביטול
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.name.trim() || saving}
            startIcon={saving ? <CircularProgress size={16} /> : undefined}
          >
            {saving ? 'שומר...' : 'שמור'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ActivityManagement;
