import { useState, useEffect, useCallback } from 'react';
import { Room } from '../types';
import { roomService, ApiError } from '../services';

interface UseRoomsResult {
  rooms: Room[];
  loading: boolean;
  error: string | null;
  refetch: (includeInactive?: boolean) => Promise<void>;
  createRoom: (room: Omit<Room, 'id' | 'isActive'>) => Promise<Room>;
  updateRoom: (id: string, room: Partial<Room>) => Promise<Room>;
  setRoomActive: (id: string, isActive: boolean) => Promise<Room>;
  deleteRoom: (id: string) => Promise<void>; // Keep for backward compatibility
}

export const useRooms = (): UseRoomsResult => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = useCallback(async (includeInactive = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await roomService.getAll(includeInactive);
      setRooms(data);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  const createRoom = useCallback(async (room: Omit<Room, 'id' | 'isActive'>): Promise<Room> => {
    try {
      setError(null);
      const newRoom = await roomService.create(room);
      setRooms(prev => [...prev, newRoom]);
      return newRoom;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to create room';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateRoom = useCallback(async (id: string, room: Partial<Room>): Promise<Room> => {
    try {
      setError(null);
      const updatedRoom = await roomService.update(id, room);
      setRooms(prev => prev.map(r => r.id === id ? updatedRoom : r));
      return updatedRoom;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to update room';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const setRoomActive = useCallback(async (id: string, isActive: boolean): Promise<Room> => {
    try {
      setError(null);
      const updatedRoom = await roomService.setActive(id, isActive);
      setRooms(prev => prev.map(r => r.id === id ? updatedRoom : r));
      return updatedRoom;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to update room status';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteRoom = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await roomService.delete(id);
      setRooms(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete room';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  return {
    rooms,
    loading,
    error,
    refetch: fetchRooms,
    createRoom,
    updateRoom,
    setRoomActive,
    deleteRoom,
  };
};

