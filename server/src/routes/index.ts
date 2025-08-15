import { Router } from 'express';
import { 
  EmployeeRepository, 
  PatientRepository,
  RoomRepository, 
  ScheduleRepository, 
  SessionRepository, 
  SystemConfigRepository,
  ActivityRepository
} from '../repositories';
import { createEmployeeRouter } from './employees';
import { createPatientRouter } from './patients';
import { createRoomRouter } from './rooms';
import { createScheduleRouter } from './schedule';
import { createSystemRouter } from './system';
import { createActivityRouter } from './activities';

export const createApiRouter = (
  employeeRepo: EmployeeRepository,
  patientRepo: PatientRepository,
  roomRepo: RoomRepository,
  scheduleRepo: ScheduleRepository,
  sessionRepo: SessionRepository,
  configRepo: SystemConfigRepository,
  activityRepo: ActivityRepository
): Router => {
  const router = Router();

  // Mount sub-routers
  router.use('/employees', createEmployeeRouter(employeeRepo));
  router.use('/patients', createPatientRouter(patientRepo));
  router.use('/rooms', createRoomRouter(roomRepo));
  router.use('/schedule', createScheduleRouter(employeeRepo, roomRepo, scheduleRepo, sessionRepo, configRepo));
  router.use('/system', createSystemRouter(employeeRepo, roomRepo, scheduleRepo, sessionRepo, configRepo, patientRepo, activityRepo));
  router.use('/activities', createActivityRouter(activityRepo));

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
};

