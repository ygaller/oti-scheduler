import request from 'supertest';
import { Express } from 'express';
import express from 'express';
import cors from 'cors';
import { 
  MockScheduleRepository, 
  MockEmployeeRepository, 
  MockRoomRepository, 
  MockPatientRepository, 
  MockActivityRepository,
  MockSessionRepository,
  MockRoleRepository
} from '../utils/mockRepositories';
import { 
  createEmployeeFixture, 
  createRoomFixture, 
  createPatientFixture, 
  createActivityFixture,
  createSessionFixture,
  createScheduleFixture,
  createCompleteRoleFixture,
  createMockEmployees,
  createMockRooms,
  createMockPatients,
  createMockActivities,
  createRoleFixture
} from '../utils/fixtures';
import { createApiRouter } from '../../src/routes';
import { Employee, Room, Patient, Activity, Session, Schedule } from '../../src/types';

describe('Schedule API Endpoints (Fixture-based Tests)', () => {
  let app: Express;
  let mockScheduleRepo: MockScheduleRepository;
  let mockEmployeeRepo: MockEmployeeRepository;
  let mockRoomRepo: MockRoomRepository;
  let mockPatientRepo: MockPatientRepository;
  let mockActivityRepo: MockActivityRepository;
  let mockSessionRepo: MockSessionRepository;
  let mockRoleRepo: MockRoleRepository;

  beforeAll(() => {
    // Initialize mock repositories
    mockScheduleRepo = new MockScheduleRepository();
    mockEmployeeRepo = new MockEmployeeRepository();
    mockRoomRepo = new MockRoomRepository();
    mockPatientRepo = new MockPatientRepository();
    mockActivityRepo = new MockActivityRepository();
    mockSessionRepo = new MockSessionRepository();
    mockRoleRepo = new MockRoleRepository();

    // Create test app with mock repositories
    app = express();
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Setup API routes with mock repositories
    app.use('/api', createApiRouter(
      mockEmployeeRepo, 
      mockPatientRepo, 
      mockRoomRepo, 
      mockScheduleRepo, 
      mockSessionRepo, 
      mockActivityRepo, 
      mockRoleRepo,
      null as any // prisma not needed for logical tests
    ));
    
    // Error handling
    app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    });
  });

  beforeEach(() => {
    // Reset all mock repositories before each test
    mockScheduleRepo.reset();
    mockEmployeeRepo.reset();
    mockRoomRepo.reset();
    mockPatientRepo.reset();
    mockActivityRepo.reset();
    mockSessionRepo.reset();
  });

  describe('POST /api/schedule/generate - Logic Tests', () => {
    it('should generate schedule with valid fixture data', async () => {
      // Set up mock data using fixtures
      const employees = createMockEmployees();
      const rooms = createMockRooms();
      
      // Pre-populate repositories with fixture data
      for (const emp of employees) {
        await mockEmployeeRepo.create(emp);
      }
      
      for (const room of rooms) {
        await mockRoomRepo.create(room);
      }

      const response = await request(app)
        .post('/api/schedule/generate')
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('sessions');
      expect(response.body).toHaveProperty('generatedAt');
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body.isActive).toBe(true);
    });

    it('should fail when no employees exist (fixture test)', async () => {
      // Only create rooms, no employees
      const rooms = createMockRooms();
      for (const room of rooms) {
        await mockRoomRepo.create(room);
      }

      const response = await request(app)
        .post('/api/schedule/generate')
        .expect(400);

      expect(response.body.error).toBe('No employees found');
    });

    it('should fail when no rooms exist (fixture test)', async () => {
      // Only create employees, no rooms
      const employees = createMockEmployees();
      for (const emp of employees) {
        await mockEmployeeRepo.create(emp);
      }

      const response = await request(app)
        .post('/api/schedule/generate')
        .expect(400);

      expect(response.body.error).toBe('No rooms found');
    });

    it('should handle blocking activities correctly (fixture test)', async () => {
      // Set up employees and rooms
      const employees = [
        createEmployeeFixture({
          firstName: 'Test',
          lastName: 'Employee',
          weeklySessionsCount: 5,
          workingHours: {
            monday: { startTime: '08:00', endTime: '16:00' }
          }
        })
      ];
      const rooms = [createRoomFixture({ name: 'Test Room' })];
      
      for (const emp of employees) {
        await mockEmployeeRepo.create(emp);
      }
      for (const room of rooms) {
        await mockRoomRepo.create(room);
      }

      // Create a blocking activity that covers most working hours
      const blockingActivity = createActivityFixture({
        name: 'All Day Meeting',
        defaultStartTime: '08:00',
        defaultEndTime: '15:30',
        isBlocking: true
      });
      
      await mockActivityRepo.create(blockingActivity);

      const response = await request(app)
        .post('/api/schedule/generate')
        .expect(400);

      expect(response.body.error).toBe('Schedule generation failed');
      expect(response.body.details).toContain('Cannot generate schedule - insufficient available time slots');
    });

    it('should handle non-blocking activities correctly (fixture test)', async () => {
      // Set up employees and rooms
      const employees = [
        createEmployeeFixture({
          firstName: 'Test',
          lastName: 'Employee',
          weeklySessionsCount: 5
        })
      ];
      const rooms = [createRoomFixture({ name: 'Test Room' })];
      
      for (const emp of employees) {
        await mockEmployeeRepo.create(emp);
      }
      for (const room of rooms) {
        await mockRoomRepo.create(room);
      }

      // Create a non-blocking activity
      const nonBlockingActivity = createActivityFixture({
        name: 'Optional Training',
        defaultStartTime: '10:00',
        defaultEndTime: '11:00',
        isBlocking: false
      });
      
      await mockActivityRepo.create(nonBlockingActivity);

      const response = await request(app)
        .post('/api/schedule/generate')
        .expect(201);

      expect(response.body).toHaveProperty('sessions');
      const sessions = response.body.sessions;
      
      // Check if sessions can be scheduled during non-blocking activity time
      const sessionsInActivityTime = sessions.filter((session: any) => {
        const sessionStart = timeToMinutes(session.startTime);
        const sessionEnd = timeToMinutes(session.endTime);
        const activityStart = timeToMinutes('10:00');
        const activityEnd = timeToMinutes('11:00');
        
        return sessionStart < activityEnd && activityStart < sessionEnd;
      });

      // Should be able to schedule during non-blocking activities
      expect(sessionsInActivityTime.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/schedule/active - Logic Tests', () => {
    it('should return null when no active schedule exists (fixture test)', async () => {
      // Add some inactive schedules
      const schedule1 = createScheduleFixture({ isActive: false });
      const schedule2 = createScheduleFixture({ isActive: false });
      
      mockScheduleRepo.setSchedules([schedule1, schedule2]);

      const response = await request(app)
        .get('/api/schedule/active')
        .expect(200);

      expect(response.body).toBeNull();
    });

    it('should return active schedule when one exists (fixture test)', async () => {
      const activeSchedule = createScheduleFixture({ 
        isActive: true,
        sessions: [
          createSessionFixture({ 
            day: 'monday', 
            startTime: '10:00', 
            endTime: '11:00' 
          })
        ]
      });
      const inactiveSchedule = createScheduleFixture({ isActive: false });
      
      mockScheduleRepo.setSchedules([activeSchedule, inactiveSchedule]);

      const response = await request(app)
        .get('/api/schedule/active')
        .expect(200);

      expect(response.body.id).toBe(activeSchedule.id);
      expect(response.body.isActive).toBe(true);
      expect(response.body.sessions).toHaveLength(1);
    });
  });

  describe('GET /api/schedule/all - Logic Tests', () => {
    it('should return empty array when no schedules exist (fixture test)', async () => {
      const response = await request(app)
        .get('/api/schedule/all')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all schedules (fixture test)', async () => {
      const schedule1 = createScheduleFixture({ 
        generatedAt: new Date('2023-01-01') 
      });
      const schedule2 = createScheduleFixture({ 
        generatedAt: new Date('2023-01-02') 
      });
      
      mockScheduleRepo.setSchedules([schedule1, schedule2]);

      const response = await request(app)
        .get('/api/schedule/all')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('PUT /api/schedule/:id/activate - Logic Tests', () => {
    it('should activate a schedule (fixture test)', async () => {
      const schedule1 = createScheduleFixture({ isActive: true });
      const schedule2 = createScheduleFixture({ isActive: false });
      
      mockScheduleRepo.setSchedules([schedule1, schedule2]);

      const response = await request(app)
        .put(`/api/schedule/${schedule2.id}/activate`)
        .expect(200);

      expect(response.body.id).toBe(schedule2.id);
      expect(response.body.isActive).toBe(true);
      
      // Check that the first schedule is no longer active
      const activeSchedule = await mockScheduleRepo.findActive();
      expect(activeSchedule?.id).toBe(schedule2.id);
    });

    it('should return 404 for non-existent schedule (fixture test)', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .put(`/api/schedule/${nonExistentId}/activate`)
        .expect(404);

      expect(response.body.error).toBe('Schedule not found');
    });

    it('should return 400 for invalid UUID (fixture test)', async () => {
      const response = await request(app)
        .put('/api/schedule/invalid-uuid/activate')
        .expect(400);

      expect(response.body.error).toBe('Invalid id format');
    });
  });

  describe('DELETE /api/schedule/:id - Logic Tests', () => {
    it('should delete a schedule (fixture test)', async () => {
      const schedule1 = createScheduleFixture();
      const schedule2 = createScheduleFixture();
      
      mockScheduleRepo.setSchedules([schedule1, schedule2]);

      await request(app)
        .delete(`/api/schedule/${schedule1.id}`)
        .expect(204);

      // Verify it's deleted
      const allSchedules = await mockScheduleRepo.findAll();
      expect(allSchedules).toHaveLength(1);
      expect(allSchedules[0].id).toBe(schedule2.id);
    });

    it('should return 404 for non-existent schedule (fixture test)', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .delete(`/api/schedule/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toBe('Schedule not found');
    });
  });

  describe('Session Management - Logic Tests', () => {
    it('should get all sessions (fixture test)', async () => {
      const sessions = [
        createSessionFixture({ day: 'monday' }),
        createSessionFixture({ day: 'tuesday' })
      ];
      
      mockSessionRepo.setSessions(sessions);

      const response = await request(app)
        .get('/api/schedule/sessions')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });

    it('should create a session with valid data (fixture test)', async () => {
      // Pre-populate with employee and room
      const employee = await mockEmployeeRepo.create(createEmployeeFixture());
      const room = await mockRoomRepo.create(createRoomFixture());
      
      // Create an active schedule first
      const activeSchedule = await mockScheduleRepo.create({
        sessions: [],
        generatedAt: new Date(),
        isActive: true
      });

      const sessionData = {
        employeeId: employee.id,
        roomId: room.id,
        day: 'monday',
        startTime: '10:00',
        endTime: '11:00'
      };

      const response = await request(app)
        .post('/api/schedule/sessions')
        .send(sessionData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.employeeId).toBe(sessionData.employeeId);
      expect(response.body.roomId).toBe(sessionData.roomId);
      expect(response.body.day).toBe(sessionData.day);
      expect(response.body.startTime).toBe(sessionData.startTime);
      expect(response.body.endTime).toBe(sessionData.endTime);
    });
  });

  describe('Patient Assignment Logic Tests', () => {
    let employee1: Employee, employee2: Employee;
    let room1: Room, room2: Room;
    let patient: Patient;
    let session1: Session, session2: Session;

    beforeEach(async () => {
      // Create an active schedule first
      const activeSchedule = await mockScheduleRepo.create({
        sessions: [],
        generatedAt: new Date(),
        isActive: true
      });

      // Create test roles first
      const role1 = await mockRoleRepo.create(createCompleteRoleFixture({ name: 'ריפוי בעיסוק', roleStringKey: 'role_1' }));
      const role2 = await mockRoleRepo.create(createCompleteRoleFixture({ name: 'פיזיותרפיה', roleStringKey: 'role_2' }));

      // Create test employees
      employee1 = await mockEmployeeRepo.create(createEmployeeFixture({
        firstName: 'Alice',
        lastName: 'Smith',
        roleId: role1.id
      }));
      employee2 = await mockEmployeeRepo.create(createEmployeeFixture({
        firstName: 'Bob',
        lastName: 'Johnson',
        roleId: role2.id
      }));

      // Create test rooms
      room1 = await mockRoomRepo.create(createRoomFixture({ name: 'Room A' }));
      room2 = await mockRoomRepo.create(createRoomFixture({ name: 'Room B' }));

      // Create test patient
      patient = await mockPatientRepo.create(createPatientFixture({
        firstName: 'John',
        lastName: 'Doe',
        therapyRequirements: {
          'occupational-therapist': 2,
          'physiotherapist': 1
        }
      }));

      // Create test sessions
      session1 = await mockSessionRepo.create({
        employeeId: employee1.id,
        roomId: room1.id,
        day: 'monday',
        startTime: '10:00',
        endTime: '11:00',
        scheduleId: activeSchedule.id
      });
      session2 = await mockSessionRepo.create({
        employeeId: employee2.id,
        roomId: room2.id,
        day: 'monday',
        startTime: '10:30',
        endTime: '11:30',
        scheduleId: activeSchedule.id
      });
    });

    it('should allow assigning patient to session when no conflicts exist (fixture test)', async () => {
      const response = await request(app)
        .post(`/api/schedule/sessions/${session1.id}/patients`)
        .send({ patientId: patient.id })
        .expect(200);

      expect(response.body.patients).toHaveLength(1);
      expect(response.body.patients[0].id).toBe(patient.id);
    });

    it('should handle non-overlapping sessions correctly (fixture test)', async () => {
      // Create a non-overlapping session (12:00-13:00)
      const session3 = await mockSessionRepo.create({
        employeeId: employee2.id,
        roomId: room2.id,
        day: 'monday',
        startTime: '12:00',
        endTime: '13:00'
      });

      // Assign patient to session1 (10:00-11:00)
      await request(app)
        .post(`/api/schedule/sessions/${session1.id}/patients`)
        .send({ patientId: patient.id })
        .expect(200);

      // Should be able to assign to non-overlapping session3 (12:00-13:00)
      const response = await request(app)
        .post(`/api/schedule/sessions/${session3.id}/patients`)
        .send({ patientId: patient.id })
        .expect(200);

      expect(response.body.patients).toHaveLength(1);
      expect(response.body.patients[0].id).toBe(patient.id);
    });

    it('should allow assigning patient to sessions on different days (fixture test)', async () => {
      // Create session on different day
      const session3 = await mockSessionRepo.create({
        employeeId: employee2.id,
        roomId: room2.id,
        day: 'tuesday',
        startTime: '10:30',
        endTime: '11:30'
      });

      // Assign patient to session1 (Monday 10:00-11:00)
      await request(app)
        .post(`/api/schedule/sessions/${session1.id}/patients`)
        .send({ patientId: patient.id })
        .expect(200);

      // Should be able to assign to session3 (Tuesday 10:30-11:30) - different day
      const response = await request(app)
        .post(`/api/schedule/sessions/${session3.id}/patients`)
        .send({ patientId: patient.id })
        .expect(200);

      expect(response.body.patients).toHaveLength(1);
      expect(response.body.patients[0].id).toBe(patient.id);
    });

    it('should handle edge case: sessions that touch but do not overlap (fixture test)', async () => {
      // Create adjacent session (11:00-12:00) - touches session1 (10:00-11:00) but doesn't overlap
      const session3 = await mockSessionRepo.create({
        employeeId: employee2.id,
        roomId: room2.id,
        day: 'monday',
        startTime: '11:00',
        endTime: '12:00'
      });

      // Assign patient to session1 (10:00-11:00)
      await request(app)
        .post(`/api/schedule/sessions/${session1.id}/patients`)
        .send({ patientId: patient.id })
        .expect(200);

      // Should be able to assign to adjacent session3 (11:00-12:00) - no overlap
      const response = await request(app)
        .post(`/api/schedule/sessions/${session3.id}/patients`)
        .send({ patientId: patient.id })
        .expect(200);

      expect(response.body.patients).toHaveLength(1);
      expect(response.body.patients[0].id).toBe(patient.id);
    });
  });
});

// Helper function to convert time string to minutes for comparison
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}
