import { PrismaClient } from '@prisma/client';
import { spawn, ChildProcess } from 'child_process';
import { getDatabaseConfig, getConnectionString } from '../config/database';
import path from 'path';
import fs from 'fs/promises';

let prisma: PrismaClient | null = null;
let postgresProcess: ChildProcess | null = null;
let dbPort: number | null = null;

// Simple embedded PostgreSQL using local postgres installation
async function startEmbeddedPostgres(config: any): Promise<number> {
  const dataDir = path.join(config.dataPath, 'data');
  const logFile = path.join(config.dataPath, 'postgres.log');
  
  // Ensure directories exist
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(path.dirname(logFile), { recursive: true });
  
  // --- Aggressive cleanup for test environment ---
  // Attempt to stop any running postgres processes cleanly
  try {
    console.log('Attempting to stop any existing embedded PostgreSQL process...');
    const stopProcess = spawn('pg_ctl', ['-D', dataDir, 'stop', '-m', 'fast'], {
      stdio: 'pipe'
    });
    await new Promise<void>((resolve) => {
      stopProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Existing PostgreSQL stopped successfully.');
        } else {
          console.warn(`⚠️  pg_ctl stop exited with code ${code}. Might be no process or an error.`);
        }
        resolve();
      });
      stopProcess.on('error', (err) => {
        console.warn(`⚠️  Error trying to stop PostgreSQL: ${err.message}`);
        resolve();
      });
    });
  } catch (error) {
    console.warn(`⚠️  Failed to attempt pg_ctl stop: ${error instanceof Error ? error.message : String(error)}`);
  }

  // If stop fails or a stale postmaster.pid exists (indicating a crash), remove data directory
  const lockFile = path.join(dataDir, 'postmaster.pid');
  try {
    await fs.access(lockFile);
    console.log('Stale postmaster.pid found. Removing data directory for clean start.');
    await fs.rm(dataDir, { recursive: true, force: true });
    console.log('✅ Data directory removed.');
    await fs.mkdir(dataDir, { recursive: true }); // Recreate directory
  } catch (e) {
    // No lock file, or directory doesn't exist, which is fine.
  }
  // --- End aggressive cleanup ---
  
  // Find an available port (simple implementation)
  const findAvailablePort = async (): Promise<number> => {
    const net = require('net');
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.unref();
      server.on('error', reject);
      server.listen(0, () => {
        const port = server.address()?.port;
        server.close(() => {
          resolve(port);
        });
      });
    });
  };
  
  const port = await findAvailablePort();
  
  // Check if data directory is initialized
  const pgVersionFile = path.join(dataDir, 'PG_VERSION');
  let needsInit = false;
  
  try {
    await fs.access(pgVersionFile);
  } catch {
    needsInit = true;
  }
  
  if (needsInit) {
    console.log('Initializing PostgreSQL data directory...');
    const initProcess = spawn('initdb', ['-D', dataDir, '-U', config.username], {
      stdio: 'pipe'
    });
    
    await new Promise<void>((resolve, reject) => {
      initProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ PostgreSQL data directory initialized');
          resolve();
        } else {
          reject(new Error(`initdb failed with code ${code}`));
        }
      });
      
      initProcess.on('error', (error) => {
        reject(new Error(`Failed to start initdb: ${error.message}`));
      });
    });
  }
  
  // Clean up any stale lock files - this part is less critical after aggressive removal above
  // but good to keep for robustness in case directory wasn't fully removed
  // const lockFile = path.join(dataDir, 'postmaster.pid');
  // try {
  //   await fs.unlink(lockFile);
  //   console.log('Removed stale PostgreSQL lock file');
  // } catch {
  //   // Lock file doesn't exist, which is fine
  // }
  
  console.log(`Starting embedded PostgreSQL on port ${port}...`);
  console.log(`Data directory: ${dataDir}`);
  console.log(`Log file: ${logFile}`);
  
  // Start PostgreSQL
  postgresProcess = spawn('postgres', [
    '-D', dataDir,
    '-p', port.toString(),
    '-k', '/tmp',  // Unix socket directory
    '-F'  // Don't fork into background
  ], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  // Log PostgreSQL output
  if (postgresProcess.stdout) {
    postgresProcess.stdout.on('data', (data) => {
      console.log(`[PG] ${data.toString().trim()}`);
    });
  }
  
  if (postgresProcess.stderr) {
    postgresProcess.stderr.on('data', (data) => {
      console.log(`[PG] ${data.toString().trim()}`);
    });
  }
  
  postgresProcess.on('error', (error) => {
    console.error('PostgreSQL process error:', error);
  });
  
  postgresProcess.on('exit', (code, signal) => {
    console.log(`PostgreSQL process exited with code ${code}, signal ${signal}`);
  });
  
  // Wait for PostgreSQL to be ready
  await new Promise<void>((resolve, reject) => {
    const maxAttempts = 30;
    let attempts = 0;
    
    const checkConnection = async () => {
      attempts++;
      try {
        const { Client } = require('pg');
        const client = new Client({
          host: 'localhost',
          port: port,
          user: config.username,
          database: 'postgres'  // Connect to default database first
        });
        
        await client.connect();
        
        // Create our application database
        try {
          await client.query(`CREATE DATABASE "${config.database}"`);
          console.log(`✅ Database "${config.database}" created`);
        } catch (error: any) {
          if (error.code !== '42P04') { // Database already exists
            console.warn('Database creation warning:', error.message);
          }
        }
        
        await client.end();
        resolve();
      } catch (error) {
        if (attempts >= maxAttempts) {
          reject(new Error(`PostgreSQL failed to start after ${maxAttempts} attempts`));
        } else {
          setTimeout(checkConnection, 1000);
        }
      }
    };
    
    // Start checking after a short delay
    setTimeout(checkConnection, 2000);
  });
  
  console.log('✅ Embedded PostgreSQL started successfully');
  return port;
}

