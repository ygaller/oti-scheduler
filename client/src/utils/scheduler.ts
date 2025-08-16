import { Employee, Room, Session, Activity } from '../types';

export type WeekDay = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday';
export const WEEK_DAYS: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];

export const DAY_LABELS = {
  sunday: 'יום ראשון',
  monday: 'יום שני',
  tuesday: 'יום שלישי',
  wednesday: 'יום רביעי',
  thursday: 'יום חמישי'
};

// Helper function to get the effective time range for a blocked period on a specific day
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

interface TimeSlot {
  day: WeekDay;
  startTime: string;
  endTime: string;
}

interface EmployeeScheduleState {
  employeeId: string;
  remainingSessions: number;
  lastSessionEndTime: { [day: string]: string };
  consecutiveSessions: { [day: string]: number };
}

class ScheduleGenerator {
  private employees: Employee[];
  private rooms: Room[];
  private activities: Activity[];
  private sessions: Session[] = [];
  private employeeStates: Map<string, EmployeeScheduleState> = new Map();

  constructor(employees: Employee[], rooms: Room[], activities: Activity[]) {
    this.employees = employees;
    this.rooms = rooms;
    this.activities = activities.filter(activity => activity.isActive);
    this.initializeEmployeeStates();
  }

  private initializeEmployeeStates() {
    this.employeeStates.clear();
    this.employees.forEach(employee => {
      this.employeeStates.set(employee.id, {
        employeeId: employee.id,
        remainingSessions: employee.weeklySessionsCount,
        lastSessionEndTime: {},
        consecutiveSessions: {}
      });
    });
  }

  public generateSchedule(): Session[] {
    this.sessions = [];
    this.initializeEmployeeStates();

    // Generate all possible time slots for each day
    const allTimeSlots = this.generateAllTimeSlots();
    
    // Sort time slots by day and time for consistent scheduling
    allTimeSlots.sort((a, b) => {
      const dayOrder = WEEK_DAYS.indexOf(a.day) - WEEK_DAYS.indexOf(b.day);
      if (dayOrder !== 0) return dayOrder;
      return a.startTime.localeCompare(b.startTime);
    });

    // Try to assign sessions to each time slot
    for (const timeSlot of allTimeSlots) {
      this.tryAssignSession(timeSlot);
    }

    return this.sessions;
  }

  private generateAllTimeSlots(): TimeSlot[] {
    const timeSlots: TimeSlot[] = [];
    
    WEEK_DAYS.forEach(day => {
      // Find the earliest and latest times for this day across all employees
      const dayTimes = this.employees
        .map(emp => emp.workingHours[day])
        .filter(hours => hours !== undefined)
        .map(hours => ({ start: hours!.startTime, end: hours!.endTime }));

      if (dayTimes.length === 0) return;

      const earliestStart = dayTimes.reduce((min, curr) => 
        curr.start < min ? curr.start : min, dayTimes[0].start);
      const latestEnd = dayTimes.reduce((max, curr) => 
        curr.end > max ? curr.end : max, dayTimes[0].end);

      // Generate 45-minute time slots throughout the day
      const slots = this.generateTimeSlotsForDay(day, earliestStart, latestEnd);
      timeSlots.push(...slots);
    });

    return timeSlots;
  }

  private generateTimeSlotsForDay(day: WeekDay, startTime: string, endTime: string): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const start = this.timeStringToMinutes(startTime);
    const end = this.timeStringToMinutes(endTime);
    
    for (let currentTime = start; currentTime + 45 <= end; currentTime += 15) {
      const slotStart = this.minutesToTimeString(currentTime);
      const slotEnd = this.minutesToTimeString(currentTime + 45);
      
      // Skip slots that conflict with break times
      if (!this.isTimeSlotBlocked(day, slotStart, slotEnd)) {
        slots.push({
          day,
          startTime: slotStart,
          endTime: slotEnd
        });
      }
    }
    
