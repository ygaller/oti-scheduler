import { 
  ScheduleRepository, 
  EmployeeRepository, 
  RoomRepository, 
  PatientRepository, 
  ActivityRepository,
  SessionRepository,
  RoleRepository
} from '../../src/repositories/interfaces';
import { 
  Schedule, 
  Session, 
  Employee, 
  Room, 
  Patient, 
  Activity, 
  Role,
  CreateEmployeeDto, 
  CreateRoomDto,
  CreateRoleDto,
  UpdateRoleDto
} from '../../src/types';

const generateTestUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export class MockScheduleRepository implements ScheduleRepository {
  private schedules: Schedule[] = [];
  private idCounter = 1;

  async findAll(): Promise<Schedule[]> {
    return [...this.schedules];
  }

  async findById(id: string): Promise<Schedule | null> {
    return this.schedules.find(s => s.id === id) || null;
  }

  async findActive(): Promise<Schedule | null> {
    return this.schedules.find(s => s.isActive) || null;
  }

  async create(sessionsOrScheduleData: Session[] | Partial<Schedule>): Promise<Schedule> {
    // Deactivate all existing schedules
    this.schedules.forEach(s => s.isActive = false);

    let schedule: Schedule;
    
    if (Array.isArray(sessionsOrScheduleData)) {
      // Called with sessions array (normal schedule generation)
      schedule = {
        id: generateTestUUID(),
        sessions: sessionsOrScheduleData.map(s => ({ ...s, id: s.id || generateTestUUID() })),
        generatedAt: new Date(),
        isActive: true
      };
    } else {
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

  async setActive(id: string): Promise<Schedule> {
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

  async delete(id: string): Promise<void> {
    const index = this.schedules.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error('Schedule not found');
    }
    this.schedules.splice(index, 1);
  }

  async deleteAll(): Promise<void> {
    this.schedules = [];
  }

  // Helper methods for testing
  reset(): void {
    this.schedules = [];
    this.idCounter = 1;
  }

  setSchedules(schedules: Schedule[]): void {
    this.schedules = [...schedules];
  }
}

export class MockEmployeeRepository implements EmployeeRepository {
  private employees: Employee[] = [];
  private idCounter = 1;

  async findAll(includeInactive?: boolean): Promise<Employee[]> {
    return includeInactive ? this.employees : this.employees.filter(e => e.isActive);
  }

  async findById(id: string): Promise<Employee | null> {
    return this.employees.find(e => e.id === id) || null;
  }

  async create(employee: CreateEmployeeDto): Promise<Employee> {
    const newEmployee: Employee = {
      id: generateTestUUID(),
      ...employee,
      isActive: employee.isActive ?? true
    };
    this.employees.push(newEmployee);
    return { ...newEmployee };
  }

  async update(id: string, employee: Partial<CreateEmployeeDto>): Promise<Employee> {
    const index = this.employees.findIndex(e => e.id === id);
    if (index === -1) {
      throw new Error('Employee not found');
    }
    
    this.employees[index] = { ...this.employees[index], ...employee };
    return { ...this.employees[index] };
  }

  async setActive(id: string, isActive: boolean): Promise<Employee> {
    const index = this.employees.findIndex(e => e.id === id);
    if (index === -1) {
      throw new Error('Employee not found');
    }
    
    this.employees[index].isActive = isActive;
    return { ...this.employees[index] };
  }

  async delete(id: string): Promise<void> {
    const index = this.employees.findIndex(e => e.id === id);
    if (index === -1) {
      throw new Error('Employee not found');
    }
    this.employees.splice(index, 1);
  }

  async deleteAll(): Promise<void> {
    this.employees = [];
  }

  // Helper methods for testing
  reset(): void {
    this.employees = [];
    this.idCounter = 1;
  }

  setEmployees(employees: Employee[]): void {
    this.employees = [...employees];
  }
}

export class MockRoomRepository implements RoomRepository {
  private rooms: Room[] = [];
  private idCounter = 1;

  async findAll(includeInactive?: boolean): Promise<Room[]> {
    return includeInactive ? this.rooms : this.rooms.filter(r => r.isActive);
  }

  async findById(id: string): Promise<Room | null> {
    return this.rooms.find(r => r.id === id) || null;
  }

  async create(room: CreateRoomDto): Promise<Room> {
    const newRoom: Room = {
      id: generateTestUUID(),
      ...room,
      isActive: room.isActive ?? true
    };
    this.rooms.push(newRoom);
    return { ...newRoom };
  }

  async update(id: string, room: Partial<CreateRoomDto>): Promise<Room> {
    const index = this.rooms.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error('Room not found');
    }
    
    this.rooms[index] = { ...this.rooms[index], ...room };
    return { ...this.rooms[index] };
  }

  async setActive(id: string, isActive: boolean): Promise<Room> {
    const index = this.rooms.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error('Room not found');
    }
    
    this.rooms[index].isActive = isActive;
    return { ...this.rooms[index] };
  }

  async delete(id: string): Promise<void> {
    const index = this.rooms.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error('Room not found');
    }
    this.rooms.splice(index, 1);
  }

  async deleteAll(): Promise<void> {
    this.rooms = [];
  }

  // Helper methods for testing
  reset(): void {
    this.rooms = [];
    this.idCounter = 1;
  }

  setRooms(rooms: Room[]): void {
    this.rooms = [...rooms];
  }
}

