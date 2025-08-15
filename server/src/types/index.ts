// Role entity - now a proper database entity instead of an enum
export interface Role {
  id: string;
  name: string;
  roleStringKey: string; // e.g., "role_1", "role_2", etc.
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkingHours {
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  roleId: string;
  role?: Role; // Optional populated role object
  workingHours: {
    sunday?: WorkingHours;
    monday?: WorkingHours;
    tuesday?: WorkingHours;
    wednesday?: WorkingHours;
    thursday?: WorkingHours;
  };
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
  lastName: string;
  color: string;
  therapyRequirements: TherapyRequirements;
  isActive: boolean;
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
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}



export interface Session {
  id: string;
  employeeId: string;
  roomId: string;
  scheduleId?: string; // Optional reference to parent schedule
  day: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday';
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  patients?: Patient[]; // Optional array of patients assigned to this session
}

export interface Schedule {
  id?: string;
  sessions: Session[];
  generatedAt: Date;
  isActive?: boolean;
}

export type WeekDay = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday';

// Database-specific types for mapping
export interface CreateEmployeeDto {
  firstName: string;
  lastName: string;
  roleId: string;
  workingHours: Employee['workingHours'];
  weeklySessionsCount: number;
  color: string;
  isActive?: boolean;
}

export interface UpdateEmployeeDto extends Partial<CreateEmployeeDto> {}

export interface CreateRoomDto {
  name: string;
  color: string;
  isActive?: boolean;
}

export interface UpdateRoomDto extends Partial<CreateRoomDto> {}

export interface CreatePatientDto {
  firstName: string;
  lastName: string;
  color: string;
  therapyRequirements?: TherapyRequirements;
  isActive?: boolean;
}

export interface UpdatePatientDto extends Partial<CreatePatientDto> {}

export interface CreateSessionDto {
  employeeId: string;
  roomId: string;
  scheduleId: string; // Required - sessions must belong to a schedule
  day: WeekDay;
  startTime: string;
  endTime: string;
}

export interface UpdateSessionDto extends Partial<Omit<CreateSessionDto, 'scheduleId'>> {
  // scheduleId is immutable after creation - sessions cannot be moved between schedules
}

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

// Session-Patient relationship
export interface SessionPatient {
  id: string;
  sessionId: string;
  patientId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateSessionPatientDto {
  sessionId: string;
  patientId: string;
}

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

