import { Schedule, Session } from '../types';
import { api } from './api';

export const scheduleService = {


  // Schedule Generation
  async generate(): Promise<Schedule> {
    return api.post<Schedule>('/schedule/generate');
  },

  // Schedule Management
  async getActive(): Promise<Schedule | null> {
    return api.get<Schedule | null>('/schedule/active');
  },

  async getAll(): Promise<Schedule[]> {
    return api.get<Schedule[]>('/schedule/all');
  },

  async activate(id: string): Promise<Schedule> {
    return api.put<Schedule>(`/schedule/${id}/activate`, {});
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/schedule/${id}`);
  },

  // Session Management (for manual editing)
  async getSessions(): Promise<Session[]> {
    return api.get<Session[]>('/schedule/sessions');
  },

  async createSession(session: Omit<Session, 'id'>): Promise<Session> {
    return api.post<Session>('/schedule/sessions', session);
  },

  async updateSession(id: string, session: Partial<Session>): Promise<Session> {
    return api.put<Session>(`/schedule/sessions/${id}`, session);
  },

  async deleteSession(id: string): Promise<void> {
    return api.delete(`/schedule/sessions/${id}`);
  },
};

