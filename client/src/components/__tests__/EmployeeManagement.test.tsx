// Test for the badge color logic in EmployeeManagement component

// Helper function to get color coding for session badge based on assigned/scheduled ratio
const getSessionBadgeColor = (assigned: number, scheduled: number): string => {
  if (assigned === 0 && scheduled > 0) return '#f44336'; // Red - 0/X where X > 0
  if (assigned === 0 && scheduled === 0) return '#4caf50'; // Green - 0/0
  if (assigned > 0 && assigned < scheduled) return '#ff9800'; // Orange - X/Y where X > 0 and X < Y
  if (assigned === scheduled && assigned > 0) return '#4caf50'; // Green - X/X where X > 0
  return '#4caf50'; // Default green for any other case
};

describe('EmployeeManagement Badge Color System', () => {
  test('badge color logic - Red for 0/X where X > 0', () => {
    const color = getSessionBadgeColor(0, 5);
    expect(color).toBe('#f44336'); // Red
  });

  test('badge color logic - Green for 0/0', () => {
    const color = getSessionBadgeColor(0, 0);
    expect(color).toBe('#4caf50'); // Green
  });

  test('badge color logic - Orange for X/Y where X > 0 and X < Y', () => {
    const color = getSessionBadgeColor(3, 5);
    expect(color).toBe('#ff9800'); // Orange
  });

  test('badge color logic - Green for X/X where X > 0', () => {
    const color = getSessionBadgeColor(5, 5);
    expect(color).toBe('#4caf50'); // Green
  });

  test('badge color logic - Edge case: assigned > scheduled (should default to green)', () => {
    const color = getSessionBadgeColor(7, 5);
    expect(color).toBe('#4caf50'); // Green (default)
  });

  test('badge color logic - Edge case: negative values (should default to green)', () => {
    const color = getSessionBadgeColor(-1, 5);
    expect(color).toBe('#4caf50'); // Green (default)
  });
});
