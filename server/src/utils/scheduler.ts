import { Employee, Room, Session, WeekDay, Activity } from '../types';
import { mapAPIWeekDayToPrisma } from '../mappers';
import { getSessionFractionalCount } from './sessionCounting';

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

  // Check for blocking activities
  for (const activity of activities) {
    if (!activity.isBlocking) continue; // Skip non-blocking activities

    const activityTime = getActivityTimeForDay(activity, session.day);
    if (!activityTime) continue; // No activity on this day

    // Check if session overlaps with blocking activity
    if (timesOverlap(session.startTime, session.endTime, activityTime.startTime, activityTime.endTime)) {
      return { valid: false, error: 'לא ניתן לתזמן טיפול בזמן חסום' };
    }
  }

  return { valid: true };
}

// Repository-based validation function (legacy - using boolean overlap checking)
export async function validateScheduleConstraintsAsync(
  session: any,
  employeeRepo: any,
  sessionRepo: any,
  scheduleId: string
): Promise<{ isValid: boolean; error?: string }> {
  if (!session.employeeIds || session.employeeIds.length === 0) {
    return { isValid: false, error: 'לפחות עובד אחד חייב להיות משויך לטיפול' };
  }

  try {
    // Get all sessions in the schedule for conflict checking
    const allSessions = await sessionRepo.findByScheduleId(scheduleId);
    
    // Get all employees to validate working hours and conflicts
    const allEmployees = await employeeRepo.findAll();
    
    // Validate each assigned employee
    for (const employeeId of session.employeeIds) {
      const employee = allEmployees.find((e: any) => e.id === employeeId);
      if (!employee) {
        return { isValid: false, error: `עובד לא נמצא: ${employeeId}` };
      }

      // Check working hours for this employee
      const workingHours = employee.workingHours[session.day];
      if (!workingHours) {
        return { isValid: false, error: `העובד ${employee.firstName} ${employee.lastName} לא עובד ביום זה` };
      }

      if (session.startTime < workingHours.startTime || session.endTime > workingHours.endTime) {
        return { isValid: false, error: `הטיפול מחוץ לשעות העבודה של העובד ${employee.firstName} ${employee.lastName}` };
      }

      // Check employee conflicts for this specific employee
      const employeeConflicts = allSessions.filter((s: any) =>
        s.id !== session.id &&
        s.employeeIds && s.employeeIds.includes(employeeId) &&
        s.day === session.day &&
        timesOverlap(s.startTime, s.endTime, session.startTime, session.endTime)
      );

      if (employeeConflicts.length > 0) {
        return { isValid: false, error: `העובד ${employee.firstName} ${employee.lastName} תפוס בזמן זה` };
      }
    }

    // Check room conflicts
    const roomConflicts = allSessions.filter((s: any) =>
      s.id !== session.id &&
      s.roomId === session.roomId &&
      s.day === session.day &&
      timesOverlap(s.startTime, s.endTime, session.startTime, session.endTime)
    );

    if (roomConflicts.length > 0) {
      return { isValid: false, error: 'החדר תפוס בזמן זה' };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error in validateScheduleConstraintsAsync:', error);
    return { isValid: false, error: 'שגיאה בבדיקת אילוצי התזמון' };
  }
}

// Enhanced repository-based validation function using fractional counting
export async function validateScheduleConstraintsFractionalAsync(
  session: any,
  employeeRepo: any,
  sessionRepo: any,
  roomRepo: any,
  activityRepo: any,
  scheduleId: string
): Promise<{ 
  isValid: boolean; 
  error?: string; 
  conflictDetails?: {
    conflictType: 'employee' | 'room' | 'patient';
    conflictingSessions: any[];
  }
}> {
  if (!session.employeeIds || session.employeeIds.length === 0) {
    return { isValid: false, error: 'לפחות עובד אחד חייב להיות משויך לטיפול' };
  }

  try {
    // Get all sessions, employees, rooms, and activities for validation
    const [allSessions, allEmployees, allRooms, allActivities] = await Promise.all([
      sessionRepo.findByScheduleId(scheduleId),
      employeeRepo.findAll(),
      roomRepo.findAll(),
      activityRepo.findAll()
    ]);

    // Map the session data to match the Session interface
    const sessionForValidation: Session = {
      id: session.id || '',
      scheduleId: session.scheduleId,
      employeeIds: session.employeeIds,
      roomId: session.roomId,
      day: session.day,
      startTime: session.startTime,
      endTime: session.endTime,
      notes: session.notes,
      everyTwoWeeks: session.everyTwoWeeks || false,
      employees: allEmployees.filter((e: any) => session.employeeIds.includes(e.id)),
      patients: []
    };

    // Use the fractional validation function
    const result = validateScheduleConstraintsFractionalWithDetails(
      sessionForValidation,
      allSessions,
      allEmployees,
      allRooms,
      allActivities
    );

    return {
      isValid: result.valid,
      error: result.error,
      conflictDetails: result.conflictDetails
    };
  } catch (error) {
    console.error('Error in validateScheduleConstraintsFractionalAsync:', error);
    return { isValid: false, error: 'שגיאה בבדיקת אילוצי התזמון' };
  }
}

// Export timesOverlap function for reuse
export function timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const start1Min = timeStringToMinutes(start1);
  const end1Min = timeStringToMinutes(end1);
  const start2Min = timeStringToMinutes(start2);
  const end2Min = timeStringToMinutes(end2);

  return start1Min < end2Min && start2Min < end1Min;
}

