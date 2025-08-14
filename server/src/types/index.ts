// Re-export types from the client to maintain compatibility
export type Role = 
  | 'occupational-therapist'
  | 'speech-therapist' 
  | 'physiotherapist'
  | 'social-worker'
  | 'art-therapist';

export interface WorkingHours {
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: Role;
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

export interface BlockedPeriod {
  id: string;
  name: string;
  color: string;
  defaultStartTime: string | null; // null means no default time
  defaultEndTime: string | null;   // null means no default time
  dayOverrides: DayTimeOverride;   // JSON field for day-specific overrides
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Legacy interface for backward compatibility during migration
export interface ScheduleConfig {
  breakfast: {
    startTime: string;
    endTime: string;
  };
  morningMeetup: {
    startTime: string;
    endTime: string;
  };
  lunch: {
    startTime: string;
    endTime: string;
  };
}

export interface Session {
  id: string;
  employeeId: string;
  roomId: string;
  day: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday';
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
}

export interface Schedule {
  id?: string;
  sessions: Session[];
  generatedAt: Date;
}

export type WeekDay = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday';

// Database-specific types for mapping
export interface CreateEmployeeDto {
  firstName: string;
  lastName: string;
  role: Role;
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

export interface CreateSessionDto {
  employeeId: string;
  roomId: string;
  scheduleId?: string;
  day: WeekDay;
  startTime: string;
  endTime: string;
}

export interface UpdateSessionDto extends Partial<CreateSessionDto> {}

export interface CreateBlockedPeriodDto {
  name: string;
  color: string;
  defaultStartTime?: string | null;
  defaultEndTime?: string | null;
  dayOverrides?: DayTimeOverride;
  isActive?: boolean;
}

export interface UpdateBlockedPeriodDto extends Partial<CreateBlockedPeriodDto> {}

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

