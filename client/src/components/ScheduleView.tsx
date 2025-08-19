import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton
} from '@mui/material';
import { 
  CalendarToday, 
  Download, 
  Print,
  Warning,
  Delete,
  HelpOutline // Import HelpOutline
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { 
  Employee, 
  Room, 
  Schedule, 
  Session, 
  getRoleName,
  Activity,
  Patient,
  CreateSessionDto
} from '../types';
import { useRoles } from '../hooks';
import ErrorModal from './ErrorModal';
import ConsecutiveSessionsWarningModal from './ConsecutiveSessionsWarningModal';
import { WeekDay, WEEK_DAYS, DAY_LABELS } from '../types/schedule';
import { scheduleService, ApiError, ConsecutiveSessionsWarning, BlockingActivityWarning } from '../services';
import { useActivities } from '../hooks';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

import { getContrastingTextColor } from '../utils/colorUtils';

interface ScheduleViewProps {
  employees: Employee[];
  rooms: Room[];
  patients: Patient[];
  schedule: Schedule | null;
  setSchedule: () => Promise<void>;
  setShowHelpModal: (show: boolean) => void; // Add prop to open help modal
  activeTab: number; // Add prop to pass active tab index
}

const ScheduleView: React.FC<ScheduleViewProps> = ({
  employees,
  rooms,
  patients,
  schedule,
  setSchedule,
  setShowHelpModal, // Destructure new prop
  activeTab // Destructure new prop
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionForm, setSessionForm] = useState<Partial<Session>>({
    patientIds: []
  });
  const [isResetting, setIsResetting] = useState(false);
  const [scheduleViewTab, setScheduleViewTab] = useState(0); // Renamed from activeTab to avoid conflict
  const [confirmCreateSessionOpen, setConfirmCreateSessionOpen] = useState(false); // New state for session creation confirmation
  const [pendingSessionCreationData, setPendingSessionCreationData] = useState<Partial<Session> | null>(null); // New state for pending session data
  const [pendingSessionUpdateData, setPendingSessionUpdateData] = useState<{sessionId: string, data: Partial<Session>} | null>(null); // New state for pending session update data
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{
    title: string;
    message: string;
    details?: string;
  } | null>(null);
  const [resetScheduleDialogOpen, setResetScheduleDialogOpen] = useState(false);

  // Patient view states
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // Session editing states (renamed from patient assignment)
  const [sessionEditDialogOpen, setSessionEditDialogOpen] = useState(false);
  const [editingSessionForAssignment, setEditingSessionForAssignment] = useState<Session | null>(null);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Consecutive sessions warning states
  const [consecutiveWarningOpen, setConsecutiveWarningOpen] = useState(false);
  const [consecutiveWarnings, setConsecutiveWarnings] = useState<Array<{
    patientId: string;
    patientName?: string;
    warning: string;
    consecutiveCount: number;
  }>>([]);
  const [pendingAssignmentData, setPendingAssignmentData] = useState<{
    sessionId: string;
    patientIds: string[];
  } | null>(null);

  const [preselectedEmployeeId, setPreselectedEmployeeId] = useState<string | null>(null);

  // Get blocked periods for display
  const { activities } = useActivities(true); // Only active ones
  const { getRoleByStringKey } = useRoles();

  // Set default selected patient to first active patient
  React.useEffect(() => {
    const activePatients = patients.filter(patient => patient.isActive);
    if (activePatients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(activePatients[0].id);
    }
  }, [patients, selectedPatientId]);

  const handleResetScheduleClick = () => {
    console.log('Reset schedule button clicked!');
    
    // Show reset confirmation dialog
    setResetScheduleDialogOpen(true);
  };

  const handleResetSchedule = async () => {
    setResetScheduleDialogOpen(false);
    setIsResetting(true);

    try {
      console.log('Calling scheduleService.reset()...');
      const newSchedule = await scheduleService.reset();
      console.log('Schedule reset successfully:', newSchedule);

      console.log('Refreshing schedule from server...');
      await setSchedule(); // Refresh the schedule from the server
      console.log('Schedule refreshed successfully');

      console.log('Schedule reset completed successfully');
    } catch (error) {
      console.error('Error resetting schedule:', error);

      const isApiError = error instanceof ApiError;
      setErrorInfo({
        title: 'שגיאה באיפוס לוח הזמנים',
        message: isApiError ? error.message : 'שגיאה לא ידועה בתקשורת עם השרת',
        details: isApiError ? error.details : undefined
      });
      setErrorModalOpen(true);
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportExcel = () => {
    if (!schedule || schedule.sessions.length === 0) {
      setErrorInfo({
        title: 'לא ניתן לייצא',
        message: 'אין נתונים לייצוא'
      });
      setErrorModalOpen(true);
      return;
    }

    try {
      // Import the Excel export function dynamically
      import('../utils/excelExport').then(({ exportScheduleToExcel }) => {
        exportScheduleToExcel({
          sessions: schedule.sessions,
          employees,
          rooms,
          patients,
          activities
        });
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setErrorInfo({
        title: 'שגיאה בייצוא',
        message: 'שגיאה בייצוא לקובץ Excel'
      });
      setErrorModalOpen(true);
    }
  };

  const handlePrint = () => {
    if (!schedule || schedule.sessions.length === 0) {
      setErrorInfo({
        title: 'לא ניתן להדפיס',
        message: 'אין נתונים להדפסה'
      });
      setErrorModalOpen(true);
      return;
    }

    // For patient view, check if a patient is selected
    if (activeTab === 2 && !selectedPatientId) {
      setErrorInfo({
        title: 'לא ניתן להדפיס',
        message: 'יש לבחור מטופל כדי להדפיס את לוח הזמנים שלו'
      });
      setErrorModalOpen(true);
      return;
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setErrorInfo({
        title: 'שגיאה בהדפסה',
        message: 'חסימת חלונות קופצים מונעת את הפתיחה של חלון ההדפסה',
        details: 'אנא אפשר חלונות קופצים עבור אתר זה ונסה שוב'
      });
      setErrorModalOpen(true);
      return;
    }

    // Generate the printable content based on active tab
    const printContent = generatePrintableSchedule(activeTab, selectedPatientId);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <title>לוח זמנים - ${new Date().toLocaleDateString('he-IL')}</title>
        <style>
          ${getPrintStyles()}
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleAddSession = (
    day?: WeekDay,
    startTime?: string,
    employeeId?: string
  ) => {
    setEditingSession(null);
    setSessionForm({
      day: day || 'sunday',
      startTime: startTime || '09:00',
      endTime: startTime ? formatTime(new Date(parseTime(startTime).getTime() + 45 * 60 * 1000)) : '09:45',
      employeeIds: employeeId ? [employeeId] : (employees[0]?.id ? [employees[0].id] : []),
      roomId: rooms[0]?.id || '',
      patientIds: [] // Initialize patientIds
    });
    setPreselectedEmployeeId(employeeId || null);
    setEditDialogOpen(true);
  };

  const handleSaveSession = async () => {
    if (!sessionForm.employeeIds || sessionForm.employeeIds.length === 0 || !sessionForm.roomId || !sessionForm.day || 
        !sessionForm.startTime || !sessionForm.endTime) {
      setErrorInfo({
        title: 'שדות חסרים',
        message: 'יש למלא את כל השדות הנדרשים'
      });
      setErrorModalOpen(true);
      return;
    }

    const newSession: Omit<Session, 'employees' | 'patients' | 'patientIds'> = {
      id: editingSession?.id || `manual_${Date.now()}_${Math.random()}`,
      employeeIds: sessionForm.employeeIds!,
      roomId: sessionForm.roomId!,
      day: sessionForm.day as WeekDay,
      startTime: sessionForm.startTime!,
      endTime: sessionForm.endTime!,
    };

    // Server-side validation will handle all schedule constraints

    // Update schedule via API
    try {
      let savedSession: Session;
      if (editingSession) {
        savedSession = await scheduleService.updateSession(editingSession.id, newSession as Partial<Session>);
      } else {
        savedSession = await scheduleService.createSession(newSession);
      }
      
      // If patient assignments were changed, update them separately
      if (sessionForm.patientIds !== undefined) {
        await scheduleService.updateSessionPatients(savedSession.id, sessionForm.patientIds);
      }

      await setSchedule(); // Refresh the schedule from the server
      setEditDialogOpen(false);
      setPreselectedEmployeeId(null);
    } catch (error) {
      console.error('Error saving session:', error);
      console.log('Received error object:', error); // Add this line for debugging
      
      // Handle blocking activity confirmation
      if (error instanceof BlockingActivityWarning) {
        if (editingSession) {
          // Session update - handle differently
          setPendingSessionUpdateData({ sessionId: editingSession.id, data: newSession as Partial<Session> });
          setConfirmCreateSessionOpen(true); // Reuse the same dialog
        } else {
          // Session creation
          setPendingSessionCreationData(sessionForm);
          setConfirmCreateSessionOpen(true);
        }
        return; // Exit, confirmation dialog will handle further action
      }
      
      let errorMessage = 'שגיאה בשמירת הטיפול';
      let errorDetails = '';
      
      if (error instanceof ApiError) {
        errorMessage = error.message;
        errorDetails = error.details || '';
      } else if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      setErrorInfo({
        title: 'שגיאה בשמירה',
        message: errorMessage,
        details: errorDetails
      });
      setErrorModalOpen(true);
    }
  };

  const handleConfirmCreateSession = async (force: boolean) => {
    setConfirmCreateSessionOpen(false);
    if (!force) {
      setPendingSessionCreationData(null);
      setPendingSessionUpdateData(null);
      return; // User cancelled
    }

    try {
      let savedSession: Session;

      if (pendingSessionUpdateData) {
        // Handle session update with force
        const sessionToUpdate = { ...pendingSessionUpdateData.data, forceCreate: true };
        savedSession = await scheduleService.updateSession(pendingSessionUpdateData.sessionId, sessionToUpdate);
        
        // If patient assignments were included in the original session update, handle them now
        if (sessionForm.patientIds !== undefined) {
          try {
            await scheduleService.updateSessionPatients(savedSession.id, sessionForm.patientIds, true); // Force assign patients
          } catch (patientError) {
            console.warn('Error assigning patients after force session update:', patientError);
            // Continue even if patient assignment fails - the session is updated
          }
        }
      } else if (pendingSessionCreationData) {
        // Handle session creation with force
        const sessionToCreate = { ...pendingSessionCreationData, forceCreate: true } as CreateSessionDto;
        savedSession = await scheduleService.createSession(sessionToCreate, true); // Pass true for forceCreate
        
        // If patient assignments were included in the original session creation, handle them now
        if (pendingSessionCreationData.patientIds && pendingSessionCreationData.patientIds.length > 0) {
          try {
            await scheduleService.updateSessionPatients(savedSession.id, pendingSessionCreationData.patientIds, true); // Force assign patients
          } catch (patientError) {
            console.warn('Error assigning patients after force session creation:', patientError);
            // Continue even if patient assignment fails - the session is created
          }
        }
      } else {
        console.error('No pending data for confirmation');
        return;
      }
      
      await setSchedule();
      setEditDialogOpen(false);
      setPreselectedEmployeeId(null);
      setPendingSessionCreationData(null); // Clear pending data on success
      setPendingSessionUpdateData(null);
    } catch (error) {
      console.error('Error force saving session:', error);
      
      let errorMessage = 'שגיאה בשמירת הטיפול';
      let errorDetails = '';
      
      if (error instanceof ApiError) {
        errorMessage = error.message;
        errorDetails = error.details || '';
      } else if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      setErrorInfo({
        title: 'שגיאה בשמירה',
        message: errorMessage,
        details: errorDetails
      });
      setErrorModalOpen(true);
    }
  };

  const handleDeleteSession = async () => {
    if (!editingSession) return;

    try {
      await scheduleService.deleteSession(editingSession.id);
      await setSchedule(); // Refresh the schedule from the server
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error deleting session:', error);
      
      let errorMessage = 'שגיאה במחיקת הטיפול';
      let errorDetails = '';
      
      if (error instanceof ApiError) {
        errorMessage = error.message;
        errorDetails = error.details || '';
      } else if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      setErrorInfo({
        title: 'שגיאה במחיקה',
        message: errorMessage,
        details: errorDetails
      });
      setErrorModalOpen(true);
    }
  };

  const handleSessionClick = (session: Session) => {
    setEditingSessionForAssignment(session);
    const currentPatients = session.patients?.map(p => p.id) || [];
    const currentEmployees = session.employeeIds || [];
    
    // Ensure at least one empty slot for adding patients
    setSelectedPatients(currentPatients.length > 0 ? currentPatients : ['']);
    // Ensure at least one employee is selected (required)
    setSelectedEmployees(currentEmployees.length > 0 ? currentEmployees : []);
    setSessionEditDialogOpen(true);
  };

  const handleSaveSessionAssignment = async (forceAssign: boolean = false) => {
    if (!editingSessionForAssignment) return;

    try {
      // Validate that at least one employee is selected
      if (selectedEmployees.length === 0) {
        setErrorInfo({
          title: 'שגיאה בעדכון',
          message: 'יש לבחור לפחות עובד אחד לטיפול',
          details: undefined
        });
        setErrorModalOpen(true);
        return;
      }

      // Filter out empty patient selections
      const filteredPatients = selectedPatients.filter(id => id !== '');
      
      // Check if employees or notes changed
      const originalEmployees = editingSessionForAssignment.employeeIds || [];
      const employeesChanged = JSON.stringify(originalEmployees.sort()) !== JSON.stringify(selectedEmployees.sort());
      // For notes, we assume they might have changed since we're directly modifying the editingSessionForAssignment object
      const notesChanged = true; // Always save notes since we're editing them directly
      
      if (employeesChanged || notesChanged) {
        // Employees or notes changed - need to update session properties (may trigger blocking validation for employee changes)
        await scheduleService.updateSession(editingSessionForAssignment.id, {
          employeeIds: selectedEmployees,
          scheduleId: editingSessionForAssignment.scheduleId,
          notes: editingSessionForAssignment.notes
        });
        
        // Then update patients separately
        await scheduleService.updateSessionPatients(editingSessionForAssignment.id, filteredPatients, forceAssign);
      } else {
        // Only patients changed (and possibly notes) - update both patient assignments and notes
        await scheduleService.updateSession(editingSessionForAssignment.id, {
          notes: editingSessionForAssignment.notes
        });
        await scheduleService.updateSessionPatients(editingSessionForAssignment.id, filteredPatients, forceAssign);
      }
      
      await setSchedule(); // Refresh the schedule from the server
      setSessionEditDialogOpen(false);
      
      // Clear any pending data
      setPendingAssignmentData(null);
    } catch (error) {
      console.error('Error updating session:', error);
      
      // Handle blocking activity confirmation for session updates (only when employees change)
      if (error instanceof BlockingActivityWarning) {
        // This should only happen when employees changed and triggered blocking validation
        const originalEmployees = editingSessionForAssignment.employeeIds || [];
        const employeesChanged = JSON.stringify(originalEmployees.sort()) !== JSON.stringify(selectedEmployees.sort());
        
        if (employeesChanged) {
          setPendingSessionUpdateData({ 
            sessionId: editingSessionForAssignment.id, 
            data: {
              employeeIds: selectedEmployees,
              patientIds: selectedPatients.filter(id => id !== ''),
              scheduleId: editingSessionForAssignment.scheduleId,
              notes: editingSessionForAssignment.notes
            }
          });
          setConfirmCreateSessionOpen(true); // Reuse the same dialog
          return;
        } else {
          // This shouldn't happen for patient-only changes, but log it as an error
          console.error('Unexpected BlockingActivityWarning for patient-only assignment');
        }
      }
      
      // Handle consecutive sessions warning
      if (error instanceof ConsecutiveSessionsWarning) {
        // Create enriched warnings with patient names
        const enrichedWarnings = error.warnings.map((warning: { patientId: string; warning: string; consecutiveCount: number }) => {
          const patient = patients.find(p => p.id === warning.patientId);
          return {
            ...warning,
            patientName: patient ? `${patient.firstName} ${patient.lastName}` : undefined
          };
        });
        
        setConsecutiveWarnings(enrichedWarnings);
        setPendingAssignmentData({
          sessionId: editingSessionForAssignment.id,
          patientIds: selectedPatients.filter(id => id !== '')
        });
        setConsecutiveWarningOpen(true);
        return;
      }
      
      // Show specific error message if available, otherwise show generic message
      let errorMessage = 'שגיאה בעדכון השיוך מטופלים';
      let errorDetails = '';
      
      if (error instanceof ApiError) {
        errorMessage = error.message;
        errorDetails = error.details || '';
      } else if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      setErrorInfo({
        title: 'שגיאה בשיוך מטופלים',
        message: errorMessage,
        details: errorDetails
      });
      setErrorModalOpen(true);
    }
  };

  const handleEmployeeChange = (event: any, newValue: Employee[]) => {
    setSelectedEmployees(newValue.map(emp => emp.id));
  };

  const handleConsecutiveWarningConfirm = async () => {
    if (!pendingAssignmentData) return;
    
    setConsecutiveWarningOpen(false);
    
    try {
      await scheduleService.updateSessionPatients(
        pendingAssignmentData.sessionId, 
        pendingAssignmentData.patientIds, 
        true // Force assign
      );
      await setSchedule(); // Refresh the schedule from the server
      setSessionEditDialogOpen(false);
      setPendingAssignmentData(null);
    } catch (error) {
      console.error('Error force updating session patients:', error);
      
      // Show error if force assignment also fails
      let errorMessage = 'שגיאה בעדכון השיוך מטופלים';
      let errorDetails = '';
      
      if (error instanceof ApiError) {
        errorMessage = error.message;
        errorDetails = error.details || '';
      } else if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      setErrorInfo({
        title: 'שגיאה בשיוך מטופלים',
        message: errorMessage,
        details: errorDetails
      });
      setErrorModalOpen(true);
    }
  };

  const handleConsecutiveWarningCancel = () => {
    setConsecutiveWarningOpen(false);
    setPendingAssignmentData(null);
    setConsecutiveWarnings([]);
  };

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

  const getSessionsForDay = (day: WeekDay) => {
    if (!schedule) return [];
    return schedule.sessions
      .filter(session => session.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'לא ידוע';
  };

  const getEmployeeNames = (employeeIds: string[]) => {
    if (!employeeIds || employeeIds.length === 0) return 'לא ידוע';
    return employeeIds.map(id => getEmployeeName(id)).join(', ');
  };

  const getRoomName = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    return room ? room.name : 'לא ידוע';
  };

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
      
      // Count assigned sessions for this patient by role
      const assignedSessionsByRole: Record<string, number> = {};
      
      if (schedule) {
        schedule.sessions.forEach(session => {
          // Only count sessions where this patient is assigned
          if (session.patients?.some(p => p.id === patient.id)) {
            // For multi-employee sessions, count for all employees assigned to the session
            const sessionEmployees = session.employeeIds ? employees.filter(e => session.employeeIds.includes(e.id)) : [];
            sessionEmployees.forEach(employee => {
              if (employee && employee.role?.roleStringKey) {
                assignedSessionsByRole[employee.role.roleStringKey] = (assignedSessionsByRole[employee.role.roleStringKey] || 0) + 1;
              }
            });
          }
        });
      }
      
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
      
      // Count assigned sessions for this patient by role
      const assignedSessionsByRole: Record<string, number> = {};
      
      if (schedule) {
        schedule.sessions.forEach(session => {
          // Only count sessions where this patient is assigned
          if (session.patients?.some(p => p.id === patient.id)) {
            // For multi-employee sessions, count for all employees assigned to the session
            const sessionEmployees = session.employeeIds ? employees.filter(e => session.employeeIds.includes(e.id)) : [];
            sessionEmployees.forEach(employee => {
              if (employee && employee.role?.roleStringKey) {
                assignedSessionsByRole[employee.role.roleStringKey] = (assignedSessionsByRole[employee.role.roleStringKey] || 0) + 1;
              }
            });
          }
        });
      }
      
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
    return schedule.sessions.length;
  };

  const getEmployeeSessionCount = (employeeId: string) => {
    if (!schedule) return 0;
    return schedule.sessions.filter(s => 
      s.employeeIds && s.employeeIds.includes(employeeId) && s.patients && s.patients.length > 0
    ).length;
  };

  // Calendar grid helper functions
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getSessionDurationInSlots = (session: Session): number => {
    const startMinutes = timeToMinutes(session.startTime);
    const endMinutes = timeToMinutes(session.endTime);
    return Math.ceil((endMinutes - startMinutes) / 15);
  };

  const isTimeInRange = (time: string, startTime: string, endTime: string): boolean => {
    const timeMinutes = timeToMinutes(time);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
  };

  // Helper function to get the effective time range for a blocked period on a specific day
  const getActivityTimeForDay = (activity: Activity, day: WeekDay): { startTime: string; endTime: string } | null => {
    // Check if there's a day-specific override
    const dayOverride = activity.dayOverrides[day];
    
    if (dayOverride !== undefined) {
      // If the override is explicitly null, this day is not blocked
      if (dayOverride === null) {
        return null;
      }
      // Use the override time
      return dayOverride;
    }
    
    // Use default time if both are available
    if (activity.defaultStartTime && activity.defaultEndTime) {
      return {
        startTime: activity.defaultStartTime,
        endTime: activity.defaultEndTime
      };
    }
    
    // No time specified for this day
    return null;
  };

  const getReservedSlot = (time: string, day: WeekDay) => {
    // Check all active activities
    for (const activity of activities) {
      const timeRange = getActivityTimeForDay(activity, day);
      if (timeRange && isTimeInRange(time, timeRange.startTime, timeRange.endTime)) {
        return { 
          type: activity.id, 
          label: activity.name,
          color: activity.color,
          isStartTime: time === timeRange.startTime,
          isBlocking: activity.isBlocking // Add isBlocking property
        };
      }
    }
    return null;
  };

  const getSessionAtTime = (sessions: Session[], time: string, employeeId?: string, roomId?: string): Session | null => {
    return sessions.find(session => {
      const matchesEmployee = !employeeId || (session.employeeIds && session.employeeIds.includes(employeeId));
      const matchesRoom = !roomId || session.roomId === roomId;
      return matchesEmployee && matchesRoom && isTimeInRange(time, session.startTime, session.endTime);
    }) || null;
  };

  // Print helper functions
  const getPrintStyles = (): string => {
    return `
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        direction: rtl;
        font-size: 12px;
      }
      
      .print-header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 2px solid #333;
        padding-bottom: 15px;
        page-break-after: avoid;
      }
      
      .print-title {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 10px;
      }
      
      .print-date {
        font-size: 14px;
        color: #666;
      }
      
      .schedule-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin-bottom: 30px;
      }
      
      @media print {
        .print-header {
          page-break-after: avoid;
        }
        
        .schedule-grid {
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
        }
        
        .day-schedule {
          page-break-inside: avoid;
          margin-bottom: 15px;
        }
        
        body {
          font-size: 9px;
        }
        
        .day-header {
          font-size: 12px;
          padding: 6px;
        }
        
        .session-item {
          margin-bottom: 6px;
          padding: 4px;
        }
        
        .session-details {
          font-size: 8px;
        }
        
        .statistics {
          margin-top: 15px;
          padding: 12px;
        }
        
        .stats-grid {
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 8px;
        }
        
        .stat-item {
          padding: 6px;
          font-size: 9px;
        }
        
        .statistics-title {
          font-size: 14px;
        }
      }
      
      .day-schedule {
        border: 1px solid #ddd;
        border-radius: 8px;
        overflow: hidden;
      }
      
      .day-header {
        background-color: #f5f5f5;
        padding: 12px;
        font-weight: bold;
        font-size: 16px;
        text-align: center;
        border-bottom: 1px solid #ddd;
      }
      
      .day-content {
        padding: 15px;
      }
      
      .sessions-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      .session-item {
        margin-bottom: 12px;
        padding: 10px;
        border: 1px solid #eee;
        border-radius: 4px;
        background-color: #fafafa;
      }
      
      .session-time {
        font-weight: bold;
        color: #333;
        margin-bottom: 4px;
      }
      
      .session-details {
        font-size: 11px;
        color: #666;
      }
      
      .no-sessions {
        text-align: center;
        color: #999;
        font-style: italic;
        padding: 20px;
      }
      
      .statistics {
        margin-top: 30px;
        padding: 20px;
        background-color: #f9f9f9;
        border: 1px solid #ddd;
        border-radius: 8px;
      }
      
      .statistics-title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 15px;
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
      }
      
      .stat-item {
        padding: 10px;
        background-color: white;
        border: 1px solid #eee;
        border-radius: 4px;
      }
      
      .blocked-periods {
        margin-top: 20px;
      }
      
      .blocked-period-item {
        margin-bottom: 8px;
        padding: 8px;
        border-right: 4px solid #ff6b6b;
        background-color: #fff5f5;
        font-size: 11px;
      }
    `;
  };

  const generatePrintableSchedule = (tabIndex: number, patientId?: string): string => {
    if (!schedule) return '';

    const tabNames = ['לו״ז טיפולים', 'לו״ז חדרים', 'לו״ז מטופל'];
    const currentTabName = tabNames[tabIndex] || 'לוח זמנים';

    // Generate header
    let html = `
      <div class="print-header">
        <div class="print-title">${currentTabName}</div>
        <div class="print-date">נוצר ב: ${schedule.generatedAt.toLocaleString('he-IL')}</div>
        <div class="print-date">הודפס ב: ${new Date().toLocaleString('he-IL')}</div>
    `;

    // Add patient name for patient view
    if (tabIndex === 2 && patientId) {
      const patient = patients.find(p => p.id === patientId);
      if (patient) {
        html += `<div class="print-date">מטופל: ${patient.firstName} ${patient.lastName}</div>`;
      }
    }

    html += '</div>';

    // Generate content based on tab
    if (tabIndex === 2) {
      // Patient view
      html += generatePatientPrintContent(patientId);
    } else if (tabIndex === 1) {
      // Room view
      html += generateRoomPrintContent();
    } else {
      // Employee view (default)
      html += generateEmployeePrintContent();
    }

    return html;
  };

  const generateEmployeePrintContent = (): string => {
    const sortedEmployees = [...employees].sort((a, b) => 
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
    );

    // Generate schedule grid for all days
    let html = '<div class="schedule-grid">';
    
    WEEK_DAYS.forEach(day => {
      const daySessions = getSessionsForDay(day);
      
      html += `
        <div class="day-schedule">
          <div class="day-header">${DAY_LABELS[day]}</div>
          <div class="day-content">
      `;
      
      if (daySessions.length === 0) {
        html += '<div class="no-sessions">אין טיפולים מתוזמנים ליום זה</div>';
      } else {
        html += '<ul class="sessions-list">';
        
        daySessions.forEach(session => {
          const employee = employees.find(e => e.id === session.employeeIds?.[0]);
          const room = rooms.find(r => r.id === session.roomId);
          
          html += `
            <li class="session-item">
              <div class="session-time">${session.startTime} - ${session.endTime}</div>
              <div class="session-details">
                עובד: ${employee ? `${employee.firstName} ${employee.lastName}` : 'לא ידוע'}<br>
                תפקיד: ${employee ? getRoleName(employee.role, employee.roleId) : 'לא ידוע'}<br>
                חדר: ${room ? room.name : 'לא ידוע'}${session.patients && session.patients.length > 0 ? '<br>מטופלים: ' + session.patients.map(p => `${p.firstName} ${p.lastName}`).join(', ') : ''}
              </div>
            </li>
          `;
        });
        
        html += '</ul>';
      }
      
      html += '</div></div>';
    });
    
    html += '</div>';

    // Generate statistics section
    html += `
      <div class="statistics">
        <div class="statistics-title">סטטיסטיקות</div>
        <div class="stats-grid">
          <div class="stat-item">
            <strong>סה"כ טיפולים:</strong> ${getTotalScheduledSessions()}
          </div>
    `;

    // Add employee statistics
    sortedEmployees.forEach(employee => {
      const sessionCount = getEmployeeSessionCount(employee.id);
      html += `
        <div class="stat-item">
          <strong>${employee.firstName} ${employee.lastName}:</strong><br>
          ${sessionCount}/${employee.weeklySessionsCount} טיפולים
        </div>
      `;
    });

    html += '</div>';

    // Add activities if any
    if (activities.length > 0) {
      html += `
        <div class="blocked-periods">
          <div class="statistics-title">פעילויות שוטפות</div>
      `;
      
      activities.forEach(period => {
        html += `
          <div class="blocked-period-item">
            <strong>${period.name}</strong><br>
            ${period.defaultStartTime && period.defaultEndTime 
              ? `שעות ברירת מחדל: ${period.defaultStartTime} - ${period.defaultEndTime}` 
              : 'שעות מותאמות לפי יום'}
          </div>
        `;
      });
      
      html += '</div>';
    }

    html += '</div>';

    return html;
  };

  const generateRoomPrintContent = (): string => {
    const sortedRooms = [...rooms].sort((a, b) => a.name.localeCompare(b.name, 'he'));

    // Generate schedule grid for all days
    let html = '<div class="schedule-grid">';
    
    WEEK_DAYS.forEach(day => {
      const daySessions = getSessionsForDay(day);
      
      html += `
        <div class="day-schedule">
          <div class="day-header">${DAY_LABELS[day]}</div>
          <div class="day-content">
      `;
      
      if (daySessions.length === 0) {
        html += '<div class="no-sessions">אין טיפולים מתוזמנים ליום זה</div>';
      } else {
        html += '<ul class="sessions-list">';
        
        daySessions.forEach(session => {
          const employee = employees.find(e => e.id === session.employeeIds?.[0]);
          const room = rooms.find(r => r.id === session.roomId);
          
          html += `
            <li class="session-item">
              <div class="session-time">${session.startTime} - ${session.endTime}</div>
              <div class="session-details">
                חדר: ${room ? room.name : 'לא ידוע'}<br>
                עובד: ${employee ? `${employee.firstName} ${employee.lastName}` : 'לא ידוע'}<br>
                תפקיד: ${employee ? getRoleName(employee.role, employee.roleId) : 'לא ידוע'}${session.patients && session.patients.length > 0 ? '<br>מטופלים: ' + session.patients.map(p => `${p.firstName} ${p.lastName}`).join(', ') : ''}
              </div>
            </li>
          `;
        });
        
        html += '</ul>';
      }
      
      html += '</div></div>';
    });
    
    html += '</div>';

    // Generate room statistics section
    html += `
      <div class="statistics">
        <div class="statistics-title">סטטיסטיקות</div>
        <div class="stats-grid">
          <div class="stat-item">
            <strong>סה"כ טיפולים:</strong> ${getTotalScheduledSessions()}
          </div>
    `;

    // Add room statistics
    sortedRooms.forEach(room => {
      const sessionCount = schedule?.sessions.filter(s => s.roomId === room.id).length || 0;
      html += `
        <div class="stat-item">
          <strong>${room.name}:</strong><br>
          ${sessionCount} טיפולים
        </div>
      `;
    });

    html += '</div>';

    // Add activities if any
    if (activities.length > 0) {
      html += `
        <div class="blocked-periods">
          <div class="statistics-title">פעילויות שוטפות</div>
      `;
      
      activities.forEach(period => {
        html += `
          <div class="blocked-period-item">
            <strong>${period.name}</strong><br>
            ${period.defaultStartTime && period.defaultEndTime 
              ? `שעות ברירת מחדל: ${period.defaultStartTime} - ${period.defaultEndTime}` 
              : 'שעות מותאמות לפי יום'}
          </div>
        `;
      });
      
      html += '</div>';
    }

    html += '</div>';

    return html;
  };

  const generatePatientPrintContent = (patientId?: string): string => {
    if (!patientId) return '<div class="no-sessions">לא נבחר מטופל</div>';

    const patient = patients.find(p => p.id === patientId);
    if (!patient) return '<div class="no-sessions">מטופל לא נמצא</div>';

    // Generate schedule grid for all days - focused on this patient
    let html = '<div class="schedule-grid">';
    
    WEEK_DAYS.forEach(day => {
      const patientSessions = getPatientSessionsForDay(day, patientId);
      
      html += `
        <div class="day-schedule">
          <div class="day-header">${DAY_LABELS[day]}</div>
          <div class="day-content">
      `;
      
      if (patientSessions.length === 0) {
        html += '<div class="no-sessions">אין טיפולים מתוזמנים ליום זה</div>';
      } else {
        html += '<ul class="sessions-list">';
        
        patientSessions.forEach(session => {
          const employee = employees.find(e => e.id === session.employeeIds?.[0]);
          const room = rooms.find(r => r.id === session.roomId);
          
          html += `
            <li class="session-item">
              <div class="session-time">${session.startTime} - ${session.endTime}</div>
              <div class="session-details">
                מטפל: ${employee ? `${employee.firstName} ${employee.lastName}` : 'לא ידוע'}<br>
                טיפול: ${employee ? getRoleName(employee.role, employee.roleId) : 'לא ידוע'}<br>
                חדר: ${room ? room.name : 'לא ידוע'}
              </div>
            </li>
          `;
        });
        
        html += '</ul>';
      }
      
      html += '</div></div>';
    });
    
    html += '</div>';

    return html;
  };

  // Helper function to get sessions for a specific patient on a specific day
  const getPatientSessionsForDay = (day: WeekDay, patientId: string) => {
    if (!schedule || !patientId) return [];
    return schedule.sessions
      .filter(session => 
        session.day === day && 
        session.patients?.some(p => p.id === patientId)
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // Calendar components
  const PatientCalendarView = ({ day }: { day: WeekDay }) => {
    const patientSessions = getPatientSessionsForDay(day, selectedPatientId);
    
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {patientSessions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
            אין טיפולים מתוזמנים ליום זה
          </Typography>
        ) : (
          patientSessions.map(session => {
            // For multi-employee sessions, count for all employees assigned to the session
            const sessionEmployees = session.employeeIds ? employees.filter(e => session.employeeIds.includes(e.id)) : [];
            const room = rooms.find(r => r.id === session.roomId);
            const backgroundColor = room?.color || '#845ec2'; // Use room color or default
            const textColor = getContrastingTextColor(backgroundColor);
            
            return (
              <Card
                key={session.id}
                sx={{ 
                  backgroundColor: backgroundColor, 
                  cursor: 'pointer',
                  '&:hover': { 
                    filter: 'brightness(0.8)'
                  }
                }}
                onClick={() => handleSessionClick(session)}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ color: textColor }}>
                    {session.startTime} - {session.endTime}
                  </Typography>
                  <Typography variant="body2" sx={{ color: textColor }}>
                    מטפלים: {sessionEmployees.length > 0 ? sessionEmployees.map(emp => `${emp.firstName} ${emp.lastName}`).join(', ') : 'לא ידוע'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: textColor }}>
                    טיפול: {sessionEmployees.length > 0 ? sessionEmployees.map(emp => getRoleName(emp.role, emp.roleId)).join(', ') : 'לא ידוע'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: textColor }}>
                    חדר: {room ? room.name : 'לא ידוע'}
                  </Typography>
                  {session.notes && (
                    <Typography variant="body2" sx={{ color: textColor, fontStyle: 'italic' }}>
                      הערות: {session.notes}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </Box>
    );
  };

  const EmployeeCalendarView = ({ day }: { day: WeekDay }) => {
    const timeSlots = generateTimeSlots();
    const daySessions = getSessionsForDay(day);
    const sortedEmployees = [...employees]
      .filter(employee => employee.workingHours[day]) // Filter out employees who don't work on this day
      .sort((a, b) => 
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
      );

    const isTimeWithinWorkingHours = (employee: Employee, time: string, currentDay: WeekDay): boolean => {
      const workingHours = employee.workingHours[currentDay];
      if (!workingHours) return false;

      const startMinutes = timeToMinutes(workingHours.startTime);
      const endMinutes = timeToMinutes(workingHours.endTime);
      const currentTimeMinutes = timeToMinutes(time);

      return currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes;
    };
    
    return (
      <TableContainer sx={{ border: 1, borderColor: 'divider', maxHeight: 'none' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 80, fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                שעה
              </TableCell>
              <TableCell sx={{ width: 120, fontWeight: 'bold', textAlign: 'center', backgroundColor: 'grey.100', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                פעילויות
              </TableCell>
              {sortedEmployees.map(employee => (
                <TableCell key={employee.id} sx={{ fontWeight: 'bold', textAlign: 'center', minWidth: 120, borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                  <div>{employee.firstName} {employee.lastName}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#666' }}>
                    ({getRoleName(employee.role, employee.roleId)})
                  </div>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {timeSlots.map((time, index) => {
              const isHourMark = time.endsWith(':00');
              const reservedSlot = getReservedSlot(time, day);
              
              return (
                <TableRow key={time} sx={{ 
                  height: 20,
                  borderTop: isHourMark ? 2 : 0.5,
                  borderColor: isHourMark ? 'primary.main' : 'divider',
                  backgroundColor: reservedSlot && reservedSlot.isBlocking ? reservedSlot.color + '15' : 'transparent' // Light background for activity rows
                }}>
                  <TableCell sx={{ 
                    p: 0.5, 
                    fontSize: '0.75rem',
                    textAlign: 'center',
                    backgroundColor: isHourMark ? (reservedSlot && reservedSlot.isBlocking ? reservedSlot.color + '15' : 'grey.50') : 'transparent',
                    fontWeight: isHourMark ? 'bold' : 'normal',
                    borderLeft: '1px solid rgba(224, 224, 224, 1)'
                  }}>
                    {isHourMark ? time : ''}
                  </TableCell>
                  
                  {/* Activities Column */}
                  <TableCell sx={{ 
                    p: 0.5,
                    backgroundColor: reservedSlot ? reservedSlot.color + '30' : 'grey.50',
                    textAlign: 'center',
                    fontSize: '0.7rem',
                    color: reservedSlot ? 'text.primary' : 'text.secondary',
                    fontWeight: reservedSlot ? 'bold' : 'normal',
                    borderLeft: '1px solid rgba(224, 224, 224, 1)'
                  }}>
                    {reservedSlot?.isStartTime ? reservedSlot.label : ''}
                  </TableCell>
                  
                  {sortedEmployees.map(employee => {
                    const session = getSessionAtTime(daySessions, time, employee.id);
                    
                    if (session && time === session.startTime) {
                      const duration = getSessionDurationInSlots(session);
                      const room = rooms.find(r => r.id === session.roomId);
                      const backgroundColor = room?.color || '#845ec2';
                      const textColor = getContrastingTextColor(backgroundColor);
                      return (
                        <TableCell key={employee.id} 
                          rowSpan={duration}
                          sx={{ 
                            p: 1,
                            backgroundColor: backgroundColor,
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            color: textColor,
                            cursor: 'pointer',
                            position: 'relative',
                            zIndex: 2, // Ensure sessions appear on top of activities
                            borderLeft: '1px solid rgba(224, 224, 224, 1)',
                            '&:hover': { 
                              filter: 'brightness(0.8)'
                            }
                          }}
                          onClick={() => handleSessionClick(session)}
                        >
                          <Box>
                            <Typography variant="caption" display="block">
                              {session.startTime} - {session.endTime}
                            </Typography>
                            <Typography variant="caption" display="block">
                              {getRoomName(session.roomId)}
                            </Typography>
                            {/* Display patients or missing patient warning */}
                            {session.patients && session.patients.length > 0 ? (
                              session.patients.map(patient => (
                                <Typography key={patient.id} variant="caption" display="block" sx={{ fontSize: '0.65rem' }}>
                                  {patient.firstName} {patient.lastName}
                                </Typography>
                              ))
                            ) : (
                              <Typography variant="caption" display="block" color="error" sx={{ fontSize: '0.65rem' }}>
                                (חסר מטופל)
                              </Typography>
                            )}
                            {session.employeeIds && session.employeeIds.length > 1 && (
                              <Typography variant="caption" display="block" sx={{ fontSize: '0.65rem', mt: 0.5 }}>
                                + {session.employeeIds.length - 1} מטפלים נוספים
                              </Typography>
                            )}
                            {session.notes && (
                              <Typography variant="caption" display="block" sx={{ fontSize: '0.65rem', fontStyle: 'italic', mt: 0.5 }}>
                                הערות: {session.notes}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                      );
                    }
                    
                    // Skip cells that are part of a session span
                    const hasSessionAbove = daySessions.some(s => 
                      s.employeeIds && s.employeeIds.includes(employee.id) && 
                      isTimeInRange(time, s.startTime, s.endTime) && 
                      s.startTime !== time
                    );
                    
                    if (hasSessionAbove) {
                      return null;
                    }
                    
                    const isWorkingHour = isTimeWithinWorkingHours(employee, time, day);
                    
                    return (
                      <TableCell key={employee.id} sx={{
                        p: 0.5,
                        backgroundColor: isWorkingHour ? 'transparent' : 'grey.400', // Darker grey for non-working hours
                        borderLeft: '1px solid rgba(224, 224, 224, 1)',
                        cursor: isWorkingHour ? 'pointer' : 'not-allowed',
                        '&:hover': {
                          backgroundColor: isWorkingHour ? '#f0f0f0' : 'grey.400', // Highlight on hover for interactive cells
                        }
                      }}
                      onClick={() => {
                        if (isWorkingHour) {
                          handleAddSession(day, time, employee.id);
                        }
                      }}>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const RoomCalendarView = ({ day }: { day: WeekDay }) => {
    const timeSlots = generateTimeSlots();
    const daySessions = getSessionsForDay(day);
    const sortedRooms = [...rooms].sort((a, b) => a.name.localeCompare(b.name, 'he'));
    
    return (
      <TableContainer sx={{ border: 1, borderColor: 'divider', maxHeight: 'none' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 80, fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                שעה
              </TableCell>
              <TableCell sx={{ width: 120, fontWeight: 'bold', textAlign: 'center', backgroundColor: 'grey.100', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                פעילויות
              </TableCell>
              {sortedRooms.map(room => (
                <TableCell key={room.id} sx={{ fontWeight: 'bold', textAlign: 'center', minWidth: 120, borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                  {room.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {timeSlots.map((time, index) => {
              const isHourMark = time.endsWith(':00');
              const reservedSlot = getReservedSlot(time, day);
              
              return (
                <TableRow key={time} sx={{ 
                  height: 20,
                  borderTop: isHourMark ? 2 : 0.5,
                  borderColor: isHourMark ? 'primary.main' : 'divider',
                  backgroundColor: reservedSlot && reservedSlot.isBlocking ? reservedSlot.color + '15' : 'transparent' // Light background for activity rows
                }}>
                  <TableCell sx={{ 
                    p: 0.5, 
                    fontSize: '0.75rem',
                    textAlign: 'center',
                    backgroundColor: isHourMark ? (reservedSlot && reservedSlot.isBlocking ? reservedSlot.color + '15' : 'grey.50') : 'transparent',
                    fontWeight: isHourMark ? 'bold' : 'normal',
                    borderLeft: '1px solid rgba(224, 224, 224, 1)'
                  }}>
                    {isHourMark ? time : ''}
                  </TableCell>
                  
                  {/* Activities Column */}
                  <TableCell sx={{ 
                    p: 0.5,
                    backgroundColor: reservedSlot ? reservedSlot.color + '30' : 'grey.50',
                    textAlign: 'center',
                    fontSize: '0.7rem',
                    color: reservedSlot ? 'text.primary' : 'text.secondary',
                    fontWeight: reservedSlot ? 'bold' : 'normal',
                    borderLeft: '1px solid rgba(224, 224, 224, 1)'
                  }}>
                    {reservedSlot?.isStartTime ? reservedSlot.label : ''}
                  </TableCell>
                  
                  {sortedRooms.map(room => {
                    const session = getSessionAtTime(daySessions, time, undefined, room.id);
                    
                    if (session && time === session.startTime) {
                      const duration = getSessionDurationInSlots(session);
                      // For multi-employee sessions, count for all employees assigned to the session
            // const sessionEmployees = session.employeeIds ? employees.filter(e => session.employeeIds.includes(e.id)) : [];
                      const backgroundColor = session.roomId ? rooms.find(r => r.id === session.roomId)?.color || '#845ec2' : '#845ec2';
                      const textColor = getContrastingTextColor(backgroundColor);
                      return (
                        <TableCell key={room.id} 
                          rowSpan={duration}
                          sx={{ 
                            p: 1,
                            backgroundColor: backgroundColor,
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            color: textColor,
                            cursor: 'pointer',
                            position: 'relative',
                            zIndex: 2, // Ensure sessions appear on top of activities
                            borderLeft: '1px solid rgba(224, 224, 224, 1)',
                            '&:hover': { 
                              filter: 'brightness(0.8)'
                            }
                          }}
                          onClick={() => handleSessionClick(session)}
                        >
                          <Box>
                            <Typography variant="caption" display="block">
                              {session.startTime} - {session.endTime}
                            </Typography>
                            <Typography variant="caption" display="block">
                              {getEmployeeNames(session.employeeIds)}
                            </Typography>
                            {/* Display patients or missing patient warning */}
                            {session.patients && session.patients.length > 0 ? (
                              session.patients.map(patient => (
                                <Typography key={patient.id} variant="caption" display="block" sx={{ fontSize: '0.65rem' }}>
                                  {patient.firstName} {patient.lastName}
                                </Typography>
                              ))
                            ) : (
                              <Typography variant="caption" display="block" sx={{ color: 'red', fontSize: '0.65rem' }}>
                                חסר מטופל
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                      );
                    }
                    
                    // Skip cells that are part of a session span
                    const hasSessionAbove = daySessions.some(s => 
                      s.roomId === room.id && 
                      isTimeInRange(time, s.startTime, s.endTime) && 
                      s.startTime !== time
                    );
                    
                    if (hasSessionAbove) {
                      return null;
                    }
                    
                    return (
                      <TableCell key={room.id} sx={{ 
                        p: 0.5,
                        backgroundColor: 'transparent', // Let the row background show through
                        borderLeft: '1px solid rgba(224, 224, 224, 1)'
                      }}>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          לוח זמנים
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={isResetting ? <CircularProgress size={16} /> : <CalendarToday />}
            onClick={handleResetScheduleClick}
            disabled={isResetting}
            color="warning"
          >
            {isResetting ? 'מאפס לוח זמנים...' : 'אפס לוח זמנים'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportExcel}
            disabled={!schedule || schedule.sessions.length === 0}
          >
            ייצא ל Excel
          </Button>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={handlePrint}
            disabled={!schedule || schedule.sessions.length === 0}
          >
            הדפס
          </Button>
          {/* Help Button for Schedule Tab */}
          <IconButton color="primary" onClick={() => setShowHelpModal(true)}>
            <HelpOutline sx={{ fontSize: 24 }} />
          </IconButton>
        </Box>
      </Box>

      {employees.length === 0 || rooms.length === 0 ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          יש להוסיף לפחות עובד אחד וחדר אחד כדי להוסיף טיפולים
        </Alert>
      ) : null}

      {/* Therapy Requirement and Statistics Sections */}
      {schedule ? (
        <Box display="flex" gap={3} flexWrap="wrap" sx={{ mb: 3 }}>
          {/* Unassigned Therapy Requirements Section */}
          {patients.length > 0 && (
            <Card sx={{ flex: 1, minWidth: '300px' }}>
              <CardContent>
                <Typography variant="h6" component="h2" mb={2}>
                  טיפולים נדרשים שלא שובצו
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
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
                <Box display="flex" flexWrap="wrap" gap={1}>
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
                <Box display="flex" flexWrap="wrap" gap={1} sx={{ flex: 1 }}>
                  {[...employees].sort((a, b) =>
                    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
                  ).map(employee => (
                    <Chip
                      key={employee.id}
                      label={`${employee.firstName} ${employee.lastName}: ${getEmployeeSessionCount(employee.id)}/${employee.weeklySessionsCount}`}
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
                סה"כ טיפולים (עם ובלי מטופל): {getTotalScheduledSessions()}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      ) : null}

      {schedule ? (
        <>
          <Box sx={{ mb: 2 }}>
            <Tabs 
              value={scheduleViewTab} 
              onChange={(_, newValue) => setScheduleViewTab(newValue)} 
              variant="fullWidth"
              sx={{
                bgcolor: '#b540801A', // 10% opacity
                borderRadius: 1,
                '& .MuiTabs-indicator': {
                  backgroundColor: '#b54080', // Indicator color
                },
                '& .MuiTab-root': {
                  color: '#b54080', // Text color for unselected tabs
                  opacity: 1,
                  '&.Mui-selected': {
                    bgcolor: '#b5408033', // 20% opacity for selected tab
                    color: '#b54080', // Text color for selected tab
                    fontWeight: 'bold',
                  },
                },
              }}
            >
              <Tab label="לו״ז טיפולים" />
              <Tab label="לו״ז חדרים" />
              <Tab label="לו״ז מטופל" />
            </Tabs>
          </Box>

          {/* Patient Selection Dropdown - only show when Patient View tab is active */}
          {scheduleViewTab === 2 && (
            <Box sx={{ mb: 3 }}>
              <FormControl sx={{ minWidth: 300 }}>
                <InputLabel>בחר מטופל</InputLabel>
                <Select
                  value={selectedPatientId}
                  label="בחר מטופל"
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                >
                  {patients.filter(patient => patient.isActive).sort((a, b) => 
                    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
                  ).map(patient => (
                    <MenuItem key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          {scheduleViewTab === 2 ? (
            // Patient view - show all days in a grid without horizontal scroll
            <Box 
              sx={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 2,
                pb: 2,
              }}
            >
              {WEEK_DAYS.map(day => (
                <Paper 
                  key={day} 
                  sx={{ 
                    p: 2, 
                    height: 'fit-content'
                  }}
                >
                  <Typography variant="h6" component="h3" mb={2} color="primary" textAlign="center">
                    {DAY_LABELS[day]}
                  </Typography>
                  
                  <PatientCalendarView day={day} />
                </Paper>
              ))}
            </Box>
          ) : (
            // Employee and Room views - keep original horizontal scroll layout
            <Box 
              sx={{ 
                display: 'flex', 
                overflowX: 'auto',
                gap: 3,
                pb: 2,
                '&::-webkit-scrollbar': {
                  height: 8,
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: 'grey.200',
                  borderRadius: 4,
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'grey.400',
                  borderRadius: 4,
                  '&:hover': {
                    backgroundColor: 'grey.500',
                  },
                },
              }}
            >
              {WEEK_DAYS.map(day => (
                <Paper 
                  key={day} 
                  sx={{ 
                    p: 3, 
                    minWidth: '500px',
                    flexShrink: 0,
                    height: 'fit-content'
                  }}
                >
                  <Typography variant="h5" component="h3" mb={2} color="primary" textAlign="center">
                    {DAY_LABELS[day]}
                  </Typography>
                  
                  {/* Always render calendar views, even if no sessions are scheduled */}
                  {scheduleViewTab === 0 && <EmployeeCalendarView day={day} />}
                  {scheduleViewTab === 1 && <RoomCalendarView day={day} />}
                </Paper>
              ))}
            </Box>
          )}
        </>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            לוח הזמנים ריק. תוכל להוסיף טיפולים באמצעות לחיצה על משבצת ריקה בלוח הזמנים.
          </Typography>
        </Paper>
      )}

      {/* Edit/Add Session Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingSession ? 'מחיקת טיפול' : 'הוספת טיפול חדש'}
        </DialogTitle>
        <DialogContent>
          {editingSession ? (
            // Show session details for deletion
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body1" gutterBottom>
                פרטי הטיפול למחיקה:
              </Typography>
              
              <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>יום:</strong> {DAY_LABELS[editingSession.day]}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>שעות:</strong> {editingSession.startTime} - {editingSession.endTime}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>עובדים:</strong> {getEmployeeNames(editingSession.employeeIds)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>חדר:</strong> {getRoomName(editingSession.roomId)}
                </Typography>
                {editingSession.patients && editingSession.patients.length > 0 && (
                  <Typography variant="body2" gutterBottom>
                    <strong>מטופלים:</strong> {editingSession.patients.map(p => `${p.firstName} ${p.lastName}`).join(', ')}
                  </Typography>
                )}
                {editingSession.notes && (
                  <Typography variant="body2" gutterBottom>
                    <strong>הערות:</strong> {editingSession.notes}
                  </Typography>
                )}
              </Box>
              
              <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                האם אתה בטוח שברצונך למחוק את הטיפול? פעולה זו אינה ניתנת לביטול.
              </Typography>
            </Box>
          ) : (
            // Show form fields for adding new session
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>יום</InputLabel>
                <Select
                  value={sessionForm.day || 'sunday'}
                  label="יום"
                  onChange={(e) => setSessionForm(prev => ({ ...prev, day: e.target.value as WeekDay }))}
                >
                  {WEEK_DAYS.map(day => (
                    <MenuItem key={day} value={day}>{DAY_LABELS[day]}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Box display="flex" gap={2}>
                <TimePicker
                  label="שעת התחלה"
                  value={sessionForm.startTime ? parseTime(sessionForm.startTime) : null}
                  onChange={(time) => setSessionForm(prev => ({ ...prev, startTime: time ? formatTime(time) : '' }))}
                  sx={{ width: '50%' }}
                />
                <TimePicker
                  label="שעת סיום"
                  value={sessionForm.endTime ? parseTime(sessionForm.endTime) : null}
                  onChange={(time) => setSessionForm(prev => ({ ...prev, endTime: time ? formatTime(time) : '' }))}
                  sx={{ width: '50%' }}
                />
              </Box>

              <Autocomplete
                multiple
                id="employees-autocomplete-form"
                options={employees.filter(e => e.isActive)}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName} - ${getRoleName(option.role, option.roleId)}`}
                value={employees.filter(e => sessionForm.employeeIds && sessionForm.employeeIds.includes(e.id))}
                onChange={(event, newValue) => {
                  setSessionForm(prev => ({ ...prev, employeeIds: newValue.map(emp => emp.id) }));
                }}
                disabled={!!preselectedEmployeeId}
                renderInput={(params) => (
                  <TextField {...params} variant="outlined" label="עובדים" placeholder="בחר עובדים" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={`${option.firstName} ${option.lastName}`}
                      {...getTagProps({ index })}
                      key={option.id}
                    />
                  ))
                }
              />
              
              <FormControl fullWidth>
                <InputLabel>חדר</InputLabel>
                <Select
                  value={sessionForm.roomId || ''}
                  label="חדר"
                  onChange={(e) => setSessionForm(prev => ({ ...prev, roomId: e.target.value }))}
                >
                  {[...rooms].filter(room => room.isActive).sort((a, b) => a.name.localeCompare(b.name, 'he')).map(room => (
                    <MenuItem key={room.id} value={room.id}>
                      {room.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Autocomplete
                multiple
                id="patients-autocomplete"
                options={patients}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                value={patients.filter(p => sessionForm.patientIds?.includes(p.id))}
                onChange={(event, newValue) => {
                  setSessionForm(prev => ({ ...prev, patientIds: newValue.map(p => p.id) }));
                }}
                renderInput={(params) => (
                  <TextField {...params} variant="outlined" label="מטופלים" placeholder="בחר מטופלים" />
                )}
              />

              <TextField
                fullWidth
                label="הערות"
                multiline
                rows={3}
                value={sessionForm.notes || ''}
                onChange={(e) => setSessionForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="הערות נוספות לטיפול (אופציונלי)"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>ביטול</Button>
          {editingSession ? (
            <Button 
              onClick={handleDeleteSession} 
              variant="contained" 
              color="error"
              startIcon={<Delete />}
            >
              מחק טיפול
            </Button>
          ) : (
            <Button onClick={handleSaveSession} variant="contained">
              הוסף
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Session Edit Dialog */}
      <Dialog open={sessionEditDialogOpen} onClose={() => setSessionEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          עריכת טיפול
        </DialogTitle>
        <DialogContent>
          {editingSessionForAssignment && (
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body1" gutterBottom>
                פרטי הטיפול:
              </Typography>
              
              <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>יום:</strong> {DAY_LABELS[editingSessionForAssignment.day]}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>שעות:</strong> {editingSessionForAssignment.startTime} - {editingSessionForAssignment.endTime}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>חדר:</strong> {getRoomName(editingSessionForAssignment.roomId)}
                </Typography>
              </Box>

              <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
                עובדים:
              </Typography>

              <Autocomplete
                multiple
                id="employees-autocomplete"
                options={employees.filter(e => e.isActive)}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                value={employees.filter(e => selectedEmployees.includes(e.id))}
                onChange={handleEmployeeChange}
                renderInput={(params) => (
                  <TextField {...params} variant="outlined" label="עובדים" placeholder="בחר עובדים" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={`${option.firstName} ${option.lastName}`}
                      {...getTagProps({ index })}
                      key={option.id}
                    />
                  ))
                }
              />

              <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
                מטופלים:
              </Typography>

              <Autocomplete
                multiple /* Added multiple prop */
                id="patients-autocomplete-edit-session"
                options={patients.filter(patient => patient.isActive).sort((a, b) => 
                  `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
                )}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                value={patients.filter(p => selectedPatients.includes(p.id))} /* Adjusted value to filter by array */
                onChange={(event, newValue) => {
                  setSelectedPatients(newValue.map(p => p.id)); /* Adjusted onChange to map new value */
                }}
                renderInput={(params) => (
                  <TextField {...params} variant="outlined" label="מטופלים" placeholder="בחר מטופלים" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={`${option.firstName} ${option.lastName}`}
                      {...getTagProps({ index })}
                      key={option.id}
                    />
                  ))
                }
              />

              <TextField
                fullWidth
                label="הערות"
                multiline
                rows={3}
                value={editingSessionForAssignment.notes || ''}
                onChange={(e) => {
                  if (editingSessionForAssignment) {
                    setEditingSessionForAssignment({
                      ...editingSessionForAssignment,
                      notes: e.target.value
                    });
                  }
                }}
                placeholder="הערות נוספות לטיפול (אופציונלי)"
                sx={{ mt: 2 }}
              />
              
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => {
                    setSessionEditDialogOpen(false);
                    setEditingSession(editingSessionForAssignment);
                    setEditDialogOpen(true);
                  }}
                >
                  מחק טיפול
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSessionEditDialogOpen(false)}>ביטול</Button>
          <Button onClick={() => handleSaveSessionAssignment(false)} variant="contained">
            שמור
          </Button>
        </DialogActions>
      </Dialog>

      {/* Consecutive Sessions Warning Modal */}
      <ConsecutiveSessionsWarningModal
        open={consecutiveWarningOpen}
        onClose={handleConsecutiveWarningCancel}
        onConfirm={handleConsecutiveWarningConfirm}
        warnings={consecutiveWarnings}
      />

      {/* Error Modal */}
      <ErrorModal
        open={errorModalOpen}
        title={errorInfo?.title || 'שגיאה'}
        message={errorInfo?.message || 'שגיאה לא ידועה'}
        details={errorInfo?.details}
        onClose={() => setErrorModalOpen(false)}
      />

      {/* Reset Schedule Confirmation Dialog */}
      <Dialog open={resetScheduleDialogOpen} onClose={() => setResetScheduleDialogOpen(false)} maxWidth="sm">
        <DialogTitle>
          <Warning color="warning" sx={{ verticalAlign: 'middle', mr: 1 }} />
          אישור איפוס לוח זמנים
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            האם אתה בטוח שברצונך לאפס את לוח הזמנים?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            פעולה זו תמחק את כל הטיפולים מלוח הזמנים ותיצור לוח זמנים ריק חדש. פעולה זו אינה ניתנת לביטול.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetScheduleDialogOpen(false)} color="inherit">ביטול</Button>
          <Button
            onClick={handleResetSchedule}
            variant="contained"
            color="warning"
            autoFocus
          >
            אפס לוח זמנים
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for creating session over blocking activity */}
      <Dialog
        open={confirmCreateSessionOpen}
        onClose={() => handleConfirmCreateSession(false)}
        aria-labelledby="confirm-create-session-title"
        aria-describedby="confirm-create-session-description"
      >
        <DialogTitle id="confirm-create-session-title">
          <Warning color="warning" sx={{ verticalAlign: 'middle', mr: 1 }} />
          אישור יצירת טיפול על פעילות חוסמת
        </DialogTitle>
        <DialogContent>
          <Typography id="confirm-create-session-description">
            הטיפול שאתה מנסה ליצור חופף עם פעילות חוסמת קיימת. האם אתה בטוח שברצונך ליצור את הטיפול בכל זאת?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleConfirmCreateSession(false)} autoFocus>ביטול</Button>
          <Button onClick={() => handleConfirmCreateSession(true)} variant="contained" color="primary">
            אישור יצירה
          </Button>
        </DialogActions>
      </Dialog>

      {schedule && (
        <Box sx={{ mt: 4, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">
            נוצר ב: {schedule.generatedAt.toLocaleString('he-IL')}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ScheduleView;
