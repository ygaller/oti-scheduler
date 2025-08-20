import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Checkbox,
  FormControlLabel,
  Tooltip
} from '@mui/material';
import { Add, Edit, PowerOff, Power, HelpOutline } from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { Employee, ReservedHour, getRandomColor, getRoleName } from '../types';
import { DAY_LABELS, WEEK_DAYS, WeekDay } from '../types/schedule';
import { employeeService } from '../services';
import { useRoles } from '../hooks';
import ColorPicker from './ColorPicker';
import { getEmailValidationError } from '../utils/validation';

interface EmployeeManagementProps {
  employees: Employee[];
  setEmployees: (includeInactive?: boolean) => Promise<void>;
  setEmployeeActive: (id: string, isActive: boolean) => Promise<Employee>;
  setShowHelpModal: (show: boolean) => void; // Add prop to open help modal
  activeTab: number; // Add prop to pass active tab index
}

const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ employees, setEmployees, setEmployeeActive, setShowHelpModal, activeTab }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [formData, setFormData] = useState<Partial<Employee>>({
    firstName: '',
    lastName: '',
    email: '',
    roleId: '',
    weeklySessionsCount: 10,
    workingHours: {},
    reservedHours: [],
    color: ''
  });

  // Get roles for the dropdown
  const { getActiveRoles } = useRoles();
  const activeRoles = getActiveRoles();

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData(employee);
    } else {
      setEditingEmployee(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        roleId: activeRoles.length > 0 ? activeRoles[0].id : '',
        weeklySessionsCount: 10,
        workingHours: {},
        reservedHours: [],
        color: getRandomColor()
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEmployee(null);
    setFormData({});
  };

  const handleSave = async () => {
    if (!formData.firstName || !formData.roleId) {
      alert('שם פרטי ותפקיד נדרשים.'); // Simple alert for now, can be replaced with better UX
      return;
    }

    // Validate email format
    const emailError = getEmailValidationError(formData.email || '');
    if (emailError) {
      alert(emailError);
      return;
    }

    try {
      const employeeData: Omit<Employee, 'id' | 'isActive' | 'role'> = {
        firstName: formData.firstName,
        lastName: formData.lastName ?? '', // Ensure lastName is an empty string if undefined
        email: formData.email ?? '', // Ensure email is an empty string if undefined
        roleId: formData.roleId,
        weeklySessionsCount: formData.weeklySessionsCount ?? 10,
        workingHours: formData.workingHours || {},
        reservedHours: formData.reservedHours || [],
        color: formData.color || getRandomColor()
      };

      if (editingEmployee) {
        await employeeService.update(editingEmployee.id, employeeData);
      } else {
        await employeeService.create(employeeData);
      }

      await setEmployees(!showActiveOnly); // Refresh the list
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving employee:', error);
      // TODO: Add proper error handling/notification
    }
  };

  const handleToggleActive = async (employeeId: string, currentStatus: boolean) => {
    try {
      await setEmployeeActive(employeeId, !currentStatus);
      await setEmployees(!showActiveOnly); // Refresh the list
    } catch (error) {
      console.error('Error updating employee status:', error);
      // TODO: Add proper error handling/notification
    }
  };

  const handleShowActiveToggle = async (checked: boolean) => {
    setShowActiveOnly(checked);
    await setEmployees(!checked); // If showing active only, don't include inactive
  };

  const handleWorkingHoursChange = (day: keyof Employee['workingHours'], field: 'startTime' | 'endTime', value: Date | null) => {
    if (!value) {
      // Remove the day if time is cleared
      setFormData(prev => ({
        ...prev,
        workingHours: {
          ...prev.workingHours,
          [day]: field === 'startTime' 
            ? undefined 
            : { ...(prev.workingHours?.[day] || {}), [field]: undefined }
        }
      }));
      return;
    }

    const timeString = value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    
    setFormData(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: {
          ...(prev.workingHours?.[day] || { startTime: '08:00', endTime: '17:00' }),
          [field]: timeString
        }
      }
    }));
  };

  const parseTime = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const handleReservedHourAdd = () => {
    const newReservedHour: ReservedHour = {
      day: 'sunday',
      startTime: '09:00',
      endTime: '10:00',
      notes: ''
    };
    
    setFormData(prev => ({
      ...prev,
      reservedHours: [...(prev.reservedHours || []), newReservedHour]
    }));
  };

  const handleReservedHourRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      reservedHours: (prev.reservedHours || []).filter((_, i) => i !== index)
    }));
  };

  const handleReservedHourChange = (index: number, field: keyof ReservedHour, value: string) => {
    setFormData(prev => ({
      ...prev,
      reservedHours: (prev.reservedHours || []).map((hour, i) => 
        i === index ? { ...hour, [field]: value } : hour
      )
    }));
  };

  const handleReservedHourTimeChange = (index: number, field: 'startTime' | 'endTime', value: Date | null) => {
    if (!value) return;
    
    const timeString = value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    handleReservedHourChange(index, field, timeString);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          ניהול עובדים
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <FormControlLabel
            control={
              <Checkbox
                checked={showActiveOnly}
                onChange={(e) => handleShowActiveToggle(e.target.checked)}
              />
            }
            label="הראה פעילים בלבד"
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            הוסף עובד
          </Button>
          {/* Help Button for Employees Tab */}
          <IconButton color="primary" onClick={() => setShowHelpModal(true)}>
            <HelpOutline sx={{ fontSize: 24 }} />
          </IconButton>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>שם פרטי</TableCell>
              <TableCell>שם משפחה</TableCell>
              <TableCell>אימייל</TableCell>
              <TableCell>תפקיד</TableCell>
              <TableCell>מספר טיפולים שבועי</TableCell>
              <TableCell>ימי עבודה</TableCell>
              <TableCell>שעות חסומות</TableCell>
              <TableCell>צבע</TableCell>
              <TableCell>סטטוס</TableCell>
              <TableCell>פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...employees].sort((a, b) => 
              `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
            ).map((employee) => (
              <TableRow key={employee.id} sx={{ opacity: employee.isActive ? 1 : 0.6 }}>
                <TableCell>{employee.firstName}</TableCell>
                <TableCell>{employee.lastName}</TableCell>
                <TableCell>{employee.email || '-'}</TableCell>
                <TableCell>
                  <Chip 
                    label={getRoleName(employee.role, employee.roleId)} 
                    color="primary"
                    variant="outlined"
                    size="small" 
                  />
                </TableCell>
                <TableCell>{employee.weeklySessionsCount}</TableCell>
                <TableCell>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {WEEK_DAYS.map((day: WeekDay) => {
                      const hours = employee.workingHours[day];
                      return hours ? (
                        <Chip
                          key={day}
                          label={`${DAY_LABELS[day]}: ${hours.startTime}-${hours.endTime}`}
                          size="small"
                          variant="outlined"
                        />
                      ) : null;
                    })}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {employee.reservedHours.map((reservedHour, index) => (
                                              <Chip
                          key={index}
                          label={`${DAY_LABELS[reservedHour.day]}: ${reservedHour.startTime}-${reservedHour.endTime}${reservedHour.notes ? ` (${reservedHour.notes})` : ''}`}
                          size="small"
                          variant="outlined"
                          color="warning"
                          title={reservedHour.notes || 'שעה חסומה'}
                        />
                    ))}
                    {employee.reservedHours.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        ללא שעות חסומות
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      backgroundColor: employee.color,
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'grey.300'
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={employee.isActive ? 'פעיל' : 'כבוי'}
                    color={employee.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenDialog(employee)}>
                    <Edit />
                  </IconButton>
                  <Tooltip title={employee.isActive ? 'השבת' : 'הפעל'}>
                    <IconButton onClick={() => handleToggleActive(employee.id, employee.isActive)}>
                      {employee.isActive ? <PowerOff /> : <Power />}
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingEmployee ? 'עריכת עובד' : 'הוספת עובד חדש'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box display="flex" gap={2}>
              <TextField
                fullWidth
                label="שם פרטי"
                value={formData.firstName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              />
              <TextField
                fullWidth
                label="שם משפחה"
                value={formData.lastName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </Box>
            
            <TextField
              fullWidth
              label="אימייל"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              error={!!getEmailValidationError(formData.email || '')}
              helperText={getEmailValidationError(formData.email || '') || "כתובת אימייל (אופציונלי)"}
            />
            
            <Box display="flex" gap={2}>
              <FormControl fullWidth>
                <InputLabel>תפקיד</InputLabel>
                <Select
                  value={formData.roleId || ''}
                  label="תפקיד"
                  onChange={(e) => setFormData(prev => ({ ...prev, roleId: e.target.value }))}
                  required
                >
                  {activeRoles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="מספר טיפולים שבועי"
                type="number"
                slotProps={{ input: { inputProps: { min: 0 } } }}
                value={formData.weeklySessionsCount ?? 10}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setFormData(prev => ({ ...prev, weeklySessionsCount: isNaN(value) ? 0 : Math.max(0, value) }));
                }}
              />
            </Box>
            
            <ColorPicker
              value={formData.color || ''}
              onChange={(color) => setFormData(prev => ({ ...prev, color }))}
              label="צבע העובד"
            />
            
            {/* Working Hours */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>שעות עבודה</Typography>
              {WEEK_DAYS.map((day: WeekDay) => (
                <Box key={day} sx={{ mb: 2 }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body1" sx={{ minWidth: '120px' }}>
                      {DAY_LABELS[day]}
                    </Typography>
                    <TimePicker
                      label="שעת התחלה"
                      value={formData.workingHours?.[day]?.startTime ? parseTime(formData.workingHours[day]!.startTime) : null}
                      onChange={(newValue) => handleWorkingHoursChange(day, 'startTime', newValue)}
                      ampm={false}
                      slotProps={{ textField: { size: 'small' } }}
                    />
                    <TimePicker
                      label="שעת סיום"
                      value={formData.workingHours?.[day]?.endTime ? parseTime(formData.workingHours[day]!.endTime) : null}
                      onChange={(newValue) => handleWorkingHoursChange(day, 'endTime', newValue)}
                      ampm={false}
                      slotProps={{ textField: { size: 'small' } }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Reserved Hours */}
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">שעות חסומות</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleReservedHourAdd}
                  startIcon={<Add />}
                >
                  הוסף שעה חסומה
                </Button>
              </Box>
              
              {(formData.reservedHours || []).map((reservedHour, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                  <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
                    <FormControl sx={{ minWidth: '120px' }}>
                      <InputLabel>יום</InputLabel>
                      <Select
                        value={reservedHour.day}
                        label="יום"
                        onChange={(e) => handleReservedHourChange(index, 'day', e.target.value)}
                        size="small"
                      >
                        {WEEK_DAYS.map((day: WeekDay) => (
                          <MenuItem key={day} value={day}>{DAY_LABELS[day]}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TimePicker
                      label="שעת התחלה"
                      value={parseTime(reservedHour.startTime)}
                      onChange={(newValue) => handleReservedHourTimeChange(index, 'startTime', newValue)}
                      ampm={false}
                      slotProps={{ textField: { size: 'small' } }}
                    />
                    <TimePicker
                      label="שעת סיום"
                      value={parseTime(reservedHour.endTime)}
                      onChange={(newValue) => handleReservedHourTimeChange(index, 'endTime', newValue)}
                      ampm={false}
                      slotProps={{ textField: { size: 'small' } }}
                    />
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleReservedHourRemove(index)}
                    >
                      הסר
                    </Button>
                  </Box>
                  <TextField
                    fullWidth
                    label="הערות"
                    value={reservedHour.notes || ''}
                    onChange={(e) => handleReservedHourChange(index, 'notes', e.target.value)}
                    size="small"
                    placeholder="למשל: ארוחת צהריים, מפגש צוות, פגישה אישית"
                  />
                </Box>
              ))}
              
              {(formData.reservedHours || []).length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  אין שעות חסומות מוגדרות
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>ביטול</Button>
          <Button onClick={handleSave} variant="contained">
            {editingEmployee ? 'עדכן' : 'הוסף'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeManagement;
