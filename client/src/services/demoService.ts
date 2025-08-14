import { Employee, Room } from '../types';
import { employeeService, roomService, scheduleService } from './index';

const demoEmployees: Omit<Employee, 'id'>[] = [
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
    }
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
    }
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
    }
  }
];

const demoRooms: Omit<Room, 'id'>[] = [
  { name: 'חדר טיפול 1' },
  { name: 'חדר טיפול 2' },
  { name: 'חדר פיזיותרפיה' },
  { name: 'חדר תקשורת' }
];

export const demoService = {
  async loadDemoData(): Promise<{ employees: Employee[]; rooms: Room[] }> {
    try {
      // Create employees
      const createdEmployees = await Promise.all(
        demoEmployees.map(employee => employeeService.create(employee))
      );

      // Create rooms
      const createdRooms = await Promise.all(
        demoRooms.map(room => roomService.create(room))
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
        rooms: createdRooms
      };
    } catch (error) {
      console.error('Error loading demo data:', error);
      throw error;
    }
  }
};

