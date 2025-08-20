import { useState, useEffect, useCallback } from 'react';
import { Role, CreateRoleDto, UpdateRoleDto } from '../types';
import { roleService } from '../services';

export const useRoles = (includeInactive = false) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await roleService.getAll(includeInactive);
      setRoles(data);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const createRole = async (data: CreateRoleDto): Promise<Role> => {
    try {
      setError(null);
      const newRole = await roleService.create(data);
      setRoles(prev => [...prev, newRole].sort((a, b) => a.name.localeCompare(b.name)));
      return newRole;
    } catch (err) {
      console.error('Error creating role:', err);
      setError(err instanceof Error ? err.message : 'Failed to create role');
      throw err;
    }
  };

  const updateRole = async (id: string, data: UpdateRoleDto): Promise<Role> => {
    try {
      setError(null);
      const updatedRole = await roleService.update(id, data);
      setRoles(prev => 
        prev.map(role => role.id === id ? updatedRole : role)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      return updatedRole;
    } catch (err) {
      console.error('Error updating role:', err);
      setError(err instanceof Error ? err.message : 'Failed to update role');
      throw err;
    }
  };

  const setRoleActive = async (id: string, isActive: boolean): Promise<Role> => {
    try {
      setError(null);
      const updatedRole = await roleService.setActive(id, isActive);
      setRoles(prev => 
        prev.map(role => role.id === id ? updatedRole : role)
      );
      return updatedRole;
    } catch (err) {
      console.error('Error updating role status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update role status');
      throw err;
    }
  };

  const deleteRole = async (id: string): Promise<void> => {
    try {
      setError(null);
      await roleService.delete(id);
      setRoles(prev => prev.filter(role => role.id !== id));
    } catch (err) {
      console.error('Error deleting role:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete role');
      throw err;
    }
  };

  const getEmployeeCount = async (id: string): Promise<number> => {
    try {
      return await roleService.getEmployeeCount(id);
    } catch (err) {
      console.error('Error getting employee count:', err);
      return 0;
    }
  };

  const getSessionStats = async (id: string): Promise<{ assignedSessions: number; allocatedSessions: number }> => {
    try {
      return await roleService.getSessionStats(id);
    } catch (err) {
      console.error('Error getting session stats:', err);
      return { assignedSessions: 0, allocatedSessions: 0 };
    }
  };

  // Helper to get role by ID
  const getRoleById = (id: string): Role | undefined => {
    return roles.find(role => role.id === id);
  };

  // Helper to get role by string key
  const getRoleByStringKey = (roleStringKey: string): Role | undefined => {
    return roles.find(role => role.roleStringKey === roleStringKey);
  };

  // Helper to get active roles only
  const getActiveRoles = (): Role[] => {
    return roles.filter(role => role.isActive);
  };

  return {
    roles,
    loading,
    error,
    fetchRoles,
    createRole,
    updateRole,
    setRoleActive,
    deleteRole,
    getEmployeeCount,
    getSessionStats,
    getRoleById,
    getRoleByStringKey,
    getActiveRoles,
  };
};
