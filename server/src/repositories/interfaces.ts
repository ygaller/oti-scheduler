import { Employee, Room, Session, Schedule, ScheduleConfig, CreateEmployeeDto, UpdateEmployeeDto, CreateRoomDto, UpdateRoomDto, CreateSessionDto, UpdateSessionDto } from '../types';

export interface EmployeeRepository {
  findAll(): Promise<Employee[]>;
  findById(id: string): Promise<Employee | null>;
  create(employee: CreateEmployeeDto): Promise<Employee>;
  update(id: string, employee: UpdateEmployeeDto): Promise<Employee>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
}

export interface RoomRepository {
  findAll(): Promise<Room[]>;
  findById(id: string): Promise<Room | null>;
  create(room: CreateRoomDto): Promise<Room>;
  update(id: string, room: UpdateRoomDto): Promise<Room>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
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
}

export interface ScheduleRepository {
  findAll(): Promise<Schedule[]>;
  findById(id: string): Promise<Schedule | null>;
  findActive(): Promise<Schedule | null>;
  create(sessions: Session[]): Promise<Schedule>;
  setActive(id: string): Promise<Schedule>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
}

export interface SystemConfigRepository {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  deleteAll(): Promise<void>;
  getScheduleConfig(): Promise<ScheduleConfig | null>;
  setScheduleConfig(config: ScheduleConfig): Promise<void>;
}

