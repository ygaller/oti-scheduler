import { PrismaClient } from '@prisma/client';
import { PatientRepository } from './interfaces';
import { Patient, CreatePatientDto, UpdatePatientDto } from '../types';

export class PrismaPatientRepository implements PatientRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(includeInactive = false): Promise<Patient[]> {
    const patients = await this.prisma.patient.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: 'asc' }
    });
    return patients.map(this.mapPrismaPatientToAPI);
  }

  async findById(id: string): Promise<Patient | null> {
    const patient = await this.prisma.patient.findUnique({
      where: { id }
    });
    return patient ? this.mapPrismaPatientToAPI(patient) : null;
  }

  async create(patientData: CreatePatientDto): Promise<Patient> {
    const patient = await this.prisma.patient.create({
      data: {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        color: patientData.color,
        therapyRequirements: patientData.therapyRequirements || {},
        isActive: patientData.isActive ?? true,
      }
    });
    return this.mapPrismaPatientToAPI(patient);
  }

  async update(id: string, patientData: UpdatePatientDto): Promise<Patient> {
    const updateData: any = {};
    
    if (patientData.firstName !== undefined) updateData.firstName = patientData.firstName;
    if (patientData.lastName !== undefined) updateData.lastName = patientData.lastName;
    if (patientData.color !== undefined) updateData.color = patientData.color;
    if (patientData.therapyRequirements !== undefined) updateData.therapyRequirements = patientData.therapyRequirements;
    if (patientData.isActive !== undefined) updateData.isActive = patientData.isActive;
    
    const patient = await this.prisma.patient.update({
      where: { id },
      data: updateData
    });
    return this.mapPrismaPatientToAPI(patient);
  }

  async setActive(id: string, isActive: boolean): Promise<Patient> {
    const patient = await this.prisma.patient.update({
      where: { id },
      data: { isActive }
    });
    return this.mapPrismaPatientToAPI(patient);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.patient.delete({
      where: { id }
    });
  }

  async deleteAll(): Promise<void> {
    await this.prisma.patient.deleteMany();
  }

  private mapPrismaPatientToAPI(patient: any): Patient {
    return {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      color: patient.color,
      therapyRequirements: patient.therapyRequirements || {},
      isActive: patient.isActive,
    };
  }
}
