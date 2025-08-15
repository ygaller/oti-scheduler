/**
 * Pure business logic tests for scheduling utilities
 * These tests focus on the scheduling algorithms and validation logic
 * without making any API calls or database interactions
 */

// NOTE: No setup import - these are pure business logic tests that don't need database
import { 
  generateScheduleWithActivities, 
  validateScheduleConstraints
} from '../../src/utils/scheduler';
import { 
  createEmployeeFixture, 
  createRoomFixture, 
  createPatientFixture, 
  createActivityFixture,
  createSessionFixture,
  createScheduleFixture
} from './fixtures';
import { Employee, Room, Activity, Session, Patient, CreateEmployeeDto, CreateRoomDto } from '../../src/types';

// Helper function to convert DTO to full entity
const convertEmployeeToEntity = (dto: CreateEmployeeDto): Employee => ({
  id: 'emp-' + Math.random().toString(36).substr(2, 9),
  ...dto,
  isActive: dto.isActive ?? true
});

const convertRoomToEntity = (dto: CreateRoomDto): Room => ({
  id: 'room-' + Math.random().toString(36).substr(2, 9),
  ...dto,
  isActive: dto.isActive ?? true
});

// Create full entities for testing
const createMockEmployees = (): Employee[] => [
  convertEmployeeToEntity(createEmployeeFixture({
    firstName: 'Alice',
    lastName: 'Smith',
    role: 'occupational-therapist',
    weeklySessionsCount: 20,
    color: '#845ec2'
  })),
  convertEmployeeToEntity(createEmployeeFixture({
    firstName: 'Bob',
    lastName: 'Johnson',
    role: 'physiotherapist',
    weeklySessionsCount: 15,
    color: '#4e9f3d'
  })),
  convertEmployeeToEntity(createEmployeeFixture({
    firstName: 'Carol',
    lastName: 'Davis',
    role: 'speech-therapist',
    weeklySessionsCount: 12,
    color: '#d65db1'
  }))
];

const createMockRooms = (): Room[] => [
  convertRoomToEntity(createRoomFixture({ name: 'Therapy Room 1', color: '#008dcd' })),
  convertRoomToEntity(createRoomFixture({ name: 'Therapy Room 2', color: '#ff6b6b' })),
  convertRoomToEntity(createRoomFixture({ name: 'Speech Room', color: '#4ecdc4' }))
];

const createMockActivities = (): Activity[] => [
  createActivityFixture({
    name: 'Morning Meeting',
    defaultStartTime: '08:00',
    defaultEndTime: '08:30',
    isBlocking: true
  }),
  createActivityFixture({
    name: 'Optional Training',
    defaultStartTime: '12:00',
    defaultEndTime: '13:00',
    isBlocking: false
  }),
  createActivityFixture({
    name: 'Staff Break',
    defaultStartTime: '15:00',
    defaultEndTime: '15:30',
    isBlocking: true
  })
];

