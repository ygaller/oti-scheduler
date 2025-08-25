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
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Chip,
  Switch,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { 
  Warning,
  Delete
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

import ErrorModal from './ErrorModal';
import ConsecutiveSessionsWarningModal from './ConsecutiveSessionsWarningModal';
import TherapyRequirementsCards from './TherapyRequirementsCards';
import { WeekDay, WEEK_DAYS, DAY_LABELS } from '../types/schedule';
import { scheduleService, ApiError, ConsecutiveSessionsWarning, BlockingActivityWarning } from '../services';
import { useActivities } from '../hooks';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

import { getContrastingTextColor } from '../utils/colorUtils';
import { calculateEmployeeSessionCount, formatSessionCount } from '../utils/sessionCounting';

interface ScheduleViewProps {
  employees: Employee[];
  rooms: Room[];
  patients: Patient[];
  schedule: Schedule | null;
  selectedScheduleId: string;
  setSchedule: () => Promise<void>;
  activeTab: number; // Add prop to pass active tab index
}

const ScheduleView: React.FC<ScheduleViewProps> = ({
  employees,
  rooms,
  patients,
  schedule,
  selectedScheduleId,
  setSchedule,
  activeTab // Destructure new prop
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionForm, setSessionForm] = useState<Partial<Session>>({
    patientIds: []
  });

  const [scheduleViewTab, setScheduleViewTab] = useState(0); // Renamed from activeTab to avoid conflict
  const [confirmCreateSessionOpen, setConfirmCreateSessionOpen] = useState(false); // New state for session creation confirmation
  const [pendingSessionCreationData, setPendingSessionCreationData] = useState<Partial<Session> | null>(null); // New state for pending session data
  const [pendingSessionUpdateData, setPendingSessionUpdateData] = useState<{sessionId: string, data: Partial<Session>} | null>(null); // New state for pending session update data
  
  // Warning dialog for reserved hours and blocking activities
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [warningDialogTitle, setWarningDialogTitle] = useState('');
  const [warningDialogMessage, setWarningDialogMessage] = useState('');
  const [pendingSessionData, setPendingSessionData] = useState<{day: WeekDay, startTime: string, employeeId: string, endTime?: string} | null>(null);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{
    title: string;
    message: string;
    details?: string;
  } | null>(null);


  // Patient view states
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // Session editing states (renamed from patient assignment)
  const [sessionEditDialogOpen, setSessionEditDialogOpen] = useState(false);
  const [editingSessionForAssignment, setEditingSessionForAssignment] = useState<Session | null>(null);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

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
  const { activities } = useActivities();

  // Helper function for session counting (used in print functionality) with fractional counting
  const getEmployeeSessionCount = (employeeId: string) => {
    if (!schedule) return 0;
    return calculateEmployeeSessionCount(schedule.sessions, employeeId, true);
  };

  // Set default selected patient to first active patient
  React.useEffect(() => {
    const activePatients = patients.filter(patient => patient.isActive);
    if (activePatients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(activePatients[0].id);
    }
  }, [patients, selectedPatientId]);







  const checkForConflicts = (day: WeekDay, startTime: string, employeeId: string) => {
    // Check for reserved hours
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee) {
      const reservedHour = employee.reservedHours.find(rh => 
        rh.day === day && 
        timeToMinutes(startTime) >= timeToMinutes(rh.startTime) && 
        timeToMinutes(startTime) < timeToMinutes(rh.endTime)
      );
      
      if (reservedHour) {
        return {
          type: 'reservedHour',
          title: 'שעה חסומה',
          message: `הטיפול שאתה מנסה ליצור נופל על שעה חסומה של ${employee.firstName}${reservedHour.notes ? ` (${reservedHour.notes})` : ''}. האם אתה בטוח שברצונך להמשיך?`
        };
      }
    }

    // Check for blocking activities
    const reservedSlot = getReservedSlot(startTime, day);
    if (reservedSlot && reservedSlot.isBlocking) {
      return {
        type: 'blockingActivity',
        title: 'פעילות חוסמת',
        message: `הטיפול שאתה מנסה ליצור נופל על פעילות קיימת (${reservedSlot.label}). האם אתה בטוח שברצונך ליצור את הטיפול בכל זאת?`
      };
    }

    return null;
  };

  const handleWarningDialogConfirm = () => {
    setWarningDialogOpen(false);
    if (pendingSessionData) {
      // User confirmed to proceed through blocking activity - proceed with force save
      performSaveSession(true); // Pass true to force the save
    }
    setPendingSessionData(null);
  };

  const handleWarningDialogCancel = () => {
    setWarningDialogOpen(false);
    setPendingSessionData(null);
  };

  const proceedWithAddSession = (day: WeekDay, startTime: string, employeeId?: string, endTime?: string) => {
    setEditingSession(null);
    
    const sessionData = {
      day,
      startTime,
      endTime: endTime || formatTime(new Date(parseTime(startTime).getTime() + 45 * 60 * 1000)),
      employeeIds: employeeId ? [employeeId] : (employees[0]?.id ? [employees[0].id] : []),
      roomId: rooms[0]?.id || '',
      patientIds: [], // Initialize patientIds
      notes: '', // Initialize notes
      everyTwoWeeks: false // Initialize everyTwoWeeks
    };
    
    setSessionForm(sessionData);
    setPreselectedEmployeeId(employeeId || null);
    setEditDialogOpen(true);
  };

  const handleAddSession = (
    day?: WeekDay,
    startTime?: string,
    employeeId?: string,
    endTime?: string
  ) => {
    const sessionDay = day || 'sunday';
    const sessionStartTime = startTime || '09:00';
    const sessionEmployeeId = employeeId || employees[0]?.id || '';

    // No conflict checking here - proceed directly to open dialog
    proceedWithAddSession(sessionDay, sessionStartTime, sessionEmployeeId, endTime);
  };

  const handleSaveSession = async () => {
    // Check for conflicts before saving
    const conflict = checkForConflicts(
      sessionForm.day as WeekDay,
      sessionForm.startTime!,
      sessionForm.employeeIds![0] // Use first employee for conflict checking
    );

    if (conflict) {
      // Show warning dialog and store session data for later
      setWarningDialogTitle(conflict.title);
      setWarningDialogMessage(conflict.message);
      setPendingSessionData({
        day: sessionForm.day as WeekDay,
        startTime: sessionForm.startTime!,
        employeeId: sessionForm.employeeIds![0],
        endTime: sessionForm.endTime
      });
      setWarningDialogOpen(true);
      return; // Don't proceed with save until user confirms
    }

    // No conflicts, proceed with save
    await performSaveSession(false);
  };

  const performSaveSession = async (forceCreate: boolean = false) => {
    if (!sessionForm.employeeIds || sessionForm.employeeIds.length === 0 || !sessionForm.roomId || !sessionForm.day ||
        !sessionForm.startTime || !sessionForm.endTime) {
      setErrorInfo({
        title: 'שדות חסרים',
        message: 'יש למלא את כל השדות הנדרשים'
      });
      setErrorModalOpen(true);
      return;
    }

    const newSession = {
      id: editingSession?.id || `manual_${Date.now()}_${Math.random()}`,
      employeeIds: sessionForm.employeeIds!,
      roomId: sessionForm.roomId!,
      day: sessionForm.day as WeekDay,
      startTime: sessionForm.startTime!,
      endTime: sessionForm.endTime!,
      notes: sessionForm.notes,
      everyTwoWeeks: sessionForm.everyTwoWeeks,
      forceCreate: forceCreate, // Include forceCreate in the session object
    };

    // Server-side validation will handle all schedule constraints

    // Update schedule via API
    try {
      let savedSession: Session;
      if (editingSession) {
        savedSession = await scheduleService.updateSession(selectedScheduleId, editingSession.id, newSession);
      } else {
        savedSession = await scheduleService.createSession(selectedScheduleId, newSession);
      }
      
      // If patient assignments were changed, update them separately
      if (sessionForm.patientIds !== undefined) {
        await scheduleService.updateSessionPatients(selectedScheduleId, savedSession.id, sessionForm.patientIds);
      }

      await setSchedule(); // Refresh the schedule from the server
      setEditDialogOpen(false);
      setPreselectedEmployeeId(null);
    } catch (error) {
      console.error('Error saving session:', error);
      
      // Handle blocking activity warning - proceed with force create since warning was already shown
      if (error instanceof BlockingActivityWarning) {
        console.log('Blocking activity warning received, proceeding with force create');
        try {
          let savedSession: Session;
          if (editingSession) {
            const sessionWithForce = { ...newSession, forceCreate: true };
            savedSession = await scheduleService.updateSession(selectedScheduleId, editingSession.id, sessionWithForce as Partial<Session>);
          } else {
            const sessionWithForce = { ...newSession, forceCreate: true };
            savedSession = await scheduleService.createSession(selectedScheduleId, sessionWithForce);
          }
          
          // Handle patient assignments if they were included
          if (sessionForm.patientIds !== undefined) {
            await scheduleService.updateSessionPatients(selectedScheduleId, savedSession.id, sessionForm.patientIds);
          }

          await setSchedule(); // Refresh the schedule from the server
          setEditDialogOpen(false);
          setPreselectedEmployeeId(null);
          return;
        } catch (forceError) {
          console.error('Error force creating session after blocking warning:', forceError);
          // Show error if force creation also fails
          let errorMessage = 'שגיאה בשמירת הטיפול לאחר התרעת חסימה';
          let errorDetails = '';
          
          if (forceError instanceof ApiError) {
            errorMessage = forceError.message;
            errorDetails = forceError.details || '';
          } else if (forceError instanceof Error) {
            errorMessage = forceError.message || errorMessage;
          }
          
          setErrorInfo({
            title: 'שגיאה בשמירה',
            message: errorMessage,
            details: errorDetails
          });
          setErrorModalOpen(true);
          return;
        }
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
        savedSession = await scheduleService.updateSession(selectedScheduleId, pendingSessionUpdateData.sessionId, sessionToUpdate);
        
        // If patient assignments were included in the original session update, handle them now
        if (sessionForm.patientIds !== undefined) {
          try {
            await scheduleService.updateSessionPatients(selectedScheduleId, savedSession.id, sessionForm.patientIds, true); // Force assign patients
          } catch (patientError) {
            console.warn('Error assigning patients after force session update:', patientError);
            // Continue even if patient assignment fails - the session is updated
          }
        }
      } else if (pendingSessionCreationData) {
        // Handle session creation with force
        const sessionToCreate = { ...pendingSessionCreationData, forceCreate: true } as CreateSessionDto;
        savedSession = await scheduleService.createSession(selectedScheduleId, sessionToCreate);
        
        // If patient assignments were included in the original session creation, handle them now
        if (pendingSessionCreationData.patientIds && pendingSessionCreationData.patientIds.length > 0) {
          try {
            await scheduleService.updateSessionPatients(selectedScheduleId, savedSession.id, pendingSessionCreationData.patientIds, true); // Force assign patients
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
      await scheduleService.deleteSession(selectedScheduleId, editingSession.id);
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
    // Set the current room
    setSelectedRoomId(session.roomId || '');
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

      // Validate that a room is selected
      if (!selectedRoomId) {
        setErrorInfo({
          title: 'שגיאה בעדכון',
          message: 'יש לבחור חדר לטיפול',
          details: undefined
        });
        setErrorModalOpen(true);
        return;
      }

      // Filter out empty patient selections
      const filteredPatients = selectedPatients.filter(id => id !== '');
      
      // Check if employees, room, or notes changed
      const originalEmployees = editingSessionForAssignment.employeeIds || [];
      const originalRoomId = editingSessionForAssignment.roomId || '';
      const employeesChanged = JSON.stringify(originalEmployees.sort()) !== JSON.stringify(selectedEmployees.sort());
      const roomChanged = originalRoomId !== selectedRoomId;
      // For notes, we assume they might have changed since we're directly modifying the editingSessionForAssignment object
      const notesChanged = true; // Always save notes since we're editing them directly
      
      if (employeesChanged || roomChanged || notesChanged) {
        // Employees, room, or notes changed - need to update session properties (may trigger blocking validation for employee/room changes)
        await scheduleService.updateSession(selectedScheduleId, editingSessionForAssignment.id, {
          employeeIds: selectedEmployees,
          roomId: selectedRoomId,
          scheduleId: editingSessionForAssignment.scheduleId,
          notes: editingSessionForAssignment.notes,
          everyTwoWeeks: editingSessionForAssignment.everyTwoWeeks
        });
        
        // Then update patients separately
        await scheduleService.updateSessionPatients(selectedScheduleId, editingSessionForAssignment.id, filteredPatients, forceAssign);
      } else {
        // Only patients changed (and possibly notes/everyTwoWeeks) - update both patient assignments and session data
        await scheduleService.updateSession(selectedScheduleId, editingSessionForAssignment.id, {
          notes: editingSessionForAssignment.notes,
          everyTwoWeeks: editingSessionForAssignment.everyTwoWeeks
        });
        await scheduleService.updateSessionPatients(selectedScheduleId, editingSessionForAssignment.id, filteredPatients, forceAssign);
      }
      
      await setSchedule(); // Refresh the schedule from the server
      setSessionEditDialogOpen(false);
      
      // Clear any pending data
      setPendingAssignmentData(null);
    } catch (error) {
      console.error('Error updating session:', error);
      

      // Handle blocking activity warning - proceed with force since warning was already shown
      if (error instanceof BlockingActivityWarning) {
        console.log('Blocking activity warning in session assignment, proceeding with force');
        try {
          // Check what changed to determine how to force update
          const originalEmployees = editingSessionForAssignment.employeeIds || [];
          const originalRoomId = editingSessionForAssignment.roomId || '';
          const employeesChanged = JSON.stringify(originalEmployees.sort()) !== JSON.stringify(selectedEmployees.sort());
          const roomChanged = originalRoomId !== selectedRoomId;
          const notesChanged = true; // Always save notes
          
          // Force update the session if properties changed
          if (employeesChanged || roomChanged || notesChanged) {
            await scheduleService.updateSession(selectedScheduleId, editingSessionForAssignment.id, {
              employeeIds: selectedEmployees,
              roomId: selectedRoomId,
              scheduleId: editingSessionForAssignment.scheduleId,
              notes: editingSessionForAssignment.notes,
              everyTwoWeeks: editingSessionForAssignment.everyTwoWeeks,
              forceCreate: true
            });
          } else {
            // Only update notes/everyTwoWeeks if no other changes
            await scheduleService.updateSession(selectedScheduleId, editingSessionForAssignment.id, {
              notes: editingSessionForAssignment.notes,
              everyTwoWeeks: editingSessionForAssignment.everyTwoWeeks,
              forceCreate: true
            });
          }
          
          // Update patients with force
          const filteredPatients = selectedPatients.filter(id => id !== '');
          await scheduleService.updateSessionPatients(selectedScheduleId, editingSessionForAssignment.id, filteredPatients, true);
          
          await setSchedule();
          setSessionEditDialogOpen(false);
          setPendingAssignmentData(null);
          return;
        } catch (forceError) {
          console.error('Error force updating session after blocking warning:', forceError);
          // Show error if force update also fails
          let errorMessage = 'שגיאה בעדכון הטיפול לאחר התרעת חסימה';
          let errorDetails = '';
          
          if (forceError instanceof ApiError) {
            errorMessage = forceError.message;
            errorDetails = forceError.details || '';
          } else if (forceError instanceof Error) {
            errorMessage = forceError.message || errorMessage;
          }
          
          setErrorInfo({
            title: 'שגיאה בעדכון',
            message: errorMessage,
            details: errorDetails
          });
          setErrorModalOpen(true);
          return;
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
        selectedScheduleId,
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



  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const generateEmployeePrintContent = (): string => {
    const sortedEmployees = [...employees].filter(e => e.isActive).sort((a, b) => 
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
    );

    let html = '';

    sortedEmployees.forEach((employee, employeeIndex) => {
      // Add page break before each employee (except the first one)
      if (employeeIndex > 0) {
        html += '<div style="page-break-before: always;"></div>';
      }

      // Employee header
      html += `
        <div class="employee-page">
          <div class="employee-header" style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">
            <div class="employee-title" style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">
              לוח זמנים - ${employee.firstName} ${employee.lastName}
            </div>
            <div class="employee-role" style="font-size: 14px; color: #666; margin-bottom: 10px;">
              ${getRoleName(employee.role, employee.roleId)}
            </div>
            <div class="employee-color" style="display: inline-block; width: 20px; height: 20px; background-color: ${employee.color}; border-radius: 3px; margin: 0 10px;"></div>
          </div>
      `;

      // Generate schedule grid for all days for this employee
      html += '<div class="schedule-grid">';
      
      WEEK_DAYS.forEach(day => {
        const employeeSessions = getEmployeeSessionsForDay(day, employee.id);
        const reservedHours = employee.reservedHours?.filter(rh => rh.day === day) || [];
        
        html += `
          <div class="day-schedule">
            <div class="day-header">${DAY_LABELS[day]}</div>
            <div class="day-content">
        `;
        
        if (employeeSessions.length === 0 && reservedHours.length === 0) {
          html += '<div class="no-sessions">אין טיפולים או שעות שמורות ליום זה</div>';
        } else {
          html += '<ul class="sessions-list">';
          
          // Combine sessions and reserved hours, then sort by start time
          const allItems: Array<{type: 'session' | 'reserved', data: any, startTime: string}> = [
            ...employeeSessions.map(s => ({type: 'session' as const, data: s, startTime: s.startTime})),
            ...reservedHours.map(rh => ({type: 'reserved' as const, data: rh, startTime: rh.startTime}))
          ].sort((a, b) => a.startTime.localeCompare(b.startTime));
          
          allItems.forEach(item => {
            if (item.type === 'session') {
              const session = item.data;
              const room = rooms.find(r => r.id === session.roomId);
              
              html += `
                <li class="session-item">
                  <div class="session-time">${session.startTime} - ${session.endTime}</div>
                  <div class="session-details">
                    חדר: ${room ? room.name : 'לא ידוע'}${session.patients && session.patients.length > 0 ? '<br>מטופלים: ' + session.patients.map((p: Patient) => `${p.firstName} ${p.lastName}`).join(', ') : '<br>ללא מטופל'}${session.notes && session.notes.trim() ? '<br>הערות: ' + session.notes : ''}${session.everyTwoWeeks ? '<br><span style="background-color: #1976d2; color: white; padding: 2px 6px; border-radius: 12px; font-size: 0.75rem;">אחת לשבועיים</span>' : ''}
                  </div>
                </li>
              `;
            } else {
              const reservedHour = item.data;
              html += `
                <li class="session-item" style="background-color: #fff3cd; border-left: 4px solid #ffc107;">
                  <div class="session-time">${reservedHour.startTime} - ${reservedHour.endTime}</div>
                  <div class="session-details">
                    <strong>שעות שמורות</strong><br>
                    ${reservedHour.notes || 'ללא הערות'}
                  </div>
                </li>
              `;
            }
          });
          
          html += '</ul>';
        }
        
        html += '</div></div>';
      });
      
      html += '</div>';

      // Generate employee statistics and working hours
      const employeeSessionCount = getEmployeeSessionCount(employee.id);
      html += `
        <div class="employee-statistics" style="margin-top: 30px; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">
          <div class="statistics-title" style="font-size: 16px; font-weight: bold; margin-bottom: 15px;">סטטיסטיקות - ${employee.firstName} ${employee.lastName}</div>
          <div class="stats-grid">
            <div class="stat-item">
              <strong>סה"כ טיפולים לעובד זה:</strong> ${formatSessionCount(employeeSessionCount)}/${employee.weeklySessionsCount}
            </div>
            <div class="stat-item">
              <strong>צבע עובד:</strong> <span style="display: inline-block; width: 15px; height: 15px; background-color: ${employee.color}; border-radius: 2px; margin-right: 5px; vertical-align: middle;"></span> ${employee.color}
            </div>
      `;

      // Add working hours information
      html += `
            <div class="stat-item" style="grid-column: 1 / -1;">
              <strong>שעות עבודה:</strong><br>
      `;
      
      Object.entries(employee.workingHours || {}).forEach(([day, hours]) => {
        if (hours) {
          const dayLabel = DAY_LABELS[day as WeekDay] || day;
          html += `• ${dayLabel}: ${hours.startTime} - ${hours.endTime}<br>`;
        }
      });
      
      html += '</div>';

      // Add reserved hours summary if any
      if (employee.reservedHours && employee.reservedHours.length > 0) {
        html += `
            <div class="stat-item" style="grid-column: 1 / -1;">
              <strong>שעות שמורות:</strong><br>
        `;
        
        employee.reservedHours.forEach(rh => {
          const dayLabel = DAY_LABELS[rh.day as WeekDay] || rh.day;
          html += `• ${dayLabel} ${rh.startTime}-${rh.endTime}: ${rh.notes || 'ללא הערות'}<br>`;
        });
        
        html += '</div>';
      }

      html += '</div></div>';

      html += '</div>'; // Close employee-page
    });

    // Add global activities section on the last page
    if (activities.length > 0) {
      html += `
        <div class="global-activities" style="margin-top: 30px; padding: 20px; background-color: #f0f8ff; border: 1px solid #ddd; border-radius: 8px;">
          <div class="statistics-title" style="font-size: 16px; font-weight: bold; margin-bottom: 15px;">פעילויות שוטפות</div>
      `;
      
      activities.forEach(period => {
        html += `
          <div class="blocked-period-item" style="margin-bottom: 8px; padding: 8px; border-right: 4px solid #ff6b6b; background-color: #fff5f5; font-size: 11px;">
            <strong>${period.name}</strong><br>
            ${period.defaultStartTime && period.defaultEndTime 
              ? `שעות ברירת מחדל: ${period.defaultStartTime} - ${period.defaultEndTime}` 
              : 'שעות מותאמות לפי יום'}
          </div>
        `;
      });
      
      html += '</div>';
    }

    return html;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const generateRoomPrintContent = (): string => {
    const sortedRooms = [...rooms].filter(r => r.isActive).sort((a, b) => a.name.localeCompare(b.name, 'he'));

    let html = '';

    sortedRooms.forEach((room, roomIndex) => {
      // Add page break before each room (except the first one)
      if (roomIndex > 0) {
        html += '<div style="page-break-before: always;"></div>';
      }

      // Room header
      html += `
        <div class="room-page">
          <div class="room-header" style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">
            <div class="room-title" style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">
              לוח זמנים - ${room.name}
            </div>
            <div class="room-color" style="display: inline-block; width: 20px; height: 20px; background-color: ${room.color}; border-radius: 3px; margin: 0 10px;"></div>
          </div>
      `;

      // Generate schedule grid for all days for this room
      html += '<div class="schedule-grid">';
      
      WEEK_DAYS.forEach(day => {
        const roomSessions = getSessionsForDay(day).filter(session => session.roomId === room.id);
        
        html += `
          <div class="day-schedule">
            <div class="day-header">${DAY_LABELS[day]}</div>
            <div class="day-content">
        `;
        
        if (roomSessions.length === 0) {
          html += '<div class="no-sessions">אין טיפולים מתוזמנים ליום זה</div>';
        } else {
          html += '<ul class="sessions-list">';
          
          // Sort sessions by start time
          const sortedSessions = roomSessions.sort((a, b) => a.startTime.localeCompare(b.startTime));
          
          sortedSessions.forEach(session => {
            const employee = employees.find(e => e.id === session.employeeIds?.[0]);
            
            html += `
              <li class="session-item">
                <div class="session-time">${session.startTime} - ${session.endTime}</div>
                <div class="session-details">
                  עובד: ${employee ? `${employee.firstName} ${employee.lastName}` : 'לא ידוע'}<br>
                  תפקיד: ${employee ? getRoleName(employee.role, employee.roleId) : 'לא ידוע'}${session.patients && session.patients.length > 0 ? '<br>מטופלים: ' + session.patients.map(p => `${p.firstName} ${p.lastName}`).join(', ') : ''}${session.notes && session.notes.trim() ? '<br>הערות: ' + session.notes : ''}
                </div>
              </li>
            `;
          });
          
          html += '</ul>';
        }
        
        html += '</div></div>';
      });
      
      html += '</div>';

      // Generate room statistics for this specific room
      const roomSessionCount = schedule?.sessions.filter(s => s.roomId === room.id).length || 0;
      html += `
        <div class="room-statistics" style="margin-top: 30px; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">
          <div class="statistics-title" style="font-size: 16px; font-weight: bold; margin-bottom: 15px;">סטטיסטיקות - ${room.name}</div>
          <div class="stats-grid">
            <div class="stat-item">
              <strong>סה"כ טיפולים בחדר זה:</strong> ${roomSessionCount}
            </div>
            <div class="stat-item">
              <strong>צבע חדר:</strong> <span style="display: inline-block; width: 15px; height: 15px; background-color: ${room.color}; border-radius: 2px; margin-right: 5px; vertical-align: middle;"></span> ${room.color}
            </div>
          </div>
        </div>
      `;

      html += '</div>'; // Close room-page
    });

    // Add global activities section on the last page
    if (activities.length > 0) {
      html += `
        <div class="global-activities" style="margin-top: 30px; padding: 20px; background-color: #f0f8ff; border: 1px solid #ddd; border-radius: 8px;">
          <div class="statistics-title" style="font-size: 16px; font-weight: bold; margin-bottom: 15px;">פעילויות שוטפות</div>
      `;
      
      activities.forEach(period => {
        html += `
          <div class="blocked-period-item" style="margin-bottom: 8px; padding: 8px; border-right: 4px solid #ff6b6b; background-color: #fff5f5; font-size: 11px;">
            <strong>${period.name}</strong><br>
            ${period.defaultStartTime && period.defaultEndTime 
              ? `שעות ברירת מחדל: ${period.defaultStartTime} - ${period.defaultEndTime}` 
              : 'שעות מותאמות לפי יום'}
          </div>
        `;
      });
      
      html += '</div>';
    }

    return html;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const generatePatientPrintContent = (): string => {
    const sortedPatients = [...patients].filter(p => p.isActive).sort((a, b) => 
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
    );

    let html = '';

    sortedPatients.forEach((patient, patientIndex) => {
      // Add page break before each patient (except the first one)
      if (patientIndex > 0) {
        html += '<div style="page-break-before: always;"></div>';
      }

      // Patient header
      html += `
        <div class="patient-page">
          <div class="patient-header" style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">
            <div class="patient-title" style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">
              לוח זמנים - ${patient.firstName} ${patient.lastName}
            </div>
            <div class="patient-color" style="display: inline-block; width: 20px; height: 20px; background-color: ${patient.color}; border-radius: 3px; margin: 0 10px;"></div>
          </div>
      `;

      // Generate schedule grid for all days for this patient
      html += '<div class="schedule-grid">';
      
      WEEK_DAYS.forEach(day => {
        const patientSessions = getPatientSessionsForDay(day, patient.id);
        
        html += `
          <div class="day-schedule">
            <div class="day-header">${DAY_LABELS[day]}</div>
            <div class="day-content">
        `;
        
        if (patientSessions.length === 0) {
          html += '<div class="no-sessions">אין טיפולים מתוזמנים ליום זה</div>';
        } else {
          html += '<ul class="sessions-list">';
          
          // Sort sessions by start time
          const sortedSessions = patientSessions.sort((a, b) => a.startTime.localeCompare(b.startTime));
          
          sortedSessions.forEach(session => {
            const employee = employees.find(e => e.id === session.employeeIds?.[0]);
            const room = rooms.find(r => r.id === session.roomId);
            
            html += `
              <li class="session-item">
                <div class="session-time">${session.startTime} - ${session.endTime}</div>
                <div class="session-details">
                  מטפל: ${employee ? `${employee.firstName} ${employee.lastName}` : 'לא ידוע'}<br>
                  טיפול: ${employee ? getRoleName(employee.role, employee.roleId) : 'לא ידוע'}<br>
                  חדר: ${room ? room.name : 'לא ידוע'}${session.notes && session.notes.trim() ? '<br>הערות: ' + session.notes : ''}${session.everyTwoWeeks ? '<br><span style="background-color: #1976d2; color: white; padding: 2px 6px; border-radius: 12px; font-size: 0.75rem;">אחת לשבועיים</span>' : ''}
                </div>
              </li>
            `;
          });
          
          html += '</ul>';
        }
        
        html += '</div></div>';
      });
      
      html += '</div>';

      // Generate patient statistics and therapy requirements
      const patientSessionCount = schedule?.sessions.filter(s => 
        s.patients?.some(p => p.id === patient.id)
      ).length || 0;

      html += `
        <div class="patient-statistics" style="margin-top: 30px; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">
          <div class="statistics-title" style="font-size: 16px; font-weight: bold; margin-bottom: 15px;">סטטיסטיקות - ${patient.firstName} ${patient.lastName}</div>
          <div class="stats-grid">
            <div class="stat-item">
              <strong>סה"כ טיפולים למטופל זה:</strong> ${patientSessionCount}
            </div>
            <div class="stat-item">
              <strong>צבע מטופל:</strong> <span style="display: inline-block; width: 15px; height: 15px; background-color: ${patient.color}; border-radius: 2px; margin-right: 5px; vertical-align: middle;"></span> ${patient.color}
            </div>
      `;

      // Add therapy requirements if available
      if (patient.therapyRequirements) {
        html += `
            <div class="stat-item" style="grid-column: 1 / -1;">
              <strong>דרישות טיפול:</strong><br>
        `;
        
        Object.entries(patient.therapyRequirements).forEach(([roleKey, count]) => {
          // Find role name by roleStringKey
          const role = employees.find(e => e.role?.roleStringKey === roleKey)?.role;
          const roleName = role ? role.name : roleKey;
          html += `• ${roleName}: ${count} טיפולים<br>`;
        });
        
        html += '</div>';
      }

      html += '</div></div>';

      html += '</div>'; // Close patient-page
    });

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

  // Helper function to get sessions for a specific employee on a specific day
  const getEmployeeSessionsForDay = (day: WeekDay, employeeId: string) => {
    if (!schedule || !employeeId) return [];
    return schedule.sessions
      .filter(session => 
        session.day === day && 
        session.employeeIds && session.employeeIds.includes(employeeId)
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
                  width: session.everyTwoWeeks ? '50%' : '100%',
                  margin: session.everyTwoWeeks ? '0 auto' : '0',
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
                  {session.everyTwoWeeks && (
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        label="אחת לשבועיים"
                        size="small"
                        sx={{
                          backgroundColor: '#1976d2',
                          color: 'white',
                          '& .MuiChip-label': { color: 'white' }
                        }}
                      />
                    </Box>
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

    const isTimeWithinReservedHours = (employee: Employee, time: string, currentDay: WeekDay): boolean => {
      if (!employee.reservedHours || employee.reservedHours.length === 0) return false;

      const currentTimeMinutes = timeToMinutes(time);

      return employee.reservedHours.some(reservedHour => {
        if (reservedHour.day !== currentDay) return false;

        const startMinutes = timeToMinutes(reservedHour.startTime);
        const endMinutes = timeToMinutes(reservedHour.endTime);

        return currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes;
      });
    };

    const getReservedHourForTime = (employee: Employee, time: string, currentDay: WeekDay) => {
      if (!employee.reservedHours || employee.reservedHours.length === 0) return null;

      const currentTimeMinutes = timeToMinutes(time);

      return employee.reservedHours.find(reservedHour => {
        if (reservedHour.day !== currentDay) return false;

        const startMinutes = timeToMinutes(reservedHour.startTime);
        const endMinutes = timeToMinutes(reservedHour.endTime);

        return currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes;
      }) || null;
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
                            p: session.everyTwoWeeks ? 0 : 1,
                            backgroundColor: session.everyTwoWeeks ? 'transparent' : backgroundColor,
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            color: textColor,
                            cursor: 'pointer',
                            position: 'relative',
                            zIndex: 2, // Ensure sessions appear on top of activities
                            borderLeft: '1px solid rgba(224, 224, 224, 1)',
                            '&:hover': {
                              filter: session.everyTwoWeeks ? 'none' : 'brightness(0.8)'
                            }
                          }}
                          onClick={session.everyTwoWeeks ? undefined : () => handleSessionClick(session)}
                        >
                          {session.everyTwoWeeks ? (
                            <Box sx={{
                              display: 'flex',
                              width: '100%',
                              height: '100%',
                              minHeight: `${duration * 20}px` // Ensure proper height based on duration
                            }}>
                              {/* Session box at 50% width */}
                              <Box
                                sx={{
                                  width: '50%',
                                  backgroundColor: backgroundColor,
                                  color: textColor,
                                  p: 0.5,
                                  borderRadius: 1,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  '&:hover': {
                                    filter: 'brightness(0.8)'
                                  }
                                }}
                                onClick={() => handleSessionClick(session)}
                              >
                                <Typography variant="caption" display="block" sx={{ fontSize: '0.6rem', lineHeight: 1.1 }}>
                                  {session.startTime} - {session.endTime}
                                </Typography>
                                <Typography variant="caption" display="block" sx={{ fontSize: '0.55rem', lineHeight: 1.1 }}>
                                  {getRoomName(session.roomId)}
                                </Typography>
                                {session.patients && session.patients.length > 0 ? (
                                  session.patients.slice(0, 1).map(patient => (
                                    <Typography key={patient.id} variant="caption" display="block" sx={{ fontSize: '0.5rem', lineHeight: 1.1 }}>
                                      {patient.firstName} {patient.lastName}
                                    </Typography>
                                  ))
                                ) : (
                                  <Typography variant="caption" display="block" color="error" sx={{ fontSize: '0.5rem', lineHeight: 1.1 }}>
                                    (חסר מטופל)
                                  </Typography>
                                )}
                                {session.employeeIds && session.employeeIds.length > 1 && (
                                  <Typography variant="caption" display="block" sx={{ fontSize: '0.45rem', lineHeight: 1.1 }}>
                                    + {session.employeeIds.length - 1} מטפלים נוספים
                                  </Typography>
                                )}
                                {session.notes && (
                                  <Typography variant="caption" display="block" sx={{ fontSize: '0.45rem', fontStyle: 'italic', lineHeight: 1.1 }}>
                                    הערות: {session.notes}
                                  </Typography>
                                )}
                                <Box sx={{ mt: 0.25 }}>
                                  <Chip
                                    label="אחת לשבועיים"
                                    size="small"
                                    sx={{
                                      fontSize: '0.45rem',
                                      height: '12px',
                                      backgroundColor: '#1976d2',
                                      color: 'white',
                                      '& .MuiChip-label': { color: 'white', fontSize: '0.45rem', px: 0.5 }
                                    }}
                                  />
                                </Box>
                              </Box>
                              {/* Clickable area for adding sessions at 50% width */}
                              <Box
                                sx={{
                                  width: '50%',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                  }
                                }}
                                onClick={() => handleAddSession(day, time, employee.id)}
                              >
                                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', opacity: 0.7 }}>
                                  +
                                </Typography>
                              </Box>
                            </Box>
                          ) : (
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
                              {session.everyTwoWeeks && (
                                <Box sx={{ mt: 0.5 }}>
                                  <Chip
                                    label="אחת לשבועיים"
                                    size="small"
                                    sx={{
                                      fontSize: '0.6rem',
                                      height: '16px',
                                      backgroundColor: '#1976d2',
                                      color: 'white',
                                      '& .MuiChip-label': { color: 'white', fontSize: '0.6rem' }
                                    }}
                                  />
                                </Box>
                              )}
                            </Box>
                          )}
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
                    const isReservedHour = isTimeWithinReservedHours(employee, time, day);
                    const reservedHourDetails = getReservedHourForTime(employee, time, day);
                    
                    // Determine background color: reserved hours are greyed out like non-working hours but still clickable
                    const backgroundColor = !isWorkingHour ? 'grey.400' : (isReservedHour ? 'grey.400' : 'transparent');
                    const cursor = isWorkingHour ? 'pointer' : 'not-allowed'; // Working hours are always clickable, even if reserved
                    const hoverColor = isWorkingHour ? '#f0f0f0' : 'grey.400';
                    
                    return (
                      <TableCell key={employee.id} sx={{
                        p: 0.5,
                        backgroundColor,
                        borderLeft: '1px solid rgba(224, 224, 224, 1)',
                        cursor,
                        '&:hover': {
                          backgroundColor: hoverColor,
                        }
                      }}
                      onClick={() => {
                        if (isWorkingHour) {
                          handleAddSession(day, time, employee.id);
                        }
                      }}>
                        {reservedHourDetails && reservedHourDetails.notes && time === reservedHourDetails.startTime && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontSize: '0.6rem', 
                              color: 'text.secondary',
                              display: 'block',
                              textAlign: 'center',
                              lineHeight: 1.2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {reservedHourDetails.notes}
                          </Typography>
                        )}
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
                            p: session.everyTwoWeeks ? 0 : 1,
                            backgroundColor: session.everyTwoWeeks ? 'transparent' : backgroundColor,
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            color: textColor,
                            cursor: 'pointer',
                            position: 'relative',
                            zIndex: 2, // Ensure sessions appear on top of activities
                            borderLeft: '1px solid rgba(224, 224, 224, 1)',
                            '&:hover': {
                              filter: session.everyTwoWeeks ? 'none' : 'brightness(0.8)'
                            }
                          }}
                          onClick={session.everyTwoWeeks ? undefined : () => handleSessionClick(session)}
                        >
                          {session.everyTwoWeeks ? (
                            <Box sx={{
                              display: 'flex',
                              width: '100%',
                              height: '100%',
                              minHeight: `${duration * 20}px` // Ensure proper height based on duration
                            }}>
                              {/* Session box at 50% width */}
                              <Box
                                sx={{
                                  width: '50%',
                                  backgroundColor: backgroundColor,
                                  color: textColor,
                                  p: 0.5,
                                  borderRadius: 1,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  '&:hover': {
                                    filter: 'brightness(0.8)'
                                  }
                                }}
                                onClick={() => handleSessionClick(session)}
                              >
                                <Typography variant="caption" display="block" sx={{ fontSize: '0.6rem', lineHeight: 1.1 }}>
                                  {session.startTime} - {session.endTime}
                                </Typography>
                                <Typography variant="caption" display="block" sx={{ fontSize: '0.55rem', lineHeight: 1.1 }}>
                                  {getEmployeeNames(session.employeeIds)}
                                </Typography>
                                {session.patients && session.patients.length > 0 ? (
                                  session.patients.slice(0, 1).map(patient => (
                                    <Typography key={patient.id} variant="caption" display="block" sx={{ fontSize: '0.5rem', lineHeight: 1.1 }}>
                                      {patient.firstName} {patient.lastName}
                                    </Typography>
                                  ))
                                ) : (
                                  <Typography variant="caption" display="block" sx={{ color: 'red', fontSize: '0.5rem', lineHeight: 1.1 }}>
                                    חסר מטופל
                                  </Typography>
                                )}
                                <Box sx={{ mt: 0.25 }}>
                                  <Chip
                                    label="אחת לשבועיים"
                                    size="small"
                                    sx={{
                                      fontSize: '0.45rem',
                                      height: '12px',
                                      backgroundColor: '#1976d2',
                                      color: 'white',
                                      '& .MuiChip-label': { color: 'white', fontSize: '0.45rem', px: 0.5 }
                                    }}
                                  />
                                </Box>
                              </Box>
                              {/* Clickable area for adding sessions at 50% width */}
                              <Box
                                sx={{
                                  width: '50%',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                  }
                                }}
                                onClick={() => handleAddSession(day, time)}
                              >
                                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', opacity: 0.7 }}>
                                  +
                                </Typography>
                              </Box>
                            </Box>
                          ) : (
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
                              {session.everyTwoWeeks && (
                                <Box sx={{ mt: 0.5 }}>
                                  <Chip
                                    label="אחת לשבועיים"
                                    size="small"
                                    sx={{
                                      fontSize: '0.6rem',
                                      height: '16px',
                                      backgroundColor: '#1976d2',
                                      color: 'white',
                                      '& .MuiChip-label': { color: 'white', fontSize: '0.6rem' }
                                    }}
                                  />
                                </Box>
                              )}
                            </Box>
                          )}
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
                        borderLeft: '1px solid rgba(224, 224, 224, 1)',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                        }
                      }}
                      onClick={() => handleAddSession(day, time)}
                      >
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


      {employees.length === 0 || rooms.length === 0 ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          יש להוסיף לפחות עובד אחד וחדר אחד כדי להוסיף טיפולים
        </Alert>
      ) : null}

      {/* Therapy Requirement and Statistics Sections */}
      <TherapyRequirementsCards 
        schedule={schedule}
        patients={patients}
        employees={employees}
      />

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
      <Dialog open={editDialogOpen} onClose={() => { setEditDialogOpen(false); }} maxWidth="sm" fullWidth>
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
                {editingSession.everyTwoWeeks && (
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label="אחת לשבועיים"
                      size="small"
                      sx={{
                        backgroundColor: '#1976d2',
                        color: 'white',
                        '& .MuiChip-label': { color: 'white' }
                      }}
                    />
                  </Box>
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

              {preselectedEmployeeId ? (
                // Show preselected employee as read-only and allow additional employees
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" gutterBottom sx={{ fontWeight: 'bold' }}>
                      עובד נבחר:
                    </Typography>
                    <Chip
                      variant="filled"
                      color="primary"
                      label={(() => {
                        const preselectedEmployee = employees.find(e => e.id === preselectedEmployeeId);
                        return preselectedEmployee 
                          ? `${preselectedEmployee.firstName} ${preselectedEmployee.lastName} - ${getRoleName(preselectedEmployee.role, preselectedEmployee.roleId)}`
                          : 'לא נמצא';
                      })()}
                      sx={{ mr: 1 }}
                    />
                  </Box>
                  <Autocomplete
                    multiple
                    id="additional-employees-autocomplete"
                    options={employees.filter(e => e.isActive && e.id !== preselectedEmployeeId)}
                    getOptionLabel={(option) => `${option.firstName} ${option.lastName} - ${getRoleName(option.role, option.roleId)}`}
                    value={employees.filter(e => 
                      sessionForm.employeeIds && 
                      sessionForm.employeeIds.includes(e.id) && 
                      e.id !== preselectedEmployeeId
                    )}
                    onChange={(event, newValue) => {
                      const additionalEmployeeIds = newValue.map(emp => emp.id);
                      setSessionForm(prev => ({ 
                        ...prev, 
                        employeeIds: [preselectedEmployeeId, ...additionalEmployeeIds]
                      }));
                    }}
                    renderInput={(params) => (
                      <TextField {...params} variant="outlined" label="עובדים נוספים" placeholder="בחר עובדים נוספים (אופציונלי)" />
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
                </Box>
              ) : (
                // Show regular employee selection when no preselected employee
                <Autocomplete
                  multiple
                  id="employees-autocomplete-form"
                  options={employees.filter(e => e.isActive)}
                  getOptionLabel={(option) => `${option.firstName} ${option.lastName} - ${getRoleName(option.role, option.roleId)}`}
                  value={employees.filter(e => sessionForm.employeeIds && sessionForm.employeeIds.includes(e.id))}
                  onChange={(event, newValue) => {
                    setSessionForm(prev => ({ ...prev, employeeIds: newValue.map(emp => emp.id) }));
                  }}
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
              )}
              
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

              <FormControlLabel
                control={
                  <Switch
                    checked={sessionForm.everyTwoWeeks || false}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, everyTwoWeeks: e.target.checked }))}
                    color="primary"
                  />
                }
                label="אחת לשבועיים"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditDialogOpen(false); }}>ביטול</Button>
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
      <Dialog open={sessionEditDialogOpen} onClose={() => setSessionEditDialogOpen(false)} maxWidth="sm" fullWidth>
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
                {editingSessionForAssignment.everyTwoWeeks && (
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label="אחת לשבועיים"
                      size="small"
                      sx={{
                        backgroundColor: '#1976d2',
                        color: 'white',
                        '& .MuiChip-label': { color: 'white' }
                      }}
                    />
                  </Box>
                )}
              </Box>

              <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
                חדר:
              </Typography>

              <FormControl fullWidth>
                <InputLabel id="room-select-label">חדר</InputLabel>
                <Select
                  labelId="room-select-label"
                  id="room-select"
                  value={selectedRoomId}
                  label="חדר"
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                >
                  {rooms.filter(room => room.isActive).map((room) => (
                    <MenuItem key={room.id} value={room.id}>
                      {room.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

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

              <FormControlLabel
                control={
                  <Switch
                    checked={editingSessionForAssignment.everyTwoWeeks || false}
                    onChange={(e) => {
                      if (editingSessionForAssignment) {
                        setEditingSessionForAssignment({
                          ...editingSessionForAssignment,
                          everyTwoWeeks: e.target.checked
                        });
                      }
                    }}
                    color="primary"
                  />
                }
                label="אחת לשבועיים"
                sx={{ mt: 1 }}
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

      {/* Warning Dialog for reserved hours and blocking activities */}
      <Dialog
        open={warningDialogOpen}
        onClose={handleWarningDialogCancel}
        aria-labelledby="warning-dialog-title"
        aria-describedby="warning-dialog-description"
      >
        <DialogTitle id="warning-dialog-title">
          <Warning color="warning" sx={{ verticalAlign: 'middle', mr: 1 }} />
          {warningDialogTitle}
        </DialogTitle>
        <DialogContent>
          <Typography id="warning-dialog-description">
            {warningDialogMessage}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleWarningDialogCancel} autoFocus>ביטול</Button>
          <Button onClick={handleWarningDialogConfirm} variant="contained" color="primary">
            המשך בכל זאת
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
