import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initializeDatabase, closeDatabase, getPrismaClient } from './database/connection';
import { 
  PrismaEmployeeRepository, 
  PrismaPatientRepository,
  PrismaRoomRepository, 
  PrismaScheduleRepository, 
  PrismaSessionRepository, 
  PrismaActivityRepository,
  PrismaRoleRepository
} from './repositories';
import { createApiRouter } from './routes';
import { RoleRepository, ScheduleRepository } from './repositories/interfaces';

// Ensure empty schedule exists in the database
async function ensureDefaultSchedule(scheduleRepo: ScheduleRepository): Promise<void> {
  try {
    console.log('🔍 Checking for active schedule...');
    
    // Check if any active schedule exists
    const activeSchedule = await scheduleRepo.findActive();
    
    if (!activeSchedule) {
      console.log('📝 Creating default empty schedule...');
      
      // Create an empty schedule
      const newSchedule = await scheduleRepo.create([]);
      console.log(`✅ Created default empty schedule: ${newSchedule.id}`);
    } else {
      console.log(`✅ Found active schedule (${activeSchedule.id}), skipping default schedule creation`);
    }
  } catch (error) {
    console.error('❌ Error ensuring default schedule:', error);
    // Don't throw - let the server continue even if schedule creation fails
  }
}

// Ensure default roles exist in the database
async function ensureDefaultRoles(roleRepo: RoleRepository): Promise<void> {
  try {
    console.log('🔍 Checking for default roles...');
    
    // Check if any roles exist
    const existingRoles = await roleRepo.findAll(true); // Include inactive
    
    if (existingRoles.length === 0) {
      console.log('📝 Creating default roles...');
      
      // Default roles in alphabetical order (Hebrew)
      const defaultRoles = [
        'טיפול בהבעה ויצירה',
        'עבודה סוציאלית', 
        'פיזיותרפיה',
        'קלינאות תקשורת',
        'ריפוי בעיסוק'
      ];
      
      // Create roles with generated role string keys
      for (let i = 0; i < defaultRoles.length; i++) {
        const role = await roleRepo.create({
          name: defaultRoles[i],
          isActive: true
        });
        console.log(`✅ Created default role: ${role.name} (${role.roleStringKey})`);
      }
      
      console.log(`🎉 Successfully created ${defaultRoles.length} default roles!`);
    } else {
      console.log(`✅ Found ${existingRoles.length} existing roles, skipping default role creation`);
    }
  } catch (error) {
    console.error('❌ Error ensuring default roles:', error);
    // Don't throw - let the server continue even if role creation fails
  }
}

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'https://localhost:3000',
    'http://127.0.0.1:3000',
    'https://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add security headers
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  // Allow same-origin for iframe embedding
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize server
async function startServer() {
  try {
    console.log('Starting server...');
    

    
    // Initialize database
    const { prisma, port: dbPort } = await initializeDatabase();
    console.log(`Database initialized on port ${dbPort}`);
    
    // Migrations are now handled by initializeDatabase()
    
    // Initialize repositories
    const employeeRepo = new PrismaEmployeeRepository(prisma);
    const patientRepo = new PrismaPatientRepository(prisma);
    const roomRepo = new PrismaRoomRepository(prisma);
    const scheduleRepo = new PrismaScheduleRepository(prisma);
    const sessionRepo = new PrismaSessionRepository(prisma);
    const activityRepo = new PrismaActivityRepository(prisma);
    const roleRepo = new PrismaRoleRepository(prisma);
    
    // Ensure default roles exist
    await ensureDefaultRoles(roleRepo);
    
    // Ensure default empty schedule exists
    await ensureDefaultSchedule(scheduleRepo);
    
    // Setup API routes
    app.use('/api', createApiRouter(employeeRepo, patientRepo, roomRepo, scheduleRepo, sessionRepo, activityRepo, roleRepo, prisma));

    
    // Default route
    app.get('/', (req, res) => {
      res.json({ 
        message: 'Scheduling API Server',
        version: '1.0.0',
        endpoints: {
          employees: '/api/employees',
          patients: '/api/patients',
          rooms: '/api/rooms',
          roles: '/api/roles',
          schedule: '/api/schedule',
          system: '/api/system',
          activities: '/api/activities',
          health: '/api/health'
        }
      });
    });
    
    // Error handling middleware
    app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    });
    
    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Database running on port ${dbPort}`);
      console.log('✅ Ready to accept requests');
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(async () => {
        await closeDatabase();
        process.exit(0);
      });
    });
    
    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully...');
      server.close(async () => {
        await closeDatabase();
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

