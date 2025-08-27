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
  Activity
} from '../types';
import { WeekDay, WEEK_DAYS, DAY_LABELS } from '../types/schedule';
import { getContrastingTextColor } from '../utils/colorUtils';

interface RoomBigCalendarViewProps {
  employees: Employee[];
  rooms: Room[];
  schedule: Schedule | null;
  activities: Activity[];
  onSelectSlot: (slotInfo: { start: Date; end: Date; resourceId?: string }) => void;
  onSelectEvent: (session: Session) => void;
}

const RoomBigCalendarView: React.FC<RoomBigCalendarViewProps> = ({
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

  // Get active rooms (similar to employees for day filtering)
  const getActiveRooms = () => {
    return rooms
      .filter(room => room.isActive)
      .sort((a, b) => a.name.localeCompare(b.name, 'he'));
  };

  // Handle slot click
  const handleSlotClick = (day: WeekDay, time: string, roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

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
      resourceId: roomId
    });
  };

  // Helper function to check if two time ranges overlap
  const timesOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
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

  // Helper function to calculate left position for overlapping every-two-weeks sessions
  const calculateSessionLeftPosition = (session: Session, roomSessions: Session[]) => {
    if (!session.everyTwoWeeks) return '1px';
    
    // Find other every-two-weeks sessions that overlap with this session
    const overlappingSessions = roomSessions.filter(s => 
      s.id !== session.id &&
      s.everyTwoWeeks &&
      timesOverlap(session.startTime, session.endTime, s.startTime, s.endTime)
    );
    
    if (overlappingSessions.length === 0) return '1px';
    
    // Sort overlapping sessions by ID to ensure consistent positioning
    const allOverlappingSessions = [session, ...overlappingSessions].sort((a, b) => a.id.localeCompare(b.id));
    const sessionIndex = allOverlappingSessions.findIndex(s => s.id === session.id);
    
    // Position sessions side by side (each takes 50% width)
    return sessionIndex === 0 ? '1px' : '50%';
  };

  // Render session with exact positioning
  const renderSessionInSlot = (session: Session, day: WeekDay, roomId: string) => {
    const topPosition = getPixelPositionFromTime(session.startTime);
    const height = getPixelHeightFromDuration(session.startTime, session.endTime);
    
    // Get all sessions for this room to calculate positioning
    const roomSessions = getSessionsForDay(day).filter(s => s.roomId === roomId);
    const leftPosition = calculateSessionLeftPosition(session, roomSessions);
    
    const room = rooms.find(r => r.id === session.roomId);
    const backgroundColor = room?.color || '#845ec2';
    const textColor = getContrastingTextColor(backgroundColor);

    // Get primary employee for display
    const primaryEmployee = employees.find(e => session.employeeIds.includes(e.id));

    const tooltipContent = (
      <Box>
        <Typography variant="body2" gutterBottom>
          <strong>זמן:</strong> {session.startTime} - {session.endTime}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <strong>חדר:</strong> {room?.name || 'לא ידוע'}
        </Typography>
        {primaryEmployee && (
          <Typography variant="body2" gutterBottom>
            <strong>מטפל ראשי:</strong> {primaryEmployee.firstName} {primaryEmployee.lastName}
          </Typography>
        )}
        {session.employeeIds && session.employeeIds.length > 1 && (
          <Typography variant="body2" gutterBottom>
            <strong>מטפלים נוספים:</strong> +{session.employeeIds.length - 1} מטפלים נוספים
          </Typography>
        )}
        {session.patients && session.patients.length > 0 ? (
          <Typography variant="body2" gutterBottom>
            <strong>מטופלים:</strong> {session.patients.map(p => `${p.firstName} ${p.lastName}`).join(', ')}
          </Typography>
        ) : (
          <Typography variant="body2" color="error" gutterBottom>
            <strong>מטופלים:</strong> חסר מטופל
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
          <Typography variant="caption" display="block" sx={{ fontSize: '0.7rem', lineHeight: 1.1 }}>
            {session.startTime} - {session.endTime}
          </Typography>
          {primaryEmployee && (
            <Typography variant="caption" display="block" sx={{ fontSize: '0.65rem', lineHeight: 1.1 }}>
              {primaryEmployee.firstName} {primaryEmployee.lastName}
            </Typography>
          )}

        </Box>
      </Tooltip>
    );
  };

  const activeRooms = getActiveRooms();

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
        const daySessions = getSessionsForDay(day);
        
        if (activeRooms.length === 0) return null;

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

            {/* Rooms Grid */}
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

              {/* Room Columns */}
              {activeRooms.map(room => (
                <Box key={room.id} sx={{ flex: 1, borderRight: '1px solid #e0e0e0' }}>
                  {/* Room Header */}
                  <Box sx={{ 
                    height: '40px', 
                    borderBottom: '1px solid #e0e0e0', 
                    p: 0.5,
                    textAlign: 'center'
                  }}>
                    <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                      {room.name}
                    </Typography>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        backgroundColor: room.color,
                        borderRadius: '50%',
                        border: 1,
                        borderColor: 'grey.300',
                        mx: 'auto',
                        mt: 0.5
                      }}
                    />
                  </Box>

                  {/* Time Slots */}
                  <Box sx={{ position: 'relative' }}>
                    {timeSlots.map(time => {
                      const backgroundColor = 'transparent';
                      const cursor = 'pointer';
                      const hoverColor = '#f0f0f0';

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
                          onClick={() => handleSlotClick(day, time, room.id)}
                        />
                      );
                    })}
                    
                    {/* Render all sessions for this room on this day with absolute positioning */}
                    {daySessions
                      .filter(s => s.roomId === room.id)
                      .map(session => renderSessionInSlot(session, day, room.id))
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

export default RoomBigCalendarView;

