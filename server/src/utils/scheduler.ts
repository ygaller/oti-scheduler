import { Employee, Room, Session, WeekDay, Activity } from '../types';
import { mapAPIWeekDayToPrisma } from '../mappers';

export const WEEK_DAYS: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];

// Helper function to get the effective time range for an activity on a specific day
function getActivityTimeForDay(activity: Activity, day: WeekDay): { startTime: string; endTime: string } | null {
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
}

// Helper function to convert time string to minutes for comparison
function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Main validation function that uses Activity[]
export function validateScheduleConstraints(
  session: Session & { forceCreate?: boolean },
  allSessions: Session[],
  employees: Employee[],
  rooms: Room[],
  activities: Activity[]
): { valid: boolean; error?: string } {
  if (!session.employeeIds || session.employeeIds.length === 0) {
    return { valid: false, error: 'לפחות עובד אחד חייב להיות משויך לטיפול' };
  }

  const room = rooms.find(r => r.id === session.roomId);
  if (!room) return { valid: false, error: 'חדר לא נמצא' };

  // Validate each assigned employee
  for (const employeeId of session.employeeIds) {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return { valid: false, error: `עובד לא נמצא: ${employeeId}` };

    // Check working hours for this employee
    const workingHours = employee.workingHours[session.day];
    if (!workingHours) {
      return { valid: false, error: `העובד ${employee.firstName} ${employee.lastName} לא עובד ביום זה` };
    }

    if (session.startTime < workingHours.startTime || session.endTime > workingHours.endTime) {
      return { valid: false, error: `הטיפול מחוץ לשעות העבודה של העובד ${employee.firstName} ${employee.lastName}` };
    }

    // Check employee conflicts for this specific employee
    const employeeConflicts = allSessions.filter(s =>
      s.id !== session.id &&
      s.employeeIds && s.employeeIds.includes(employeeId) &&
      s.day === session.day &&
      timesOverlap(s.startTime, s.endTime, session.startTime, session.endTime)
    );

    if (employeeConflicts.length > 0) {
      return { valid: false, error: `העובד ${employee.firstName} ${employee.lastName} תפוס בזמן זה` };
    }
  }

  // Check room conflicts
  const roomConflicts = allSessions.filter(s =>
    s.id !== session.id &&
    s.roomId === session.roomId &&
    s.day === session.day &&
    timesOverlap(s.startTime, s.endTime, session.startTime, session.endTime)
  );

  if (roomConflicts.length > 0) {
    return { valid: false, error: 'החדר תפוס בזמן זה' };
  }

  // Check activities/blocked periods
  for (const activity of activities) {
    if (!activity.isBlocking) continue;

    const activityTime = getActivityTimeForDay(activity, session.day);
    if (!activityTime) continue;

    if (timesOverlap(activityTime.startTime, activityTime.endTime, session.startTime, session.endTime)) {
      // If forceCreate is true, do NOT return an error for blocking activities
      if (!session.forceCreate) {
        return { valid: false, error: `לא ניתן לתזמן טיפול בזמן חסום` };
      }
    }
  }

  return { valid: true };
}

// Export timesOverlap function for reuse
export function timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const start1Min = timeStringToMinutes(start1);
  const end1Min = timeStringToMinutes(end1);
  const start2Min = timeStringToMinutes(start2);
  const end2Min = timeStringToMinutes(end2);

  return start1Min < end2Min && start2Min < end1Min;
}

