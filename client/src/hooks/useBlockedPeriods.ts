import { useState, useEffect, useCallback } from 'react';
import { BlockedPeriod, CreateBlockedPeriodDto, UpdateBlockedPeriodDto } from '../types';
import { blockedPeriodService } from '../services';

export function useBlockedPeriods(includeInactive = false) {
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBlockedPeriods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await blockedPeriodService.getAll(includeInactive);
      setBlockedPeriods(data);
    } catch (error) {
      console.error('Error fetching blocked periods:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch blocked periods');
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  const createBlockedPeriod = async (data: CreateBlockedPeriodDto): Promise<BlockedPeriod> => {
    try {
      const newBlockedPeriod = await blockedPeriodService.create(data);
      setBlockedPeriods(prev => [...prev, newBlockedPeriod]);
      return newBlockedPeriod;
    } catch (error) {
      console.error('Error creating blocked period:', error);
      throw error;
    }
  };

  const updateBlockedPeriod = async (id: string, data: UpdateBlockedPeriodDto): Promise<BlockedPeriod> => {
    try {
      const updatedBlockedPeriod = await blockedPeriodService.update(id, data);
      setBlockedPeriods(prev => 
        prev.map(bp => bp.id === id ? updatedBlockedPeriod : bp)
      );
      return updatedBlockedPeriod;
    } catch (error) {
      console.error('Error updating blocked period:', error);
      throw error;
    }
  };

  const setBlockedPeriodActive = async (id: string, isActive: boolean): Promise<BlockedPeriod> => {
    try {
      const updatedBlockedPeriod = await blockedPeriodService.setActive(id, isActive);
      setBlockedPeriods(prev => 
        prev.map(bp => bp.id === id ? updatedBlockedPeriod : bp)
      );
      return updatedBlockedPeriod;
    } catch (error) {
      console.error('Error updating blocked period status:', error);
      throw error;
    }
  };

  const deleteBlockedPeriod = async (id: string): Promise<void> => {
    try {
      await blockedPeriodService.delete(id);
      setBlockedPeriods(prev => prev.filter(bp => bp.id !== id));
    } catch (error) {
      console.error('Error deleting blocked period:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchBlockedPeriods();
  }, [fetchBlockedPeriods]);

  return {
    blockedPeriods,
    loading,
    error,
    refetch: fetchBlockedPeriods,
    createBlockedPeriod,
    updateBlockedPeriod,
    setBlockedPeriodActive,
    deleteBlockedPeriod
  };
}
