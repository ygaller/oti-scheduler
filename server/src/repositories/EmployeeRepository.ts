import { PrismaClient } from '@prisma/client';
import { EmployeeRepository } from './interfaces';
import { Employee, CreateEmployeeDto, UpdateEmployeeDto } from '../types';
import { mapPrismaEmployeeToAPI, mapAPIRoleToPrisma } from '../mappers';

export class PrismaEmployeeRepository implements EmployeeRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(includeInactive = false): Promise<Employee[]> {
    const employees = await this.prisma.employee.findMany({
      where: includeInactive ? {} : { isActive: true } as any,
      orderBy: { createdAt: 'asc' },
      include: {
        role: true
      }
    });
    return employees.map(mapPrismaEmployeeToAPI);
  }

  async findById(id: string): Promise<Employee | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        role: true
      }
    });
    return employee ? mapPrismaEmployeeToAPI(employee) : null;
  }

  async create(employeeData: CreateEmployeeDto): Promise<Employee> {
    // Validate that roleId is provided
    if (!employeeData.roleId) {
      throw new Error('Role ID is required');
    }

    const employee = await this.prisma.employee.create({
      data: {
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        roleId: employeeData.roleId,
        workingHours: employeeData.workingHours as any,
        weeklySessionsCount: employeeData.weeklySessionsCount,
        color: employeeData.color,
        isActive: employeeData.isActive ?? true,
      },
      include: {
        role: true // Include the role in the response
      }
    });
    return mapPrismaEmployeeToAPI(employee);
  }

  async update(id: string, employeeData: UpdateEmployeeDto): Promise<Employee> {
    const updateData: any = {};
    
    if (employeeData.firstName !== undefined) updateData.firstName = employeeData.firstName;
    if (employeeData.lastName !== undefined) updateData.lastName = employeeData.lastName;
    if (employeeData.roleId !== undefined) updateData.roleId = employeeData.roleId;
    if (employeeData.workingHours !== undefined) updateData.workingHours = employeeData.workingHours as any;
    if (employeeData.weeklySessionsCount !== undefined) updateData.weeklySessionsCount = employeeData.weeklySessionsCount;
    if (employeeData.color !== undefined) updateData.color = employeeData.color;
    if (employeeData.isActive !== undefined) updateData.isActive = employeeData.isActive;
    
    const employee = await this.prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        role: true // Include the role in the response
      }
    });
    return mapPrismaEmployeeToAPI(employee);
  }

  async setActive(id: string, isActive: boolean): Promise<Employee> {
    const employee = await this.prisma.employee.update({
      where: { id },
      data: { isActive } as any
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
