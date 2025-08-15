import { PrismaClient } from '@prisma/client';
import { Activity, CreateActivityDto, UpdateActivityDto } from '../types';
import { ActivityRepository } from './interfaces';

export class PrismaActivityRepository implements ActivityRepository {
  constructor(private prisma: PrismaClient) {}
  async findAll(includeInactive = false): Promise<Activity[]> {
    const activities = await this.prisma.activity.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: 'asc' }
    });

    return activities.map(activity => ({
      id: activity.id,
      name: activity.name,
      color: activity.color,
      defaultStartTime: activity.defaultStartTime,
      defaultEndTime: activity.defaultEndTime,
      dayOverrides: activity.dayOverrides as Record<string, { startTime: string; endTime: string } | null>,
      isBlocking: activity.isBlocking,
      isActive: activity.isActive,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt
    }));
  }

  async findById(id: string): Promise<Activity | null> {
    const activity = await this.prisma.activity.findUnique({
      where: { id }
    });

    if (!activity) return null;

    return {
      id: activity.id,
      name: activity.name,
      color: activity.color,
      defaultStartTime: activity.defaultStartTime,
      defaultEndTime: activity.defaultEndTime,
      dayOverrides: activity.dayOverrides as Record<string, { startTime: string; endTime: string } | null>,
      isBlocking: activity.isBlocking,
      isActive: activity.isActive,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt
    };
  }

  async create(dto: CreateActivityDto): Promise<Activity> {
    const activity = await this.prisma.activity.create({
      data: {
        name: dto.name,
        color: dto.color,
        defaultStartTime: dto.defaultStartTime || null,
        defaultEndTime: dto.defaultEndTime || null,
        dayOverrides: (dto.dayOverrides || {}) as any,
        isBlocking: dto.isBlocking !== undefined ? dto.isBlocking : false,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      }
    });

    return {
      id: activity.id,
      name: activity.name,
      color: activity.color,
      defaultStartTime: activity.defaultStartTime,
      defaultEndTime: activity.defaultEndTime,
      dayOverrides: activity.dayOverrides as Record<string, { startTime: string; endTime: string } | null>,
      isBlocking: activity.isBlocking,
      isActive: activity.isActive,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt
    };
  }

  async update(id: string, dto: UpdateActivityDto): Promise<Activity> {
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.defaultStartTime !== undefined) updateData.defaultStartTime = dto.defaultStartTime;
    if (dto.defaultEndTime !== undefined) updateData.defaultEndTime = dto.defaultEndTime;
    if (dto.dayOverrides !== undefined) updateData.dayOverrides = dto.dayOverrides as any;
    if (dto.isBlocking !== undefined) updateData.isBlocking = dto.isBlocking;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const activity = await this.prisma.activity.update({
      where: { id },
      data: updateData
    });

    return {
      id: activity.id,
      name: activity.name,
      color: activity.color,
      defaultStartTime: activity.defaultStartTime,
      defaultEndTime: activity.defaultEndTime,
      dayOverrides: activity.dayOverrides as Record<string, { startTime: string; endTime: string } | null>,
      isBlocking: activity.isBlocking,
      isActive: activity.isActive,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt
    };
  }

  async setActive(id: string, isActive: boolean): Promise<Activity> {
    const activity = await this.prisma.activity.update({
      where: { id },
      data: { isActive }
    });

    return {
      id: activity.id,
      name: activity.name,
      color: activity.color,
      defaultStartTime: activity.defaultStartTime,
      defaultEndTime: activity.defaultEndTime,
      dayOverrides: activity.dayOverrides as Record<string, { startTime: string; endTime: string } | null>,
      isBlocking: activity.isBlocking,
      isActive: activity.isActive,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.activity.delete({
      where: { id }
    });
  }

  async deleteAll(): Promise<void> {
    await this.prisma.activity.deleteMany();
  }
}
