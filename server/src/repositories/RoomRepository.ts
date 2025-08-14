import { PrismaClient } from '@prisma/client';
import { RoomRepository } from './interfaces';
import { Room, CreateRoomDto, UpdateRoomDto } from '../types';
import { mapPrismaRoomToAPI } from '../mappers';

export class PrismaRoomRepository implements RoomRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<Room[]> {
    const rooms = await this.prisma.room.findMany({
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
      }
    });
    return mapPrismaRoomToAPI(room);
  }

  async update(id: string, roomData: UpdateRoomDto): Promise<Room> {
    const updateData: any = {};
    
    if (roomData.name !== undefined) updateData.name = roomData.name;
    
    const room = await this.prisma.room.update({
      where: { id },
      data: updateData
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
