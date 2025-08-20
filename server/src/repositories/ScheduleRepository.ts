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
    // Create new schedule with auto-generated name
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const defaultName = `${currentYear} - ${nextYear}`;
    
    const schedule = await this.prisma.schedule.create({
      data: {
        name: defaultName,
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

  async createWithName(name: string): Promise<Schedule> {
    // Create new schedule with specified name
    const schedule = await this.prisma.schedule.create({
      data: {
        name: name,
        generatedAt: new Date(),
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

  async updateName(id: string, name: string): Promise<Schedule> {
    const schedule = await this.prisma.schedule.update({
      where: { id },
      data: { name },
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

