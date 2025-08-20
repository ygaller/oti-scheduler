import { Schedule, Session, CreateSessionDto, UpdateSessionDto } from '../types';
import { api } from './api';

export const scheduleService = {

  // Schedule Management
  async getAll(): Promise<Schedule[]> {
    return api.get<Schedule[]>('/schedule/all');
  },

  async create(name: string): Promise<Schedule> {
    return api.post<Schedule>('/schedule', { name });
  },

  async updateName(scheduleId: string, name: string): Promise<Schedule> {
    return api.put<Schedule>(`/schedule/${scheduleId}/name`, { name });
  },

  async delete(scheduleId: string): Promise<void> {
    return api.delete(`/schedule/${scheduleId}`);
  },

  // Session Management (for manual editing) - all require scheduleId
  async getSessions(scheduleId: string): Promise<Session[]> {
    return api.get<Session[]>(`/schedule/${scheduleId}/sessions`);
  },

  async createSession(scheduleId: string, session: CreateSessionDto, forceCreate: boolean = false): Promise<Session> {
    return api.post<Session>(`/schedule/${scheduleId}/sessions`, { ...session, forceCreate });
  },

  async updateSession(scheduleId: string, sessionId: string, session: UpdateSessionDto): Promise<Session> {
    return api.put<Session>(`/schedule/${scheduleId}/sessions/${sessionId}`, session);
  },

  async deleteSession(scheduleId: string, sessionId: string): Promise<void> {
    return api.delete(`/schedule/${scheduleId}/sessions/${sessionId}`);
  },

  // Session-Patient Assignment
  async assignPatientToSession(scheduleId: string, sessionId: string, patientId: string, forceAssign: boolean = false): Promise<Session> {
    return api.post<Session>(`/schedule/${scheduleId}/sessions/${sessionId}/patients`, { patientId, forceAssign });
  },

  async removePatientFromSession(scheduleId: string, sessionId: string, patientId: string): Promise<Session> {
    return api.delete<Session>(`/schedule/${scheduleId}/sessions/${sessionId}/patients/${patientId}`);
  },

  async updateSessionPatients(scheduleId: string, sessionId: string, patientIds: string[], forceAssign: boolean = false): Promise<Session> {
    return api.put<Session>(`/schedule/${scheduleId}/sessions/${sessionId}/patients`, { patientIds, forceAssign });
  },
};