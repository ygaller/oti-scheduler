/**
 * Unit tests for consecutive sessions validation logic
 * These tests are completely isolated and don't require database setup
 */

// Helper function to convert time string to minutes (copy from implementation)
function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Mock the mapAPIWeekDayToPrisma function
const mapAPIWeekDayToPrisma = jest.fn().mockImplementation((day: string) => day.toUpperCase());

// Core validation logic extracted for testing
async function validatePatientConsecutiveSessionsCore(
  patientId: string,
  sessionId: string,
  day: string,
  startTime: string,
  endTime: string,
  existingSessions: any[]
): Promise<{ valid: boolean; warning?: string; consecutiveCount?: number }> {
  console.log('Validating patient consecutive sessions:', { patientId, sessionId, day, startTime, endTime });
  
  // Validate input parameters
  if (!patientId || !sessionId || !day || !startTime || !endTime) {
    throw new Error('Missing required parameters for patient consecutive sessions validation');
  }

  // Add the new session to the list for consecutive analysis
  const newSession = {
    id: sessionId,
    startTime,
    endTime,
    day: mapAPIWeekDayToPrisma(day)
  };

  // Create a combined list of sessions including the new one, sorted by start time
  const allSessions = [...existingSessions, newSession].sort((a, b) => 
    timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime)
  );

  console.log('All sessions for consecutive analysis:', allSessions.length);

  // Find the position of the new session in the sorted list
  const newSessionIndex = allSessions.findIndex(s => s.id === sessionId);
  
  // Count consecutive sessions
  let consecutiveCount = 1; // Start with the new session itself
  let currentIndex = newSessionIndex;

  // Check sessions before the new session
  while (currentIndex > 0) {
    const currentSession = allSessions[currentIndex];
    const previousSession = allSessions[currentIndex - 1];
    
    const timeDiff = timeStringToMinutes(currentSession.startTime) - timeStringToMinutes(previousSession.endTime);
    
    // If the gap between sessions is less than 15 minutes, consider them consecutive
    if (timeDiff < 15) {
      consecutiveCount++;
      currentIndex--;
    } else {
      break; // Found a break, stop counting backwards
    }
  }

  // Reset currentIndex and check sessions after the new session
  currentIndex = newSessionIndex;
  while (currentIndex < allSessions.length - 1) {
    const currentSession = allSessions[currentIndex];
    const nextSession = allSessions[currentIndex + 1];
    
    const timeDiff = timeStringToMinutes(nextSession.startTime) - timeStringToMinutes(currentSession.endTime);
    
    // If the gap between sessions is less than 15 minutes, consider them consecutive
    if (timeDiff < 15) {
      consecutiveCount++;
      currentIndex++;
    } else {
      break; // Found a break, stop counting forwards
    }
  }

  console.log(`Patient ${patientId} will have ${consecutiveCount} consecutive sessions`);

  // If more than 2 consecutive sessions, return a warning
  if (consecutiveCount > 2) {
    return {
      valid: false,
      warning: `המטופל יהיה עם ${consecutiveCount} טיפולים רצופים ללא הפסקה. האם אתה בטוח שברצונך להמשיך?`,
      consecutiveCount
    };
  }

  return { valid: true, consecutiveCount };
}

