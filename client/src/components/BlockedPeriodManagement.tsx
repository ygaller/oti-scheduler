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
  BlockedPeriod, 
  CreateBlockedPeriodDto, 
  UpdateBlockedPeriodDto, 
  AVAILABLE_COLORS, 
  DAY_LABELS,
  WeekDay,
  WEEK_DAYS
} from '../types';
import ColorPicker from './ColorPicker';

interface BlockedPeriodManagementProps {
  blockedPeriods: BlockedPeriod[];
  onCreateBlockedPeriod: (data: CreateBlockedPeriodDto) => Promise<BlockedPeriod>;
  onUpdateBlockedPeriod: (id: string, data: UpdateBlockedPeriodDto) => Promise<BlockedPeriod>;
  onSetBlockedPeriodActive: (id: string, isActive: boolean) => Promise<BlockedPeriod>;
  onDeleteBlockedPeriod: (id: string) => Promise<void>;
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

const BlockedPeriodManagement: React.FC<BlockedPeriodManagementProps> = ({
  blockedPeriods,
  onCreateBlockedPeriod,
  onUpdateBlockedPeriod,
  onSetBlockedPeriodActive,
  onDeleteBlockedPeriod,
  showActiveOnly,
  onShowActiveToggle
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = editingId !== null;

  const handleOpenDialog = (blockedPeriod?: BlockedPeriod) => {
    if (blockedPeriod) {
      setEditingId(blockedPeriod.id);
      setFormData({
        name: blockedPeriod.name,
        color: blockedPeriod.color,
        defaultStartTime: blockedPeriod.defaultStartTime,
        defaultEndTime: blockedPeriod.defaultEndTime,
        dayOverrides: { ...blockedPeriod.dayOverrides } as Record<WeekDay, { startTime: string; endTime: string } | null>,
        isBlocking: blockedPeriod.isBlocking,
        isActive: blockedPeriod.isActive
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
        const updateDto: UpdateBlockedPeriodDto = {
          name: formData.name.trim(),
          color: formData.color,
          defaultStartTime: formData.defaultStartTime,
          defaultEndTime: formData.defaultEndTime,
          dayOverrides: formData.dayOverrides,
          isBlocking: formData.isBlocking,
          isActive: formData.isActive
        };
        await onUpdateBlockedPeriod(editingId!, updateDto);
      } else {
        const createDto: CreateBlockedPeriodDto = {
          name: formData.name.trim() || '',
          color: formData.color,
          defaultStartTime: formData.defaultStartTime,
          defaultEndTime: formData.defaultEndTime,
          dayOverrides: formData.dayOverrides,
          isBlocking: formData.isBlocking,
          isActive: formData.isActive
        };
        await onCreateBlockedPeriod(createDto);
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Error saving blocked period:', error);
      setError(error instanceof Error ? error.message : 'Failed to save blocked period');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await onSetBlockedPeriodActive(id, !currentStatus);
    } catch (error) {
      console.error('Error updating blocked period status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את התקופה החסומה?')) {
      try {
        await onDeleteBlockedPeriod(id);
      } catch (error) {
        console.error('Error deleting blocked period:', error);
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

  const filteredBlockedPeriods = showActiveOnly 
    ? blockedPeriods.filter(bp => bp.isActive)
    : blockedPeriods;

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
        {filteredBlockedPeriods.map((blockedPeriod) => (
          <Card key={blockedPeriod.id} sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        backgroundColor: blockedPeriod.color,
                        flexShrink: 0
                      }}
                    />
                    <Typography variant="h6" component="h2">
                      {blockedPeriod.name}
                    </Typography>
                  </Box>
                  <Box display="flex" flexDirection="column" gap={0.5}>
                    <Chip
                      label={blockedPeriod.isActive ? 'פעיל' : 'לא פעיל'}
                      color={blockedPeriod.isActive ? 'success' : 'default'}
                      size="small"
                    />
                    <Chip
                      label={blockedPeriod.isBlocking ? 'חוסם טיפולים' : 'לא חוסם טיפולים'}
                      color={blockedPeriod.isBlocking ? 'warning' : 'info'}
                      size="small"
                    />
                  </Box>
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>שעות יומיות:</strong>
                  </Typography>
                  {blockedPeriod.defaultStartTime && blockedPeriod.defaultEndTime ? (
                    <Typography variant="body2">
                      {blockedPeriod.defaultStartTime} - {blockedPeriod.defaultEndTime}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      לא הוגדר
                    </Typography>
                  )}
                </Box>

                {Object.keys(blockedPeriod.dayOverrides).length > 0 && (
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>שעות בימים ספציפיים:</strong>
                    </Typography>
                    {Object.entries(blockedPeriod.dayOverrides).map(([day, override]) => (
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
                    onClick={() => handleOpenDialog(blockedPeriod)}
                  >
                    ערוך
                  </Button>
                  <Button
                    size="small"
                    color={blockedPeriod.isActive ? 'warning' : 'success'}
                    onClick={() => handleToggleActive(blockedPeriod.id, blockedPeriod.isActive)}
                  >
                    {blockedPeriod.isActive ? 'השבת' : 'הפעל'}
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDelete(blockedPeriod.id)}
                  >
                    מחק
                  </Button>
                </Box>
              </CardContent>
            </Card>
        ))}
      </Box>

      {filteredBlockedPeriods.length === 0 && (
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

      {/* Dialog for creating/editing blocked periods */}
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

export default BlockedPeriodManagement;
