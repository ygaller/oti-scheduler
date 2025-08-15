import { Employee, Room, Patient, CreateBlockedPeriodDto, AVAILABLE_COLORS } from '../types';
import { employeeService, roomService, scheduleService, patientService, blockedPeriodService } from './index';

const demoEmployees: Omit<Employee, 'id' | 'isActive'>[] = [
  {
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

const demoRooms: Omit<Room, 'id' | 'isActive'>[] = [
  { name: 'חדר טיפול 1', color: AVAILABLE_COLORS[1] },
  { name: 'חדר טיפול 2', color: AVAILABLE_COLORS[5] },
  { name: 'חדר פיזיותרפיה', color: AVAILABLE_COLORS[10] },
  { name: 'חדר תקשורת', color: AVAILABLE_COLORS[14] }
];

const demoPatients: Omit<Patient, 'id' | 'isActive'>[] = [
  {
    firstName: 'אמיר',
    lastName: 'רוזן',
    color: AVAILABLE_COLORS[2],
    therapyRequirements: {
      'occupational-therapist': 2,
      'speech-therapist': 1
    }
  },
  {
    firstName: 'דנה',
    lastName: 'ברק',
    color: AVAILABLE_COLORS[6],
    therapyRequirements: {
      'physiotherapist': 3,
      'occupational-therapist': 1
    }
  },
  {
    firstName: 'נועם',
    lastName: 'ישראלי',
    color: AVAILABLE_COLORS[9],
    therapyRequirements: {
      'speech-therapist': 2,
      'art-therapist': 1
    }
  },
  {
    firstName: 'מיכל',
    lastName: 'אדמון',
    color: AVAILABLE_COLORS[12],
    therapyRequirements: {
      'occupational-therapist': 1,
      'physiotherapist': 2,
      'social-worker': 1
    }
  },
  {
    firstName: 'עידו',
    lastName: 'מורג',
    color: AVAILABLE_COLORS[15],
    therapyRequirements: {
      'speech-therapist': 3
    }
  }
];

const demoBlockedPeriods: CreateBlockedPeriodDto[] = [
  {
    name: 'ארוחת בוקר',
    color: AVAILABLE_COLORS[4],
    defaultStartTime: '08:00',
    defaultEndTime: '08:30',
    dayOverrides: {},
    isActive: true
  },
  {
    name: 'פגישת צוות',
    color: AVAILABLE_COLORS[7],
    defaultStartTime: '09:00',
    defaultEndTime: '09:15',
    dayOverrides: {},
    isActive: true
  },
  {
    name: 'ארוחת צהריים',
    color: AVAILABLE_COLORS[11],
    defaultStartTime: '12:00',
    defaultEndTime: '13:00',
    dayOverrides: {},
    isActive: true
  }
];

export const demoService = {
  async loadDemoData(): Promise<{ employees: Employee[]; rooms: Room[]; patients: Patient[] }> {
    try {
      // Create employees
      const createdEmployees = await Promise.all(
        demoEmployees.map(employee => employeeService.create(employee))
      );

      // Create rooms
      const createdRooms = await Promise.all(
        demoRooms.map(room => roomService.create(room))
      );

      // Create patients
      const createdPatients = await Promise.all(
        demoPatients.map(patient => patientService.create(patient))
      );

      // Create blocked periods
      await Promise.all(
        demoBlockedPeriods.map(blockedPeriod => blockedPeriodService.create(blockedPeriod))
      );

      // Set default schedule configuration
      const defaultConfig = {
        breakfast: { startTime: '08:00', endTime: '08:30' },
        morningMeetup: { startTime: '09:00', endTime: '09:15' },
        lunch: { startTime: '12:00', endTime: '13:00' }
      };
      
      await scheduleService.updateConfig(defaultConfig);

      return {
        employees: createdEmployees,
        rooms: createdRooms,
        patients: createdPatients
      };
    } catch (error) {
      console.error('Error loading demo data:', error);
      throw error;
    }
  }
};