    return slots;
  }

  private tryAssignSession(timeSlot: TimeSlot): boolean {
    // Find available rooms for this time slot
    const availableRooms = this.rooms.filter(room => 
      this.isRoomAvailable(room.id, timeSlot.day, timeSlot.startTime, timeSlot.endTime)
    );

    if (availableRooms.length === 0) return false;

    // Find employees who can work in this time slot and need sessions
    const availableEmployees = this.employees.filter(employee => 
      this.canEmployeeWork(employee, timeSlot)
    );

    if (availableEmployees.length === 0) return false;

    // Sort employees by remaining sessions (highest first) to balance the load
    availableEmployees.sort((a, b) => {
      const stateA = this.employeeStates.get(a.id)!;
      const stateB = this.employeeStates.get(b.id)!;
      return stateB.remainingSessions - stateA.remainingSessions;
    });

    // Assign the first available employee to the first available room
    const employee = availableEmployees[0];
    const room = availableRooms[0];

    this.assignSession(employee, room, timeSlot);
    return true;
  }

  private canEmployeeWork(employee: Employee, timeSlot: TimeSlot): boolean {
    const state = this.employeeStates.get(employee.id)!;
    
    // Check if employee has remaining sessions
    if (state.remainingSessions <= 0) return false;

    // Check if employee works on this day
    const workingHours = employee.workingHours[timeSlot.day];
    if (!workingHours) return false;

    // Check if the time slot is within working hours
    if (timeSlot.startTime < workingHours.startTime || timeSlot.endTime > workingHours.endTime) {
      return false;
    }

    // Check if employee is already busy at this time
    if (this.isEmployeeBusy(employee.id, timeSlot.day, timeSlot.startTime, timeSlot.endTime)) {
      return false;
    }

    // Check consecutive sessions rule (max 2 in a row, then 5-minute break)
    return this.canEmployeeHaveConsecutiveSession(employee.id, timeSlot);
  }

  private canEmployeeHaveConsecutiveSession(employeeId: string, timeSlot: TimeSlot): boolean {
    const state = this.employeeStates.get(employeeId)!;
    const dayKey = timeSlot.day;
    const consecutiveCount = state.consecutiveSessions[dayKey] || 0;
    const lastEndTime = state.lastSessionEndTime[dayKey];

    // If no previous session today, it's fine
    if (!lastEndTime) return true;

    // If more than 5 minutes have passed since last session, reset consecutive count
    const timeDiff = this.timeStringToMinutes(timeSlot.startTime) - this.timeStringToMinutes(lastEndTime);
    if (timeDiff >= 5) return true;

    // If this would be the third consecutive session, not allowed
    if (consecutiveCount >= 2) return false;

    return true;
  }

  private assignSession(employee: Employee, room: Room, timeSlot: TimeSlot) {
    const session: Session = {
      id: `session_${Date.now()}_${Math.random()}`,
      employeeId: employee.id,
      roomId: room.id,
      day: timeSlot.day,
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
      patients: [], // No patient assignment during automatic scheduling
      patientIds: [],
    };

    this.sessions.push(session);

    // Update employee state
    const state = this.employeeStates.get(employee.id)!;
    state.remainingSessions--;
    
    const dayKey = timeSlot.day;
    const lastEndTime = state.lastSessionEndTime[dayKey];
    
    // Update consecutive sessions count
    if (lastEndTime && 
        this.timeStringToMinutes(timeSlot.startTime) - this.timeStringToMinutes(lastEndTime) < 5) {
      state.consecutiveSessions[dayKey] = (state.consecutiveSessions[dayKey] || 0) + 1;
    } else {
      state.consecutiveSessions[dayKey] = 1;
    }
    
    state.lastSessionEndTime[dayKey] = timeSlot.endTime;
  }

  private isRoomAvailable(roomId: string, day: WeekDay, startTime: string, endTime: string): boolean {
    return !this.sessions.some(session => 
      session.roomId === roomId &&
      session.day === day &&
      timesOverlap(session.startTime, session.endTime, startTime, endTime)
    );
  }

  private isEmployeeBusy(employeeId: string, day: WeekDay, startTime: string, endTime: string): boolean {
    return this.sessions.some(session => 
      session.employeeId === employeeId &&
      session.day === day &&
      timesOverlap(session.startTime, session.endTime, startTime, endTime)
    );
  }

  private isTimeSlotBlocked(day: WeekDay, startTime: string, endTime: string): boolean {
    return this.activities.some(activity => {
      // Only check activities that are set to block scheduling
      if (!activity.isBlocking) {
        return false;
      }
      
      const periodTime = getActivityTimeForDay(activity, day);
      if (!periodTime) {
        return false; // No blocking for this day
      }
      
      return timesOverlap(periodTime.startTime, periodTime.endTime, startTime, endTime);
    });
  }

  private timeStringToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}

// Main schedule generation function that uses Activity[]
export function generateScheduleWithActivities(
  employees: Employee[],
  rooms: Room[],
  activities: Activity[]
): Session[] {
  const generator = new ScheduleGenerator(employees, rooms, activities);
  return generator.generateSchedule();
}

export function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const start1Min = timeStringToMinutes(start1);
  const end1Min = timeStringToMinutes(end1);
  const start2Min = timeStringToMinutes(start2);
  const end2Min = timeStringToMinutes(end2);

  return start1Min < end2Min && start2Min < end1Min;
}

export function validateScheduleConstraints(
  session: Session,
  allSessions: Session[],
  employees: Employee[],
  rooms: Room[],
  activities: Activity[]
): { valid: boolean; error?: string } {
  const employee = employees.find(e => e.id === session.employeeId);
  const room = rooms.find(r => r.id === session.roomId);

  if (!employee) return { valid: false, error: 'עובד לא נמצא' };
  if (!room) return { valid: false, error: 'חדר לא נמצא' };

  // Check working hours
  const workingHours = employee.workingHours[session.day];
  if (!workingHours) {
    return { valid: false, error: 'העובד לא עובד ביום זה' };
  }

  if (session.startTime < workingHours.startTime || session.endTime > workingHours.endTime) {
    return { valid: false, error: 'הטיפול מחוץ לשעות העבודה של העובד' };
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

  // Check employee conflicts
  const employeeConflicts = allSessions.filter(s => 
    s.id !== session.id &&
    s.employeeId === session.employeeId &&
    s.day === session.day &&
    timesOverlap(s.startTime, s.endTime, session.startTime, session.endTime)
  );

  if (employeeConflicts.length > 0) {
    return { valid: false, error: 'העובד תפוס בזמן זה' };
  }

  // Check activities/blocked periods
  for (const activity of activities) {
    if (!activity.isBlocking || !activity.isActive) continue;
    
    const activityTime = getActivityTimeForDay(activity, session.day);
    if (!activityTime) continue;
    
    if (timesOverlap(activityTime.startTime, activityTime.endTime, session.startTime, session.endTime)) {
      return { valid: false, error: `הזמן חופף עם ${activity.name}` };
    }
  }

  return { valid: true };
}
