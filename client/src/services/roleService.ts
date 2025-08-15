import { Role, CreateRoleDto, UpdateRoleDto } from '../types';
import { api } from './api';

export const roleService = {
  // Get all roles
  getAll: async (includeInactive = false): Promise<Role[]> => {
    const params = includeInactive ? '?includeInactive=true' : '';
    return api.get<Role[]>(`/roles${params}`);
  },

  // Get role by ID
  getById: async (id: string): Promise<Role> => {
    return api.get<Role>(`/roles/${id}`);
  },

  // Create new role
  create: async (data: CreateRoleDto): Promise<Role> => {
    return api.post<Role>('/roles', data);
  },

  // Update role
  update: async (id: string, data: UpdateRoleDto): Promise<Role> => {
    return api.put<Role>(`/roles/${id}`, data);
  },

  // Set role active status
  setActive: async (id: string, isActive: boolean): Promise<Role> => {
    return api.patch<Role>(`/roles/${id}/active`, { isActive });
  },

  // Delete role
  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/roles/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete role');
    }
  },

  // Get employee count for role
  getEmployeeCount: async (id: string): Promise<number> => {
    const response = await api.get<{ count: number }>(`/roles/${id}/employee-count`);
    return response.count;
  }
};
