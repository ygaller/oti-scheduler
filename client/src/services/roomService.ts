import { Room } from '../types';
import { api } from './api';

export const roomService = {
  async getAll(): Promise<Room[]> {
    return api.get<Room[]>('/rooms');
  },

  async getById(id: string): Promise<Room> {
    return api.get<Room>(`/rooms/${id}`);
  },

  async create(room: Omit<Room, 'id'>): Promise<Room> {
    return api.post<Room>('/rooms', room);
  },

  async update(id: string, room: Partial<Room>): Promise<Room> {
    return api.put<Room>(`/rooms/${id}`, room);
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/rooms/${id}`);
  },
};

