/**
 * Server-side utility functions for fractional session counting.
 * Sessions with "every two weeks" frequency count as 0.5, all others count as 1.
 */

/**
 * Calculates the fractional count for a single session based on its frequency.
 * Sessions with "every two weeks" frequency count as 0.5, all others count as 1.
 */
export const getSessionFractionalCount = (everyTwoWeeks: boolean): number => {
  return everyTwoWeeks ? 0.5 : 1;
};

/**
 * Calculates the total fractional count for sessions with their everyTwoWeeks flags.
 */
export const calculateTotalSessionCount = (sessions: Array<{ everyTwoWeeks?: boolean }>): number => {
  return sessions.reduce((total, session) => total + getSessionFractionalCount(session.everyTwoWeeks || false), 0);
};
