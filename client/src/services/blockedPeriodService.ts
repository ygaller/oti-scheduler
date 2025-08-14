import { BlockedPeriod, CreateBlockedPeriodDto, UpdateBlockedPeriodDto } from '../types';
import { api } from './api';

export const blockedPeriodService = {
  // Get all blocked periods
  async getAll(includeInactive = false): Promise<BlockedPeriod[]> {
    const params = includeInactive ? '?includeInactive=true' : '';
    return api.get<BlockedPeriod[]>(`/blocked-periods${params}`);
  },

  // Get a specific blocked period by ID
  async getById(id: string): Promise<BlockedPeriod> {
    return api.get<BlockedPeriod>(`/blocked-periods/${id}`);
  },

  // Create a new blocked period
  async create(data: CreateBlockedPeriodDto): Promise<BlockedPeriod> {
    return api.post<BlockedPeriod>('/blocked-periods', data);
  },

  // Update an existing blocked period
  async update(id: string, data: UpdateBlockedPeriodDto): Promise<BlockedPeriod> {
    return api.put<BlockedPeriod>(`/blocked-periods/${id}`, data);
  },

  // Toggle active status
  async setActive(id: string, isActive: boolean): Promise<BlockedPeriod> {
    return api.patch<BlockedPeriod>(`/blocked-periods/${id}/active`, { isActive });
  },

  // Delete a blocked period
  async delete(id: string): Promise<void> {
    return api.delete(`/blocked-periods/${id}`);
  }
};
