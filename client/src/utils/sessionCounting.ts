import { Session } from '../types';

/**
 * Calculates the fractional count for a single session based on its frequency.
 * Sessions with "every two weeks" frequency count as 0.5, all others count as 1.
 */
export const getSessionFractionalCount = (session: Session): number => {
  return session.everyTwoWeeks ? 0.5 : 1;
};

/**
 * Calculates the total fractional count for an array of sessions.
 * Sessions with "every two weeks" frequency count as 0.5 each, all others count as 1 each.
 */
export const calculateTotalSessionCount = (sessions: Session[]): number => {
  return sessions.reduce((total, session) => total + getSessionFractionalCount(session), 0);
};

/**
 * Calculates the fractional count of sessions for a specific employee.
 * Only counts sessions where the employee is assigned and optionally where patients are assigned.
 */
export const calculateEmployeeSessionCount = (
  sessions: Session[], 
  employeeId: string, 
  requirePatients: boolean = false
): number => {
  const employeeSessions = sessions.filter(session => {
    const hasEmployee = session.employeeIds && session.employeeIds.includes(employeeId);
    const hasPatients = !requirePatients || (session.patients && session.patients.length > 0);
    return hasEmployee && hasPatients;
  });
  
  return calculateTotalSessionCount(employeeSessions);
};

/**
 * Calculates the fractional count of sessions for a specific patient.
 * Only counts sessions where the patient is assigned.
 */
export const calculatePatientSessionCount = (
  sessions: Session[], 
  patientId: string
): number => {
  const patientSessions = sessions.filter(session => 
    session.patients?.some(p => p.id === patientId)
  );
  
  return calculateTotalSessionCount(patientSessions);
};

/**
 * Formats a fractional session count for display.
 * Shows whole numbers without decimals, shows decimals for fractional values.
 */
export const formatSessionCount = (count: number): string => {
  return count % 1 === 0 ? count.toString() : count.toFixed(1);
};

/**
 * Calculates session counts by role for a specific patient.
 * Returns an object with role keys and fractional counts as values.
 */
export const calculateSessionCountsByRole = (
  sessions: Session[], 
  patientId: string, 
  employees: any[]
): Record<string, number> => {
  const sessionsByRole: Record<string, number> = {};
  
  sessions.forEach(session => {
    // Only count sessions where this patient is assigned
    if (session.patients?.some(p => p.id === patientId)) {
      // For multi-employee sessions, count for all employees assigned to the session
      const sessionEmployees = session.employeeIds ? 
        employees.filter(e => session.employeeIds.includes(e.id)) : [];
      
      const sessionCount = getSessionFractionalCount(session);
      
      sessionEmployees.forEach(employee => {
        if (employee && employee.role?.roleStringKey) {
          sessionsByRole[employee.role.roleStringKey] = 
            (sessionsByRole[employee.role.roleStringKey] || 0) + sessionCount;
        }
      });
    }
  });
  
  return sessionsByRole;
};
