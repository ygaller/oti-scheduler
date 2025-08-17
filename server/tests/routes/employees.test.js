"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const testServer_1 = require("../utils/testServer");
const fixtures_1 = require("../utils/fixtures");
const setup_1 = require("../setup");
describe('Employee API Endpoints', () => {
    let app;
    beforeAll(() => {
        app = (0, testServer_1.createTestApp)(setup_1.prisma);
    });
    beforeEach(async () => {
        // Clean up all data before each test - order matters due to foreign key constraints
        await setup_1.prisma.sessionPatient.deleteMany();
        await setup_1.prisma.session.deleteMany();
        await setup_1.prisma.schedule.deleteMany();
        await setup_1.prisma.employee.deleteMany();
        await setup_1.prisma.room.deleteMany();
        await setup_1.prisma.activity.deleteMany();
        await setup_1.prisma.patient.deleteMany();
        await setup_1.prisma.role.deleteMany();
    });
    describe('GET /api/employees', () => {
        it('should return empty array when no employees exist', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/employees')
                .expect(200);
            expect(response.body).toEqual([]);
        });
        it('should return all employees when they exist', async () => {
            // Create test roles first
            const role1 = await (0, supertest_1.default)(app).post('/api/roles').send((0, fixtures_1.createRoleFixture)({ name: 'ריפוי בעיסוק' }));
            const role2 = await (0, supertest_1.default)(app).post('/api/roles').send((0, fixtures_1.createRoleFixture)({ name: 'קלינאות תקשורת' }));
            // Create test employees
            const employee1 = (0, fixtures_1.createEmployeeFixture)({ firstName: 'John', lastName: 'Doe', roleId: role1.body.id });
            const employee2 = (0, fixtures_1.createEmployeeFixture)({ firstName: 'Jane', lastName: 'Smith', roleId: role2.body.id });
            await (0, supertest_1.default)(app).post('/api/employees').send(employee1);
            await (0, supertest_1.default)(app).post('/api/employees').send(employee2);
            const response = await (0, supertest_1.default)(app)
                .get('/api/employees')
                .expect(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0]).toMatchObject({
                firstName: 'John',
                lastName: 'Doe',
                roleId: role1.body.id
            });
            expect(response.body[1]).toMatchObject({
                firstName: 'Jane',
                lastName: 'Smith',
                roleId: role2.body.id
            });
        });
    });
    describe('GET /api/employees/:id', () => {
        it('should return employee by ID', async () => {
            // Create test role first
            const role = await (0, supertest_1.default)(app).post('/api/roles').send((0, fixtures_1.createRoleFixture)({ name: 'ריפוי בעיסוק' }));
            const employeeData = (0, fixtures_1.createEmployeeFixture)({ roleId: role.body.id });
            const createResponse = await (0, supertest_1.default)(app)
                .post('/api/employees')
                .send(employeeData);
            const employeeId = createResponse.body.id;
            const response = await (0, supertest_1.default)(app)
                .get(`/api/employees/${employeeId}`)
                .expect(200);
            expect(response.body).toMatchObject({
                id: employeeId,
                firstName: employeeData.firstName,
                lastName: employeeData.lastName,
                roleId: employeeData.roleId
            });
        });
        it('should return 404 for non-existent employee', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';
            const response = await (0, supertest_1.default)(app)
                .get(`/api/employees/${nonExistentId}`)
                .expect(404);
            expect(response.body).toEqual({
                error: 'Employee not found'
            });
        });
        it('should handle invalid UUID format', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/employees/invalid-id')
                .expect(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Invalid id format');
        });
    });
    describe('POST /api/employees', () => {
        it('should create a new employee with valid data', async () => {
            // Create test role first
            const role = await (0, supertest_1.default)(app).post('/api/roles').send((0, fixtures_1.createRoleFixture)({ name: 'ריפוי בעיסוק' }));
            const employeeData = (0, fixtures_1.createEmployeeFixture)({ roleId: role.body.id });
            const response = await (0, supertest_1.default)(app)
                .post('/api/employees')
                .send(employeeData)
                .expect(201);
            expect(response.body).toMatchObject({
                firstName: employeeData.firstName,
                lastName: employeeData.lastName,
                roleId: employeeData.roleId,
                weeklySessionsCount: employeeData.weeklySessionsCount
            });
            expect(response.body).toHaveProperty('id');
            expect(response.body.workingHours).toEqual(employeeData.workingHours);
        });
        it('should create employees with different roles', async () => {
            // Create test roles first
            const roles = [];
            for (let i = 0; i < 3; i++) {
                const roleResponse = await (0, supertest_1.default)(app).post('/api/roles').send((0, fixtures_1.createRoleFixture)({
                    name: `תפקיד ${i + 1}`
                }));
                roles.push(roleResponse.body);
            }
            for (const role of roles) {
                const employeeData = (0, fixtures_1.createEmployeeFixture)({
                    firstName: `Test${role.roleStringKey}`,
                    roleId: role.id
                });
                const response = await (0, supertest_1.default)(app)
                    .post('/api/employees')
                    .send(employeeData)
                    .expect(201);
                expect(response.body.roleId).toBe(role.id);
            }
        });
        it('should return 400 for missing required fields', async () => {
            const testCases = [
                { data: {}, expectedError: 'Missing required fields: firstName, lastName, roleId' },
                {
                    data: { firstName: 'John' },
                    expectedError: 'Missing required fields: firstName, lastName, roleId'
                },
                {
                    data: { firstName: 'John', lastName: 'Doe' },
                    expectedError: 'Missing required fields: firstName, lastName, roleId'
                }
            ];
            for (const testCase of testCases) {
                const response = await (0, supertest_1.default)(app)
                    .post('/api/employees')
                    .send(testCase.data)
                    .expect(400);
                expect(response.body.error).toBe(testCase.expectedError);
            }
        });
        it('should handle invalid roleId', async () => {
            const employeeData = (0, fixtures_1.createEmployeeFixture)({ roleId: 'invalid-role-id' });
            const response = await (0, supertest_1.default)(app)
                .post('/api/employees')
                .send(employeeData)
                .expect(500);
            expect(response.body).toHaveProperty('error');
        });
        it('should handle partial working hours', async () => {
            // Create test role first
            const role = await (0, supertest_1.default)(app).post('/api/roles').send((0, fixtures_1.createRoleFixture)({ name: 'ריפוי בעיסוק' }));
            const employeeData = (0, fixtures_1.createEmployeeFixture)({
                roleId: role.body.id,
                workingHours: {
                    monday: { startTime: '08:00', endTime: '16:00' },
                    wednesday: { startTime: '08:00', endTime: '16:00' }
                }
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/employees')
                .send(employeeData)
                .expect(201);
            expect(response.body.workingHours).toEqual(employeeData.workingHours);
        });
    });
    describe('PUT /api/employees/:id', () => {
        let employeeId;
        let roleId;
        beforeEach(async () => {
            // Create test role first
            const role = await (0, supertest_1.default)(app).post('/api/roles').send((0, fixtures_1.createRoleFixture)({ name: 'ריפוי בעיסוק' }));
            roleId = role.body.id;
            const employeeData = (0, fixtures_1.createEmployeeFixture)({ roleId });
            const response = await (0, supertest_1.default)(app)
                .post('/api/employees')
                .send(employeeData);
            employeeId = response.body.id;
        });
        it('should update employee data', async () => {
            // Create another role for update
            const updateRole = await (0, supertest_1.default)(app).post('/api/roles').send((0, fixtures_1.createRoleFixture)({ name: 'קלינאות תקשורת' }));
            const updateData = {
                firstName: 'UpdatedFirst',
                lastName: 'UpdatedLast',
                roleId: updateRole.body.id,
                weeklySessionsCount: 25
            };
            const response = await (0, supertest_1.default)(app)
                .put(`/api/employees/${employeeId}`)
                .send(updateData)
                .expect(200);
            expect(response.body).toMatchObject(updateData);
            expect(response.body.id).toBe(employeeId);
        });
        it('should update partial employee data', async () => {
            const updateData = { firstName: 'PartialUpdate' };
            const response = await (0, supertest_1.default)(app)
                .put(`/api/employees/${employeeId}`)
                .send(updateData)
                .expect(200);
            expect(response.body.firstName).toBe('PartialUpdate');
            expect(response.body.id).toBe(employeeId);
        });
        it('should update working hours', async () => {
            const updateData = {
                workingHours: {
                    sunday: { startTime: '09:00', endTime: '17:00' },
                    monday: { startTime: '09:00', endTime: '17:00' }
                }
            };
            const response = await (0, supertest_1.default)(app)
                .put(`/api/employees/${employeeId}`)
                .send(updateData)
                .expect(200);
            expect(response.body.workingHours).toEqual(updateData.workingHours);
        });
        it('should return 404 for non-existent employee', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';
            const updateData = { firstName: 'Updated' };
            const response = await (0, supertest_1.default)(app)
                .put(`/api/employees/${nonExistentId}`)
                .send(updateData)
                .expect(404);
            expect(response.body.error).toBe('Employee not found');
        });
    });
    describe('PATCH /api/employees/:id/status', () => {
        let employeeId;
        beforeEach(async () => {
            // Create test role first
            const role = await (0, supertest_1.default)(app).post('/api/roles').send((0, fixtures_1.createRoleFixture)({ name: 'ריפוי בעיסוק' }));
            const employeeData = (0, fixtures_1.createEmployeeFixture)({ roleId: role.body.id });
            const response = await (0, supertest_1.default)(app)
                .post('/api/employees')
                .send(employeeData);
            employeeId = response.body.id;
        });
        it('should deactivate existing employee', async () => {
            const response = await (0, supertest_1.default)(app)
                .patch(`/api/employees/${employeeId}/status`)
                .send({ isActive: false })
                .expect(200);
            expect(response.body.isActive).toBe(false);
            // Verify employee is excluded from default list (active only)
            const allEmployeesResponse = await (0, supertest_1.default)(app).get('/api/employees');
            expect(allEmployeesResponse.body).toHaveLength(0);
            // Verify employee still exists when including inactive
            const allIncludingInactiveResponse = await (0, supertest_1.default)(app).get('/api/employees?includeInactive=true');
            expect(allIncludingInactiveResponse.body).toHaveLength(1);
            expect(allIncludingInactiveResponse.body[0].isActive).toBe(false);
        });
        it('should reactivate deactivated employee', async () => {
            // First deactivate
            await (0, supertest_1.default)(app)
                .patch(`/api/employees/${employeeId}/status`)
                .send({ isActive: false })
                .expect(200);
            // Then reactivate
            const response = await (0, supertest_1.default)(app)
                .patch(`/api/employees/${employeeId}/status`)
                .send({ isActive: true })
                .expect(200);
            expect(response.body.isActive).toBe(true);
            // Verify employee appears in default list again
            const allEmployeesResponse = await (0, supertest_1.default)(app).get('/api/employees');
            expect(allEmployeesResponse.body).toHaveLength(1);
            expect(allEmployeesResponse.body[0].isActive).toBe(true);
        });
        it('should return 404 for non-existent employee', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';
            const response = await (0, supertest_1.default)(app)
                .patch(`/api/employees/${nonExistentId}/status`)
                .send({ isActive: false })
                .expect(404);
            expect(response.body.error).toBe('Employee not found');
        });
        it('should return 400 for invalid isActive value', async () => {
            const response = await (0, supertest_1.default)(app)
                .patch(`/api/employees/${employeeId}/status`)
                .send({ isActive: 'invalid' })
                .expect(400);
            expect(response.body.error).toBe('isActive must be a boolean');
        });
        it('should handle multiple status changes', async () => {
            // Create another role and employee
            const role2 = await (0, supertest_1.default)(app).post('/api/roles').send((0, fixtures_1.createRoleFixture)({ name: 'קלינאות תקשורת' }));
            const employee2Data = (0, fixtures_1.createEmployeeFixture)({ firstName: 'Second', roleId: role2.body.id });
            const employee2Response = await (0, supertest_1.default)(app)
                .post('/api/employees')
                .send(employee2Data);
            const employee2Id = employee2Response.body.id;
            // Deactivate both employees
            await (0, supertest_1.default)(app).patch(`/api/employees/${employeeId}/status`).send({ isActive: false }).expect(200);
            await (0, supertest_1.default)(app).patch(`/api/employees/${employee2Id}/status`).send({ isActive: false }).expect(200);
            // Verify both are excluded from default list
            const allEmployeesResponse = await (0, supertest_1.default)(app).get('/api/employees');
            expect(allEmployeesResponse.body).toHaveLength(0);
            // Verify both exist when including inactive
            const allIncludingInactiveResponse = await (0, supertest_1.default)(app).get('/api/employees?includeInactive=true');
            expect(allIncludingInactiveResponse.body).toHaveLength(2);
            expect(allIncludingInactiveResponse.body.every((emp) => emp.isActive === false)).toBe(true);
        });
    });
});
//# sourceMappingURL=employees.test.js.map