import request from 'supertest';
import express from 'express';
import { createRoleRouter } from '../../src/routes/roles';
import { mockRoleRepo } from '../utils/mockRepositories';
import { createRoleFixture } from '../utils/fixtures';

const app = express();
app.use(express.json());
app.use('/api/roles', createRoleRouter(mockRoleRepo));

describe('Role Routes', () => {
  beforeEach(() => {
    mockRoleRepo.clear();
  });

  describe('GET /api/roles', () => {
    it('should return all active roles by default', async () => {
      const activeRole = await mockRoleRepo.create(createRoleFixture({
        name: 'ריפוי בעיסוק',
        isActive: true
      }));
      const inactiveRole = await mockRoleRepo.create(createRoleFixture({
        name: 'פיזיותרפיה',
        isActive: false
      }));

      const response = await request(app)
        .get('/api/roles')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(activeRole.id);
      expect(response.body[0].name).toBe('ריפוי בעיסוק');
    });

    it('should return all roles when includeInactive=true', async () => {
      await mockRoleRepo.create(createRoleFixture({
        name: 'ריפוי בעיסוק',
        isActive: true
      }));
      await mockRoleRepo.create(createRoleFixture({
        name: 'פיזיותרפיה',
        isActive: false
      }));

      const response = await request(app)
        .get('/api/roles?includeInactive=true')
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('should return roles sorted alphabetically by name', async () => {
      await mockRoleRepo.create(createRoleFixture({
        name: 'פיזיותרפיה'
      }));
      await mockRoleRepo.create(createRoleFixture({
        name: 'ריפוי בעיסוק'
      }));
      await mockRoleRepo.create(createRoleFixture({
        name: 'קלינאות תקשורת'
      }));

      const response = await request(app)
        .get('/api/roles?includeInactive=true')
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body[0].name).toBe('פיזיותרפיה');
      expect(response.body[1].name).toBe('קלינאות תקשורת');
      expect(response.body[2].name).toBe('ריפוי בעיסוק');
    });
  });

  describe('GET /api/roles/:id', () => {
    it('should return a role by ID', async () => {
      const role = await mockRoleRepo.create(createRoleFixture({
        name: 'ריפוי בעיסוק'
      }));

      const response = await request(app)
        .get(`/api/roles/${role.id}`)
        .expect(200);

      expect(response.body.id).toBe(role.id);
      expect(response.body.name).toBe('ריפוי בעיסוק');
      expect(response.body.roleStringKey).toBe(role.roleStringKey);
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/roles/non-existent-id')
        .expect(400);

      expect(response.body.error).toContain('Invalid');
    });

    it('should return 404 for valid UUID that does not exist', async () => {
      const response = await request(app)
        .get('/api/roles/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.error).toBe('Role not found');
    });

    it('should return 400 for invalid UUID', async () => {
      await request(app)
        .get('/api/roles/invalid-uuid')
        .expect(400);
    });
  });

  describe('POST /api/roles', () => {
    it('should create a new role', async () => {
      const roleData = {
        name: 'ריפוי בעיסוק',
        isActive: true
      };

      const response = await request(app)
        .post('/api/roles')
        .send(roleData)
        .expect(201);

      expect(response.body.name).toBe('ריפוי בעיסוק');
      expect(response.body.isActive).toBe(true);
      expect(response.body.roleStringKey).toMatch(/^role_\d+$/);
      expect(response.body.id).toBeDefined();
    });

    it('should trim whitespace from role name', async () => {
      const roleData = {
        name: '  ריפוי בעיסוק  ',
        isActive: true
      };

      const response = await request(app)
        .post('/api/roles')
        .send(roleData)
        .expect(201);

      expect(response.body.name).toBe('ריפוי בעיסוק');
    });

    it('should default isActive to true if not provided', async () => {
      const roleData = {
        name: 'ריפוי בעיסוק'
      };

      const response = await request(app)
        .post('/api/roles')
        .send(roleData)
        .expect(201);

      expect(response.body.isActive).toBe(true);
    });

    it('should return 400 for missing name', async () => {
      const response = await request(app)
        .post('/api/roles')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Missing required field: name');
    });

    it('should return 400 for empty name', async () => {
      const response = await request(app)
        .post('/api/roles')
        .send({ name: '   ' })
        .expect(400);

      expect(response.body.error).toBe('Missing required field: name');
    });

    it('should return 409 for duplicate role name', async () => {
      await mockRoleRepo.create(createRoleFixture({
        name: 'ריפוי בעיסוק'
      }));

      const response = await request(app)
        .post('/api/roles')
        .send({ name: 'ריפוי בעיסוק' })
        .expect(409);

      expect(response.body.error).toBe('Role with this name already exists');
    });
  });

  describe('PUT /api/roles/:id', () => {
    it('should update a role', async () => {
      const role = await mockRoleRepo.create(createRoleFixture({
        name: 'ריפוי בעיסוק',
        isActive: true
      }));

      const updateData = {
        name: 'ריפוי בעיסוק מעודכן',
        isActive: false
      };

      const response = await request(app)
        .put(`/api/roles/${role.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe('ריפוי בעיסוק מעודכן');
      expect(response.body.isActive).toBe(false);
      expect(response.body.roleStringKey).toBe(role.roleStringKey); // Should not change
    });

    it('should trim whitespace from updated name', async () => {
      const role = await mockRoleRepo.create(createRoleFixture({
        name: 'ריפוי בעיסוק'
      }));

      const response = await request(app)
        .put(`/api/roles/${role.id}`)
        .send({ name: '  ריפוי בעיסוק מעודכן  ' })
        .expect(200);

      expect(response.body.name).toBe('ריפוי בעיסוק מעודכן');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .put('/api/roles/non-existent-id')
        .send({ name: 'Updated Name' })
        .expect(400);

      expect(response.body.error).toContain('Invalid');
    });

    it('should return 404 for valid UUID that does not exist', async () => {
      const response = await request(app)
        .put('/api/roles/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.error).toBe('Role not found');
    });

    it('should return 400 for empty name', async () => {
      const role = await mockRoleRepo.create(createRoleFixture({
        name: 'ריפוי בעיסוק'
      }));

      const response = await request(app)
        .put(`/api/roles/${role.id}`)
        .send({ name: '   ' })
        .expect(400);

      expect(response.body.error).toBe('Name cannot be empty');
    });

    it('should return 409 for duplicate name with different role', async () => {
      const role1 = await mockRoleRepo.create(createRoleFixture({
        name: 'ריפוי בעיסוק'
      }));
      const role2 = await mockRoleRepo.create(createRoleFixture({
        name: 'פיזיותרפיה'
      }));

      const response = await request(app)
        .put(`/api/roles/${role2.id}`)
        .send({ name: 'ריפוי בעיסוק' })
        .expect(409);

      expect(response.body.error).toBe('Role with this name already exists');
    });
  });

  describe('PATCH /api/roles/:id/active', () => {
    it('should set role active status', async () => {
      const role = await mockRoleRepo.create(createRoleFixture({
        name: 'ריפוי בעיסוק',
        isActive: true
      }));

      const response = await request(app)
        .patch(`/api/roles/${role.id}/active`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('should return 400 for missing isActive', async () => {
      const role = await mockRoleRepo.create(createRoleFixture({
        name: 'ריפוי בעיסוק'
      }));

      const response = await request(app)
        .patch(`/api/roles/${role.id}/active`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('isActive must be a boolean');
    });

    it('should return 400 for invalid isActive type', async () => {
      const role = await mockRoleRepo.create(createRoleFixture({
        name: 'ריפוי בעיסוק'
      }));

      const response = await request(app)
        .patch(`/api/roles/${role.id}/active`)
        .send({ isActive: 'true' })
        .expect(400);

      expect(response.body.error).toBe('isActive must be a boolean');
    });
  });

  describe('DELETE /api/roles/:id', () => {
    it('should delete a role with no employees', async () => {
      const role = await mockRoleRepo.create(createRoleFixture({
        name: 'ריפוי בעיסוק'
      }));

      await request(app)
        .delete(`/api/roles/${role.id}`)
        .expect(204);

      const deletedRole = await mockRoleRepo.findById(role.id);
      expect(deletedRole).toBeNull();
    });

    it('should return 400 when trying to delete role with employees', async () => {
      const role = await mockRoleRepo.create(createRoleFixture({
        name: 'ריפוי בעיסוק'
      }));

      // Mock that this role has employees
      mockRoleRepo.setEmployeeCount(role.id, 2);

      const response = await request(app)
        .delete(`/api/roles/${role.id}`)
        .expect(400);

      expect(response.body.error).toContain('לא ניתן למחוק תפקיד שמוקצה ל-2 עובדים');
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app)
        .delete('/api/roles/non-existent-id')
        .expect(400);
    });

    it('should return 404 for valid UUID that does not exist', async () => {
      await request(app)
        .delete('/api/roles/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('GET /api/roles/:id/employee-count', () => {
    it('should return employee count for role', async () => {
      const role = await mockRoleRepo.create(createRoleFixture({
        name: 'ריפוי בעיסוק'
      }));

      mockRoleRepo.setEmployeeCount(role.id, 3);

      const response = await request(app)
        .get(`/api/roles/${role.id}/employee-count`)
        .expect(200);

      expect(response.body.count).toBe(3);
    });

    it('should return 0 for role with no employees', async () => {
      const role = await mockRoleRepo.create(createRoleFixture({
        name: 'ריפוי בעיסוק'
      }));

      const response = await request(app)
        .get(`/api/roles/${role.id}/employee-count`)
        .expect(200);

      expect(response.body.count).toBe(0);
    });
  });
});
