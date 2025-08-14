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
