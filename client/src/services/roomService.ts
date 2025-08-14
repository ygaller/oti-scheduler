import { Room } from '../types';
import { api } from './api';

export const roomService = {
  async getAll(includeInactive = false): Promise<Room[]> {
    const params = includeInactive ? '?includeInactive=true' : '';
    return api.get<Room[]>(`/rooms${params}`);
  },

  async getById(id: string): Promise<Room> {
    return api.get<Room>(`/rooms/${id}`);
  },

  async create(room: Omit<Room, 'id' | 'isActive'>): Promise<Room> {
    return api.post<Room>('/rooms', { ...room, isActive: true });
  },

  async update(id: string, room: Partial<Room>): Promise<Room> {
    return api.put<Room>(`/rooms/${id}`, room);
  },

  async setActive(id: string, isActive: boolean): Promise<Room> {
    return api.patch<Room>(`/rooms/${id}/status`, { isActive });
  },

  // Keep delete method for backward compatibility, but it won't be used in UI
  async delete(id: string): Promise<void> {
    return api.delete(`/rooms/${id}`);
  },
};

