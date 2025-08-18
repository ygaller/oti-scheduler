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
import { Patient, getRandomColor } from '../types';
import { patientService } from '../services';
import { useRoles } from '../hooks';
import ColorPicker from './ColorPicker';

interface PatientManagementProps {
  patients: Patient[];
  setPatients: (includeInactive?: boolean) => Promise<void>;
  setPatientActive: (id: string, isActive: boolean) => Promise<Patient>;
  setShowHelpModal: (show: boolean) => void; // Add prop to open help modal
  activeTab: number; // Add prop to pass active tab index
}

const PatientManagement: React.FC<PatientManagementProps> = ({ patients, setPatients, setPatientActive, setShowHelpModal, activeTab }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [formData, setFormData] = useState<Partial<Patient>>({
    firstName: '',
    lastName: '',
    color: '',
    therapyRequirements: {}
  });

  // Get roles for therapy requirements
  const { getActiveRoles, getRoleByStringKey } = useRoles();
  const activeRoles = getActiveRoles();

  const handleOpenDialog = (patient?: Patient) => {
    if (patient) {
      setEditingPatient(patient);
      // Ensure all active role string keys are present with their values or 0
      const allRoleRequirements = activeRoles.reduce((acc, role) => ({
        ...acc,
        [role.roleStringKey]: patient.therapyRequirements?.[role.roleStringKey] || 0
      }), {});
      setFormData({
        ...patient,
        therapyRequirements: allRoleRequirements
      });
    } else {
      setEditingPatient(null);
      const emptyTherapyRequirements = activeRoles.reduce((acc, role) => ({
        ...acc,
        [role.roleStringKey]: 0
      }), {});
      setFormData({
        firstName: '',
        lastName: '',
        color: getRandomColor(),
        therapyRequirements: emptyTherapyRequirements
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPatient(null);
    setFormData({});
  };

  const handleSave = async () => {
    if (!formData.firstName) {
      alert('שם פרטי נדרש.'); // Simple alert for now, can be replaced with better UX
      return;
    }

    try {
      // Filter out 0 values from therapy requirements
      const filteredTherapyRequirements = Object.entries(formData.therapyRequirements || {})
        .filter(([_, sessions]) => sessions > 0)
        .reduce((acc, [roleStringKey, sessions]) => ({ ...acc, [roleStringKey]: sessions }), {});

      const patientData: Omit<Patient, 'id' | 'isActive'> = {
        firstName: formData.firstName,
        lastName: formData.lastName ?? '', // Ensure lastName is an empty string if undefined
        color: formData.color || getRandomColor(),
        therapyRequirements: filteredTherapyRequirements
      };

      if (editingPatient) {
        await patientService.update(editingPatient.id, patientData);
      } else {
        await patientService.create(patientData);
      }

      await setPatients(!showActiveOnly); // Refresh the list
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving patient:', error);
      // TODO: Add proper error handling/notification
    }
  };

  const handleToggleActive = async (patientId: string, currentStatus: boolean) => {
    try {
      await setPatientActive(patientId, !currentStatus);
      await setPatients(!showActiveOnly); // Refresh the list
    } catch (error) {
      console.error('Error updating patient status:', error);
      // TODO: Add proper error handling/notification
    }
  };

  const handleShowActiveToggle = async (checked: boolean) => {
    setShowActiveOnly(checked);
    await setPatients(!checked); // If showing active only, don't include inactive
  };

  const handleTherapyRequirementChange = (roleStringKey: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      therapyRequirements: {
        ...prev.therapyRequirements,
        [roleStringKey]: numValue
      }
    }));
  };

  const removeTherapyRequirement = (roleStringKey: string) => {
    setFormData(prev => {
      const newRequirements = { ...prev.therapyRequirements };
      delete newRequirements[roleStringKey];
      return {
        ...prev,
        therapyRequirements: newRequirements
      };
    });
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          ניהול מטופלים
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
            הוסף מטופל
          </Button>
          {/* Help Button for Patients Tab */}
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
              <TableCell>דרישות טיפול</TableCell>
              <TableCell>צבע</TableCell>
              <TableCell>סטטוס</TableCell>
              <TableCell>פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...patients].sort((a, b) => 
              `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
            ).map((patient) => (
              <TableRow key={patient.id} sx={{ opacity: patient.isActive ? 1 : 0.6 }}>
                <TableCell>{patient.firstName}</TableCell>
                <TableCell>{patient.lastName}</TableCell>
                <TableCell>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {Object.entries(patient.therapyRequirements || {})
                      .filter(([_, sessions]) => sessions > 0)
                      .map(([roleStringKey, sessions]) => {
                        const role = getRoleByStringKey(roleStringKey);
                        return (
                          <Chip
                            key={roleStringKey}
                            label={`${role ? role.name : roleStringKey}: ${sessions}`}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        );
                      })
                    }
                    {Object.keys(patient.therapyRequirements || {}).length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        אין דרישות טיפול
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      backgroundColor: patient.color,
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'grey.300'
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={patient.isActive ? 'פעיל' : 'כבוי'}
                    color={patient.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenDialog(patient)}>
                    <Edit />
                  </IconButton>
                  <Tooltip title={patient.isActive ? 'כבה' : 'הפעל'}>
                    <IconButton onClick={() => handleToggleActive(patient.id, patient.isActive)}>
                      {patient.isActive ? <PowerOff /> : <Power />}
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
          {editingPatient ? 'עריכת מטופל' : 'הוספת מטופל חדש'}
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
            
            <ColorPicker
              value={formData.color || ''}
              onChange={(color) => setFormData(prev => ({ ...prev, color }))}
              label="צבע המטופל"
            />
            
            {/* Therapy Requirements */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>דרישות טיפול</Typography>
              {activeRoles.map((role) => (
                <Box key={role.id} sx={{ mb: 2 }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body1" sx={{ minWidth: '150px' }}>
                      {role.name}
                    </Typography>
                    <TextField
                      type="number"
                      label="מינימום טיפולים"
                      size="small"
                      value={formData.therapyRequirements?.[role.roleStringKey] ?? 0}
                      onChange={(e) => handleTherapyRequirementChange(role.roleStringKey, e.target.value)}
                      inputProps={{ min: 0, max: 20 }}
                      sx={{ width: '150px' }}
                    />
                    {(formData.therapyRequirements?.[role.roleStringKey] ?? 0) > 0 && (
                      <Button
                        size="small"
                        color="secondary"
                        onClick={() => removeTherapyRequirement(role.roleStringKey)}
                      >
                        הסר
                      </Button>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>ביטול</Button>
          <Button onClick={handleSave} variant="contained">
            {editingPatient ? 'עדכן' : 'הוסף'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatientManagement;
