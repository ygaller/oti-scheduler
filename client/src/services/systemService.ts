import { api } from './api';

export interface SystemStatus {
  employees: number;
  rooms: number;
  schedules: number;
  sessions: number;
  hasData: boolean;
}

export const systemService = {
  async getStatus(): Promise<SystemStatus> {
    return api.get<SystemStatus>('/system/status');
  },

  async resetAllData(): Promise<{ message: string }> {
    return api.post<{ message: string }>('/system/reset');
  },
};
