/**
 * Scheduler validation logic tests
 * Tests validation functions used for manual session creation and scheduling constraints
 */

import {
  validateScheduleConstraints,
  timesOverlap
} from '../../src/utils/scheduler';
import { createMockEmployees, createMockRooms, createActivityFixture } from '../utils/fixtures';
import { Employee, Room, Session, Activity, WeekDay } from '../../src/types';

const createMockActivities = (): Activity[] => [
  createActivityFixture({
    name: 'Lunch Break',
    defaultStartTime: '12:00',
    defaultEndTime: '13:00',
    isBlocking: true
  }),
  createActivityFixture({
    name: 'Staff Break',
    defaultStartTime: '15:00',
    defaultEndTime: '15:30',
    isBlocking: true
  })
];

describe('Scheduler Validation Tests', () => {
  describe('validateScheduleConstraints', () => {
    it('should validate session with valid data', () => {
      const employees = createMockEmployees();
      const rooms = createMockRooms();
      const activities: Activity[] = [];
      const allSessions: Session[] = [];
      
      const session: Session = {
        id: 'test-session',
        scheduleId: 'test-schedule',
        employeeIds: [employees[0].id],
        roomId: rooms[0].id,
        day: 'monday' as WeekDay,
        startTime: '09:00',
        endTime: '09:45',
        employees: [employees[0]],
        patients: []
      };

      const result = validateScheduleConstraints(
        session,
        allSessions,
        employees,
        rooms,
        activities
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject session with no employees assigned', () => {
      const employees = createMockEmployees();
      const rooms = createMockRooms();
      const activities: Activity[] = [];
      const allSessions: Session[] = [];
      
      const session: Session = {
        id: 'test-session',
        scheduleId: 'test-schedule',
        employeeIds: [], // No employees
        roomId: rooms[0].id,
        day: 'monday' as WeekDay,
        startTime: '09:00',
        endTime: '09:45',
        employees: [],
        patients: []
      };

      const result = validateScheduleConstraints(
        session,
        allSessions,
        employees,
        rooms,
        activities
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('לפחות עובד אחד חייב להיות משויך לטיפול');
    });

    it('should reject session with non-existent room', () => {
      const employees = createMockEmployees();
      const rooms = createMockRooms();
      const activities: Activity[] = [];
      const allSessions: Session[] = [];
      
      const session: Session = {
        id: 'test-session',
        scheduleId: 'test-schedule',
        employeeIds: [employees[0].id],
        roomId: 'non-existent-room',
        day: 'monday' as WeekDay,
        startTime: '09:00',
        endTime: '09:45',
        employees: [employees[0]],
        patients: []
      };

      const result = validateScheduleConstraints(
        session,
        allSessions,
        employees,
        rooms,
        activities
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('חדר לא נמצא');
    });

    it('should reject session with non-existent employee', () => {
      const employees = createMockEmployees();
      const rooms = createMockRooms();
      const activities: Activity[] = [];
      const allSessions: Session[] = [];
      
      const session: Session = {
        id: 'test-session',
        scheduleId: 'test-schedule',
        employeeIds: ['non-existent-employee'],
        roomId: rooms[0].id,
        day: 'monday' as WeekDay,
        startTime: '09:00',
        endTime: '09:45',
        employees: [],
        patients: []
      };

      const result = validateScheduleConstraints(
        session,
        allSessions,
        employees,
        rooms,
        activities
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('עובד לא נמצא');
    });

    it('should reject session outside employee working hours', () => {
      const employees = createMockEmployees();
      const rooms = createMockRooms();
      const activities: Activity[] = [];
      const allSessions: Session[] = [];
      
      const session: Session = {
        id: 'test-session',
        scheduleId: 'test-schedule',
        employeeIds: [employees[0].id],
        roomId: rooms[0].id,
        day: 'monday' as WeekDay,
        startTime: '07:00', // Before working hours
        endTime: '07:45',
        employees: [employees[0]],
        patients: []
      };

      const result = validateScheduleConstraints(
        session,
        allSessions,
        employees,
        rooms,
        activities
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('מחוץ לשעות העבודה');
    });

    it('should reject session when employee is busy', () => {
      const employees = createMockEmployees();
      const rooms = createMockRooms();
      const activities: Activity[] = [];
      
      const existingSession: Session = {
        id: 'existing-session',
        scheduleId: 'test-schedule',
        employeeIds: [employees[0].id],
        roomId: rooms[1].id,
        day: 'monday' as WeekDay,
        startTime: '09:00',
        endTime: '09:45',
        employees: [employees[0]],
        patients: []
      };
      
      const newSession: Session = {
        id: 'new-session',
        scheduleId: 'test-schedule',
        employeeIds: [employees[0].id], // Same employee
        roomId: rooms[0].id,
        day: 'monday' as WeekDay,
        startTime: '09:15', // Overlapping time
        endTime: '10:00',
        employees: [employees[0]],
        patients: []
      };

      const result = validateScheduleConstraints(
        newSession,
        [existingSession],
        employees,
        rooms,
        activities
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('תפוס בזמן זה');
    });

    it('should reject session when room is busy', () => {
      const employees = createMockEmployees();
      const rooms = createMockRooms();
      const activities: Activity[] = [];
      
      const existingSession: Session = {
        id: 'existing-session',
        scheduleId: 'test-schedule',
        employeeIds: [employees[0].id],
        roomId: rooms[0].id,
        day: 'monday' as WeekDay,
        startTime: '09:00',
        endTime: '09:45',
        employees: [employees[0]],
        patients: []
      };
      
      const newSession: Session = {
        id: 'new-session',
        scheduleId: 'test-schedule',
        employeeIds: [employees[1].id], // Different employee
        roomId: rooms[0].id, // Same room
        day: 'monday' as WeekDay,
        startTime: '09:15', // Overlapping time
        endTime: '10:00',
        employees: [employees[1]],
        patients: []
      };

      const result = validateScheduleConstraints(
        newSession,
        [existingSession],
        employees,
        rooms,
        activities
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('החדר תפוס בזמן זה');
    });

    it('should reject session during blocked activities', () => {
      const employees = createMockEmployees();
      const rooms = createMockRooms();
      const activities = createMockActivities();
      const allSessions: Session[] = [];
      
      const session: Session = {
        id: 'test-session',
        scheduleId: 'test-schedule',
        employeeIds: [employees[0].id],
        roomId: rooms[0].id,
        day: 'monday' as WeekDay,
        startTime: '12:15', // During lunch break (12:00-13:00)
        endTime: '13:00',
        employees: [employees[0]],
        patients: []
      };

      const result = validateScheduleConstraints(
        session,
        allSessions,
        employees,
        rooms,
        activities
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('לא ניתן לתזמן טיפול בזמן חסום');
    });
  });

  describe('timesOverlap utility function', () => {
    it('should correctly detect time overlaps', () => {
      // Test various overlap scenarios
      expect(timesOverlap('10:00', '11:00', '10:30', '11:30')).toBe(true);  // Partial overlap
      expect(timesOverlap('10:00', '11:00', '09:30', '10:30')).toBe(true);  // Partial overlap
      expect(timesOverlap('10:00', '11:00', '09:00', '12:00')).toBe(true);  // Complete overlap
      expect(timesOverlap('10:00', '11:00', '11:00', '12:00')).toBe(false); // Adjacent (no overlap)
      expect(timesOverlap('10:00', '11:00', '08:00', '09:00')).toBe(false); // No overlap
      expect(timesOverlap('10:00', '11:00', '12:00', '13:00')).toBe(false); // No overlap
    });

    it('should handle edge cases correctly', () => {
      // Test edge cases
      expect(timesOverlap('10:00', '10:00', '10:00', '10:00')).toBe(false); // Zero duration
      expect(timesOverlap('10:00', '10:01', '10:00', '10:01')).toBe(true);  // Same 1-minute slot
      expect(timesOverlap('23:59', '23:59', '00:00', '00:01')).toBe(false); // Cross midnight (separate days)
    });
  });
});