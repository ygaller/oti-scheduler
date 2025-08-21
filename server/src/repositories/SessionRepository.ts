import { PrismaClient } from '@prisma/client';
import { SessionRepository } from './interfaces';
import { Session, CreateSessionDto, UpdateSessionDto } from '../types';
import { mapPrismaSessionWithPatientsToAPI, mapAPIWeekDayToPrisma } from '../mappers';

export class PrismaSessionRepository implements SessionRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<Session[]> {
    const sessions = await this.prisma.session.findMany({
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
      },
      orderBy: [
        { day: 'asc' },
        { startTime: 'asc' }
      ]
    });
    return sessions.map(mapPrismaSessionWithPatientsToAPI);
  }

  async findByScheduleId(scheduleId: string): Promise<Session[]> {
    const sessions = await this.prisma.session.findMany({
      where: { scheduleId },
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
      },
      orderBy: [
        { day: 'asc' },
        { startTime: 'asc' }
      ]
    });
    return sessions.map(mapPrismaSessionWithPatientsToAPI);
  }

  async findById(id: string): Promise<Session | null> {
    const session = await this.prisma.session.findUnique({
      where: { id },
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
    });
    return session ? mapPrismaSessionWithPatientsToAPI(session) : null;
  }

  async create(sessionData: CreateSessionDto): Promise<Session> {
    // Ensure at least one employee is provided
    if (!sessionData.employeeIds || sessionData.employeeIds.length === 0) {
      throw new Error('At least one employee must be assigned to the session');
    }

    const session = await this.prisma.session.create({
      data: {
        roomId: sessionData.roomId,
        scheduleId: sessionData.scheduleId,
        day: mapAPIWeekDayToPrisma(sessionData.day),
        startTime: sessionData.startTime,
        endTime: sessionData.endTime,
        notes: sessionData.notes,
        sessionEmployees: {
          create: sessionData.employeeIds.map(employeeId => ({
            employeeId
          }))
        }
      },
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
    });
    return mapPrismaSessionWithPatientsToAPI(session);
  }

  async update(id: string, sessionData: UpdateSessionDto): Promise<Session> {
    const updateData: any = {};
    
    if (sessionData.roomId !== undefined) updateData.roomId = sessionData.roomId;
    if (sessionData.day !== undefined) updateData.day = mapAPIWeekDayToPrisma(sessionData.day);
    if (sessionData.startTime !== undefined) updateData.startTime = sessionData.startTime;
    if (sessionData.endTime !== undefined) updateData.endTime = sessionData.endTime;
    if (sessionData.notes !== undefined) updateData.notes = sessionData.notes;

    // Handle employee assignments
    if (sessionData.employeeIds !== undefined) {
      // Ensure at least one employee is provided
      if (sessionData.employeeIds.length === 0) {
        throw new Error('At least one employee must be assigned to the session');
      }

      const existingEmployeeIds = (await this.prisma.sessionEmployee.findMany({
        where: { sessionId: id },
        select: { employeeId: true }
      })).map(se => se.employeeId);

      const employeesToConnect = sessionData.employeeIds.filter(
        (employeeId) => !existingEmployeeIds.includes(employeeId)
      );
      const employeesToDisconnect = existingEmployeeIds.filter(
        (employeeId) => !sessionData.employeeIds!.includes(employeeId)
      );

      if (employeesToConnect.length > 0) {
        await this.prisma.sessionEmployee.createMany({
          data: employeesToConnect.map(employeeId => ({
            sessionId: id,
            employeeId: employeeId
          })),
          // Note: skipDuplicates removed for SQLite compatibility
        });
      }

      if (employeesToDisconnect.length > 0) {
        await this.prisma.sessionEmployee.deleteMany({
          where: {
            sessionId: id,
            employeeId: { in: employeesToDisconnect }
          }
        });
      }
    }

    // Handle patient assignments
    if (sessionData.patientIds !== undefined) {
      const existingPatientIds = (await this.prisma.sessionPatient.findMany({
        where: { sessionId: id },
        select: { patientId: true }
      })).map(sp => sp.patientId);

      const patientsToConnect = sessionData.patientIds.filter(
        (patientId) => !existingPatientIds.includes(patientId)
      );
      const patientsToDisconnect = existingPatientIds.filter(
        (patientId) => !sessionData.patientIds!.includes(patientId)
      );

      if (patientsToConnect.length > 0) {
        await this.prisma.sessionPatient.createMany({
          data: patientsToConnect.map(patientId => ({
            sessionId: id,
            patientId: patientId
          })),
          // Note: skipDuplicates removed for SQLite compatibility
        });
      }

      if (patientsToDisconnect.length > 0) {
        await this.prisma.sessionPatient.deleteMany({
          where: {
            sessionId: id,
            patientId: { in: patientsToDisconnect }
          }
        });
      }
    }

    // If updateData is empty, we can skip the update and just fetch the updated session
    if (Object.keys(updateData).length > 0) {
      await this.prisma.session.update({
        where: { id },
        data: updateData
      });
    }
    
    // Always fetch the session with all relations after updates
    const session = await this.prisma.session.findUnique({
      where: { id },
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
    });
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    return mapPrismaSessionWithPatientsToAPI(session);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.session.delete({
      where: { id }
    });
  }

  async deleteAll(): Promise<void> {
    await this.prisma.session.deleteMany();
  }

  async deleteByScheduleId(scheduleId: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { scheduleId }
    });
  }

  async assignPatient(sessionId: string, patientId: string): Promise<Session> {
    // First get the session to check for conflicts
    const sessionToUpdate = await this.prisma.session.findUnique({
      where: { id: sessionId },
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
    });

    if (!sessionToUpdate) {
      throw new Error('Session not found');
    }

    // Check for patient time conflicts
    const { validatePatientTimeConflict } = await import('../utils/scheduler');
    const { PRISMA_TO_API_WEEKDAY } = await import('../mappers');
    const scheduleId = sessionToUpdate.scheduleId;
    const validation = await validatePatientTimeConflict(
      patientId,
      {
        id: sessionId,
        day: PRISMA_TO_API_WEEKDAY[sessionToUpdate.day],
        startTime: sessionToUpdate.startTime,
        endTime: sessionToUpdate.endTime
      },
      this,
      scheduleId
    );

    if (!validation.isValid) {
      throw new Error(validation.error || 'Patient time conflict');
    }

    // Create the session-patient relationship
    await this.prisma.sessionPatient.create({
      data: {
        sessionId,
        patientId
      }
    });

    // Return the updated session with employees and patients
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
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
    });

    if (!session) {
      throw new Error('Session not found');
    }

    return mapPrismaSessionWithPatientsToAPI(session);
  }

  async removePatient(sessionId: string, patientId: string): Promise<Session> {
    // Remove the session-patient relationship
    await this.prisma.sessionPatient.deleteMany({
      where: {
        sessionId,
        patientId
      }
    });

    // Return the updated session with employees and patients
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
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
    });

    if (!session) {
      throw new Error('Session not found');
    }

    return mapPrismaSessionWithPatientsToAPI(session);
  }

  async updatePatients(sessionId: string, patientIds: string[]): Promise<Session> {
    // First, remove all existing patient assignments for this session
    await this.prisma.sessionPatient.deleteMany({
      where: { sessionId }
    });

    // Then add the new patient assignments
    if (patientIds.length > 0) {
      await this.prisma.sessionPatient.createMany({
        data: patientIds.map(patientId => ({
          sessionId,
          patientId
        }))
      });
    }

    // Return the updated session with employees and patients
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
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
    });

    if (!session) {
      throw new Error('Session not found');
    }

    return mapPrismaSessionWithPatientsToAPI(session);
  }
}

