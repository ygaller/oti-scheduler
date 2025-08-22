import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Typography
} from '@mui/material';
import { Employee, Patient, Schedule } from '../types';
import { useRoles } from '../hooks';
import { calculateSessionCountsByRole, calculateEmployeeSessionCount, calculateTotalSessionCount, formatSessionCount } from '../utils/sessionCounting';

interface TherapyRequirementsCardsProps {
  schedule: Schedule | null;
  patients: Patient[];
  employees: Employee[];
}

const TherapyRequirementsCards: React.FC<TherapyRequirementsCardsProps> = ({
  schedule,
  patients,
  employees
}) => {
  const { getRoleByStringKey } = useRoles(true); // Include inactive roles to properly display therapy requirements

  // Generate unassigned therapy requirement chips data
  const generateUnassignedTherapyChips = () => {
    const chips: Array<{
      id: string;
      patientName: string;
      therapyType: string;
      amount: number;
      patientColor: string;
    }> = [];

    // Get only active patients
    const activePatients = patients.filter(patient => patient.isActive);

    activePatients.forEach(patient => {
      const patientName = `${patient.firstName} ${patient.lastName}`;
      
      // Count assigned sessions for this patient by role with fractional counting
      const assignedSessionsByRole = schedule ?
        calculateSessionCountsByRole(schedule.sessions, patient.id, employees) : {};
      
      // Iterate through each therapy requirement for this patient
      Object.entries(patient.therapyRequirements || {}).forEach(([role, requiredAmount]) => {
        if (requiredAmount > 0) {
          const assignedAmount = assignedSessionsByRole[role] || 0;
          const unassignedAmount = Math.max(0, requiredAmount - assignedAmount);
          
          // Only show chip if there are unassigned sessions
          if (unassignedAmount > 0) {
            chips.push({
              id: `${patient.id}-${role}`,
              patientName,
              therapyType: getRoleByStringKey(role)?.name || role,
              amount: unassignedAmount,
              patientColor: patient.color
            });
          }
        }
      });
    });

    // Sort chips by patient name, then by therapy type
    return chips.sort((a, b) => {
      if (a.patientName !== b.patientName) {
        return a.patientName.localeCompare(b.patientName, 'he');
      }
      return a.therapyType.localeCompare(b.therapyType, 'he');
    });
  };

  // Generate therapy above minimum requirement chips data
  const generateAboveMinimumTherapyChips = () => {
    const chips: Array<{
      id: string;
      patientName: string;
      therapyType: string;
      amount: number;
      patientColor: string;
    }> = [];

    // Get only active patients
    const activePatients = patients.filter(patient => patient.isActive);

    activePatients.forEach(patient => {
      const patientName = `${patient.firstName} ${patient.lastName}`;
      
      // Count assigned sessions for this patient by role with fractional counting
      const assignedSessionsByRole = schedule ?
        calculateSessionCountsByRole(schedule.sessions, patient.id, employees) : {};
      
      // Iterate through each therapy requirement for this patient
      Object.entries(patient.therapyRequirements || {}).forEach(([role, requiredAmount]) => {
        if (requiredAmount > 0) {
          const assignedAmount = assignedSessionsByRole[role] || 0;
          const excessAmount = assignedAmount - requiredAmount;
          
          // Only show chip if there are excess sessions (above minimum)
          if (excessAmount > 0) {
            chips.push({
              id: `${patient.id}-${role}-excess`,
              patientName,
              therapyType: getRoleByStringKey(role)?.name || role,
              amount: excessAmount,
              patientColor: patient.color
            });
          }
        }
      });
    });

    // Sort chips by patient name, then by therapy type
    return chips.sort((a, b) => {
      if (a.patientName !== b.patientName) {
        return a.patientName.localeCompare(b.patientName, 'he');
      }
      return a.therapyType.localeCompare(b.therapyType, 'he');
    });
  };

  const getTotalScheduledSessions = () => {
    if (!schedule) return 0;
    return calculateTotalSessionCount(schedule.sessions);
  };

  const getEmployeeSessionCount = (employeeId: string) => {
    if (!schedule) return 0;
    return calculateEmployeeSessionCount(schedule.sessions, employeeId, true);
  };

  if (!schedule) {
    return null;
  }

  return (
    <Box display="flex" gap={3} flexWrap="wrap" sx={{ mb: 3 }}>
      {/* Unassigned Therapy Requirements Section */}
      {patients.length > 0 && (
        <Card sx={{ flex: 1, minWidth: '300px' }}>
          <CardContent>
            <Typography variant="h6" component="h2" mb={2}>
              טיפולים נדרשים שלא שובצו
            </Typography>
            <Box 
              display="flex" 
              flexWrap="wrap" 
              gap={1}
              sx={{
                maxHeight: '96px', // Approximately 3 lines of chips (32px per line)
                overflowY: 'auto',
                '&::-webkit-scrollbar': {
                  width: 6,
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: 'grey.200',
                  borderRadius: 3,
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'grey.400',
                  borderRadius: 3,
                  '&:hover': {
                    backgroundColor: 'grey.500',
                  },
                },
              }}
            >
              {generateUnassignedTherapyChips().length > 0 ? (
                generateUnassignedTherapyChips().map(chip => (
                  <Chip
                    key={chip.id}
                    label={`${chip.patientName} - ${chip.therapyType} (${chip.amount})`}
                    variant="outlined"
                    size="small"
                    sx={{
                      borderColor: chip.patientColor,
                      color: chip.patientColor,
                      backgroundColor: `${chip.patientColor}15`,
                      '&:hover': {
                        backgroundColor: `${chip.patientColor}25`,
                      }
                    }}
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  כל הטיפולים הנדרשים הוקצו למטופלים
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Above Minimum Therapy Requirements Section */}
      {patients.length > 0 && (
        <Card sx={{ flex: 1, minWidth: '300px' }}>
          <CardContent>
            <Typography variant="h6" component="h2" mb={2}>
              טיפולים מעבר למינימום הנדרש
            </Typography>
            <Box 
              display="flex" 
              flexWrap="wrap" 
              gap={1}
              sx={{
                maxHeight: '96px', // Approximately 3 lines of chips (32px per line)
                overflowY: 'auto',
                '&::-webkit-scrollbar': {
                  width: 6,
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: 'grey.200',
                  borderRadius: 3,
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'grey.400',
                  borderRadius: 3,
                  '&:hover': {
                    backgroundColor: 'grey.500',
                  },
                },
              }}
            >
              {generateAboveMinimumTherapyChips().length > 0 ? (
                generateAboveMinimumTherapyChips().map(chip => (
                  <Chip
                    key={chip.id}
                    label={`${chip.patientName} - ${chip.therapyType} (${chip.amount})`}
                    variant="outlined"
                    size="small"
                    sx={{
                      borderColor: chip.patientColor,
                      color: chip.patientColor,
                      backgroundColor: `${chip.patientColor}15`,
                      '&:hover': {
                        backgroundColor: `${chip.patientColor}25`,
                      }
                    }}
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  אין מטופלים עם טיפולים מעבר למינימום הנדרש
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Statistics Card */}
      <Card sx={{ flex: 1, minWidth: '300px' }}>
        <CardContent>
          <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" mb={2}>
            <Typography variant="h6" component="h2">
            טיפולים לפי עובד (עם מטופל):
            </Typography>
          </Box>

          <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2}>
            <Box 
              display="flex" 
              flexWrap="wrap" 
              gap={1} 
              sx={{ 
                flex: 1,
                maxHeight: '96px', // Approximately 3 lines of chips (32px per line)
                overflowY: 'auto',
                '&::-webkit-scrollbar': {
                  width: 6,
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: 'grey.200',
                  borderRadius: 3,
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'grey.400',
                  borderRadius: 3,
                  '&:hover': {
                    backgroundColor: 'grey.500',
                  },
                },
              }}
            >
              {[...employees].sort((a, b) =>
                `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
              ).map(employee => (
                <Chip
                  key={employee.id}
                  label={`${employee.firstName} ${employee.lastName}: ${formatSessionCount(getEmployeeSessionCount(employee.id))}/${employee.weeklySessionsCount}`}
                  variant="outlined"
                  size="small"
                  sx={{
                    borderColor: employee.color,
                    color: employee.color,
                    backgroundColor: getEmployeeSessionCount(employee.id) === employee.weeklySessionsCount
                      ? `${employee.color}20`
                      : 'transparent'
                  }}
                />
              ))}
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            סה"כ טיפולים (עם ובלי מטופל): {formatSessionCount(getTotalScheduledSessions())}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TherapyRequirementsCards;
