import { useState, useEffect, useCallback } from 'react';
import { Activity, CreateActivityDto, UpdateActivityDto } from '../types';
import { activityService } from '../services';

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await activityService.getAll();
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  }, []);

  const createActivity = async (data: CreateActivityDto): Promise<Activity> => {
    try {
      const newActivity = await activityService.create(data);
      setActivities(prev => [...prev, newActivity]);
      return newActivity;
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  };

  const updateActivity = async (id: string, data: UpdateActivityDto): Promise<Activity> => {
    try {
      const updatedActivity = await activityService.update(id, data);
      setActivities(prev => 
        prev.map(activity => activity.id === id ? updatedActivity : activity)
      );
      return updatedActivity;
    } catch (error) {
      console.error('Error updating activity:', error);
      throw error;
    }
  };



  const deleteActivity = async (id: string): Promise<void> => {
    try {
      await activityService.delete(id);
      setActivities(prev => prev.filter(activity => activity.id !== id));
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities,
    createActivity,
    updateActivity,
    deleteActivity
  };
}
