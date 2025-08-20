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

  // Skip blocking activity validation - sessions are allowed to overlap with activities

  return { valid: true };
}

// Repository-based validation function
export async function validateScheduleConstraintsAsync(
  session: any,
  employeeRepo: any,
  sessionRepo: any,
  scheduleId: string
): Promise<{ isValid: boolean; error?: string }> {
  if (!session.employeeIds || session.employeeIds.length === 0) {
    return { isValid: false, error: 'לפחות עובד אחד חייב להיות משויך לטיפול' };
  }

  // For now, just check basic constraints
  // TODO: Implement full constraint checking using repositories
  return { isValid: true };
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
  session: any,
  sessionRepo: any,
  scheduleId: string
): Promise<{ isValid: boolean; error?: string; conflictingSession?: any }> {
  try {
    // For now, simple implementation - get all sessions in the schedule and check conflicts
    const existingSessions = await sessionRepo.findByScheduleId(scheduleId);
    
    // Check for time conflicts with existing sessions for this patient
    for (const existingSession of existingSessions) {
      // Skip if it's the same session (for updates)
      if (existingSession.id === session.id) continue;
      
      // Check if patient is assigned to this session and if there's a time conflict
      const hasPatient = existingSession.patients?.some((p: any) => p.id === patientId);
      if (hasPatient && 
          existingSession.day === session.day &&
          timesOverlap(existingSession.startTime, existingSession.endTime, session.startTime, session.endTime)) {
        return {
          isValid: false,
          error: `המטופל כבר משויך לטיפול אחר באותו זמן: ${existingSession.startTime}-${existingSession.endTime}`,
          conflictingSession: existingSession
        };
      }
    }

    return { isValid: true };
    
  } catch (error) {
    console.error('Error in validatePatientTimeConflict:', error);
    throw error;
  }
}

// Validation function for consecutive sessions without a break
export async function validatePatientConsecutiveSessions(
  patientId: string,
  session: any,
  sessionRepo: any,
  scheduleId: string
): Promise<{ isValid: boolean; error?: string; consecutiveCount?: number }> {
  try {
    // For now, simple implementation - just return valid
    // TODO: Implement consecutive sessions validation using repositories
    return { isValid: true, consecutiveCount: 1 };
    
  } catch (error) {
    console.error('Error in validatePatientConsecutiveSessions:', error);
    throw error;
  }
}