export const initializeDatabase = async (): Promise<{ prisma: PrismaClient; port: number }> => {
  const config = getDatabaseConfig();
  
  if (config.embedded) {
    try {
      dbPort = await startEmbeddedPostgres(config);
    } catch (error) {
      console.error('❌ Failed to start embedded PostgreSQL:', error);
      console.log('\n💡 Fallback: Make sure PostgreSQL is installed:');
      console.log('   brew install postgresql');
      console.log('   Or set DB_TYPE=remote in .env to use external PostgreSQL');
      throw error;
    }
  } else {
    dbPort = config.port || 5432;
    console.log(`Using external PostgreSQL at ${config.host}:${dbPort}`);
  }
  
  // Set the database URL for Prisma
  process.env.DATABASE_URL = getConnectionString({
    ...config,
    port: dbPort
  });
  
  console.log(`Connecting to PostgreSQL database...`);
  
  // Initialize Prisma client
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  
  // Test connection and run migrations
  try {
    await prisma.$connect();
    console.log('✅ Database connection established successfully');
    
    // Run migrations automatically
    const { execSync } = require('child_process');
    console.log('Running database migrations...');
    try {
      execSync('npx prisma migrate deploy', { 
        cwd: path.join(__dirname, '..', '..'), // Go to server root where prisma folder is
        stdio: 'inherit',
        env: { 
          ...process.env, 
          DATABASE_URL: process.env.DATABASE_URL 
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
  
  return { prisma, port: dbPort };
};

export const closeDatabase = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
  
  if (postgresProcess) {
    console.log('Stopping embedded PostgreSQL...');
    postgresProcess.kill('SIGTERM');
    
    // Wait for process to exit
    await new Promise<void>((resolve) => {
      if (postgresProcess) {
        postgresProcess.on('exit', () => {
          postgresProcess = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
    
    console.log('✅ Embedded PostgreSQL stopped');
  }
  
  console.log('Database connection closed');
};

export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return prisma;
};

export const getDatabasePort = (): number => {
  if (dbPort === null) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dbPort;
};

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database connection...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database connection...');
  await closeDatabase();
  process.exit(0);
});