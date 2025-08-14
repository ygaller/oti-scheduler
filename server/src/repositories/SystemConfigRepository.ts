import { PrismaClient } from '@prisma/client';
import { SystemConfigRepository } from './interfaces';
import { ScheduleConfig } from '../types';

const SCHEDULE_CONFIG_KEY = 'schedule_config';

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

  async getScheduleConfig(): Promise<ScheduleConfig | null> {
    return this.get<ScheduleConfig>(SCHEDULE_CONFIG_KEY);
  }

  async setScheduleConfig(config: ScheduleConfig): Promise<void> {
    await this.set(SCHEDULE_CONFIG_KEY, config);
  }
}

