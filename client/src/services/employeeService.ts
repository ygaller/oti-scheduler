import { Employee } from '../types';
import { api } from './api';

export const employeeService = {
  async getAll(includeInactive = false): Promise<Employee[]> {
    const params = includeInactive ? '?includeInactive=true' : '';
    return api.get<Employee[]>(`/employees${params}`);
  },

  async getById(id: string): Promise<Employee> {
    return api.get<Employee>(`/employees/${id}`);
  },

  async create(employee: Omit<Employee, 'id' | 'isActive'>): Promise<Employee> {
    return api.post<Employee>('/employees', { ...employee, isActive: true });
  },

  async update(id: string, employee: Partial<Employee>): Promise<Employee> {
    return api.put<Employee>(`/employees/${id}`, employee);
  },

  async setActive(id: string, isActive: boolean): Promise<Employee> {
    return api.patch<Employee>(`/employees/${id}/status`, { isActive });
  },

  // Keep delete method for backward compatibility, but it won't be used in UI
  async delete(id: string): Promise<void> {
    return api.delete(`/employees/${id}`);
  },
};

