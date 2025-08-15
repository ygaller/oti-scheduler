import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase, getPrismaClient } from '../src/database/connection';

// Load environment variables from main .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

let prisma: PrismaClient;

beforeAll(async () => {
  // Initialize embedded database for tests
  console.log('Initializing test database...');
  const { prisma: testPrisma } = await initializeDatabase();
  prisma = testPrisma;
  console.log('Test setup completed - database initialized');
});

beforeEach(async () => {
  // Clean up database before each test
  try {
    await prisma.session.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.room.deleteMany();
    await prisma.systemConfig.deleteMany();
    
    // Only try to delete patients if the table exists
    try {
      await prisma.patient.deleteMany();
    } catch (patientError) {
      // Silently ignore if patients table doesn't exist - it's not needed for most tests
    }
  } catch (error) {
    console.warn('Database cleanup failed - tests may run against existing data:', error instanceof Error ? error.message : String(error));
  }
});

afterAll(async () => {
  // Clean up and close database connection
  try {
    await prisma.session.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.room.deleteMany();
    await prisma.systemConfig.deleteMany();
    
    // Only try to delete patients if the table exists
    try {
      await prisma.patient.deleteMany();
    } catch (patientError) {
      // Silently ignore if patients table doesn't exist
    }
  } catch (error) {
    console.warn('Database cleanup failed during teardown:', error instanceof Error ? error.message : String(error));
  }
  await closeDatabase();
});

export { prisma };
