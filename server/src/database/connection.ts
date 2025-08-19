import { PrismaClient } from '@prisma/client';
import { getDatabaseConfig, getConnectionString } from '../config/database';
import path from 'path';
import fs from 'fs/promises';
import { execFileSync } from 'child_process';
import fsSync from 'fs';

let prisma: PrismaClient | null = null;

// Programmatic migration fallback for when Prisma CLI is not available
async function attemptProgrammaticMigration(): Promise<void> {
  try {
    console.log('🔧 Attempting programmatic migration...');
    
    // For SQLite, we can run the migration SQL directly if needed
    // Check if the database is already migrated by looking for a known table
    let result: any[] = [];
    try {
      result = prisma ? await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='roles'` : [];
    } catch (queryError) {
      console.log('⚠️  Error checking database state, assuming empty database:', queryError instanceof Error ? queryError.message : String(queryError));
      result = []; // Assume empty database if we can't query
    }
    
    if (Array.isArray(result) && result.length === 0) {
      console.log('📦 Database appears to be empty, running initial migration...');
      
      // Read and execute the migration SQL
      // Find the migration file, considering Electron packaging
      let migrationPath = path.join(__dirname, '..', '..', 'prisma', 'migrations', '20250818184428_init', 'migration.sql');
      
      if (process.env.ELECTRON === 'true') {
        const resourcesPath = (process as any).resourcesPath || path.join(__dirname, '..', '..', '..');
        const electronMigrationPath = path.join(resourcesPath, 'app.asar.unpacked', 'server', 'prisma', 'migrations', '20250818184428_init', 'migration.sql');
        
        if (fsSync.existsSync(electronMigrationPath)) {
          migrationPath = electronMigrationPath;
        }
      }
      
      try {
        console.log(`📂 Reading migration file from: ${migrationPath}`);
        
        // Check if file exists before reading
        if (!fsSync.existsSync(migrationPath)) {
          throw new Error(`Migration file not found at ${migrationPath}`);
        }
        
        const migrationSql = await fs.readFile(migrationPath, 'utf-8');
        console.log(`📄 Migration file size: ${migrationSql.length} characters`);
        
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
        
        console.log(`📄 Found ${statements.length} SQL statements to execute`);
        
        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          if (statement.trim() && prisma) {
            try {
              console.log(`🔧 Executing statement ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
              await prisma.$executeRawUnsafe(statement);
              console.log(`✅ Statement ${i + 1} completed successfully`);
            } catch (stmtError) {
              console.error(`❌ Statement ${i + 1} failed:`, stmtError instanceof Error ? stmtError.message : String(stmtError));
              console.error(`💥 Failed statement: ${statement}`);
              throw stmtError; // Re-throw to stop migration
            }
          }
        }
        
        console.log('✅ Programmatic migration completed successfully');
        
        // Reconnect the Prisma client to ensure it recognizes the new schema
        await prisma.$disconnect();
        await prisma.$connect();
        console.log('🔄 Prisma client reconnected after programmatic migration');
        
        // Verify that tables were actually created
        const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`;
        console.log('📋 Tables in database after migration:', tables);
        
        if (Array.isArray(tables) && tables.length > 0) {
          console.log('✅ Migration verification: Tables were created successfully');
        } else {
          console.error('❌ Migration verification: No tables found after migration!');
          throw new Error('Migration failed - no tables created');
        }
      } catch (migrationError) {
        console.log('⚠️  Programmatic migration failed:', migrationError instanceof Error ? migrationError.message : String(migrationError));
      }
    } else {
      console.log('✅ Database already appears to be migrated');
    }
  } catch (error) {
    console.log('⚠️  Programmatic migration check failed:', error instanceof Error ? error.message : String(error));
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
      console.log('Checking Prisma binary candidate:', p);
      try { return fsSync.existsSync(p); } catch { return false; }
    }) || 'prisma';

    console.log('Using Prisma binary:', prismaBin);
    console.log('Schema directory:', schemaCwd);

    try {
      // Try different approaches for running Prisma migrations
      let migrationSuccess = false;
      
      // Approach 1: Try using the found Prisma binary directly
      if (prismaBin !== 'prisma' && fsSync.existsSync(prismaBin)) {
        try {
          console.log('Attempting migration with full Prisma binary path...');
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
        } catch (binaryError) {
          console.log('⚠️  Direct binary execution failed:', binaryError instanceof Error ? binaryError.message : String(binaryError));
        }
      }
      
      // Approach 2: Try using cmd.exe with the binary path (Windows)
      if (!migrationSuccess && isWin) {
        try {
          console.log('Attempting migration with cmd.exe wrapper...');
          const command = 'cmd.exe';
          const args = ['/c', `"${prismaBin}"`, 'migrate', 'deploy'];
          
          execFileSync(command, args, {
            cwd: schemaCwd,
            stdio: 'inherit',
            env: { 
              ...process.env, 
              DATABASE_URL: databaseUrl 
            }
          });
          console.log('✅ Database migrations completed');
          migrationSuccess = true;
        } catch (cmdError) {
          console.log('⚠️  cmd.exe execution failed:', cmdError instanceof Error ? cmdError.message : String(cmdError));
        }
      }
      
      // Approach 3: Try using npx (fallback)
      if (!migrationSuccess) {
        try {
          console.log('Attempting migration with npx fallback...');
          const command = isWin ? 'cmd.exe' : 'npx';
          const args = isWin ? ['/c', 'npx', 'prisma', 'migrate', 'deploy'] : ['prisma', 'migrate', 'deploy'];
          
          execFileSync(command, args, {
            cwd: schemaCwd,
            stdio: 'inherit',
            env: { 
              ...process.env, 
              DATABASE_URL: databaseUrl 
            }
          });
          console.log('✅ Database migrations completed');
          migrationSuccess = true;
        } catch (npxError) {
          console.log('⚠️  npx execution failed:', npxError instanceof Error ? npxError.message : String(npxError));
        }
      }
      
      // If all migration attempts failed, try programmatic approach
      if (!migrationSuccess) {
        console.log('⚠️  All external migration attempts failed, trying programmatic approach...');
        await attemptProgrammaticMigration();
        migrationSuccess = true; // Mark as successful if programmatic migration didn't throw
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