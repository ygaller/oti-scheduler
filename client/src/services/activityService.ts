import { Activity, CreateActivityDto, UpdateActivityDto } from '../types';
import { api } from './api';

export const activityService = {
  // Get all activities
  async getAll(): Promise<Activity[]> {
    return api.get<Activity[]>('/activities');
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



  // Delete an activity
  async delete(id: string): Promise<void> {
    return api.delete(`/activities/${id}`);
  }
};
