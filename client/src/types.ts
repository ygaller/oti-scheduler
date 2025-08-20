import { ConsecutiveSessionsWarning } from './services/api';

// Role entity - now a proper database entity instead of an enum
export interface Role {
  id: string;
  name: string;
  roleStringKey: string; // e.g., "role_1", "role_2", etc.
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WorkingHours {
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
}

export interface ReservedHour {
  day: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday';
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  notes?: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName?: string;
  roleId: string;
  role?: Role; // Optional populated role object
  workingHours: {
    sunday?: WorkingHours;
    monday?: WorkingHours;
    tuesday?: WorkingHours;
    wednesday?: WorkingHours;
    thursday?: WorkingHours;
  };
  reservedHours: ReservedHour[];
  weeklySessionsCount: number;
  color: string;
  isActive: boolean;
}

export interface TherapyRequirements {
  [roleStringKey: string]: number; // Role string key as key, minimum sessions as value
}

export interface Patient {
  id: string;
  firstName: string;
  lastName?: string;
  color: string;
  isActive: boolean;
  therapyRequirements: { [roleStringKey: string]: number }; // e.g., { 'role_1': 2, 'role_2': 1 }
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Room {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
}

export interface TimeRange {
  startTime: string;
  endTime: string;
}

export interface DayTimeOverride {
  [key: string]: TimeRange | null; // null means use default or no override for this day
}

export interface Activity {
  id: string;
  name: string;
  color: string;
  defaultStartTime: string | null; // null means no default time
  defaultEndTime: string | null;   // null means no default time
  dayOverrides: DayTimeOverride;   // JSON field for day-specific overrides
  isBlocking: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}



export interface Session {
  id: string;
  scheduleId?: string; // Add scheduleId here
  employeeIds: string[]; // Array of employee IDs assigned to this session
  roomId: string;
  day: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday';
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  notes?: string; // Optional notes field
  employees: Employee[]; // Array of employees assigned to this session
  patients: Patient[];
  patientIds: string[];
  consecutiveSessionsWarning?: ConsecutiveSessionsWarning;
  consecutiveSessionsOverlap?: Session[];
  forceCreate?: boolean; // Added for client-side validation bypass
}

export interface Schedule {
  id?: string;
  sessions: Session[];
  generatedAt: Date;
}

// Helper function to get role name from role object or fallback to roleStringKey
export const getRoleName = (role: Role | undefined, roleStringKey?: string): string => {
  if (role) {
    return role.name;
  }
  if (roleStringKey) {
    return roleStringKey; // Fallback to role string key if role object not available
  }
  return 'תפקיד לא ידוע';
};

// Available colors for rooms and employees (sorted by hex value)
export const AVAILABLE_COLORS = [
  '#008dcd',
  '#00c9a7',
  '#4b4453',
  '#845ec2',
  '#936c00',
  '#ad5e00',
  '#b0a8b9',
  '#c34a36',
  '#d65db1',
  '#f3c5ff',
  '#f9f871',
  '#ff6f91',
  '#ff8066',
  '#ff9671',
  '#ffc75f'
].sort();

// Helper function to get a random color
export const getRandomColor = (): string => {
  return AVAILABLE_COLORS[Math.floor(Math.random() * AVAILABLE_COLORS.length)];
};

// DTOs for Employee creation
export interface CreateEmployeeDto {
  firstName: string;
  lastName?: string;
  roleId: string;
  workingHours: {
    sunday?: WorkingHours;
    monday?: WorkingHours;
    tuesday?: WorkingHours;
    wednesday?: WorkingHours;
    thursday?: WorkingHours;
  };
  reservedHours?: ReservedHour[];
  weeklySessionsCount: number;
  color: string;
  isActive?: boolean;
}

// DTOs for Session creation and update (excluding patients and patientIds which are managed separately)
export interface CreateSessionDto extends Omit<Session, 'id' | 'employees' | 'patients' | 'patientIds' | 'consecutiveSessionsWarning' | 'consecutiveSessionsOverlap'> {}
export interface UpdateSessionDto extends Partial<Omit<Session, 'employees' | 'patients' | 'consecutiveSessionsWarning' | 'consecutiveSessionsOverlap'>> {}

// DTOs for Blocked Periods
export interface CreateActivityDto {
  name: string;
  color: string;
  defaultStartTime?: string | null;
  defaultEndTime?: string | null;
  dayOverrides?: DayTimeOverride;
  isBlocking?: boolean;
  isActive?: boolean;
}

export interface UpdateActivityDto extends Partial<CreateActivityDto> {}

// Role CRUD DTOs
export interface CreateRoleDto {
  name: string;
  isActive?: boolean;
}

export interface UpdateRoleDto extends Partial<CreateRoleDto> {}

// Electron API types
declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      getVersion: () => Promise<string>;
      database: {
        backup: () => Promise<any>;
        restore: (filePath: string) => Promise<any>;
      };
      file: {
        showSaveDialog: (options: any) => Promise<any>;
        showOpenDialog: (options: any) => Promise<any>;
        writeFile: (filePath: string, data: string) => Promise<any>;
        readFile: (filePath: string) => Promise<string>;
      };
      system: {
        getSystemInfo: () => Promise<any>;
      };
      print: {
        schedule: (htmlContent: string) => Promise<{ success: boolean; error?: string }>;
      };
    };
    appContext?: {
      isElectron: boolean;
      appName: string;
      version: string;
    };
  }
}