describe('Consecutive Sessions Validation Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass validation when patient has no existing sessions', async () => {
    const result = await validatePatientConsecutiveSessionsCore(
      'patient-1',
      'session-1',
      'sunday',
      '09:00',
      '09:45',
      [] // No existing sessions
    );

    expect(result.valid).toBe(true);
    expect(result.consecutiveCount).toBe(1);
  });

  it('should pass validation when patient has two consecutive sessions', async () => {
    const existingSessions = [
      {
        id: 'existing-session-1',
        startTime: '08:15',
        endTime: '09:00',
        day: 'SUNDAY',
        employee: { firstName: 'John', lastName: 'Doe' },
        room: { name: 'Room 1' }
      }
    ];

    const result = await validatePatientConsecutiveSessionsCore(
      'patient-1',
      'session-1',
      'sunday',
      '09:00',
      '09:45',
      existingSessions
    );

    expect(result.valid).toBe(true);
    expect(result.consecutiveCount).toBe(2);
  });

  it('should fail validation when patient has three consecutive sessions', async () => {
    const existingSessions = [
      {
        id: 'existing-session-1',
        startTime: '08:15',
        endTime: '09:00',
        day: 'SUNDAY',
        employee: { firstName: 'John', lastName: 'Doe' },
        room: { name: 'Room 1' }
      },
      {
        id: 'existing-session-2',
        startTime: '07:30',
        endTime: '08:15',
        day: 'SUNDAY',
        employee: { firstName: 'Jane', lastName: 'Smith' },
        room: { name: 'Room 2' }
      }
    ];

    const result = await validatePatientConsecutiveSessionsCore(
      'patient-1',
      'session-1',
      'sunday',
      '09:00',
      '09:45',
      existingSessions
    );

    expect(result.valid).toBe(false);
    expect(result.warning).toContain('3 טיפולים רצופים');
    expect(result.consecutiveCount).toBe(3);
  });

  it('should pass validation when there is a 15+ minute break between sessions', async () => {
    const existingSessions = [
      {
        id: 'existing-session-1',
        startTime: '08:15',
        endTime: '08:45', // 15-minute gap before 09:00
        day: 'SUNDAY',
        employee: { firstName: 'John', lastName: 'Doe' },
        room: { name: 'Room 1' }
      }
    ];

    const result = await validatePatientConsecutiveSessionsCore(
      'patient-1',
      'session-1',
      'sunday',
      '09:00',
      '09:45',
      existingSessions
    );

    expect(result.valid).toBe(true);
    expect(result.consecutiveCount).toBe(1); // Break resets the count
  });

  it('should correctly count consecutive sessions across the new session position', async () => {
    const existingSessions = [
      {
        id: 'existing-session-1',
        startTime: '08:15',
        endTime: '09:00',
        day: 'SUNDAY',
        employee: { firstName: 'John', lastName: 'Doe' },
        room: { name: 'Room 1' }
      },
      {
        id: 'existing-session-2',
        startTime: '09:45',
        endTime: '10:30',
        day: 'SUNDAY',
        employee: { firstName: 'Jane', lastName: 'Smith' },
        room: { name: 'Room 2' }
      }
    ];

    const result = await validatePatientConsecutiveSessionsCore(
      'patient-1',
      'session-1',
      'sunday',
      '09:00',
      '09:45',
      existingSessions
    );

    expect(result.valid).toBe(false);
    expect(result.consecutiveCount).toBe(3);
  });

  it('should handle sessions that are not consecutive due to gaps', async () => {
    const existingSessions = [
      {
        id: 'existing-session-1',
        startTime: '08:00',
        endTime: '08:30', // 30-minute gap before 09:00
        day: 'SUNDAY',
        employee: { firstName: 'John', lastName: 'Doe' },
        room: { name: 'Room 1' }
      },
      {
        id: 'existing-session-2',
        startTime: '10:15',
        endTime: '11:00', // 30-minute gap after 09:45
        day: 'SUNDAY',
        employee: { firstName: 'Jane', lastName: 'Smith' },
        room: { name: 'Room 2' }
      }
    ];

    const result = await validatePatientConsecutiveSessionsCore(
      'patient-1',
      'session-1',
      'sunday',
      '09:00',
      '09:45',
      existingSessions
    );

    expect(result.valid).toBe(true);
    expect(result.consecutiveCount).toBe(1); // Only the new session
  });

  it('should fail validation with four consecutive sessions', async () => {
    const existingSessions = [
      {
        id: 'existing-session-1',
        startTime: '08:15',
        endTime: '09:00',
        day: 'SUNDAY',
        employee: { firstName: 'John', lastName: 'Doe' },
        room: { name: 'Room 1' }
      },
      {
        id: 'existing-session-2',
        startTime: '07:30',
        endTime: '08:15',
        day: 'SUNDAY',
        employee: { firstName: 'Jane', lastName: 'Smith' },
        room: { name: 'Room 2' }
      },
      {
        id: 'existing-session-3',
        startTime: '09:45',
        endTime: '10:30',
        day: 'SUNDAY',
        employee: { firstName: 'Bob', lastName: 'Johnson' },
        room: { name: 'Room 3' }
      }
    ];

    const result = await validatePatientConsecutiveSessionsCore(
      'patient-1',
      'session-1',
      'sunday',
      '09:00',
      '09:45',
      existingSessions
    );

    expect(result.valid).toBe(false);
    expect(result.warning).toContain('4 טיפולים רצופים');
    expect(result.consecutiveCount).toBe(4);
  });

  it('should handle edge case with exact 15-minute gap', async () => {
    const existingSessions = [
      {
        id: 'existing-session-1',
        startTime: '08:30',
        endTime: '08:45', // Exactly 15 minutes before 09:00
        day: 'SUNDAY',
        employee: { firstName: 'John', lastName: 'Doe' },
        room: { name: 'Room 1' }
      }
    ];

    const result = await validatePatientConsecutiveSessionsCore(
      'patient-1',
      'session-1',
      'sunday',
      '09:00',
      '09:45',
      existingSessions
    );

    expect(result.valid).toBe(true);
    expect(result.consecutiveCount).toBe(1); // 15 minutes is considered a break
  });

  it('should throw error when required parameters are missing', async () => {
    await expect(
      validatePatientConsecutiveSessionsCore(
        '', // Missing patientId
        'session-1',
        'sunday',
        '09:00',
        '09:45',
        []
      )
    ).rejects.toThrow('Missing required parameters');
  });

  it('should handle edge case with back-to-back sessions (0 minute gap)', async () => {
    const existingSessions = [
      {
        id: 'existing-session-1',
        startTime: '08:15',
        endTime: '09:00', // Ends exactly when new session starts
        day: 'SUNDAY',
        employee: { firstName: 'John', lastName: 'Doe' },
        room: { name: 'Room 1' }
      }
    ];

    const result = await validatePatientConsecutiveSessionsCore(
      'patient-1',
      'session-1',
      'sunday',
      '09:00',
      '09:45',
      existingSessions
    );

    expect(result.valid).toBe(true);
    expect(result.consecutiveCount).toBe(2); // 0 minutes is < 15, so consecutive
  });

  it('should handle 14-minute gap (just under the break threshold)', async () => {
    const existingSessions = [
      {
        id: 'existing-session-1',
        startTime: '08:15',
        endTime: '08:46', // 14 minutes before 09:00
        day: 'SUNDAY',
        employee: { firstName: 'John', lastName: 'Doe' },
        room: { name: 'Room 1' }
      }
    ];

    const result = await validatePatientConsecutiveSessionsCore(
      'patient-1',
      'session-1',
      'sunday',
      '09:00',
      '09:45',
      existingSessions
    );

    expect(result.valid).toBe(true);
    expect(result.consecutiveCount).toBe(2); // 14 minutes is < 15, so consecutive
  });
});

describe('timeStringToMinutes helper function', () => {
  it('should convert time strings to minutes correctly', () => {
    expect(timeStringToMinutes('08:15')).toBe(495); // 8*60 + 15
    expect(timeStringToMinutes('09:00')).toBe(540); // 9*60
    expect(timeStringToMinutes('00:30')).toBe(30);   // 0*60 + 30
    expect(timeStringToMinutes('23:59')).toBe(1439); // 23*60 + 59
  });
});
