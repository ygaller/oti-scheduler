import { PrismaClient } from '@prisma/client';
import { ScheduleRepository } from './interfaces';
import { Schedule, Session } from '../types';
import { mapPrismaScheduleToAPI, mapAPIWeekDayToPrisma } from '../mappers';

export class PrismaScheduleRepository implements ScheduleRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<Schedule[]> {
    const schedules = await this.prisma.schedule.findMany({
      include: { sessions: true },
      orderBy: { generatedAt: 'desc' }
    });
    return schedules.map(mapPrismaScheduleToAPI);
  }

  async findById(id: string): Promise<Schedule | null> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: { sessions: true }
    });
    return schedule ? mapPrismaScheduleToAPI(schedule) : null;
  }

  async findActive(): Promise<Schedule | null> {
    const schedule = await this.prisma.schedule.findFirst({
      where: { isActive: true },
      include: { sessions: true }
    });
    return schedule ? mapPrismaScheduleToAPI(schedule) : null;
  }

  async create(sessions: Session[]): Promise<Schedule> {
    const schedule = await this.prisma.schedule.create({
      data: {
        generatedAt: new Date(),
        isActive: false,
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
      include: { sessions: true }
    });
    return mapPrismaScheduleToAPI(schedule);
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
      include: { sessions: true }
    });
    
    return mapPrismaScheduleToAPI(schedule);
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

