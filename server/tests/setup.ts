import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase, getPrismaClient } from '../src/database/connection';

// Load environment variables - prefer test env file in CI
const envPath = process.env.CI ? '.env.test' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envPath) });

let prisma: PrismaClient;

beforeAll(async () => {
  console.log('Initializing test database...');
  
  if (process.env.CI || process.env.NODE_ENV === 'test') {
    // In CI or test environment, use direct PrismaClient with external database
    console.log('Using external PostgreSQL database for tests');
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || process.env.TEST_DATABASE_URL
        }
      }
    });
    await prisma.$connect();
  } else {
    // In local development, use embedded database
    console.log('Using embedded PostgreSQL database for tests');
    const { prisma: testPrisma } = await initializeDatabase();
    prisma = testPrisma;
  }
  
  console.log('Test setup completed - database initialized');
});

beforeEach(async () => {
  // Clean up database before each test
  try {
    await prisma.session.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.room.deleteMany();
    
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
    
    // Only try to delete patients if the table exists
    try {
      await prisma.patient.deleteMany();
    } catch (patientError) {
      // Silently ignore if patients table doesn't exist
    }
  } catch (error) {
    console.warn('Database cleanup failed during teardown:', error instanceof Error ? error.message : String(error));
  }
  
  if (process.env.CI || process.env.NODE_ENV === 'test') {
    // In CI, just disconnect the Prisma client
    await prisma.$disconnect();
  } else {
    // In local development, close the embedded database
    await closeDatabase();
  }
});

export { prisma };
