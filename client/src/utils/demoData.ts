import { Employee, Patient, Room, AVAILABLE_COLORS } from '../types';

// This demo data is deprecated - use the server-side seed data instead
// The following data structures do not match the new role system

export const createDemoEmployees = (): Employee[] => [
  {
    id: 'emp1',
    firstName: 'שרה',
    roleId: 'role-id-placeholder', // This needs to be fetched from role service
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
    roleId: 'role-id-placeholder', // This needs to be fetched from role service
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
    roleId: 'role-id-placeholder', // This needs to be fetched from role service
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
    color: AVAILABLE_COLORS[2],
    therapyRequirements: {
      'role_5': 2, // ריפוי בעיסוק
      'role_4': 1  // קלינאות תקשורת
    },
    isActive: true
  },
  {
    id: 'patient2',
    firstName: 'דנה',
    color: AVAILABLE_COLORS[6],
    therapyRequirements: {
      'role_3': 3, // פיזיותרפיה
      'role_5': 1  // ריפוי בעיסוק
    },
    isActive: true
  },
  {
    id: 'patient3',
    firstName: 'נועם',
    lastName: 'ישראלי',
    color: AVAILABLE_COLORS[9],
    therapyRequirements: {
      'role_4': 2, // קלינאות תקשורת
      'role_1': 1  // טיפול בהבעה ויציאה
    },
    isActive: true
  },
  {
    id: 'patient4',
    firstName: 'מיכל',
    lastName: 'אדמון',
    color: AVAILABLE_COLORS[11],
    therapyRequirements: {
      'role_5': 1, // ריפוי בעיסוק
      'role_3': 2, // פיזיותרפיה
      'role_2': 1  // עבודה סוציאלית
    },
    isActive: true
  },
  {
    id: 'patient5',
    firstName: 'עידו',
    lastName: 'מורג',
    color: AVAILABLE_COLORS[13],
    therapyRequirements: {
      'role_4': 3 // קלינאות תקשורת
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
