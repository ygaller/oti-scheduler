import { Router } from 'express';
import { 
  EmployeeRepository, 
  PatientRepository,
  RoomRepository, 
  ScheduleRepository, 
  SessionRepository, 
  SystemConfigRepository,
  BlockedPeriodRepository
} from '../repositories';
import { createEmployeeRouter } from './employees';
import { createPatientRouter } from './patients';
import { createRoomRouter } from './rooms';
import { createScheduleRouter } from './schedule';
import { createSystemRouter } from './system';
import { createBlockedPeriodRouter } from './blockedPeriods';

export const createApiRouter = (
  employeeRepo: EmployeeRepository,
  patientRepo: PatientRepository,
  roomRepo: RoomRepository,
  scheduleRepo: ScheduleRepository,
  sessionRepo: SessionRepository,
  configRepo: SystemConfigRepository,
  blockedPeriodRepo: BlockedPeriodRepository
): Router => {
  const router = Router();

  // Mount sub-routers
  router.use('/employees', createEmployeeRouter(employeeRepo));
  router.use('/patients', createPatientRouter(patientRepo));
  router.use('/rooms', createRoomRouter(roomRepo));
  router.use('/schedule', createScheduleRouter(employeeRepo, roomRepo, scheduleRepo, sessionRepo, configRepo));
  router.use('/system', createSystemRouter(employeeRepo, roomRepo, scheduleRepo, sessionRepo, configRepo, patientRepo, blockedPeriodRepo));
  router.use('/blocked-periods', createBlockedPeriodRouter(blockedPeriodRepo));

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
};

