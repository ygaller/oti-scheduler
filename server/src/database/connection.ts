import { PrismaClient } from '@prisma/client';
import { getDatabaseConfig, getConnectionString } from '../config/database';
import path from 'path';
import fs from 'fs/promises';
import { execFileSync } from 'child_process';
import fsSync from 'fs';

let prisma: PrismaClient | null = null;
let migrationCompleted = false;
let backupPath: string | null = null;

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

// Database backup and restore functions
async function createDatabaseBackup(dbPath: string): Promise<string> {
  if (!prisma) throw new Error('Prisma client not available');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `backup-${timestamp}.db`;
  const backupDir = path.dirname(dbPath);
  const backupFullPath = path.join(backupDir, backupFileName);
  
  try {
    console.log('💾 Creating database backup...');
    
    // Use SQLite's VACUUM INTO command to create a clean backup
    await prisma.$executeRawUnsafe(`VACUUM INTO '${backupFullPath}'`);
    
    console.log(`✅ Database backup created: ${backupFullPath}`);
    return backupFullPath;
  } catch (error) {
    console.error('❌ Failed to create database backup:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function restoreDatabaseFromBackup(originalDbPath: string, backupPath: string): Promise<void> {
  try {
    console.log('🔄 Restoring database from backup...');
    
    // Close the current Prisma connection
    if (prisma) {
      await prisma.$disconnect();
      prisma = null;
    }
    
    // Wait a moment for the connection to fully close
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Copy backup over the original database
    await fs.copyFile(backupPath, originalDbPath);
    
    console.log('✅ Database restored from backup successfully');
  } catch (error) {
    console.error('❌ Failed to restore database from backup:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function cleanupBackup(backupPath: string): Promise<void> {
  try {
    if (fsSync.existsSync(backupPath)) {
      await fs.unlink(backupPath);
      console.log('🧹 Backup file cleaned up');
    }
  } catch (error) {
    console.log('⚠️  Could not cleanup backup file:', error instanceof Error ? error.message : String(error));
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



async function tableExists(tableName: string): Promise<boolean> {
  if (!prisma) return false;
  
  try {
    const result = await prisma.$queryRaw<Array<{name: string}>>`
      SELECT name FROM sqlite_master WHERE type='table' AND name=${tableName}
    `;
    return result.length > 0;
  } catch (error) {
    return false;
  }
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  if (!prisma) return false;
  
  try {
    const result = await prisma.$queryRaw<Array<{name: string}>>`
      PRAGMA table_info(${tableName})
    `;
    return result.some(col => col.name === columnName);
  } catch (error) {
    return false;
  }
}

async function indexExists(indexName: string): Promise<boolean> {
  if (!prisma) return false;
  
  try {
    const result = await prisma.$queryRaw<Array<{name: string}>>`
      SELECT name FROM sqlite_master WHERE type='index' AND name=${indexName}
    `;
    return result.length > 0;
  } catch (error) {
    return false;
  }
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
  
  console.log(`📄 Executing ${statements.length} migration statements (strict mode - any error triggers restore)...`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.trim()) {
      try {
        // Check for CREATE TABLE statements
        if (statement.includes('CREATE TABLE')) {
          const tableMatch = statement.match(/CREATE TABLE "([^"]+)"/);
          if (tableMatch) {
            const tableName = tableMatch[1];
            const exists = await tableExists(tableName);
            if (exists) {
              console.log(`✅ Table ${tableName} already exists, skipping...`);
              continue;
            }
          }
        }
        
        // Check for CREATE INDEX statements
        if (statement.includes('CREATE') && statement.includes('INDEX')) {
          const indexMatch = statement.match(/CREATE (?:UNIQUE )?INDEX "([^"]+)"/);
          if (indexMatch) {
            const indexName = indexMatch[1];
            const exists = await indexExists(indexName);
            if (exists) {
              console.log(`✅ Index ${indexName} already exists, skipping...`);
              continue;
            }
          }
        }
        
        // Special handling for ALTER TABLE ADD COLUMN - check if column exists first
        if (statement.includes('ALTER TABLE') && statement.includes('ADD COLUMN')) {
          const tableMatch = statement.match(/ALTER TABLE "([^"]+)"/);
          const columnMatch = statement.match(/ADD COLUMN "([^"]+)"/);
          
          if (tableMatch && columnMatch) {
            const tableName = tableMatch[1];
            const columnName = columnMatch[1];
            
            const exists = await columnExists(tableName, columnName);
            if (exists) {
              console.log(`✅ Column ${columnName} already exists in table ${tableName}, skipping...`);
              continue;
            }
          }
        }
        
        await prisma.$executeRawUnsafe(statement);
        console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
      } catch (stmtError) {
        const errorMessage = stmtError instanceof Error ? stmtError.message : String(stmtError);
        console.error(`❌ Migration statement ${i + 1} failed:`, errorMessage);
        console.error(`💥 Failed statement: ${statement}`);
        console.error(`🚨 STRICT MODE: Any error triggers database restore`);
        
        // In strict mode, ANY error is treated as critical
        throw stmtError;
      }
    }
  }
  
  console.log(`✅ All migration statements executed successfully`);
}

// Programmatic migration fallback for when Prisma CLI is not available
async function attemptProgrammaticMigration(): Promise<void> {
  if (migrationCompleted) {
    console.log('✅ Migration already completed, skipping...');
    return;
  }

  // Get database path for backup
  const config = getDatabaseConfig();
  const dbPath = config.sqliteFile;

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
    
    // Create backup before applying migrations
    try {
      backupPath = await createDatabaseBackup(dbPath);
    } catch (backupError) {
      console.log('⚠️  Could not create backup, proceeding without backup protection');
      backupPath = null;
    }
    
    // Apply each pending migration (STRICT MODE - any error triggers restore)
    let migrationFailed = false;
    let failedMigration = '';
    let migrationError: Error | null = null;
    
    for (const migration of pendingMigrations) {
      console.log(`🔄 Applying migration: ${migration.name} (STRICT MODE)`);
      
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
        console.error(`🚨 STRICT MODE: Migration failure detected, will restore from backup`);
        
        migrationFailed = true;
        failedMigration = migration.name;
        migrationError = error instanceof Error ? error : new Error(String(error));
        break; // Stop immediately on any error
      }
    }
    
    // Handle restore if ANY migration failed
    if (migrationFailed && backupPath) {
      try {
        console.log(`🔄 Restoring database due to failed migration: ${failedMigration}`);
        await restoreDatabaseFromBackup(dbPath, backupPath);
        console.log('✅ Database successfully restored from backup');
        throw new Error(`Migration '${failedMigration}' failed and database was restored from backup: ${migrationError?.message}`);
      } catch (restoreError) {
        console.error('❌ Failed to restore database from backup:', restoreError);
        throw new Error(`Migration '${failedMigration}' failed AND database restore failed: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
      }
    } else if (migrationFailed && !backupPath) {
      console.error('❌ Migration failed but no backup available for restore');
      throw new Error(`Migration '${failedMigration}' failed and no backup was available for restore: ${migrationError?.message}`);
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
      
      // Clean up backup on successful migration
      if (backupPath) {
        await cleanupBackup(backupPath);
        backupPath = null;
      }
    } else {
      console.error('❌ Migration verification failed: No tables found!');
      throw new Error('Migration failed - no tables created');
    }
  } catch (error) {
    console.error('❌ Programmatic migration failed:', error instanceof Error ? error.message : String(error));
    console.error('🚨 STRICT MODE: Application startup will be aborted due to migration failure');
    
    // Clean up backup on failure (restore already happened if needed)
    if (backupPath) {
      await cleanupBackup(backupPath);
      backupPath = null;
    }
    
    // In strict mode, we throw the error to prevent application startup with inconsistent database state
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
      console.error('❌ Migration failed:', error instanceof Error ? error.message : String(error));
      console.error('🚨 STRICT MODE: Cannot start application with failed migrations');
      throw error; // Re-throw to prevent application startup
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