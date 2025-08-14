import { Router, Request, Response } from 'express';
import { BlockedPeriodRepository } from '../repositories/interfaces';
import { CreateBlockedPeriodDto, UpdateBlockedPeriodDto } from '../types';
import { AVAILABLE_COLORS } from '../types';

export const createBlockedPeriodRouter = (blockedPeriodRepo: BlockedPeriodRepository): Router => {
  const router = Router();

  // GET /api/blocked-periods - Get all blocked periods
  router.get('/', async (req: Request, res: Response) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const blockedPeriods = await blockedPeriodRepo.findAll(includeInactive);
      res.json(blockedPeriods);
    } catch (error) {
      console.error('Error fetching blocked periods:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/blocked-periods/:id - Get a specific blocked period
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const blockedPeriod = await blockedPeriodRepo.findById(id);
      
      if (!blockedPeriod) {
        return res.status(404).json({ error: 'Blocked period not found' });
      }
      
      res.json(blockedPeriod);
    } catch (error) {
      console.error('Error fetching blocked period:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/blocked-periods - Create a new blocked period
  router.post('/', async (req: Request, res: Response) => {
    try {
      const dto: CreateBlockedPeriodDto = {
        name: req.body.name,
        color: req.body.color || AVAILABLE_COLORS[Math.floor(Math.random() * AVAILABLE_COLORS.length)],
        defaultStartTime: req.body.defaultStartTime || null,
        defaultEndTime: req.body.defaultEndTime || null,
        dayOverrides: req.body.dayOverrides || {},
        isActive: req.body.isActive !== undefined ? req.body.isActive : true
      };

      // Basic validation
      if (!dto.name || typeof dto.name !== 'string' || dto.name.trim().length === 0) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // Validate time format if provided
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (dto.defaultStartTime && !timeRegex.test(dto.defaultStartTime)) {
        return res.status(400).json({ error: 'Invalid default start time format. Use HH:mm' });
      }
      if (dto.defaultEndTime && !timeRegex.test(dto.defaultEndTime)) {
        return res.status(400).json({ error: 'Invalid default end time format. Use HH:mm' });
      }

      const blockedPeriod = await blockedPeriodRepo.create(dto);
      res.status(201).json(blockedPeriod);
    } catch (error) {
      console.error('Error creating blocked period:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /api/blocked-periods/:id - Update a blocked period
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const dto: UpdateBlockedPeriodDto = {};

      // Only include fields that were provided
      if (req.body.name !== undefined) dto.name = req.body.name;
      if (req.body.color !== undefined) dto.color = req.body.color;
      if (req.body.defaultStartTime !== undefined) dto.defaultStartTime = req.body.defaultStartTime;
      if (req.body.defaultEndTime !== undefined) dto.defaultEndTime = req.body.defaultEndTime;
      if (req.body.dayOverrides !== undefined) dto.dayOverrides = req.body.dayOverrides;
      if (req.body.isActive !== undefined) dto.isActive = req.body.isActive;

      // Validate name if provided
      if (dto.name !== undefined && (typeof dto.name !== 'string' || dto.name.trim().length === 0)) {
        return res.status(400).json({ error: 'Name must be a non-empty string' });
      }

      // Validate time format if provided
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (dto.defaultStartTime && !timeRegex.test(dto.defaultStartTime)) {
        return res.status(400).json({ error: 'Invalid default start time format. Use HH:mm' });
      }
      if (dto.defaultEndTime && !timeRegex.test(dto.defaultEndTime)) {
        return res.status(400).json({ error: 'Invalid default end time format. Use HH:mm' });
      }

      const blockedPeriod = await blockedPeriodRepo.update(id, dto);
      res.json(blockedPeriod);
    } catch (error: any) {
      console.error('Error updating blocked period:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Blocked period not found' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /api/blocked-periods/:id/active - Toggle active status
  router.patch('/:id/active', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: 'isActive must be a boolean' });
      }

      const blockedPeriod = await blockedPeriodRepo.setActive(id, isActive);
      res.json(blockedPeriod);
    } catch (error: any) {
      console.error('Error updating blocked period status:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Blocked period not found' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /api/blocked-periods/:id - Delete a blocked period
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await blockedPeriodRepo.delete(id);
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting blocked period:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Blocked period not found' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
