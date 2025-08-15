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
  Warning
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { 
  Employee, 
  Room, 
  ScheduleConfig, 
  Schedule, 
  Session, 
  DAY_LABELS, 
  WEEK_DAYS,
  WeekDay,
  ROLE_LABELS,
  BlockedPeriod 
} from '../types';
import { validateScheduleConstraints } from '../utils/scheduler';
import { scheduleService } from '../services';
import { useBlockedPeriods } from '../hooks';

interface ScheduleViewProps {
  employees: Employee[];
  rooms: Room[];
  scheduleConfig: ScheduleConfig;
  schedule: Schedule | null;
  setSchedule: () => Promise<void>;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({
  employees,
  rooms,
  scheduleConfig,
  schedule,
  setSchedule
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionForm, setSessionForm] = useState<Partial<Session>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Get blocked periods for display
  const { blockedPeriods } = useBlockedPeriods(true); // Only active ones

  const handleGenerateScheduleClick = () => {
    console.log('Generate schedule button clicked!');
    
    if (employees.length === 0 || rooms.length === 0) {
      alert('נדרשים לפחות עובד אחד וחדר אחד כדי ליצור לוח זמנים');
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
      
      alert('לוח הזמנים נוצר והופעל בהצלחה!');
    } catch (error) {
      console.error('Error generating schedule:', error);
      alert('שגיאה ביצירת לוח הזמנים: ' + (error instanceof Error ? error.message : 'שגיאה לא ידועה'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateScheduleCancel = () => {
    setConfirmDialogOpen(false);
  };

  const handleExportCSV = () => {
    if (!schedule || schedule.sessions.length === 0) {
      alert('אין נתונים לייצוא');
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
      alert('אין נתונים להדפסה');
      return;
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('חסימת חלונות קופצים מונעת את הפתיחה של חלון ההדפסה');
      return;
    }

    // Generate the printable content
    const printContent = generatePrintableSchedule();
    
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
      alert('יש למלא את כל השדות');
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
      scheduleConfig
    );

    if (!validation.valid) {
      alert(`שגיאה: ${validation.error}`);
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
      alert('שגיאה בשמירת הטיפול');
    }
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
  const getBlockedPeriodTimeForDay = (blockedPeriod: BlockedPeriod, day: WeekDay): { startTime: string; endTime: string } | null => {
    // Check if there's a day-specific override
    const dayOverride = blockedPeriod.dayOverrides[day];
    
    if (dayOverride !== undefined) {
      // If the override is explicitly null, this day is not blocked
      if (dayOverride === null) {
        return null;
      }
      // Use the override time
      return dayOverride;
    }
    
    // Use default time if both are available
    if (blockedPeriod.defaultStartTime && blockedPeriod.defaultEndTime) {
      return {
        startTime: blockedPeriod.defaultStartTime,
        endTime: blockedPeriod.defaultEndTime
      };
    }
    
    // No time specified for this day
    return null;
  };

  const getReservedSlot = (time: string, day: WeekDay) => {
    // Check all active blocked periods
    for (const blockedPeriod of blockedPeriods) {
      const timeRange = getBlockedPeriodTimeForDay(blockedPeriod, day);
      if (timeRange && isTimeInRange(time, timeRange.startTime, timeRange.endTime)) {
        return { 
          type: blockedPeriod.id, 
          label: blockedPeriod.name,
          color: blockedPeriod.color,
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

  const generatePrintableSchedule = (): string => {
    if (!schedule) return '';

    const sortedEmployees = [...employees].sort((a, b) => 
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
    );

    // Generate header
    let html = `
      <div class="print-header">
        <div class="print-title">לוח זמנים</div>
        <div class="print-date">נוצר ב: ${schedule.generatedAt.toLocaleString('he-IL')}</div>
        <div class="print-date">הודפס ב: ${new Date().toLocaleString('he-IL')}</div>
      </div>
    `;

    // Generate schedule grid for all days
    html += '<div class="schedule-grid">';
    
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

    // Add blocked periods if any
    if (blockedPeriods.length > 0) {
      html += `
        <div class="blocked-periods">
          <div class="statistics-title">פעילויות שוטפות</div>
      `;
      
      blockedPeriods.forEach(period => {
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

  // Calendar components
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
              {sortedEmployees.map(employee => (
                <TableCell key={employee.id} sx={{ fontWeight: 'bold', textAlign: 'center', minWidth: 120 }}>
                  {employee.firstName} {employee.lastName}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {timeSlots.map((time, index) => {
              const isHourMark = time.endsWith(':00');
              return (
                <TableRow key={time} sx={{ 
                  height: 20,
                  borderTop: isHourMark ? 2 : 0.5,
                  borderColor: isHourMark ? 'primary.main' : 'divider'
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
                  {sortedEmployees.map(employee => {
                    const session = getSessionAtTime(daySessions, time, employee.id);
                    const reservedSlot = getReservedSlot(time, day);
                    
                    if (reservedSlot) {
                      return (
                        <TableCell key={employee.id} sx={{ 
                          p: 0.5,
                          backgroundColor: reservedSlot.color + '20', // Add transparency to the blocked period's color
                          textAlign: 'center',
                          fontSize: '0.7rem',
                          color: 'text.secondary'
                        }}>
                          {reservedSlot.isStartTime ? reservedSlot.label : ''}
                        </TableCell>
                      );
                    }
                    
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
                            '&:hover': { 
                              filter: 'brightness(0.8)'
                            }
                          }}
                          onClick={() => handleEditSession(session)}
                        >
                          <Box>
                            <Typography variant="caption" display="block">
                              {session.startTime} - {session.endTime}
                            </Typography>
                            <Typography variant="caption" display="block">
                              {getRoomName(session.roomId)}
                            </Typography>
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
                      <TableCell key={employee.id} sx={{ p: 0.5 }}>
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
              return (
                <TableRow key={time} sx={{ 
                  height: 20,
                  borderTop: isHourMark ? 2 : 0.5,
                  borderColor: isHourMark ? 'primary.main' : 'divider'
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
                  {sortedRooms.map(room => {
                    const session = getSessionAtTime(daySessions, time, undefined, room.id);
                    const reservedSlot = getReservedSlot(time, day);
                    
                    if (reservedSlot) {
                      return (
                        <TableCell key={room.id} sx={{ 
                          p: 0.5,
                          backgroundColor: reservedSlot.color + '20', // Add transparency to the blocked period's color
                          textAlign: 'center',
                          fontSize: '0.7rem',
                          color: 'text.secondary'
                        }}>
                          {reservedSlot.isStartTime ? reservedSlot.label : ''}
                        </TableCell>
                      );
                    }
                    
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
                            '&:hover': { 
                              filter: 'brightness(0.8)'
                            }
                          }}
                          onClick={() => handleEditSession(session)}
                        >
                          <Box>
                            <Typography variant="caption" display="block">
                              {session.startTime} - {session.endTime}
                            </Typography>
                            <Typography variant="caption" display="block">
                              {getEmployeeName(session.employeeId)}
                            </Typography>
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
                      <TableCell key={room.id} sx={{ p: 0.5 }}>
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



          <Box sx={{ mb: 2 }}>
            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} variant="fullWidth">
              <Tab label="לו״ז טיפולים" />
              <Tab label="לו״ז חדרים" />
            </Tabs>
          </Box>

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
                
                {getSessionsForDay(day).length === 0 && activeTab === 0 ? (
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
          {editingSession ? 'עריכת טיפול' : 'הוספת טיפול חדש'}
        </DialogTitle>
        <DialogContent>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>ביטול</Button>
          <Button onClick={handleSaveSession} variant="contained">
            {editingSession ? 'עדכן' : 'הוסף'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScheduleView;
