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
  Chip
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { Employee, Role, ROLE_LABELS, DAY_LABELS, WEEK_DAYS } from '../types';
import { employeeService } from '../services';

interface EmployeeManagementProps {
  employees: Employee[];
  setEmployees: () => Promise<void>;
}

const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ employees, setEmployees }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({
    firstName: '',
    lastName: '',
    role: 'occupational-therapist',
    weeklySessionsCount: 10,
    workingHours: {}
  });

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData(employee);
    } else {
      setEditingEmployee(null);
      setFormData({
        firstName: '',
        lastName: '',
        role: 'occupational-therapist',
        weeklySessionsCount: 10,
        workingHours: {}
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
    if (!formData.firstName || !formData.lastName) return;

    try {
      const employeeData: Omit<Employee, 'id'> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role || 'occupational-therapist',
        weeklySessionsCount: formData.weeklySessionsCount || 10,
        workingHours: formData.workingHours || {}
      };

      if (editingEmployee) {
        await employeeService.update(editingEmployee.id, employeeData);
      } else {
        await employeeService.create(employeeData);
      }

      await setEmployees(); // Refresh the list
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving employee:', error);
      // TODO: Add proper error handling/notification
    }
  };

  const handleDelete = async (employeeId: string) => {
    try {
      await employeeService.delete(employeeId);
      await setEmployees(); // Refresh the list
    } catch (error) {
      console.error('Error deleting employee:', error);
      // TODO: Add proper error handling/notification
    }
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          ניהול עובדים
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          הוסף עובד
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>שם פרטי</TableCell>
              <TableCell>שם משפחה</TableCell>
              <TableCell>תפקיד</TableCell>
              <TableCell>מספר טיפולים שבועי</TableCell>
              <TableCell>ימי עבודה</TableCell>
              <TableCell>פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>{employee.firstName}</TableCell>
                <TableCell>{employee.lastName}</TableCell>
                <TableCell>{ROLE_LABELS[employee.role]}</TableCell>
                <TableCell>{employee.weeklySessionsCount}</TableCell>
                <TableCell>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {WEEK_DAYS.map(day => {
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
                  <IconButton onClick={() => handleOpenDialog(employee)}>
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(employee.id)}>
                    <Delete />
                  </IconButton>
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
            
            <Box display="flex" gap={2}>
              <FormControl fullWidth>
                <InputLabel>תפקיד</InputLabel>
                <Select
                  value={formData.role || 'occupational-therapist'}
                  label="תפקיד"
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as Role }))}
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="מספר טיפולים שבועי"
                type="number"
                value={formData.weeklySessionsCount || 10}
                onChange={(e) => setFormData(prev => ({ ...prev, weeklySessionsCount: parseInt(e.target.value) }))}
              />
            </Box>
            
            {/* Working Hours */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>שעות עבודה</Typography>
              {WEEK_DAYS.map(day => (
                <Box key={day} sx={{ mb: 2 }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body1" sx={{ minWidth: '120px' }}>
                      {DAY_LABELS[day]}
                    </Typography>
                    <TimePicker
                      label="שעת התחלה"
                      value={formData.workingHours?.[day]?.startTime ? parseTime(formData.workingHours[day]!.startTime) : null}
                      onChange={(newValue) => handleWorkingHoursChange(day, 'startTime', newValue)}
                      slotProps={{ textField: { size: 'small' } }}
                    />
                    <TimePicker
                      label="שעת סיום"
                      value={formData.workingHours?.[day]?.endTime ? parseTime(formData.workingHours[day]!.endTime) : null}
                      onChange={(newValue) => handleWorkingHoursChange(day, 'endTime', newValue)}
                      slotProps={{ textField: { size: 'small' } }}
                    />
                  </Box>
                </Box>
              ))}
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
