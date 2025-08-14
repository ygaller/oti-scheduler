import { useState, useEffect, useCallback } from 'react';
import { Schedule, ScheduleConfig } from '../types';
import { scheduleService, ApiError } from '../services';

interface UseScheduleResult {
  config: ScheduleConfig | null;
  activeSchedule: Schedule | null;
  allSchedules: Schedule[];
  loading: boolean;
  error: string | null;
  updateConfig: (config: ScheduleConfig) => Promise<void>;
  generateSchedule: () => Promise<Schedule>;
  activateSchedule: (id: string) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  refetchConfig: () => Promise<void>;
  refetchActive: () => Promise<void>;
  refetchAll: () => Promise<void>;
}

export const useSchedule = (): UseScheduleResult => {
  const [config, setConfig] = useState<ScheduleConfig | null>(null);
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await scheduleService.getConfig();
      setConfig(data);
    } catch (err) {
      console.error('Error fetching schedule config:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to load schedule configuration');
    }
  }, []);

  const fetchActiveSchedule = useCallback(async () => {
    try {
      const data = await scheduleService.getActive();
      setActiveSchedule(data);
    } catch (err) {
      console.error('Error fetching active schedule:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to load active schedule');
    }
  }, []);

  const fetchAllSchedules = useCallback(async () => {
    try {
      const data = await scheduleService.getAll();
      setAllSchedules(data);
    } catch (err) {
      console.error('Error fetching all schedules:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to load schedules');
    }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        fetchConfig(),
        fetchActiveSchedule(),
        fetchAllSchedules()
      ]);
    } catch (err) {
      // Error handling is already done in individual functions
    } finally {
      setLoading(false);
    }
  }, [fetchConfig, fetchActiveSchedule, fetchAllSchedules]);

  const updateConfig = useCallback(async (newConfig: ScheduleConfig): Promise<void> => {
    try {
      setError(null);
      const updatedConfig = await scheduleService.updateConfig(newConfig);
      setConfig(updatedConfig);
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to update schedule configuration';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const generateSchedule = useCallback(async (): Promise<Schedule> => {
    try {
      setError(null);
      const newSchedule = await scheduleService.generate();
      setAllSchedules(prev => [newSchedule, ...prev]);
      return newSchedule;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to generate schedule';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const activateSchedule = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      const activatedSchedule = await scheduleService.activate(id);
      setActiveSchedule(activatedSchedule);
      // Update the schedules list to reflect the new active status
      await fetchAllSchedules();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to activate schedule';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchAllSchedules]);

  const deleteSchedule = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await scheduleService.delete(id);
      setAllSchedules(prev => prev.filter(s => s.id !== id));
      // If we deleted the active schedule, clear it
      if (activeSchedule?.id === id) {
        setActiveSchedule(null);
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete schedule';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [activeSchedule?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    config,
    activeSchedule,
    allSchedules,
    loading,
    error,
    updateConfig,
    generateSchedule,
    activateSchedule,
    deleteSchedule,
    refetchConfig: fetchConfig,
    refetchActive: fetchActiveSchedule,
    refetchAll: fetchAllSchedules,
  };
};

