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

export interface TherapyRequirements {
  [role: string]: number; // Role as key, minimum sessions as value
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
  day: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday';
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  patients?: Patient[]; // Optional array of patients assigned to this session
}

export interface Schedule {
  id?: string;
  sessions: Session[];
  generatedAt: Date;
}

export const ROLE_LABELS: Record<Role, string> = {
  'occupational-therapist': 'ריפוי בעיסוק',
  'speech-therapist': 'קלינאות תקשורת',
  'physiotherapist': 'פיזיותרפיה',
  'social-worker': 'עבודה סוציאלית',
  'art-therapist': 'טיפול בהבעה ויציאה'
};

export const DAY_LABELS = {
  sunday: 'יום ראשון',
  monday: 'יום שני',
  tuesday: 'יום שלישי',
  wednesday: 'יום רביעי',
  thursday: 'יום חמישי'
};

export type WeekDay = keyof typeof DAY_LABELS;
export const WEEK_DAYS: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];

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