export class MockPatientRepository implements PatientRepository {
  private patients: Patient[] = [];
  private idCounter = 1;

  async findAll(includeInactive?: boolean): Promise<Patient[]> {
    return includeInactive ? this.patients : this.patients.filter(p => p.isActive);
  }

  async findById(id: string): Promise<Patient | null> {
    return this.patients.find(p => p.id === id) || null;
  }

  async create(patient: Omit<Patient, 'id'>): Promise<Patient> {
    const newPatient: Patient = {
      id: generateTestUUID(),
      ...patient,
      isActive: patient.isActive ?? true
    };
    this.patients.push(newPatient);
    return { ...newPatient };
  }

  async update(id: string, patient: Partial<Omit<Patient, 'id'>>): Promise<Patient> {
    const index = this.patients.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('Patient not found');
    }
    
    this.patients[index] = { ...this.patients[index], ...patient };
    return { ...this.patients[index] };
  }

  async setActive(id: string, isActive: boolean): Promise<Patient> {
    const index = this.patients.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('Patient not found');
    }
    
    this.patients[index].isActive = isActive;
    return { ...this.patients[index] };
  }

  async delete(id: string): Promise<void> {
    const index = this.patients.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('Patient not found');
    }
    this.patients.splice(index, 1);
  }

  async deleteAll(): Promise<void> {
    this.patients = [];
  }

  // Helper methods for testing
  reset(): void {
    this.patients = [];
    this.idCounter = 1;
  }

  setPatients(patients: Patient[]): void {
    this.patients = [...patients];
  }
}

export class MockActivityRepository implements ActivityRepository {
  private activities: Activity[] = [];
  private idCounter = 1;

  async findAll(): Promise<Activity[]> {
    return this.activities.filter(a => a.isActive);
  }

  async findById(id: string): Promise<Activity | null> {
    return this.activities.find(a => a.id === id) || null;
  }

