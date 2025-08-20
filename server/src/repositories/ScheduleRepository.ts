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
            sessionEmployees: {
              include: {
                employee: {
                  include: {
                    role: true
                  }
                }
              }
            },
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
            sessionEmployees: {
              include: {
                employee: {
                  include: {
                    role: true
                  }
                }
              }
            },
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
    // Create new schedule
    const schedule = await this.prisma.schedule.create({
      data: {
        generatedAt: new Date(),
        sessions: {
          create: sessions.map(session => ({
            roomId: session.roomId,
            day: mapAPIWeekDayToPrisma(session.day),
            startTime: session.startTime,
            endTime: session.endTime,
            sessionEmployees: {
              create: session.employeeIds.map(employeeId => ({
                employeeId
              }))
            },
            sessionPatients: {
              create: (session.patients || []).map(patient => ({
                patientId: patient.id
              }))
            }
          }))
        }
      },
      include: { 
        sessions: {
          include: {
            sessionEmployees: {
              include: {
                employee: {
                  include: {
                    role: true
                  }
                }
              }
            },
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

