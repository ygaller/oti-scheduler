import path from 'path';
import os from 'os';

export interface DatabaseConfig {
  dataPath: string;
  sqliteFile: string;
}

export function getDatabaseConfig(): DatabaseConfig {
  const isElectron = process.env.ELECTRON === 'true';
  const userDataPath = process.env.USER_DATA_PATH;
  
  const dataPath = getDataPath(isElectron, userDataPath);
  const sqliteFile = path.join(dataPath, 'scheduling.db');
  
  console.log(`🗃️  Database: SQLite`);
  console.log(`📁 SQLite file: ${sqliteFile}`);
  
  return {
    dataPath,
    sqliteFile
  };
}

function getDataPath(isElectron: boolean, userDataPath?: string): string {
  if (isElectron && userDataPath) {
    return path.join(userDataPath, 'database');
  }
  
  // For development, use local directory
  return path.join(process.cwd(), 'data');
}

export function getConnectionString(config: DatabaseConfig): string {
  return `file:${config.sqliteFile}`;
}

