import { useState, useEffect, useCallback } from 'react';
import { Employee } from '../types';
import { employeeService, ApiError } from '../services';

interface UseEmployeesResult {
  employees: Employee[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createEmployee: (employee: Omit<Employee, 'id'>) => Promise<Employee>;
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<Employee>;
  deleteEmployee: (id: string) => Promise<void>;
}

export const useEmployees = (): UseEmployeesResult => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await employeeService.getAll();
      setEmployees(data);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  const createEmployee = useCallback(async (employee: Omit<Employee, 'id'>): Promise<Employee> => {
    try {
      setError(null);
      const newEmployee = await employeeService.create(employee);
      setEmployees(prev => [...prev, newEmployee]);
      return newEmployee;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to create employee';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateEmployee = useCallback(async (id: string, employee: Partial<Employee>): Promise<Employee> => {
    try {
      setError(null);
      const updatedEmployee = await employeeService.update(id, employee);
      setEmployees(prev => prev.map(emp => emp.id === id ? updatedEmployee : emp));
      return updatedEmployee;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to update employee';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteEmployee = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await employeeService.delete(id);
      setEmployees(prev => prev.filter(emp => emp.id !== id));
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete employee';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return {
    employees,
    loading,
    error,
    refetch: fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
  };
};
