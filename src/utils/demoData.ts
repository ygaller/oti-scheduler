// Demo data types (local definitions since this is standalone)
type Role = 'occupational-therapist' | 'speech-therapist' | 'physiotherapist' | 'social-worker' | 'art-therapist';

interface WorkingHours {
  startTime: string;
  endTime: string;
}

interface Employee {
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

interface Room {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
}

export const createDemoEmployees = (): Employee[] => [
  {
    id: 'emp1',
    firstName: 'שרה',
    lastName: 'כהן',
    role: 'occupational-therapist',
    weeklySessionsCount: 12,
    workingHours: {
      sunday: { startTime: '08:00', endTime: '16:00' },
      monday: { startTime: '08:00', endTime: '16:00' },
      tuesday: { startTime: '08:00', endTime: '16:00' },
      wednesday: { startTime: '08:00', endTime: '14:00' },
      thursday: { startTime: '08:00', endTime: '16:00' }
    },
    color: '#845ec2',
    isActive: true
  },
  {
    id: 'emp2',
    firstName: 'דוד',
    lastName: 'לוי',
    role: 'speech-therapist',
    weeklySessionsCount: 10,
    workingHours: {
      sunday: { startTime: '09:00', endTime: '17:00' },
      monday: { startTime: '09:00', endTime: '17:00' },
      tuesday: { startTime: '09:00', endTime: '17:00' },
      wednesday: { startTime: '09:00', endTime: '15:00' },
      thursday: { startTime: '09:00', endTime: '17:00' }
    },
    color: '#ff6f91',
    isActive: true
  },
  {
    id: 'emp3',
    firstName: 'מירי',
    lastName: 'אברהם',
    role: 'physiotherapist',
    weeklySessionsCount: 8,
    workingHours: {
      sunday: { startTime: '08:30', endTime: '15:30' },
      tuesday: { startTime: '08:30', endTime: '15:30' },
      thursday: { startTime: '08:30', endTime: '15:30' }
    },
    color: '#00c9a7',
    isActive: true
  }
];

export const createDemoRooms = (): Room[] => [
  { id: 'room1', name: 'חדר טיפול 1', color: '#008dcd', isActive: true },
  { id: 'room2', name: 'חדר טיפול 2', color: '#ffc75f', isActive: true },
  { id: 'room3', name: 'חדר פיזיותרפיה', color: '#d65db1', isActive: true },
  { id: 'room4', name: 'חדר תקשורת', color: '#ff8066', isActive: true }
];
