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
    const employee = await this.prisma.employee.create({
      data: {
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        role: mapAPIRoleToPrisma(employeeData.role),
        workingHours: employeeData.workingHours,
        weeklySessionsCount: employeeData.weeklySessionsCount,
      }
    });
    return mapPrismaEmployeeToAPI(employee);
  }

  async update(id: string, employeeData: UpdateEmployeeDto): Promise<Employee> {
    const updateData: any = {};
    
    if (employeeData.firstName !== undefined) updateData.firstName = employeeData.firstName;
    if (employeeData.lastName !== undefined) updateData.lastName = employeeData.lastName;
    if (employeeData.role !== undefined) updateData.role = mapAPIRoleToPrisma(employeeData.role);
    if (employeeData.workingHours !== undefined) updateData.workingHours = employeeData.workingHours;
    if (employeeData.weeklySessionsCount !== undefined) updateData.weeklySessionsCount = employeeData.weeklySessionsCount;
    
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
