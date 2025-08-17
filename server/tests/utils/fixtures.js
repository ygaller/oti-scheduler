"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testRoleStringKeys = exports.getRoleIdsByStringKeys = exports.createMockActivities = exports.createMockPatients = exports.createMockRooms = exports.createMockEmployees = exports.createScheduleFixture = exports.createSessionFixture = exports.createActivityFixture = exports.createPatientFixture = exports.validWorkingHours = exports.createMockRoles = exports.createRoomFixture = exports.createEmployeeFixture = exports.createCompleteRoleFixture = exports.createRoleFixture = void 0;
const uuid_1 = require("uuid");
const createRoleFixture = (overrides = {}) => ({
    name: 'ריפוי בעיסוק',
    isActive: true,
    ...overrides
});
exports.createRoleFixture = createRoleFixture;
const createCompleteRoleFixture = (overrides = {}) => ({
    id: overrides.id || generateTestUUID(),
    name: 'ריפוי בעיסוק',
    roleStringKey: overrides.roleStringKey || 'role_1',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
});
exports.createCompleteRoleFixture = createCompleteRoleFixture;
const createEmployeeFixture = (overrides = {}) => ({
    id: overrides.id || (0, uuid_1.v4)(),
    firstName: 'John',
    lastName: 'Doe',
    roleId: overrides.roleId || (0, uuid_1.v4)(), // Use provided roleId or generate one (tests should provide valid ones)
    workingHours: {
        sunday: { startTime: '08:00', endTime: '16:00' },
        monday: { startTime: '08:00', endTime: '16:00' },
        tuesday: { startTime: '08:00', endTime: '16:00' },
        wednesday: { startTime: '08:00', endTime: '16:00' },
        thursday: { startTime: '08:00', endTime: '16:00' }
    },
    weeklySessionsCount: 5,
    color: '#845ec2',
    isActive: true,
    ...overrides
});
exports.createEmployeeFixture = createEmployeeFixture;
const createRoomFixture = (overrides = {}) => ({
    id: overrides.id || (0, uuid_1.v4)(),
    name: 'Room A',
    color: '#008dcd',
    isActive: true,
    ...overrides
});
exports.createRoomFixture = createRoomFixture;
const createMockRoles = () => [
    (0, exports.createCompleteRoleFixture)({
        id: generateTestUUID(),
        name: 'ריפוי בעיסוק',
        roleStringKey: 'role_1'
    }),
    (0, exports.createCompleteRoleFixture)({
        id: generateTestUUID(),
        name: 'קלינאות תקשורת',
        roleStringKey: 'role_2'
    }),
    (0, exports.createCompleteRoleFixture)({
        id: generateTestUUID(),
        name: 'פיזיותרפיה',
        roleStringKey: 'role_3'
    }),
    (0, exports.createCompleteRoleFixture)({
        id: generateTestUUID(),
        name: 'עבודה סוציאלית',
        roleStringKey: 'role_4'
    }),
    (0, exports.createCompleteRoleFixture)({
        id: generateTestUUID(),
        name: 'טיפול בהבעה ויציאה',
        roleStringKey: 'role_5'
    })
];
exports.createMockRoles = createMockRoles;
exports.validWorkingHours = {
    sunday: { startTime: '08:00', endTime: '16:00' },
    monday: { startTime: '08:00', endTime: '16:00' },
    tuesday: { startTime: '08:00', endTime: '16:00' },
    wednesday: { startTime: '08:00', endTime: '16:00' },
    thursday: { startTime: '08:00', endTime: '16:00' }
};
const createPatientFixture = (overrides = {}) => ({
    id: generateTestUUID(),
    firstName: 'John',
    lastName: 'Patient',
    color: '#ff5733',
    therapyRequirements: {
        'role_1': 2,
        'role_3': 1
    },
    isActive: true,
    ...overrides
});
exports.createPatientFixture = createPatientFixture;
const createActivityFixture = (overrides = {}) => ({
    id: generateTestUUID(),
    name: 'Test Activity',
    color: '#33ff57',
    defaultStartTime: '10:00',
    defaultEndTime: '11:00',
    dayOverrides: {},
    isBlocking: false,
    isActive: true,
    ...overrides
});
exports.createActivityFixture = createActivityFixture;
const createSessionFixture = (overrides = {}) => ({
    id: generateTestUUID(),
    employeeIds: [generateTestUUID()],
    roomId: generateTestUUID(),
    day: 'monday',
    startTime: '10:00',
    endTime: '11:00',
    patients: [],
    ...overrides
});
exports.createSessionFixture = createSessionFixture;
const generateTestUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
const createScheduleFixture = (overrides = {}) => ({
    id: generateTestUUID(),
    sessions: [],
    generatedAt: new Date(),
    isActive: false,
    ...overrides
});
exports.createScheduleFixture = createScheduleFixture;
// Mock data sets for comprehensive testing
const createMockEmployees = (roleIds = []) => [
    (0, exports.createEmployeeFixture)({
        firstName: 'Alice',
        lastName: 'Smith',
        roleId: roleIds[0] || (0, uuid_1.v4)(),
        weeklySessionsCount: 5,
        color: '#845ec2'
    }),
    (0, exports.createEmployeeFixture)({
        firstName: 'Bob',
        lastName: 'Johnson',
        roleId: roleIds[2] || (0, uuid_1.v4)(),
        weeklySessionsCount: 3,
        color: '#4e9f3d'
    }),
    (0, exports.createEmployeeFixture)({
        firstName: 'Carol',
        lastName: 'Davis',
        roleId: roleIds[1] || (0, uuid_1.v4)(),
        weeklySessionsCount: 2,
        color: '#d65db1'
    })
];
exports.createMockEmployees = createMockEmployees;
const createMockRooms = () => [
    (0, exports.createRoomFixture)({ name: 'Therapy Room 1', color: '#008dcd' }),
    (0, exports.createRoomFixture)({ name: 'Therapy Room 2', color: '#ff6b6b' }),
    (0, exports.createRoomFixture)({ name: 'Speech Room', color: '#4ecdc4' })
];
exports.createMockRooms = createMockRooms;
const createMockPatients = () => [
    (0, exports.createPatientFixture)({
        firstName: 'John',
        lastName: 'Doe',
        therapyRequirements: {
            'role_1': 2,
            'role_3': 1
        }
    }),
    (0, exports.createPatientFixture)({
        firstName: 'Jane',
        lastName: 'Smith',
        therapyRequirements: {
            'role_2': 2,
            'role_1': 1
        }
    })
];
exports.createMockPatients = createMockPatients;
const createMockActivities = () => [
    (0, exports.createActivityFixture)({
        name: 'Morning Meeting',
        defaultStartTime: '08:00',
        defaultEndTime: '08:30',
        isBlocking: true
    }),
    (0, exports.createActivityFixture)({
        name: 'Optional Training',
        defaultStartTime: '12:00',
        defaultEndTime: '13:00',
        isBlocking: false
    }),
    (0, exports.createActivityFixture)({
        name: 'Staff Break',
        defaultStartTime: '15:00',
        defaultEndTime: '15:30',
        isBlocking: true
    })
];
exports.createMockActivities = createMockActivities;
// Helper function to get role IDs by role string keys
const getRoleIdsByStringKeys = (roles) => {
    const roleMap = {};
    roles.forEach(role => {
        roleMap[role.roleStringKey] = role.id;
    });
    return roleMap;
};
exports.getRoleIdsByStringKeys = getRoleIdsByStringKeys;
// Test role string keys for compatibility with old tests
exports.testRoleStringKeys = ['role_1', 'role_2', 'role_3', 'role_4', 'role_5'];
//# sourceMappingURL=fixtures.js.map