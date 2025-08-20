"use strict";
/**
 * API Integration tests for schedule endpoints
 * These tests focus on the full request/response cycle and database interactions
 * They test the API layer and ensure proper HTTP responses, status codes, and data persistence
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("../setup"); // Import Jest setup
const supertest_1 = __importDefault(require("supertest"));
const testServer_1 = require("../utils/testServer");
const fixtures_1 = require("../utils/fixtures");
const setup_1 = require("../setup");
describe('Schedule API Integration Tests', () => {
    let app;
    beforeAll(() => {
        app = (0, testServer_1.createTestApp)(setup_1.prisma);
    });
    // Automated schedule generation tests removed - functionality no longer supported
    describe('GET /api/schedule/active - API Integration', () => {
        beforeEach(async () => {
            // Clean up before each test - order matters due to foreign key constraints
            await setup_1.prisma.sessionPatient.deleteMany();
            await setup_1.prisma.session.deleteMany();
            await setup_1.prisma.schedule.deleteMany();
            await setup_1.prisma.employee.deleteMany();
            await setup_1.prisma.room.deleteMany();
            await setup_1.prisma.activity.deleteMany();
            await setup_1.prisma.patient.deleteMany();
            await setup_1.prisma.role.deleteMany();
        });
        it('should return null when no active schedule exists (API)', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/schedule/active')
                .expect(200);
            expect(response.body).toBeNull();
        });
        it('should return active schedule when one exists (API)', async () => {
            // Set up test data via API
            const role1 = (0, fixtures_1.createRoleFixture)({ name: 'ריפוי בעיסוק' });
            const roleResponse1 = await (0, supertest_1.default)(app).post('/api/roles').send(role1);
            const employee = (0, fixtures_1.createEmployeeFixture)({ roleId: roleResponse1.body.id });
            const room = (0, fixtures_1.createRoomFixture)();
            await (0, supertest_1.default)(app).post('/api/employees').send(employee);
            await (0, supertest_1.default)(app).post('/api/rooms').send(room);
            // Generate an empty schedule (which becomes active by default)
            const generateResponse = await (0, supertest_1.default)(app)
                .post('/api/schedule/generate-empty')
                .expect(201);
            // Get active schedule
            const response = await (0, supertest_1.default)(app)
                .get('/api/schedule/active')
                .expect(200);
            expect(response.body).toEqual(generateResponse.body);
            expect(response.body.isActive).toBe(true);
        });
    });
    describe('GET /api/schedule/all - API Integration', () => {
        beforeEach(async () => {
            // Clean up before each test - order matters due to foreign key constraints
            await setup_1.prisma.sessionPatient.deleteMany();
            await setup_1.prisma.session.deleteMany();
            await setup_1.prisma.schedule.deleteMany();
            await setup_1.prisma.employee.deleteMany();
            await setup_1.prisma.room.deleteMany();
            await setup_1.prisma.activity.deleteMany();
            await setup_1.prisma.patient.deleteMany();
            await setup_1.prisma.role.deleteMany();
        });
        it('should return empty array when no schedules exist (API)', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/schedule/all')
                .expect(200);
            expect(response.body).toEqual([]);
        });
        it('should return all schedules with proper data persistence (API)', async () => {
            // Set up test data
            const role1 = (0, fixtures_1.createRoleFixture)({ name: 'ריפוי בעיסוק' });
            const roleResponse1 = await (0, supertest_1.default)(app).post('/api/roles').send(role1);
            const employee = (0, fixtures_1.createEmployeeFixture)({ roleId: roleResponse1.body.id });
            const room = (0, fixtures_1.createRoomFixture)();
            await (0, supertest_1.default)(app).post('/api/employees').send(employee);
            await (0, supertest_1.default)(app).post('/api/rooms').send(room);
            // Generate two empty schedules
            const schedule1Response = await (0, supertest_1.default)(app).post('/api/schedule/generate-empty').expect(201);
            const schedule2Response = await (0, supertest_1.default)(app).post('/api/schedule/generate-empty').expect(201);
            const response = await (0, supertest_1.default)(app)
                .get('/api/schedule/all')
                .expect(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body).toHaveLength(2);
            // Verify data structure
            response.body.forEach((schedule) => {
                expect(schedule).toHaveProperty('id');
                expect(schedule).toHaveProperty('sessions');
                expect(schedule).toHaveProperty('generatedAt');

            });
            // Schedules should be ordered by generatedAt desc (most recent first)
            expect(response.body[0].id).toBe(schedule2Response.body.id);
        });
    });

    describe('DELETE /api/schedule/:id - API Integration', () => {
        beforeEach(async () => {
            // Clean up before each test - order matters due to foreign key constraints
            await setup_1.prisma.sessionPatient.deleteMany();
            await setup_1.prisma.session.deleteMany();
            await setup_1.prisma.schedule.deleteMany();
            await setup_1.prisma.employee.deleteMany();
            await setup_1.prisma.room.deleteMany();
            await setup_1.prisma.activity.deleteMany();
            await setup_1.prisma.patient.deleteMany();
            await setup_1.prisma.role.deleteMany();
        });
        it('should delete a schedule and update database (API)', async () => {
            // Set up test data
            const role1 = (0, fixtures_1.createRoleFixture)({ name: 'ריפוי בעיסוק' });
            const roleResponse1 = await (0, supertest_1.default)(app).post('/api/roles').send(role1);
            const employee = (0, fixtures_1.createEmployeeFixture)({ roleId: roleResponse1.body.id });
            const room = (0, fixtures_1.createRoomFixture)();
            await (0, supertest_1.default)(app).post('/api/employees').send(employee);
            await (0, supertest_1.default)(app).post('/api/rooms').send(room);
            // Generate an empty schedule
            const generateResponse = await (0, supertest_1.default)(app).post('/api/schedule/generate-empty').expect(201);
            const scheduleId = generateResponse.body.id;
            // Verify it exists
            await (0, supertest_1.default)(app).get('/api/schedule/all').expect(200).then(res => {
                expect(res.body).toHaveLength(1);
            });
            // Delete the schedule
            await (0, supertest_1.default)(app)
                .delete(`/api/schedule/${scheduleId}`)
                .expect(204);
            // Verify it's deleted from database
            const schedulesInDb = await setup_1.prisma.schedule.findMany();
            expect(schedulesInDb).toHaveLength(0);
            // Verify via API
            const allSchedules = await (0, supertest_1.default)(app).get('/api/schedule/all').expect(200);
            expect(allSchedules.body).toHaveLength(0);
        });
        it('should return 404 for non-existent schedule (API)', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';
            const response = await (0, supertest_1.default)(app)
                .delete(`/api/schedule/${nonExistentId}`)
                .expect(404);
            expect(response.body.error).toBe('Schedule not found');
        });
    });
    describe('Session Management API Integration', () => {
        beforeEach(async () => {
            await setup_1.prisma.sessionPatient.deleteMany();
            await setup_1.prisma.session.deleteMany();
            await setup_1.prisma.schedule.deleteMany();
            await setup_1.prisma.employee.deleteMany();
            await setup_1.prisma.room.deleteMany();
            await setup_1.prisma.activity.deleteMany();
            await setup_1.prisma.patient.deleteMany();
        });
        it('should create a session via API and persist to database', async () => {
            // Set up test data
            const role1 = (0, fixtures_1.createRoleFixture)({ name: 'ריפוי בעיסוק' });
            const roleResponse1 = await (0, supertest_1.default)(app).post('/api/roles').send(role1);
            const employee = (0, fixtures_1.createEmployeeFixture)({ roleId: roleResponse1.body.id });
            const room = (0, fixtures_1.createRoomFixture)();
            const employeeResponse = await (0, supertest_1.default)(app).post('/api/employees').send(employee);
            const roomResponse = await (0, supertest_1.default)(app).post('/api/rooms').send(room);
            // Generate an empty schedule first (required for session creation)
            const scheduleResponse = await (0, supertest_1.default)(app).post('/api/schedule/generate-empty').expect(201);
            const initialSessionCount = scheduleResponse.body.sessions.length;
            const sessionData = {
                employeeIds: [employeeResponse.body.id],
                roomId: roomResponse.body.id,
                day: 'monday',
                startTime: '10:00',
                endTime: '11:00'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/schedule/sessions')
                .send(sessionData);
            // Log the error to debug
            if (response.status !== 201) {
                console.log('Session creation failed:', response.status, response.body);
            }
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.employeeIds).toEqual(sessionData.employeeIds);
            expect(response.body.roomId).toBe(sessionData.roomId);
            expect(response.body.day).toBe(sessionData.day);
            expect(response.body.startTime).toBe(sessionData.startTime);
            expect(response.body.endTime).toBe(sessionData.endTime);
            // Verify database persistence - should have initial sessions + 1 new session
            const sessionsInDb = await setup_1.prisma.session.findMany({
                include: {
                    sessionEmployees: true
                }
            });
            expect(sessionsInDb).toHaveLength(initialSessionCount + 1);
            // Verify the new session was created correctly
            const newSession = sessionsInDb.find(s => s.id === response.body.id);
            expect(newSession).toBeDefined();
            expect(newSession.sessionEmployees.map(se => se.employeeId)).toEqual(sessionData.employeeIds);
            expect(newSession.roomId).toBe(sessionData.roomId);
        });
        it('should get all sessions via API', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/schedule/sessions')
                .expect(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });
    describe('Patient Assignment API Integration', () => {
        let employee1, employee2, room1, room2, patient;
        let session1, session2;
        beforeEach(async () => {
            // Clean up
            await setup_1.prisma.sessionPatient.deleteMany();
            await setup_1.prisma.session.deleteMany();
            await setup_1.prisma.schedule.deleteMany();
            await setup_1.prisma.employee.deleteMany();
            await setup_1.prisma.room.deleteMany();
            await setup_1.prisma.activity.deleteMany();
            await setup_1.prisma.patient.deleteMany();
            await setup_1.prisma.role.deleteMany();
            // Create test roles first
            const role1 = (0, fixtures_1.createRoleFixture)({ name: 'ריפוי בעיסוק' });
            const role2 = (0, fixtures_1.createRoleFixture)({ name: 'פיזיותרפיה' });
            const roleResponse1 = await (0, supertest_1.default)(app).post('/api/roles').send(role1);
            const roleResponse2 = await (0, supertest_1.default)(app).post('/api/roles').send(role2);
            // Create test employees via API
            const employee1Data = (0, fixtures_1.createEmployeeFixture)({
                firstName: 'Alice',
                lastName: 'Smith',
                roleId: roleResponse1.body.id
            });
            const employee2Data = (0, fixtures_1.createEmployeeFixture)({
                firstName: 'Bob',
                lastName: 'Johnson',
                roleId: roleResponse2.body.id
            });
            const employee1Response = await (0, supertest_1.default)(app).post('/api/employees').send(employee1Data);
            const employee2Response = await (0, supertest_1.default)(app).post('/api/employees').send(employee2Data);
            employee1 = employee1Response.body;
            employee2 = employee2Response.body;
            // Create test rooms via API
            const room1Response = await (0, supertest_1.default)(app).post('/api/rooms').send((0, fixtures_1.createRoomFixture)({ name: 'Room A' }));
            const room2Response = await (0, supertest_1.default)(app).post('/api/rooms').send((0, fixtures_1.createRoomFixture)({ name: 'Room B' }));
            room1 = room1Response.body;
            room2 = room2Response.body;
            // Create test patient via API
            const patientResponse = await (0, supertest_1.default)(app).post('/api/patients').send({
                firstName: 'John',
                lastName: 'Doe',
                color: '#ff5733',
                therapyRequirements: {
                    'role_5': 2, // ריפוי בעיסוק (occupational therapy)
                    'role_3': 1 // פיזיותרפיה (physiotherapy)
                }
            });
            patient = patientResponse.body;
            // Generate an empty schedule first (required for session creation)
            await (0, supertest_1.default)(app).post('/api/schedule/generate-empty').expect(201);
            // Create test sessions via API
            const session1Response = await (0, supertest_1.default)(app).post('/api/schedule/sessions').send({
                employeeIds: [employee1.id],
                roomId: room1.id,
                day: 'monday',
                startTime: '10:00',
                endTime: '11:00'
            });
            const session2Response = await (0, supertest_1.default)(app).post('/api/schedule/sessions').send({
                employeeIds: [employee2.id],
                roomId: room2.id,
                day: 'monday',
                startTime: '10:30',
                endTime: '11:30'
            });
            session1 = session1Response.body;
            session2 = session2Response.body;
        });
        it('should assign patient to session via API and persist to database', async () => {
            const response = await (0, supertest_1.default)(app)
                .post(`/api/schedule/sessions/${session1.id}/patients`)
                .send({ patientId: patient.id })
                .expect(200);
            expect(response.body.patients).toHaveLength(1);
            expect(response.body.patients[0].id).toBe(patient.id);
            // Verify database persistence
            const sessionPatientsInDb = await setup_1.prisma.sessionPatient.findMany({
                where: { sessionId: session1.id }
            });
            expect(sessionPatientsInDb).toHaveLength(1);
            expect(sessionPatientsInDb[0].patientId).toBe(patient.id);
        });
        it('should prevent assigning patient to overlapping session via API', async () => {
            // First assign patient to session1 (10:00-11:00)
            await (0, supertest_1.default)(app)
                .post(`/api/schedule/sessions/${session1.id}/patients`)
                .send({ patientId: patient.id })
                .expect(200);
            // Try to assign same patient to session2 (10:30-11:30) - should conflict
            const response = await (0, supertest_1.default)(app)
                .post(`/api/schedule/sessions/${session2.id}/patients`)
                .send({ patientId: patient.id })
                .expect(400);
            expect(response.body.error).toContain('המטופל כבר משויך לטיפול אחר באותו זמן');
            // Verify database state - patient should only be in session1
            const session1Patients = await setup_1.prisma.sessionPatient.findMany({
                where: { sessionId: session1.id }
            });
            const session2Patients = await setup_1.prisma.sessionPatient.findMany({
                where: { sessionId: session2.id }
            });
            expect(session1Patients).toHaveLength(1);
            expect(session2Patients).toHaveLength(0);
        });
        it('should handle bulk patient assignment via API', async () => {
            // Create second patient
            const patient2Response = await (0, supertest_1.default)(app).post('/api/patients').send({
                firstName: 'Jane',
                lastName: 'Smith',
                color: '#33ff57',
                therapyRequirements: { 'role_5': 1 } // ריפוי בעיסוק (occupational therapy)
            });
            const patient2 = patient2Response.body;
            // Bulk assign both patients to session1
            const response = await (0, supertest_1.default)(app)
                .put(`/api/schedule/sessions/${session1.id}/patients`)
                .send({ patientIds: [patient.id, patient2.id] })
                .expect(200);
            expect(response.body.patients).toHaveLength(2);
            const patientIds = response.body.patients.map((p) => p.id);
            expect(patientIds).toContain(patient.id);
            expect(patientIds).toContain(patient2.id);
            // Verify database persistence
            const sessionPatientsInDb = await setup_1.prisma.sessionPatient.findMany({
                where: { sessionId: session1.id }
            });
            expect(sessionPatientsInDb).toHaveLength(2);
        });
    });
    describe('Error Handling and Edge Cases (API)', () => {
        beforeEach(async () => {
            // Clean up before each test - order matters due to foreign key constraints
            await setup_1.prisma.sessionPatient.deleteMany();
            await setup_1.prisma.session.deleteMany();
            await setup_1.prisma.schedule.deleteMany();
            await setup_1.prisma.employee.deleteMany();
            await setup_1.prisma.room.deleteMany();
            await setup_1.prisma.activity.deleteMany();
            await setup_1.prisma.patient.deleteMany();
            await setup_1.prisma.role.deleteMany();
        });
        it('should handle server errors gracefully', async () => {
            // Try to create session with invalid data
            const response = await (0, supertest_1.default)(app)
                .post('/api/schedule/sessions')
                .send({
                employeeIds: ['invalid-id'],
                roomId: 'invalid-id',
                day: 'invalid-day',
                startTime: 'invalid-time',
                endTime: 'invalid-time'
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should validate request data properly', async () => {
            // Try to create session with invalid data
            const response = await (0, supertest_1.default)(app)
                .post('/api/schedule/sessions')
                .send({
                employeeIds: ['invalid-id'],
                roomId: 'invalid-id',
                day: 'invalid-day',
                startTime: 'invalid-time',
                endTime: 'invalid-time'
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
    });
});
// Helper function to convert time string to minutes for comparison
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}
//# sourceMappingURL=schedule.integration.test.js.map