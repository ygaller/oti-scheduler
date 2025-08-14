import path from 'path';

const isDev = process.env.NODE_ENV === 'development';
const isElectron = process.env.ELECTRON === 'true' || process.versions?.electron !== undefined;

export interface DatabaseConfig {
  embedded: boolean;
  host: string;
  port: number;
  database: string;
  dataPath: string;
  username: string;
  password: string;
}

export const getDatabaseConfig = (): DatabaseConfig => {
  let dbPath: string;
  
  if (isElectron) {
    // In Electron, we'll use the userData directory
    // This will be set by the main process
    dbPath = process.env.USER_DATA_PATH || path.join(process.cwd(), 'data');
    dbPath = path.join(dbPath, 'scheduling_db');
  } else {
    // In development/web mode, use local data directory
    dbPath = path.join(process.cwd(), 'data', 'scheduling_db');
  }

  return {
    embedded: process.env.DB_TYPE !== 'remote',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '0'), // 0 = dynamic port for embedded
    database: process.env.DB_NAME || 'scheduling',
    dataPath: dbPath,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  };
};

export const getConnectionString = (config: DatabaseConfig): string => {
  return `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
};
