import { Employee } from '../types';
import { api } from './api';

export const employeeService = {
  async getAll(): Promise<Employee[]> {
    return api.get<Employee[]>('/employees');
  },

  async getById(id: string): Promise<Employee> {
    return api.get<Employee>(`/employees/${id}`);
  },

  async create(employee: Omit<Employee, 'id'>): Promise<Employee> {
    return api.post<Employee>('/employees', employee);
  },

  async update(id: string, employee: Partial<Employee>): Promise<Employee> {
    return api.put<Employee>(`/employees/${id}`, employee);
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/employees/${id}`);
  },
};

