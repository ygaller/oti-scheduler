import { PrismaClient } from '@prisma/client';
import { SystemConfigRepository } from './interfaces';




export class PrismaSystemConfigRepository implements SystemConfigRepository {
  constructor(private prisma: PrismaClient) {}

  async get<T>(key: string): Promise<T | null> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key }
    });
    return config ? (config.value as T) : null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value: value as any },
      create: { key, value: value as any }
    });
  }

  async delete(key: string): Promise<void> {
    await this.prisma.systemConfig.delete({
      where: { key }
    });
  }

  async deleteAll(): Promise<void> {
    await this.prisma.systemConfig.deleteMany();
  }


}

