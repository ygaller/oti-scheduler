/**
 * API Integration tests for schedule endpoints
 * These tests focus on the full request/response cycle and database interactions
 * They test the API layer and ensure proper HTTP responses, status codes, and data persistence
 */

import '../setup'; // Import Jest setup
import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../utils/testServer';
import { createEmployeeFixture, createRoomFixture, createPatientFixture } from '../utils/fixtures';
import { prisma } from '../setup';

describe('Schedule API Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp(prisma);
  });

  describe('POST /api/schedule/generate - API Integration', () => {
    beforeEach(async () => {
      // Clean up before each test
      await prisma.session.deleteMany();
      await prisma.schedule.deleteMany();
      await prisma.employee.deleteMany();
      await prisma.room.deleteMany();
      await prisma.activity.deleteMany();
    });

    it('should generate schedule and return proper HTTP response', async () => {
      // Create test employees via API
      const employee1 = createEmployeeFixture({
        firstName: 'Alice',
        lastName: 'Smith',
        role: 'occupational-therapist',
        weeklySessionsCount: 10
      });

      const employee2 = createEmployeeFixture({
        firstName: 'Bob',
        lastName: 'Johnson', 
        role: 'physiotherapist',
        weeklySessionsCount: 5
      });

      await request(app).post('/api/employees').send(employee1);
      await request(app).post('/api/employees').send(employee2);

      // Create test rooms via API
      const room1 = createRoomFixture({ name: 'Therapy Room 1' });
      const room2 = createRoomFixture({ name: 'Therapy Room 2' });
      const room3 = createRoomFixture({ name: 'Therapy Room 3' });

      await request(app).post('/api/rooms').send(room1);
      await request(app).post('/api/rooms').send(room2);
      await request(app).post('/api/rooms').send(room3);

      // Generate schedule via API
      const response = await request(app)
        .post('/api/schedule/generate')
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('sessions');
      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body.isActive).toBe(true);
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body.sessions.length).toBeGreaterThan(0);

      // Verify data persistence
      const schedulesInDb = await prisma.schedule.findMany({
        include: { sessions: true }
      });
      expect(schedulesInDb).toHaveLength(1);
      expect(schedulesInDb[0].isActive).toBe(true);
    });

    it('should return 400 when no employees exist (API)', async () => {
      // Create rooms but no employees
      const room1 = createRoomFixture({ name: 'Test Room' });
      await request(app).post('/api/rooms').send(room1);

      const response = await request(app)
        .post('/api/schedule/generate')
        .expect(400);

      expect(response.body.error).toBe('No employees found');
    });

    it('should return 400 when no rooms exist (API)', async () => {
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

    it('should handle blocking activities correctly (API)', async () => {
      // Create employee and room
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

      // Create blocking activities that cover most working hours
      const blockingActivity1 = {
        name: 'Morning Meeting',
        color: '#ff5733',
        defaultStartTime: '08:00',
        defaultEndTime: '12:00',
        dayOverrides: {},
        isBlocking: true,
        isActive: true
      };

      const blockingActivity2 = {
        name: 'Afternoon Training',
        color: '#ff5733',
        defaultStartTime: '13:00',
        defaultEndTime: '16:00',
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
    });
  });

  describe('GET /api/schedule/active - API Integration', () => {
    beforeEach(async () => {
      await prisma.session.deleteMany();
      await prisma.schedule.deleteMany();
      await prisma.employee.deleteMany();
      await prisma.room.deleteMany();
      await prisma.activity.deleteMany();
    });

    it('should return null when no active schedule exists (API)', async () => {
      const response = await request(app)
        .get('/api/schedule/active')
        .expect(200);

      expect(response.body).toBeNull();
    });

    it('should return active schedule when one exists (API)', async () => {
      // Set up test data via API
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
      expect(response.body.isActive).toBe(true);
    });
  });

  describe('GET /api/schedule/all - API Integration', () => {
    beforeEach(async () => {
      await prisma.session.deleteMany();
      await prisma.schedule.deleteMany();
      await prisma.employee.deleteMany();
      await prisma.room.deleteMany();
      await prisma.activity.deleteMany();
    });

    it('should return empty array when no schedules exist (API)', async () => {
      const response = await request(app)
        .get('/api/schedule/all')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all schedules with proper data persistence (API)', async () => {
      // Set up test data
      const employee = createEmployeeFixture();
      const room = createRoomFixture();

      await request(app).post('/api/employees').send(employee);
      await request(app).post('/api/rooms').send(room);

      // Generate two schedules
      const schedule1Response = await request(app).post('/api/schedule/generate').expect(201);
      const schedule2Response = await request(app).post('/api/schedule/generate').expect(201);

      const response = await request(app)
        .get('/api/schedule/all')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      
      // Verify data structure
      response.body.forEach((schedule: any) => {
        expect(schedule).toHaveProperty('id');
        expect(schedule).toHaveProperty('sessions');
        expect(schedule).toHaveProperty('generatedAt');
        expect(schedule).toHaveProperty('isActive');
      });

      // Only the last generated schedule should be active
      const activeSchedules = response.body.filter((s: any) => s.isActive);
      expect(activeSchedules).toHaveLength(1);
      expect(activeSchedules[0].id).toBe(schedule2Response.body.id);
    });
  });

  describe('PUT /api/schedule/:id/activate - API Integration', () => {
    beforeEach(async () => {
      await prisma.session.deleteMany();
      await prisma.schedule.deleteMany();
      await prisma.employee.deleteMany();
      await prisma.room.deleteMany();
      await prisma.activity.deleteMany();
    });

    it('should activate a schedule and update database (API)', async () => {
      // Set up test data
      const employee = createEmployeeFixture();
      const room = createRoomFixture();

      await request(app).post('/api/employees').send(employee);
      await request(app).post('/api/rooms').send(room);

      // Generate two schedules
      const schedule1Response = await request(app).post('/api/schedule/generate').expect(201);
      const schedule2Response = await request(app).post('/api/schedule/generate').expect(201);

      const schedule1Id = schedule1Response.body.id;
      const schedule2Id = schedule2Response.body.id;

      // Initially, schedule2 should be active
      expect(schedule2Response.body.isActive).toBe(true);

      // Activate schedule1
      const response = await request(app)
        .put(`/api/schedule/${schedule1Id}/activate`)
        .expect(200);

      expect(response.body.id).toBe(schedule1Id);
      expect(response.body.isActive).toBe(true);

      // Verify database state
      const schedulesInDb = await prisma.schedule.findMany();
      const activeSchedule = schedulesInDb.find(s => s.isActive);
      const inactiveSchedule = schedulesInDb.find(s => !s.isActive);

      expect(activeSchedule?.id).toBe(schedule1Id);
      expect(inactiveSchedule?.id).toBe(schedule2Id);
    });

    it('should return 404 for non-existent schedule (API)', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .put(`/api/schedule/${nonExistentId}/activate`)
        .expect(404);

      expect(response.body.error).toBe('Schedule not found');
    });

    it('should return 400 for invalid UUID (API)', async () => {
      const response = await request(app)
        .put('/api/schedule/invalid-uuid/activate')
        .expect(400);

      expect(response.body.error).toBe('Invalid id format');
    });
  });

  describe('DELETE /api/schedule/:id - API Integration', () => {
    beforeEach(async () => {
      await prisma.session.deleteMany();
      await prisma.schedule.deleteMany();
      await prisma.employee.deleteMany();
      await prisma.room.deleteMany();
      await prisma.activity.deleteMany();
    });

    it('should delete a schedule and update database (API)', async () => {
      // Set up test data
      const employee = createEmployeeFixture();
      const room = createRoomFixture();

      await request(app).post('/api/employees').send(employee);
      await request(app).post('/api/rooms').send(room);

      // Generate a schedule
      const generateResponse = await request(app).post('/api/schedule/generate').expect(201);
      const scheduleId = generateResponse.body.id;

      // Verify it exists
      await request(app).get('/api/schedule/all').expect(200).then(res => {
        expect(res.body).toHaveLength(1);
      });

      // Delete the schedule
      await request(app)
        .delete(`/api/schedule/${scheduleId}`)
        .expect(204);

      // Verify it's deleted from database
      const schedulesInDb = await prisma.schedule.findMany();
      expect(schedulesInDb).toHaveLength(0);

      // Verify via API
      const allSchedules = await request(app).get('/api/schedule/all').expect(200);
      expect(allSchedules.body).toHaveLength(0);
    });

    it('should return 404 for non-existent schedule (API)', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .delete(`/api/schedule/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toBe('Schedule not found');
    });
  });

  describe('Session Management API Integration', () => {
    beforeEach(async () => {
      await prisma.sessionPatient.deleteMany();
      await prisma.session.deleteMany();
      await prisma.schedule.deleteMany();
      await prisma.employee.deleteMany();
      await prisma.room.deleteMany();
      await prisma.activity.deleteMany();
      await prisma.patient.deleteMany();
    });

    it('should create a session via API and persist to database', async () => {
      // Set up test data
      const employee = createEmployeeFixture();
      const room = createRoomFixture();

      const employeeResponse = await request(app).post('/api/employees').send(employee);
      const roomResponse = await request(app).post('/api/rooms').send(room);

      // Generate a schedule first (required for session creation)
      await request(app).post('/api/schedule/generate').expect(201);

      const sessionData = {
        employeeId: employeeResponse.body.id,
        roomId: roomResponse.body.id,
        day: 'monday',
        startTime: '10:00',
        endTime: '11:00'
      };

      const response = await request(app)
        .post('/api/schedule/sessions')
        .send(sessionData);

      // Log the error to debug
      if (response.status !== 201) {
        console.log('Session creation failed:', response.status, response.body);
      }
      
      expect(response.status).toBe(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.employeeId).toBe(sessionData.employeeId);
      expect(response.body.roomId).toBe(sessionData.roomId);
      expect(response.body.day).toBe(sessionData.day);
      expect(response.body.startTime).toBe(sessionData.startTime);
      expect(response.body.endTime).toBe(sessionData.endTime);

      // Verify database persistence
      const sessionsInDb = await prisma.session.findMany();
      expect(sessionsInDb).toHaveLength(1);
      expect(sessionsInDb[0].id).toBe(response.body.id);
    });

    it('should get all sessions via API', async () => {
      const response = await request(app)
        .get('/api/schedule/sessions')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Patient Assignment API Integration', () => {
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

      // Create test employees via API
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

      // Create test rooms via API
      const room1Response = await request(app).post('/api/rooms').send(createRoomFixture({ name: 'Room A' }));
      const room2Response = await request(app).post('/api/rooms').send(createRoomFixture({ name: 'Room B' }));
      room1 = room1Response.body;
      room2 = room2Response.body;

      // Create test patient via API
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

      // Generate a schedule first (required for session creation)
      await request(app).post('/api/schedule/generate').expect(201);

      // Create test sessions via API
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

    it('should assign patient to session via API and persist to database', async () => {
      const response = await request(app)
        .post(`/api/schedule/sessions/${session1.id}/patients`)
        .send({ patientId: patient.id })
        .expect(200);

      expect(response.body.patients).toHaveLength(1);
      expect(response.body.patients[0].id).toBe(patient.id);

      // Verify database persistence
      const sessionPatientsInDb = await prisma.sessionPatient.findMany({
        where: { sessionId: session1.id }
      });
      expect(sessionPatientsInDb).toHaveLength(1);
      expect(sessionPatientsInDb[0].patientId).toBe(patient.id);
    });

    it('should prevent assigning patient to overlapping session via API', async () => {
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

      // Verify database state - patient should only be in session1
      const session1Patients = await prisma.sessionPatient.findMany({
        where: { sessionId: session1.id }
      });
      const session2Patients = await prisma.sessionPatient.findMany({
        where: { sessionId: session2.id }
      });
      
      expect(session1Patients).toHaveLength(1);
      expect(session2Patients).toHaveLength(0);
    });

    it('should handle bulk patient assignment via API', async () => {
      // Create second patient
      const patient2Response = await request(app).post('/api/patients').send({
        firstName: 'Jane',
        lastName: 'Smith',
        color: '#33ff57',
        therapyRequirements: { 'occupational-therapist': 1 }
      });
      const patient2 = patient2Response.body;

      // Bulk assign both patients to session1
      const response = await request(app)
        .put(`/api/schedule/sessions/${session1.id}/patients`)
        .send({ patientIds: [patient.id, patient2.id] })
        .expect(200);

      expect(response.body.patients).toHaveLength(2);
      const patientIds = response.body.patients.map((p: any) => p.id);
      expect(patientIds).toContain(patient.id);
      expect(patientIds).toContain(patient2.id);

      // Verify database persistence
      const sessionPatientsInDb = await prisma.sessionPatient.findMany({
        where: { sessionId: session1.id }
      });
      expect(sessionPatientsInDb).toHaveLength(2);
    });
  });

  describe('Error Handling and Edge Cases (API)', () => {
    beforeEach(async () => {
      await prisma.session.deleteMany();
      await prisma.schedule.deleteMany();
      await prisma.employee.deleteMany();
      await prisma.room.deleteMany();
      await prisma.activity.deleteMany();
    });

    it('should handle server errors gracefully', async () => {
      // Try to generate schedule without any setup
      const response = await request(app)
        .post('/api/schedule/generate')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate request data properly', async () => {
      // Try to create session with invalid data
      const response = await request(app)
        .post('/api/schedule/sessions')
        .send({
          employeeId: 'invalid-id',
          roomId: 'invalid-id',
          day: 'invalid-day',
          startTime: 'invalid-time',
          endTime: 'invalid-time'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});

// Helper function to convert time string to minutes for comparison
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}
