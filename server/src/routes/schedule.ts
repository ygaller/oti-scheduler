import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { EmployeeRepository, RoomRepository, ScheduleRepository, SessionRepository, ActivityRepository } from '../repositories';
import { validateScheduleConstraintsAsync, validatePatientTimeConflict, validatePatientConsecutiveSessions } from '../utils/scheduler';
import { CreateSessionDto, UpdateSessionDto } from '../types';
import { validateUUID } from '../utils/validation';

// Helper function to check if a session overlaps with blocking activities
async function checkSessionOverlapsBlocking(
  session: any,
  activityRepo: ActivityRepository
): Promise<boolean> {
  const activities = await activityRepo.findAll(); // Get all activities
  
  for (const activity of activities) {
    if (!activity.isBlocking) continue;
    
    // Helper function to get activity time for day (copied from scheduler.ts)
    const getActivityTimeForDay = (activity: any, day: string) => {
      const dayOverride = activity.dayOverrides[day];
      if (dayOverride !== undefined) {
        if (dayOverride === null) return null;
        return dayOverride;
      }
      if (activity.defaultStartTime && activity.defaultEndTime) {
        return {
          startTime: activity.defaultStartTime,
          endTime: activity.defaultEndTime
        };
      }
      return null;
    };

    // Helper function to check time overlap (copied from scheduler.ts)
    const timesOverlap = (start1: string, end1: string, start2: string, end2: string) => {
      const timeStringToMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      const start1Min = timeStringToMinutes(start1);
      const end1Min = timeStringToMinutes(end1);
      const start2Min = timeStringToMinutes(start2);
      const end2Min = timeStringToMinutes(end2);
      return start1Min < end2Min && start2Min < end1Min;
    };
    
    const activityTime = getActivityTimeForDay(activity, session.day);
    if (activityTime && timesOverlap(activityTime.startTime, activityTime.endTime, session.startTime, session.endTime)) {
      return true;
    }
  }
  
  return false;
}

