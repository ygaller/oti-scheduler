"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const testServer_1 = require("../utils/testServer");
const fixtures_1 = require("../utils/fixtures");
const setup_1 = require("../setup");
describe('Room API Endpoints', () => {
    let app;
    beforeAll(() => {
        app = (0, testServer_1.createTestApp)(setup_1.prisma);
    });
    describe('GET /api/rooms', () => {
        it('should return empty array when no rooms exist', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/rooms')
                .expect(200);
            expect(response.body).toEqual([]);
        });
        it('should return all rooms when they exist', async () => {
            // Create test rooms
            const room1 = (0, fixtures_1.createRoomFixture)({ name: 'Room A' });
            const room2 = (0, fixtures_1.createRoomFixture)({ name: 'Room B' });
            await (0, supertest_1.default)(app).post('/api/rooms').send(room1);
            await (0, supertest_1.default)(app).post('/api/rooms').send(room2);
            const response = await (0, supertest_1.default)(app)
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
                await (0, supertest_1.default)(app).post('/api/rooms').send((0, fixtures_1.createRoomFixture)({ name }));
            }
            const response = await (0, supertest_1.default)(app)
                .get('/api/rooms')
                .expect(200);
            expect(response.body).toHaveLength(4);
            // Verify all rooms are present
            const returnedNames = response.body.map((room) => room.name);
            expect(returnedNames).toEqual(expect.arrayContaining(roomNames));
        });
    });
    describe('GET /api/rooms/:id', () => {
        it('should return room by ID', async () => {
            const roomData = (0, fixtures_1.createRoomFixture)({ name: 'Test Room' });
            const createResponse = await (0, supertest_1.default)(app)
                .post('/api/rooms')
                .send(roomData);
            const roomId = createResponse.body.id;
            const response = await (0, supertest_1.default)(app)
                .get(`/api/rooms/${roomId}`)
                .expect(200);
            expect(response.body).toMatchObject({
                id: roomId,
                name: roomData.name
            });
        });
        it('should return 404 for non-existent room', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';
            const response = await (0, supertest_1.default)(app)
                .get(`/api/rooms/${nonExistentId}`)
                .expect(404);
            expect(response.body).toEqual({
                error: 'Room not found'
            });
        });
        it('should handle invalid UUID format', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/rooms/invalid-id')
                .expect(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Invalid id format');
        });
    });
    describe('POST /api/rooms', () => {
        it('should create a new room with valid data', async () => {
            const roomData = (0, fixtures_1.createRoomFixture)({ name: 'New Room' });
            const response = await (0, supertest_1.default)(app)
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
                const response = await (0, supertest_1.default)(app)
                    .post('/api/rooms')
                    .send((0, fixtures_1.createRoomFixture)({ name }))
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
                const response = await (0, supertest_1.default)(app)
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
                const response = await (0, supertest_1.default)(app)
                    .post('/api/rooms')
                    .send((0, fixtures_1.createRoomFixture)({ name }))
                    .expect(201);
                expect(response.body.name).toBe(name);
            }
        });
        it('should handle long room names', async () => {
            const longName = 'A'.repeat(255); // Very long but reasonable name
            const response = await (0, supertest_1.default)(app)
                .post('/api/rooms')
                .send((0, fixtures_1.createRoomFixture)({ name: longName }))
                .expect(201);
            expect(response.body.name).toBe(longName);
        });
        it('should allow duplicate room names', async () => {
            const roomName = 'Duplicate Room';
            // Create first room
            const response1 = await (0, supertest_1.default)(app)
                .post('/api/rooms')
                .send((0, fixtures_1.createRoomFixture)({ name: roomName }))
                .expect(201);
            // Create second room with same name
            const response2 = await (0, supertest_1.default)(app)
                .post('/api/rooms')
                .send((0, fixtures_1.createRoomFixture)({ name: roomName }))
                .expect(201);
            expect(response1.body.name).toBe(roomName);
            expect(response2.body.name).toBe(roomName);
            expect(response1.body.id).not.toBe(response2.body.id);
        });
    });
    describe('PUT /api/rooms/:id', () => {
        let roomId;
        beforeEach(async () => {
            const roomData = (0, fixtures_1.createRoomFixture)({ name: 'Original Room' });
            const response = await (0, supertest_1.default)(app)
                .post('/api/rooms')
                .send(roomData);
            roomId = response.body.id;
        });
        it('should update room name', async () => {
            const updateData = { name: 'Updated Room Name' };
            const response = await (0, supertest_1.default)(app)
                .put(`/api/rooms/${roomId}`)
                .send(updateData)
                .expect(200);
            expect(response.body).toMatchObject(updateData);
            expect(response.body.id).toBe(roomId);
        });
        it('should handle empty update data', async () => {
            const response = await (0, supertest_1.default)(app)
                .put(`/api/rooms/${roomId}`)
                .send({})
                .expect(200);
            expect(response.body.id).toBe(roomId);
            expect(response.body.name).toBe('Original Room'); // Should remain unchanged
        });
        it('should update to special character names', async () => {
            const updateData = { name: 'Room #2 (Updated) - Main' };
            const response = await (0, supertest_1.default)(app)
                .put(`/api/rooms/${roomId}`)
                .send(updateData)
                .expect(200);
            expect(response.body.name).toBe(updateData.name);
        });
        it('should return 404 for non-existent room', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';
            const updateData = { name: 'Updated Name' };
            const response = await (0, supertest_1.default)(app)
                .put(`/api/rooms/${nonExistentId}`)
                .send(updateData)
                .expect(404);
            expect(response.body.error).toBe('Room not found');
        });
        it('should handle invalid UUID in update', async () => {
            const updateData = { name: 'Updated Name' };
            const response = await (0, supertest_1.default)(app)
                .put('/api/rooms/invalid-id')
                .send(updateData)
                .expect(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Invalid id format');
        });
    });
    describe('PATCH /api/rooms/:id/status', () => {
        let roomId;
        beforeEach(async () => {
            const roomData = (0, fixtures_1.createRoomFixture)({ name: 'Room to Deactivate' });
            const response = await (0, supertest_1.default)(app)
                .post('/api/rooms')
                .send(roomData);
            roomId = response.body.id;
        });
        it('should deactivate existing room', async () => {
            const response = await (0, supertest_1.default)(app)
                .patch(`/api/rooms/${roomId}/status`)
                .send({ isActive: false })
                .expect(200);
            expect(response.body.isActive).toBe(false);
            // Verify room is excluded from default list (active only)
            const allRoomsResponse = await (0, supertest_1.default)(app).get('/api/rooms');
            expect(allRoomsResponse.body).toHaveLength(0);
            // Verify room still exists when including inactive
            const allIncludingInactiveResponse = await (0, supertest_1.default)(app).get('/api/rooms?includeInactive=true');
            expect(allIncludingInactiveResponse.body).toHaveLength(1);
            expect(allIncludingInactiveResponse.body[0].isActive).toBe(false);
        });
        it('should reactivate deactivated room', async () => {
            // First deactivate
            await (0, supertest_1.default)(app)
                .patch(`/api/rooms/${roomId}/status`)
                .send({ isActive: false })
                .expect(200);
            // Then reactivate
            const response = await (0, supertest_1.default)(app)
                .patch(`/api/rooms/${roomId}/status`)
                .send({ isActive: true })
                .expect(200);
            expect(response.body.isActive).toBe(true);
            // Verify room appears in default list again
            const allRoomsResponse = await (0, supertest_1.default)(app).get('/api/rooms');
            expect(allRoomsResponse.body).toHaveLength(1);
            expect(allRoomsResponse.body[0].isActive).toBe(true);
        });
        it('should return 404 for non-existent room', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';
            const response = await (0, supertest_1.default)(app)
                .patch(`/api/rooms/${nonExistentId}/status`)
                .send({ isActive: false })
                .expect(404);
            expect(response.body.error).toBe('Room not found');
        });
        it('should return 400 for invalid isActive value', async () => {
            const response = await (0, supertest_1.default)(app)
                .patch(`/api/rooms/${roomId}/status`)
                .send({ isActive: 'invalid' })
                .expect(400);
            expect(response.body.error).toBe('isActive must be a boolean');
        });
        it('should handle multiple status changes', async () => {
            // Create additional rooms
            const room2Response = await (0, supertest_1.default)(app)
                .post('/api/rooms')
                .send((0, fixtures_1.createRoomFixture)({ name: 'Room 2' }));
            const room3Response = await (0, supertest_1.default)(app)
                .post('/api/rooms')
                .send((0, fixtures_1.createRoomFixture)({ name: 'Room 3' }));
            const room2Id = room2Response.body.id;
            const room3Id = room3Response.body.id;
            // Deactivate all rooms
            await (0, supertest_1.default)(app).patch(`/api/rooms/${roomId}/status`).send({ isActive: false }).expect(200);
            await (0, supertest_1.default)(app).patch(`/api/rooms/${room2Id}/status`).send({ isActive: false }).expect(200);
            await (0, supertest_1.default)(app).patch(`/api/rooms/${room3Id}/status`).send({ isActive: false }).expect(200);
            // Verify all are excluded from default list
            const allRoomsResponse = await (0, supertest_1.default)(app).get('/api/rooms');
            expect(allRoomsResponse.body).toHaveLength(0);
            // Verify all exist when including inactive
            const allIncludingInactiveResponse = await (0, supertest_1.default)(app).get('/api/rooms?includeInactive=true');
            expect(allIncludingInactiveResponse.body).toHaveLength(3);
            expect(allIncludingInactiveResponse.body.every((room) => room.isActive === false)).toBe(true);
        });
        it('should handle deactivation of already deactivated room', async () => {
            // Deactivate room first time
            await (0, supertest_1.default)(app).patch(`/api/rooms/${roomId}/status`).send({ isActive: false }).expect(200);
            // Try to deactivate again (should still work)
            const response = await (0, supertest_1.default)(app)
                .patch(`/api/rooms/${roomId}/status`)
                .send({ isActive: false })
                .expect(200);
            expect(response.body.isActive).toBe(false);
        });
        it('should handle invalid UUID in status update', async () => {
            const response = await (0, supertest_1.default)(app)
                .patch('/api/rooms/invalid-id/status')
                .send({ isActive: false })
                .expect(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Invalid id format');
        });
    });
    describe('Room API Integration', () => {
        it('should handle full CRUD lifecycle', async () => {
            // Create
            const createData = (0, fixtures_1.createRoomFixture)({ name: 'Lifecycle Room' });
            const createResponse = await (0, supertest_1.default)(app)
                .post('/api/rooms')
                .send(createData)
                .expect(201);
            const roomId = createResponse.body.id;
            expect(createResponse.body.name).toBe(createData.name);
            // Read
            const readResponse = await (0, supertest_1.default)(app)
                .get(`/api/rooms/${roomId}`)
                .expect(200);
            expect(readResponse.body).toMatchObject(createResponse.body);
            // Update
            const updateData = { name: 'Updated Lifecycle Room' };
            const updateResponse = await (0, supertest_1.default)(app)
                .put(`/api/rooms/${roomId}`)
                .send(updateData)
                .expect(200);
            expect(updateResponse.body.name).toBe(updateData.name);
            // Verify update
            const verifyResponse = await (0, supertest_1.default)(app)
                .get(`/api/rooms/${roomId}`)
                .expect(200);
            expect(verifyResponse.body.name).toBe(updateData.name);
            // Deactivate
            const deactivateResponse = await (0, supertest_1.default)(app)
                .patch(`/api/rooms/${roomId}/status`)
                .send({ isActive: false })
                .expect(200);
            expect(deactivateResponse.body.isActive).toBe(false);
            // Verify room is excluded from default list but still accessible by ID
            const allRoomsResponse = await (0, supertest_1.default)(app).get('/api/rooms');
            expect(allRoomsResponse.body).toHaveLength(0);
            const roomByIdResponse = await (0, supertest_1.default)(app)
                .get(`/api/rooms/${roomId}`)
                .expect(200);
            expect(roomByIdResponse.body.isActive).toBe(false);
        });
    });
});
//# sourceMappingURL=rooms.test.js.map