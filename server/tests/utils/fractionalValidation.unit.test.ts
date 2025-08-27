/**
 * Unit tests for fractional validation functions
 * These tests focus on the pure validation logic without making API calls
 */

import {
  validateRoomFractionalAvailability,
  validateEmployeeFractionalAvailability,
  validatePatientFractionalAvailability,
  validateScheduleConstraintsFractional,
  SessionValidationInput,
  timesOverlap
} from '../../src/utils/scheduler';
import { createMockEmployees, createMockRooms, createActivityFixture } from '../utils/fixtures';
import { Employee, Room, Session, Activity, WeekDay } from '../../src/types';

describe('Fractional Validation Functions', () => {
  
  describe('validateRoomFractionalAvailability', () => {
    it('should allow adding an every-two-weeks session when no existing sessions', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: true
      };
      
      const existingSessions: SessionValidationInput[] = [];
      
      const result = validateRoomFractionalAvailability(newSession, existingSessions);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow adding a full session when no existing sessions', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: false
      };
      
      const existingSessions: SessionValidationInput[] = [];
      
      const result = validateRoomFractionalAvailability(newSession, existingSessions);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow adding an every-two-weeks session when another every-two-weeks session exists with overlap', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: true
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'existing-session',
          startTime: '10:30',
          endTime: '11:30',
          day: 'monday',
          everyTwoWeeks: true
        }
      ];
      
      const result = validateRoomFractionalAvailability(newSession, existingSessions);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject adding a full session when an every-two-weeks session exists with overlap', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: false
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'existing-session',
          startTime: '10:30',
          endTime: '11:30',
          day: 'monday',
          everyTwoWeeks: true
        }
      ];
      
      const result = validateRoomFractionalAvailability(newSession, existingSessions);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('החדר תפוס בזמן זה');
      expect(result.error).toContain('1.5');
    });

    it('should reject adding an every-two-weeks session when a full session exists with overlap', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: true
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'existing-session',
          startTime: '10:30',
          endTime: '11:30',
          day: 'monday',
          everyTwoWeeks: false
        }
      ];
      
      const result = validateRoomFractionalAvailability(newSession, existingSessions);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('החדר תפוס בזמן זה');
      expect(result.error).toContain('1.5');
    });

    it('should reject adding a full session when another full session exists with overlap', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: false
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'existing-session',
          startTime: '10:30',
          endTime: '11:30',
          day: 'monday',
          everyTwoWeeks: false
        }
      ];
      
      const result = validateRoomFractionalAvailability(newSession, existingSessions);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('החדר תפוס בזמן זה');
      expect(result.error).toContain('2.0');
    });

    it('should allow sessions with non-overlapping times regardless of type', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: false
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'existing-session-1',
          startTime: '08:00',
          endTime: '09:00',
          day: 'monday',
          everyTwoWeeks: false
        },
        {
          id: 'existing-session-2',
          startTime: '12:00',
          endTime: '13:00',
          day: 'monday',
          everyTwoWeeks: true
        }
      ];
      
      const result = validateRoomFractionalAvailability(newSession, existingSessions);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle edge case: same start and end times (exact overlap)', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: true
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'existing-session',
          startTime: '10:00',
          endTime: '11:00',
          day: 'monday',
          everyTwoWeeks: true
        }
      ];
      
      const result = validateRoomFractionalAvailability(newSession, existingSessions);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle updating existing session (same ID should be ignored)', () => {
      const sessionId = 'same-session';
      const newSession: SessionValidationInput = {
        id: sessionId,
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: false
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: sessionId, // Same ID - should be ignored
          startTime: '10:00',
          endTime: '11:00',
          day: 'monday',
          everyTwoWeeks: true
        }
      ];
      
      const result = validateRoomFractionalAvailability(newSession, existingSessions);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('validateEmployeeFractionalAvailability', () => {
    const employeeId = 'emp1';
    const employeeName = 'John Doe';

    it('should allow adding an every-two-weeks session when no existing sessions', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: true
      };
      
      const existingSessions: SessionValidationInput[] = [];
      
      const result = validateEmployeeFractionalAvailability(newSession, existingSessions, employeeId, employeeName);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow adding an every-two-weeks session when another every-two-weeks session exists with overlap', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: true
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'existing-session',
          startTime: '10:30',
          endTime: '11:30',
          day: 'monday',
          everyTwoWeeks: true
        }
      ];
      
      const result = validateEmployeeFractionalAvailability(newSession, existingSessions, employeeId, employeeName);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject adding a full session when an every-two-weeks session exists with overlap', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: false
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'existing-session',
          startTime: '10:30',
          endTime: '11:30',
          day: 'monday',
          everyTwoWeeks: true
        }
      ];
      
      const result = validateEmployeeFractionalAvailability(newSession, existingSessions, employeeId, employeeName);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`העובד ${employeeName} תפוס בזמן זה`);
      expect(result.error).toContain('1.5');
    });

    it('should reject adding multiple sessions that exceed capacity', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: true
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'existing-session-1',
          startTime: '09:45',
          endTime: '10:30',
          day: 'monday',
          everyTwoWeeks: true
        },
        {
          id: 'existing-session-2',
          startTime: '10:45',
          endTime: '11:30',
          day: 'monday',
          everyTwoWeeks: true
        }
      ];
      
      const result = validateEmployeeFractionalAvailability(newSession, existingSessions, employeeId, employeeName);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`העובד ${employeeName} תפוס בזמן זה`);
    });
  });

  describe('validatePatientFractionalAvailability', () => {
    const patientId = 'patient1';
    const patientName = 'Jane Doe';

    it('should allow adding an every-two-weeks session when no existing sessions', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: true
      };
      
      const existingSessions: SessionValidationInput[] = [];
      
      const result = validatePatientFractionalAvailability(newSession, existingSessions, patientId, patientName);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow adding an every-two-weeks session when another every-two-weeks session exists with overlap', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: true
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'existing-session',
          startTime: '10:30',
          endTime: '11:30',
          day: 'monday',
          everyTwoWeeks: true
        }
      ];
      
      const result = validatePatientFractionalAvailability(newSession, existingSessions, patientId, patientName);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject adding a full session when an every-two-weeks session exists with overlap', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: false
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'existing-session',
          startTime: '10:30',
          endTime: '11:30',
          day: 'monday',
          everyTwoWeeks: true
        }
      ];
      
      const result = validatePatientFractionalAvailability(newSession, existingSessions, patientId, patientName);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`המטופל ${patientName} תפוס בזמן זה`);
      expect(result.error).toContain('1.5');
    });

    it('should reject adding an every-two-weeks session when a full session exists with overlap', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: true
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'existing-session',
          startTime: '10:30',
          endTime: '11:30',
          day: 'monday',
          everyTwoWeeks: false
        }
      ];
      
      const result = validatePatientFractionalAvailability(newSession, existingSessions, patientId, patientName);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`המטופל ${patientName} תפוס בזמן זה`);
      expect(result.error).toContain('1.5');
    });

    it('should reject adding a full session when another full session exists with overlap', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: false
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'existing-session',
          startTime: '10:30',
          endTime: '11:30',
          day: 'monday',
          everyTwoWeeks: false
        }
      ];
      
      const result = validatePatientFractionalAvailability(newSession, existingSessions, patientId, patientName);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`המטופל ${patientName} תפוס בזמן זה`);
      expect(result.error).toContain('2.0');
    });

    it('should allow sessions with non-overlapping times regardless of type', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: false
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'existing-session-1',
          startTime: '08:00',
          endTime: '09:00',
          day: 'monday',
          everyTwoWeeks: false
        },
        {
          id: 'existing-session-2',
          startTime: '12:00',
          endTime: '13:00',
          day: 'monday',
          everyTwoWeeks: true
        }
      ];
      
      const result = validatePatientFractionalAvailability(newSession, existingSessions, patientId, patientName);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle edge case: same start and end times (exact overlap)', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: true
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'existing-session',
          startTime: '10:00',
          endTime: '11:00',
          day: 'monday',
          everyTwoWeeks: true
        }
      ];
      
      const result = validatePatientFractionalAvailability(newSession, existingSessions, patientId, patientName);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle updating existing session (same ID should be ignored)', () => {
      const sessionId = 'same-session';
      const newSession: SessionValidationInput = {
        id: sessionId,
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: false
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: sessionId, // Same ID - should be ignored
          startTime: '10:00',
          endTime: '11:00',
          day: 'monday',
          everyTwoWeeks: true
        }
      ];
      
      const result = validatePatientFractionalAvailability(newSession, existingSessions, patientId, patientName);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle complex overlapping patient schedules', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: true
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'session-1',
          startTime: '09:45',
          endTime: '10:30',
          day: 'monday',
          everyTwoWeeks: true // Overlap: 0.5 + 0.5 = 1.0 ✓
        },
        {
          id: 'session-2',
          startTime: '10:45',
          endTime: '11:30',
          day: 'monday',
          everyTwoWeeks: true // Overlap: 0.5 + 0.5 = 1.0 ✓
        },
        {
          id: 'session-3',
          startTime: '12:00',
          endTime: '13:00',
          day: 'monday',
          everyTwoWeeks: false // No overlap
        }
      ];
      
      const result = validatePatientFractionalAvailability(newSession, existingSessions, patientId, patientName);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Complex scenarios described in requirements', () => {
    it('should handle the specific example: 10:00-11:00 session with existing 9:45-10:30 and 10:45-11:30 sessions', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: true
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'session-1',
          startTime: '09:45',
          endTime: '10:30',
          day: 'monday',
          everyTwoWeeks: true
        },
        {
          id: 'session-2',
          startTime: '10:45',
          endTime: '11:30',
          day: 'monday',
          everyTwoWeeks: true
        }
      ];

      // Should check each overlap separately
      // New session (10:00-11:00) overlaps with session-1 (9:45-10:30): 0.5 + 0.5 = 1.0 ✓
      // New session (10:00-11:00) overlaps with session-2 (10:45-11:30): 0.5 + 0.5 = 1.0 ✓
      // Both validations should pass
      
      const result = validateRoomFractionalAvailability(newSession, existingSessions);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject when one of multiple overlapping sessions would exceed capacity', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: false // Full session
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'session-1',
          startTime: '09:45',
          endTime: '10:30',
          day: 'monday',
          everyTwoWeeks: true // This overlap: 1.0 + 0.5 = 1.5 ❌
        },
        {
          id: 'session-2',
          startTime: '11:30',
          endTime: '12:30',
          day: 'monday',
          everyTwoWeeks: true // No overlap
        }
      ];
      
      const result = validateRoomFractionalAvailability(newSession, existingSessions);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('החדר תפוס בזמן זה');
      expect(result.error).toContain('1.5');
    });

    it('should allow when all overlapping sessions stay within capacity', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday',
        everyTwoWeeks: true
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'session-1',
          startTime: '09:45',
          endTime: '10:30',
          day: 'monday',
          everyTwoWeeks: true // This overlap: 0.5 + 0.5 = 1.0 ✓
        },
        {
          id: 'session-2',
          startTime: '10:45',
          endTime: '11:30',
          day: 'monday',
          everyTwoWeeks: true // This overlap: 0.5 + 0.5 = 1.0 ✓
        },
        {
          id: 'session-3',
          startTime: '12:00',
          endTime: '13:00',
          day: 'monday',
          everyTwoWeeks: false // No overlap
        }
      ];
      
      const result = validateRoomFractionalAvailability(newSession, existingSessions);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('validateScheduleConstraintsFractional - Integration Tests', () => {
    it('should use fractional validation for both room and employee conflicts', () => {
      const employees = createMockEmployees();
      const rooms = createMockRooms();
      const activities: Activity[] = [];
      
      // Create a new every-two-weeks session
      const newSession: Session = {
        id: 'new-session',
        scheduleId: 'test-schedule',
        employeeIds: [employees[0].id],
        roomId: rooms[0].id,
        day: 'monday' as WeekDay,
        startTime: '10:00',
        endTime: '11:00',
        everyTwoWeeks: true,
        employees: [employees[0]],
        patients: []
      };

      // Create existing session that overlaps (also every-two-weeks)
      const existingSessions: Session[] = [
        {
          id: 'existing-session',
          scheduleId: 'test-schedule',
          employeeIds: [employees[0].id],
          roomId: rooms[0].id,
          day: 'monday' as WeekDay,
          startTime: '10:30',
          endTime: '11:30',
          everyTwoWeeks: true,
          employees: [employees[0]],
          patients: [],
          patientIds: []
        }
      ];

      const result = validateScheduleConstraintsFractional(
        newSession,
        existingSessions,
        employees,
        rooms,
        activities
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject when fractional validation fails for room', () => {
      const employees = createMockEmployees();
      const rooms = createMockRooms();
      const activities: Activity[] = [];
      
      // Create a new full session
      const newSession: Session = {
        id: 'new-session',
        scheduleId: 'test-schedule',
        employeeIds: [employees[0].id],
        roomId: rooms[0].id,
        day: 'monday' as WeekDay,
        startTime: '10:00',
        endTime: '11:00',
        everyTwoWeeks: false,
        employees: [employees[0]],
        patients: []
      };

      // Create existing every-two-weeks session that overlaps  
      const existingSessions: Session[] = [
        {
          id: 'existing-session',
          scheduleId: 'test-schedule',
          employeeIds: [employees[1].id], // Different employee
          roomId: rooms[0].id, // Same room
          day: 'monday' as WeekDay,
          startTime: '10:30',
          endTime: '11:30',
          everyTwoWeeks: true,
          employees: [employees[1]],
          patients: [],
          patientIds: []
        }
      ];

      const result = validateScheduleConstraintsFractional(
        newSession,
        existingSessions,
        employees,
        rooms,
        activities
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('החדר תפוס בזמן זה');
    });

    it('should reject when fractional validation fails for employee', () => {
      const employees = createMockEmployees();
      const rooms = createMockRooms();
      const activities: Activity[] = [];
      
      // Create a new full session
      const newSession: Session = {
        id: 'new-session',
        scheduleId: 'test-schedule',
        employeeIds: [employees[0].id],
        roomId: rooms[0].id,
        day: 'monday' as WeekDay,
        startTime: '10:00',
        endTime: '11:00',
        everyTwoWeeks: false,
        employees: [employees[0]],
        patients: []
      };

      // Create existing every-two-weeks session that overlaps with same employee
      const existingSessions: Session[] = [
        {
          id: 'existing-session',
          scheduleId: 'test-schedule',
          employeeIds: [employees[0].id], // Same employee
          roomId: rooms[1].id, // Different room
          day: 'monday' as WeekDay,
          startTime: '10:30',
          endTime: '11:30',
          everyTwoWeeks: true,
          employees: [employees[0]],
          patients: [],
          patientIds: []
        }
      ];

      const result = validateScheduleConstraintsFractional(
        newSession,
        existingSessions,
        employees,
        rooms,
        activities
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain(`העובד ${employees[0].firstName} ${employees[0].lastName} תפוס בזמן זה`);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle sessions that barely touch (end time = start time)', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '11:00',
        endTime: '12:00',
        day: 'monday',
        everyTwoWeeks: false
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'existing-session',
          startTime: '10:00',
          endTime: '11:00', // Ends exactly when new session starts
          day: 'monday',
          everyTwoWeeks: false
        }
      ];
      
      const result = validateRoomFractionalAvailability(newSession, existingSessions);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle undefined everyTwoWeeks (defaults to false)', () => {
      const newSession: SessionValidationInput = {
        id: 'new-session',
        startTime: '10:00',
        endTime: '11:00',
        day: 'monday'
        // everyTwoWeeks is undefined
      };
      
      const existingSessions: SessionValidationInput[] = [
        {
          id: 'existing-session',
          startTime: '10:30',
          endTime: '11:30',
          day: 'monday'
          // everyTwoWeeks is undefined
        }
      ];
      
      const result = validateRoomFractionalAvailability(newSession, existingSessions);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('2.0'); // Both should count as full sessions
    });
  });
});
