import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env.test') });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5433/scheduling_test'
    }
  }
});

beforeAll(async () => {
  // Set up test database
  try {
    // Run migrations for test database
    execSync('npx prisma migrate deploy', {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: 'inherit'
    });
    
    // Generate Prisma client
    execSync('npx prisma generate', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    
    console.log('Test database setup completed');
  } catch (error) {
    console.error('Failed to set up test database:', error);
    throw error;
  }
});

beforeEach(async () => {
  // Clean up database before each test
  await prisma.session.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.room.deleteMany();
  await prisma.systemConfig.deleteMany();
});

afterAll(async () => {
  // Clean up and close database connection
  await prisma.session.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.room.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.$disconnect();
});

export { prisma };
