import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  EmployeeRepository, 
  PatientRepository,
  RoomRepository, 
  ScheduleRepository, 
  SessionRepository, 
  ActivityRepository,
  RoleRepository
} from '../repositories';
import { createEmployeeRouter } from './employees';
import { createPatientRouter } from './patients';
import { createRoomRouter } from './rooms';
import { createScheduleRouter } from './schedule';
import { createSystemRouter } from './system';
import { createActivityRouter } from './activities';
import { createRoleRouter } from './roles';

export const createApiRouter = (
  employeeRepo: EmployeeRepository,
  patientRepo: PatientRepository,
  roomRepo: RoomRepository,
  scheduleRepo: ScheduleRepository,
  sessionRepo: SessionRepository,
  activityRepo: ActivityRepository,
  roleRepo: RoleRepository,
  prisma: PrismaClient
): Router => {
  const router = Router();

  // Mount sub-routers
  router.use('/employees', createEmployeeRouter(employeeRepo));
  router.use('/patients', createPatientRouter(patientRepo));
  router.use('/rooms', createRoomRouter(roomRepo));
  router.use('/roles', createRoleRouter(roleRepo));
  router.use('/schedule', createScheduleRouter(employeeRepo, roomRepo, scheduleRepo, sessionRepo, activityRepo, prisma));
  router.use('/system', createSystemRouter(employeeRepo, roomRepo, scheduleRepo, sessionRepo, patientRepo, activityRepo));
  router.use('/activities', createActivityRouter(activityRepo));

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
};

