import React from 'react';
import { 
  Box, 
  Typography, 
  Tooltip,
  Chip,
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

  // Generate time slots
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

  // Render session in slot
  const renderSessionInSlot = (session: Session, day: WeekDay, roomId: string) => {
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
        {session.everyTwoWeeks && (
          <Box sx={{ mt: 1 }}>
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
    );

    return (
      <Tooltip title={tooltipContent} placement="top" arrow key={session.id}>
        <Box
          sx={{
            backgroundColor: session.everyTwoWeeks ? 'transparent' : backgroundColor,
            color: textColor,
            border: session.everyTwoWeeks ? `2px solid ${backgroundColor}` : 'none',
            borderRadius: '4px',
            padding: '4px',
            margin: '1px',
            fontSize: '0.75rem',
            width: session.everyTwoWeeks ? '50%' : '100%',
            minHeight: '30px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            '&:hover': {
              filter: session.everyTwoWeeks ? 'none' : 'brightness(0.8)'
            }
          }}
          onClick={() => onSelectEvent(session)}
        >
          <Typography variant="caption" display="block" sx={{ fontSize: '0.7rem', lineHeight: 1.1 }}>
            {session.startTime} - {session.endTime}
          </Typography>
          {primaryEmployee && (
            <Typography variant="caption" display="block" sx={{ fontSize: '0.65rem', lineHeight: 1.1 }}>
              {primaryEmployee.firstName} {primaryEmployee.lastName}
            </Typography>
          )}
          {session.everyTwoWeeks && (
            <Chip
              label="אחת לשבועיים"
              size="small"
              sx={{
                fontSize: '0.5rem',
                height: '12px',
                backgroundColor: '#1976d2',
                color: 'white',
                '& .MuiChip-label': { color: 'white', fontSize: '0.5rem', px: 0.5 },
                mt: 0.25
              }}
            />
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
            minWidth: '400px',
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
              <Box sx={{ width: '120px', borderRight: '1px solid #e0e0e0' }}>
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
                  <Box>
                    {timeSlots.map(time => {
                      const sessionsAtTime = daySessions.filter(s => 
                        s.roomId === room.id &&
                        s.startTime <= time && s.endTime > time
                      );

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
                        >
                          {/* Render sessions */}
                          {sessionsAtTime.map(session => {
                            // Only render session at its start time
                            if (session.startTime === time) {
                              return renderSessionInSlot(session, day, room.id);
                            }
                            return null;
                          })}
                        </Box>
                      );
                    })}
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
