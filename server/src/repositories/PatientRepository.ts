import { PrismaClient } from '@prisma/client';
import { PatientRepository } from './interfaces';
import { Patient, CreatePatientDto, UpdatePatientDto } from '../types';
import { mapPrismaPatientToAPI } from '../mappers';

export class PrismaPatientRepository implements PatientRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(includeInactive = false): Promise<Patient[]> {
    const patients = await this.prisma.patient.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: 'asc' }
    });
    return patients.map(mapPrismaPatientToAPI);
  }

  async findById(id: string): Promise<Patient | null> {
    const patient = await this.prisma.patient.findUnique({
      where: { id }
    });
    return patient ? mapPrismaPatientToAPI(patient) : null;
  }

  async create(patientData: CreatePatientDto): Promise<Patient> {
    const patient = await this.prisma.patient.create({
      data: {
        firstName: patientData.firstName,
        lastName: patientData.lastName ?? '',
        color: patientData.color,
        therapyRequirements: JSON.stringify(patientData.therapyRequirements || {}),
        isActive: patientData.isActive ?? true,
      }
    });
    return mapPrismaPatientToAPI(patient);
  }

  async update(id: string, patientData: UpdatePatientDto): Promise<Patient> {
    const updateData: any = {};
    
    if (patientData.firstName !== undefined) updateData.firstName = patientData.firstName;
    if (patientData.lastName !== undefined) updateData.lastName = patientData.lastName;
    if (patientData.color !== undefined) updateData.color = patientData.color;
    if (patientData.therapyRequirements !== undefined) updateData.therapyRequirements = JSON.stringify(patientData.therapyRequirements);
    if (patientData.isActive !== undefined) updateData.isActive = patientData.isActive;
    
    const patient = await this.prisma.patient.update({
      where: { id },
      data: updateData
    });
    return mapPrismaPatientToAPI(patient);
  }

  async setActive(id: string, isActive: boolean): Promise<Patient> {
    const patient = await this.prisma.patient.update({
      where: { id },
      data: { isActive }
    });
    return mapPrismaPatientToAPI(patient);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.patient.delete({
      where: { id }
    });
  }

  async deleteAll(): Promise<void> {
    await this.prisma.patient.deleteMany();
  }
}
