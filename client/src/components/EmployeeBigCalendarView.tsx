import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Tooltip,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import { 
  Employee, 
  Room, 
  Schedule, 
  Session, 
  Activity
} from '../types';
import { WeekDay, WEEK_DAYS, DAY_LABELS } from '../types/schedule';
import { getContrastingTextColor } from '../utils/colorUtils';
import familyIcon from '../family-icon.png';

interface EmployeeBigCalendarViewProps {
  employees: Employee[];
  rooms: Room[];
  schedule: Schedule | null;
  activities: Activity[];
  onSelectSlot: (slotInfo: { start: Date; end: Date; resourceId?: string }) => void;
  onSelectEvent: (session: Session) => void;
}

const EmployeeBigCalendarView: React.FC<EmployeeBigCalendarViewProps> = ({
  employees,
  rooms,
  schedule,
  activities,
  onSelectSlot,
  onSelectEvent,
}) => {
  const [selectedDay, setSelectedDay] = useState<WeekDay>(WEEK_DAYS[0]);

  // Generate time slots for grid display (15-minute intervals)
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

  const timeSlots = generateTimeSlots();
  
  // Constants for time calculations
  const SCHEDULE_START_HOUR = 7;
  const SLOT_HEIGHT = 20; // pixels per 15-minute slot
  const PIXELS_PER_MINUTE = SLOT_HEIGHT / 15; // 1.33 pixels per minute
  
  // Helper function to calculate pixel position from time
  const getPixelPositionFromTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = (hours - SCHEDULE_START_HOUR) * 60 + minutes;
    return totalMinutes * PIXELS_PER_MINUTE;
  };
  
  // Helper function to calculate pixel height from duration
  const getPixelHeightFromDuration = (startTime: string, endTime: string) => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const durationMinutes = endMinutes - startMinutes;
    return durationMinutes * PIXELS_PER_MINUTE;
  };

  // Get sessions for a specific day
  const getSessionsForDay = (day: WeekDay) => {
    if (!schedule) return [];
    return schedule.sessions
      .filter(session => session.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // Get activity time for a specific day
  const getActivityTimeForDay = (activity: Activity, day: WeekDay) => {
    // First check if there's a day-specific override
    const dayOverride = activity.dayOverrides?.[day];
    if (dayOverride) {
      return {
        startTime: dayOverride.startTime,
        endTime: dayOverride.endTime
      };
    }
    
    // Fall back to default times
    return {
      startTime: activity.defaultStartTime,
      endTime: activity.defaultEndTime
    };
  };

  // Get reserved slot for a specific time and day
  const getReservedSlot = (time: string, day: WeekDay) => {
    const activity = activities.find(activity => {
      const activityTime = getActivityTimeForDay(activity, day);
      if (!activityTime.startTime || !activityTime.endTime) return false;
      
      return time >= activityTime.startTime && time < activityTime.endTime;
    });
    
    return activity;
  };

  // Get employees for a specific day
  const getEmployeesForDay = (day: WeekDay) => {
    return employees.filter(employee => 
      employee.workingHours?.[day] || 
      employee.reservedHours?.some(rh => rh.day === day)
    );
  };

  // Helper function to check if time is within working hours
  const isTimeWithinWorkingHours = (employee: Employee, time: string, day: WeekDay): boolean => {
    const workingHours = employee.workingHours?.[day];
    if (!workingHours) return false;
    
    return time >= workingHours.startTime && time < workingHours.endTime;
  };

  // Helper function to check if time is within reserved hours
  const isTimeWithinReservedHours = (employee: Employee, time: string, day: WeekDay): boolean => {
    if (!employee.reservedHours) return false;
    
    return employee.reservedHours.some(rh => 
      rh.day === day && time >= rh.startTime && time < rh.endTime
    );
  };

  // Helper function to get reserved hour details for a specific time
  const getReservedHourForTime = (employee: Employee, time: string, day: WeekDay) => {
    if (!employee.reservedHours) return null;
    
    return employee.reservedHours.find(rh => 
      rh.day === day && time >= rh.startTime && time < rh.endTime
    );
  };

  // Helper function to convert time string to minutes
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Handle slot click
  const handleSlotClick = (day: WeekDay, time: string, employeeId: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const startDate = new Date();
    
    // Map day to number (0 = Sunday)
    const dayMap: Record<WeekDay, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4
    };
    
    startDate.setDate(startDate.getDate() - startDate.getDay() + dayMap[day]);
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 15);
    
    onSelectSlot({
      start: startDate,
      end: endDate,
      resourceId: employeeId
    });
  };

  // Helper function to calculate session left position for overlapping sessions
  const calculateSessionLeftPosition = (session: Session, allSessionsInTimeSlot: Session[]) => {
    const overlappingSessions = allSessionsInTimeSlot.filter(s => {
      const sessionStart = timeToMinutes(session.startTime);
      const sessionEnd = timeToMinutes(session.endTime);
      const otherStart = timeToMinutes(s.startTime);
      const otherEnd = timeToMinutes(s.endTime);
      
      return (sessionStart < otherEnd && sessionEnd > otherStart);
    });

    // Sort overlapping sessions by start time for consistent ordering
    overlappingSessions.sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    const sessionIndex = overlappingSessions.findIndex(s => s.id === session.id);
    
    // For everyTwoWeeks sessions, they get half width and positioned side by side
    if (session.everyTwoWeeks) {
      return sessionIndex === 0 ? '1px' : '50%';
    }

    // For regular sessions, if there are overlaps, they get half width
    if (overlappingSessions.length > 1) {
      return sessionIndex === 0 ? '1px' : '50%';
    }

    return sessionIndex === 0 ? '1px' : '50%';
  };

  // Render session with exact positioning
  const renderSessionInSlot = (session: Session, day: WeekDay, employeeId: string) => {
    const topPosition = getPixelPositionFromTime(session.startTime);
    const height = getPixelHeightFromDuration(session.startTime, session.endTime);
    
    // Get all sessions for this employee to calculate positioning
    const employeeSessions = getSessionsForDay(day).filter(s => s.employeeIds.includes(employeeId));
    const leftPosition = calculateSessionLeftPosition(session, employeeSessions);
    
    const room = rooms.find(r => r.id === session.roomId);
    const backgroundColor = room?.color || '#845ec2';
    const textColor = getContrastingTextColor(backgroundColor);

    const tooltipContent = (
      <Box>
        <Typography variant="body2" gutterBottom>
          <strong>זמן:</strong> {session.startTime} - {session.endTime}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <strong>חדר:</strong> {room?.name || 'לא ידוע'}
        </Typography>
        {!session.noPatients && (
          session.patients && session.patients.length > 0 ? (
            <Typography variant="body2" gutterBottom>
              <strong>מטופלים:</strong> {session.patients.map(p => `${p.firstName} ${p.lastName}`).join(', ')}
            </Typography>
          ) : (
            <Typography variant="body2" color="error" gutterBottom>
              <strong>מטופלים:</strong> חסר מטופל
            </Typography>
          )
        )}
        {session.employeeIds && session.employeeIds.length > 1 && (
          <Typography variant="body2" gutterBottom>
            <strong>מטפלים נוספים:</strong> +{session.employeeIds.length - 1} מטפלים נוספים
          </Typography>
        )}
        {session.notes && (
          <Typography variant="body2" gutterBottom>
            <strong>הערות:</strong> {session.notes}
          </Typography>
        )}
        {session.parentsMeeting && (
          <Typography variant="body2" gutterBottom>
            <strong>פגישת הורים</strong>
          </Typography>
        )}

      </Box>
    );

    return (
      <Tooltip title={tooltipContent} placement="top" arrow key={session.id}>
        <Box
          sx={{
            backgroundColor: backgroundColor,
            color: textColor,
            borderRadius: '4px',
            padding: '4px',
            margin: '1px',
            fontSize: '0.75rem',
            width: session.everyTwoWeeks ? 'calc(50% - 2px)' : 'calc(100% - 2px)',
            height: `${height - 2}px`, // Exact height based on duration, subtract 2px for margins
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            position: 'absolute',
            top: `${topPosition + 1}px`, // Exact position based on start time
            left: leftPosition,
            zIndex: 10,
            '&:hover': {
              filter: 'brightness(0.8)'
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectEvent(session);
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {session.parentsMeeting && (
              <Box
                component="img"
                src={familyIcon}
                alt="פגישת הורים"
                sx={{
                  width: '16px',
                  height: '16px'
                }}
              />
            )}
            <Typography variant="caption" display="block" sx={{ fontSize: '0.7rem', lineHeight: 1.1 }}>
              {session.startTime} - {session.endTime}
            </Typography>
          </Box>
          {!session.noPatients && (
            <Typography variant="caption" display="block" sx={{ 
              fontSize: '0.65rem', 
              lineHeight: 1.1,
              color: session.patients && session.patients.length > 0 ? 'inherit' : '#d32f2f'
            }}>
              {session.patients && session.patients.length > 0 
                ? session.patients.map(p => `${p.firstName} ${p.lastName}`).join(', ')
                : 'חסר מטופל'
              }
            </Typography>
          )}
          {session.notes && session.notes.trim() && (
            <Typography variant="caption" display="block" sx={{ 
              fontSize: '0.6rem', 
              lineHeight: 1.1,
              fontStyle: 'italic',
              opacity: 0.8
            }}>
              הערות: {session.notes}
            </Typography>
          )}

        </Box>
      </Tooltip>
    );
  };

  // Helper function to render day content
  const renderDayContent = (day: WeekDay) => {
    const dayEmployees = getEmployeesForDay(day);
    const daySessions = getSessionsForDay(day);
    
    if (dayEmployees.length === 0) {
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '200px',
          color: 'text.secondary'
        }}>
          <Typography variant="h6">
            אין מטפלים פעילים ביום {DAY_LABELS[day]}
          </Typography>
        </Box>
      );
    }

    return (
      <Paper sx={{ 
        width: '100%',
        minHeight: '500px'
      }}>
        {/* Employees Grid */}
        <Box sx={{ display: 'flex' }}>
          {/* Time Column */}
          <Box sx={{ width: '60px', borderRight: '1px solid #e0e0e0' }}>
            <Box sx={{ height: '40px', borderBottom: '1px solid #e0e0e0', p: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                שעה
              </Typography>
            </Box>
            <Box>
              {timeSlots.map((time, index) => {
                const isHourMark = time.endsWith(':00');
                return (
                  <Box
                    key={time}
                    sx={{
                      height: '20px',
                      borderBottom: '1px solid #f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isHourMark ? '#f5f5f5' : 'transparent',
                      fontWeight: isHourMark ? 'bold' : 'normal'
                    }}
                  >
                    <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
                      {isHourMark ? time : ''}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Activities Column */}
          <Box sx={{ flex: 1, borderRight: '1px solid #e0e0e0' }}>
            <Box sx={{ 
              height: '40px', 
              borderBottom: '1px solid #e0e0e0', 
              p: 0.5,
              textAlign: 'center',
              backgroundColor: 'grey.100'
            }}>
              <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                פעילויות
              </Typography>
            </Box>
            <Box>
              {timeSlots.map((time, index) => {
                const reservedSlot = getReservedSlot(time, day);
                return (
                  <Box
                    key={time}
                    sx={{
                      height: '20px',
                      borderBottom: '1px solid #f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: reservedSlot ? reservedSlot.color : 'transparent',
                      fontSize: '0.65rem',
                      color: reservedSlot ? getContrastingTextColor(reservedSlot.color) : 'text.secondary'
                    }}
                  >
                    {reservedSlot && (
                      <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
                        {reservedSlot.name}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Employee Columns */}
          {dayEmployees.map(employee => (
            <Box key={employee.id} sx={{ flex: 1, borderRight: '1px solid #e0e0e0' }}>
              {/* Employee Header */}
              <Box sx={{ 
                height: '40px', 
                borderBottom: '1px solid #e0e0e0', 
                p: 0.5,
                textAlign: 'center',
                backgroundColor: 'grey.100'
              }}>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                  {employee.firstName} {employee.lastName}
                </Typography>
              </Box>
              
              {/* Employee Time Grid - relative positioning container */}
              <Box sx={{ position: 'relative', height: `${timeSlots.length * 20}px` }}>
                {timeSlots.map((time, index) => {
                  const isWithinWorkingHours = isTimeWithinWorkingHours(employee, time, day);
                  const isWithinReservedHours = isTimeWithinReservedHours(employee, time, day);
                  const reservedHourDetails = getReservedHourForTime(employee, time, day);
                  
                  return (
                    <Box
                      key={time}
                      sx={{
                        height: '20px',
                        borderBottom: '1px solid #f0f0f0',
                        backgroundColor: isWithinReservedHours 
                          ? '#e0e0e0' 
                          : isWithinWorkingHours 
                            ? 'white' 
                            : '#f5f5f5',
                        cursor: isWithinWorkingHours ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        '&:hover': isWithinWorkingHours ? {
                          backgroundColor: '#e3f2fd'
                        } : {},
                        position: 'relative'
                      }}
                      onClick={() => {
                        if (isWithinWorkingHours) {
                          handleSlotClick(day, time, employee.id);
                        }
                      }}
                    >
                      {reservedHourDetails && (
                        <Typography variant="caption" sx={{ fontSize: '0.55rem', color: '#424242' }}>
                          {reservedHourDetails.notes}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
                
                {/* Render all sessions for this employee on this day with absolute positioning */}
                {daySessions
                  .filter(s => s.employeeIds.includes(employee.id))
                  .map(session => renderSessionInSlot(session, day, employee.id))
                }
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Day Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={selectedDay}
          onChange={(event, newValue) => setSelectedDay(newValue)}
          aria-label="day tabs"
          variant="fullWidth"
        >
          {WEEK_DAYS.map(day => (
            <Tab
              key={day}
              label={DAY_LABELS[day]}
              value={day}
              sx={{
                fontWeight: selectedDay === day ? 'bold' : 'normal'
              }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Selected Day Content */}
      {renderDayContent(selectedDay)}
    </Box>
  );
};

export default EmployeeBigCalendarView;
