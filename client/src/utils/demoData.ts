import { Employee, Patient, Room, AVAILABLE_COLORS } from '../types';

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
    color: AVAILABLE_COLORS[0],
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
    color: AVAILABLE_COLORS[3],
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
    color: AVAILABLE_COLORS[8],
    isActive: true
  }
];

export const createDemoPatients = (): Patient[] => [
  {
    id: 'patient1',
    firstName: 'אמיר',
    lastName: 'רוזן',
    color: AVAILABLE_COLORS[2],
    therapyRequirements: {
      'occupational-therapist': 2,
      'speech-therapist': 1
    },
    isActive: true
  },
  {
    id: 'patient2',
    firstName: 'דנה',
    lastName: 'ברק',
    color: AVAILABLE_COLORS[6],
    therapyRequirements: {
      'physiotherapist': 3,
      'occupational-therapist': 1
    },
    isActive: true
  },
  {
    id: 'patient3',
    firstName: 'נועם',
    lastName: 'ישראלי',
    color: AVAILABLE_COLORS[9],
    therapyRequirements: {
      'speech-therapist': 2,
      'art-therapist': 1
    },
    isActive: true
  },
  {
    id: 'patient4',
    firstName: 'מיכל',
    lastName: 'אדמון',
    color: AVAILABLE_COLORS[11],
    therapyRequirements: {
      'occupational-therapist': 1,
      'physiotherapist': 2,
      'social-worker': 1
    },
    isActive: true
  },
  {
    id: 'patient5',
    firstName: 'עידו',
    lastName: 'מורג',
    color: AVAILABLE_COLORS[13],
    therapyRequirements: {
      'speech-therapist': 3
    },
    isActive: true
  }
];

export const createDemoRooms = (): Room[] => [
  { id: 'room1', name: 'חדר טיפול 1', color: AVAILABLE_COLORS[1], isActive: true },
  { id: 'room2', name: 'חדר טיפול 2', color: AVAILABLE_COLORS[5], isActive: true },
  { id: 'room3', name: 'חדר פיזיותרפיה', color: AVAILABLE_COLORS[10], isActive: true },
  { id: 'room4', name: 'חדר תקשורת', color: AVAILABLE_COLORS[14], isActive: true }
];
