import { PrismaClient } from '@prisma/client';
import { getDatabaseConfig, getConnectionString } from '../config/database';
import path from 'path';
import fs from 'fs/promises';
import { execFileSync } from 'child_process';
import fsSync from 'fs';

let prisma: PrismaClient | null = null;

export const initializeDatabase = async (): Promise<{ prisma: PrismaClient; port: number }> => {
  const config = getDatabaseConfig();
  
  console.log('🗃️  Initializing SQLite database...');
  
  // Ensure data directory exists
  await fs.mkdir(config.dataPath, { recursive: true });
  
  // Set the database URL for Prisma
  const databaseUrl = getConnectionString(config);
  process.env.DATABASE_URL = databaseUrl;
  
  console.log(`📁 SQLite database: ${config.sqliteFile}`);
  
  // Initialize Prisma client
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });
  
  // Test connection and run migrations
  try {
    await prisma.$connect();
    console.log('✅ SQLite database connection established successfully');
    
    // Run migrations automatically
    console.log('Running database migrations...');
    
    const isWin = process.platform === 'win32';
    const isElectron = process.env.ELECTRON === 'true';
    let prismaBinCandidates: string[] = [];
    let schemaCwd = path.join(__dirname, '..', '..'); // Default to server root

    if (isElectron) {
      const resourcesPath = (process as any).resourcesPath || path.join(__dirname, '..', '..', '..');
      prismaBinCandidates = [
        path.join(resourcesPath, 'app.asar.unpacked', 'server', 'node_modules', '.bin', isWin ? 'prisma.cmd' : 'prisma'),
        path.join(resourcesPath, 'app', 'server', 'node_modules', '.bin', isWin ? 'prisma.cmd' : 'prisma'),
        path.join(__dirname, '..', '..', 'node_modules', '.bin', isWin ? 'prisma.cmd' : 'prisma')
      ];
      schemaCwd = path.join(resourcesPath, 'app.asar.unpacked', 'server');
      if (!fsSync.existsSync(schemaCwd)) {
        schemaCwd = path.join(__dirname, '..', '..');
      }
    } else {
      prismaBinCandidates = [
        path.join(__dirname, '..', '..', 'node_modules', '.bin', isWin ? 'prisma.cmd' : 'prisma'),
        path.join(__dirname, '..', '..', '..', 'node_modules', '.bin', isWin ? 'prisma.cmd' : 'prisma')
      ];
    }

    const prismaBin = prismaBinCandidates.find((p: string) => {
      console.log('Checking Prisma binary candidate:', p);
      try { return fsSync.existsSync(p); } catch { return false; }
    }) || 'prisma';

    console.log('Using Prisma binary:', prismaBin);
    console.log('Schema directory:', schemaCwd);

    try {
      execFileSync(prismaBin, ['migrate', 'deploy'], {
        cwd: schemaCwd,
        stdio: 'inherit',
        env: { 
          ...process.env, 
          DATABASE_URL: databaseUrl 
        }
      });
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.log('⚠️  Migration failed, will try to continue:', error instanceof Error ? error.message : String(error));
    }
    
  } catch (error) {
    console.error('❌ Database connection or migration failed:', error);
    throw error;
  }
  
  // Return dummy port for SQLite (it doesn't use ports)
  return { prisma, port: 0 };
};

export const closeDatabase = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    console.log('✅ Database connection closed');
  }
};

export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return prisma;
};