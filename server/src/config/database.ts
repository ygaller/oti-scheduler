import path from 'path';
import os from 'os';

export interface DatabaseConfig {
  type: 'embedded' | 'remote';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  embedded: boolean;
  dataPath: string;
}

export function getDatabaseConfig(): DatabaseConfig {
  const isElectron = process.env.ELECTRON === 'true';
  const userDataPath = process.env.USER_DATA_PATH;
  
  // Default configuration
  const config: DatabaseConfig = {
    type: (process.env.DB_TYPE as 'embedded' | 'remote') || 'embedded',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'scheduling',
    username: process.env.DB_USER || 'postgres', 
    password: process.env.DB_PASSWORD || 'postgres',
    embedded: (process.env.DB_TYPE || 'embedded') === 'embedded',
    dataPath: getDataPath(isElectron, userDataPath)
  };

  return config;
}

function getDataPath(isElectron: boolean, userDataPath?: string): string {
  if (isElectron && userDataPath) {
    return path.join(userDataPath, 'database');
  }
  
  // For development, use local directory
  return path.join(process.cwd(), 'data');
}

export function getConnectionString(config: DatabaseConfig): string {
  return `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
}

