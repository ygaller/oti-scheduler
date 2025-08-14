import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../utils/testServer';
import { createEmployeeFixture, createRoomFixture, createScheduleConfigFixture } from '../utils/fixtures';
import { prisma } from '../setup';

describe('Schedule API Endpoints', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp(prisma);
  });

  describe('GET /api/schedule/config', () => {
    it('should return default config when none exists', async () => {
      const response = await request(app)
        .get('/api/schedule/config')
        .expect(200);

      expect(response.body).toEqual({
        breakfast: { startTime: '08:00', endTime: '08:30' },
        morningMeetup: { startTime: '09:00', endTime: '09:15' },
        lunch: { startTime: '12:00', endTime: '13:00' }
      });
    });

    it('should return stored config when it exists', async () => {
      const config = createScheduleConfigFixture({
        breakfast: { startTime: '07:30', endTime: '08:00' },
        lunch: { startTime: '12:30', endTime: '13:30' }
      });

      // Set config first
      await request(app)
        .put('/api/schedule/config')
        .send(config)
        .expect(200);

      // Get config
      const response = await request(app)
        .get('/api/schedule/config')
        .expect(200);

      expect(response.body).toEqual(config);
    });
  });

  describe('PUT /api/schedule/config', () => {
    it('should update schedule configuration', async () => {
      const config = createScheduleConfigFixture({
        breakfast: { startTime: '07:45', endTime: '08:15' },
        morningMeetup: { startTime: '08:45', endTime: '09:00' },
        lunch: { startTime: '12:15', endTime: '13:15' }
      });

      const response = await request(app)
        .put('/api/schedule/config')
        .send(config)
        .expect(200);

      expect(response.body).toEqual(config);

      // Verify the config is actually stored
      const getResponse = await request(app)
        .get('/api/schedule/config')
        .expect(200);

      expect(getResponse.body).toEqual(config);
    });

    it('should handle partial config updates', async () => {
      const partialConfig = {
        breakfast: { startTime: '07:30', endTime: '08:00' }
      };

      const response = await request(app)
        .put('/api/schedule/config')
        .send(partialConfig)
        .expect(200);

      expect(response.body).toEqual(partialConfig);
    });

    it('should handle invalid time formats gracefully', async () => {
      const invalidConfig = {
        breakfast: { startTime: 'invalid', endTime: '08:30' },
        morningMeetup: { startTime: '09:00', endTime: '09:15' },
        lunch: { startTime: '12:00', endTime: '13:00' }
      };

      // This should not crash the server, but validation might occur in the scheduling logic
      await request(app)
        .put('/api/schedule/config')
        .send(invalidConfig)
        .expect(200);
    });
  });

  describe('GET /api/schedule/active', () => {
    it('should return null when no active schedule exists', async () => {
      const response = await request(app)
        .get('/api/schedule/active')
        .expect(200);

      expect(response.body).toBeNull();
    });

    it('should return active schedule when it exists', async () => {
      // First create employees and rooms for schedule generation
      await request(app)
        .post('/api/employees')
        .send(createEmployeeFixture({ firstName: 'Dr', lastName: 'Smith' }));

      await request(app)
        .post('/api/rooms')
        .send(createRoomFixture({ name: 'Therapy Room' }));

      // Generate a schedule
      const generateResponse = await request(app)
        .post('/api/schedule/generate')
        .expect(200);

      const scheduleId = generateResponse.body.id;

      // Activate the schedule
      await request(app)
        .put(`/api/schedule/${scheduleId}/activate`)
        .expect(200);

      // Get active schedule
      const response = await request(app)
        .get('/api/schedule/active')
        .expect(200);

      expect(response.body).not.toBeNull();
      expect(response.body.id).toBe(scheduleId);
      expect(response.body).toHaveProperty('sessions');
      expect(Array.isArray(response.body.sessions)).toBe(true);
    });
  });

  describe('GET /api/schedule/all', () => {
    it('should return empty array when no schedules exist', async () => {
      const response = await request(app)
        .get('/api/schedule/all')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all schedules when they exist', async () => {
      // Setup prerequisites
      await request(app)
        .post('/api/employees')
        .send(createEmployeeFixture());

      await request(app)
        .post('/api/rooms')
        .send(createRoomFixture());

      // Generate multiple schedules
      await request(app).post('/api/schedule/generate').expect(200);
      await request(app).post('/api/schedule/generate').expect(200);

      const response = await request(app)
        .get('/api/schedule/all')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('sessions');
      expect(response.body[1]).toHaveProperty('id');
      expect(response.body[1]).toHaveProperty('sessions');
    });
  });

  describe('POST /api/schedule/generate', () => {
    beforeEach(async () => {
      // Set up basic requirements for schedule generation
      await request(app)
        .post('/api/employees')
        .send(createEmployeeFixture({ 
          firstName: 'John', 
          lastName: 'Therapist',
          role: 'occupational-therapist'
        }));

      await request(app)
        .post('/api/rooms')
        .send(createRoomFixture({ name: 'OT Room' }));

      // Set up schedule config
      await request(app)
        .put('/api/schedule/config')
        .send(createScheduleConfigFixture());
    });

    it('should generate schedule with valid data', async () => {
      const response = await request(app)
        .post('/api/schedule/generate')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('sessions');
      expect(response.body).toHaveProperty('generatedAt');
      expect(Array.isArray(response.body.sessions)).toBe(true);
    });

    it('should return 400 when no employees exist', async () => {
      // Clear employees but keep rooms
      await request(app).post('/api/system/reset');
      await request(app)
        .post('/api/rooms')
        .send(createRoomFixture());

      const response = await request(app)
        .post('/api/schedule/generate')
        .expect(400);

      expect(response.body.error).toBe('No employees found');
    });

    it('should return 400 when no rooms exist', async () => {
      // Clear rooms but keep employees
      await request(app).post('/api/system/reset');
      await request(app)
        .post('/api/employees')
        .send(createEmployeeFixture());

      const response = await request(app)
        .post('/api/schedule/generate')
        .expect(400);

      expect(response.body.error).toBe('No rooms found');
    });

    it('should use default config when no schedule config exists', async () => {
      // Clear all data and recreate only employees and rooms
      await request(app).post('/api/system/reset');
      await request(app)
        .post('/api/employees')
        .send(createEmployeeFixture());
      await request(app)
        .post('/api/rooms')
        .send(createRoomFixture());

      // Don't set config - should use default config and succeed
      const response = await request(app)
        .post('/api/schedule/generate')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('sessions');
      expect(Array.isArray(response.body.sessions)).toBe(true);
    });

    it('should generate different schedules on multiple calls', async () => {
      const response1 = await request(app)
        .post('/api/schedule/generate')
        .expect(200);

      const response2 = await request(app)
        .post('/api/schedule/generate')
        .expect(200);

      expect(response1.body.id).not.toBe(response2.body.id);
      expect(response1.body.generatedAt).not.toBe(response2.body.generatedAt);
    });
  });

  describe('PUT /api/schedule/:id/activate', () => {
    let scheduleId: string;

    beforeEach(async () => {
      // Create prerequisites and generate a schedule
      await request(app)
        .post('/api/employees')
        .send(createEmployeeFixture());

      await request(app)
        .post('/api/rooms')
        .send(createRoomFixture());

      await request(app)
        .put('/api/schedule/config')
        .send(createScheduleConfigFixture());

      const generateResponse = await request(app)
        .post('/api/schedule/generate')
        .expect(200);

      scheduleId = generateResponse.body.id;
    });

    it('should activate existing schedule', async () => {
      const response = await request(app)
        .put(`/api/schedule/${scheduleId}/activate`)
        .expect(200);

      expect(response.body.id).toBe(scheduleId);

      // Verify it's active
      const activeResponse = await request(app)
        .get('/api/schedule/active')
        .expect(200);

      expect(activeResponse.body.id).toBe(scheduleId);
    });

    it('should return 404 for non-existent schedule', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .put(`/api/schedule/${nonExistentId}/activate`)
        .expect(404);

      expect(response.body.error).toBe('Schedule not found');
    });

    it('should handle activating already active schedule', async () => {
      // Activate once
      await request(app)
        .put(`/api/schedule/${scheduleId}/activate`)
        .expect(200);

      // Activate again
      const response = await request(app)
        .put(`/api/schedule/${scheduleId}/activate`)
        .expect(200);

      expect(response.body.id).toBe(scheduleId);
    });
  });

  describe('DELETE /api/schedule/:id', () => {
    let scheduleId: string;

    beforeEach(async () => {
      // Create prerequisites and generate a schedule
      await request(app)
        .post('/api/employees')
        .send(createEmployeeFixture());

      await request(app)
        .post('/api/rooms')
        .send(createRoomFixture());

      await request(app)
        .put('/api/schedule/config')
        .send(createScheduleConfigFixture());

      const generateResponse = await request(app)
        .post('/api/schedule/generate')
        .expect(200);

      scheduleId = generateResponse.body.id;
    });

    it('should delete existing schedule', async () => {
      await request(app)
        .delete(`/api/schedule/${scheduleId}`)
        .expect(204);

      // Verify schedule is deleted
      const allSchedulesResponse = await request(app)
        .get('/api/schedule/all')
        .expect(200);

      expect(allSchedulesResponse.body).toHaveLength(0);
    });

    it('should return 404 for non-existent schedule', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/schedule/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toBe('Schedule not found');
    });

    it('should handle deleting active schedule', async () => {
      // Activate the schedule first
      await request(app)
        .put(`/api/schedule/${scheduleId}/activate`)
        .expect(200);

      // Delete the active schedule
      await request(app)
        .delete(`/api/schedule/${scheduleId}`)
        .expect(204);

      // Active schedule should now be null
      const activeResponse = await request(app)
        .get('/api/schedule/active')
        .expect(200);

      expect(activeResponse.body).toBeNull();
    });
  });

  describe('GET /api/schedule/sessions', () => {
    it('should return empty array when no sessions exist', async () => {
      const response = await request(app)
        .get('/api/schedule/sessions')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all sessions when they exist', async () => {
      // Create prerequisites and generate a schedule
      await request(app)
        .post('/api/employees')
        .send(createEmployeeFixture());

      await request(app)
        .post('/api/rooms')
        .send(createRoomFixture());

      await request(app)
        .put('/api/schedule/config')
        .send(createScheduleConfigFixture());

      await request(app)
        .post('/api/schedule/generate')
        .expect(200);

      const response = await request(app)
        .get('/api/schedule/sessions')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('employeeId');
        expect(response.body[0]).toHaveProperty('roomId');
        expect(response.body[0]).toHaveProperty('day');
        expect(response.body[0]).toHaveProperty('startTime');
        expect(response.body[0]).toHaveProperty('endTime');
      }
    });
  });

  describe('Schedule API Integration', () => {
    it('should handle complete schedule workflow', async () => {
      // 1. Set up employees and rooms
      const employeeResponse = await request(app)
        .post('/api/employees')
        .send(createEmployeeFixture({ firstName: 'Workflow', lastName: 'Test' }));

      const roomResponse = await request(app)
        .post('/api/rooms')
        .send(createRoomFixture({ name: 'Workflow Room' }));

      // 2. Set schedule configuration
      const config = createScheduleConfigFixture();
      await request(app)
        .put('/api/schedule/config')
        .send(config)
        .expect(200);

      // 3. Generate schedule
      const generateResponse = await request(app)
        .post('/api/schedule/generate')
        .expect(200);

      const scheduleId = generateResponse.body.id;

      // 4. Verify schedule exists in all schedules
      const allSchedulesResponse = await request(app)
        .get('/api/schedule/all')
        .expect(200);

      expect(allSchedulesResponse.body).toHaveLength(1);
      expect(allSchedulesResponse.body[0].id).toBe(scheduleId);

      // 5. Activate schedule
      await request(app)
        .put(`/api/schedule/${scheduleId}/activate`)
        .expect(200);

      // 6. Verify active schedule
      const activeResponse = await request(app)
        .get('/api/schedule/active')
        .expect(200);

      expect(activeResponse.body.id).toBe(scheduleId);

      // 7. Check sessions
      const sessionsResponse = await request(app)
        .get('/api/schedule/sessions')
        .expect(200);

      expect(Array.isArray(sessionsResponse.body)).toBe(true);

      // 8. Clean up - delete schedule
      await request(app)
        .delete(`/api/schedule/${scheduleId}`)
        .expect(204);

      // 9. Verify cleanup
      const finalActiveResponse = await request(app)
        .get('/api/schedule/active')
        .expect(200);

      expect(finalActiveResponse.body).toBeNull();
    });

    it('should handle multiple employees and rooms', async () => {
      // Create multiple employees with different roles
      const employees = [
        { firstName: 'Alice', lastName: 'OT', role: 'occupational-therapist' as const },
        { firstName: 'Bob', lastName: 'ST', role: 'speech-therapist' as const },
        { firstName: 'Carol', lastName: 'PT', role: 'physiotherapist' as const }
      ];

      const rooms = [
        { name: 'OT Room' },
        { name: 'Speech Room' },
        { name: 'PT Room' },
        { name: 'Group Room' }
      ];

      // Create all employees and rooms
      for (const emp of employees) {
        await request(app)
          .post('/api/employees')
          .send(createEmployeeFixture(emp));
      }

      for (const room of rooms) {
        await request(app)
          .post('/api/rooms')
          .send(createRoomFixture(room));
      }

      // Set config and generate schedule
      await request(app)
        .put('/api/schedule/config')
        .send(createScheduleConfigFixture());

      const generateResponse = await request(app)
        .post('/api/schedule/generate')
        .expect(200);

      expect(generateResponse.body).toHaveProperty('sessions');
      expect(Array.isArray(generateResponse.body.sessions)).toBe(true);

      // Verify sessions make sense with multiple employees and rooms
      const sessions = generateResponse.body.sessions;
      if (sessions.length > 0) {
        // Each session should have valid employee and room IDs
        sessions.forEach((session: any) => {
          expect(session).toHaveProperty('employeeId');
          expect(session).toHaveProperty('roomId');
          expect(session).toHaveProperty('day');
          expect(session).toHaveProperty('startTime');
          expect(session).toHaveProperty('endTime');
        });
      }
    });
  });
});
