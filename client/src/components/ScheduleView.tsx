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
  TableRow
} from '@mui/material';
import { 
  CalendarToday, 
  Download, 
  Add,
  Print,
  Warning,
  Delete
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { 
  Employee, 
  Room, 
  Schedule, 
  Session, 
  DAY_LABELS, 
  WEEK_DAYS,
  WeekDay,
  ROLE_LABELS,
  Activity,
  Patient 
} from '../types';
import ErrorModal from './ErrorModal';
import { validateScheduleConstraints } from '../utils/scheduler';
import { scheduleService, ApiError } from '../services';
import { useActivities } from '../hooks';

interface ScheduleViewProps {
  employees: Employee[];
  rooms: Room[];
  patients: Patient[];
  schedule: Schedule | null;
  setSchedule: () => Promise<void>;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({
  employees,
  rooms,
  patients,
  schedule,
  setSchedule
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionForm, setSessionForm] = useState<Partial<Session>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{
    title: string;
    message: string;
    details?: string;
  }>({ title: '', message: '' });

  // Patient view states
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // Patient assignment states
  const [patientAssignmentDialogOpen, setPatientAssignmentDialogOpen] = useState(false);
  const [assigningSession, setAssigningSession] = useState<Session | null>(null);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);

  // Get blocked periods for display
  const { activities } = useActivities(true); // Only active ones

  // Set default selected patient to first active patient
  React.useEffect(() => {
    const activePatients = patients.filter(patient => patient.isActive);
    if (activePatients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(activePatients[0].id);
    }
  }, [patients, selectedPatientId]);

  const handleGenerateScheduleClick = () => {
    console.log('Generate schedule button clicked!');
    
    if (employees.length === 0 || rooms.length === 0) {
      setErrorInfo({
        title: 'לא ניתן ליצור לוח זמנים',
        message: 'נדרשים לפחות עובד אחד וחדר אחד כדי ליצור לוח זמנים'
      });
      setErrorModalOpen(true);
      return;
    }

    // Show confirmation dialog
    setConfirmDialogOpen(true);
  };

  const handleGenerateScheduleConfirm = async () => {
    setConfirmDialogOpen(false);
    setIsGenerating(true);
    
    try {
      console.log('Calling scheduleService.generate()...');
      const newSchedule = await scheduleService.generate();
      console.log('Schedule generated successfully:', newSchedule);
      
      if (!newSchedule.id) {
        throw new Error('Generated schedule does not have an ID');
      }
      
      console.log('Activating the new schedule...');
      await scheduleService.activate(newSchedule.id);
      console.log('Schedule activated successfully');
      
      console.log('Refreshing schedule from server...');
      await setSchedule(); // Refresh the schedule from the server
      console.log('Schedule refreshed successfully');
      
      // For success, we could use a toast notification or simple alert for now
      // The schedule is automatically refreshed, so the user will see the new schedule
      console.log('Schedule generated and activated successfully');
    } catch (error) {
      console.error('Error generating schedule:', error);
      
      const isApiError = error instanceof ApiError;
      setErrorInfo({
        title: 'שגיאה ביצירת לוח הזמנים',
        message: isApiError ? error.message : 'שגיאה לא ידועה בתקשורת עם השרת',
        details: isApiError ? error.details : undefined
      });
      setErrorModalOpen(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateScheduleCancel = () => {
    setConfirmDialogOpen(false);
  };

  const handleExportCSV = () => {
    if (!schedule || schedule.sessions.length === 0) {
      setErrorInfo({
        title: 'לא ניתן לייצא',
        message: 'אין נתונים לייצוא'
      });
      setErrorModalOpen(true);
      return;
    }

    const headers = ['יום', 'שעת התחלה', 'שעת סיום', 'עובד', 'תפקיד', 'חדר'];
    const rows = schedule.sessions.map(session => {
      const employee = employees.find(e => e.id === session.employeeId);
      const room = rooms.find(r => r.id === session.roomId);
      
      return [
        DAY_LABELS[session.day],
        session.startTime,
        session.endTime,
        employee ? `${employee.firstName} ${employee.lastName}` : 'לא ידוע',
        employee ? ROLE_LABELS[employee.role] : 'לא ידוע',
        room ? room.name : 'לא ידוע'
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `לוח_זמנים_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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

  const handleEditSession = (session: Session) => {
    setEditingSession(session);
    setSessionForm(session);
    setEditDialogOpen(true);
  };

  const handleAddSession = () => {
    setEditingSession(null);
    setSessionForm({
      day: 'sunday',
      startTime: '09:00',
      endTime: '09:45',
      employeeId: employees[0]?.id || '',
      roomId: rooms[0]?.id || ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveSession = async () => {
    if (!sessionForm.employeeId || !sessionForm.roomId || !sessionForm.day || 
        !sessionForm.startTime || !sessionForm.endTime) {
      setErrorInfo({
        title: 'שדות חסרים',
        message: 'יש למלא את כל השדות הנדרשים'
      });
      setErrorModalOpen(true);
      return;
    }

    const newSession: Session = {
      id: editingSession?.id || `manual_${Date.now()}_${Math.random()}`,
      employeeId: sessionForm.employeeId,
      roomId: sessionForm.roomId,
      day: sessionForm.day as WeekDay,
      startTime: sessionForm.startTime,
      endTime: sessionForm.endTime
    };

    // Validate the session
    const currentSessions = schedule?.sessions || [];
    const otherSessions = editingSession 
      ? currentSessions.filter(s => s.id !== editingSession.id)
      : currentSessions;

    const validation = validateScheduleConstraints(
      newSession, 
      otherSessions, 
      employees, 
      rooms, 
      activities
    );

    if (!validation.valid) {
      setErrorInfo({
        title: 'שגיאה בוולידציה',
        message: validation.error || 'שגיאה לא ידועה בוולידציה'
      });
      setErrorModalOpen(true);
      return;
    }

    // Update schedule via API
    try {
      if (editingSession) {
        await scheduleService.updateSession(editingSession.id, newSession);
      } else {
        await scheduleService.createSession(newSession);
      }
      
      await setSchedule(); // Refresh the schedule from the server
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error saving session:', error);
      
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
    setAssigningSession(session);
    const currentPatients = session.patients?.map(p => p.id) || [];
    // Ensure at least one empty slot for adding patients
    setSelectedPatients(currentPatients.length > 0 ? currentPatients : ['']);
    setPatientAssignmentDialogOpen(true);
  };

  const handleSavePatientAssignment = async () => {
    if (!assigningSession) return;

    try {
      // Filter out empty selections
      const filteredPatients = selectedPatients.filter(id => id !== '');
      await scheduleService.updateSessionPatients(assigningSession.id, filteredPatients);
      await setSchedule(); // Refresh the schedule from the server
      setPatientAssignmentDialogOpen(false);
    } catch (error) {
      console.error('Error updating session patients:', error);
      
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

  const handleAddPatientSlot = () => {
    setSelectedPatients([...selectedPatients, '']);
  };

  const handlePatientChange = (index: number, patientId: string) => {
    const newSelectedPatients = [...selectedPatients];
    newSelectedPatients[index] = patientId;
    setSelectedPatients(newSelectedPatients);
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
            const employee = employees.find(e => e.id === session.employeeId);
            if (employee) {
              assignedSessionsByRole[employee.role] = (assignedSessionsByRole[employee.role] || 0) + 1;
            }
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
              therapyType: ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role,
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
            const employee = employees.find(e => e.id === session.employeeId);
            if (employee) {
              assignedSessionsByRole[employee.role] = (assignedSessionsByRole[employee.role] || 0) + 1;
            }
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
              therapyType: ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role,
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
    return schedule.sessions.filter(s => s.employeeId === employeeId).length;
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
          isStartTime: time === timeRange.startTime
        };
      }
    }
    return null;
  };

  const getSessionAtTime = (sessions: Session[], time: string, employeeId?: string, roomId?: string): Session | null => {
    return sessions.find(session => {
      const matchesEmployee = !employeeId || session.employeeId === employeeId;
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
          const employee = employees.find(e => e.id === session.employeeId);
          const room = rooms.find(r => r.id === session.roomId);
          
          html += `
            <li class="session-item">
              <div class="session-time">${session.startTime} - ${session.endTime}</div>
              <div class="session-details">
                עובד: ${employee ? `${employee.firstName} ${employee.lastName}` : 'לא ידוע'}<br>
                תפקיד: ${employee ? ROLE_LABELS[employee.role] : 'לא ידוע'}<br>
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
          const employee = employees.find(e => e.id === session.employeeId);
          const room = rooms.find(r => r.id === session.roomId);
          
          html += `
            <li class="session-item">
              <div class="session-time">${session.startTime} - ${session.endTime}</div>
              <div class="session-details">
                חדר: ${room ? room.name : 'לא ידוע'}<br>
                עובד: ${employee ? `${employee.firstName} ${employee.lastName}` : 'לא ידוע'}<br>
                תפקיד: ${employee ? ROLE_LABELS[employee.role] : 'לא ידוע'}${session.patients && session.patients.length > 0 ? '<br>מטופלים: ' + session.patients.map(p => `${p.firstName} ${p.lastName}`).join(', ') : ''}
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
          const employee = employees.find(e => e.id === session.employeeId);
          const room = rooms.find(r => r.id === session.roomId);
          
          html += `
            <li class="session-item">
              <div class="session-time">${session.startTime} - ${session.endTime}</div>
              <div class="session-details">
                מטפל: ${employee ? `${employee.firstName} ${employee.lastName}` : 'לא ידוע'}<br>
                טיפול: ${employee ? ROLE_LABELS[employee.role] : 'לא ידוע'}<br>
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
    
    if (patientSessions.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
          אין טיפולים מתוזמנים ליום זה
        </Typography>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {patientSessions.map(session => {
          const employee = employees.find(e => e.id === session.employeeId);
          const room = rooms.find(r => r.id === session.roomId);
          
          return (
            <Card
              key={session.id}
              sx={{ 
                backgroundColor: '#f5f5f5', // Light grey for good print contrast
                cursor: 'pointer',
                '&:hover': { 
                  backgroundColor: '#e0e0e0'
                }
              }}
              onClick={() => handleSessionClick(session)}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  {session.startTime} - {session.endTime}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  מטפל: {employee ? `${employee.firstName} ${employee.lastName}` : 'לא ידוע'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  טיפול: {employee ? ROLE_LABELS[employee.role] : 'לא ידוע'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  חדר: {room ? room.name : 'לא ידוע'}
                </Typography>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    );
  };

  const EmployeeCalendarView = ({ day }: { day: WeekDay }) => {
    const timeSlots = generateTimeSlots();
    const daySessions = getSessionsForDay(day);
    const sortedEmployees = [...employees].sort((a, b) => 
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
    );
    
    return (
      <TableContainer sx={{ border: 1, borderColor: 'divider', maxHeight: 'none' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 80, fontWeight: 'bold', textAlign: 'center' }}>
                שעה
              </TableCell>
              <TableCell sx={{ width: 120, fontWeight: 'bold', textAlign: 'center', backgroundColor: 'grey.100' }}>
                פעילויות
              </TableCell>
              {sortedEmployees.map(employee => (
                <TableCell key={employee.id} sx={{ fontWeight: 'bold', textAlign: 'center', minWidth: 120 }}>
                  <div>{employee.firstName} {employee.lastName}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#666' }}>
                    ({ROLE_LABELS[employee.role]})
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
                  backgroundColor: reservedSlot ? reservedSlot.color + '15' : 'transparent' // Light background for activity rows
                }}>
                  <TableCell sx={{ 
                    p: 0.5, 
                    fontSize: '0.75rem',
                    textAlign: 'center',
                    backgroundColor: isHourMark ? 'grey.50' : 'transparent',
                    fontWeight: isHourMark ? 'bold' : 'normal'
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
                    fontWeight: reservedSlot ? 'bold' : 'normal'
                  }}>
                    {reservedSlot?.isStartTime ? reservedSlot.label : ''}
                  </TableCell>
                  
                  {sortedEmployees.map(employee => {
                    const session = getSessionAtTime(daySessions, time, employee.id);
                    
                    if (session && time === session.startTime) {
                      const duration = getSessionDurationInSlots(session);
                      const room = rooms.find(r => r.id === session.roomId);
                      return (
                        <TableCell key={employee.id} 
                          rowSpan={duration}
                          sx={{ 
                            p: 1,
                            backgroundColor: room?.color || '#845ec2',
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            color: 'white',
                            cursor: 'pointer',
                            position: 'relative',
                            zIndex: 2, // Ensure sessions appear on top of activities
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
                      s.employeeId === employee.id && 
                      isTimeInRange(time, s.startTime, s.endTime) && 
                      s.startTime !== time
                    );
                    
                    if (hasSessionAbove) {
                      return null;
                    }
                    
                    return (
                      <TableCell key={employee.id} sx={{ 
                        p: 0.5,
                        backgroundColor: 'transparent' // Let the row background show through
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
              <TableCell sx={{ width: 80, fontWeight: 'bold', textAlign: 'center' }}>
                שעה
              </TableCell>
              <TableCell sx={{ width: 120, fontWeight: 'bold', textAlign: 'center', backgroundColor: 'grey.100' }}>
                פעילויות
              </TableCell>
              {sortedRooms.map(room => (
                <TableCell key={room.id} sx={{ fontWeight: 'bold', textAlign: 'center', minWidth: 120 }}>
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
                  backgroundColor: reservedSlot ? reservedSlot.color + '15' : 'transparent' // Light background for activity rows
                }}>
                  <TableCell sx={{ 
                    p: 0.5, 
                    fontSize: '0.75rem',
                    textAlign: 'center',
                    backgroundColor: isHourMark ? 'grey.50' : 'transparent',
                    fontWeight: isHourMark ? 'bold' : 'normal'
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
                    fontWeight: reservedSlot ? 'bold' : 'normal'
                  }}>
                    {reservedSlot?.isStartTime ? reservedSlot.label : ''}
                  </TableCell>
                  
                  {sortedRooms.map(room => {
                    const session = getSessionAtTime(daySessions, time, undefined, room.id);
                    
                    if (session && time === session.startTime) {
                      const duration = getSessionDurationInSlots(session);
                      const employee = employees.find(e => e.id === session.employeeId);
                      return (
                        <TableCell key={room.id} 
                          rowSpan={duration}
                          sx={{ 
                            p: 1,
                            backgroundColor: employee?.color || '#845ec2',
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            color: 'white',
                            cursor: 'pointer',
                            position: 'relative',
                            zIndex: 2, // Ensure sessions appear on top of activities
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
                              {getEmployeeName(session.employeeId)}
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
                        backgroundColor: 'transparent' // Let the row background show through
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
            variant="outlined"
            startIcon={<Add />}
            onClick={handleAddSession}
            disabled={employees.length === 0 || rooms.length === 0}
          >
            הוסף טיפול
          </Button>
          <Button
            variant="contained"
            startIcon={isGenerating ? <CircularProgress size={16} /> : <CalendarToday />}
            onClick={handleGenerateScheduleClick}
            disabled={employees.length === 0 || rooms.length === 0 || isGenerating}
          >
            {isGenerating ? 'יוצר לוח זמנים...' : 'צור לוח זמנים'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportCSV}
            disabled={!schedule || schedule.sessions.length === 0}
          >
            ייצא לCSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={handlePrint}
            disabled={!schedule || schedule.sessions.length === 0}
          >
            הדפס
          </Button>
        </Box>
      </Box>

      {employees.length === 0 || rooms.length === 0 ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          יש להוסיף לפחות עובד אחד וחדר אחד כדי ליצור לוח זמנים
        </Alert>
      ) : null}

      {schedule ? (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" mb={2}>
                <Typography variant="h6" component="h2">
                  סטטיסטיקות לוח הזמנים
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={3} sx={{ mt: { xs: 1, md: 0 } }}>
                  <Typography variant="body2" color="text.secondary">
                    סה"כ טיפולים: {getTotalScheduledSessions()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    נוצר ב: {schedule.generatedAt.toLocaleString('he-IL')}
                  </Typography>
                </Box>
              </Box>
              
              <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2}>
                <Typography variant="subtitle1" sx={{ minWidth: 'fit-content', mb: { xs: 1, sm: 0 } }}>
                  טיפולים לפי עובד:
                </Typography>
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
            </CardContent>
          </Card>

          {/* Unassigned Therapy Requirements Section */}
          {patients.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" component="h2" mb={2}>
                  טיפולים נדרשים ללא השמה
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
            <Card sx={{ mb: 3 }}>
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

          <Box sx={{ mb: 2 }}>
            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} variant="fullWidth">
              <Tab label="לו״ז טיפולים" />
              <Tab label="לו״ז חדרים" />
              <Tab label="לו״ז מטופל" />
            </Tabs>
          </Box>

          {/* Patient Selection Dropdown - only show when Patient View tab is active */}
          {activeTab === 2 && (
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

          {activeTab === 2 ? (
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
                  
                  {getSessionsForDay(day).length === 0 ? (
                    <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
                      אין טיפולים מתוזמנים ליום זה
                    </Typography>
                  ) : (
                    <>
                      {activeTab === 0 && <EmployeeCalendarView day={day} />}
                      {activeTab === 1 && <RoomCalendarView day={day} />}
                    </>
                  )}
                </Paper>
              ))}
            </Box>
          )}
        </>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            לא נוצר לוח זמנים עדיין. לחץ על "צור לוח זמנים" להתחיל.
          </Typography>
        </Paper>
      )}

      {/* Schedule Generation Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={handleGenerateScheduleCancel} maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="warning" />
          אזהרה - יצירת לוח זמנים חדש
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            יצירת לוח זמנים חדש תמחק את לוח הזמנים הנוכחי ותחליף אותו בלוח זמנים חדש.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            פעולה זו אינה ניתנת לביטול. האם אתה בטוח שברצונך להמשיך?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleGenerateScheduleCancel} color="inherit">
            ביטול
          </Button>
          <Button 
            onClick={handleGenerateScheduleConfirm} 
            variant="contained" 
            color="warning"
            autoFocus
          >
            כן, צור לוח זמנים חדש
          </Button>
        </DialogActions>
      </Dialog>

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
                  <strong>עובד:</strong> {getEmployeeName(editingSession.employeeId)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>חדר:</strong> {getRoomName(editingSession.roomId)}
                </Typography>
                {editingSession.patients && editingSession.patients.length > 0 && (
                  <Typography variant="body2" gutterBottom>
                    <strong>מטופלים:</strong> {editingSession.patients.map(p => `${p.firstName} ${p.lastName}`).join(', ')}
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
                  onChange={(newValue) => setSessionForm(prev => ({ 
                    ...prev, 
                    startTime: formatTime(newValue) 
                  }))}
                  ampm={false}
                  slotProps={{ textField: { fullWidth: true } }}
                />
                
                <TimePicker
                  label="שעת סיום"
                  value={sessionForm.endTime ? parseTime(sessionForm.endTime) : null}
                  onChange={(newValue) => setSessionForm(prev => ({ 
                    ...prev, 
                    endTime: formatTime(newValue) 
                  }))}
                  ampm={false}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Box>
              
              <FormControl fullWidth>
                <InputLabel>עובד</InputLabel>
                <Select
                  value={sessionForm.employeeId || ''}
                  label="עובד"
                  onChange={(e) => setSessionForm(prev => ({ ...prev, employeeId: e.target.value }))}
                >
                  {[...employees].filter(employee => employee.isActive).sort((a, b) => 
                    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
                  ).map(employee => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} - {ROLE_LABELS[employee.role]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
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

      {/* Patient Assignment Dialog */}
      <Dialog open={patientAssignmentDialogOpen} onClose={() => setPatientAssignmentDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          השמת מטופלים לטיפול
        </DialogTitle>
        <DialogContent>
          {assigningSession && (
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body1" gutterBottom>
                פרטי הטיפול:
              </Typography>
              
              <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>יום:</strong> {DAY_LABELS[assigningSession.day]}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>שעות:</strong> {assigningSession.startTime} - {assigningSession.endTime}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>עובד:</strong> {getEmployeeName(assigningSession.employeeId)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>חדר:</strong> {getRoomName(assigningSession.roomId)}
                </Typography>
              </Box>

              <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
                מטופלים:
              </Typography>

              {selectedPatients.map((patientId, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <FormControl fullWidth>
                    <InputLabel>מטופל {index + 1}</InputLabel>
                    <Select
                      value={patientId}
                      label={`מטופל ${index + 1}`}
                      onChange={(e) => handlePatientChange(index, e.target.value)}
                    >
                      <MenuItem value="">ללא מטופל</MenuItem>
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
              ))}

              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={handleAddPatientSlot}
                sx={{ alignSelf: 'flex-start' }}
              >
                הוסף מטופל
              </Button>

              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => {
                    setPatientAssignmentDialogOpen(false);
                    setEditingSession(assigningSession);
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
          <Button onClick={() => setPatientAssignmentDialogOpen(false)}>ביטול</Button>
          <Button onClick={handleSavePatientAssignment} variant="contained">
            שמור
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Modal */}
      <ErrorModal
        open={errorModalOpen}
        title={errorInfo.title}
        message={errorInfo.message}
        details={errorInfo.details}
        onClose={() => setErrorModalOpen(false)}
      />
    </Box>
  );
};

export default ScheduleView;
