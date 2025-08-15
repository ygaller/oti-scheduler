import { Employee, Room, Patient, CreateEmployeeDto, CreateActivityDto, AVAILABLE_COLORS } from '../types';
import { employeeService, roomService, patientService, activityService, roleService } from './index';

// This demo service is deprecated - use the server-side seed data instead
// The roleId references will need to be dynamically fetched from the role service

const demoRooms: Omit<Room, 'id' | 'isActive'>[] = [
  { name: 'חדר טיפול 1', color: AVAILABLE_COLORS[1] },
  { name: 'חדר טיפול 2', color: AVAILABLE_COLORS[5] },
  { name: 'חדר פיזיותרפיה', color: AVAILABLE_COLORS[10] },
  { name: 'חדר תקשורת', color: AVAILABLE_COLORS[14] }
];

// Demo patients now use role string keys instead of role enum values
const demoPatients: Omit<Patient, 'id' | 'isActive'>[] = [
  {
    firstName: 'אמיר',
    lastName: 'רוזן',
    color: AVAILABLE_COLORS[2],
    therapyRequirements: {
      'role_5': 2, // ריפוי בעיסוק
      'role_4': 1  // קלינאות תקשורת
    }
  },
  {
    firstName: 'דנה',
    lastName: 'ברק',
    color: AVAILABLE_COLORS[6],
    therapyRequirements: {
      'role_3': 3, // פיזיותרפיה
      'role_5': 1  // ריפוי בעיסוק
    }
  },
  {
    firstName: 'נועם',
    lastName: 'ישראלי',
    color: AVAILABLE_COLORS[9],
    therapyRequirements: {
      'role_4': 2, // קלינאות תקשורת
      'role_1': 1  // טיפול בהבעה ויציאה
    }
  },
  {
    firstName: 'מיכל',
    lastName: 'אדמון',
    color: AVAILABLE_COLORS[12],
    therapyRequirements: {
      'role_5': 1, // ריפוי בעיסוק
      'role_3': 2, // פיזיותרפיה
      'role_2': 1  // עבודה סוציאלית
    }
  },
  {
    firstName: 'עידו',
    lastName: 'מורג',
    color: AVAILABLE_COLORS[15],
    therapyRequirements: {
      'role_4': 3 // קלינאות תקשורת
    }
  }
];

const demoActivities: CreateActivityDto[] = [
  {
    name: 'ארוחת בוקר',
    color: AVAILABLE_COLORS[4],
    defaultStartTime: '08:00',
    defaultEndTime: '08:30',
    dayOverrides: {},
    isBlocking: true, // Breakfast blocks scheduling
    isActive: true
  },
  {
    name: 'פגישת צוות',
    color: AVAILABLE_COLORS[7],
    defaultStartTime: '09:00',
    defaultEndTime: '09:15',
    dayOverrides: {},
    isBlocking: true, // Staff meeting blocks scheduling
    isActive: true
  },
  {
    name: 'ארוחת צהריים',
    color: AVAILABLE_COLORS[11],
    defaultStartTime: '12:00',
    defaultEndTime: '13:00',
    dayOverrides: {},
    isBlocking: true, // Lunch blocks scheduling
    isActive: true
  }
];

export const demoService = {
  async loadDemoData(): Promise<{ employees: Employee[]; rooms: Room[]; patients: Patient[] }> {
    try {
      // Get available roles first
      const roles = await roleService.getAll();
      const roleMap = new Map(roles.map(role => [role.name, role.id]));

      // Map demo employees to use roleId from the fetched roles
      const employeesToCreate: CreateEmployeeDto[] = [
        {
          firstName: 'שרה',
          lastName: 'כהן',
          roleId: roleMap.get('ריפוי בעיסוק') || roles[0]?.id || '',
          isActive: true,
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
          roleId: roleMap.get('קלינאות תקשורת') || roles[1]?.id || '',
          isActive: true,
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
          roleId: roleMap.get('פיזיותרפיה') || roles[2]?.id || '',
          isActive: true,
          weeklySessionsCount: 8,
          workingHours: {
            sunday: { startTime: '08:30', endTime: '15:30' },
            tuesday: { startTime: '08:30', endTime: '15:30' },
            thursday: { startTime: '08:30', endTime: '15:30' }
          },
          color: AVAILABLE_COLORS[8]
        }
      ];

      // Create employees
      const createdEmployees = await Promise.all(
        employeesToCreate.map(employee => employeeService.create(employee))
      );

      // Create rooms
      const createdRooms = await Promise.all(
        demoRooms.map(room => roomService.create(room))
      );

      // Create patients
      const createdPatients = await Promise.all(
        demoPatients.map(patient => patientService.create(patient))
      );

      // Create activities
      await Promise.all(
        demoActivities.map(activity => activityService.create(activity))
      );

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

