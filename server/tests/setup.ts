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
  
  // In local development, use embedded database
  console.log('Using embedded SQLite database for tests');
  const { prisma: testPrisma } = await initializeDatabase();
  prisma = testPrisma;
  
  console.log('Test setup completed - database initialized');
  
  // Create a default role for tests that require a valid roleId
  try {
    await prisma.role.upsert({
      where: { name: 'Default Test Role' },
      update: {},
      create: {
        id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', // Consistent ID for testing
        name: 'Default Test Role',
        roleStringKey: 'default_test_role',
      },
    });
  } catch (error) {
    console.error('Failed to create default test role:', error);
  }

}, 120000); // 2 minutes timeout for database setup

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
  // if (process.env.NODE_ENV === 'test') {
  //   // Using test database, just disconnect the Prisma client
  //   await prisma.$disconnect();
  // } else {
  //   // Using embedded database, close it properly
    await closeDatabase();
  // }
}, 60000); // 1 minute timeout for cleanup

export { prisma };