// Validation function for patient time conflicts (legacy - using boolean overlap checking)
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

// Enhanced validation function for patient time conflicts using fractional counting
export async function validatePatientTimeConflictFractional(
  patientId: string,
  session: any,
  sessionRepo: any,
  patientRepo: any,
  scheduleId: string
): Promise<{ isValid: boolean; error?: string; conflictingSession?: any }> {
  try {
    // Get all sessions in the schedule and all patients for patient info
    const [existingSessions, allPatients] = await Promise.all([
      sessionRepo.findByScheduleId(scheduleId),
      patientRepo.findAll()
    ]);
    
    const patient = allPatients.find((p: any) => p.id === patientId);
    if (!patient) {
      return { isValid: false, error: `מטופל לא נמצא: ${patientId}` };
    }

    // Get sessions where this patient is assigned on the same day
    const patientSessions = existingSessions
      .filter((s: any) => s.patients && s.patients.some((p: any) => p.id === patientId) && s.day === session.day)
      .map((s: any) => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        day: s.day,
        everyTwoWeeks: s.everyTwoWeeks
      }));

    // Use fractional validation for patient conflicts
    const patientValidation = validatePatientFractionalAvailability(
      {
        id: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        day: session.day,
        everyTwoWeeks: session.everyTwoWeeks || false
      },
      patientSessions,
      patientId,
      `${patient.firstName} ${patient.lastName}`
    );

    if (!patientValidation.valid) {
      // For backward compatibility, try to find the conflicting session
      const conflictingSession = patientSessions.find(s =>
        s.id !== session.id &&
        timesOverlap(s.startTime, s.endTime, session.startTime, session.endTime)
      );

      return {
        isValid: false,
        error: patientValidation.error,
        conflictingSession
      };
    }

    return { isValid: true };
    
  } catch (error) {
    console.error('Error in validatePatientTimeConflictFractional:', error);
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

// Interface for session validation input
export interface SessionValidationInput {
  id?: string;
  startTime: string;
  endTime: string;
  day: WeekDay;
  everyTwoWeeks?: boolean;
}

/**
 * Pure function to validate room availability using fractional counting.
 * 
 * @param newSession - The new session to validate
 * @param existingSessions - All existing sessions for the room on the same day
 * @returns Object with validation result and optional error message
 */
export function validateRoomFractionalAvailability(
  newSession: SessionValidationInput,
  existingSessions: SessionValidationInput[]
): { valid: boolean; error?: string; conflictingSessions?: SessionValidationInput[] } {
  const newSessionCount = getSessionFractionalCount(newSession.everyTwoWeeks || false);
  
  // Filter sessions that overlap with the new session
  const overlappingSessions = existingSessions.filter(session =>
    session.id !== newSession.id &&
    timesOverlap(session.startTime, session.endTime, newSession.startTime, newSession.endTime)
  );
  
  // For each overlapping session, check if adding the new session would exceed capacity
  for (const overlappingSession of overlappingSessions) {
    const existingSessionCount = getSessionFractionalCount(overlappingSession.everyTwoWeeks || false);
    const totalCount = newSessionCount + existingSessionCount;
    
    if (totalCount > 1) {
      return {
        valid: false,
        error: `החדר תפוס בזמן זה - סך הטיפולים יעלה על המותר`,
        conflictingSessions: [overlappingSession]
      };
    }
  }
  
  return { valid: true };
}

/**
 * Pure function to validate employee availability using fractional counting.
 * 
 * @param newSession - The new session to validate
 * @param existingSessions - All existing sessions for the employee on the same day
 * @param employeeId - The ID of the employee to validate
 * @param employeeName - The name of the employee for error messages
 * @returns Object with validation result and optional error message
 */
export function validateEmployeeFractionalAvailability(
  newSession: SessionValidationInput,
  existingSessions: SessionValidationInput[],
  employeeId: string,
  employeeName: string
): { valid: boolean; error?: string; conflictingSessions?: SessionValidationInput[] } {
  const newSessionCount = getSessionFractionalCount(newSession.everyTwoWeeks || false);
  
  // Filter sessions that overlap with the new session and include this employee
  const overlappingSessions = existingSessions.filter(session =>
    session.id !== newSession.id &&
    timesOverlap(session.startTime, session.endTime, newSession.startTime, newSession.endTime)
  );
  
  // For each overlapping session, check if adding the new session would exceed capacity
  for (const overlappingSession of overlappingSessions) {
    const existingSessionCount = getSessionFractionalCount(overlappingSession.everyTwoWeeks || false);
    const totalCount = newSessionCount + existingSessionCount;
    
    if (totalCount > 1) {
      return {
        valid: false,
        error: `העובד ${employeeName} תפוס בזמן זה - סך הטיפולים יעלה על המותר`,
        conflictingSessions: [overlappingSession]
      };
    }
  }
  
  return { valid: true };
}

/**
 * Pure function to validate patient availability using fractional counting.
 * 
 * @param newSession - The new session to validate
 * @param existingSessions - All existing sessions for the patient on the same day
 * @param patientId - The ID of the patient to validate
 * @param patientName - The name of the patient for error messages
 * @returns Object with validation result and optional error message
 */
export function validatePatientFractionalAvailability(
  newSession: SessionValidationInput,
  existingSessions: SessionValidationInput[],
  patientId: string,
  patientName: string
): { valid: boolean; error?: string; conflictingSessions?: SessionValidationInput[] } {
  const newSessionCount = getSessionFractionalCount(newSession.everyTwoWeeks || false);
  
  // Filter sessions that overlap with the new session and include this patient
  const overlappingSessions = existingSessions.filter(session =>
    session.id !== newSession.id &&
    timesOverlap(session.startTime, session.endTime, newSession.startTime, newSession.endTime)
  );
  
  // For each overlapping session, check if adding the new session would exceed capacity
  for (const overlappingSession of overlappingSessions) {
    const existingSessionCount = getSessionFractionalCount(overlappingSession.everyTwoWeeks || false);
    const totalCount = newSessionCount + existingSessionCount;
    
    if (totalCount > 1) {
      return {
        valid: false,
        error: `המטופל ${patientName} תפוס בזמן זה - סך הטיפולים יעלה על המותר`,
        conflictingSessions: [overlappingSession]
      };
    }
  }
  
  return { valid: true };
}

/**
 * Enhanced validation function that uses fractional counting for room and employee conflicts.
 * This replaces the simple boolean overlap checking with fractional capacity validation.
 */
export function validateScheduleConstraintsFractional(
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

    // Get employee sessions for fractional validation
    const employeeSessions = allSessions
      .filter(s => s.employeeIds && s.employeeIds.includes(employeeId) && s.day === session.day)
      .map(s => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        day: s.day,
        everyTwoWeeks: s.everyTwoWeeks
      }));

    // Use fractional validation for employee conflicts
    const employeeValidation = validateEmployeeFractionalAvailability(
      {
        id: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        day: session.day,
        everyTwoWeeks: session.everyTwoWeeks
      },
      employeeSessions,
      employeeId,
      `${employee.firstName} ${employee.lastName}`
    );

    if (!employeeValidation.valid) {
      return employeeValidation;
    }
  }

  // Get room sessions for fractional validation
  const roomSessions = allSessions
    .filter(s => s.roomId === session.roomId && s.day === session.day)
    .map(s => ({
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
      day: s.day,
      everyTwoWeeks: s.everyTwoWeeks
    }));

  // Use fractional validation for room conflicts
  const roomValidation = validateRoomFractionalAvailability(
    {
      id: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      day: session.day,
      everyTwoWeeks: session.everyTwoWeeks
    },
    roomSessions
  );

  if (!roomValidation.valid) {
    return roomValidation;
  }

  // Validate each assigned patient (if any)
  if (session.patients && session.patients.length > 0) {
    for (const patient of session.patients) {
      // Get patient sessions for fractional validation
      const patientSessions = allSessions
        .filter(s => s.patients && s.patients.some(p => p.id === patient.id) && s.day === session.day)
        .map(s => ({
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          day: s.day,
          everyTwoWeeks: s.everyTwoWeeks
        }));

      // Use fractional validation for patient conflicts
      const patientValidation = validatePatientFractionalAvailability(
        {
          id: session.id,
          startTime: session.startTime,
          endTime: session.endTime,
          day: session.day,
          everyTwoWeeks: session.everyTwoWeeks
        },
        patientSessions,
        patient.id,
        `${patient.firstName} ${patient.lastName}`
      );

      if (!patientValidation.valid) {
        return patientValidation;
      }
    }
  }

  // Check for blocking activities (unchanged logic)
  for (const activity of activities) {
    if (!activity.isBlocking) continue; // Skip non-blocking activities

    const activityTime = getActivityTimeForDay(activity, session.day);
    if (!activityTime) continue; // No activity on this day

    // Check if session overlaps with blocking activity
    if (timesOverlap(session.startTime, session.endTime, activityTime.startTime, activityTime.endTime)) {
      return { valid: false, error: 'לא ניתן לתזמן טיפול בזמן חסום' };
    }
  }

  return { valid: true };
}

