import { Router } from 'express';
import { RoomRepository } from '../repositories';
import { CreateRoomDto, UpdateRoomDto } from '../types';
import { validateUUID } from '../utils/validation';

export const createRoomRouter = (roomRepo: RoomRepository): Router => {
  const router = Router();

  // GET /api/rooms - Get all rooms
  router.get('/', async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const rooms = await roomRepo.findAll(includeInactive);
      res.json(rooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      res.status(500).json({ error: 'Failed to fetch rooms' });
    }
  });

  // GET /api/rooms/:id - Get room by ID
  router.get('/:id', validateUUID(), async (req, res) => {
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
  router.put('/:id', validateUUID(), async (req, res) => {
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

  // PATCH /api/rooms/:id/status - Enable/disable room
  router.patch('/:id/status', validateUUID(), async (req, res) => {
    try {
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: 'isActive must be a boolean' });
      }
      
      const room = await roomRepo.setActive(req.params.id, isActive);
      res.json(room);
    } catch (error) {
      console.error('Error updating room status:', error);
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        res.status(404).json({ error: 'Room not found' });
      } else {
        res.status(500).json({ error: 'Failed to update room status' });
      }
    }
  });

  return router;
};

