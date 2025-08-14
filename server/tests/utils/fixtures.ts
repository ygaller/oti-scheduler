import { CreateEmployeeDto, CreateRoomDto, Role, ScheduleConfig } from '../../src/types';

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
  weeklySessionsCount: 20,
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

export const createScheduleConfigFixture = (overrides: Partial<ScheduleConfig> = {}): ScheduleConfig => ({
  breakfast: { startTime: '08:00', endTime: '08:30' },
  morningMeetup: { startTime: '09:00', endTime: '09:15' },
  lunch: { startTime: '12:00', endTime: '13:00' },
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
