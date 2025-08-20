import { Employee, CreateEmployeeDto } from '../types';
import { api } from './api';

export const employeeService = {
  async getAll(includeInactive = false): Promise<Employee[]> {
    const params = includeInactive ? '?includeInactive=true' : '';
    return api.get<Employee[]>(`/employees${params}`);
  },

  async getById(id: string): Promise<Employee> {
    return api.get<Employee>(`/employees/${id}`);
  },

  async create(employee: CreateEmployeeDto): Promise<Employee> {
    return api.post<Employee>('/employees', { ...employee, reservedHours: employee.reservedHours || [], isActive: true });
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

