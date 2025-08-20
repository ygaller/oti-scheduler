import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

import { Role, CreateRoleDto, UpdateRoleDto } from '../types';

interface RoleManagementProps {
  roles: Role[];
  onCreateRole: (data: CreateRoleDto) => Promise<Role>;
  onUpdateRole: (id: string, data: UpdateRoleDto) => Promise<Role>;
  onSetRoleActive: (id: string, isActive: boolean) => Promise<Role>;
  onDeleteRole: (id: string) => Promise<void>;
  onGetEmployeeCount: (id: string) => Promise<number>;
  onGetSessionStats: (id: string) => Promise<{ assignedSessions: number; allocatedSessions: number }>;
  showActiveOnly: boolean;
  onShowActiveToggle: (showActiveOnly: boolean) => void;
}

interface FormData {
  name: string;
  isActive: boolean;
}

const RoleManagement: React.FC<RoleManagementProps> = ({
  roles,
  onCreateRole,
  onUpdateRole,
  onSetRoleActive,
  onDeleteRole,
  onGetEmployeeCount,
  onGetSessionStats,
  showActiveOnly,
  onShowActiveToggle,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: '', isActive: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employeeCounts, setEmployeeCounts] = useState<Record<string, number>>({});
  const [sessionStats, setSessionStats] = useState<Record<string, { assignedSessions: number; allocatedSessions: number }>>({});

  const displayedRoles = showActiveOnly ? roles.filter(role => role.isActive) : roles;

  // Load employee counts and session stats for roles
  React.useEffect(() => {
    const loadRoleData = async () => {
      const counts: Record<string, number> = {};
      const stats: Record<string, { assignedSessions: number; allocatedSessions: number }> = {};
      
      for (const role of roles) {
        try {
          counts[role.id] = await onGetEmployeeCount(role.id);
        } catch (err) {
          counts[role.id] = 0;
        }
        
        try {
          stats[role.id] = await onGetSessionStats(role.id);
        } catch (err) {
          stats[role.id] = { assignedSessions: 0, allocatedSessions: 0 };
        }
      }
      
      setEmployeeCounts(counts);
      setSessionStats(stats);
    };

    if (roles.length > 0) {
      loadRoleData();
    }
  }, [roles, onGetEmployeeCount, onGetSessionStats]);

  const handleOpenDialog = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        isActive: role.isActive
      });
    } else {
      setEditingRole(null);
      setFormData({ name: '', isActive: true });
    }
    setError(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRole(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('שם התפקיד הוא שדה חובה');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const roleData = {
        name: formData.name.trim(),
        isActive: formData.isActive
      };

      if (editingRole) {
        await onUpdateRole(editingRole.id, roleData);
      } else {
        await onCreateRole(roleData);
      }

      handleCloseDialog();
    } catch (err) {
      console.error('Error saving role:', err);
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת התפקיד');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (role: Role) => {
    try {
      await onSetRoleActive(role.id, !role.isActive);
    } catch (err) {
      console.error('Error toggling role status:', err);
    }
  };

  const handleDelete = async (role: Role) => {
    const employeeCount = employeeCounts[role.id] || 0;
    
    if (employeeCount > 0) {
      setError(`לא ניתן למחוק תפקיד שמוקצה ל-${employeeCount} עובד${employeeCount > 1 ? 'ים' : ''}. יש להסיר את התפקיד מכל העובדים לפני המחיקה.`);
      return;
    }

    if (window.confirm(`האם אתה בטוח שברצונך למחוק את התפקיד "${role.name}"?`)) {
      try {
        await onDeleteRole(role.id);
        setError(null);
      } catch (err) {
        console.error('Error deleting role:', err);
        setError(err instanceof Error ? err.message : 'שגיאה במחיקת התפקיד');
      }
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          תפקידים
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={showActiveOnly}
                onChange={(e) => onShowActiveToggle(e.target.checked)}
                color="primary"
              />
            }
            label="הצג פעילים בלבד"
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            הוסף תפקיד
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>שם התפקיד</TableCell>
              <TableCell>מספר עובדים</TableCell>
              <TableCell>סה״כ טיפולים</TableCell>
              <TableCell>סטטוס</TableCell>
              <TableCell align="left">פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedRoles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>
                  <Typography variant="body1" fontWeight={role.isActive ? 'normal' : 400}>
                    {role.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={employeeCounts[role.id] || 0} 
                    size="small"
                    color={employeeCounts[role.id] > 0 ? "default" : "secondary"}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={`${sessionStats[role.id]?.assignedSessions || 0}/${sessionStats[role.id]?.allocatedSessions || 0}`}
                    size="small"
                    color={sessionStats[role.id]?.assignedSessions > 0 ? "primary" : "default"}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={role.isActive ? 'פעיל' : 'לא פעיל'}
                    color={role.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="left">
                  <Box display="flex" gap={1}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(role)}
                      title="ערוך תפקיד"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleActive(role)}
                      title={role.isActive ? 'הפוך ללא פעיל' : 'הפוך לפעיל'}
                      color={role.isActive ? 'default' : 'primary'}
                    >
                      {role.isActive ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(role)}
                      title="מחק תפקיד"
                      color="error"
                      disabled={employeeCounts[role.id] > 0}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {displayedRoles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary">
                    {showActiveOnly ? 'אין תפקידים פעילים' : 'אין תפקידים במערכת'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRole ? 'ערוך תפקיד' : 'הוסף תפקיד חדש'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <TextField
            fullWidth
            label="שם התפקיד"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            margin="normal"
            required
            disabled={loading}
            slotProps={{ input: { inputProps: { maxLength: 100 } } }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                disabled={loading}
              />
            }
            label="תפקיד פעיל"
            sx={{ mt: 2 }}
          />

        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>
            ביטול
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.name.trim()}
            startIcon={loading ? <CircularProgress size={16} /> : undefined}
          >
            {loading ? 'שומר...' : (editingRole ? 'עדכן' : 'הוסף')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoleManagement;
