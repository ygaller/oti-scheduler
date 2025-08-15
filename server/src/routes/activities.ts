import { Router, Request, Response } from 'express';
import { ActivityRepository } from '../repositories/interfaces';
import { CreateActivityDto, UpdateActivityDto } from '../types';
import { AVAILABLE_COLORS } from '../types';

export const createActivityRouter = (activityRepo: ActivityRepository): Router => {
  const router = Router();

  // GET /api/activities - Get all activities
  router.get('/', async (req: Request, res: Response) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const activities = await activityRepo.findAll(includeInactive);
      res.json(activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/activities/:id - Get a specific activity
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const activity = await activityRepo.findById(id);
      
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }
      
      res.json(activity);
    } catch (error) {
      console.error('Error fetching activity:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/activities - Create a new activity
  router.post('/', async (req: Request, res: Response) => {
    try {
      const dto: CreateActivityDto = {
        name: req.body.name,
        color: req.body.color || AVAILABLE_COLORS[Math.floor(Math.random() * AVAILABLE_COLORS.length)],
        defaultStartTime: req.body.defaultStartTime || null,
        defaultEndTime: req.body.defaultEndTime || null,
        dayOverrides: req.body.dayOverrides || {},
        isBlocking: req.body.isBlocking !== undefined ? req.body.isBlocking : false,
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

      const activity = await activityRepo.create(dto);
      res.status(201).json(activity);
    } catch (error) {
      console.error('Error creating activity:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /api/activities/:id - Update an activity
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const dto: UpdateActivityDto = {};

      // Only include fields that were provided
      if (req.body.name !== undefined) dto.name = req.body.name;
      if (req.body.color !== undefined) dto.color = req.body.color;
      if (req.body.defaultStartTime !== undefined) dto.defaultStartTime = req.body.defaultStartTime;
      if (req.body.defaultEndTime !== undefined) dto.defaultEndTime = req.body.defaultEndTime;
      if (req.body.dayOverrides !== undefined) dto.dayOverrides = req.body.dayOverrides;
      if (req.body.isBlocking !== undefined) dto.isBlocking = req.body.isBlocking;
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

      const activity = await activityRepo.update(id, dto);
      res.json(activity);
    } catch (error: any) {
      console.error('Error updating activity:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Activity not found' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /api/activities/:id/active - Toggle active status
  router.patch('/:id/active', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: 'isActive must be a boolean' });
      }

      const activity = await activityRepo.setActive(id, isActive);
      res.json(activity);
    } catch (error: any) {
      console.error('Error updating activity status:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Activity not found' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /api/activities/:id - Delete an activity
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await activityRepo.delete(id);
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting activity:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Activity not found' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