/**
 * Enhanced validation function that returns detailed conflict information.
 * This version includes information about conflicting sessions for better error messages.
 */
export function validateScheduleConstraintsFractionalWithDetails(
  session: Session & { forceCreate?: boolean },
  allSessions: Session[],
  employees: Employee[],
  rooms: Room[],
  activities: Activity[]
): { 
  valid: boolean; 
  error?: string; 
  conflictDetails?: {
    conflictType: 'employee' | 'room' | 'patient';
    conflictingSessions: any[];
  }
} {
  if (!session.employeeIds || session.employeeIds.length === 0) {
    return { valid: false, error: 'לפחות עובד אחד חייב להיות משויך לטיפול' };
  }

  const room = rooms.find(r => r.id === session.roomId);
  if (!room) return { valid: false, error: 'חדר לא נמצא' };

  // Validate each assigned employee with detailed conflict information
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

    // Get employee sessions for fractional validation
    const employeeSessions = allSessions
      .filter(s => s.employeeIds && s.employeeIds.includes(employeeId) && s.day === session.day)
      .map(s => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        day: s.day,
        everyTwoWeeks: s.everyTwoWeeks,
        employeeIds: s.employeeIds,
        roomId: s.roomId,
        employees: s.employees,
        patients: s.patients
      }));

    // Use fractional validation for employee conflicts
    const employeeValidation = validateEmployeeFractionalAvailability(
      {
        id: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        day: session.day,
        everyTwoWeeks: session.everyTwoWeeks
      },
      employeeSessions,
      employeeId,
      `${employee.firstName} ${employee.lastName}`
    );

    if (!employeeValidation.valid) {
      return {
        valid: false,
        error: employeeValidation.error,
        conflictDetails: {
          conflictType: 'employee',
          conflictingSessions: employeeValidation.conflictingSessions || []
        }
      };
    }
  }

  // Check room conflicts with detailed information
  const roomSessions = allSessions
    .filter(s => s.roomId === session.roomId && s.day === session.day)
    .map(s => ({
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
      day: s.day,
      everyTwoWeeks: s.everyTwoWeeks,
      employeeIds: s.employeeIds,
      roomId: s.roomId,
      employees: s.employees,
      patients: s.patients
    }));

  // Use fractional validation for room conflicts
  const roomValidation = validateRoomFractionalAvailability(
    {
      id: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      day: session.day,
      everyTwoWeeks: session.everyTwoWeeks
    },
    roomSessions
  );

  if (!roomValidation.valid) {
    return {
      valid: false,
      error: roomValidation.error,
      conflictDetails: {
        conflictType: 'room',
        conflictingSessions: roomValidation.conflictingSessions || []
      }
    };
  }

  // Validate each assigned patient (if any) with detailed conflict information
  if (session.patients && session.patients.length > 0) {
    for (const patient of session.patients) {
      // Get patient sessions for fractional validation
      const patientSessions = allSessions
        .filter(s => s.patients && s.patients.some(p => p.id === patient.id) && s.day === session.day)
        .map(s => ({
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          day: s.day,
          everyTwoWeeks: s.everyTwoWeeks,
          employeeIds: s.employeeIds,
          roomId: s.roomId,
          employees: s.employees,
          patients: s.patients
        }));

      // Use fractional validation for patient conflicts
      const patientValidation = validatePatientFractionalAvailability(
        {
          id: session.id,
          startTime: session.startTime,
          endTime: session.endTime,
          day: session.day,
          everyTwoWeeks: session.everyTwoWeeks
        },
        patientSessions,
        patient.id,
        `${patient.firstName} ${patient.lastName}`
      );

      if (!patientValidation.valid) {
        return {
          valid: false,
          error: patientValidation.error,
          conflictDetails: {
            conflictType: 'patient',
            conflictingSessions: patientValidation.conflictingSessions || []
          }
        };
      }
    }
  }

  // Check for blocking activities (unchanged logic)
  for (const activity of activities) {
    if (!activity.isBlocking) continue; // Skip non-blocking activities

    const activityTime = getActivityTimeForDay(activity, session.day);
    if (!activityTime) continue; // No activity on this day

    // Check if session overlaps with blocking activity
    if (timesOverlap(session.startTime, session.endTime, activityTime.startTime, activityTime.endTime)) {
      return { valid: false, error: 'לא ניתן לתזמן טיפול בזמן חסום' };
    }
  }

  return { valid: true };
}