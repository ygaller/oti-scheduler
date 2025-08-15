import { PrismaClient, Role as PrismaRole } from '@prisma/client';
import { CreateRoleDto, UpdateRoleDto, Role } from '../types';
import { RoleRepository } from './interfaces';

export class PrismaRoleRepository implements RoleRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(includeInactive?: boolean): Promise<Role[]> {
    const roles = await this.prisma.role.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' }
    });
    
    return roles.map(this.mapPrismaRoleToRole);
  }

  async findById(id: string): Promise<Role | null> {
    const role = await this.prisma.role.findUnique({
      where: { id }
    });
    
    return role ? this.mapPrismaRoleToRole(role) : null;
  }

  async findByName(name: string): Promise<Role | null> {
    const role = await this.prisma.role.findUnique({
      where: { name }
    });
    
    return role ? this.mapPrismaRoleToRole(role) : null;
  }

  async findByRoleStringKey(roleStringKey: string): Promise<Role | null> {
    const role = await this.prisma.role.findUnique({
      where: { roleStringKey }
    });
    
    return role ? this.mapPrismaRoleToRole(role) : null;
  }

  async create(data: CreateRoleDto): Promise<Role> {
    // Generate the next role_string_key
    const roleStringKey = await this.generateNextRoleStringKey();
    
    const role = await this.prisma.role.create({
      data: {
        name: data.name,
        roleStringKey,
        isActive: data.isActive ?? true
      }
    });
    
    return this.mapPrismaRoleToRole(role);
  }

  private async generateNextRoleStringKey(): Promise<string> {
    // Find the highest existing role number
    const lastRole = await this.prisma.role.findFirst({
      where: {
        roleStringKey: {
          startsWith: 'role_'
        }
      },
      orderBy: {
        roleStringKey: 'desc'
      }
    });

    let nextNumber = 1;
    if (lastRole?.roleStringKey) {
      const match = lastRole.roleStringKey.match(/role_(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `role_${nextNumber}`;
  }

  async update(id: string, data: UpdateRoleDto): Promise<Role | null> {
    try {
      const role = await this.prisma.role.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.isActive !== undefined && { isActive: data.isActive })
        }
      });
      
      return this.mapPrismaRoleToRole(role);
    } catch (error) {
      return null;
    }
  }

  async setActive(id: string, isActive: boolean): Promise<Role | null> {
    try {
      const role = await this.prisma.role.update({
        where: { id },
        data: { isActive }
      });
      
      return this.mapPrismaRoleToRole(role);
    } catch (error) {
      return null;
    }
  }

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if role is being used by any employees
      const employeeCount = await this.prisma.employee.count({
        where: { roleId: id }
      });
      
      if (employeeCount > 0) {
        return {
          success: false,
          error: `לא ניתן למחוק תפקיד שמוקצה ל-${employeeCount} עובד${employeeCount > 1 ? 'ים' : ''}. יש להסיר את התפקיד מכל העובדים לפני המחיקה.`
        };
      }
      
      await this.prisma.role.delete({
        where: { id }
      });
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'שגיאה במחיקת התפקיד'
      };
    }
  }

  async getEmployeeCount(roleId: string): Promise<number> {
    return this.prisma.employee.count({
      where: { roleId }
    });
  }

  private mapPrismaRoleToRole(prismaRole: PrismaRole): Role {
    return {
      id: prismaRole.id,
      name: prismaRole.name,
      roleStringKey: prismaRole.roleStringKey,
      isActive: prismaRole.isActive,
      createdAt: prismaRole.createdAt,
      updatedAt: prismaRole.updatedAt
    };
  }
}
