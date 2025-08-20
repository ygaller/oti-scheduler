import { useState, useEffect, useCallback } from 'react';
import { Schedule } from '../types';
import { scheduleService, ApiError } from '../services';

interface UseScheduleResult {
  activeSchedule: Schedule | null;
  allSchedules: Schedule[];
  loading: boolean;
  error: string | null;
  resetSchedule: () => Promise<Schedule>;
  deleteSchedule: (id: string) => Promise<void>;
  refetchActive: () => Promise<void>;
  refetchAll: () => Promise<void>;
}

export const useSchedule = (): UseScheduleResult => {
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveSchedule = useCallback(async () => {
    try {
      setError(null);
      const schedule = await scheduleService.getActive();
      setActiveSchedule(schedule);
    } catch (err) {
      console.error('Failed to fetch active schedule:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to fetch active schedule');
    }
  }, []);

  const fetchAllSchedules = useCallback(async () => {
    try {
      setError(null);
      const schedules = await scheduleService.getAll();
      setAllSchedules(schedules);
    } catch (err) {
      console.error('Failed to fetch all schedules:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to fetch schedules');
    } finally {
      setLoading(false);
    }
  }, []);

  const resetSchedule = useCallback(async (): Promise<Schedule> => {
    try {
      setLoading(true);
      setError(null);
      const newSchedule = await scheduleService.reset();
      await fetchAllSchedules();
      await fetchActiveSchedule();
      return newSchedule;
    } catch (err) {
      console.error('Failed to reset schedule:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to reset schedule');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAllSchedules, fetchActiveSchedule]);



  const deleteSchedule = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await scheduleService.delete(id);
      await fetchActiveSchedule();
      await fetchAllSchedules();
    } catch (err) {
      console.error('Failed to delete schedule:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to delete schedule');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchActiveSchedule, fetchAllSchedules]);

  // Fetch initial data
  useEffect(() => {
    Promise.all([
      fetchActiveSchedule(),
      fetchAllSchedules()
    ]);
  }, [fetchActiveSchedule, fetchAllSchedules]);

  return {
    activeSchedule,
    allSchedules,
    loading,
    error,
    resetSchedule,
    deleteSchedule,
    refetchActive: fetchActiveSchedule,
    refetchAll: fetchAllSchedules,
  };
};