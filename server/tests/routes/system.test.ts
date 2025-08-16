import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../utils/testServer';
import { createEmployeeFixture, createRoomFixture, createRoleFixture } from '../utils/fixtures';
import { prisma } from '../setup';

describe('System API Endpoints', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp(prisma);
  });

  describe('GET /api/system/status', () => {
    it('should return empty status when no data exists', async () => {
      const response = await request(app)
        .get('/api/system/status')
        .expect(200);

      expect(response.body).toEqual({
        employees: 0,
        rooms: 0,
        schedules: 0,
        sessions: 0,
        hasData: false
      });
    });

    it('should return correct counts when data exists', async () => {
      // Create test roles first
      const role1 = await request(app).post('/api/roles').send(createRoleFixture({ name: 'ריפוי בעיסוק' }));
      const role2 = await request(app).post('/api/roles').send(createRoleFixture({ name: 'קלינאות תקשורת' }));

      // Add some test data
      await request(app)
        .post('/api/employees')
        .send(createEmployeeFixture({ firstName: 'John', lastName: 'Doe', roleId: role1.body.id }));
      
      await request(app)
        .post('/api/employees')
        .send(createEmployeeFixture({ firstName: 'Jane', lastName: 'Smith', roleId: role2.body.id }));

      await request(app)
        .post('/api/rooms')
        .send(createRoomFixture({ name: 'Room A' }));

      await request(app)
        .post('/api/rooms')
        .send(createRoomFixture({ name: 'Room B' }));

      await request(app)
        .post('/api/rooms')
        .send(createRoomFixture({ name: 'Room C' }));

      const response = await request(app)
        .get('/api/system/status')
        .expect(200);

      expect(response.body).toEqual({
        employees: 2,
        rooms: 3,
        schedules: 0, // No schedules created yet
        sessions: 0,  // No sessions created yet
        hasData: true
      });
    });

    it('should handle mixed data scenarios', async () => {
      // Add only employees
      const role = await request(app)
        .post('/api/roles')
        .send(createRoleFixture({ name: 'Test Role' }));
      
      await request(app)
        .post('/api/employees')
        .send(createEmployeeFixture({ roleId: role.body.id }));

      const response1 = await request(app)
        .get('/api/system/status')
        .expect(200);

      expect(response1.body).toMatchObject({
        employees: 1,
        rooms: 0,
        schedules: 0,
        sessions: 0,
        hasData: true
      });

      // Add only rooms (in addition to employee)
      await request(app)
        .post('/api/rooms')
        .send(createRoomFixture());

      const response2 = await request(app)
        .get('/api/system/status')
        .expect(200);

      expect(response2.body).toMatchObject({
        employees: 1,
        rooms: 1,
        schedules: 0,
        sessions: 0,
        hasData: true
      });
    });

    it('should return consistent status format', async () => {
      const response = await request(app)
        .get('/api/system/status')
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('employees');
      expect(response.body).toHaveProperty('rooms');
      expect(response.body).toHaveProperty('schedules');
      expect(response.body).toHaveProperty('sessions');
      expect(response.body).toHaveProperty('hasData');

      // Verify types
      expect(typeof response.body.employees).toBe('number');
      expect(typeof response.body.rooms).toBe('number');
      expect(typeof response.body.schedules).toBe('number');
      expect(typeof response.body.sessions).toBe('number');
      expect(typeof response.body.hasData).toBe('boolean');
    });
  });

  describe('POST /api/system/reset', () => {
    
    it('should reset all system data', async () => {
      // Add some test data before reset
      const role = await request(app).post('/api/roles').send(createRoleFixture());
      await request(app)
        .post('/api/employees')
        .send(createEmployeeFixture({ firstName: 'TestEmployee', roleId: role.body.id }));
      
      await request(app)
        .post('/api/rooms')
        .send(createRoomFixture({ name: 'TestRoom' }));
      
      // Verify data exists before reset
      const statusBefore = await request(app)
        .get('/api/system/status')
        .expect(200);
      
      expect(statusBefore.body.hasData).toBe(true);
      expect(statusBefore.body.employees).toBeGreaterThan(0);
      expect(statusBefore.body.rooms).toBeGreaterThan(0);

      // Perform reset
      const response = await request(app)
        .post('/api/system/reset')
        .expect(200);

      expect(response.body).toEqual({
        message: 'System reset completed successfully'
      });

      // Verify data is cleared after reset
      const statusAfter = await request(app)
        .get('/api/system/status')
        .expect(200);

      expect(statusAfter.body).toEqual({
        employees: 0,
        rooms: 0,
        schedules: 0,
        sessions: 0,
        hasData: false
      });
    });

    it('should handle reset when no data exists', async () => {
      // First reset to clear any existing data
      await request(app).post('/api/system/reset').expect(200);

      // Reset again when already empty
      const response = await request(app)
        .post('/api/system/reset')
        .expect(200);

      expect(response.body).toEqual({
        message: 'System reset completed successfully'
      });

      // Verify status is still empty
      const status = await request(app)
        .get('/api/system/status')
        .expect(200);

      expect(status.body.hasData).toBe(false);
    });

    it('should reset multiple times successfully', async () => {
      // Perform multiple resets
      for (let i = 0; i < 3; i++) {
        // Add some data
        const role = await request(app).post('/api/roles').send(createRoleFixture({ name: `Role${i}` }));
        await request(app)
          .post('/api/employees')
          .send(createEmployeeFixture({ firstName: `Employee${i}`, roleId: role.body.id }));

        await request(app)
          .post('/api/rooms')
          .send(createRoomFixture({ name: `Room${i}` }));

        // Reset
        const response = await request(app)
          .post('/api/system/reset')
          .expect(200);

        expect(response.body.message).toBe('System reset completed successfully');

        // Verify empty
        const status = await request(app)
          .get('/api/system/status')
          .expect(200);

        expect(status.body.hasData).toBe(false);
      }
    });

    it('should reset large amounts of data', async () => {
      // Create multiple employees and rooms
      const employeePromises = [];
      const roomPromises = [];

      const role = await request(app).post('/api/roles').send(createRoleFixture());

      for (let i = 0; i < 10; i++) {
        employeePromises.push(
          request(app)
            .post('/api/employees')
            .send(createEmployeeFixture({ firstName: `Employee${i}`, lastName: `Last${i}`, roleId: role.body.id }))
        );

        roomPromises.push(
          request(app)
            .post('/api/rooms')
            .send(createRoomFixture({ name: `Room${i}` }))
        );
      }

      // Wait for all data to be created
      await Promise.all([...employeePromises, ...roomPromises]);

      // Verify large amount of data exists
      const statusBefore = await request(app)
        .get('/api/system/status')
        .expect(200);

      expect(statusBefore.body.employees).toBeGreaterThanOrEqual(10);
      expect(statusBefore.body.rooms).toBeGreaterThanOrEqual(10);

      // Reset
      const response = await request(app)
        .post('/api/system/reset')
        .expect(200);

      expect(response.body.message).toBe('System reset completed successfully');

      // Verify all data is cleared
      const statusAfter = await request(app)
        .get('/api/system/status')
        .expect(200);

      expect(statusAfter.body).toEqual({
        employees: 0,
        rooms: 0,
        schedules: 0,
        sessions: 0,
        hasData: false
      });
    });
  });

  describe('System API Integration', () => {
    it('should maintain consistent state between status and reset', async () => {
      // Initial state should be empty
      const initialStatus = await request(app)
        .get('/api/system/status')
        .expect(200);

      expect(initialStatus.body.hasData).toBe(false);

      // Add data
      const role = await request(app).post('/api/roles').send(createRoleFixture());
      await request(app)
        .post('/api/employees')
        .send(createEmployeeFixture({ firstName: 'Integration', lastName: 'Test', roleId: role.body.id }));

      // Status should reflect new data
      const statusWithData = await request(app)
        .get('/api/system/status')
        .expect(200);

      expect(statusWithData.body.hasData).toBe(true);
      expect(statusWithData.body.employees).toBe(1);

      // Reset should clear everything
      await request(app)
        .post('/api/system/reset')
        .expect(200);

      // Status should be empty again
      const finalStatus = await request(app)
        .get('/api/system/status')
        .expect(200);

      expect(finalStatus.body).toEqual(initialStatus.body);
    });

    it('should handle concurrent status requests', async () => {
      // Add some data
      const role = await request(app).post('/api/roles').send(createRoleFixture());
      await request(app)
        .post('/api/employees')
        .send(createEmployeeFixture({ roleId: role.body.id }));

      // Make multiple concurrent status requests
      const statusPromises = Array(5).fill(null).map(() =>
        request(app).get('/api/system/status').expect(200)
      );

      const responses = await Promise.all(statusPromises);

      // All responses should be identical
      const firstResponse = responses[0].body;
      responses.forEach(response => {
        expect(response.body).toEqual(firstResponse);
      });

      expect(firstResponse.employees).toBe(1);
      expect(firstResponse.hasData).toBe(true);
    });

    it('should handle status check immediately after reset', async () => {
      // Add data
      await request(app)
        .post('/api/employees')
        .send(createEmployeeFixture());

      // Reset and immediately check status
      await request(app).post('/api/system/reset').expect(200);
      
      const status = await request(app)
        .get('/api/system/status')
        .expect(200);

      expect(status.body.hasData).toBe(false);
      expect(status.body.employees).toBe(0);
    });
  });

  describe('Health Check Endpoint', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('string');
      
      // Verify timestamp is a valid ISO string
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });

    it('should return different timestamps on multiple calls', async () => {
      const response1 = await request(app)
        .get('/api/health')
        .expect(200);

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const response2 = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response1.body.status).toBe('ok');
      expect(response2.body.status).toBe('ok');
      expect(response1.body.timestamp).not.toBe(response2.body.timestamp);
    });
  });
});
