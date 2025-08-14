import { Router } from 'express';
import { RoomRepository } from '../repositories';
import { CreateRoomDto, UpdateRoomDto } from '../types';

export const createRoomRouter = (roomRepo: RoomRepository): Router => {
  const router = Router();

  // GET /api/rooms - Get all rooms
  router.get('/', async (req, res) => {
    try {
      const rooms = await roomRepo.findAll();
      res.json(rooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      res.status(500).json({ error: 'Failed to fetch rooms' });
    }
  });

  // GET /api/rooms/:id - Get room by ID
  router.get('/:id', async (req, res) => {
    try {
      const room = await roomRepo.findById(req.params.id);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      res.json(room);
    } catch (error) {
      console.error('Error fetching room:', error);
      res.status(500).json({ error: 'Failed to fetch room' });
    }
  });

  // POST /api/rooms - Create new room
  router.post('/', async (req, res) => {
    try {
      const roomData: CreateRoomDto = req.body;
      
      // Basic validation
      if (!roomData.name) {
        return res.status(400).json({ error: 'Missing required field: name' });
      }

      const room = await roomRepo.create(roomData);
      res.status(201).json(room);
    } catch (error) {
      console.error('Error creating room:', error);
      res.status(500).json({ error: 'Failed to create room' });
    }
  });

  // PUT /api/rooms/:id - Update room
  router.put('/:id', async (req, res) => {
    try {
      const roomData: UpdateRoomDto = req.body;
      const room = await roomRepo.update(req.params.id, roomData);
      res.json(room);
    } catch (error) {
      console.error('Error updating room:', error);
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        res.status(404).json({ error: 'Room not found' });
      } else {
        res.status(500).json({ error: 'Failed to update room' });
      }
    }
  });

  // DELETE /api/rooms/:id - Delete room
  router.delete('/:id', async (req, res) => {
    try {
      await roomRepo.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting room:', error);
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        res.status(404).json({ error: 'Room not found' });
      } else {
        res.status(500).json({ error: 'Failed to delete room' });
      }
    }
  });

  return router;
};

