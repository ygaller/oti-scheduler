import { GoogleSheetsExportResult } from '../types/google';
import { googleAuthService } from '../services';

// Import existing types from the main types file
import { Session, Employee, Room, Patient, Activity } from '../types';

interface GoogleSheetsExportOptions {
  sessions: Session[];
  employees: Employee[];
  rooms: Room[];
  patients: Patient[];
  activities: Activity[];
}

type ExportType = 'all' | 'employee' | 'room' | 'patient';

class GoogleSheetsService {
  private readonly API_BASE = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/google`;

  /**
   * Export schedule to Google Sheets - Main spreadsheet with all data
   */
  async exportScheduleToSheets(
    scheduleData: GoogleSheetsExportOptions,
    scheduleName: string
  ): Promise<GoogleSheetsExportResult> {
    return this.performExport(scheduleData, scheduleName, 'all');
  }

  /**
   * Export employee schedule only
   */
  async exportEmployeeSchedule(
    scheduleData: GoogleSheetsExportOptions,
    scheduleName: string
  ): Promise<GoogleSheetsExportResult> {
    return this.performExport(scheduleData, scheduleName, 'employee');
  }

  /**
   * Export room schedule only
   */
  async exportRoomSchedule(
    scheduleData: GoogleSheetsExportOptions,
    scheduleName: string
  ): Promise<GoogleSheetsExportResult> {
    return this.performExport(scheduleData, scheduleName, 'room');
  }

  /**
   * Export individual patient schedule
   */
  async exportPatientSchedule(
    scheduleData: GoogleSheetsExportOptions,
    scheduleName: string,
    patientId: string
  ): Promise<GoogleSheetsExportResult> {
    return this.performExport(scheduleData, scheduleName, 'patient', patientId);
  }

  /**
   * Export multiple individual patient schedules (creates separate spreadsheet for each)
   */
  async exportAllPatientSchedules(
    scheduleData: GoogleSheetsExportOptions,
    scheduleName: string
  ): Promise<GoogleSheetsExportResult[]> {
    const activePatients = scheduleData.patients.filter(p => p.isActive);
    const results: GoogleSheetsExportResult[] = [];

    for (const patient of activePatients) {
      try {
        const result = await this.exportPatientSchedule(
          scheduleData,
          scheduleName,
          patient.id
        );
        results.push(result);
        
        // Add small delay between exports to avoid hitting API limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error exporting patient ${patient.firstName} ${patient.lastName}:`, error);
        results.push({
          success: false,
          error: 'Export failed',
          message: `Failed to export schedule for ${patient.firstName} ${patient.lastName}`
        });
      }
    }

    return results;
  }

  /**
   * Core export function
   */
  private async performExport(
    scheduleData: GoogleSheetsExportOptions,
    scheduleName: string,
    exportType: ExportType,
    patientId?: string
  ): Promise<GoogleSheetsExportResult> {
    try {
      // Check authentication
      const authStatus = await googleAuthService.getAuthStatus();
      if (!authStatus.isAuthenticated) {
        return {
          success: false,
          error: 'Authentication required',
          message: 'Please connect to Google first'
        };
      }

      // Get the actual stored auth data
      const storedAuth = await googleAuthService.getStoredAuthData();
      if (!storedAuth) {
        return {
          success: false,
          error: 'Authentication required',
          message: 'Please connect to Google first'
        };
      }

      // Validate input data
      if (!scheduleData.sessions || scheduleData.sessions.length === 0) {
        return {
          success: false,
          error: 'No data to export',
          message: 'There are no sessions to export'
        };
      }

      if (exportType === 'patient' && !patientId) {
        return {
          success: false,
          error: 'Invalid request',
          message: 'Patient ID is required for patient export'
        };
      }

      // Prepare export request
      const exportRequest = {
        scheduleData,
        scheduleName,
        exportType,
        patientId
      };

      // Call backend export API
      console.log('Sending export request to backend:', {
        url: `${this.API_BASE}/sheets/export`,
        hasAuth: !!storedAuth,
        exportRequest
      });

      const response = await fetch(`${this.API_BASE}/sheets/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth: storedAuth,
          exportRequest
        }),
      });

      const result = await response.json();
      console.log('Backend export response:', {
        status: response.status,
        ok: response.ok,
        result
      });

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Export failed',
          message: result.message || 'Unknown error occurred'
        };
      }

      return result;
    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);
      return {
        success: false,
        error: 'Network error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if Google Sheets export is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const authStatus = await googleAuthService.getAuthStatus();
      return authStatus.isAuthenticated;
    } catch (error) {
      console.error('Error checking Google Sheets availability:', error);
      return false;
    }
  }

  /**
   * Get user info for connected Google account
   */
  async getConnectedUserInfo() {
    try {
      const authStatus = await googleAuthService.getAuthStatus();
      return authStatus.userInfo || null;
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  }

  /**
   * Validate that schedule data is properly formatted for export
   */
  validateScheduleData(scheduleData: GoogleSheetsExportOptions): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!scheduleData) {
      errors.push('Schedule data is required');
      return { isValid: false, errors };
    }

    if (!Array.isArray(scheduleData.sessions)) {
      errors.push('Sessions must be an array');
    }

    if (!Array.isArray(scheduleData.employees)) {
      errors.push('Employees must be an array');
    }

    if (!Array.isArray(scheduleData.rooms)) {
      errors.push('Rooms must be an array');
    }

    if (!Array.isArray(scheduleData.patients)) {
      errors.push('Patients must be an array');
    }

    if (!Array.isArray(scheduleData.activities)) {
      errors.push('Activities must be an array');
    }

    // Check for required fields in sessions
    if (scheduleData.sessions && scheduleData.sessions.length > 0) {
      const sampleSession = scheduleData.sessions[0];
      if (!sampleSession.day || !sampleSession.startTime || !sampleSession.endTime) {
        errors.push('Sessions must have day, startTime, and endTime');
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}

// Create singleton instance
const googleSheetsService = new GoogleSheetsService();
export default googleSheetsService;
