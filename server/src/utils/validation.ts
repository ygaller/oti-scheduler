/**
 * Utility functions for validation
 */

import { ReservedHour } from '../types';

/**
 * Validates if a string is a valid UUID format (any version)
 */
export const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Middleware function to validate UUID parameters
 */
export const validateUUID = (paramName: string = 'id') => {
  return (req: any, res: any, next: any) => {
    const paramValue = req.params[paramName];
    if (!isValidUUID(paramValue)) {
      return res.status(400).json({ error: `Invalid ${paramName} format` });
    }
    next();
  };
};

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates that reserved hours do not overlap with each other
 */
export const validateReservedHours = (reservedHours: ReservedHour[]): string | null => {
  // Helper function to convert time string to minutes since midnight
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Check for overlaps within the same day
  for (let i = 0; i < reservedHours.length; i++) {
    for (let j = i + 1; j < reservedHours.length; j++) {
      const hour1 = reservedHours[i];
      const hour2 = reservedHours[j];

      // Only check within the same day
      if (hour1.day === hour2.day) {
        const start1 = timeToMinutes(hour1.startTime);
        const end1 = timeToMinutes(hour1.endTime);
        const start2 = timeToMinutes(hour2.startTime);
        const end2 = timeToMinutes(hour2.endTime);

        // Check for overlap (but allow consecutive times)
        if (start1 < end2 && start2 < end1) {
          return `Reserved hours overlap on ${hour1.day}: ${hour1.startTime}-${hour1.endTime} and ${hour2.startTime}-${hour2.endTime}`;
        }
      }
    }
  }

  return null; // No overlaps found
};
