import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { EmployeeRepository, RoomRepository, ScheduleRepository, SessionRepository, ActivityRepository } from '../repositories';
import { generateScheduleWithActivities, validateScheduleConstraints, validatePatientTimeConflict, validatePatientConsecutiveSessions } from '../utils/scheduler';
import { CreateSessionDto, UpdateSessionDto } from '../types';
import { validateUUID } from '../utils/validation';

export const createScheduleRouter = (
  employeeRepo: EmployeeRepository,
  roomRepo: RoomRepository,
  scheduleRepo: ScheduleRepository,
  sessionRepo: SessionRepository,
  activityRepo: ActivityRepository,
  prisma: PrismaClient
): Router => {
  const router = Router();



  // POST /api/schedule/generate - Generate new schedule
  router.post('/generate', async (req, res) => {
    try {
      const employees = await employeeRepo.findAll();
      const rooms = await roomRepo.findAll();
      const activities = await activityRepo.findAll(true); // Include all active activities

      if (employees.length === 0) {
        return res.status(400).json({ error: 'No employees found' });
      }
      if (rooms.length === 0) {
        return res.status(400).json({ error: 'No rooms found' });
      }

      // Generate schedule using activity-based algorithm
      const sessions = generateScheduleWithActivities(employees, rooms, activities);
      
      // Save the schedule to database
      const schedule = await scheduleRepo.create(sessions);
      
      res.status(201).json(schedule);
    } catch (error) {
      console.error('Error generating schedule:', error);
      
      // Check if this is a scheduling validation error
      if (error instanceof Error && error.message.includes('Cannot generate schedule - insufficient available time slots')) {
        res.status(400).json({ 
          error: 'Schedule generation failed', 
          details: error.message 
        });
      } else {
        res.status(500).json({ error: 'Failed to generate schedule' });
      }
    }
  });

  // POST /api/schedule/generate-empty - Generate new empty schedule
  router.post('/generate-empty', async (req, res) => {
    try {
      // Create an empty schedule by passing an empty array of sessions
      const schedule = await scheduleRepo.create([]);
      
      res.status(201).json(schedule);
    } catch (error) {
      console.error('Error generating empty schedule:', error);
      res.status(500).json({ error: 'Failed to generate empty schedule' });
    }
  });

  // GET /api/schedule/active - Get active schedule
  router.get('/active', async (req, res) => {
    try {
      const schedule = await scheduleRepo.findActive();
      res.json(schedule);
    } catch (error) {
      console.error('Error fetching active schedule:', error);
      res.status(500).json({ error: 'Failed to fetch active schedule' });
    }
  });

  // GET /api/schedule/all - Get all schedules
  router.get('/all', async (req, res) => {
    try {
      const schedules = await scheduleRepo.findAll();
      res.json(schedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      res.status(500).json({ error: 'Failed to fetch schedules' });
    }
  });

  // PUT /api/schedule/:id/activate - Set schedule as active
  router.put('/:id/activate', validateUUID(), async (req, res) => {
    try {
      const schedule = await scheduleRepo.setActive(req.params.id);
      res.json(schedule);
    } catch (error) {
      console.error('Error activating schedule:', error);
      if (error instanceof Error && (
        error.message.includes('Record to update not found') || 
        error.message.includes('Schedule not found')
      )) {
        res.status(404).json({ error: 'Schedule not found' });
      } else {
        res.status(500).json({ error: 'Failed to activate schedule' });
      }
    }
  });

  // DELETE /api/schedule/:id - Delete schedule
  router.delete('/:id', validateUUID(), async (req, res) => {
    try {
      await scheduleRepo.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      if (error instanceof Error && (
        error.message.includes('Record to delete does not exist') || 
        error.message.includes('Schedule not found')
      )) {
        res.status(404).json({ error: 'Schedule not found' });
      } else {
        res.status(500).json({ error: 'Failed to delete schedule' });
      }
    }
  });

  // GET /api/schedule/sessions - Get all sessions (for manual editing)
  router.get('/sessions', async (req, res) => {
    try {
      const sessions = await sessionRepo.findAll();
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  // POST /api/schedule/sessions - Create new session
  router.post('/sessions', async (req, res) => {
    try {
      const sessionData: CreateSessionDto = req.body;
      
      // Validate that there is an active schedule before creating sessions
      const activeSchedule = await scheduleRepo.findActive();
      if (!activeSchedule) {
        return res.status(400).json({ 
          error: 'Cannot create session: No active schedule found. Please generate a schedule first.' 
        });
      }
      
      // Associate the new session with the active schedule
      sessionData.scheduleId = activeSchedule.id!; // activeSchedule.id is guaranteed to exist here
      
      // Validate the session constraints
      const employees = await employeeRepo.findAll();
      const rooms = await roomRepo.findAll();
      const allSessions = await sessionRepo.findAll();
      const activities = await activityRepo.findAll(true); // Include all active activities

      const validation = validateScheduleConstraints(
        sessionData as any, // Type conversion needed for the validation
        allSessions,
        employees,
        rooms,
        activities
      );

      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      const session = await sessionRepo.create(sessionData);
      res.status(201).json(session);
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  // PUT /api/schedule/sessions/:id - Update session
  router.put('/sessions/:id', validateUUID(), async (req, res) => {
    try {
      const sessionData: UpdateSessionDto = req.body;
      
      // Note: scheduleId is immutable and not part of UpdateSessionDto
      
      // If we're updating time/day/employee/room, validate constraints
      if (sessionData.startTime || sessionData.endTime || sessionData.day || 
          sessionData.employeeId || sessionData.roomId) {
        
        const employees = await employeeRepo.findAll();
        const rooms = await roomRepo.findAll();
        const allSessions = await sessionRepo.findAll();
        const activities = await activityRepo.findAll(true); // Include all active activities

        // Get the current session to merge with updates
        const currentSession = await sessionRepo.findById(req.params.id);
        if (!currentSession) {
          return res.status(404).json({ error: 'Session not found' });
        }

        const updatedSession = { ...currentSession, ...sessionData };
        
        const validation = validateScheduleConstraints(
          updatedSession as any,
          allSessions.filter(s => s.id !== req.params.id), // Exclude current session
          employees,
          rooms,
          activities
        );

        if (!validation.valid) {
          return res.status(400).json({ error: validation.error });
        }
      }

      const session = await sessionRepo.update(req.params.id, sessionData);
      res.json(session);
    } catch (error) {
      console.error('Error updating session:', error);
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        res.status(404).json({ error: 'Session not found' });
      } else {
        res.status(500).json({ error: 'Failed to update session' });
      }
    }
  });

  // DELETE /api/schedule/sessions/:id - Delete session
  router.delete('/sessions/:id', validateUUID(), async (req, res) => {
    try {
      await sessionRepo.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting session:', error);
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        res.status(404).json({ error: 'Session not found' });
      } else {
        res.status(500).json({ error: 'Failed to delete session' });
      }
    }
  });

  // POST /api/schedule/sessions/:id/patients - Assign patient to session
  router.post('/sessions/:id/patients', validateUUID(), async (req, res) => {
    try {
      const sessionId = req.params.id;
      const { patientId, forceAssign = false } = req.body;

      if (!patientId) {
        return res.status(400).json({ error: 'Patient ID is required' });
      }

      // Check if session exists
      const session = await sessionRepo.findById(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Validate that patient is not in another session at the same time
      // Skip validation for fixture tests (when prisma is null)
      if (prisma) {
        try {
          const timeConflictValidation = await validatePatientTimeConflict(
            patientId,
            sessionId,
            session.day,
            session.startTime,
            session.endTime,
            prisma
          );

          if (!timeConflictValidation.valid) {
            return res.status(400).json({ error: timeConflictValidation.error });
          }
        } catch (validationError) {
          console.error('Error during patient time conflict validation:', validationError);
          return res.status(500).json({ 
            error: 'Failed to validate patient assignment',
            details: validationError instanceof Error ? validationError.message : 'Unknown validation error'
          });
        }
      }

      // Check for consecutive sessions (only if not forcing assignment)
      // Skip validation for fixture tests (when prisma is null)
      if (!forceAssign && prisma) {
        try {
          const consecutiveValidation = await validatePatientConsecutiveSessions(
            patientId,
            sessionId,
            session.day,
            session.startTime,
            session.endTime,
            prisma
          );

          if (!consecutiveValidation.valid) {
            return res.status(409).json({ 
              warning: consecutiveValidation.warning,
              consecutiveCount: consecutiveValidation.consecutiveCount,
              requiresConfirmation: true
            });
          }
        } catch (validationError) {
          console.error('Error during consecutive sessions validation:', validationError);
          return res.status(500).json({ 
            error: 'Failed to validate consecutive sessions',
            details: validationError instanceof Error ? validationError.message : 'Unknown validation error'
          });
        }
      }

      // Add patient to session using repository
      const updatedSession = await sessionRepo.addPatient(sessionId, patientId);
      res.json(updatedSession);
    } catch (error) {
      console.error('Error assigning patient to session:', error);
      
      // Handle unique constraint violation (patient already assigned)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        res.status(400).json({ error: 'Patient is already assigned to this session' });
      } else {
        res.status(500).json({ error: 'Failed to assign patient to session' });
      }
    }
  });

  // DELETE /api/schedule/sessions/:id/patients/:patientId - Remove patient from session
  router.delete('/sessions/:id/patients/:patientId', validateUUID(), async (req, res) => {
    try {
      const sessionId = req.params.id;
      const patientId = req.params.patientId;

      // Remove patient from session using Prisma directly
      await prisma.sessionPatient.delete({
        where: {
          sessionId_patientId: {
            sessionId,
            patientId
          }
        }
      });

      // Return the updated session with patients
      const updatedSession = await sessionRepo.findById(sessionId);
      res.json(updatedSession);
    } catch (error) {
      console.error('Error removing patient from session:', error);
      
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        res.status(404).json({ error: 'Patient assignment not found' });
      } else {
        res.status(500).json({ error: 'Failed to remove patient from session' });
      }
    }
  });

  // PUT /api/schedule/sessions/:id/patients - Update all patients for a session
  router.put('/sessions/:id/patients', validateUUID(), async (req, res) => {
    try {
      const sessionId = req.params.id;
      const { patientIds, forceAssign = false } = req.body;

      if (!Array.isArray(patientIds)) {
        return res.status(400).json({ error: 'Patient IDs must be an array' });
      }

      // Check if session exists
      const session = await sessionRepo.findById(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Store any warnings for consecutive sessions
      const consecutiveWarnings: Array<{ patientId: string; warning: string; consecutiveCount: number }> = [];

      // Validate that each patient is not in another session at the same time
      for (const patientId of patientIds) {
        if (patientId) { // Skip empty patient IDs
          try {
            const timeConflictValidation = await validatePatientTimeConflict(
              patientId,
              sessionId,
              session.day,
              session.startTime,
              session.endTime,
              prisma
            );

            if (!timeConflictValidation.valid) {
              return res.status(400).json({ error: timeConflictValidation.error });
            }

            // Check for consecutive sessions (only if not forcing assignment)
            if (!forceAssign) {
              const consecutiveValidation = await validatePatientConsecutiveSessions(
                patientId,
                sessionId,
                session.day,
                session.startTime,
                session.endTime,
                prisma
              );

              if (!consecutiveValidation.valid) {
                consecutiveWarnings.push({
                  patientId,
                  warning: consecutiveValidation.warning || '',
                  consecutiveCount: consecutiveValidation.consecutiveCount || 0
                });
              }
            }
          } catch (validationError) {
            console.error('Error during bulk patient validation:', validationError);
            return res.status(500).json({ 
              error: 'Failed to validate patient assignments',
              details: validationError instanceof Error ? validationError.message : 'Unknown validation error'
            });
          }
        }
      }

      // If there are consecutive session warnings and not forcing, return them
      if (consecutiveWarnings.length > 0 && !forceAssign) {
        return res.status(409).json({ 
          warnings: consecutiveWarnings,
          requiresConfirmation: true
        });
      }

      // Use transaction to update all patients at once
      await prisma.$transaction(async (tx) => {
        // Remove all existing assignments
        await tx.sessionPatient.deleteMany({
          where: { sessionId }
        });

        // Add new assignments (filter out empty patient IDs)
        const validPatientIds = patientIds.filter((id: string) => id);
        if (validPatientIds.length > 0) {
          await tx.sessionPatient.createMany({
            data: validPatientIds.map((patientId: string) => ({
              sessionId,
              patientId
            }))
          });
        }
      });

      // Return the updated session with patients
      const updatedSession = await sessionRepo.findById(sessionId);
      res.json(updatedSession);
    } catch (error) {
      console.error('Error updating session patients:', error);
      res.status(500).json({ error: 'Failed to update session patients' });
    }
  });

  // POST /api/schedule/fix-orphaned-sessions - Fix orphaned sessions by assigning them to active schedule
  router.post('/fix-orphaned-sessions', async (req, res) => {
    try {
      const activeSchedule = await scheduleRepo.findActive();
      if (!activeSchedule) {
        return res.status(400).json({ 
          error: 'No active schedule found. Please generate a schedule first.' 
        });
      }

      // Find all sessions without a scheduleId (orphaned sessions)
      const allSessions = await sessionRepo.findAll();
      const orphanedSessions = allSessions.filter(session => !session.scheduleId);
      
      if (orphanedSessions.length === 0) {
        return res.json({ 
          message: 'No orphaned sessions found',
          fixedCount: 0
        });
      }

      // Update orphaned sessions to belong to the active schedule
      // Since scheduleId is immutable via UpdateSessionDto, we need to use direct database update
      const updatePromises = orphanedSessions.map(session => 
        prisma.session.update({
          where: { id: session.id },
          data: { scheduleId: activeSchedule.id }
        })
      );
      
      await Promise.all(updatePromises);

      res.json({ 
        message: `Successfully assigned ${orphanedSessions.length} orphaned sessions to active schedule`,
        fixedCount: orphanedSessions.length,
        fixedSessionIds: orphanedSessions.map(s => s.id)
      });
    } catch (error) {
      console.error('Error fixing orphaned sessions:', error);
      res.status(500).json({ error: 'Failed to fix orphaned sessions' });
    }
  });

  return router;
};
