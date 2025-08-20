import { useState, useEffect, useCallback } from 'react';
import { Schedule, Session } from '../types';
import { scheduleService, ApiError } from '../services';

interface UseScheduleResult {
  allSchedules: Schedule[];
  selectedSchedule: Schedule | null;
  selectedScheduleId: string | null;
  sessions: Session[];
  loading: boolean;
  error: string | null;
  setSelectedScheduleId: (id: string | null) => void;
  createSchedule: (name: string) => Promise<Schedule>;
  updateScheduleName: (scheduleId: string, name: string) => Promise<Schedule>;
  deleteSchedule: (id: string) => Promise<void>;
  refetchSchedules: () => Promise<void>;
  refetchSessions: () => Promise<void>;
}

export const useSchedule = (): UseScheduleResult => {
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleIdState] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllSchedules = useCallback(async (): Promise<Schedule[]> => {
    try {
      setError(null);
      const schedules = await scheduleService.getAll();
      setAllSchedules(schedules);
      return schedules;
    } catch (err) {
      console.error('Failed to fetch all schedules:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to fetch schedules');
      return [];
    }
  }, []);

  const fetchSessions = useCallback(async (scheduleId: string) => {
    // Check if the schedule ID still exists in our current schedules list
    // This prevents API calls with deleted schedule IDs
    if (!allSchedules.some(s => s.id === scheduleId)) {
      console.warn('Attempted to fetch sessions for non-existent schedule:', scheduleId);
      setSessions([]);
      return;
    }

    try {
      setError(null);
      const scheduleSessions = await scheduleService.getSessions(scheduleId);
      setSessions(scheduleSessions);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      // Only set error if it's not a "Schedule not found" error (which means the schedule was deleted)
      if (err instanceof ApiError && err.message.includes('Schedule not found')) {
        // Schedule was deleted, clear sessions silently
        setSessions([]);
      } else {
        setError(err instanceof ApiError ? err.message : 'Failed to fetch sessions');
        setSessions([]);
      }
    }
  }, [allSchedules]);

  const setSelectedScheduleId = useCallback((id: string | null) => {
    setSelectedScheduleIdState(id);
    
    if (id) {
      // Validate that the ID exists in our schedules list
      const schedule = allSchedules.find(s => s.id === id);
      
      if (schedule) {
        // Store in localStorage for persistence
        localStorage.setItem('selectedScheduleId', id);
        setSelectedSchedule(schedule);
        
        // Fetch sessions for this schedule
        fetchSessions(id);
      } else {
        // Invalid schedule ID provided, clear selection
        console.warn('Invalid schedule ID provided:', id);
        setSelectedScheduleIdState(null);
        setSelectedSchedule(null);
        setSessions([]);
        localStorage.removeItem('selectedScheduleId');
      }
    } else {
      localStorage.removeItem('selectedScheduleId');
      setSelectedSchedule(null);
      setSessions([]);
    }
  }, [allSchedules, fetchSessions]);

  const createSchedule = useCallback(async (name: string): Promise<Schedule> => {
    try {
      setLoading(true);
      setError(null);
      const newSchedule = await scheduleService.create(name);
      await fetchAllSchedules();
      return newSchedule;
    } catch (err) {
      console.error('Failed to create schedule:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to create schedule');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAllSchedules]);

  const updateScheduleName = useCallback(async (scheduleId: string, name: string): Promise<Schedule> => {
    try {
      setLoading(true);
      setError(null);
      const updatedSchedule = await scheduleService.updateName(scheduleId, name);
      await fetchAllSchedules();
      return updatedSchedule;
    } catch (err) {
      console.error('Failed to update schedule name:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to update schedule name');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAllSchedules]);

  const deleteSchedule = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // If we're deleting the currently selected schedule, clear selection IMMEDIATELY
      // to prevent any stale API calls
      if (selectedScheduleId === id) {
        setSelectedScheduleIdState(null);
        setSelectedSchedule(null);
        setSessions([]);
        localStorage.removeItem('selectedScheduleId');
      }
      
      await scheduleService.delete(id);
      
      const updatedSchedules = await fetchAllSchedules();
      
      // After fetching all schedules, if there are no schedules left, ensure everything is cleared
      if (updatedSchedules.length === 0) {
        setSelectedScheduleIdState(null);
        setSelectedSchedule(null);
        setSessions([]);
        localStorage.removeItem('selectedScheduleId');
      }
    } catch (err) {
      console.error('Failed to delete schedule:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to delete schedule');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedScheduleId, fetchAllSchedules]);

  const refetchSessions = useCallback(async () => {
    if (selectedScheduleId) {
      await fetchSessions(selectedScheduleId);
    }
  }, [selectedScheduleId, fetchSessions]);

  // Fetch initial data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await fetchAllSchedules();
      setLoading(false);
    };
    
    initializeData();
  }, [fetchAllSchedules]);

  // Auto-select schedule from localStorage or first available schedule
  useEffect(() => {
    if (allSchedules.length > 0 && !selectedScheduleId) {
      const savedScheduleId = localStorage.getItem('selectedScheduleId');
      
      // Validate that the saved schedule ID exists in the current schedules list
      const validSavedSchedule = savedScheduleId && allSchedules.find(s => s.id === savedScheduleId);
      const scheduleToSelect = validSavedSchedule ? savedScheduleId : allSchedules[0].id;
      
      // Double-check that we have a valid schedule before setting it
      if (scheduleToSelect && allSchedules.find(s => s.id === scheduleToSelect)) {
        setSelectedScheduleId(scheduleToSelect);
      }
    }
  }, [allSchedules, selectedScheduleId, setSelectedScheduleId]);

  return {
    allSchedules,
    selectedSchedule,
    selectedScheduleId,
    sessions,
    loading,
    error,
    setSelectedScheduleId,
    createSchedule,
    updateScheduleName,
    deleteSchedule,
    refetchSchedules: () => fetchAllSchedules().then(() => {}),
    refetchSessions,
  };
};