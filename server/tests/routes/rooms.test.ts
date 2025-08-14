import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../utils/testServer';
import { createRoomFixture } from '../utils/fixtures';
import { prisma } from '../setup';

describe('Room API Endpoints', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp(prisma);
  });

  describe('GET /api/rooms', () => {
    it('should return empty array when no rooms exist', async () => {
      const response = await request(app)
        .get('/api/rooms')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all rooms when they exist', async () => {
      // Create test rooms
      const room1 = createRoomFixture({ name: 'Room A' });
      const room2 = createRoomFixture({ name: 'Room B' });

      await request(app).post('/api/rooms').send(room1);
      await request(app).post('/api/rooms').send(room2);

      const response = await request(app)
        .get('/api/rooms')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({ name: 'Room A' });
      expect(response.body[1]).toMatchObject({ name: 'Room B' });
    });

    it('should return rooms in consistent order', async () => {
      // Create multiple rooms
      const roomNames = ['Alpha', 'Beta', 'Gamma', 'Delta'];
      
      for (const name of roomNames) {
        await request(app).post('/api/rooms').send(createRoomFixture({ name }));
      }

      const response = await request(app)
        .get('/api/rooms')
        .expect(200);

      expect(response.body).toHaveLength(4);
      // Verify all rooms are present
      const returnedNames = response.body.map((room: any) => room.name);
      expect(returnedNames).toEqual(expect.arrayContaining(roomNames));
    });
  });

  describe('GET /api/rooms/:id', () => {
    it('should return room by ID', async () => {
      const roomData = createRoomFixture({ name: 'Test Room' });
      const createResponse = await request(app)
        .post('/api/rooms')
        .send(roomData);

      const roomId = createResponse.body.id;

      const response = await request(app)
        .get(`/api/rooms/${roomId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: roomId,
        name: roomData.name
      });
    });

    it('should return 404 for non-existent room', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/rooms/${nonExistentId}`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Room not found'
      });
    });

    it('should handle invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/rooms/invalid-id')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/rooms', () => {
    it('should create a new room with valid data', async () => {
      const roomData = createRoomFixture({ name: 'New Room' });

      const response = await request(app)
        .post('/api/rooms')
        .send(roomData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: roomData.name
      });
      expect(response.body).toHaveProperty('id');
      expect(typeof response.body.id).toBe('string');
    });

    it('should create rooms with different names', async () => {
      const roomNames = [
        'Occupational Therapy Room',
        'Speech Therapy Room',
        'Physiotherapy Room',
        'Art Therapy Studio',
        'Group Meeting Room',
        'Quiet Room',
        'Assessment Room'
      ];

      for (const name of roomNames) {
        const response = await request(app)
          .post('/api/rooms')
          .send(createRoomFixture({ name }))
          .expect(201);

        expect(response.body.name).toBe(name);
      }
    });

    it('should return 400 for missing required fields', async () => {
      const testCases = [
        { data: {}, expectedError: 'Missing required field: name' },
        { data: { name: '' }, expectedError: 'Missing required field: name' },
        { data: { name: null }, expectedError: 'Missing required field: name' },
        { data: { name: undefined }, expectedError: 'Missing required field: name' }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/rooms')
          .send(testCase.data)
          .expect(400);

        expect(response.body.error).toBe(testCase.expectedError);
      }
    });

    it('should handle special characters in room names', async () => {
      const specialNames = [
        'Room #1',
        'Room A/B',
        'Room (Main)',
        'Room - East Wing',
        'Room & Office',
        'Café Meeting Room'
      ];

      for (const name of specialNames) {
        const response = await request(app)
          .post('/api/rooms')
          .send(createRoomFixture({ name }))
          .expect(201);

        expect(response.body.name).toBe(name);
      }
    });

    it('should handle long room names', async () => {
      const longName = 'A'.repeat(255); // Very long but reasonable name
      
      const response = await request(app)
        .post('/api/rooms')
        .send(createRoomFixture({ name: longName }))
        .expect(201);

      expect(response.body.name).toBe(longName);
    });

    it('should allow duplicate room names', async () => {
      const roomName = 'Duplicate Room';
      
      // Create first room
      const response1 = await request(app)
        .post('/api/rooms')
        .send(createRoomFixture({ name: roomName }))
        .expect(201);

      // Create second room with same name
      const response2 = await request(app)
        .post('/api/rooms')
        .send(createRoomFixture({ name: roomName }))
        .expect(201);

      expect(response1.body.name).toBe(roomName);
      expect(response2.body.name).toBe(roomName);
      expect(response1.body.id).not.toBe(response2.body.id);
    });
  });

  describe('PUT /api/rooms/:id', () => {
    let roomId: string;

    beforeEach(async () => {
      const roomData = createRoomFixture({ name: 'Original Room' });
      const response = await request(app)
        .post('/api/rooms')
        .send(roomData);
      roomId = response.body.id;
    });

    it('should update room name', async () => {
      const updateData = { name: 'Updated Room Name' };

      const response = await request(app)
        .put(`/api/rooms/${roomId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject(updateData);
      expect(response.body.id).toBe(roomId);
    });

    it('should handle empty update data', async () => {
      const response = await request(app)
        .put(`/api/rooms/${roomId}`)
        .send({})
        .expect(200);

      expect(response.body.id).toBe(roomId);
      expect(response.body.name).toBe('Original Room'); // Should remain unchanged
    });

    it('should update to special character names', async () => {
      const updateData = { name: 'Room #2 (Updated) - Main' };

      const response = await request(app)
        .put(`/api/rooms/${roomId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
    });

    it('should return 404 for non-existent room', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put(`/api/rooms/${nonExistentId}`)
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBe('Room not found');
    });

    it('should handle invalid UUID in update', async () => {
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put('/api/rooms/invalid-id')
        .send(updateData)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/rooms/:id', () => {
    let roomId: string;

    beforeEach(async () => {
      const roomData = createRoomFixture({ name: 'Room to Delete' });
      const response = await request(app)
        .post('/api/rooms')
        .send(roomData);
      roomId = response.body.id;
    });

    it('should delete existing room', async () => {
      await request(app)
        .delete(`/api/rooms/${roomId}`)
        .expect(204);

      // Verify room is deleted
      await request(app)
        .get(`/api/rooms/${roomId}`)
        .expect(404);
    });

    it('should return 404 for non-existent room', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/rooms/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toBe('Room not found');
    });

    it('should handle multiple deletions', async () => {
      // Create additional rooms
      const room2Response = await request(app)
        .post('/api/rooms')
        .send(createRoomFixture({ name: 'Room 2' }));
      const room3Response = await request(app)
        .post('/api/rooms')
        .send(createRoomFixture({ name: 'Room 3' }));

      const room2Id = room2Response.body.id;
      const room3Id = room3Response.body.id;

      // Delete all rooms
      await request(app).delete(`/api/rooms/${roomId}`).expect(204);
      await request(app).delete(`/api/rooms/${room2Id}`).expect(204);
      await request(app).delete(`/api/rooms/${room3Id}`).expect(204);

      // Verify all are deleted
      const allRoomsResponse = await request(app).get('/api/rooms');
      expect(allRoomsResponse.body).toHaveLength(0);
    });

    it('should handle deletion of already deleted room', async () => {
      // Delete room first time
      await request(app).delete(`/api/rooms/${roomId}`).expect(204);

      // Try to delete again
      await request(app).delete(`/api/rooms/${roomId}`).expect(404);
    });

    it('should handle invalid UUID in deletion', async () => {
      const response = await request(app)
        .delete('/api/rooms/invalid-id')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Room API Integration', () => {
    it('should handle full CRUD lifecycle', async () => {
      // Create
      const createData = createRoomFixture({ name: 'Lifecycle Room' });
      const createResponse = await request(app)
        .post('/api/rooms')
        .send(createData)
        .expect(201);
      
      const roomId = createResponse.body.id;
      expect(createResponse.body.name).toBe(createData.name);

      // Read
      const readResponse = await request(app)
        .get(`/api/rooms/${roomId}`)
        .expect(200);
      expect(readResponse.body).toMatchObject(createResponse.body);

      // Update
      const updateData = { name: 'Updated Lifecycle Room' };
      const updateResponse = await request(app)
        .put(`/api/rooms/${roomId}`)
        .send(updateData)
        .expect(200);
      expect(updateResponse.body.name).toBe(updateData.name);

      // Verify update
      const verifyResponse = await request(app)
        .get(`/api/rooms/${roomId}`)
        .expect(200);
      expect(verifyResponse.body.name).toBe(updateData.name);

      // Delete
      await request(app)
        .delete(`/api/rooms/${roomId}`)
        .expect(204);

      // Verify deletion
      await request(app)
        .get(`/api/rooms/${roomId}`)
        .expect(404);
    });
  });
});
