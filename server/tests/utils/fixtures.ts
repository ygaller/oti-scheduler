import { CreateEmployeeDto, CreateRoomDto, Role, Activity, Patient, Session, Schedule, WeekDay } from '../../src/types';

export const createEmployeeFixture = (overrides: Partial<CreateEmployeeDto> = {}): CreateEmployeeDto => ({
  firstName: 'John',
  lastName: 'Doe',
  role: 'occupational-therapist' as Role,
  workingHours: {
    sunday: { startTime: '08:00', endTime: '16:00' },
    monday: { startTime: '08:00', endTime: '16:00' },
    tuesday: { startTime: '08:00', endTime: '16:00' },
    wednesday: { startTime: '08:00', endTime: '16:00' },
    thursday: { startTime: '08:00', endTime: '16:00' }
  },
  weeklySessionsCount: 5,
  color: '#845ec2',
  isActive: true,
  ...overrides
});

export const createRoomFixture = (overrides: Partial<CreateRoomDto> = {}): CreateRoomDto => ({
  name: 'Room A',
  color: '#008dcd',
  isActive: true,
  ...overrides
});



export const employeeRoles: Role[] = [
  'occupational-therapist',
  'speech-therapist',
  'physiotherapist',
  'social-worker',
  'art-therapist'
];

export const validWorkingHours = {
  sunday: { startTime: '08:00', endTime: '16:00' },
  monday: { startTime: '08:00', endTime: '16:00' },
  tuesday: { startTime: '08:00', endTime: '16:00' },
  wednesday: { startTime: '08:00', endTime: '16:00' },
  thursday: { startTime: '08:00', endTime: '16:00' }
};

export const createPatientFixture = (overrides: Partial<Patient> = {}): Patient => ({
  id: generateTestUUID(),
  firstName: 'John',
  lastName: 'Patient',
  color: '#ff5733',
  therapyRequirements: {
    'occupational-therapist': 2,
    'physiotherapist': 1
  },
  isActive: true,
  ...overrides
});

export const createActivityFixture = (overrides: Partial<Activity> = {}): Activity => ({
  id: generateTestUUID(),
  name: 'Test Activity',
  color: '#33ff57',
  defaultStartTime: '10:00',
  defaultEndTime: '11:00',
  dayOverrides: {},
  isBlocking: false,
  isActive: true,
  ...overrides
});

export const createSessionFixture = (overrides: Partial<Session> = {}): Session => ({
  id: generateTestUUID(),
  employeeId: generateTestUUID(),
  roomId: generateTestUUID(),
  day: 'monday' as WeekDay,
  startTime: '10:00',
  endTime: '11:00',
  patients: [],
  ...overrides
});

const generateTestUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const createScheduleFixture = (overrides: Partial<Schedule> = {}): Schedule => ({
  id: generateTestUUID(),
  sessions: [],
  generatedAt: new Date(),
  isActive: false,
  ...overrides
});

// Mock data sets for comprehensive testing
export const createMockEmployees = (): CreateEmployeeDto[] => [
  createEmployeeFixture({
    firstName: 'Alice',
    lastName: 'Smith',
    role: 'occupational-therapist',
    weeklySessionsCount: 5,
    color: '#845ec2'
  }),
  createEmployeeFixture({
    firstName: 'Bob',
    lastName: 'Johnson',
    role: 'physiotherapist',
    weeklySessionsCount: 3,
    color: '#4e9f3d'
  }),
  createEmployeeFixture({
    firstName: 'Carol',
    lastName: 'Davis',
    role: 'speech-therapist',
    weeklySessionsCount: 2,
    color: '#d65db1'
  })
];

export const createMockRooms = (): CreateRoomDto[] => [
  createRoomFixture({ name: 'Therapy Room 1', color: '#008dcd' }),
  createRoomFixture({ name: 'Therapy Room 2', color: '#ff6b6b' }),
  createRoomFixture({ name: 'Speech Room', color: '#4ecdc4' })
];

export const createMockPatients = (): Patient[] => [
  createPatientFixture({
    firstName: 'John',
    lastName: 'Doe',
    therapyRequirements: {
      'occupational-therapist': 2,
      'physiotherapist': 1
    }
  }),
  createPatientFixture({
    firstName: 'Jane',
    lastName: 'Smith',
    therapyRequirements: {
      'speech-therapist': 2,
      'occupational-therapist': 1
    }
  })
];

export const createMockActivities = (): Activity[] => [
  createActivityFixture({
    name: 'Morning Meeting',
    defaultStartTime: '08:00',
    defaultEndTime: '08:30',
    isBlocking: true
  }),
  createActivityFixture({
    name: 'Optional Training',
    defaultStartTime: '12:00',
    defaultEndTime: '13:00',
    isBlocking: false
  }),
  createActivityFixture({
    name: 'Staff Break',
    defaultStartTime: '15:00',
    defaultEndTime: '15:30',
    isBlocking: true
  })
];
