import { Patient } from '../types';
import { api } from './api';

// Helper function to ensure therapy requirements are parsed as an object
const parseTherapyRequirements = (therapyRequirements: any): { [roleStringKey: string]: number } => {
  if (typeof therapyRequirements === 'string') {
    try {
      return JSON.parse(therapyRequirements);
    } catch (error) {
      console.error('Error parsing therapy requirements:', error);
      return {};
    }
  }
  return therapyRequirements || {};
};

// Helper function to process patient data received from API
const processPatientData = (patient: any): Patient => ({
  ...patient,
  therapyRequirements: parseTherapyRequirements(patient.therapyRequirements)
});

export const patientService = {
  async getAll(includeInactive = false): Promise<Patient[]> {
    const params = includeInactive ? '?includeInactive=true' : '';
    const patients = await api.get<any[]>(`/patients${params}`);
    return patients.map(processPatientData);
  },

  async getById(id: string): Promise<Patient> {
    const patient = await api.get<any>(`/patients/${id}`);
    return processPatientData(patient);
  },

  async create(patient: Omit<Patient, 'id' | 'isActive'>): Promise<Patient> {
    const result = await api.post<any>('/patients', { ...patient, isActive: true });
    return processPatientData(result);
  },

  async update(id: string, patient: Partial<Patient>): Promise<Patient> {
    const result = await api.put<any>(`/patients/${id}`, patient);
    return processPatientData(result);
  },

  async setActive(id: string, isActive: boolean): Promise<Patient> {
    const result = await api.patch<any>(`/patients/${id}/status`, { isActive });
    return processPatientData(result);
  },

  // Keep delete method for backward compatibility, but it won't be used in UI
  async delete(id: string): Promise<void> {
    return api.delete(`/patients/${id}`);
  },
};