  async create(activity: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Activity> {
    const newActivity: Activity = {
      id: generateTestUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...activity,
      isActive: activity.isActive ?? true
    };
    this.activities.push(newActivity);
    return { ...newActivity };
  }

  async update(id: string, activity: Partial<Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Activity> {
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

  async setActive(id: string, isActive: boolean): Promise<Activity> {
    const index = this.activities.findIndex(a => a.id === id);
    if (index === -1) {
      throw new Error('Activity not found');
    }
    
    this.activities[index].isActive = isActive;
    this.activities[index].updatedAt = new Date();
    return { ...this.activities[index] };
  }

  async delete(id: string): Promise<void> {
    const index = this.activities.findIndex(a => a.id === id);
    if (index === -1) {
      throw new Error('Activity not found');
    }
    this.activities.splice(index, 1);
  }

  async deleteAll(): Promise<void> {
    this.activities = [];
  }

  // Helper methods for testing
  reset(): void {
    this.activities = [];
    this.idCounter = 1;
  }

  setActivities(activities: Activity[]): void {
    this.activities = [...activities];
  }
}

export class MockSessionRepository implements SessionRepository {
  private sessions: Session[] = [];
  private idCounter = 1;

  async findAll(): Promise<Session[]> {
    return [...this.sessions];
  }

  async findById(id: string): Promise<Session | null> {
    return this.sessions.find(s => s.id === id) || null;
  }

  async create(session: Omit<Session, 'id'>): Promise<Session> {
    const newSession: Session = {
      id: generateTestUUID(),
      patients: [],
      ...session
    };
    this.sessions.push(newSession);
    return { ...newSession };
  }

  async update(id: string, session: Partial<Omit<Session, 'id'>>): Promise<Session> {
    const index = this.sessions.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error('Session not found');
    }
    
    this.sessions[index] = { ...this.sessions[index], ...session };
    return { ...this.sessions[index] };
  }

  async delete(id: string): Promise<void> {
    const index = this.sessions.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error('Session not found');
    }
    this.sessions.splice(index, 1);
  }

  async addPatient(sessionId: string, patientId: string): Promise<Session> {
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

  async removePatient(sessionId: string, patientId: string): Promise<Session> {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    if (session.patients) {
      session.patients = session.patients.filter(p => p.id !== patientId);
    }
    
    return { ...session };
  }

  async updatePatients(sessionId: string, patientIds: string[]): Promise<Session> {
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

  async findByScheduleId(scheduleId: string): Promise<Session[]> {
    return this.sessions.filter(s => s.scheduleId === scheduleId);
  }

  async deleteAll(): Promise<void> {
    this.sessions = [];
  }

  async deleteByScheduleId(scheduleId: string): Promise<void> {
    this.sessions = this.sessions.filter(s => s.scheduleId !== scheduleId);
  }

  // Helper methods for testing
  reset(): void {
    this.sessions = [];
    this.idCounter = 1;
  }

  setSessions(sessions: Session[]): void {
    this.sessions = [...sessions];
  }
}

export class MockRoleRepository implements RoleRepository {
  private roles: Role[] = [];
  private employeeCounts: Record<string, number> = {};
  private roleCounter = 1;

  async findAll(includeInactive?: boolean): Promise<Role[]> {
    const filtered = includeInactive ? this.roles : this.roles.filter(r => r.isActive);
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  async findById(id: string): Promise<Role | null> {
    return this.roles.find(r => r.id === id) || null;
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roles.find(r => r.name === name) || null;
  }

  async findByRoleStringKey(roleStringKey: string): Promise<Role | null> {
    return this.roles.find(r => r.roleStringKey === roleStringKey) || null;
  }

  async create(data: CreateRoleDto): Promise<Role> {
    const role: Role = {
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

  async update(id: string, data: UpdateRoleDto): Promise<Role | null> {
    const roleIndex = this.roles.findIndex(r => r.id === id);
    if (roleIndex === -1) return null;

    const role = this.roles[roleIndex];
    const updatedRole = {
      ...role,
      ...data,
      updatedAt: new Date()
    };
    
    this.roles[roleIndex] = updatedRole;
    return updatedRole;
  }

  async setActive(id: string, isActive: boolean): Promise<Role | null> {
    return this.update(id, { isActive });
  }

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const employeeCount = this.employeeCounts[id] || 0;
    
    if (employeeCount > 0) {
      return {
        success: false,
        error: `לא ניתן למחוק תפקיד שמוקצה ל-${employeeCount} עובד${employeeCount > 1 ? 'ים' : ''}. יש להסיר את התפקיד מכל העובדים לפני המחיקה.`
      };
    }

    const roleIndex = this.roles.findIndex(r => r.id === id);
    if (roleIndex === -1) {
      return { success: false, error: 'Role not found' };
    }

    this.roles.splice(roleIndex, 1);
    return { success: true };
  }

  async getEmployeeCount(roleId: string): Promise<number> {
    return this.employeeCounts[roleId] || 0;
  }

  // Helper methods for testing
  clear(): void {
    this.roles = [];
    this.employeeCounts = {};
    this.roleCounter = 1;
  }

  setRoles(roles: Role[]): void {
    this.roles = [...roles];
  }

  setEmployeeCount(roleId: string, count: number): void {
    this.employeeCounts[roleId] = count;
  }
}

// Export singleton instances for tests
export const mockScheduleRepo = new MockScheduleRepository();
export const mockEmployeeRepo = new MockEmployeeRepository();
export const mockRoomRepo = new MockRoomRepository();
export const mockPatientRepo = new MockPatientRepository();
export const mockActivityRepo = new MockActivityRepository();
export const mockSessionRepo = new MockSessionRepository();
export const mockRoleRepo = new MockRoleRepository();
