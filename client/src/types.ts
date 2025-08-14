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
}

export interface Room {
  id: string;
  name: string;
  color: string;
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
