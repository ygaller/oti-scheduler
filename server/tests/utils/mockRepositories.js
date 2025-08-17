"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockRoleRepo = exports.mockSessionRepo = exports.mockActivityRepo = exports.mockPatientRepo = exports.mockRoomRepo = exports.mockEmployeeRepo = exports.mockScheduleRepo = exports.MockRoleRepository = exports.MockSessionRepository = exports.MockActivityRepository = exports.MockPatientRepository = exports.MockRoomRepository = exports.MockEmployeeRepository = exports.MockScheduleRepository = void 0;
const generateTestUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
class MockScheduleRepository {
    constructor() {
        this.schedules = [];
        this.idCounter = 1;
    }
    async findAll() {
        return [...this.schedules];
    }
    async findById(id) {
        return this.schedules.find(s => s.id === id) || null;
    }
    async findActive() {
        return this.schedules.find(s => s.isActive) || null;
    }
    async create(sessionsOrScheduleData) {
        // Deactivate all existing schedules
        this.schedules.forEach(s => s.isActive = false);
        let schedule;
        if (Array.isArray(sessionsOrScheduleData)) {
            // Called with sessions array (normal schedule generation)
            schedule = {
                id: generateTestUUID(),
                sessions: sessionsOrScheduleData.map(s => ({ ...s, id: s.id || generateTestUUID() })),
                generatedAt: new Date(),
                isActive: true
            };
        }
        else {
            // Called with schedule data (for testing)
            schedule = {
                id: generateTestUUID(),
                sessions: [],
                generatedAt: new Date(),
                isActive: true,
                ...sessionsOrScheduleData
            };
        }
        this.schedules.push(schedule);
        return { ...schedule };
    }
    async setActive(id) {
        const schedule = this.schedules.find(s => s.id === id);
        if (!schedule) {
            throw new Error('Schedule not found');
        }
        // Deactivate all schedules
        this.schedules.forEach(s => s.isActive = false);
        // Activate the target schedule
        schedule.isActive = true;
        return { ...schedule };
    }
    async delete(id) {
        const index = this.schedules.findIndex(s => s.id === id);
        if (index === -1) {
            throw new Error('Schedule not found');
        }
        this.schedules.splice(index, 1);
    }
    async deleteAll() {
        this.schedules = [];
    }
    // Helper methods for testing
    reset() {
        this.schedules = [];
        this.idCounter = 1;
    }
    setSchedules(schedules) {
        this.schedules = [...schedules];
    }
}
exports.MockScheduleRepository = MockScheduleRepository;
class MockEmployeeRepository {
    constructor() {
        this.employees = [];
        this.idCounter = 1;
    }
    async findAll(includeInactive) {
        return includeInactive ? this.employees : this.employees.filter(e => e.isActive);
    }
    async findById(id) {
        return this.employees.find(e => e.id === id) || null;
    }
    async create(employee) {
        const newEmployee = {
            id: generateTestUUID(),
            ...employee,
            isActive: employee.isActive ?? true
        };
        this.employees.push(newEmployee);
        return { ...newEmployee };
    }
    async update(id, employee) {
        const index = this.employees.findIndex(e => e.id === id);
        if (index === -1) {
            throw new Error('Employee not found');
        }
        this.employees[index] = { ...this.employees[index], ...employee };
        return { ...this.employees[index] };
    }
    async setActive(id, isActive) {
        const index = this.employees.findIndex(e => e.id === id);
        if (index === -1) {
            throw new Error('Employee not found');
        }
        this.employees[index].isActive = isActive;
        return { ...this.employees[index] };
    }
    async delete(id) {
        const index = this.employees.findIndex(e => e.id === id);
        if (index === -1) {
            throw new Error('Employee not found');
        }
        this.employees.splice(index, 1);
    }
    async deleteAll() {
        this.employees = [];
    }
    // Helper methods for testing
    reset() {
        this.employees = [];
        this.idCounter = 1;
    }
    setEmployees(employees) {
        this.employees = [...employees];
    }
}
exports.MockEmployeeRepository = MockEmployeeRepository;
class MockRoomRepository {
    constructor() {
        this.rooms = [];
        this.idCounter = 1;
    }
    async findAll(includeInactive) {
        return includeInactive ? this.rooms : this.rooms.filter(r => r.isActive);
    }
    async findById(id) {
        return this.rooms.find(r => r.id === id) || null;
    }
    async create(room) {
        const newRoom = {
            id: generateTestUUID(),
            ...room,
            isActive: room.isActive ?? true
        };
        this.rooms.push(newRoom);
        return { ...newRoom };
    }
    async update(id, room) {
        const index = this.rooms.findIndex(r => r.id === id);
        if (index === -1) {
            throw new Error('Room not found');
        }
        this.rooms[index] = { ...this.rooms[index], ...room };
        return { ...this.rooms[index] };
    }
    async setActive(id, isActive) {
        const index = this.rooms.findIndex(r => r.id === id);
        if (index === -1) {
            throw new Error('Room not found');
        }
        this.rooms[index].isActive = isActive;
        return { ...this.rooms[index] };
    }
    async delete(id) {
        const index = this.rooms.findIndex(r => r.id === id);
        if (index === -1) {
            throw new Error('Room not found');
        }
        this.rooms.splice(index, 1);
    }
    async deleteAll() {
        this.rooms = [];
    }
    // Helper methods for testing
    reset() {
        this.rooms = [];
        this.idCounter = 1;
    }
    setRooms(rooms) {
        this.rooms = [...rooms];
    }
}
exports.MockRoomRepository = MockRoomRepository;
class MockPatientRepository {
    constructor() {
        this.patients = [];
        this.idCounter = 1;
    }
    async findAll(includeInactive) {
        return includeInactive ? this.patients : this.patients.filter(p => p.isActive);
    }
    async findById(id) {
        return this.patients.find(p => p.id === id) || null;
    }
    async create(patient) {
        const newPatient = {
            id: generateTestUUID(),
            ...patient,
            isActive: patient.isActive ?? true
        };
        this.patients.push(newPatient);
        return { ...newPatient };
    }
    async update(id, patient) {
        const index = this.patients.findIndex(p => p.id === id);
        if (index === -1) {
            throw new Error('Patient not found');
        }
        this.patients[index] = { ...this.patients[index], ...patient };
        return { ...this.patients[index] };
    }
    async setActive(id, isActive) {
        const index = this.patients.findIndex(p => p.id === id);
        if (index === -1) {
            throw new Error('Patient not found');
        }
        this.patients[index].isActive = isActive;
        return { ...this.patients[index] };
    }
    async delete(id) {
        const index = this.patients.findIndex(p => p.id === id);
        if (index === -1) {
            throw new Error('Patient not found');
        }
        this.patients.splice(index, 1);
    }
    async deleteAll() {
        this.patients = [];
    }
    // Helper methods for testing
    reset() {
        this.patients = [];
        this.idCounter = 1;
    }
    setPatients(patients) {
        this.patients = [...patients];
    }
}
exports.MockPatientRepository = MockPatientRepository;
class MockActivityRepository {
    constructor() {
        this.activities = [];
        this.idCounter = 1;
    }
    async findAll() {
        return this.activities.filter(a => a.isActive);
    }
    async findById(id) {
        return this.activities.find(a => a.id === id) || null;
    }
    async create(activity) {
        const newActivity = {
            id: generateTestUUID(),
            createdAt: new Date(),
            updatedAt: new Date(),
            ...activity,
            isActive: activity.isActive ?? true
        };
        this.activities.push(newActivity);
        return { ...newActivity };
    }
    async update(id, activity) {
        const index = this.activities.findIndex(a => a.id === id);
        if (index === -1) {
            throw new Error('Activity not found');
        }
        this.activities[index] = {
            ...this.activities[index],
            ...activity,
            updatedAt: new Date()
        };
        return { ...this.activities[index] };
    }
    async setActive(id, isActive) {
        const index = this.activities.findIndex(a => a.id === id);
        if (index === -1) {
            throw new Error('Activity not found');
        }
        this.activities[index].isActive = isActive;
        this.activities[index].updatedAt = new Date();
        return { ...this.activities[index] };
    }
    async delete(id) {
        const index = this.activities.findIndex(a => a.id === id);
        if (index === -1) {
            throw new Error('Activity not found');
        }
        this.activities.splice(index, 1);
    }
    async deleteAll() {
        this.activities = [];
    }
    // Helper methods for testing
    reset() {
        this.activities = [];
        this.idCounter = 1;
    }
    setActivities(activities) {
        this.activities = [...activities];
    }
}
exports.MockActivityRepository = MockActivityRepository;
class MockSessionRepository {
    constructor() {
        this.sessions = [];
        this.idCounter = 1;
    }
    async findAll() {
        return [...this.sessions];
    }
    async findById(id) {
        return this.sessions.find(s => s.id === id) || null;
    }
    async create(session) {
        const newSession = {
            id: generateTestUUID(),
            patients: [],
            ...session
        };
        this.sessions.push(newSession);
        return { ...newSession };
    }
    async update(id, session) {
        const index = this.sessions.findIndex(s => s.id === id);
        if (index === -1) {
            throw new Error('Session not found');
        }
        this.sessions[index] = { ...this.sessions[index], ...session };
        return { ...this.sessions[index] };
    }
    async delete(id) {
        const index = this.sessions.findIndex(s => s.id === id);
        if (index === -1) {
            throw new Error('Session not found');
        }
        this.sessions.splice(index, 1);
    }
    async addPatient(sessionId, patientId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        // This would typically check for patient conflicts, but we'll keep it simple for mocks
        if (!session.patients) {
            session.patients = [];
        }
        // Avoid duplicates
        if (!session.patients.find(p => p.id === patientId)) {
            // In a real implementation, we'd fetch the patient from the patient repository
            session.patients.push({
                id: patientId,
                firstName: 'Mock',
                lastName: 'Patient',
                color: '#ff5733',
                therapyRequirements: {},
                isActive: true
            });
        }
        return { ...session };
    }
    async removePatient(sessionId, patientId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        if (session.patients) {
            session.patients = session.patients.filter(p => p.id !== patientId);
        }
        return { ...session };
    }
    async updatePatients(sessionId, patientIds) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        // Replace all patients with the new list
        session.patients = patientIds.map(id => ({
            id,
            firstName: 'Mock',
            lastName: 'Patient',
            color: '#ff5733',
            therapyRequirements: {},
            isActive: true
        }));
        return { ...session };
    }
    async findByScheduleId(scheduleId) {
        return this.sessions.filter(s => s.scheduleId === scheduleId);
    }
    async deleteAll() {
        this.sessions = [];
    }
    async deleteByScheduleId(scheduleId) {
        this.sessions = this.sessions.filter(s => s.scheduleId !== scheduleId);
    }
    // Helper methods for testing
    reset() {
        this.sessions = [];
        this.idCounter = 1;
    }
    setSessions(sessions) {
        this.sessions = [...sessions];
    }
}
exports.MockSessionRepository = MockSessionRepository;
class MockRoleRepository {
    constructor() {
        this.roles = [];
        this.employeeCounts = {};
        this.roleCounter = 1;
    }
    async findAll(includeInactive) {
        const filtered = includeInactive ? this.roles : this.roles.filter(r => r.isActive);
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    async findById(id) {
        return this.roles.find(r => r.id === id) || null;
    }
    async findByName(name) {
        return this.roles.find(r => r.name === name) || null;
    }
    async findByRoleStringKey(roleStringKey) {
        return this.roles.find(r => r.roleStringKey === roleStringKey) || null;
    }
    async create(data) {
        const role = {
            id: generateTestUUID(),
            name: data.name,
            roleStringKey: `role_${this.roleCounter++}`,
            isActive: data.isActive ?? true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.roles.push(role);
        return role;
    }
    async update(id, data) {
        const roleIndex = this.roles.findIndex(r => r.id === id);
        if (roleIndex === -1)
            return null;
        const role = this.roles[roleIndex];
        const updatedRole = {
            ...role,
            ...data,
            updatedAt: new Date()
        };
        this.roles[roleIndex] = updatedRole;
        return updatedRole;
    }
    async setActive(id, isActive) {
        return this.update(id, { isActive });
    }
    async delete(id) {
        const employeeCount = this.employeeCounts[id] || 0;
        if (employeeCount > 0) {
            return {
                success: false,
                error: `לא ניתן למחוק תפקיד שמוקצה ל-${employeeCount} עובד${employeeCount > 1 ? 'ים' : ''}. יש להסיר את התפקיד מכל העובדים לפני המחיקה.`
            };
        }
        const roleIndex = this.roles.findIndex(r => r.id === id);
        if (roleIndex === -1) {
            return { success: false, error: 'Role not found', notFound: true };
        }
        this.roles.splice(roleIndex, 1);
        return { success: true };
    }
    async getEmployeeCount(roleId) {
        return this.employeeCounts[roleId] || 0;
    }
    // Helper methods for testing
    clear() {
        this.roles = [];
        this.employeeCounts = {};
        this.roleCounter = 1;
    }
    setRoles(roles) {
        this.roles = [...roles];
    }
    setEmployeeCount(roleId, count) {
        this.employeeCounts[roleId] = count;
    }
}
exports.MockRoleRepository = MockRoleRepository;
// Export singleton instances for tests
exports.mockScheduleRepo = new MockScheduleRepository();
exports.mockEmployeeRepo = new MockEmployeeRepository();
exports.mockRoomRepo = new MockRoomRepository();
exports.mockPatientRepo = new MockPatientRepository();
exports.mockActivityRepo = new MockActivityRepository();
exports.mockSessionRepo = new MockSessionRepository();
exports.mockRoleRepo = new MockRoleRepository();
//# sourceMappingURL=mockRepositories.js.map