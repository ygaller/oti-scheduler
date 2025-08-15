import { Activity, CreateActivityDto, UpdateActivityDto } from '../types';
import { api } from './api';

export const activityService = {
  // Get all activities
  async getAll(includeInactive = false): Promise<Activity[]> {
    const params = includeInactive ? '?includeInactive=true' : '';
    return api.get<Activity[]>(`/activities${params}`);
  },

  // Get a specific activity by ID
  async getById(id: string): Promise<Activity> {
    return api.get<Activity>(`/activities/${id}`);
  },

  // Create a new activity
  async create(data: CreateActivityDto): Promise<Activity> {
    return api.post<Activity>('/activities', data);
  },

  // Update an existing activity
  async update(id: string, data: UpdateActivityDto): Promise<Activity> {
    return api.put<Activity>(`/activities/${id}`, data);
  },

  // Toggle active status
  async setActive(id: string, isActive: boolean): Promise<Activity> {
    return api.patch<Activity>(`/activities/${id}/active`, { isActive });
  },

  // Delete an activity
  async delete(id: string): Promise<void> {
    return api.delete(`/activities/${id}`);
  }
};
