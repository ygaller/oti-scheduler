import { PrismaClient } from '@prisma/client';
import { ScheduleRepository } from './interfaces';
import { Schedule, Session } from '../types';
import { mapPrismaScheduleWithPatientsToAPI, mapAPIWeekDayToPrisma } from '../mappers';

export class PrismaScheduleRepository implements ScheduleRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<Schedule[]> {
    const schedules = await this.prisma.schedule.findMany({
      include: { 
        sessions: {
          include: {
            sessionPatients: {
              include: {
                patient: true
              }
            }
          }
        }
      },
      orderBy: { generatedAt: 'desc' }
    });
    return schedules.map(mapPrismaScheduleWithPatientsToAPI);
  }

  async findById(id: string): Promise<Schedule | null> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: { 
        sessions: {
          include: {
            sessionPatients: {
              include: {
                patient: true
              }
            }
          }
        }
      }
    });
    return schedule ? mapPrismaScheduleWithPatientsToAPI(schedule) : null;
  }

  async findActive(): Promise<Schedule | null> {
    const schedule = await this.prisma.schedule.findFirst({
      where: { isActive: true },
      include: { 
        sessions: {
          include: {
            sessionPatients: {
              include: {
                patient: true
              }
            }
          }
        }
      }
    });
    return schedule ? mapPrismaScheduleWithPatientsToAPI(schedule) : null;
  }

  async create(sessions: Session[]): Promise<Schedule> {
    // First, deactivate all existing schedules
    await this.prisma.schedule.updateMany({
      data: { isActive: false }
    });

    // Create new schedule as active
    const schedule = await this.prisma.schedule.create({
      data: {
        generatedAt: new Date(),
        isActive: true, // New schedules are active by default
        sessions: {
          create: sessions.map(session => ({
            employeeId: session.employeeId,
            roomId: session.roomId,
            day: mapAPIWeekDayToPrisma(session.day),
            startTime: session.startTime,
            endTime: session.endTime,
          }))
        }
      },
      include: { 
        sessions: {
          include: {
            sessionPatients: {
              include: {
                patient: true
              }
            }
          }
        }
      }
    });
    return mapPrismaScheduleWithPatientsToAPI(schedule);
  }

  async setActive(id: string): Promise<Schedule> {
    // First, deactivate all schedules
    await this.prisma.schedule.updateMany({
      data: { isActive: false }
    });

    // Then activate the specified schedule
    const schedule = await this.prisma.schedule.update({
      where: { id },
      data: { isActive: true },
      include: { 
        sessions: {
          include: {
            sessionPatients: {
              include: {
                patient: true
              }
            }
          }
        }
      }
    });
    
    return mapPrismaScheduleWithPatientsToAPI(schedule);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.schedule.delete({
      where: { id }
    });
  }

  async deleteAll(): Promise<void> {
    await this.prisma.schedule.deleteMany();
  }
}

