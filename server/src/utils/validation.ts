/**
 * Utility functions for validation
 */

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
