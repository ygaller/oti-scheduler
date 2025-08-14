import { Employee as PrismaEmployee, Room as PrismaRoom, Session as PrismaSession, Schedule as PrismaSchedule, Role as PrismaRole, WeekDay as PrismaWeekDay } from '@prisma/client';
import { Employee, Room, Session, Schedule, Role, WeekDay } from '../types';

// Role mapping
const PRISMA_TO_API_ROLE: Record<PrismaRole, Role> = {
  OCCUPATIONAL_THERAPIST: 'occupational-therapist',
  SPEECH_THERAPIST: 'speech-therapist',
  PHYSIOTHERAPIST: 'physiotherapist',
  SOCIAL_WORKER: 'social-worker',
  ART_THERAPIST: 'art-therapist',
};

const API_TO_PRISMA_ROLE: Record<Role, PrismaRole> = {
  'occupational-therapist': 'OCCUPATIONAL_THERAPIST',
  'speech-therapist': 'SPEECH_THERAPIST',
  'physiotherapist': 'PHYSIOTHERAPIST',
  'social-worker': 'SOCIAL_WORKER',
  'art-therapist': 'ART_THERAPIST',
};

// WeekDay mapping
const PRISMA_TO_API_WEEKDAY: Record<PrismaWeekDay, WeekDay> = {
  SUNDAY: 'sunday',
  MONDAY: 'monday',
  TUESDAY: 'tuesday',
  WEDNESDAY: 'wednesday',
  THURSDAY: 'thursday',
};

const API_TO_PRISMA_WEEKDAY: Record<WeekDay, PrismaWeekDay> = {
  sunday: 'SUNDAY',
  monday: 'MONDAY',
  tuesday: 'TUESDAY',
  wednesday: 'WEDNESDAY',
  thursday: 'THURSDAY',
};

// Employee mappers
export const mapPrismaEmployeeToAPI = (prismaEmployee: PrismaEmployee): Employee => {
  return {
    id: prismaEmployee.id,
    firstName: prismaEmployee.firstName,
    lastName: prismaEmployee.lastName,
    role: PRISMA_TO_API_ROLE[prismaEmployee.role],
    workingHours: prismaEmployee.workingHours as Employee['workingHours'],
    weeklySessionsCount: prismaEmployee.weeklySessionsCount,
    color: prismaEmployee.color,
  };
};

export const mapAPIRoleToPrisma = (role: Role): PrismaRole => {
  return API_TO_PRISMA_ROLE[role];
};

// Room mappers
export const mapPrismaRoomToAPI = (prismaRoom: PrismaRoom): Room => {
  return {
    id: prismaRoom.id,
    name: prismaRoom.name,
    color: prismaRoom.color,
  };
};

// Session mappers
export const mapPrismaSessionToAPI = (prismaSession: PrismaSession): Session => {
  return {
    id: prismaSession.id,
    employeeId: prismaSession.employeeId,
    roomId: prismaSession.roomId,
    day: PRISMA_TO_API_WEEKDAY[prismaSession.day],
    startTime: prismaSession.startTime,
    endTime: prismaSession.endTime,
  };
};

export const mapAPIWeekDayToPrisma = (weekDay: WeekDay): PrismaWeekDay => {
  return API_TO_PRISMA_WEEKDAY[weekDay];
};

// Schedule mappers
export const mapPrismaScheduleToAPI = (prismaSchedule: PrismaSchedule & { sessions: PrismaSession[] }): Schedule => {
  return {
    id: prismaSchedule.id,
    sessions: prismaSchedule.sessions.map(mapPrismaSessionToAPI),
    generatedAt: prismaSchedule.generatedAt,
  };
};

