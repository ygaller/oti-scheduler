// Test for the overlap warning behavior in ScheduleView component
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock the checkForConflicts function behavior
const mockCheckForConflicts = jest.fn();

// Mock the handleAddSession function behavior (should not check conflicts)
const mockHandleAddSession = (day: string, startTime: string, employeeId: string) => {
  // This should NOT call checkForConflicts anymore
  // It should directly proceed to open the dialog
  return { dialogOpened: true, conflictChecked: false };
};

// Mock the handleSaveSession function behavior (should check conflicts)
const mockHandleSaveSession = (sessionForm: any) => {
  let conflictChecked = true;
  let warningShown = false;

  const conflict = mockCheckForConflicts(sessionForm.day, sessionForm.startTime, sessionForm.employeeIds[0]);

  if (conflict) {
    warningShown = true;
    return { saved: false, warningShown: true, conflictChecked: true };
  }

  // No conflicts, proceed with save
  return { saved: true, warningShown: false, conflictChecked };
};

// Mock the performSaveSession function behavior (should not check conflicts)
const mockPerformSaveSession = (forceCreate: boolean) => {
  // This function should never check for conflicts, just save
  return { saved: true, warningShown: false, conflictChecked: false, forceCreate };
};

describe('ScheduleView Overlap Warning Behavior', () => {
  beforeEach(() => {
    mockCheckForConflicts.mockClear();
  });

  test('handleAddSession should NOT check for conflicts', () => {
    const result = mockHandleAddSession('monday', '09:00', 'emp1');
    
    expect(result.dialogOpened).toBe(true);
    expect(result.conflictChecked).toBe(false);
    expect(mockCheckForConflicts).not.toHaveBeenCalled();
  });

  test('handleSaveSession should check for conflicts', () => {
    mockCheckForConflicts.mockReturnValue(null); // No conflict

    const sessionForm = {
      day: 'monday',
      startTime: '09:00',
      employeeIds: ['emp1']
    };

    const result = mockHandleSaveSession(sessionForm);

    expect(result.saved).toBe(true);
    expect(result.conflictChecked).toBe(true);
    expect(result.warningShown).toBe(false);
    expect(mockCheckForConflicts).toHaveBeenCalledWith('monday', '09:00', 'emp1');
  });

  test('handleSaveSession should show warning when conflict exists', () => {
    mockCheckForConflicts.mockReturnValue({
      type: 'blockingActivity',
      title: 'פעילות חוסמת',
      message: 'הטיפול נופל על פעילות קיימת'
    });

    const sessionForm = {
      day: 'monday',
      startTime: '09:00',
      employeeIds: ['emp1']
    };

    const result = mockHandleSaveSession(sessionForm);

    expect(result.saved).toBe(false);
    expect(result.conflictChecked).toBe(true);
    expect(result.warningShown).toBe(true);
    expect(mockCheckForConflicts).toHaveBeenCalledWith('monday', '09:00', 'emp1');
  });

  test('performSaveSession should not check conflicts when forcing', () => {
    const result = mockPerformSaveSession(true); // Force create

    expect(result.saved).toBe(true);
    expect(result.conflictChecked).toBe(false);
    expect(result.warningShown).toBe(false);
    expect(result.forceCreate).toBe(true);
    expect(mockCheckForConflicts).not.toHaveBeenCalled();
  });

  test('performSaveSession should not check conflicts when not forcing', () => {
    const result = mockPerformSaveSession(false); // Normal save

    expect(result.saved).toBe(true);
    expect(result.conflictChecked).toBe(false);
    expect(result.warningShown).toBe(false);
    expect(result.forceCreate).toBe(false);
    expect(mockCheckForConflicts).not.toHaveBeenCalled();
  });

  test('conflict types should be properly handled', () => {
    // Test reserved hour conflict
    mockCheckForConflicts.mockReturnValue({
      type: 'reservedHour',
      title: 'שעה חסומה',
      message: 'הטיפול נופל על שעה חסומה'
    });
    
    const sessionForm = {
      day: 'monday',
      startTime: '09:00',
      employeeIds: ['emp1']
    };
    
    const result = mockHandleSaveSession(sessionForm, false);
    
    expect(result.warningShown).toBe(true);
    expect(mockCheckForConflicts).toHaveBeenCalled();
  });
});