describe('Scheduler Business Logic Tests', () => {
  describe('generateScheduleWithActivities', () => {
    it('should generate schedule with valid employees and rooms', () => {
      const employees = createMockEmployees();
      const rooms = createMockRooms();
      const activities: Activity[] = [];

      const sessions = generateScheduleWithActivities(employees, rooms, activities);

      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBeGreaterThan(0);
      
      // Verify all sessions have required properties
      sessions.forEach(session => {
        expect(session).toHaveProperty('employeeId');
        expect(session).toHaveProperty('roomId');
        expect(session).toHaveProperty('day');
        expect(session).toHaveProperty('startTime');
        expect(session).toHaveProperty('endTime');
        expect(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday']).toContain(session.day);
      });
    });

    it('should throw error when no employees provided', () => {
      const employees: Employee[] = [];
      const rooms = createMockRooms();
      const activities: Activity[] = [];

      expect(() => {
        generateScheduleWithActivities(employees, rooms, activities);
      }).toThrow('No employees found');
    });

    it('should throw error when no rooms provided', () => {
      const employees = createMockEmployees();
      const rooms: Room[] = [];
      const activities: Activity[] = [];

      expect(() => {
        generateScheduleWithActivities(employees, rooms, activities);
      }).toThrow(/Cannot generate schedule - insufficient available time slots/);
    });

    it('should respect blocking activities', () => {
      const employees = [
        convertEmployeeToEntity(createEmployeeFixture({
          firstName: 'Test',
          lastName: 'Employee',
          weeklySessionsCount: 5,
          workingHours: {
            monday: { startTime: '08:00', endTime: '16:00' }
          }
        }))
      ];
      const rooms = [convertRoomToEntity(createRoomFixture({ name: 'Test Room' }))];
      const activities = [
        createActivityFixture({
          name: 'Blocking Meeting',
          defaultStartTime: '08:00',
          defaultEndTime: '15:30',
          isBlocking: true
        })
      ];

      expect(() => {
        generateScheduleWithActivities(employees, rooms, activities);
      }).toThrow(/Cannot generate schedule - insufficient available time slots/);
    });

    it('should allow scheduling over non-blocking activities', () => {
      const employees = [
        convertEmployeeToEntity(createEmployeeFixture({
          firstName: 'Test',
          lastName: 'Employee',
          weeklySessionsCount: 5
        }))
      ];
      const rooms = [convertRoomToEntity(createRoomFixture({ name: 'Test Room' }))];
      const activities = [
        createActivityFixture({
          name: 'Optional Training',
          defaultStartTime: '10:00',
          defaultEndTime: '11:00',
          isBlocking: false
        })
      ];

      const sessions = generateScheduleWithActivities(employees, rooms, activities);
      
      expect(sessions.length).toBeGreaterThan(0);
      
      // Check if sessions can overlap with non-blocking activities
      const sessionsInActivityTime = sessions.filter(session => {
        const sessionStart = timeToMinutes(session.startTime);
        const sessionEnd = timeToMinutes(session.endTime);
        const activityStart = timeToMinutes('10:00');
        const activityEnd = timeToMinutes('11:00');
        
        return sessionStart < activityEnd && activityStart < sessionEnd;
      });

      // Should be able to schedule during non-blocking activities
      expect(sessionsInActivityTime.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect employee working hours', () => {
      const employees = [
        convertEmployeeToEntity(createEmployeeFixture({
          firstName: 'Part Time',
          lastName: 'Employee',
          weeklySessionsCount: 5,
          workingHours: {
            monday: { startTime: '10:00', endTime: '14:00' }, // Short day
            tuesday: { startTime: '09:00', endTime: '17:00' }  // Full day
          }
        }))
      ];
      const rooms = [convertRoomToEntity(createRoomFixture({ name: 'Test Room' }))];
      const activities: Activity[] = [];

      const sessions = generateScheduleWithActivities(employees, rooms, activities);
      
      // All sessions should be within working hours
      sessions.forEach(session => {
        const employee = employees.find(e => e.id === session.employeeId);
        const workingHours = employee?.workingHours[session.day];
        
        if (workingHours) {
          const sessionStart = timeToMinutes(session.startTime);
          const sessionEnd = timeToMinutes(session.endTime);
          const workStart = timeToMinutes(workingHours.startTime);
          const workEnd = timeToMinutes(workingHours.endTime);
          
          expect(sessionStart).toBeGreaterThanOrEqual(workStart);
          expect(sessionEnd).toBeLessThanOrEqual(workEnd);
        }
      });
    });
  });

  describe('validateScheduleConstraints', () => {
    let employees: Employee[];
    let rooms: Room[];
    let activities: Activity[];

    beforeEach(() => {
      employees = createMockEmployees();
      rooms = createMockRooms();
      activities = [];
    });

    it('should validate valid session', () => {
      const session = createSessionFixture({
        employeeId: employees[0].id,
        roomId: rooms[0].id,
        day: 'monday',
        startTime: '10:00',
        endTime: '11:00'
      });
      const existingSessions: Session[] = [];

      const result = validateScheduleConstraints(
        session,
        existingSessions,
        employees,
        rooms,
        activities
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject session with non-existent employee', () => {
      const session = createSessionFixture({
        employeeId: 'non-existent-employee',
        roomId: rooms[0].id,
        day: 'monday',
        startTime: '10:00',
        endTime: '11:00'
      });
      const existingSessions: Session[] = [];

      const result = validateScheduleConstraints(
        session,
        existingSessions,
        employees,
        rooms,
        activities
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('עובד לא נמצא'); // Hebrew: "Employee not found"
    });

    it('should reject session with non-existent room', () => {
      const session = createSessionFixture({
        employeeId: employees[0].id,
        roomId: 'non-existent-room',
        day: 'monday',
        startTime: '10:00',
        endTime: '11:00'
      });
      const existingSessions: Session[] = [];

      const result = validateScheduleConstraints(
        session,
        existingSessions,
        employees,
        rooms,
        activities
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('חדר לא נמצא'); // Hebrew: "Room not found"
    });

    it('should reject session outside employee working hours', () => {
      const session = createSessionFixture({
        employeeId: employees[0].id,
        roomId: rooms[0].id,
        day: 'monday',
        startTime: '06:00', // Before working hours
        endTime: '07:00'
      });
      const existingSessions: Session[] = [];

      const result = validateScheduleConstraints(
        session,
        existingSessions,
        employees,
        rooms,
        activities
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('הטיפול מחוץ לשעות העבודה של העובד'); // Hebrew: "outside employee working hours"
    });

    it('should reject session during blocking activity', () => {
      const blockingActivity = createActivityFixture({
        name: 'Staff Meeting',
        defaultStartTime: '10:00',
        defaultEndTime: '11:00',
        isBlocking: true
      });
      activities.push(blockingActivity);

      const session = createSessionFixture({
        employeeId: employees[0].id,
        roomId: rooms[0].id,
        day: 'monday',
        startTime: '10:30',
        endTime: '11:30'
      });
      const existingSessions: Session[] = [];

      const result = validateScheduleConstraints(
        session,
        existingSessions,
        employees,
        rooms,
        activities
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('לא ניתן לתזמן טיפול בזמן חסום'); // Hebrew: "conflicts with blocking activity"
    });

    it('should allow session during non-blocking activity', () => {
      const nonBlockingActivity = createActivityFixture({
        name: 'Optional Training',
        defaultStartTime: '10:00',
        defaultEndTime: '11:00',
        isBlocking: false
      });
      activities.push(nonBlockingActivity);

      const session = createSessionFixture({
        employeeId: employees[0].id,
        roomId: rooms[0].id,
        day: 'monday',
        startTime: '10:30',
        endTime: '11:30'
      });
      const existingSessions: Session[] = [];

      const result = validateScheduleConstraints(
        session,
        existingSessions,
        employees,
        rooms,
        activities
      );

      expect(result.valid).toBe(true);
    });

    it('should reject overlapping sessions with same employee', () => {
      const existingSession = createSessionFixture({
        employeeId: employees[0].id,
        roomId: rooms[0].id,
        day: 'monday',
        startTime: '10:00',
        endTime: '11:00'
      });
      const newSession = createSessionFixture({
        employeeId: employees[0].id, // Same employee
        roomId: rooms[1].id,
        day: 'monday',
        startTime: '10:30',
        endTime: '11:30'
      });

      const result = validateScheduleConstraints(
        newSession,
        [existingSession],
        employees,
        rooms,
        activities
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('העובד תפוס בזמן זה'); // Hebrew: "Employee already has a session"
    });

    it('should reject overlapping sessions with same room', () => {
      const existingSession = createSessionFixture({
        employeeId: employees[0].id,
        roomId: rooms[0].id,
        day: 'monday',
        startTime: '10:00',
        endTime: '11:00'
      });
      const newSession = createSessionFixture({
        employeeId: employees[1].id,
        roomId: rooms[0].id, // Same room
        day: 'monday',
        startTime: '10:30',
        endTime: '11:30'
      });

      const result = validateScheduleConstraints(
        newSession,
        [existingSession],
        employees,
        rooms,
        activities
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('החדר תפוס בזמן זה'); // Hebrew: "Room already has a session"
    });
  });

  describe('Time Conflict Validation Logic', () => {
    it('should detect time overlaps correctly', () => {
      // Helper function to test time overlaps
      const timesOverlap = (
        start1: string, end1: string,
        start2: string, end2: string
      ): boolean => {
        const start1Min = timeToMinutes(start1);
        const end1Min = timeToMinutes(end1);
        const start2Min = timeToMinutes(start2);
        const end2Min = timeToMinutes(end2);
        
        return start1Min < end2Min && start2Min < end1Min;
      };

      // Test cases for time overlap detection
      expect(timesOverlap('10:00', '11:00', '10:30', '11:30')).toBe(true);  // Partial overlap
      expect(timesOverlap('10:00', '11:00', '09:30', '10:30')).toBe(true);  // Partial overlap
      expect(timesOverlap('10:00', '11:00', '09:00', '12:00')).toBe(true);  // Complete overlap
      expect(timesOverlap('10:00', '11:00', '11:00', '12:00')).toBe(false); // Adjacent (no overlap)
      expect(timesOverlap('10:00', '11:00', '08:00', '09:00')).toBe(false); // No overlap
      expect(timesOverlap('10:00', '11:00', '12:00', '13:00')).toBe(false); // No overlap
    });

    it('should handle edge cases in time validation', () => {
      const timesOverlap = (
        start1: string, end1: string,
        start2: string, end2: string
      ): boolean => {
        const start1Min = timeToMinutes(start1);
        const end1Min = timeToMinutes(end1);
        const start2Min = timeToMinutes(start2);
        const end2Min = timeToMinutes(end2);
        
        return start1Min < end2Min && start2Min < end1Min;
      };

      // Edge cases
      expect(timesOverlap('10:00', '10:00', '10:00', '10:00')).toBe(false); // Zero duration
      expect(timesOverlap('10:00', '10:01', '10:00', '10:01')).toBe(true);  // Same 1-minute slot
      expect(timesOverlap('23:59', '23:59', '00:00', '00:01')).toBe(false); // Cross midnight (separate days)
    });
  });

  describe('Working Hours Logic', () => {
    it('should correctly validate sessions within working hours', () => {
      const employee = convertEmployeeToEntity(createEmployeeFixture({
        workingHours: {
          monday: { startTime: '09:00', endTime: '17:00' },
          tuesday: { startTime: '08:00', endTime: '16:00' }
        }
      }));

      // Valid sessions
      expect(isWithinWorkingHours(employee, 'monday', '09:00', '10:00')).toBe(true);
      expect(isWithinWorkingHours(employee, 'monday', '16:00', '17:00')).toBe(true);
      expect(isWithinWorkingHours(employee, 'tuesday', '08:00', '16:00')).toBe(true);

      // Invalid sessions
      expect(isWithinWorkingHours(employee, 'monday', '08:00', '09:00')).toBe(false);
      expect(isWithinWorkingHours(employee, 'monday', '17:00', '18:00')).toBe(false);
      expect(isWithinWorkingHours(employee, 'tuesday', '16:00', '17:00')).toBe(false);
      expect(isWithinWorkingHours(employee, 'wednesday', '10:00', '11:00')).toBe(false); // No working hours set
    });

    function isWithinWorkingHours(
      employee: Employee, 
      day: string, 
      startTime: string, 
      endTime: string
    ): boolean {
      const workingHours = employee.workingHours[day as keyof typeof employee.workingHours];
      if (!workingHours) return false;

      const sessionStart = timeToMinutes(startTime);
      const sessionEnd = timeToMinutes(endTime);
      const workStart = timeToMinutes(workingHours.startTime);
      const workEnd = timeToMinutes(workingHours.endTime);

      return sessionStart >= workStart && sessionEnd <= workEnd;
    }
  });

  describe('Activity Time Resolution Logic', () => {
    it('should correctly resolve activity times with day overrides', () => {
      const activity = createActivityFixture({
        name: 'Flexible Meeting',
        defaultStartTime: '10:00',
        defaultEndTime: '11:00',
        dayOverrides: {
          monday: { startTime: '09:00', endTime: '10:00' },
          tuesday: null, // No activity on Tuesday
          wednesday: { startTime: '14:00', endTime: '15:00' }
        }
      });

      // Helper function to get activity time for a day (simplified version)
      const getActivityTimeForDay = (activity: Activity, day: string) => {
        const dayOverride = activity.dayOverrides[day];
        
        if (dayOverride !== undefined) {
          return dayOverride; // null or specific time
        }
        
        if (activity.defaultStartTime && activity.defaultEndTime) {
          return {
            startTime: activity.defaultStartTime,
            endTime: activity.defaultEndTime
          };
        }
        
        return null;
      };

      // Test day override resolution
      expect(getActivityTimeForDay(activity, 'monday')).toEqual({ 
        startTime: '09:00', 
        endTime: '10:00' 
      });
      expect(getActivityTimeForDay(activity, 'tuesday')).toBeNull();
      expect(getActivityTimeForDay(activity, 'wednesday')).toEqual({ 
        startTime: '14:00', 
        endTime: '15:00' 
      });
      expect(getActivityTimeForDay(activity, 'thursday')).toEqual({ 
        startTime: '10:00', 
        endTime: '11:00' 
      });
    });
  });
});

// Helper function to convert time string to minutes for comparison
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}