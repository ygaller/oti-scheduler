import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initializeDatabase, closeDatabase, getPrismaClient } from './database/connection';
import { 
  PrismaEmployeeRepository, 
  PrismaRoomRepository, 
  PrismaScheduleRepository, 
  PrismaSessionRepository, 
  PrismaSystemConfigRepository,
  PrismaUserRepository 
} from './repositories';
import { createApiRouter } from './routes';
import { createAuthRouter } from './routes/auth';
import { secretManager } from './config/secrets';

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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add security headers for OAuth popup support
app.use((req, res, next) => {
  // Allow cross-origin opener policy for OAuth popups
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
    
    // Initialize security (JWT secrets)
    console.log('🔐 Initializing security...');
    const jwtSecret = secretManager.getJwtSecret();
    console.log(`🔑 JWT Secret: ${jwtSecret.length} characters`);
    
    // Initialize database
    const { prisma, port: dbPort } = await initializeDatabase();
    console.log(`Database initialized on port ${dbPort}`);
    
    // Run migrations
    console.log('Running database migrations...');
    const { execSync } = require('child_process');
    execSync('npx prisma migrate deploy', { 
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit' 
    });
    
    // Initialize repositories
    const employeeRepo = new PrismaEmployeeRepository(prisma);
    const roomRepo = new PrismaRoomRepository(prisma);
    const scheduleRepo = new PrismaScheduleRepository(prisma);
    const sessionRepo = new PrismaSessionRepository(prisma);
    const configRepo = new PrismaSystemConfigRepository(prisma);
    const userRepo = new PrismaUserRepository(prisma);
    
    // Setup API routes
    app.use('/api', createApiRouter(employeeRepo, roomRepo, scheduleRepo, sessionRepo, configRepo));
    app.use('/api/auth', createAuthRouter(userRepo));
    
    // Default route
    app.get('/', (req, res) => {
      res.json({ 
        message: 'Scheduling API Server',
        version: '1.0.0',
        endpoints: {
          employees: '/api/employees',
          rooms: '/api/rooms',
          schedule: '/api/schedule',
          system: '/api/system',
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

