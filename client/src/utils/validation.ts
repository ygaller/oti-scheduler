/**
 * Client-side validation utilities
 */

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  if (!email.trim()) return true; // Empty emails are valid (optional field)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Gets email validation error message
 */
export const getEmailValidationError = (email: string): string | null => {
  if (!email.trim()) return null; // Empty emails are valid
  if (!isValidEmail(email)) {
    return 'כתובת אימייל לא תקינה';
  }
  return null;
};
