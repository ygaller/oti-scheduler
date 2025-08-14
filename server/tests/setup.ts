import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from main .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

beforeAll(async () => {
  // Test database uses the same database as development
  // No migration needed since it should already be up to date
  console.log('Test setup completed - using existing database');
});

beforeEach(async () => {
  // Clean up database before each test
  try {
    await prisma.session.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.room.deleteMany();
    await prisma.systemConfig.deleteMany();
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
    await prisma.patient.deleteMany();
    await prisma.room.deleteMany();
    await prisma.systemConfig.deleteMany();
  } catch (error) {
    console.warn('Database cleanup failed during teardown:', error instanceof Error ? error.message : String(error));
  }
  await prisma.$disconnect();
});

export { prisma };
