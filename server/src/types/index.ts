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
}

export interface Room {
  id: string;
  name: string;
}

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
}

export interface UpdateEmployeeDto extends Partial<CreateEmployeeDto> {}

export interface CreateRoomDto {
  name: string;
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
