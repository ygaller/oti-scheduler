import { CreateEmployeeDto, CreateRoomDto, Role, Activity } from '../../src/types';

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
