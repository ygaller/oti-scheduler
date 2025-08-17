import { CreateRoleDto, Role, Activity, Patient, Session, Schedule, Employee, Room } from '../../src/types';
export declare const createRoleFixture: (overrides?: Partial<CreateRoleDto>) => CreateRoleDto;
export declare const createCompleteRoleFixture: (overrides?: Partial<Role>) => Role;
export declare const createEmployeeFixture: (overrides?: Partial<Employee>) => Employee;
export declare const createRoomFixture: (overrides?: Partial<Room>) => Room;
export declare const createMockRoles: () => Role[];
export declare const validWorkingHours: {
    sunday: {
        startTime: string;
        endTime: string;
    };
    monday: {
        startTime: string;
        endTime: string;
    };
    tuesday: {
        startTime: string;
        endTime: string;
    };
    wednesday: {
        startTime: string;
        endTime: string;
    };
    thursday: {
        startTime: string;
        endTime: string;
    };
};
export declare const createPatientFixture: (overrides?: Partial<Patient>) => Patient;
export declare const createActivityFixture: (overrides?: Partial<Activity>) => Activity;
export declare const createSessionFixture: (overrides?: Partial<Session>) => Session;
export declare const createScheduleFixture: (overrides?: Partial<Schedule>) => Schedule;
export declare const createMockEmployees: (roleIds?: string[]) => Employee[];
export declare const createMockRooms: () => Room[];
export declare const createMockPatients: () => Patient[];
export declare const createMockActivities: () => Activity[];
export declare const getRoleIdsByStringKeys: (roles: Role[]) => Record<string, string>;
export declare const testRoleStringKeys: string[];
//# sourceMappingURL=fixtures.d.ts.map