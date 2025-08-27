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

  // Helper function to convert time string to minutes
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
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

  // Get active rooms (rooms that have sessions or working hours)
  const getActiveRooms = () => {
    return rooms.filter(room => room.isActive !== false);
  };

  // Handle slot click
  const handleSlotClick = (day: WeekDay, time: string, roomId: string) => {
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
      resourceId: roomId
    });
  };

  const renderSessionInSlot = (session: Session, day: WeekDay, roomId: string) => {
    const topPosition = getPixelPositionFromTime(session.startTime);
    const height = getPixelHeightFromDuration(session.startTime, session.endTime);
    
    const room = rooms.find(r => r.id === roomId);
    const primaryEmployee = employees.find(e => session.employeeIds.includes(e.id));
    const backgroundColor = primaryEmployee?.color || '#845ec2';
    const textColor = getContrastingTextColor(backgroundColor);
    
    const leftPosition = session.everyTwoWeeks ? (session.startTime.localeCompare('12:00') < 0 ? '1px' : '50%') : '1px';

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
              <strong>מטופלים:</strong> <span style={{ color: '#d32f2f' }}>חסר מטופל</span>
            </Typography>
          )
        )}
        {session.employeeIds && session.employeeIds.length > 0 && (
          <Typography variant="body2" gutterBottom>
            <strong>מטפלים:</strong> {session.employeeIds.map(id => {
              const emp = employees.find(e => e.id === id);
              return emp ? `${emp.firstName} ${emp.lastName}` : 'לא ידוע';
            }).join(', ')}
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
    const daySessions = getSessionsForDay(day);
    const activeRooms = getActiveRooms();
    
    if (activeRooms.length === 0) {
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '200px',
          color: 'text.secondary'
        }}>
          <Typography variant="h6">
            אין חדרים פעילים ביום {DAY_LABELS[day]}
          </Typography>
        </Box>
      );
    }

    return (
      <Paper sx={{ 
        width: '100%',
        minHeight: '500px'
      }}>
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

          {/* Room Columns */}
          {activeRooms.map(room => (
            <Box key={room.id} sx={{ flex: 1, borderRight: '1px solid #e0e0e0' }}>
              {/* Room Header */}
              <Box sx={{ 
                height: '40px', 
                borderBottom: '1px solid #e0e0e0', 
                p: 0.5,
                textAlign: 'center',
                backgroundColor: room.color || 'grey.100',
                color: room.color ? getContrastingTextColor(room.color) : 'inherit'
              }}>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                  {room.name}
                </Typography>
              </Box>
              
              {/* Room Time Grid - relative positioning container */}
              <Box sx={{ position: 'relative', height: `${timeSlots.length * 20}px` }}>
                {timeSlots.map((time, index) => {
                  return (
                    <Box
                      key={time}
                      sx={{
                        height: '20px',
                        borderBottom: '1px solid #f0f0f0',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        '&:hover': {
                          backgroundColor: '#e3f2fd'
                        },
                        position: 'relative'
                      }}
                      onClick={() => {
                        handleSlotClick(day, time, room.id);
                      }}
                    >
                    </Box>
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

export default RoomBigCalendarView;
