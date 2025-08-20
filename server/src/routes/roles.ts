import { Router } from 'express';
import { RoleRepository } from '../repositories';
import { CreateRoleDto, UpdateRoleDto } from '../types';
import { validateUUID } from '../utils/validation';

export const createRoleRouter = (roleRepo: RoleRepository): Router => {
  const router = Router();

  // GET /api/roles - Get all roles
  router.get('/', async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const roles = await roleRepo.findAll(includeInactive);
      res.json(roles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ error: 'Failed to fetch roles' });
    }
  });

  // GET /api/roles/:id - Get role by ID
  router.get('/:id', validateUUID(), async (req, res) => {
    try {
      const role = await roleRepo.findById(req.params.id);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }
      res.json(role);
    } catch (error) {
      console.error('Error fetching role:', error);
      res.status(500).json({ error: 'Failed to fetch role' });
    }
  });

  // POST /api/roles - Create new role
  router.post('/', async (req, res) => {
    try {
      const roleData: CreateRoleDto = req.body;
      
      // Basic validation
      if (!roleData.name || roleData.name.trim().length === 0) {
        return res.status(400).json({ error: 'Missing required field: name' });
      }

      // Check if role with same name already exists
      const existingRole = await roleRepo.findByName(roleData.name.trim());
      if (existingRole) {
        return res.status(409).json({ error: 'Role with this name already exists' });
      }

      const role = await roleRepo.create({
        ...roleData,
        name: roleData.name.trim()
      });
      res.status(201).json(role);
    } catch (error) {
      console.error('Error creating role:', error);
      res.status(500).json({ error: 'Failed to create role' });
    }
  });

  // PUT /api/roles/:id - Update role
  router.put('/:id', validateUUID(), async (req, res) => {
    try {
      const roleData: UpdateRoleDto = req.body;
      
      // Validate name if provided
      if (roleData.name !== undefined) {
        if (!roleData.name || roleData.name.trim().length === 0) {
          return res.status(400).json({ error: 'Name cannot be empty' });
        }
        
        // Check if another role with same name already exists
        const existingRole = await roleRepo.findByName(roleData.name.trim());
        if (existingRole && existingRole.id !== req.params.id) {
          return res.status(409).json({ error: 'Role with this name already exists' });
        }
        
        roleData.name = roleData.name.trim();
      }

      const role = await roleRepo.update(req.params.id, roleData);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }
      res.json(role);
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ error: 'Failed to update role' });
    }
  });

  // PATCH /api/roles/:id/active - Set role active status
  router.patch('/:id/active', validateUUID(), async (req, res) => {
    try {
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: 'isActive must be a boolean' });
      }

      const role = await roleRepo.setActive(req.params.id, isActive);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }
      res.json(role);
    } catch (error) {
      console.error('Error updating role status:', error);
      res.status(500).json({ error: 'Failed to update role status' });
    }
  });

  // DELETE /api/roles/:id - Delete role
  router.delete('/:id', validateUUID(), async (req, res) => {
    try {
      const result = await roleRepo.delete(req.params.id);
      
      if (!result.success) {
        if (result.notFound) {
          return res.status(404).json({ error: result.error });
        }
        return res.status(400).json({ error: result.error });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({ error: 'Failed to delete role' });
    }
  });

  // GET /api/roles/:id/employee-count - Get count of employees with this role
  router.get('/:id/employee-count', validateUUID(), async (req, res) => {
    try {
      const count = await roleRepo.getEmployeeCount(req.params.id);
      res.json({ count });
    } catch (error) {
      console.error('Error getting employee count for role:', error);
      res.status(500).json({ error: 'Failed to get employee count' });
    }
  });

  // GET /api/roles/:id/session-stats - Get session statistics for role
  router.get('/:id/session-stats', validateUUID(), async (req, res) => {
    try {
      const stats = await roleRepo.getSessionStats(req.params.id);
      res.json(stats);
    } catch (error) {
      console.error('Error getting session stats for role:', error);
      res.status(500).json({ error: 'Failed to get session stats' });
    }
  });

  return router;
};
