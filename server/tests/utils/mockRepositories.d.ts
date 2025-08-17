import { ScheduleRepository, EmployeeRepository, RoomRepository, PatientRepository, ActivityRepository, SessionRepository, RoleRepository } from '../../src/repositories/interfaces';
import { Schedule, Session, Employee, Room, Patient, Activity, Role, CreateEmployeeDto, CreateRoomDto, CreateRoleDto, UpdateRoleDto } from '../../src/types';
export declare class MockScheduleRepository implements ScheduleRepository {
    private schedules;
    private idCounter;
    findAll(): Promise<Schedule[]>;
    findById(id: string): Promise<Schedule | null>;
    findActive(): Promise<Schedule | null>;
    create(sessionsOrScheduleData: Session[] | Partial<Schedule>): Promise<Schedule>;
    setActive(id: string): Promise<Schedule>;
    delete(id: string): Promise<void>;
    deleteAll(): Promise<void>;
    reset(): void;
    setSchedules(schedules: Schedule[]): void;
}
export declare class MockEmployeeRepository implements EmployeeRepository {
    private employees;
    private idCounter;
    findAll(includeInactive?: boolean): Promise<Employee[]>;
    findById(id: string): Promise<Employee | null>;
    create(employee: CreateEmployeeDto): Promise<Employee>;
    update(id: string, employee: Partial<CreateEmployeeDto>): Promise<Employee>;
    setActive(id: string, isActive: boolean): Promise<Employee>;
    delete(id: string): Promise<void>;
    deleteAll(): Promise<void>;
    reset(): void;
    setEmployees(employees: Employee[]): void;
}
export declare class MockRoomRepository implements RoomRepository {
    private rooms;
    private idCounter;
    findAll(includeInactive?: boolean): Promise<Room[]>;
    findById(id: string): Promise<Room | null>;
    create(room: CreateRoomDto): Promise<Room>;
    update(id: string, room: Partial<CreateRoomDto>): Promise<Room>;
    setActive(id: string, isActive: boolean): Promise<Room>;
    delete(id: string): Promise<void>;
    deleteAll(): Promise<void>;
    reset(): void;
    setRooms(rooms: Room[]): void;
}
export declare class MockPatientRepository implements PatientRepository {
    private patients;
    private idCounter;
    findAll(includeInactive?: boolean): Promise<Patient[]>;
    findById(id: string): Promise<Patient | null>;
    create(patient: Omit<Patient, 'id'>): Promise<Patient>;
    update(id: string, patient: Partial<Omit<Patient, 'id'>>): Promise<Patient>;
    setActive(id: string, isActive: boolean): Promise<Patient>;
    delete(id: string): Promise<void>;
    deleteAll(): Promise<void>;
    reset(): void;
    setPatients(patients: Patient[]): void;
}
export declare class MockActivityRepository implements ActivityRepository {
    private activities;
    private idCounter;
    findAll(): Promise<Activity[]>;
    findById(id: string): Promise<Activity | null>;
    create(activity: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Activity>;
    update(id: string, activity: Partial<Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Activity>;
    setActive(id: string, isActive: boolean): Promise<Activity>;
    delete(id: string): Promise<void>;
    deleteAll(): Promise<void>;
    reset(): void;
    setActivities(activities: Activity[]): void;
}
export declare class MockSessionRepository implements SessionRepository {
    private sessions;
    private idCounter;
    findAll(): Promise<Session[]>;
    findById(id: string): Promise<Session | null>;
    create(session: Omit<Session, 'id'>): Promise<Session>;
    update(id: string, session: Partial<Omit<Session, 'id'>>): Promise<Session>;
    delete(id: string): Promise<void>;
    addPatient(sessionId: string, patientId: string): Promise<Session>;
    removePatient(sessionId: string, patientId: string): Promise<Session>;
    updatePatients(sessionId: string, patientIds: string[]): Promise<Session>;
    findByScheduleId(scheduleId: string): Promise<Session[]>;
    deleteAll(): Promise<void>;
    deleteByScheduleId(scheduleId: string): Promise<void>;
    reset(): void;
    setSessions(sessions: Session[]): void;
}
export declare class MockRoleRepository implements RoleRepository {
    private roles;
    private employeeCounts;
    private roleCounter;
    findAll(includeInactive?: boolean): Promise<Role[]>;
    findById(id: string): Promise<Role | null>;
    findByName(name: string): Promise<Role | null>;
    findByRoleStringKey(roleStringKey: string): Promise<Role | null>;
    create(data: CreateRoleDto): Promise<Role>;
    update(id: string, data: UpdateRoleDto): Promise<Role | null>;
    setActive(id: string, isActive: boolean): Promise<Role | null>;
    delete(id: string): Promise<{
        success: boolean;
        error?: string;
        notFound?: boolean;
    }>;
    getEmployeeCount(roleId: string): Promise<number>;
    clear(): void;
    setRoles(roles: Role[]): void;
    setEmployeeCount(roleId: string, count: number): void;
}
export declare const mockScheduleRepo: MockScheduleRepository;
export declare const mockEmployeeRepo: MockEmployeeRepository;
export declare const mockRoomRepo: MockRoomRepository;
export declare const mockPatientRepo: MockPatientRepository;
export declare const mockActivityRepo: MockActivityRepository;
export declare const mockSessionRepo: MockSessionRepository;
export declare const mockRoleRepo: MockRoleRepository;
//# sourceMappingURL=mockRepositories.d.ts.map