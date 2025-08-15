import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../utils/testServer';
import { createEmployeeFixture, createRoomFixture } from '../utils/fixtures';
import { prisma } from '../setup';

describe('Schedule API Endpoints', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp(prisma);
  });

  describe('POST /api/schedule/generate', () => {
    beforeEach(async () => {
      // Clean up before each test
      await prisma.session.deleteMany();
      await prisma.schedule.deleteMany();
      await prisma.employee.deleteMany();
      await prisma.room.deleteMany();
      await prisma.activity.deleteMany();
    });

    it('should generate schedule with valid data', async () => {
      // Create test employees
      const employee1 = createEmployeeFixture({
        firstName: 'Alice',
        lastName: 'Smith',
        role: 'occupational-therapist',
        workingHours: {
          sunday: { startTime: '08:00', endTime: '16:00' },
          monday: { startTime: '08:00', endTime: '16:00' },
          tuesday: { startTime: '08:00', endTime: '16:00' },
          wednesday: { startTime: '08:00', endTime: '16:00' },
          thursday: { startTime: '08:00', endTime: '16:00' }
        },
        weeklySessionsCount: 20
      });

      const employee2 = createEmployeeFixture({
        firstName: 'Bob',
        lastName: 'Johnson', 
        role: 'physiotherapist',
        workingHours: {
          sunday: { startTime: '09:00', endTime: '17:00' },
          monday: { startTime: '09:00', endTime: '17:00' },
          tuesday: { startTime: '09:00', endTime: '17:00' },
          wednesday: { startTime: '09:00', endTime: '17:00' },
          thursday: { startTime: '09:00', endTime: '17:00' }
        },
        weeklySessionsCount: 15
      });

      // Create employees in database
      await request(app).post('/api/employees').send(employee1);
      await request(app).post('/api/employees').send(employee2);

      // Create test rooms
      const room1 = createRoomFixture({ name: 'Therapy Room 1' });
      const room2 = createRoomFixture({ name: 'Therapy Room 2' });

      await request(app).post('/api/rooms').send(room1);
      await request(app).post('/api/rooms').send(room2);

      // Generate schedule
      const response = await request(app)
        .post('/api/schedule/generate')
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('sessions');
      expect(response.body).toHaveProperty('generatedAt');
      expect(Array.isArray(response.body.sessions)).toBe(true);
    });

    it('should fail when no employees exist', async () => {
      // Create rooms but no employees
      const room1 = createRoomFixture({ name: 'Test Room' });
      await request(app).post('/api/rooms').send(room1);

      const response = await request(app)
        .post('/api/schedule/generate')
        .expect(400);

      expect(response.body.error).toBe('No employees found');
    });

    it('should fail when no rooms exist', async () => {
      // Create employees but no rooms
      const employee1 = createEmployeeFixture({
        firstName: 'Test',
        lastName: 'Employee'
      });
      await request(app).post('/api/employees').send(employee1);

      const response = await request(app)
        .post('/api/schedule/generate')
        .expect(400);

      expect(response.body.error).toBe('No rooms found');
    });

    it('should fail when insufficient time slots for employee weekly sessions', async () => {
      // Create an employee with very high session requirements
      const employee = createEmployeeFixture({
        firstName: 'High',
        lastName: 'Demand',
        weeklySessionsCount: 100, // Impossible to schedule 100 sessions in a week
        workingHours: {
          sunday: { startTime: '10:00', endTime: '11:00' }, // Only 1 hour per day
          monday: { startTime: '10:00', endTime: '11:00' },
          tuesday: { startTime: '10:00', endTime: '11:00' },
          wednesday: { startTime: '10:00', endTime: '11:00' },
          thursday: { startTime: '10:00', endTime: '11:00' }
        }
      });
      
      const room = createRoomFixture({ name: 'Test Room' });

      await request(app).post('/api/employees').send(employee);
      await request(app).post('/api/rooms').send(room);

      const response = await request(app)
        .post('/api/schedule/generate')
        .expect(400);

      expect(response.body.error).toBe('Schedule generation failed');
      expect(response.body.details).toContain('Cannot generate schedule - insufficient available time slots');
      expect(response.body.details).toContain('High Demand');
      expect(response.body.details).toContain('required 100 sessions');
    });

    it('should fail when blocking activities prevent scheduling enough sessions', async () => {
      // Create an employee who needs many sessions
      const employee = createEmployeeFixture({
        firstName: 'Blocked',
        lastName: 'Employee',
        weeklySessionsCount: 15,
        workingHours: {
          sunday: { startTime: '08:00', endTime: '16:00' },
          monday: { startTime: '08:00', endTime: '16:00' },
          tuesday: { startTime: '08:00', endTime: '16:00' },
          wednesday: { startTime: '08:00', endTime: '16:00' },
          thursday: { startTime: '08:00', endTime: '16:00' }
        }
      });
      
      const room = createRoomFixture({ name: 'Test Room' });

      await request(app).post('/api/employees').send(employee);
      await request(app).post('/api/rooms').send(room);

      // Create blocking activities that cover most of the working hours
      const blockingActivity1 = {
        name: 'Morning Meeting',
        color: '#ff5733',
        defaultStartTime: '08:00',
        defaultEndTime: '12:00', // Blocks morning
        dayOverrides: {},
        isBlocking: true,
        isActive: true
      };

      const blockingActivity2 = {
        name: 'Afternoon Training',
        color: '#ff5733',
        defaultStartTime: '13:00',
        defaultEndTime: '16:00', // Blocks afternoon
        dayOverrides: {},
        isBlocking: true,
        isActive: true
      };

      await request(app).post('/api/activities').send(blockingActivity1);
      await request(app).post('/api/activities').send(blockingActivity2);

      const response = await request(app)
        .post('/api/schedule/generate')
        .expect(400);

      expect(response.body.error).toBe('Schedule generation failed');
      expect(response.body.details).toContain('Cannot generate schedule - insufficient available time slots');
      expect(response.body.details).toContain('Blocked Employee');
      expect(response.body.details).toContain('required 15 sessions');
    });
  });

  describe('GET /api/schedule/active', () => {
    beforeEach(async () => {
      await prisma.session.deleteMany();
      await prisma.schedule.deleteMany();
      await prisma.employee.deleteMany();
      await prisma.room.deleteMany();
      await prisma.activity.deleteMany();
    });

    it('should return null when no active schedule exists', async () => {
      const response = await request(app)
        .get('/api/schedule/active')
        .expect(200);

      expect(response.body).toBeNull();
    });

    it('should return active schedule when one exists', async () => {
      // Set up test data
      const employee = createEmployeeFixture();
      const room = createRoomFixture();

      await request(app).post('/api/employees').send(employee);
      await request(app).post('/api/rooms').send(room);

      // Generate a schedule (which becomes active by default)
      const generateResponse = await request(app)
        .post('/api/schedule/generate')
        .expect(201);

      // Get active schedule
      const response = await request(app)
        .get('/api/schedule/active')
        .expect(200);

      expect(response.body).toEqual(generateResponse.body);
    });
  });

  describe('GET /api/schedule/all', () => {
    beforeEach(async () => {
      await prisma.session.deleteMany();
      await prisma.schedule.deleteMany();
      await prisma.employee.deleteMany();
      await prisma.room.deleteMany();
      await prisma.activity.deleteMany();
    });

    it('should return empty array when no schedules exist', async () => {
      const response = await request(app)
        .get('/api/schedule/all')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all schedules', async () => {
      // Set up test data
      const employee = createEmployeeFixture();
      const room = createRoomFixture();

      await request(app).post('/api/employees').send(employee);
      await request(app).post('/api/rooms').send(room);

      // Generate two schedules
      await request(app).post('/api/schedule/generate').expect(201);
      await request(app).post('/api/schedule/generate').expect(201);

      const response = await request(app)
        .get('/api/schedule/all')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('PUT /api/schedule/:id/activate', () => {
    beforeEach(async () => {
      await prisma.session.deleteMany();
      await prisma.schedule.deleteMany();
      await prisma.employee.deleteMany();
      await prisma.room.deleteMany();
      await prisma.activity.deleteMany();
    });

    it('should activate a schedule', async () => {
      // Set up test data
      const employee = createEmployeeFixture();
      const room = createRoomFixture();

      await request(app).post('/api/employees').send(employee);
      await request(app).post('/api/rooms').send(room);

      // Generate a schedule
      const generateResponse = await request(app)
        .post('/api/schedule/generate')
        .expect(201);

      const scheduleId = generateResponse.body.id;

      // Activate the schedule
      const response = await request(app)
        .put(`/api/schedule/${scheduleId}/activate`)
        .expect(200);

      expect(response.body.id).toBe(scheduleId);
      expect(response.body.isActive).toBe(true);
    });

    it('should return 404 for non-existent schedule', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .put(`/api/schedule/${nonExistentId}/activate`)
        .expect(404);

      expect(response.body.error).toBe('Schedule not found');
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .put('/api/schedule/invalid-uuid/activate')
        .expect(400);

      expect(response.body.error).toBe('Invalid id format');
    });
  });

  describe('DELETE /api/schedule/:id', () => {
    beforeEach(async () => {
      await prisma.session.deleteMany();
      await prisma.schedule.deleteMany();
      await prisma.employee.deleteMany();
      await prisma.room.deleteMany();
      await prisma.activity.deleteMany();
    });

    it('should delete a schedule', async () => {
      // Set up test data
      const employee = createEmployeeFixture();
      const room = createRoomFixture();

      await request(app).post('/api/employees').send(employee);
      await request(app).post('/api/rooms').send(room);

      // Generate a schedule
      const generateResponse = await request(app)
        .post('/api/schedule/generate')
        .expect(201);

      const scheduleId = generateResponse.body.id;

      // Delete the schedule
      await request(app)
        .delete(`/api/schedule/${scheduleId}`)
        .expect(204);

      // Verify it's deleted
      const allSchedules = await request(app)
        .get('/api/schedule/all')
        .expect(200);

      expect(allSchedules.body).toHaveLength(0);
    });

    it('should return 404 for non-existent schedule', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .delete(`/api/schedule/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toBe('Schedule not found');
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      await prisma.sessionPatient.deleteMany();
      await prisma.session.deleteMany();
      await prisma.schedule.deleteMany();
      await prisma.employee.deleteMany();
      await prisma.room.deleteMany();
      await prisma.activity.deleteMany();
      await prisma.patient.deleteMany();
    });

    it('should get all sessions', async () => {
      const response = await request(app)
        .get('/api/schedule/sessions')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should create a session with valid data', async () => {
      // Set up test data
      const employee = createEmployeeFixture();
      const room = createRoomFixture();

      const employeeResponse = await request(app).post('/api/employees').send(employee);
      const roomResponse = await request(app).post('/api/rooms').send(room);

      const sessionData = {
        employeeId: employeeResponse.body.id,
        roomId: roomResponse.body.id,
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

  describe('Patient Assignment Conflict Validation', () => {
    let employee1: any, employee2: any, room1: any, room2: any, patient: any;
    let session1: any, session2: any;

    beforeEach(async () => {
      // Clean up
      await prisma.sessionPatient.deleteMany();
      await prisma.session.deleteMany();
      await prisma.schedule.deleteMany();
      await prisma.employee.deleteMany();
      await prisma.room.deleteMany();
      await prisma.activity.deleteMany();
      await prisma.patient.deleteMany();

      // Create test employees
      const employee1Data = createEmployeeFixture({
        firstName: 'Alice',
        lastName: 'Smith',
        role: 'occupational-therapist'
      });
      const employee2Data = createEmployeeFixture({
        firstName: 'Bob',
        lastName: 'Johnson',
        role: 'physiotherapist'
      });

      const employee1Response = await request(app).post('/api/employees').send(employee1Data);
      const employee2Response = await request(app).post('/api/employees').send(employee2Data);
      employee1 = employee1Response.body;
      employee2 = employee2Response.body;

      // Create test rooms
      const room1Response = await request(app).post('/api/rooms').send(createRoomFixture({ name: 'Room A' }));
      const room2Response = await request(app).post('/api/rooms').send(createRoomFixture({ name: 'Room B' }));
      room1 = room1Response.body;
      room2 = room2Response.body;

      // Create test patient
      const patientResponse = await request(app).post('/api/patients').send({
        firstName: 'John',
        lastName: 'Doe',
        color: '#ff5733',
        therapyRequirements: {
          'occupational-therapist': 2,
          'physiotherapist': 1
        }
      });
      patient = patientResponse.body;

      // Create test sessions
      const session1Response = await request(app).post('/api/schedule/sessions').send({
        employeeId: employee1.id,
        roomId: room1.id,
        day: 'monday',
        startTime: '10:00',
        endTime: '11:00'
      });
      const session2Response = await request(app).post('/api/schedule/sessions').send({
        employeeId: employee2.id,
        roomId: room2.id,
        day: 'monday',
        startTime: '10:30',
        endTime: '11:30'
      });
      session1 = session1Response.body;
      session2 = session2Response.body;
    });

    it('should allow assigning patient to session when no conflicts exist', async () => {
      const response = await request(app)
        .post(`/api/schedule/sessions/${session1.id}/patients`)
        .send({ patientId: patient.id })
        .expect(200);

      expect(response.body.patients).toHaveLength(1);
      expect(response.body.patients[0].id).toBe(patient.id);
    });

    it('should prevent assigning patient to overlapping session', async () => {
      // First assign patient to session1 (10:00-11:00)
      await request(app)
        .post(`/api/schedule/sessions/${session1.id}/patients`)
        .send({ patientId: patient.id })
        .expect(200);

      // Try to assign same patient to session2 (10:30-11:30) - should conflict
      const response = await request(app)
        .post(`/api/schedule/sessions/${session2.id}/patients`)
        .send({ patientId: patient.id })
        .expect(400);

      expect(response.body.error).toContain('המטופל כבר משויך לטיפול אחר באותו זמן');
      expect(response.body.error).toContain('10:00-11:00');
      expect(response.body.error).toContain('Alice Smith');
      expect(response.body.error).toContain('Room A');
    });

    it('should allow assigning patient to non-overlapping sessions on same day', async () => {
      // Create a non-overlapping session (12:00-13:00)
      const session3Response = await request(app).post('/api/schedule/sessions').send({
        employeeId: employee2.id,
        roomId: room2.id,
        day: 'monday',
        startTime: '12:00',
        endTime: '13:00'
      });
      const session3 = session3Response.body;

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

    it('should allow assigning patient to sessions on different days', async () => {
      // Create session on different day
      const session3Response = await request(app).post('/api/schedule/sessions').send({
        employeeId: employee2.id,
        roomId: room2.id,
        day: 'tuesday',
        startTime: '10:30',
        endTime: '11:30'
      });
      const session3 = session3Response.body;

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

    it('should validate conflicts when bulk updating session patients', async () => {
      // Create second patient
      const patient2Response = await request(app).post('/api/patients').send({
        firstName: 'Jane',
        lastName: 'Smith',
        color: '#33ff57',
        therapyRequirements: { 'occupational-therapist': 1 }
      });
      const patient2 = patient2Response.body;

      // Assign patient to session1 (10:00-11:00)
      await request(app)
        .post(`/api/schedule/sessions/${session1.id}/patients`)
        .send({ patientId: patient.id })
        .expect(200);

      // Try to bulk assign both patients to session2 (10:30-11:30) - patient1 should conflict
      const response = await request(app)
        .put(`/api/schedule/sessions/${session2.id}/patients`)
        .send({ patientIds: [patient.id, patient2.id] })
        .expect(400);

      expect(response.body.error).toContain('המטופל כבר משויך לטיפול אחר באותו זמן');
      expect(response.body.error).toContain('10:00-11:00');
    });

    it('should allow bulk updating when no conflicts exist', async () => {
      // Create second patient
      const patient2Response = await request(app).post('/api/patients').send({
        firstName: 'Jane',
        lastName: 'Smith',
        color: '#33ff57',
        therapyRequirements: { 'physiotherapist': 1 }
      });
      const patient2 = patient2Response.body;

      // Bulk assign both patients to session1 (10:00-11:00) - no conflicts
      const response = await request(app)
        .put(`/api/schedule/sessions/${session1.id}/patients`)
        .send({ patientIds: [patient.id, patient2.id] })
        .expect(200);

      expect(response.body.patients).toHaveLength(2);
      const patientIds = response.body.patients.map((p: any) => p.id);
      expect(patientIds).toContain(patient.id);
      expect(patientIds).toContain(patient2.id);
    });

    it('should handle edge case: sessions that touch but do not overlap', async () => {
      // Create adjacent session (11:00-12:00) - touches session1 (10:00-11:00) but doesn't overlap
      const session3Response = await request(app).post('/api/schedule/sessions').send({
        employeeId: employee2.id,
        roomId: room2.id,
        day: 'monday',
        startTime: '11:00',
        endTime: '12:00'
      }).expect(201);
      const session3 = session3Response.body;

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

    it('should handle partial overlap conflicts correctly', async () => {
      // Create session with partial overlap (10:45-11:45) - overlaps with session1 (10:00-11:00)
      const session3Response = await request(app).post('/api/schedule/sessions').send({
        employeeId: employee2.id,
        roomId: room2.id,
        day: 'monday',
        startTime: '10:45',
        endTime: '11:45'
      }).expect(201);
      const session3 = session3Response.body;

      // Assign patient to session1 (10:00-11:00)
      await request(app)
        .post(`/api/schedule/sessions/${session1.id}/patients`)
        .send({ patientId: patient.id })
        .expect(200);

      // Try to assign to overlapping session3 (10:45-11:45) - should conflict
      const response = await request(app)
        .post(`/api/schedule/sessions/${session3.id}/patients`)
        .send({ patientId: patient.id })
        .expect(400);

      expect(response.body.error).toContain('המטופל כבר משויך לטיפול אחר באותו זמן');
      expect(response.body.error).toContain('10:00-11:00');
    });
  });

  describe('Non-blocking Activities', () => {
    beforeEach(async () => {
      await prisma.session.deleteMany();
      await prisma.schedule.deleteMany();
      await prisma.employee.deleteMany();
      await prisma.room.deleteMany();
      await prisma.activity.deleteMany();
    });

    it('should schedule sessions over non-blocking activities', async () => {
      // Create employee and room
      const employee = createEmployeeFixture({
        firstName: 'Test',
        lastName: 'Employee',
        weeklySessionsCount: 5
      });
      const room = createRoomFixture({ name: 'Test Room' });

      await request(app).post('/api/employees').send(employee);
      await request(app).post('/api/rooms').send(room);

      // Create a non-blocking activity
      const activity = {
        name: 'Optional Training',
        color: '#ff5733',
        defaultStartTime: '10:00',
        defaultEndTime: '11:00',
        dayOverrides: {},
        isBlocking: false, // This is the key - NOT blocking
        isActive: true
      };

      await request(app).post('/api/activities').send(activity);

      // Generate schedule
      const response = await request(app)
        .post('/api/schedule/generate')
        .expect(201);

      expect(response.body).toHaveProperty('sessions');
      const sessions = response.body.sessions;
      
      // Check if sessions are scheduled during the non-blocking activity time
      const sessionsInActivityTime = sessions.filter((session: any) => {
        const sessionStart = timeToMinutes(session.startTime);
        const sessionEnd = timeToMinutes(session.endTime);
        const activityStart = timeToMinutes('10:00');
        const activityEnd = timeToMinutes('11:00');
        
        return sessionStart < activityEnd && activityStart < sessionEnd;
      });

      // Should have at least some sessions during the non-blocking activity time
      expect(sessionsInActivityTime.length).toBeGreaterThan(0);
    });

    it('should NOT schedule sessions over blocking activities', async () => {
      // Create employee and room
      const employee = createEmployeeFixture({
        firstName: 'Test',
        lastName: 'Employee',
        weeklySessionsCount: 5
      });
      const room = createRoomFixture({ name: 'Test Room' });

      await request(app).post('/api/employees').send(employee);
      await request(app).post('/api/rooms').send(room);

      // Create a blocking activity
      const activity = {
        name: 'Staff Meeting',
        color: '#ff5733',
        defaultStartTime: '10:00',
        defaultEndTime: '11:00',
        dayOverrides: {},
        isBlocking: true, // This should block scheduling
        isActive: true
      };

      await request(app).post('/api/activities').send(activity);

      // Generate schedule
      const response = await request(app)
        .post('/api/schedule/generate')
        .expect(201);

      expect(response.body).toHaveProperty('sessions');
      const sessions = response.body.sessions;
      
      // Check that NO sessions are scheduled during the blocking activity time
      const sessionsInActivityTime = sessions.filter((session: any) => {
        const sessionStart = timeToMinutes(session.startTime);
        const sessionEnd = timeToMinutes(session.endTime);
        const activityStart = timeToMinutes('10:00');
        const activityEnd = timeToMinutes('11:00');
        
        return sessionStart < activityEnd && activityStart < sessionEnd;
      });

      // Should have NO sessions during the blocking activity time
      expect(sessionsInActivityTime.length).toBe(0);
    });
  });
});

// Helper function to convert time string to minutes for comparison
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}