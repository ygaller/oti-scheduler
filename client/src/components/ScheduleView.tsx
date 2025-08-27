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
  Tab
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
import EmployeeBigCalendarView from './EmployeeBigCalendarView';
import RoomBigCalendarView from './RoomBigCalendarView';
import { WeekDay, WEEK_DAYS, DAY_LABELS } from '../types/schedule';
import { scheduleService, ApiError, ConsecutiveSessionsWarning, BlockingActivityWarning, ScheduleConflictError } from '../services';
import { useActivities } from '../hooks';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

import { getContrastingTextColor } from '../utils/colorUtils';

// Utility function to format conflict details for display
const formatConflictDetails = (conflictDetails: {
  conflictType: 'employee' | 'room' | 'patient';
  conflictingSessions: any[];
}, employees: Employee[], rooms: Room[], patients: Patient[]): string => {
  if (!conflictDetails || !conflictDetails.conflictingSessions || conflictDetails.conflictingSessions.length === 0) {
    return '';
  }

  const { conflictingSessions } = conflictDetails;
  
  let details = '\n\nטיפולים קיימים שמתנגשים:\n';
  
  conflictingSessions.forEach((session, index) => {
    const sessionEmployees = session.employeeIds 
      ? session.employeeIds.map((id: string) => {
          const emp = employees.find(e => e.id === id);
          return emp ? `${emp.firstName} ${emp.lastName}` : id;
        }).join(', ')
      : session.employees?.map((emp: any) => `${emp.firstName} ${emp.lastName}`).join(', ') || 'לא ידוע';
    
    const sessionRoom = rooms.find(r => r.id === session.roomId)?.name || 'לא ידוע';
    
    const sessionPatients = session.patients 
      ? session.patients.map((patient: any) => `${patient.firstName} ${patient.lastName}`).join(', ')
      : 'ללא מטופלים';
    
    details += `\n${index + 1}. זמן: ${session.startTime}-${session.endTime}`;
    details += `\n   עובדים: ${sessionEmployees}`;
    details += `\n   חדר: ${sessionRoom}`;
    details += `\n   מטופלים: ${sessionPatients}`;
    if (session.everyTwoWeeks) {
      details += '\n   תדירות: כל שבועיים';
    }
    details += '\n';
  });
  
  return details;
};

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
  const { activities } = useActivities();
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
  const [originalSessionForAssignment, setOriginalSessionForAssignment] = useState<Session | null>(null);
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

  // Get blocked periods for display (activities already declared above)



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
    } else {
      // User confirmed blocking activity warning from session save attempt - retry with force
      performSaveSession(true);
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
      everyTwoWeeks: false, // Initialize everyTwoWeeks
      noPatients: false // Initialize noPatients
    };
    
    setSessionForm(sessionData);
    setPreselectedEmployeeId(employeeId || null);
    setEditDialogOpen(true);
  };

  // Handler for big calendar slot selection
  const handleBigCalendarSlotSelect = (slotInfo: { start: Date; end: Date; resourceId?: string }) => {
    if (!slotInfo.resourceId) return;

    // The resourceId is now just the employeeId (from our custom implementation)
    const employeeId = String(slotInfo.resourceId);
    
    const startTime = slotInfo.start.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    // Don't use the endTime from slot selection - let dialog set default 45-minute duration

    // We need to determine the day from the current context
    // For now, we'll use the day from the slot date
    const dayOfWeek = slotInfo.start.getDay();
    const weekDayMap: Record<number, WeekDay> = {
      0: 'sunday',
      1: 'monday', 
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
    };
    
    const weekDay = weekDayMap[dayOfWeek];
    if (weekDay) {
      // Don't pass endTime - let the dialog calculate 45-minute default
      handleAddSession(weekDay, startTime, employeeId);
    }
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
      noPatients: sessionForm.noPatients,
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
      
      // Handle blocking activity warning - show confirmation dialog to user
      if (error instanceof BlockingActivityWarning) {
        console.log('Blocking activity warning received, showing confirmation dialog');
        
        // Find which blocking activity is causing the conflict
        const sessionDay = sessionForm.day as WeekDay;
        const sessionStart = sessionForm.startTime!;
        const sessionEnd = sessionForm.endTime!;
        
        let conflictingActivity = '';
        for (const activity of activities) {
          if (!activity.isBlocking) continue;
          
          const activityTime = getActivityTimeForDay(activity, sessionDay);
          if (activityTime && timesOverlap(sessionStart, sessionEnd, activityTime.startTime, activityTime.endTime)) {
            conflictingActivity = activity.name;
            break;
          }
        }
        
        const hebrewMessage = conflictingActivity 
          ? `הטיפול שאתה מנסה ליצור (${sessionStart}-${sessionEnd}) חופף עם הפעילות החוסמת "${conflictingActivity}". האם אתה בטוח שברצונך ליצור את הטיפול בכל זאת?`
          : `הטיפול שאתה מנסה ליצור (${sessionStart}-${sessionEnd}) חופף עם פעילות חוסמת. האם אתה בטוח שברצונך ליצור את הטיפול בכל זאת?`;
        
        setWarningDialogTitle('פעילות חוסמת');
        setWarningDialogMessage(hebrewMessage);
        setWarningDialogOpen(true);
        return;
      }
      
      // Handle schedule conflict errors with detailed conflict information
      if (error instanceof ScheduleConflictError) {
        console.log('Schedule conflict error received, showing detailed conflict information');
        
        const conflictError = error as ScheduleConflictError;
        let errorMessage = conflictError.message;
        let errorDetails = '';
        
        if (conflictError.conflictDetails) {
          errorDetails = formatConflictDetails(conflictError.conflictDetails, employees, rooms, patients);
        }
        
        setErrorInfo({
          title: 'קונפליקט בתזמון',
          message: errorMessage,
          details: errorDetails
        });
        setErrorModalOpen(true);
        return;
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
    setOriginalSessionForAssignment(session); // Store original session data for comparison
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
      
      // Check if employees, room, day, time, or notes changed
      const originalEmployees = originalSessionForAssignment?.employeeIds || [];
      const originalRoomId = originalSessionForAssignment?.roomId || '';
      const originalDay = originalSessionForAssignment?.day || '';
      const originalStartTime = originalSessionForAssignment?.startTime || '';
      const originalEndTime = originalSessionForAssignment?.endTime || '';

      const employeesChanged = JSON.stringify(originalEmployees.sort()) !== JSON.stringify(selectedEmployees.sort());
      const roomChanged = originalRoomId !== selectedRoomId;
      const dayChanged = originalDay !== editingSessionForAssignment.day;
      const startTimeChanged = originalStartTime !== editingSessionForAssignment.startTime;
      const endTimeChanged = originalEndTime !== editingSessionForAssignment.endTime;
      // For notes, we assume they might have changed since we're directly modifying the editingSessionForAssignment object
      const notesChanged = true; // Always save notes since we're editing them directly
      
      if (employeesChanged || roomChanged || dayChanged || startTimeChanged || endTimeChanged || notesChanged) {
        // Session properties changed - need to update session properties (may trigger blocking validation)
        await scheduleService.updateSession(selectedScheduleId, editingSessionForAssignment.id, {
          employeeIds: selectedEmployees,
          roomId: selectedRoomId,
          day: editingSessionForAssignment.day,
          startTime: editingSessionForAssignment.startTime,
          endTime: editingSessionForAssignment.endTime,
          scheduleId: editingSessionForAssignment.scheduleId,
          notes: editingSessionForAssignment.notes,
          everyTwoWeeks: editingSessionForAssignment.everyTwoWeeks,
          noPatients: editingSessionForAssignment.noPatients
        });

        // Then update patients separately
        await scheduleService.updateSessionPatients(selectedScheduleId, editingSessionForAssignment.id, filteredPatients, forceAssign);
      } else {
        // Only patients changed (and possibly notes/everyTwoWeeks) - update both patient assignments and session data
        await scheduleService.updateSession(selectedScheduleId, editingSessionForAssignment.id, {
          notes: editingSessionForAssignment.notes,
          everyTwoWeeks: editingSessionForAssignment.everyTwoWeeks,
          noPatients: editingSessionForAssignment.noPatients
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
          const originalEmployees = originalSessionForAssignment?.employeeIds || [];
          const originalRoomId = originalSessionForAssignment?.roomId || '';
          const originalDay = originalSessionForAssignment?.day || '';
          const originalStartTime = originalSessionForAssignment?.startTime || '';
          const originalEndTime = originalSessionForAssignment?.endTime || '';

          const employeesChanged = JSON.stringify(originalEmployees.sort()) !== JSON.stringify(selectedEmployees.sort());
          const roomChanged = originalRoomId !== selectedRoomId;
          const dayChanged = originalDay !== editingSessionForAssignment.day;
          const startTimeChanged = originalStartTime !== editingSessionForAssignment.startTime;
          const endTimeChanged = originalEndTime !== editingSessionForAssignment.endTime;
          const notesChanged = true; // Always save notes

          // Force update the session if properties changed
          if (employeesChanged || roomChanged || dayChanged || startTimeChanged || endTimeChanged || notesChanged) {
            await scheduleService.updateSession(selectedScheduleId, editingSessionForAssignment.id, {
              employeeIds: selectedEmployees,
              roomId: selectedRoomId,
              day: editingSessionForAssignment.day,
              startTime: editingSessionForAssignment.startTime,
              endTime: editingSessionForAssignment.endTime,
              scheduleId: editingSessionForAssignment.scheduleId,
              notes: editingSessionForAssignment.notes,
              everyTwoWeeks: editingSessionForAssignment.everyTwoWeeks,
              noPatients: editingSessionForAssignment.noPatients,
              forceCreate: true
            });
          } else {
            // Only update notes/everyTwoWeeks if no other changes
            await scheduleService.updateSession(selectedScheduleId, editingSessionForAssignment.id, {
              notes: editingSessionForAssignment.notes,
              everyTwoWeeks: editingSessionForAssignment.everyTwoWeeks,
              noPatients: editingSessionForAssignment.noPatients,
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





  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };







  const isTimeInRange = (time: string, startTime: string, endTime: string): boolean => {
    const timeMinutes = timeToMinutes(time);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
  };

  // Helper function to check if two time ranges overlap
  const timesOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
    const timeStringToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const start1Min = timeStringToMinutes(start1);
    const end1Min = timeStringToMinutes(end1);
    const start2Min = timeStringToMinutes(start2);
    const end2Min = timeStringToMinutes(end2);
    return start1Min < end2Min && start2Min < end1Min;
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



  // Helper function to check if two time ranges overlap (for patient view)
  const patientTimesOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const start1Min = timeToMinutes(start1);
    const end1Min = timeToMinutes(end1);
    const start2Min = timeToMinutes(start2);
    const end2Min = timeToMinutes(end2);
    
    return start1Min < end2Min && start2Min < end1Min;
  };

  // Helper function to calculate position for overlapping every-two-weeks sessions in patient view
  const calculatePatientSessionPosition = (session: Session, allPatientSessions: Session[]) => {
    if (!session.everyTwoWeeks) return { width: '100%', marginLeft: '0' };
    
    // Find other every-two-weeks sessions that overlap with this session
    const overlappingSessions = allPatientSessions.filter(s => 
      s.id !== session.id &&
      s.everyTwoWeeks &&
      patientTimesOverlap(session.startTime, session.endTime, s.startTime, s.endTime)
    );
    
    if (overlappingSessions.length === 0) return { width: '50%', marginLeft: '0' };
    
    // Sort overlapping sessions by ID to ensure consistent positioning
    const allOverlappingSessions = [session, ...overlappingSessions].sort((a, b) => a.id.localeCompare(b.id));
    const sessionIndex = allOverlappingSessions.findIndex(s => s.id === session.id);
    
    // Position sessions side by side (each takes 50% width)
    return {
      width: '50%',
      marginLeft: sessionIndex === 0 ? '0' : '50%'
    };
  };

  // Calendar components
  const PatientCalendarView = ({ day }: { day: WeekDay }) => {
    const patientSessions = getPatientSessionsForDay(day, selectedPatientId);
    
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, position: 'relative' }}>
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
            
            const { width, marginLeft } = calculatePatientSessionPosition(session, patientSessions);
            
            return (
              <Card
                key={session.id}
                sx={{
                  backgroundColor: backgroundColor,
                  cursor: 'pointer',
                  width: width,
                  marginLeft: marginLeft,
                  position: session.everyTwoWeeks && marginLeft !== '0' ? 'absolute' : 'relative',
                  top: session.everyTwoWeeks && marginLeft !== '0' ? '0' : 'auto',
                  zIndex: session.everyTwoWeeks && marginLeft !== '0' ? 1 : 'auto',
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

          {scheduleViewTab === 0 ? (
            // Employee view - use big calendar for all days at once
            <Box sx={{ width: '100%' }}>
              <EmployeeBigCalendarView
                employees={employees}
                rooms={rooms}
                schedule={schedule}
                activities={activities}
                onSelectSlot={handleBigCalendarSlotSelect}
                onSelectEvent={handleSessionClick}
              />
            </Box>
          ) : scheduleViewTab === 2 ? (
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
            // Room view - use big calendar for all days at once
            <Box sx={{ width: '100%' }}>
              <RoomBigCalendarView
                employees={employees}
                rooms={rooms}
                schedule={schedule}
                activities={activities}
                onSelectSlot={handleBigCalendarSlotSelect}
                onSelectEvent={handleSessionClick}
              />
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
                  ampm={false}
                  sx={{ width: '50%' }}
                />
                <TimePicker
                  label="שעת סיום"
                  value={sessionForm.endTime ? parseTime(sessionForm.endTime) : null}
                  onChange={(time) => setSessionForm(prev => ({ ...prev, endTime: time ? formatTime(time) : '' }))}
                  ampm={false}
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

              <Box display="flex" gap={2} alignItems="center">
                <Box flex={1}>
                  <Autocomplete
                    multiple
                    id="patients-autocomplete"
                    options={patients}
                    getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                    value={patients.filter(p => sessionForm.patientIds?.includes(p.id))}
                    onChange={(event, newValue) => {
                      setSessionForm(prev => ({ ...prev, patientIds: newValue.map(p => p.id) }));
                    }}
                    disabled={sessionForm.noPatients}
                    renderInput={(params) => (
                      <TextField {...params} variant="outlined" label="מטופלים" placeholder="בחר מטופלים" />
                    )}
                  />
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={sessionForm.noPatients || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSessionForm(prev => ({ 
                          ...prev, 
                          noPatients: checked,
                          patientIds: checked ? [] : prev.patientIds
                        }));
                      }}
                      color="primary"
                    />
                  }
                  label="ללא מטופלים"
                />
              </Box>

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

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="day-select-label">יום</InputLabel>
                <Select
                  labelId="day-select-label"
                  id="day-select"
                  value={editingSessionForAssignment.day}
                  label="יום"
                  onChange={(e) => {
                    if (editingSessionForAssignment) {
                      setEditingSessionForAssignment({
                        ...editingSessionForAssignment,
                        day: e.target.value as WeekDay
                      });
                    }
                  }}
                >
                  {WEEK_DAYS.map((day) => (
                    <MenuItem key={day} value={day}>
                      {DAY_LABELS[day]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box display="flex" gap={2} sx={{ mb: 2 }}>
                <TimePicker
                  label="שעת התחלה"
                  value={editingSessionForAssignment.startTime ? parseTime(editingSessionForAssignment.startTime) : null}
                  onChange={(time) => {
                    if (editingSessionForAssignment && time) {
                      const newStartTime = formatTime(time);
                      // Calculate session duration in minutes
                      const originalStart = parseTime(editingSessionForAssignment.startTime);
                      const originalEnd = parseTime(editingSessionForAssignment.endTime);
                      const durationMs = originalEnd.getTime() - originalStart.getTime();

                      // Calculate new end time maintaining the same duration
                      const newEndTime = new Date(time.getTime() + durationMs);

                      setEditingSessionForAssignment({
                        ...editingSessionForAssignment,
                        startTime: newStartTime,
                        endTime: formatTime(newEndTime)
                      });
                    }
                  }}
                  ampm={false}
                  sx={{ width: '50%' }}
                />
                <TimePicker
                  label="שעת סיום"
                  value={editingSessionForAssignment.endTime ? parseTime(editingSessionForAssignment.endTime) : null}
                  onChange={(time) => {
                    if (editingSessionForAssignment && time) {
                      setEditingSessionForAssignment({
                        ...editingSessionForAssignment,
                        endTime: formatTime(time)
                      });
                    }
                  }}
                  ampm={false}
                  sx={{ width: '50%' }}
                />
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

              <Box display="flex" alignItems="center" gap={2} sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom>
                  מטופלים:
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingSessionForAssignment.noPatients || false}
                      onChange={(e) => {
                        if (editingSessionForAssignment) {
                          const checked = e.target.checked;
                          setEditingSessionForAssignment({
                            ...editingSessionForAssignment,
                            noPatients: checked,
                            patientIds: checked ? [] : editingSessionForAssignment.patientIds
                          });
                          // Also clear selected patients state when no patients is enabled
                          if (checked) {
                            setSelectedPatients([]);
                          }
                        }
                      }}
                      color="primary"
                    />
                  }
                  label="ללא מטופלים"
                />
              </Box>

              <Autocomplete
                multiple /* Added multiple prop */
                id="patients-autocomplete-edit-session"
                options={patients.filter(patient => patient.isActive).sort((a, b) => 
                  `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
                )}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                disabled={editingSessionForAssignment.noPatients}
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
