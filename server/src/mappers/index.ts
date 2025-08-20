import { Employee as PrismaEmployee, Room as PrismaRoom, Session as PrismaSession, Schedule as PrismaSchedule, Role as PrismaRole, Patient as PrismaPatient, SessionPatient as PrismaSessionPatient } from '@prisma/client';

// Import SessionEmployee type manually since it might not be exported directly
type PrismaSessionEmployee = {
  id: string;
  sessionId: string;
  employeeId: string;
  createdAt: Date;
  updatedAt: Date;
  session?: PrismaSession;
  employee: PrismaEmployee;
};
import { Employee, Room, Session, Schedule, Role, WeekDay, Patient } from '../types';

// WeekDay mapping
// WeekDay mapping for SQLite (now using strings instead of enums)
const PRISMA_TO_API_WEEKDAY: Record<string, WeekDay> = {
  SUNDAY: 'sunday',
  MONDAY: 'monday',
  TUESDAY: 'tuesday',
  WEDNESDAY: 'wednesday',
  THURSDAY: 'thursday',
};

const API_TO_PRISMA_WEEKDAY: Record<WeekDay, string> = {
  sunday: 'SUNDAY',
  monday: 'MONDAY',
  tuesday: 'TUESDAY',
  wednesday: 'WEDNESDAY',
  thursday: 'THURSDAY',
};

// Employee mappers
export const mapPrismaEmployeeToAPI = (prismaEmployee: PrismaEmployee & { role?: PrismaRole }): Employee => {
  return {
    id: prismaEmployee.id,
    firstName: prismaEmployee.firstName,
    lastName: prismaEmployee.lastName ?? '',
    email: prismaEmployee.email ?? undefined,
    roleId: prismaEmployee.roleId,
    role: prismaEmployee.role ? mapPrismaRoleToAPI(prismaEmployee.role) : undefined,
    workingHours: JSON.parse(prismaEmployee.workingHours) as Employee['workingHours'],
    reservedHours: JSON.parse(prismaEmployee.reservedHours) as Employee['reservedHours'],
    weeklySessionsCount: prismaEmployee.weeklySessionsCount,
    color: prismaEmployee.color,
    isActive: prismaEmployee.isActive,
  };
};

// Role mappers
export const mapPrismaRoleToAPI = (prismaRole: PrismaRole): Role => {
  return {
    id: prismaRole.id,
    name: prismaRole.name,
    roleStringKey: prismaRole.roleStringKey,
    isActive: prismaRole.isActive,
    createdAt: prismaRole.createdAt,
    updatedAt: prismaRole.updatedAt,
  };
};

// Room mappers
export const mapPrismaRoomToAPI = (prismaRoom: PrismaRoom): Room => {
  return {
    id: prismaRoom.id,
    name: prismaRoom.name,
    color: prismaRoom.color,
    isActive: prismaRoom.isActive,
  };
};

// Patient mappers
export const mapPrismaPatientToAPI = (prismaPatient: PrismaPatient): Patient => {
  return {
    id: prismaPatient.id,
    firstName: prismaPatient.firstName,
    lastName: prismaPatient.lastName ?? '',
    email: prismaPatient.email ?? undefined,
    color: prismaPatient.color,
    therapyRequirements: JSON.parse(prismaPatient.therapyRequirements) as Patient['therapyRequirements'],
    isActive: prismaPatient.isActive,
  };
};

// Session mappers
export const mapPrismaSessionToAPI = (prismaSession: PrismaSession): Session => {
  return {
    id: prismaSession.id,
    scheduleId: prismaSession.scheduleId,
    employeeIds: [], // Will be populated by methods that include employees
    roomId: prismaSession.roomId,
    day: PRISMA_TO_API_WEEKDAY[prismaSession.day],
    startTime: prismaSession.startTime,
    endTime: prismaSession.endTime,
    notes: prismaSession.notes,
    employees: [],
    patients: []
  };
};

// Session mapper with employees and patients
export const mapPrismaSessionWithPatientsToAPI = (
  prismaSession: PrismaSession & { 
    sessionEmployees?: (PrismaSessionEmployee & { employee: PrismaEmployee & { role?: PrismaRole } })[];
    sessionPatients: (PrismaSessionPatient & { patient: PrismaPatient })[] 
  }
): Session => {
  return {
    id: prismaSession.id,
    scheduleId: prismaSession.scheduleId,
    employeeIds: prismaSession.sessionEmployees?.map(se => se.employeeId) || [],
    roomId: prismaSession.roomId,
    day: PRISMA_TO_API_WEEKDAY[prismaSession.day],
    startTime: prismaSession.startTime,
    endTime: prismaSession.endTime,
    notes: prismaSession.notes,
    employees: prismaSession.sessionEmployees?.map(se => mapPrismaEmployeeToAPI(se.employee)) || [],
    patients: prismaSession.sessionPatients.map(sp => mapPrismaPatientToAPI(sp.patient)),
  };
};

export const mapAPIWeekDayToPrisma = (weekDay: WeekDay): string => {
  return API_TO_PRISMA_WEEKDAY[weekDay];
};

// Schedule mappers
export const mapPrismaScheduleToAPI = (prismaSchedule: PrismaSchedule & { sessions: PrismaSession[] }): Schedule => {
  return {
    id: prismaSchedule.id,
    name: prismaSchedule.name,
    sessions: prismaSchedule.sessions.map(session => ({
      ...mapPrismaSessionToAPI(session),
      employees: [],
      patients: []
    })),
    generatedAt: prismaSchedule.generatedAt,
  };
};

// Schedule mapper with sessions that include employees and patients
export const mapPrismaScheduleWithPatientsToAPI = (
  prismaSchedule: PrismaSchedule & { 
    sessions: (PrismaSession & { 
      sessionEmployees?: (PrismaSessionEmployee & { employee: PrismaEmployee & { role?: PrismaRole } })[];
      sessionPatients: (PrismaSessionPatient & { patient: PrismaPatient })[] 
    })[] 
  }
): Schedule => {
  return {
    id: prismaSchedule.id,
    name: prismaSchedule.name,
    sessions: prismaSchedule.sessions.map(mapPrismaSessionWithPatientsToAPI),
    generatedAt: prismaSchedule.generatedAt,
  };
};

