import { PrismaClient } from '@prisma/client';
import { SessionRepository } from './interfaces';
import { Session, CreateSessionDto, UpdateSessionDto } from '../types';
import { mapPrismaSessionWithPatientsToAPI, mapAPIWeekDayToPrisma } from '../mappers';

export class PrismaSessionRepository implements SessionRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<Session[]> {
    const sessions = await this.prisma.session.findMany({
      include: {
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
        sessionPatients: {
          include: {
            patient: true
          }
        }
      }
    });
    return session ? mapPrismaSessionWithPatientsToAPI(session) : null;
  }

  async findByScheduleId(scheduleId: string): Promise<Session[]> {
    const sessions = await this.prisma.session.findMany({
      where: { scheduleId },
      include: {
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

  async create(sessionData: CreateSessionDto): Promise<Session> {
    const session = await this.prisma.session.create({
      data: {
        employeeId: sessionData.employeeId,
        roomId: sessionData.roomId,
        scheduleId: sessionData.scheduleId,
        day: mapAPIWeekDayToPrisma(sessionData.day),
        startTime: sessionData.startTime,
        endTime: sessionData.endTime,
      },
      include: {
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
    
    if (sessionData.employeeId !== undefined) updateData.employeeId = sessionData.employeeId;
    if (sessionData.roomId !== undefined) updateData.roomId = sessionData.roomId;
    if (sessionData.day !== undefined) updateData.day = mapAPIWeekDayToPrisma(sessionData.day);
    if (sessionData.startTime !== undefined) updateData.startTime = sessionData.startTime;
    if (sessionData.endTime !== undefined) updateData.endTime = sessionData.endTime;

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
          skipDuplicates: true // Important for idempotency
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

    const session = await this.prisma.session.update({
      where: { id },
      data: updateData,
      include: {
        sessionPatients: {
          include: {
            patient: true
          }
        }
      }
    });
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

  async addPatient(sessionId: string, patientId: string): Promise<Session> {
    // Create the session-patient relationship
    await this.prisma.sessionPatient.create({
      data: {
        sessionId,
        patientId
      }
    });

    // Return the updated session with patients
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
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

    // Return the updated session with patients
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
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

