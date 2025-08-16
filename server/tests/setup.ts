import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase, getPrismaClient } from '../src/database/connection';

// Load environment variables - prefer test env file in CI
const envPath = process.env.CI ? '.env.test' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envPath) });

let prisma: PrismaClient;

beforeAll(async () => {
  // Skip database setup for fixture tests (which use mock repositories)
  // Check if we're running fixture tests by looking at the test file name
  const testFile = expect.getState()?.testPath || '';
  if (testFile.includes('fixtures')) {
    console.log('Skipping database setup for fixture tests...');
    return;
  }
  
  console.log('Initializing test database...');
  
  if (process.env.NODE_ENV === 'test') {
    // For tests, try to use a test database on running PostgreSQL instance
    console.log('Using test database for tests');
    const testDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:52111/scheduling';
    
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDbUrl
        }
      }
    });
    
    try {
      await prisma.$connect();
      console.log('Connected to test database successfully');
    } catch (error) {
      console.log('Failed to connect to test database, falling back to embedded database');
      await prisma.$disconnect();
      // Fall back to embedded database
      const { prisma: testPrisma } = await initializeDatabase();
      prisma = testPrisma;
    }
  } else {
    // In local development, use embedded database
    console.log('Using embedded PostgreSQL database for tests');
    const { prisma: testPrisma } = await initializeDatabase();
    prisma = testPrisma;
  }
  
  console.log('Test setup completed - database initialized');
});

beforeEach(async () => {
  // Skip database cleanup for fixture tests
  const testFile = expect.getState()?.testPath || '';
  if (testFile.includes('fixtures')) {
    return;
  }
  
  // Clean up database before each test - order matters due to foreign key constraints
  try {
    await prisma.sessionPatient.deleteMany();
    await prisma.session.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.room.deleteMany();
    await prisma.activity.deleteMany();
    
    // Only try to delete patients if the table exists
    try {
      await prisma.patient.deleteMany();
    } catch (patientError) {
      // Silently ignore if patients table doesn't exist - it's not needed for most tests
    }
    
    // Delete roles last due to foreign key constraints
    await prisma.role.deleteMany();
  } catch (error) {
    console.warn('Database cleanup failed - tests may run against existing data:', error instanceof Error ? error.message : String(error));
  }
});

afterAll(async () => {
  // Skip database cleanup for fixture tests
  const testFile = expect.getState()?.testPath || '';
  if (testFile.includes('fixtures')) {
    return;
  }
  
  // Clean up and close database connection - order matters due to foreign key constraints
  try {
    await prisma.sessionPatient.deleteMany();
    await prisma.session.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.room.deleteMany();
    await prisma.activity.deleteMany();
    
    // Only try to delete patients if the table exists
    try {
      await prisma.patient.deleteMany();
    } catch (patientError) {
      // Silently ignore if patients table doesn't exist
    }
    
    // Delete roles last due to foreign key constraints
    await prisma.role.deleteMany();
  } catch (error) {
    console.warn('Database cleanup failed during teardown:', error instanceof Error ? error.message : String(error));
  }
  
  // Check if we're in test mode with external database
  if (process.env.NODE_ENV === 'test') {
    // Using test database, just disconnect the Prisma client
    await prisma.$disconnect();
  } else {
    // Using embedded database, close it properly
    await closeDatabase();
  }
});

export { prisma };
