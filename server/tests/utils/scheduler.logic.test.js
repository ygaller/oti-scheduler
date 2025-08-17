"use strict";
/**
 * Scheduler validation logic tests
 * Tests validation functions used for manual session creation and scheduling constraints
 */
Object.defineProperty(exports, "__esModule", { value: true });
const scheduler_1 = require("../../src/utils/scheduler");
const fixtures_1 = require("../utils/fixtures");
const createMockActivities = () => [
    (0, fixtures_1.createActivityFixture)({
        name: 'Lunch Break',
        defaultStartTime: '12:00',
        defaultEndTime: '13:00',
        isBlocking: true
    }),
    (0, fixtures_1.createActivityFixture)({
        name: 'Staff Break',
        defaultStartTime: '15:00',
        defaultEndTime: '15:30',
        isBlocking: true
    })
];
describe('Scheduler Validation Tests', () => {
    describe('validateScheduleConstraints', () => {
        it('should validate session with valid data', () => {
            const employees = (0, fixtures_1.createMockEmployees)();
            const rooms = (0, fixtures_1.createMockRooms)();
            const activities = [];
            const allSessions = [];
            const session = {
                id: 'test-session',
                scheduleId: 'test-schedule',
                employeeIds: [employees[0].id],
                roomId: rooms[0].id,
                day: 'monday',
                startTime: '09:00',
                endTime: '09:45',
                employees: [employees[0]],
                patients: []
            };
            const result = (0, scheduler_1.validateScheduleConstraints)(session, allSessions, employees, rooms, activities);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });
        it('should reject session with no employees assigned', () => {
            const employees = (0, fixtures_1.createMockEmployees)();
            const rooms = (0, fixtures_1.createMockRooms)();
            const activities = [];
            const allSessions = [];
            const session = {
                id: 'test-session',
                scheduleId: 'test-schedule',
                employeeIds: [], // No employees
                roomId: rooms[0].id,
                day: 'monday',
                startTime: '09:00',
                endTime: '09:45',
                employees: [],
                patients: []
            };
            const result = (0, scheduler_1.validateScheduleConstraints)(session, allSessions, employees, rooms, activities);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('לפחות עובד אחד חייב להיות משויך לטיפול');
        });
        it('should reject session with non-existent room', () => {
            const employees = (0, fixtures_1.createMockEmployees)();
            const rooms = (0, fixtures_1.createMockRooms)();
            const activities = [];
            const allSessions = [];
            const session = {
                id: 'test-session',
                scheduleId: 'test-schedule',
                employeeIds: [employees[0].id],
                roomId: 'non-existent-room',
                day: 'monday',
                startTime: '09:00',
                endTime: '09:45',
                employees: [employees[0]],
                patients: []
            };
            const result = (0, scheduler_1.validateScheduleConstraints)(session, allSessions, employees, rooms, activities);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('חדר לא נמצא');
        });
        it('should reject session with non-existent employee', () => {
            const employees = (0, fixtures_1.createMockEmployees)();
            const rooms = (0, fixtures_1.createMockRooms)();
            const activities = [];
            const allSessions = [];
            const session = {
                id: 'test-session',
                scheduleId: 'test-schedule',
                employeeIds: ['non-existent-employee'],
                roomId: rooms[0].id,
                day: 'monday',
                startTime: '09:00',
                endTime: '09:45',
                employees: [],
                patients: []
            };
            const result = (0, scheduler_1.validateScheduleConstraints)(session, allSessions, employees, rooms, activities);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('עובד לא נמצא');
        });
        it('should reject session outside employee working hours', () => {
            const employees = (0, fixtures_1.createMockEmployees)();
            const rooms = (0, fixtures_1.createMockRooms)();
            const activities = [];
            const allSessions = [];
            const session = {
                id: 'test-session',
                scheduleId: 'test-schedule',
                employeeIds: [employees[0].id],
                roomId: rooms[0].id,
                day: 'monday',
                startTime: '07:00', // Before working hours
                endTime: '07:45',
                employees: [employees[0]],
                patients: []
            };
            const result = (0, scheduler_1.validateScheduleConstraints)(session, allSessions, employees, rooms, activities);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('מחוץ לשעות העבודה');
        });
        it('should reject session when employee is busy', () => {
            const employees = (0, fixtures_1.createMockEmployees)();
            const rooms = (0, fixtures_1.createMockRooms)();
            const activities = [];
            const existingSession = {
                id: 'existing-session',
                scheduleId: 'test-schedule',
                employeeIds: [employees[0].id],
                roomId: rooms[1].id,
                day: 'monday',
                startTime: '09:00',
                endTime: '09:45',
                employees: [employees[0]],
                patients: []
            };
            const newSession = {
                id: 'new-session',
                scheduleId: 'test-schedule',
                employeeIds: [employees[0].id], // Same employee
                roomId: rooms[0].id,
                day: 'monday',
                startTime: '09:15', // Overlapping time
                endTime: '10:00',
                employees: [employees[0]],
                patients: []
            };
            const result = (0, scheduler_1.validateScheduleConstraints)(newSession, [existingSession], employees, rooms, activities);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('תפוס בזמן זה');
        });
        it('should reject session when room is busy', () => {
            const employees = (0, fixtures_1.createMockEmployees)();
            const rooms = (0, fixtures_1.createMockRooms)();
            const activities = [];
            const existingSession = {
                id: 'existing-session',
                scheduleId: 'test-schedule',
                employeeIds: [employees[0].id],
                roomId: rooms[0].id,
                day: 'monday',
                startTime: '09:00',
                endTime: '09:45',
                employees: [employees[0]],
                patients: []
            };
            const newSession = {
                id: 'new-session',
                scheduleId: 'test-schedule',
                employeeIds: [employees[1].id], // Different employee
                roomId: rooms[0].id, // Same room
                day: 'monday',
                startTime: '09:15', // Overlapping time
                endTime: '10:00',
                employees: [employees[1]],
                patients: []
            };
            const result = (0, scheduler_1.validateScheduleConstraints)(newSession, [existingSession], employees, rooms, activities);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('החדר תפוס בזמן זה');
        });
        it('should reject session during blocked activities', () => {
            const employees = (0, fixtures_1.createMockEmployees)();
            const rooms = (0, fixtures_1.createMockRooms)();
            const activities = createMockActivities();
            const allSessions = [];
            const session = {
                id: 'test-session',
                scheduleId: 'test-schedule',
                employeeIds: [employees[0].id],
                roomId: rooms[0].id,
                day: 'monday',
                startTime: '12:15', // During lunch break (12:00-13:00)
                endTime: '13:00',
                employees: [employees[0]],
                patients: []
            };
            const result = (0, scheduler_1.validateScheduleConstraints)(session, allSessions, employees, rooms, activities);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('לא ניתן לתזמן טיפול בזמן חסום');
        });
    });
    describe('timesOverlap utility function', () => {
        it('should correctly detect time overlaps', () => {
            // Test various overlap scenarios
            expect((0, scheduler_1.timesOverlap)('10:00', '11:00', '10:30', '11:30')).toBe(true); // Partial overlap
            expect((0, scheduler_1.timesOverlap)('10:00', '11:00', '09:30', '10:30')).toBe(true); // Partial overlap
            expect((0, scheduler_1.timesOverlap)('10:00', '11:00', '09:00', '12:00')).toBe(true); // Complete overlap
            expect((0, scheduler_1.timesOverlap)('10:00', '11:00', '11:00', '12:00')).toBe(false); // Adjacent (no overlap)
            expect((0, scheduler_1.timesOverlap)('10:00', '11:00', '08:00', '09:00')).toBe(false); // No overlap
            expect((0, scheduler_1.timesOverlap)('10:00', '11:00', '12:00', '13:00')).toBe(false); // No overlap
        });
        it('should handle edge cases correctly', () => {
            // Test edge cases
            expect((0, scheduler_1.timesOverlap)('10:00', '10:00', '10:00', '10:00')).toBe(false); // Zero duration
            expect((0, scheduler_1.timesOverlap)('10:00', '10:01', '10:00', '10:01')).toBe(true); // Same 1-minute slot
            expect((0, scheduler_1.timesOverlap)('23:59', '23:59', '00:00', '00:01')).toBe(false); // Cross midnight (separate days)
        });
    });
});
//# sourceMappingURL=scheduler.logic.test.js.map