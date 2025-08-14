import { useState, useEffect, useCallback } from 'react';
import { Patient } from '../types';
import { patientService } from '../services';

export const usePatients = (includeInactive = false) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await patientService.getAll(includeInactive);
      setPatients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const createPatient = useCallback(async (patientData: Omit<Patient, 'id' | 'isActive'>) => {
    try {
      const newPatient = await patientService.create(patientData);
      setPatients(prev => [...prev, newPatient]);
      return newPatient;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create patient');
      throw err;
    }
  }, []);

  const updatePatient = useCallback(async (id: string, patientData: Partial<Patient>) => {
    try {
      const updatedPatient = await patientService.update(id, patientData);
      setPatients(prev => prev.map(patient => patient.id === id ? updatedPatient : patient));
      return updatedPatient;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update patient');
      throw err;
    }
  }, []);

  const setPatientActive = useCallback(async (id: string, isActive: boolean) => {
    try {
      const updatedPatient = await patientService.setActive(id, isActive);
      setPatients(prev => prev.map(patient => patient.id === id ? updatedPatient : patient));
      return updatedPatient;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update patient status');
      throw err;
    }
  }, []);

  const refreshPatients = useCallback(() => {
    fetchPatients();
  }, [fetchPatients]);

  return {
    patients,
    loading,
    error,
    createPatient,
    updatePatient,
    setPatientActive,
    refreshPatients,
  };
};
