import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../utils/testServer';
import { createEmployeeFixture, employeeRoles, validWorkingHours } from '../utils/fixtures';
import { prisma } from '../setup';

describe('Employee API Endpoints', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp(prisma);
  });

  describe('GET /api/employees', () => {
    it('should return empty array when no employees exist', async () => {
      const response = await request(app)
        .get('/api/employees')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all employees when they exist', async () => {
      // Create test employees
      const employee1 = createEmployeeFixture({ firstName: 'John', lastName: 'Doe' });
      const employee2 = createEmployeeFixture({ firstName: 'Jane', lastName: 'Smith', role: 'speech-therapist' });

      await request(app).post('/api/employees').send(employee1);
      await request(app).post('/api/employees').send(employee2);

      const response = await request(app)
        .get('/api/employees')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        role: 'occupational-therapist'
      });
      expect(response.body[1]).toMatchObject({
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'speech-therapist'
      });
    });
  });

  describe('GET /api/employees/:id', () => {
    it('should return employee by ID', async () => {
      const employeeData = createEmployeeFixture();
      const createResponse = await request(app)
        .post('/api/employees')
        .send(employeeData);

      const employeeId = createResponse.body.id;

      const response = await request(app)
        .get(`/api/employees/${employeeId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: employeeId,
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        role: employeeData.role
      });
    });

    it('should return 404 for non-existent employee', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/employees/${nonExistentId}`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Employee not found'
      });
    });

    it('should handle invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/employees/invalid-id')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/employees', () => {
    it('should create a new employee with valid data', async () => {
      const employeeData = createEmployeeFixture();

      const response = await request(app)
        .post('/api/employees')
        .send(employeeData)
        .expect(201);

      expect(response.body).toMatchObject({
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        role: employeeData.role,
        weeklySessionsCount: employeeData.weeklySessionsCount
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body.workingHours).toEqual(employeeData.workingHours);
    });

    it('should create employees with different roles', async () => {
      for (const role of employeeRoles) {
        const employeeData = createEmployeeFixture({ 
          firstName: `Test${role}`,
          role 
        });

        const response = await request(app)
          .post('/api/employees')
          .send(employeeData)
          .expect(201);

        expect(response.body.role).toBe(role);
      }
    });

    it('should return 400 for missing required fields', async () => {
      const testCases = [
        { data: {}, expectedError: 'Missing required fields: firstName, lastName, role' },
        { 
          data: { firstName: 'John' }, 
          expectedError: 'Missing required fields: firstName, lastName, role' 
        },
        { 
          data: { firstName: 'John', lastName: 'Doe' }, 
          expectedError: 'Missing required fields: firstName, lastName, role' 
        }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/employees')
          .send(testCase.data)
          .expect(400);

        expect(response.body.error).toBe(testCase.expectedError);
      }
    });

    it('should handle invalid role', async () => {
      const employeeData = createEmployeeFixture({ role: 'invalid-role' as any });

      const response = await request(app)
        .post('/api/employees')
        .send(employeeData)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle partial working hours', async () => {
      const employeeData = createEmployeeFixture({
        workingHours: {
          monday: { startTime: '08:00', endTime: '16:00' },
          wednesday: { startTime: '08:00', endTime: '16:00' }
        }
      });

      const response = await request(app)
        .post('/api/employees')
        .send(employeeData)
        .expect(201);

      expect(response.body.workingHours).toEqual(employeeData.workingHours);
    });
  });

  describe('PUT /api/employees/:id', () => {
    let employeeId: string;

    beforeEach(async () => {
      const employeeData = createEmployeeFixture();
      const response = await request(app)
        .post('/api/employees')
        .send(employeeData);
      employeeId = response.body.id;
    });

    it('should update employee data', async () => {
      const updateData = {
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        role: 'speech-therapist' as const,
        weeklySessionsCount: 25
      };

      const response = await request(app)
        .put(`/api/employees/${employeeId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject(updateData);
      expect(response.body.id).toBe(employeeId);
    });

    it('should update partial employee data', async () => {
      const updateData = { firstName: 'PartialUpdate' };

      const response = await request(app)
        .put(`/api/employees/${employeeId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.firstName).toBe('PartialUpdate');
      expect(response.body.id).toBe(employeeId);
    });

    it('should update working hours', async () => {
      const updateData = {
        workingHours: {
          sunday: { startTime: '09:00', endTime: '17:00' },
          monday: { startTime: '09:00', endTime: '17:00' }
        }
      };

      const response = await request(app)
        .put(`/api/employees/${employeeId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.workingHours).toEqual(updateData.workingHours);
    });

    it('should return 404 for non-existent employee', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const updateData = { firstName: 'Updated' };

      const response = await request(app)
        .put(`/api/employees/${nonExistentId}`)
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBe('Employee not found');
    });
  });

  describe('DELETE /api/employees/:id', () => {
    let employeeId: string;

    beforeEach(async () => {
      const employeeData = createEmployeeFixture();
      const response = await request(app)
        .post('/api/employees')
        .send(employeeData);
      employeeId = response.body.id;
    });

    it('should delete existing employee', async () => {
      await request(app)
        .delete(`/api/employees/${employeeId}`)
        .expect(204);

      // Verify employee is deleted
      await request(app)
        .get(`/api/employees/${employeeId}`)
        .expect(404);
    });

    it('should return 404 for non-existent employee', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/employees/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toBe('Employee not found');
    });

    it('should handle multiple deletions', async () => {
      // Create another employee
      const employee2Data = createEmployeeFixture({ firstName: 'Second' });
      const employee2Response = await request(app)
        .post('/api/employees')
        .send(employee2Data);
      const employee2Id = employee2Response.body.id;

      // Delete both employees
      await request(app).delete(`/api/employees/${employeeId}`).expect(204);
      await request(app).delete(`/api/employees/${employee2Id}`).expect(204);

      // Verify both are deleted
      const allEmployeesResponse = await request(app).get('/api/employees');
      expect(allEmployeesResponse.body).toHaveLength(0);
    });
  });
});
