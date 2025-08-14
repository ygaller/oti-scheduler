import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { 
  PrismaEmployeeRepository, 
  PrismaPatientRepository,
  PrismaRoomRepository, 
  PrismaScheduleRepository, 
  PrismaSessionRepository, 
  PrismaSystemConfigRepository,
  PrismaBlockedPeriodRepository
} from '../../src/repositories';
import { createApiRouter } from '../../src/routes';

export const createTestApp = (prisma: PrismaClient) => {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Initialize repositories
  const employeeRepo = new PrismaEmployeeRepository(prisma);
  const patientRepo = new PrismaPatientRepository(prisma);
  const roomRepo = new PrismaRoomRepository(prisma);
  const scheduleRepo = new PrismaScheduleRepository(prisma);
  const sessionRepo = new PrismaSessionRepository(prisma);
  const configRepo = new PrismaSystemConfigRepository(prisma);
  const blockedPeriodRepo = new PrismaBlockedPeriodRepository(prisma);
  
  // Setup API routes
  app.use('/api', createApiRouter(employeeRepo, patientRepo, roomRepo, scheduleRepo, sessionRepo, configRepo, blockedPeriodRepo));
  
  // Error handling
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  });
  
  return app;
};
