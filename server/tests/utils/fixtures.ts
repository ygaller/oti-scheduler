import { CreateEmployeeDto, CreateRoomDto, CreateRoleDto, Role, Activity, Patient, Session, Schedule, WeekDay, Employee, Room } from '../../src/types';
import { v4 as uuidv4 } from 'uuid';

export const createRoleFixture = (overrides: Partial<CreateRoleDto> = {}): CreateRoleDto => ({
  name: 'ריפוי בעיסוק',
  isActive: true,
  ...overrides
});

export const createCompleteRoleFixture = (overrides: Partial<Role> = {}): Role => ({
  id: overrides.id || generateTestUUID(),
  name: 'ריפוי בעיסוק',
  roleStringKey: overrides.roleStringKey || 'role_1',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createEmployeeFixture = (overrides: Partial<Employee> = {}): Employee => ({
  id: overrides.id || uuidv4(),
  firstName: 'John',
  lastName: 'Doe',
  roleId: overrides.roleId || uuidv4(), // Use provided roleId or generate one (tests should provide valid ones)
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

export const createRoomFixture = (overrides: Partial<Room> = {}): Room => ({
  id: overrides.id || uuidv4(),
  name: 'Room A',
  color: '#008dcd',
  isActive: true,
  ...overrides
});



export const createMockRoles = (): Role[] => [
  createCompleteRoleFixture({
    id: generateTestUUID(),
    name: 'ריפוי בעיסוק',
    roleStringKey: 'role_1'
  }),
  createCompleteRoleFixture({
    id: generateTestUUID(),
    name: 'קלינאות תקשורת',
    roleStringKey: 'role_2'
  }),
  createCompleteRoleFixture({
    id: generateTestUUID(),
    name: 'פיזיותרפיה',
    roleStringKey: 'role_3'
  }),
  createCompleteRoleFixture({
    id: generateTestUUID(),
    name: 'עבודה סוציאלית',
    roleStringKey: 'role_4'
  }),
  createCompleteRoleFixture({
    id: generateTestUUID(),
    name: 'טיפול בהבעה ויצירה',
    roleStringKey: 'role_5'
  })
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
    'role_1': 2,
    'role_3': 1
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
  employeeIds: [generateTestUUID()],
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
export const createMockEmployees = (roleIds: string[] = []): Employee[] => [
  createEmployeeFixture({
    firstName: 'Alice',
    lastName: 'Smith',
    roleId: roleIds[0] || uuidv4(),
    weeklySessionsCount: 5,
    color: '#845ec2'
  }),
  createEmployeeFixture({
    firstName: 'Bob',
    lastName: 'Johnson',
    roleId: roleIds[2] || uuidv4(),
    weeklySessionsCount: 3,
    color: '#4e9f3d'
  }),
  createEmployeeFixture({
    firstName: 'Carol',
    lastName: 'Davis',
    roleId: roleIds[1] || uuidv4(),
    weeklySessionsCount: 2,
    color: '#d65db1'
  })
];

export const createMockRooms = (): Room[] => [
  createRoomFixture({ name: 'Therapy Room 1', color: '#008dcd' }),
  createRoomFixture({ name: 'Therapy Room 2', color: '#ff6b6b' }),
  createRoomFixture({ name: 'Speech Room', color: '#4ecdc4' })
];

export const createMockPatients = (): Patient[] => [
  createPatientFixture({
    firstName: 'John',
    lastName: 'Doe',
    therapyRequirements: {
      'role_1': 2,
      'role_3': 1
    }
  }),
  createPatientFixture({
    firstName: 'Jane',
    lastName: 'Smith',
    therapyRequirements: {
      'role_2': 2,
      'role_1': 1
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
    name: 'Lunch Break',
    defaultStartTime: '12:00',
    defaultEndTime: '13:00',
    isBlocking: true
  }),
  createActivityFixture({
    name: 'Staff Break',
    defaultStartTime: '15:00',
    defaultEndTime: '15:30',
    isBlocking: true
  })
];

// Helper function to get role IDs by role string keys
export const getRoleIdsByStringKeys = (roles: Role[]): Record<string, string> => {
  const roleMap: Record<string, string> = {};
  roles.forEach(role => {
    roleMap[role.roleStringKey] = role.id;
  });
  return roleMap;
};

// Test role string keys for compatibility with old tests
export const testRoleStringKeys = ['role_1', 'role_2', 'role_3', 'role_4', 'role_5'];
