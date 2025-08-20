import { Employee, Patient, Room, Session, Schedule, Activity, Role, CreateEmployeeDto, UpdateEmployeeDto, CreatePatientDto, UpdatePatientDto, CreateRoomDto, UpdateRoomDto, CreateSessionDto, UpdateSessionDto, CreateActivityDto, UpdateActivityDto, CreateRoleDto, UpdateRoleDto } from '../types';

export interface EmployeeRepository {
  findAll(includeInactive?: boolean): Promise<Employee[]>;
  findById(id: string): Promise<Employee | null>;
  create(employee: CreateEmployeeDto): Promise<Employee>;
  update(id: string, employee: UpdateEmployeeDto): Promise<Employee>;
  setActive(id: string, isActive: boolean): Promise<Employee>;
  delete(id: string): Promise<void>; // Keep for backward compatibility, but won't be used in UI
  deleteAll(): Promise<void>; // Keep for backward compatibility, but won't be used in UI
}

export interface PatientRepository {
  findAll(includeInactive?: boolean): Promise<Patient[]>;
  findById(id: string): Promise<Patient | null>;
  create(patient: CreatePatientDto): Promise<Patient>;
  update(id: string, patient: UpdatePatientDto): Promise<Patient>;
  setActive(id: string, isActive: boolean): Promise<Patient>;
  delete(id: string): Promise<void>; // Keep for backward compatibility, but won't be used in UI
  deleteAll(): Promise<void>; // Keep for backward compatibility, but won't be used in UI
}

export interface RoomRepository {
  findAll(includeInactive?: boolean): Promise<Room[]>;
  findById(id: string): Promise<Room | null>;
  create(room: CreateRoomDto): Promise<Room>;
  update(id: string, room: UpdateRoomDto): Promise<Room>;
  setActive(id: string, isActive: boolean): Promise<Room>;
  delete(id: string): Promise<void>; // Keep for backward compatibility, but won't be used in UI
  deleteAll(): Promise<void>; // Keep for backward compatibility, but won't be used in UI
}

export interface SessionRepository {
  findAll(): Promise<Session[]>;
  findById(id: string): Promise<Session | null>;
  findByScheduleId(scheduleId: string): Promise<Session[]>;
  create(session: CreateSessionDto): Promise<Session>;
  update(id: string, session: UpdateSessionDto): Promise<Session>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
  deleteByScheduleId(scheduleId: string): Promise<void>;
  addPatient(sessionId: string, patientId: string): Promise<Session>;
  removePatient(sessionId: string, patientId: string): Promise<Session>;
}

export interface ScheduleRepository {
  findAll(): Promise<Schedule[]>;
  findById(id: string): Promise<Schedule | null>;
  create(sessions: Session[]): Promise<Schedule>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
}



export interface ActivityRepository {
  findAll(): Promise<Activity[]>;
  findById(id: string): Promise<Activity | null>;
  create(activity: CreateActivityDto): Promise<Activity>;
  update(id: string, activity: UpdateActivityDto): Promise<Activity>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
}

export interface RoleRepository {
  findAll(includeInactive?: boolean): Promise<Role[]>;
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  findByRoleStringKey(roleStringKey: string): Promise<Role | null>;
  create(role: CreateRoleDto): Promise<Role>;
  update(id: string, role: UpdateRoleDto): Promise<Role | null>;
  setActive(id: string, isActive: boolean): Promise<Role | null>;
  delete(id: string): Promise<{ success: boolean; error?: string; notFound?: boolean }>;
  getEmployeeCount(roleId: string): Promise<number>;
  getSessionStats(roleId: string): Promise<{ assignedSessions: number; allocatedSessions: number }>;
}

