/**
 * Unit tests for consecutive sessions validation logic
 * These tests are completely isolated and don't require database setup
 */
declare function timeStringToMinutes(timeStr: string): number;
declare const mapAPIWeekDayToPrisma: jest.Mock<any, any, any>;
declare function validatePatientConsecutiveSessionsCore(patientId: string, sessionId: string, day: string, startTime: string, endTime: string, existingSessions: any[]): Promise<{
    valid: boolean;
    warning?: string;
    consecutiveCount?: number;
}>;
//# sourceMappingURL=consecutiveSessions.unit.test.d.ts.map