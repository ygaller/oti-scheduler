import React from 'react';
import { 
  Box, 
  Typography, 
  Tooltip,
  Paper
} from '@mui/material';
import { 
  Employee, 
  Room, 
  Schedule, 
  Session, 
  getRoleName,
  Activity
} from '../types';
import { WeekDay, WEEK_DAYS, DAY_LABELS } from '../types/schedule';
import { getContrastingTextColor } from '../utils/colorUtils';

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

  // Helper function to convert time to minutes
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Get activity time for a specific day
  const getActivityTimeForDay = (activity: Activity, day: WeekDay) => {
    if (activity.dayOverrides && activity.dayOverrides[day]) {
      return activity.dayOverrides[day];
    }
    if (activity.defaultStartTime && activity.defaultEndTime) {
      return {
        startTime: activity.defaultStartTime,
        endTime: activity.defaultEndTime
      };
    }
    return null;
  };

  // Check if time is within activity range
  const isTimeInRange = (time: string, startTime: string, endTime: string) => {
    const timeMinutes = timeToMinutes(time);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
  };

  // Get reserved slot info for activities
  const getReservedSlot = (time: string, day: WeekDay) => {
    for (const activity of activities) {
      const timeRange = getActivityTimeForDay(activity, day);
      if (timeRange && isTimeInRange(time, timeRange.startTime, timeRange.endTime)) {
        return {
          label: activity.name,
          color: activity.color,
          isBlocking: activity.isBlocking,
          isStartTime: time === timeRange.startTime
        };
      }
    }
    return null;
  };

  // Get employees who work on a specific day
  const getEmployeesForDay = (day: WeekDay) => {
    return employees
      .filter(employee => employee.workingHours[day])
      .sort((a, b) => 
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
      );
  };

  // Check if time is within working hours
  const isTimeWithinWorkingHours = (employee: Employee, time: string, day: WeekDay): boolean => {
    const workingHours = employee.workingHours[day];
    if (!workingHours) return false;

    const startMinutes = timeToMinutes(workingHours.startTime);
    const endMinutes = timeToMinutes(workingHours.endTime);
    const currentTimeMinutes = timeToMinutes(time);

    return currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes;
  };

  // Check if time is within reserved hours
  const isTimeWithinReservedHours = (employee: Employee, time: string, day: WeekDay): boolean => {
    if (!employee.reservedHours || employee.reservedHours.length === 0) return false;

    const currentTimeMinutes = timeToMinutes(time);

    return employee.reservedHours.some(reservedHour => {
      if (reservedHour.day !== day) return false;

      const startMinutes = timeToMinutes(reservedHour.startTime);
      const endMinutes = timeToMinutes(reservedHour.endTime);

      return currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes;
    });
  };

  // Get reserved hour details for a specific time
  const getReservedHourForTime = (employee: Employee, time: string, day: WeekDay) => {
    if (!employee.reservedHours || employee.reservedHours.length === 0) return null;

    const currentTimeMinutes = timeToMinutes(time);

    return employee.reservedHours.find(reservedHour => {
      if (reservedHour.day !== day) return false;

      const startMinutes = timeToMinutes(reservedHour.startTime);
      const endMinutes = timeToMinutes(reservedHour.endTime);

      return currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes;
    }) || null;
  };

  // Handle slot click
  const handleSlotClick = (day: WeekDay, time: string, employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee || !isTimeWithinWorkingHours(employee, time, day)) return;

    // Create a date for the correct day of the week
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Map our WeekDay type to JavaScript's day numbers
    const dayMap: Record<WeekDay, number> = {
      'sunday': 0,
      'monday': 1, 
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
    };
    
    const targetDayOfWeek = dayMap[day];
    const dayDifference = targetDayOfWeek - currentDayOfWeek;
    
    // Create the date for the clicked day
    const [hours, minutes] = time.split(':').map(Number);
    const start = new Date(today);
    start.setDate(today.getDate() + dayDifference);
    start.setHours(hours, minutes, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 15); // Placeholder end time for interface

    onSelectSlot({
      start,
      end,
      resourceId: employeeId
    });
  };

  // Render session with exact positioning
  const renderSessionInSlot = (session: Session, day: WeekDay, employeeId: string) => {
    const topPosition = getPixelPositionFromTime(session.startTime);
    const height = getPixelHeightFromDuration(session.startTime, session.endTime);
    
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
        {session.patients && session.patients.length > 0 ? (
          <Typography variant="body2" gutterBottom>
            <strong>מטופלים:</strong> {session.patients.map(p => `${p.firstName} ${p.lastName}`).join(', ')}
          </Typography>
        ) : (
          <Typography variant="body2" color="error" gutterBottom>
            <strong>מטופלים:</strong> חסר מטופל
          </Typography>
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
            width: session.everyTwoWeeks ? '50%' : 'calc(100% - 2px)',
            height: `${height - 2}px`, // Exact height based on duration, subtract 2px for margins
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            position: 'absolute',
            top: `${topPosition + 1}px`, // Exact position based on start time
            left: '1px',
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
          <Typography variant="caption" display="block" sx={{ fontSize: '0.7rem', lineHeight: 1.1 }}>
            {session.startTime} - {session.endTime}
          </Typography>
          <Typography variant="caption" display="block" sx={{ fontSize: '0.65rem', lineHeight: 1.1 }}>
            {room?.name || 'לא ידוע'}
          </Typography>

        </Box>
      </Tooltip>
    );
  };

  return (
    <Box sx={{ 
      width: '100%', 
      overflowX: 'auto',
      display: 'flex',
      gap: 2,
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
    }}>
      {WEEK_DAYS.map(day => {
        const dayEmployees = getEmployeesForDay(day);
        const daySessions = getSessionsForDay(day);
        
        if (dayEmployees.length === 0) return null;

        return (
          <Paper key={day} sx={{ 
            minWidth: '600px',
            flexShrink: 0
          }}>
            {/* Day Header */}
            <Box sx={{ 
              backgroundColor: 'primary.main', 
              color: 'white', 
              p: 1, 
              textAlign: 'center',
              fontWeight: 'bold'
            }}>
              <Typography variant="h6" fontWeight="bold" sx={{ color: 'white' }}>
                {DAY_LABELS[day]}
              </Typography>
            </Box>

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
                          backgroundColor: reservedSlot ? reservedSlot.color + '30' : 'grey.50',
                          textAlign: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: reservedSlot ? 'text.primary' : 'text.secondary',
                          fontWeight: reservedSlot ? 'bold' : 'normal',
                          direction: 'rtl' // Reset direction for content
                        }}
                      >
                        <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
                          {reservedSlot?.isStartTime ? reservedSlot.label : ''}
                        </Typography>
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
                    textAlign: 'center'
                  }}>
                    <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                      {employee.firstName} {employee.lastName}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary', display: 'block' }}>
                      {getRoleName(employee.role, employee.roleId)}
                    </Typography>
                  </Box>

                  {/* Time Slots */}
                  <Box sx={{ position: 'relative' }}>
                    {timeSlots.map(time => {
                      const isWorkingHour = isTimeWithinWorkingHours(employee, time, day);
                      const isReservedHour = isTimeWithinReservedHours(employee, time, day);
                      const reservedHourDetails = getReservedHourForTime(employee, time, day);

                      // Determine background color: reserved hours are greyed out like non-working hours but still clickable
                      const backgroundColor = !isWorkingHour ? '#e0e0e0' : (isReservedHour ? '#e0e0e0' : 'transparent');
                      const cursor = isWorkingHour ? 'pointer' : 'not-allowed'; // Working hours are always clickable, even if reserved
                      const hoverColor = isWorkingHour ? '#f0f0f0' : '#e0e0e0';

                      return (
                        <Box
                          key={time}
                          sx={{
                            height: '20px',
                            borderBottom: '1px solid #f0f0f0',
                            backgroundColor,
                            cursor,
                            position: 'relative',
                            '&:hover': {
                              backgroundColor: hoverColor,
                            }
                          }}
                          onClick={() => isWorkingHour && handleSlotClick(day, time, employee.id)}
                        >
                          {/* Show reserved hour notes */}
                          {reservedHourDetails && reservedHourDetails.notes && time === reservedHourDetails.startTime && (
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontSize: '0.6rem', 
                                color: 'text.secondary',
                                textAlign: 'center',
                                lineHeight: 1.2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                px: 0.5
                              }}
                            >
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
      })}
    </Box>
  );
};

export default EmployeeBigCalendarView;