export const createScheduleRouter = (
  employeeRepo: EmployeeRepository,
  roomRepo: RoomRepository,
  scheduleRepo: ScheduleRepository,
  sessionRepo: SessionRepository,
  activityRepo: ActivityRepository,
  prisma: PrismaClient
): Router => {
  const router = Router();

  // Schedule Management Routes
  
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

  // POST /api/schedule - Create new schedule
  router.post('/', async (req, res) => {
    try {
      const { name } = req.body;
      
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Schedule name is required' });
      }

      // Create an empty schedule with the given name
      const schedule = await scheduleRepo.createWithName(name.trim());
      
      res.status(201).json(schedule);
    } catch (error) {
      console.error('Error creating schedule:', error);
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        res.status(409).json({ error: 'A schedule with this name already exists' });
      } else {
        res.status(500).json({ error: 'Failed to create schedule' });
      }
    }
  });



  // POST /api/schedule/generate-empty - Generate an empty schedule (becomes active)
  router.post('/generate-empty', async (req, res) => {
    try {
      // Create an empty schedule with a unique name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const scheduleName = `Schedule ${timestamp}`;
      const schedule = await scheduleRepo.createWithName(scheduleName);
      
      // Return the created schedule (it becomes active as the most recent one)
      res.status(201).json(schedule);
    } catch (error) {
      console.error('Error generating empty schedule:', error);
      res.status(500).json({ error: 'Failed to generate empty schedule' });
    }
  });





  // POST /api/schedule/sessions/:sessionId/patients - Assign patient to session
  router.post('/sessions/:sessionId/patients', validateUUID('sessionId'), async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { patientId } = req.body;

      if (!patientId) {
        return res.status(400).json({ error: 'Patient ID is required' });
      }

      const session = await sessionRepo.assignPatient(sessionId, patientId);
      res.json(session);
    } catch (error) {
      console.error('Error assigning patient to session:', error);
      if (error instanceof Error && error.message.includes('המטופל כבר משויך לטיפול אחר באותו זמן')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to assign patient to session' });
      }
    }
  });

  // PUT /api/schedule/sessions/:sessionId/patients - Update session patients
  router.put('/sessions/:sessionId/patients', validateUUID('sessionId'), async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { patientIds } = req.body;

      if (!Array.isArray(patientIds)) {
        return res.status(400).json({ error: 'Patient IDs array is required' });
      }

      const session = await sessionRepo.updatePatients(sessionId, patientIds);
      res.json(session);
    } catch (error) {
      console.error('Error updating session patients:', error);
      res.status(500).json({ error: 'Failed to update session patients' });
    }
  });

  // PUT /api/schedule/:scheduleId/name - Update schedule name
  router.put('/:scheduleId/name', validateUUID('scheduleId'), async (req, res) => {
    try {
      const { scheduleId } = req.params;
      const { name } = req.body;
      
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Schedule name is required' });
      }

      const schedule = await scheduleRepo.updateName(scheduleId, name.trim());
      res.json(schedule);
    } catch (error) {
      console.error('Error updating schedule name:', error);
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        res.status(404).json({ error: 'Schedule not found' });
      } else if (error instanceof Error && error.message.includes('Unique constraint')) {
        res.status(409).json({ error: 'A schedule with this name already exists' });
      } else {
        res.status(500).json({ error: 'Failed to update schedule name' });
      }
    }
  });

  // DELETE /api/schedule/:scheduleId - Delete schedule
  router.delete('/:scheduleId', validateUUID('scheduleId'), async (req, res) => {
    try {
      const { scheduleId } = req.params;
      await scheduleRepo.delete(scheduleId);
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

  // Schedule-specific Session Management Routes

  // GET /api/schedule/:scheduleId/sessions - Get all sessions for a schedule
  router.get('/:scheduleId/sessions', validateUUID('scheduleId'), async (req, res) => {
    try {
      const { scheduleId } = req.params;
      
      // First verify the schedule exists
      const schedule = await scheduleRepo.findById(scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      const sessions = await sessionRepo.findByScheduleId(scheduleId);
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  // POST /api/schedule/:scheduleId/sessions - Create session in schedule
  router.post('/:scheduleId/sessions', validateUUID('scheduleId'), async (req, res) => {
    try {
      const { scheduleId } = req.params;
      const sessionData: CreateSessionDto & { forceCreate?: boolean } = req.body;
      const { forceCreate = false, ...sessionCreateData } = sessionData;

      // First verify the schedule exists
      const schedule = await scheduleRepo.findById(scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      // Add scheduleId to session data
      const sessionWithSchedule = { ...sessionCreateData, scheduleId };

      // If not forcing creation, run validations
      if (!forceCreate) {
        // Check for blocking activities
        const overlapsBlocking = await checkSessionOverlapsBlocking(sessionWithSchedule, activityRepo);
        if (overlapsBlocking) {
          return res.status(409).json({ 
            error: 'Session overlaps with a blocking activity',
            code: 'BLOCKING_ACTIVITY_OVERLAP'
          });
        }

        // Validate schedule constraints
        const constraintValidation = await validateScheduleConstraintsAsync(
          sessionWithSchedule,
          employeeRepo,
          sessionRepo,
          scheduleId
        );
        
        if (!constraintValidation.isValid) {
          return res.status(409).json({ 
            error: constraintValidation.error,
            code: 'SCHEDULE_CONSTRAINT_VIOLATION'
          });
        }
      }

      const session = await sessionRepo.create(sessionWithSchedule);
      res.status(201).json(session);
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  // PUT /api/schedule/:scheduleId/sessions/:sessionId - Update session
  router.put('/:scheduleId/sessions/:sessionId', validateUUID('scheduleId'), validateUUID('sessionId'), async (req, res) => {
    try {
      const { scheduleId, sessionId } = req.params;
      const updateData: UpdateSessionDto = req.body;

      // First verify the schedule exists
      const schedule = await scheduleRepo.findById(scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      // Verify the session exists and belongs to this schedule
      const existingSession = await sessionRepo.findById(sessionId);
      if (!existingSession) {
        return res.status(404).json({ error: 'Session not found' });
      }
      if (existingSession.scheduleId !== scheduleId) {
        return res.status(404).json({ error: 'Session not found in this schedule' });
      }

      const session = await sessionRepo.update(sessionId, updateData);
      res.json(session);
    } catch (error) {
      console.error('Error updating session:', error);
      res.status(500).json({ error: 'Failed to update session' });
    }
  });

  // DELETE /api/schedule/:scheduleId/sessions/:sessionId - Delete session
  router.delete('/:scheduleId/sessions/:sessionId', validateUUID('scheduleId'), validateUUID('sessionId'), async (req, res) => {
    try {
      const { scheduleId, sessionId } = req.params;

      // First verify the schedule exists
      const schedule = await scheduleRepo.findById(scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      // Verify the session exists and belongs to this schedule
      const existingSession = await sessionRepo.findById(sessionId);
      if (!existingSession) {
        return res.status(404).json({ error: 'Session not found' });
      }
      if (existingSession.scheduleId !== scheduleId) {
        return res.status(404).json({ error: 'Session not found in this schedule' });
      }

      await sessionRepo.delete(sessionId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({ error: 'Failed to delete session' });
    }
  });

  // Session-Patient Assignment Routes

  // POST /api/schedule/:scheduleId/sessions/:sessionId/patients - Assign patient to session
  router.post('/:scheduleId/sessions/:sessionId/patients', 
    validateUUID('scheduleId'), 
    validateUUID('sessionId'), 
    async (req, res) => {
      try {
        const { scheduleId, sessionId } = req.params;
        const { patientId, forceAssign = false } = req.body;

        if (!patientId) {
          return res.status(400).json({ error: 'Patient ID is required' });
        }

        // First verify the schedule exists
        const schedule = await scheduleRepo.findById(scheduleId);
        if (!schedule) {
          return res.status(404).json({ error: 'Schedule not found' });
        }

        // Verify the session exists and belongs to this schedule
        const existingSession = await sessionRepo.findById(sessionId);
        if (!existingSession) {
          return res.status(404).json({ error: 'Session not found' });
        }
        if (existingSession.scheduleId !== scheduleId) {
          return res.status(404).json({ error: 'Session not found in this schedule' });
        }

        // If not forcing assignment, run validations
        if (!forceAssign) {
          // Validate patient time conflicts
          const timeConflictValidation = await validatePatientTimeConflict(
            patientId,
            existingSession,
            sessionRepo,
            scheduleId
          );
          
          if (!timeConflictValidation.isValid) {
            return res.status(409).json({ 
              error: timeConflictValidation.error,
              code: 'PATIENT_TIME_CONFLICT'
            });
          }

          // Validate consecutive sessions constraint
          const consecutiveValidation = await validatePatientConsecutiveSessions(
            patientId,
            existingSession,
            sessionRepo,
            scheduleId
          );
          
          if (!consecutiveValidation.isValid) {
            return res.status(409).json({ 
              error: consecutiveValidation.error,
              code: 'CONSECUTIVE_SESSIONS_VIOLATION'
            });
          }
        }

        const session = await sessionRepo.assignPatient(sessionId, patientId);
        res.json(session);
      } catch (error) {
        console.error('Error assigning patient to session:', error);
        res.status(500).json({ error: 'Failed to assign patient to session' });
      }
    }
  );

  // DELETE /api/schedule/:scheduleId/sessions/:sessionId/patients/:patientId - Remove patient from session
  router.delete('/:scheduleId/sessions/:sessionId/patients/:patientId', 
    validateUUID('scheduleId'), 
    validateUUID('sessionId'), 
    validateUUID('patientId'), 
    async (req, res) => {
      try {
        const { scheduleId, sessionId, patientId } = req.params;

        // First verify the schedule exists
        const schedule = await scheduleRepo.findById(scheduleId);
        if (!schedule) {
          return res.status(404).json({ error: 'Schedule not found' });
        }

        // Verify the session exists and belongs to this schedule
        const existingSession = await sessionRepo.findById(sessionId);
        if (!existingSession) {
          return res.status(404).json({ error: 'Session not found' });
        }
        if (existingSession.scheduleId !== scheduleId) {
          return res.status(404).json({ error: 'Session not found in this schedule' });
        }

        const session = await sessionRepo.removePatient(sessionId, patientId);
        res.json(session);
      } catch (error) {
        console.error('Error removing patient from session:', error);
        res.status(500).json({ error: 'Failed to remove patient from session' });
      }
    }
  );

  // PUT /api/schedule/:scheduleId/sessions/:sessionId/patients - Update session patients
  router.put('/:scheduleId/sessions/:sessionId/patients', 
    validateUUID('scheduleId'), 
    validateUUID('sessionId'), 
    async (req, res) => {
      try {
        const { scheduleId, sessionId } = req.params;
        const { patientIds, forceAssign = false } = req.body;

        if (!Array.isArray(patientIds)) {
          return res.status(400).json({ error: 'Patient IDs must be an array' });
        }

        // First verify the schedule exists
        const schedule = await scheduleRepo.findById(scheduleId);
        if (!schedule) {
          return res.status(404).json({ error: 'Schedule not found' });
        }

        // Verify the session exists and belongs to this schedule
        const existingSession = await sessionRepo.findById(sessionId);
        if (!existingSession) {
          return res.status(404).json({ error: 'Session not found' });
        }
        if (existingSession.scheduleId !== scheduleId) {
          return res.status(404).json({ error: 'Session not found in this schedule' });
        }

        // If not forcing assignment, run validations for each patient
        if (!forceAssign) {
          for (const patientId of patientIds) {
            // Skip if patient is already assigned to this session
            const isAlreadyAssigned = existingSession.patients?.some(p => p.id === patientId);
            if (isAlreadyAssigned) continue;

            // Validate patient time conflicts
            const timeConflictValidation = await validatePatientTimeConflict(
              patientId,
              existingSession,
              sessionRepo,
              scheduleId
            );
            
            if (!timeConflictValidation.isValid) {
              return res.status(409).json({ 
                error: timeConflictValidation.error,
                code: 'PATIENT_TIME_CONFLICT'
              });
            }

            // Validate consecutive sessions constraint
            const consecutiveValidation = await validatePatientConsecutiveSessions(
              patientId,
              existingSession,
              sessionRepo,
              scheduleId
            );
            
            if (!consecutiveValidation.isValid) {
              return res.status(409).json({ 
                error: consecutiveValidation.error,
                code: 'CONSECUTIVE_SESSIONS_VIOLATION'
              });
            }
          }
        }

        const session = await sessionRepo.updatePatients(sessionId, patientIds);
        res.json(session);
      } catch (error) {
        console.error('Error updating session patients:', error);
        res.status(500).json({ error: 'Failed to update session patients' });
      }
    }
  );

  return router;
};