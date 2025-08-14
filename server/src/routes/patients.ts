import { Router } from 'express';
import { PatientRepository } from '../repositories';
import { CreatePatientDto, UpdatePatientDto } from '../types';
import { validateUUID } from '../utils/validation';

export const createPatientRouter = (patientRepo: PatientRepository): Router => {
  const router = Router();

  // GET /api/patients - Get all patients
  router.get('/', async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const patients = await patientRepo.findAll(includeInactive);
      res.json(patients);
    } catch (error) {
      console.error('Error fetching patients:', error);
      res.status(500).json({ error: 'Failed to fetch patients' });
    }
  });

  // GET /api/patients/:id - Get patient by ID
  router.get('/:id', validateUUID(), async (req, res) => {
    try {
      const patient = await patientRepo.findById(req.params.id);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }
      res.json(patient);
    } catch (error) {
      console.error('Error fetching patient:', error);
      res.status(500).json({ error: 'Failed to fetch patient' });
    }
  });

  // POST /api/patients - Create new patient
  router.post('/', async (req, res) => {
    try {
      const patientData: CreatePatientDto = req.body;
      
      // Basic validation
      if (!patientData.firstName || !patientData.lastName) {
        return res.status(400).json({ error: 'Missing required fields: firstName, lastName' });
      }

      const patient = await patientRepo.create(patientData);
      res.status(201).json(patient);
    } catch (error) {
      console.error('Error creating patient:', error);
      res.status(500).json({ error: 'Failed to create patient' });
    }
  });

  // PUT /api/patients/:id - Update patient
  router.put('/:id', validateUUID(), async (req, res) => {
    try {
      const patientData: UpdatePatientDto = req.body;
      const patient = await patientRepo.update(req.params.id, patientData);
      res.json(patient);
    } catch (error) {
      console.error('Error updating patient:', error);
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        res.status(404).json({ error: 'Patient not found' });
      } else {
        res.status(500).json({ error: 'Failed to update patient' });
      }
    }
  });

  // PATCH /api/patients/:id/status - Enable/disable patient
  router.patch('/:id/status', validateUUID(), async (req, res) => {
    try {
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: 'isActive must be a boolean' });
      }
      
      const patient = await patientRepo.setActive(req.params.id, isActive);
      res.json(patient);
    } catch (error) {
      console.error('Error updating patient status:', error);
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        res.status(404).json({ error: 'Patient not found' });
      } else {
        res.status(500).json({ error: 'Failed to update patient status' });
      }
    }
  });

  return router;
};
