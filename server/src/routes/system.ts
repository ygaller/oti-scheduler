import { Router } from 'express';
import { EmployeeRepository, RoomRepository, ScheduleRepository, SessionRepository, SystemConfigRepository } from '../repositories';

export const createSystemRouter = (
  employeeRepo: EmployeeRepository,
  roomRepo: RoomRepository,
  scheduleRepo: ScheduleRepository,
  sessionRepo: SessionRepository,
  configRepo: SystemConfigRepository
): Router => {
  const router = Router();

  // POST /api/system/reset - Reset all data
  router.post('/reset', async (req, res) => {
    try {
      console.log('Starting system reset...');
      
      // Delete all data in order (respecting foreign key constraints)
      await sessionRepo.deleteAll();
      console.log('Deleted all sessions');
      
      await scheduleRepo.deleteAll();
      console.log('Deleted all schedules');
      
      await employeeRepo.deleteAll();
      console.log('Deleted all employees');
      
      await roomRepo.deleteAll();
      console.log('Deleted all rooms');
      
      await configRepo.deleteAll();
      console.log('Deleted all system config');
      
      console.log('System reset completed successfully');
      res.json({ message: 'System reset completed successfully' });
    } catch (error) {
      console.error('Error during system reset:', error);
      res.status(500).json({ error: 'Failed to reset system data' });
    }
  });

  // GET /api/system/status - Get system status
  router.get('/status', async (req, res) => {
    try {
      const [employees, rooms, schedules, sessions] = await Promise.all([
        employeeRepo.findAll(),
        roomRepo.findAll(),
        scheduleRepo.findAll(),
        sessionRepo.findAll()
      ]);

      const status = {
        employees: employees.length,
        rooms: rooms.length,
        schedules: schedules.length,
        sessions: sessions.length,
        hasData: employees.length > 0 || rooms.length > 0 || schedules.length > 0 || sessions.length > 0
      };

      res.json(status);
    } catch (error) {
      console.error('Error getting system status:', error);
      res.status(500).json({ error: 'Failed to get system status' });
    }
  });

  return router;
};
