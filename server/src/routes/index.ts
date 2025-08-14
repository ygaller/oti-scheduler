import { Router } from 'express';
import { 
  EmployeeRepository, 
  RoomRepository, 
  ScheduleRepository, 
  SessionRepository, 
  SystemConfigRepository 
} from '../repositories';
import { createEmployeeRouter } from './employees';
import { createRoomRouter } from './rooms';
import { createScheduleRouter } from './schedule';
import { createSystemRouter } from './system';

export const createApiRouter = (
  employeeRepo: EmployeeRepository,
  roomRepo: RoomRepository,
  scheduleRepo: ScheduleRepository,
  sessionRepo: SessionRepository,
  configRepo: SystemConfigRepository
): Router => {
  const router = Router();

  // Mount sub-routers
  router.use('/employees', createEmployeeRouter(employeeRepo));
  router.use('/rooms', createRoomRouter(roomRepo));
  router.use('/schedule', createScheduleRouter(employeeRepo, roomRepo, scheduleRepo, sessionRepo, configRepo));
  router.use('/system', createSystemRouter(employeeRepo, roomRepo, scheduleRepo, sessionRepo, configRepo));

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
};

