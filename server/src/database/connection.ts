import { PrismaClient } from '@prisma/client';
import { getDatabaseConfig, getConnectionString } from '../config/database';
import path from 'path';
import fs from 'fs/promises';
import { execFileSync } from 'child_process';
import fsSync from 'fs';

let prisma: PrismaClient | null = null;
let migrationCompleted = false;

// Migration tracking system compatible with Prisma migrations
async function ensureMigrationTable(): Promise<void> {
  if (!prisma) return;
  
  try {
    // Create _prisma_migrations table if it doesn't exist (matches Prisma's structure)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "checksum" TEXT NOT NULL,
        "finished_at" DATETIME,
        "migration_name" TEXT NOT NULL,
        "logs" TEXT,
        "rolled_back_at" DATETIME,
        "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
      )
    `);
  } catch (error) {
    console.log('⚠️  Could not ensure migration table:', error instanceof Error ? error.message : String(error));
  }
}

async function getAppliedMigrations(): Promise<string[]> {
  if (!prisma) return [];
  
  try {
    const migrations = await prisma.$queryRaw<Array<{migration_name: string}>>`
      SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY started_at
    `;
    return migrations.map(m => m.migration_name);
  } catch (error) {
    // Table doesn't exist yet, return empty array
    return [];
  }
}

async function markMigrationAsApplied(migrationName: string, checksum: string): Promise<void> {
  if (!prisma) return;
  
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
      VALUES (?, ?, CURRENT_TIMESTAMP, ?, 1)
    `, `${migrationName}-${Date.now()}`, checksum, migrationName);
  } catch (error) {
    console.log('⚠️  Could not mark migration as applied:', error instanceof Error ? error.message : String(error));
  }
}

async function findMigrationFiles(): Promise<Array<{name: string, path: string}>> {
  const migrations: Array<{name: string, path: string}> = [];
  
  // Base migration directory
  let migrationsDir = path.join(__dirname, '..', '..', 'prisma', 'migrations');
  
  // Handle Electron packaging
  if (process.env.ELECTRON === 'true') {
    const resourcesPath = (process as any).resourcesPath || path.join(__dirname, '..', '..', '..');
    const electronMigrationsDir = path.join(resourcesPath, 'app.asar.unpacked', 'server', 'prisma', 'migrations');
    
    if (fsSync.existsSync(electronMigrationsDir)) {
      migrationsDir = electronMigrationsDir;
    }
  }
  
  try {
    if (fsSync.existsSync(migrationsDir)) {
      const migrationFolders = fsSync.readdirSync(migrationsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .sort(); // Sort chronologically by migration name
      
      for (const folderName of migrationFolders) {
        const migrationFile = path.join(migrationsDir, folderName, 'migration.sql');
        if (fsSync.existsSync(migrationFile)) {
          migrations.push({
            name: folderName,
            path: migrationFile
          });
        }
      }
    }
  } catch (error) {
    console.log('⚠️  Error reading migration directory:', error instanceof Error ? error.message : String(error));
  }
  
  return migrations;
}

async function executeMigrationFile(migrationPath: string): Promise<void> {
  if (!prisma) throw new Error('Prisma client not available');
  
  const migrationSql = await fs.readFile(migrationPath, 'utf-8');
  
  // Split the SQL into individual statements and execute them
  // First, remove all comments and normalize whitespace
  const cleanSql = migrationSql
    .replace(/--[^\r\n]*/g, '') // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  const statements = cleanSql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);
  
  console.log(`📄 Executing ${statements.length} migration statements...`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.trim()) {
      try {
        await prisma.$executeRawUnsafe(statement);
      } catch (stmtError) {
        console.error(`❌ Migration statement ${i + 1} failed:`, stmtError instanceof Error ? stmtError.message : String(stmtError));
        console.error(`💥 Failed statement: ${statement}`);
        throw stmtError; // Re-throw to stop migration
      }
    }
  }
}

// Programmatic migration fallback for when Prisma CLI is not available
async function attemptProgrammaticMigration(): Promise<void> {
  if (migrationCompleted) {
    console.log('✅ Migration already completed, skipping...');
    return;
  }

  try {
    console.log('🔧 Attempting programmatic migration...');
    
    // Ensure migration tracking table exists
    await ensureMigrationTable();
    
    // Get all available migration files
    const allMigrations = await findMigrationFiles();
    
    if (allMigrations.length === 0) {
      console.log('⚠️  No migration files found');
      migrationCompleted = true;
      return;
    }
    
    // Get already applied migrations
    const appliedMigrations = await getAppliedMigrations();
    
    // Find migrations that need to be applied
    const pendingMigrations = allMigrations.filter(
      migration => !appliedMigrations.includes(migration.name)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✅ All migrations already applied');
      migrationCompleted = true;
      return;
    }
    
    console.log(`📦 Found ${pendingMigrations.length} pending migrations to apply`);
    
    // Apply each pending migration
    for (const migration of pendingMigrations) {
      console.log(`🔄 Applying migration: ${migration.name}`);
      
      try {
        await executeMigrationFile(migration.path);
        
        // Calculate checksum for tracking (simple hash of file content)
        const content = await fs.readFile(migration.path, 'utf-8');
        const checksum = Buffer.from(content).toString('base64').substring(0, 64);
        
        // Mark as applied
        await markMigrationAsApplied(migration.name, checksum);
        
        console.log(`✅ Migration ${migration.name} applied successfully`);
      } catch (error) {
        console.error(`❌ Migration ${migration.name} failed:`, error instanceof Error ? error.message : String(error));
        throw error; // Stop on first failure
      }
    }
    
    console.log('✅ All programmatic migrations completed successfully');
    
    // Reconnect the Prisma client to ensure it recognizes the new schema
    await prisma.$disconnect();
    await prisma.$connect();
    console.log('🔄 Prisma client reconnected after programmatic migration');
    
    // Verify that tables were actually created
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`;
    
    if (Array.isArray(tables) && tables.length > 0) {
      console.log(`✅ Migration verified: ${tables.length} tables created successfully`);
      migrationCompleted = true;
    } else {
      console.error('❌ Migration verification failed: No tables found!');
      throw new Error('Migration failed - no tables created');
    }
  } catch (error) {
    console.log('⚠️  Programmatic migration failed:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

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
      try { return fsSync.existsSync(p); } catch { return false; }
    }) || 'prisma';

    try {
      // For Electron environments, use programmatic migration directly
      // This is more reliable than trying to execute external Prisma CLI
      if (isElectron) {
        console.log('🔧 Running programmatic migration for Electron environment...');
        await attemptProgrammaticMigration();
      } else {
        // For development, try Prisma CLI first, then fall back to programmatic
        let migrationSuccess = false;
        
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
          migrationSuccess = true;
        } catch (cliError) {
          console.log('⚠️  Prisma CLI migration failed, using programmatic approach...');
          await attemptProgrammaticMigration();
          migrationSuccess = true;
        }
      }
      
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