import { PrismaClient } from '@prisma/client';
import { RoomRepository } from './interfaces';
import { Room, CreateRoomDto, UpdateRoomDto } from '../types';
import { mapPrismaRoomToAPI } from '../mappers';

export class PrismaRoomRepository implements RoomRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(includeInactive = false): Promise<Room[]> {
    const rooms = await this.prisma.room.findMany({
      where: includeInactive ? {} : { isActive: true } as any,
      orderBy: { createdAt: 'asc' }
    });
    return rooms.map(mapPrismaRoomToAPI);
  }

  async findById(id: string): Promise<Room | null> {
    const room = await this.prisma.room.findUnique({
      where: { id }
    });
    return room ? mapPrismaRoomToAPI(room) : null;
  }

  async create(roomData: CreateRoomDto): Promise<Room> {
    const room = await this.prisma.room.create({
      data: {
        name: roomData.name,
        color: roomData.color,
        isActive: roomData.isActive ?? true,
      } as any
    });
    return mapPrismaRoomToAPI(room);
  }

  async update(id: string, roomData: UpdateRoomDto): Promise<Room> {
    const updateData: any = {};
    
    if (roomData.name !== undefined) updateData.name = roomData.name;
    if (roomData.color !== undefined) updateData.color = roomData.color;
    if (roomData.isActive !== undefined) updateData.isActive = roomData.isActive;
    
    const room = await this.prisma.room.update({
      where: { id },
      data: updateData
    });
    return mapPrismaRoomToAPI(room);
  }

  async setActive(id: string, isActive: boolean): Promise<Room> {
    const room = await this.prisma.room.update({
      where: { id },
      data: { isActive } as any
    });
    return mapPrismaRoomToAPI(room);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.room.delete({
      where: { id }
    });
  }

  async deleteAll(): Promise<void> {
    await this.prisma.room.deleteMany();
  }
}

