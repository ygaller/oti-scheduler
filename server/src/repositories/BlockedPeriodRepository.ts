import { PrismaClient } from '@prisma/client';
import { BlockedPeriod, CreateBlockedPeriodDto, UpdateBlockedPeriodDto } from '../types';
import { BlockedPeriodRepository } from './interfaces';

export class PrismaBlockedPeriodRepository implements BlockedPeriodRepository {
  constructor(private prisma: PrismaClient) {}
  async findAll(includeInactive = false): Promise<BlockedPeriod[]> {
    const blockedPeriods = await this.prisma.blockedPeriod.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: 'asc' }
    });

    return blockedPeriods.map(bp => ({
      id: bp.id,
      name: bp.name,
      color: bp.color,
      defaultStartTime: bp.defaultStartTime,
      defaultEndTime: bp.defaultEndTime,
      dayOverrides: bp.dayOverrides as Record<string, { startTime: string; endTime: string } | null>,
      isBlocking: bp.isBlocking,
      isActive: bp.isActive,
      createdAt: bp.createdAt,
      updatedAt: bp.updatedAt
    }));
  }

  async findById(id: string): Promise<BlockedPeriod | null> {
    const blockedPeriod = await this.prisma.blockedPeriod.findUnique({
      where: { id }
    });

    if (!blockedPeriod) return null;

    return {
      id: blockedPeriod.id,
      name: blockedPeriod.name,
      color: blockedPeriod.color,
      defaultStartTime: blockedPeriod.defaultStartTime,
      defaultEndTime: blockedPeriod.defaultEndTime,
      dayOverrides: blockedPeriod.dayOverrides as Record<string, { startTime: string; endTime: string } | null>,
      isBlocking: blockedPeriod.isBlocking,
      isActive: blockedPeriod.isActive,
      createdAt: blockedPeriod.createdAt,
      updatedAt: blockedPeriod.updatedAt
    };
  }

  async create(dto: CreateBlockedPeriodDto): Promise<BlockedPeriod> {
    const blockedPeriod = await this.prisma.blockedPeriod.create({
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
      id: blockedPeriod.id,
      name: blockedPeriod.name,
      color: blockedPeriod.color,
      defaultStartTime: blockedPeriod.defaultStartTime,
      defaultEndTime: blockedPeriod.defaultEndTime,
      dayOverrides: blockedPeriod.dayOverrides as Record<string, { startTime: string; endTime: string } | null>,
      isBlocking: blockedPeriod.isBlocking,
      isActive: blockedPeriod.isActive,
      createdAt: blockedPeriod.createdAt,
      updatedAt: blockedPeriod.updatedAt
    };
  }

  async update(id: string, dto: UpdateBlockedPeriodDto): Promise<BlockedPeriod> {
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.defaultStartTime !== undefined) updateData.defaultStartTime = dto.defaultStartTime;
    if (dto.defaultEndTime !== undefined) updateData.defaultEndTime = dto.defaultEndTime;
    if (dto.dayOverrides !== undefined) updateData.dayOverrides = dto.dayOverrides as any;
    if (dto.isBlocking !== undefined) updateData.isBlocking = dto.isBlocking;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const blockedPeriod = await this.prisma.blockedPeriod.update({
      where: { id },
      data: updateData
    });

    return {
      id: blockedPeriod.id,
      name: blockedPeriod.name,
      color: blockedPeriod.color,
      defaultStartTime: blockedPeriod.defaultStartTime,
      defaultEndTime: blockedPeriod.defaultEndTime,
      dayOverrides: blockedPeriod.dayOverrides as Record<string, { startTime: string; endTime: string } | null>,
      isBlocking: blockedPeriod.isBlocking,
      isActive: blockedPeriod.isActive,
      createdAt: blockedPeriod.createdAt,
      updatedAt: blockedPeriod.updatedAt
    };
  }

  async setActive(id: string, isActive: boolean): Promise<BlockedPeriod> {
    const blockedPeriod = await this.prisma.blockedPeriod.update({
      where: { id },
      data: { isActive }
    });

    return {
      id: blockedPeriod.id,
      name: blockedPeriod.name,
      color: blockedPeriod.color,
      defaultStartTime: blockedPeriod.defaultStartTime,
      defaultEndTime: blockedPeriod.defaultEndTime,
      dayOverrides: blockedPeriod.dayOverrides as Record<string, { startTime: string; endTime: string } | null>,
      isBlocking: blockedPeriod.isBlocking,
      isActive: blockedPeriod.isActive,
      createdAt: blockedPeriod.createdAt,
      updatedAt: blockedPeriod.updatedAt
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.blockedPeriod.delete({
      where: { id }
    });
  }

  async deleteAll(): Promise<void> {
    await this.prisma.blockedPeriod.deleteMany();
  }
}
