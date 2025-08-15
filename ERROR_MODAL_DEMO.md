# Error Modal Implementation

## Overview

The application now shows proper error modals instead of basic `alert()` popups for schedule generation failures. This provides a much better user experience with detailed error information.

## What Changed

### 1. Enhanced API Error Handling
- Updated `ApiError` class to include `details` field
- Modified API response handling to extract both `error` and `details` from server responses

### 2. New ErrorModal Component
- Created a reusable `ErrorModal` component
- Shows structured error information with title, message, and optional details
- Proper Hebrew text direction and styling

### 3. Updated ScheduleView Component
- Replaced `alert()` calls with `ErrorModal` for schedule generation errors
- Maintains error state properly
- Shows detailed validation messages when schedule generation fails

## How It Works

### Schedule Generation Errors

When schedule generation fails due to insufficient time slots, the server now returns:

```json
{
  "error": "Schedule generation failed",
  "details": "Cannot generate schedule - insufficient available time slots for employees:\nHigh Demand: required 100 sessions, only 5 could be scheduled"
}
```

### Error Modal Display

The client shows this in a proper modal with:
- **Title**: "שגיאה ביצירת לוח הזמנים" (Schedule Generation Error)
- **Message**: The main error message from the server
- **Details**: The detailed breakdown of which employees couldn't get their required sessions

### Example Error Scenarios

1. **Insufficient Sessions**: When an employee requires more sessions than available time slots
2. **Blocking Activities**: When activities block too much time preventing adequate scheduling
3. **No Employees/Rooms**: Basic validation errors

## Testing the Implementation

To test the error modal:

1. Create an employee with very high session requirements (e.g., 100 sessions/week)
2. Set limited working hours (e.g., 1 hour per day)
3. Try to generate a schedule
4. The error modal will show detailed information about why scheduling failed

## Components Created/Modified

### New Components:
- `ErrorModal.tsx` - Main error display modal
- `NotificationModal.tsx` - General notification modal (future use)

### Modified Components:
- `ScheduleView.tsx` - Now uses ErrorModal instead of alerts
- `api.ts` - Enhanced to handle detailed error messages

### Server Changes:
- Enhanced error messages in schedule generation validation
- Proper HTTP 400 responses with detailed error information

## Benefits

1. **Better UX**: Professional modal instead of browser alerts
2. **Detailed Information**: Users see exactly why scheduling failed
3. **Proper Styling**: Consistent with Material-UI design
4. **Hebrew Support**: Proper RTL text direction
5. **Accessibility**: Proper ARIA labels and keyboard support