// Validation function for patient time conflicts
export async function validatePatientTimeConflict(
  patientId: string,
  sessionId: string,
  day: string,
  startTime: string,
  endTime: string,
  prisma: any // PrismaClient type
): Promise<{ valid: boolean; error?: string; conflictingSession?: any }> {
  try {
    // Validate input parameters
    if (!patientId || !sessionId || !day || !startTime || !endTime) {
      throw new Error('Missing required parameters for patient time conflict validation');
    }
    
    // Find all sessions where this patient is already assigned on the same day
    const existingSessions = await prisma.session.findMany({
      where: {
        day: mapAPIWeekDayToPrisma(day as WeekDay), // Convert API day to Prisma enum
        sessionPatients: {
          some: {
            patientId: patientId
          }
        },
        id: {
          not: sessionId // Exclude the current session being updated
        }
      },
      include: {
        room: true,
        sessionEmployees: {
          include: {
            employee: true
          }
        }
      }
    });

    // Check for time conflicts
    for (const existingSession of existingSessions) {
      if (timesOverlap(existingSession.startTime, existingSession.endTime, startTime, endTime)) {
        const employeeNames = existingSession.sessionEmployees
          .map((se: any) => `${se.employee.firstName} ${se.employee.lastName}`)
          .join(', ');
        
        return {
          valid: false,
          error: `המטופל כבר משויך לטיפול אחר באותו זמן: ${existingSession.startTime}-${existingSession.endTime} עם ${employeeNames} בחדר ${existingSession.room.name}`,
          conflictingSession: existingSession
        };
      }
    }

    return { valid: true };
    
  } catch (error) {
    console.error('Error in validatePatientTimeConflict:', error);
    throw error; // Re-throw to be handled by the calling function
  }
}

// Validation function for consecutive sessions without a break
export async function validatePatientConsecutiveSessions(
  patientId: string,
  sessionId: string,
  day: string,
  startTime: string,
  endTime: string,
  prisma: any // PrismaClient type
): Promise<{ valid: boolean; warning?: string; consecutiveCount?: number }> {
  try {
    // Validate input parameters
    if (!patientId || !sessionId || !day || !startTime || !endTime) {
      throw new Error('Missing required parameters for patient consecutive sessions validation');
    }
    
    // Find all sessions where this patient is already assigned on the same day
    const existingSessions = await prisma.session.findMany({
      where: {
        day: mapAPIWeekDayToPrisma(day as WeekDay), // Convert API day to Prisma enum
        sessionPatients: {
          some: {
            patientId: patientId
          }
        },
        id: {
          not: sessionId // Exclude the current session being updated
        }
      },
      include: {
        room: true,
        sessionEmployees: {
          include: {
            employee: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // Add the new session to the list for consecutive analysis
    const newSession = {
      id: sessionId,
      startTime,
      endTime,
      day: mapAPIWeekDayToPrisma(day as WeekDay)
    };

    // Create a combined list of sessions including the new one, sorted by start time
    const allSessions = [...existingSessions, newSession].sort((a, b) => 
      timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime)
    );

    // Find the position of the new session in the sorted list
    const newSessionIndex = allSessions.findIndex(s => s.id === sessionId);
    
    // Count consecutive sessions
    let consecutiveCount = 1; // Start with the new session itself
    let currentIndex = newSessionIndex;

    // Check sessions before the new session
    while (currentIndex > 0) {
      const currentSession = allSessions[currentIndex];
      const previousSession = allSessions[currentIndex - 1];
      
      const timeDiff = timeStringToMinutes(currentSession.startTime) - timeStringToMinutes(previousSession.endTime);
      
      // If the gap between sessions is less than 15 minutes, consider them consecutive
      if (timeDiff < 15) {
        consecutiveCount++;
        currentIndex--;
      } else {
        break; // Found a break, stop counting backwards
      }
    }

    // Reset currentIndex and check sessions after the new session
    currentIndex = newSessionIndex;
    while (currentIndex < allSessions.length - 1) {
      const currentSession = allSessions[currentIndex];
      const nextSession = allSessions[currentIndex + 1];
      
      const timeDiff = timeStringToMinutes(nextSession.startTime) - timeStringToMinutes(currentSession.endTime);
      
      // If the gap between sessions is less than 15 minutes, consider them consecutive
      if (timeDiff < 15) {
        consecutiveCount++;
        currentIndex++;
      } else {
        break; // Found a break, stop counting forwards
      }
    }

    // If more than 2 consecutive sessions, return a warning
    if (consecutiveCount > 2) {
      return {
        valid: false,
        warning: `המטופל יהיה עם ${consecutiveCount} טיפולים רצופים ללא הפסקה. האם אתה בטוח שברצונך להמשיך?`,
        consecutiveCount
      };
    }

    return { valid: true, consecutiveCount };
    
  } catch (error) {
    console.error('Error in validatePatientConsecutiveSessions:', error);
    throw error; // Re-throw to be handled by the calling function
  }
}