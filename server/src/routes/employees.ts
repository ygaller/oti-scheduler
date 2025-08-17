import { Router } from 'express';
import { EmployeeRepository } from '../repositories';
import { CreateEmployeeDto, UpdateEmployeeDto } from '../types';
import { validateUUID } from '../utils/validation';

export const createEmployeeRouter = (employeeRepo: EmployeeRepository): Router => {
  const router = Router();

  // GET /api/employees - Get all employees
  router.get('/', async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const employees = await employeeRepo.findAll(includeInactive);
      res.json(employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ error: 'Failed to fetch employees' });
    }
  });

  // GET /api/employees/:id - Get employee by ID
  router.get('/:id', validateUUID(), async (req, res) => {
    try {
      const employee = await employeeRepo.findById(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      res.json(employee);
    } catch (error) {
      console.error('Error fetching employee:', error);
      res.status(500).json({ error: 'Failed to fetch employee' });
    }
  });

  // POST /api/employees - Create new employee
  router.post('/', async (req, res) => {
    try {
      const employeeData: CreateEmployeeDto = req.body;
      
      // Basic validation
      if (!employeeData.firstName || !employeeData.roleId) {
        return res.status(400).json({ error: 'Missing required fields: firstName, roleId' });
      }

      const employee = await employeeRepo.create(employeeData);
      res.status(201).json(employee);
    } catch (error) {
      console.error('Error creating employee:', error);
      res.status(500).json({ error: 'Failed to create employee' });
    }
  });

  // PUT /api/employees/:id - Update employee
  router.put('/:id', validateUUID(), async (req, res) => {
    try {
      const employeeData: UpdateEmployeeDto = req.body;
      const employee = await employeeRepo.update(req.params.id, employeeData);
      res.json(employee);
    } catch (error) {
      console.error('Error updating employee:', error);
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        res.status(404).json({ error: 'Employee not found' });
      } else {
        res.status(500).json({ error: 'Failed to update employee' });
      }
    }
  });

  // PATCH /api/employees/:id/status - Enable/disable employee
  router.patch('/:id/status', validateUUID(), async (req, res) => {
    try {
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: 'isActive must be a boolean' });
      }
      
      const employee = await employeeRepo.setActive(req.params.id, isActive);
      res.json(employee);
    } catch (error) {
      console.error('Error updating employee status:', error);
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        res.status(404).json({ error: 'Employee not found' });
      } else {
        res.status(500).json({ error: 'Failed to update employee status' });
      }
    }
  });

  return router;
};

