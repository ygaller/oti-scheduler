import { PrismaClient } from '@prisma/client';
import { EmployeeRepository } from './interfaces';
import { Employee, CreateEmployeeDto, UpdateEmployeeDto } from '../types';
import { mapPrismaEmployeeToAPI, mapAPIRoleToPrisma } from '../mappers';

export class PrismaEmployeeRepository implements EmployeeRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<Employee[]> {
    const employees = await this.prisma.employee.findMany({
      orderBy: { createdAt: 'asc' }
    });
    return employees.map(mapPrismaEmployeeToAPI);
  }

  async findById(id: string): Promise<Employee | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id }
    });
    return employee ? mapPrismaEmployeeToAPI(employee) : null;
  }

  async create(employeeData: CreateEmployeeDto): Promise<Employee> {
    // Validate that role exists and can be mapped
    if (!employeeData.role) {
      throw new Error('Role is required');
    }
    
    const prismaRole = mapAPIRoleToPrisma(employeeData.role);
    if (!prismaRole) {
      throw new Error(`Invalid role: ${employeeData.role}`);
    }

    const employee = await this.prisma.employee.create({
      data: {
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        role: prismaRole,
        workingHours: employeeData.workingHours as any,
        weeklySessionsCount: employeeData.weeklySessionsCount,
        color: employeeData.color,
      }
    });
    return mapPrismaEmployeeToAPI(employee);
  }

  async update(id: string, employeeData: UpdateEmployeeDto): Promise<Employee> {
    const updateData: any = {};
    
    if (employeeData.firstName !== undefined) updateData.firstName = employeeData.firstName;
    if (employeeData.lastName !== undefined) updateData.lastName = employeeData.lastName;
    if (employeeData.role !== undefined) updateData.role = mapAPIRoleToPrisma(employeeData.role);
    if (employeeData.workingHours !== undefined) updateData.workingHours = employeeData.workingHours as any;
    if (employeeData.weeklySessionsCount !== undefined) updateData.weeklySessionsCount = employeeData.weeklySessionsCount;
    if (employeeData.color !== undefined) updateData.color = employeeData.color;
    
    const employee = await this.prisma.employee.update({
      where: { id },
      data: updateData
    });
    return mapPrismaEmployeeToAPI(employee);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.employee.delete({
      where: { id }
    });
  }

  async deleteAll(): Promise<void> {
    await this.prisma.employee.deleteMany();
  }
}
