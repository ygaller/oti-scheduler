import { Router } from 'express';
import { EmployeeRepository, RoomRepository, ScheduleRepository, SessionRepository, SystemConfigRepository } from '../repositories';
import { generateSchedule, validateScheduleConstraints } from '../utils/scheduler';
import { CreateSessionDto, UpdateSessionDto } from '../types';

export const createScheduleRouter = (
  employeeRepo: EmployeeRepository,
  roomRepo: RoomRepository,
  scheduleRepo: ScheduleRepository,
  sessionRepo: SessionRepository,
  configRepo: SystemConfigRepository
): Router => {
  const router = Router();

  // GET /api/schedule/config - Get schedule configuration
  router.get('/config', async (req, res) => {
    try {
      const config = await configRepo.getScheduleConfig();
      if (!config) {
        // Return default config if none exists
        const defaultConfig = {
          breakfast: { startTime: '08:00', endTime: '08:30' },
          morningMeetup: { startTime: '09:00', endTime: '09:15' },
          lunch: { startTime: '12:00', endTime: '13:00' }
        };
        res.json(defaultConfig);
      } else {
        res.json(config);
      }
    } catch (error) {
      console.error('Error fetching schedule config:', error);
      res.status(500).json({ error: 'Failed to fetch schedule configuration' });
    }
  });

  // PUT /api/schedule/config - Update schedule configuration
  router.put('/config', async (req, res) => {
    try {
      const config = req.body;
      await configRepo.setScheduleConfig(config);
      res.json(config);
    } catch (error) {
      console.error('Error updating schedule config:', error);
      res.status(500).json({ error: 'Failed to update schedule configuration' });
    }
  });

  // POST /api/schedule/generate - Generate new schedule
  router.post('/generate', async (req, res) => {
    try {
      const employees = await employeeRepo.findAll();
      const rooms = await roomRepo.findAll();
      const config = await configRepo.getScheduleConfig();

      if (employees.length === 0) {
        return res.status(400).json({ error: 'No employees found' });
      }
      if (rooms.length === 0) {
        return res.status(400).json({ error: 'No rooms found' });
      }
      if (!config) {
        return res.status(400).json({ error: 'Schedule configuration not found' });
      }

      // Generate schedule using existing algorithm
      const sessions = generateSchedule(employees, rooms, config);
      
      // Save the schedule to database
      const schedule = await scheduleRepo.create(sessions);
      
      res.json(schedule);
    } catch (error) {
      console.error('Error generating schedule:', error);
      res.status(500).json({ error: 'Failed to generate schedule' });
    }
  });

  // GET /api/schedule/active - Get active schedule
  router.get('/active', async (req, res) => {
    try {
      const schedule = await scheduleRepo.findActive();
      res.json(schedule);
    } catch (error) {
      console.error('Error fetching active schedule:', error);
      res.status(500).json({ error: 'Failed to fetch active schedule' });
    }
  });

  // GET /api/schedule/all - Get all schedules
  router.get('/all', async (req, res) => {
    try {
      const schedules = await scheduleRepo.findAll();
      res.json(schedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      res.status(500).json({ error: 'Failed to fetch schedules' });
    }
  });

  // PUT /api/schedule/:id/activate - Set schedule as active
  router.put('/:id/activate', async (req, res) => {
    try {
      const schedule = await scheduleRepo.setActive(req.params.id);
      res.json(schedule);
    } catch (error) {
      console.error('Error activating schedule:', error);
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        res.status(404).json({ error: 'Schedule not found' });
      } else {
        res.status(500).json({ error: 'Failed to activate schedule' });
      }
    }
  });

  // DELETE /api/schedule/:id - Delete schedule
  router.delete('/:id', async (req, res) => {
    try {
      await scheduleRepo.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        res.status(404).json({ error: 'Schedule not found' });
      } else {
        res.status(500).json({ error: 'Failed to delete schedule' });
      }
    }
  });

  // GET /api/schedule/sessions - Get all sessions (for manual editing)
  router.get('/sessions', async (req, res) => {
    try {
      const sessions = await sessionRepo.findAll();
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  // POST /api/schedule/sessions - Create new session
  router.post('/sessions', async (req, res) => {
    try {
      const sessionData: CreateSessionDto = req.body;
      
      // Validate the session constraints
      const employees = await employeeRepo.findAll();
      const rooms = await roomRepo.findAll();
      const allSessions = await sessionRepo.findAll();
      const config = await configRepo.getScheduleConfig();
      
      if (!config) {
        return res.status(400).json({ error: 'Schedule configuration not found' });
      }

      const validation = validateScheduleConstraints(
        sessionData as any, // Type conversion needed for the validation
        allSessions,
        employees,
        rooms,
        config
      );

      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      const session = await sessionRepo.create(sessionData);
      res.status(201).json(session);
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  // PUT /api/schedule/sessions/:id - Update session
  router.put('/sessions/:id', async (req, res) => {
    try {
      const sessionData: UpdateSessionDto = req.body;
      
      // If we're updating time/day/employee/room, validate constraints
      if (sessionData.startTime || sessionData.endTime || sessionData.day || 
          sessionData.employeeId || sessionData.roomId) {
        
        const employees = await employeeRepo.findAll();
        const rooms = await roomRepo.findAll();
        const allSessions = await sessionRepo.findAll();
        const config = await configRepo.getScheduleConfig();
        
        if (!config) {
          return res.status(400).json({ error: 'Schedule configuration not found' });
        }

        // Get the current session to merge with updates
        const currentSession = await sessionRepo.findById(req.params.id);
        if (!currentSession) {
          return res.status(404).json({ error: 'Session not found' });
        }

        const updatedSession = { ...currentSession, ...sessionData };
        
        const validation = validateScheduleConstraints(
          updatedSession as any,
          allSessions.filter(s => s.id !== req.params.id), // Exclude current session
          employees,
          rooms,
          config
        );

        if (!validation.valid) {
          return res.status(400).json({ error: validation.error });
        }
      }

      const session = await sessionRepo.update(req.params.id, sessionData);
      res.json(session);
    } catch (error) {
      console.error('Error updating session:', error);
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        res.status(404).json({ error: 'Session not found' });
      } else {
        res.status(500).json({ error: 'Failed to update session' });
      }
    }
  });

  // DELETE /api/schedule/sessions/:id - Delete session
  router.delete('/sessions/:id', async (req, res) => {
    try {
      await sessionRepo.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting session:', error);
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        res.status(404).json({ error: 'Session not found' });
      } else {
        res.status(500).json({ error: 'Failed to delete session' });
      }
    }
  });

  return router;
};
