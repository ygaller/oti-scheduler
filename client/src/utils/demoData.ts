import { Employee, Room, AVAILABLE_COLORS } from '../types';

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
    color: AVAILABLE_COLORS[0]
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
    color: AVAILABLE_COLORS[3]
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
    color: AVAILABLE_COLORS[8]
  }
];

export const createDemoRooms = (): Room[] => [
  { id: 'room1', name: 'חדר טיפול 1', color: AVAILABLE_COLORS[1] },
  { id: 'room2', name: 'חדר טיפול 2', color: AVAILABLE_COLORS[5] },
  { id: 'room3', name: 'חדר פיזיותרפיה', color: AVAILABLE_COLORS[10] },
  { id: 'room4', name: 'חדר תקשורת', color: AVAILABLE_COLORS[14] }
];
