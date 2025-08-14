import { Patient } from '../types';
import { api } from './api';

export const patientService = {
  async getAll(includeInactive = false): Promise<Patient[]> {
    const params = includeInactive ? '?includeInactive=true' : '';
    return api.get<Patient[]>(`/patients${params}`);
  },

  async getById(id: string): Promise<Patient> {
    return api.get<Patient>(`/patients/${id}`);
  },

  async create(patient: Omit<Patient, 'id' | 'isActive'>): Promise<Patient> {
    return api.post<Patient>('/patients', { ...patient, isActive: true });
  },

  async update(id: string, patient: Partial<Patient>): Promise<Patient> {
    return api.put<Patient>(`/patients/${id}`, patient);
  },

  async setActive(id: string, isActive: boolean): Promise<Patient> {
    return api.patch<Patient>(`/patients/${id}/status`, { isActive });
  },

  // Keep delete method for backward compatibility, but it won't be used in UI
  async delete(id: string): Promise<void> {
    return api.delete(`/patients/${id}`);
  },
};
