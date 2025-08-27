import { google, sheets_v4 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import GoogleAuthService from './googleAuthService';
import { StoredGoogleAuth, GoogleSheetsExportRequest, GoogleSheetsExportResponse } from '../types/google';

// Types for our export data (matching Excel export)
interface ExportOptions {
  sessions: any[];
  employees: any[];
  rooms: any[];
  patients: any[];
  activities: any[];
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  color: string;
  isActive: boolean;
  role: string;
  roleId: string;
  reservedHours: any[];
}

interface Room {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  color: string;
  isActive: boolean;
}

interface Session {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  employeeIds: string[];
  roomId: string;
  patients: Patient[];
  notes?: string;
  everyTwoWeeks?: boolean;
}

interface Activity {
  id: string;
  name: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  dayOverrides: Record<string, any>;
}

type WeekDay = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday';

const WEEK_DAYS: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
const DAY_LABELS: Record<WeekDay, string> = {
  sunday: 'ראשון',
  monday: 'שני',
  tuesday: 'שלישי',
  wednesday: 'רביעי',
  thursday: 'חמישי'
};

class GoogleSheetsService {
  private googleAuthService: GoogleAuthService;

  constructor() {
    this.googleAuthService = new GoogleAuthService();
  }

  /**
   * Create authenticated Google Sheets client
   */
  private async createSheetsClient(auth: StoredGoogleAuth): Promise<sheets_v4.Sheets> {
    const oauth2Client = this.googleAuthService.createAuthenticatedClient(
      auth.accessToken,
      auth.refreshToken
    );

    return google.sheets({ version: 'v4', auth: oauth2Client });
  }

  /**
   * Generate time slots (matching Excel export)
   */
  private generateTimeSlots(): string[] {
    const slots = [];
    for (let hour = 7; hour < 17; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      slots.push(time);
    }
    return slots;
  }

  /**
   * Get the next hour for session overlap checking
   */
  private getNextHour(time: string): string {
    const [hours] = time.split(':').map(Number);
    const nextHour = hours + 1;
    return `${nextHour.toString().padStart(2, '0')}:00`;
  }

  /**
   * Get effective time range for an activity on a specific day
   */
  private getActivityTimeForDay(activity: Activity, day: WeekDay): { startTime: string; endTime: string } | null {
    const dayOverride = activity.dayOverrides[day];
    
    if (dayOverride !== undefined) {
      if (dayOverride === null) {
        return null;
      }
      return dayOverride;
    }
    
    if (activity.defaultStartTime && activity.defaultEndTime) {
      return {
        startTime: activity.defaultStartTime,
        endTime: activity.defaultEndTime
      };
    }
    
    return null;
  }

  /**
   * Check if a time is within an activity period
   */
  private isTimeInActivityPeriod(time: string, activities: Activity[], day: WeekDay): Activity | null {
    const timeToMinutes = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const targetMinutes = timeToMinutes(time);

    for (const activity of activities) {
      const timeRange = this.getActivityTimeForDay(activity, day);
      if (timeRange) {
        const startMinutes = timeToMinutes(timeRange.startTime);
        const endMinutes = timeToMinutes(timeRange.endTime);
        if (targetMinutes >= startMinutes && targetMinutes < endMinutes) {
          return activity;
        }
      }
    }
    
    return null;
  }

  /**
   * Helper function to find all sessions for an employee in a time slot
   */
  private findSessionsForEmployeeInTimeSlot(
    sessions: Session[], 
    employeeId: string, 
    time: string, 
    day: WeekDay
  ): Session[] {
    const nextHour = this.getNextHour(time);
    return sessions.filter((s: Session) => 
      s.day === day &&
      s.employeeIds && 
      s.employeeIds.includes(employeeId) && 
      s.startTime >= time && 
      s.startTime < nextHour
    ).sort((a: Session, b: Session) => a.startTime.localeCompare(b.startTime));
  }

  /**
   * Helper function to find all sessions for a room in a time slot
   */
  private findSessionsForRoomInTimeSlot(
    sessions: Session[], 
    roomId: string, 
    time: string, 
    day: WeekDay
  ): Session[] {
    const nextHour = this.getNextHour(time);
    return sessions.filter((s: Session) => 
      s.day === day &&
      s.roomId === roomId && 
      s.startTime >= time && 
      s.startTime < nextHour
    ).sort((a: Session, b: Session) => a.startTime.localeCompare(b.startTime));
  }

  /**
   * Get role name for display
   */
  private getRoleName(role: string, roleId: string): string {
    // This is a simplified version - in a real app you'd look up the role
    return role || 'לא ידוע';
  }

  /**
   * Clean schedule name by converting non-Hebrew/English letters and non-numbers to underscores
   */
  private cleanScheduleName(name: string): string {
    // Replace any character that is not Hebrew letter, English letter, or number with underscore
    return name.replace(/[^\u0590-\u05FFa-zA-Z0-9]/g, '_');
  }

  /**
   * Generate timestamp in yyyymmdd_hhmm format
   */
  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}`;
  }

  /**
   * Create employee schedule worksheet data
   */
  private createEmployeeScheduleData(options: ExportOptions): any[][] {
    const { sessions, employees, activities } = options;
    const timeSlots = this.generateTimeSlots();
    const sortedEmployees = [...employees].filter((e: Employee) => e.isActive).sort((a: Employee, b: Employee) => 
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
    );

    // Create headers: יום, שעה, פעילויות, then employee columns (2 columns per employee)
    const headers: any[] = ['יום', 'שעה', 'פעילויות'];
    sortedEmployees.forEach((employee: Employee) => {
      headers.push(String(`${String(employee.firstName || '')} ${String(employee.lastName || '')}`));
      headers.push(''); // Second column for the employee (will be merged with first)
    });
    
    const data: any[][] = [headers];
    
    // Create data rows for each day and time slot
    WEEK_DAYS.forEach((day: WeekDay) => {
      const dayLabel = DAY_LABELS[day];
      
      timeSlots.forEach((time, timeIndex) => {
        // Find maximum number of regular sessions for any employee in this time slot
        // Every two weeks sessions go side by side, not in additional rows
        let maxSessionsInTimeSlot = 1;
        sortedEmployees.forEach((employee: Employee) => {
          const employeeSessions = this.findSessionsForEmployeeInTimeSlot(sessions, employee.id, time, day);
          const regularSessionCount = employeeSessions.filter((s: Session) => !s.everyTwoWeeks).length;
          if (regularSessionCount > maxSessionsInTimeSlot) {
            maxSessionsInTimeSlot = regularSessionCount;
          }
        });
        
        // Create rows for this time slot (one or more if there are multiple sessions)
        for (let sessionRowIndex = 0; sessionRowIndex < maxSessionsInTimeSlot; sessionRowIndex++) {
          const row: any[] = [
            timeIndex === 0 && sessionRowIndex === 0 ? String(dayLabel) : '', // Show day only for first time slot and first session row
            sessionRowIndex === 0 ? String(time) : '', // Show time only for first session row
          ];
          
          // Check for activities (only in first session row)
          const activity = sessionRowIndex === 0 ? this.isTimeInActivityPeriod(time, activities, day) : null;
          row.push(activity ? String(activity.name || '') : '');
          
          // Process each employee (2 columns per employee)
          sortedEmployees.forEach((employee: Employee) => {
            const employeeSessions = this.findSessionsForEmployeeInTimeSlot(sessions, employee.id, time, day);
            const regularSessions = employeeSessions.filter((s: Session) => !s.everyTwoWeeks);
            const everyTwoWeeksSessions = employeeSessions.filter((s: Session) => s.everyTwoWeeks);
            
            // Handle every two weeks sessions only in the first row
            if (sessionRowIndex === 0 && everyTwoWeeksSessions.length > 0) {
              // Handle both every two weeks sessions in the first row
              const firstEveryTwoWeeks = everyTwoWeeksSessions[0];
              const secondEveryTwoWeeks = everyTwoWeeksSessions[1];
              
              // First column
              if (firstEveryTwoWeeks) {
                const room = options.rooms.find((r: Room) => r.id === firstEveryTwoWeeks.roomId);
                const patientNames = firstEveryTwoWeeks.patients?.map((p: Patient) => `${String(p.firstName || '')} ${String(p.lastName || '')}`).join(', ') || 'חסר מטופל';
                const employeeNames = firstEveryTwoWeeks.employeeIds?.map((id: string) => {
                  const emp = options.employees.find((e: Employee) => e.id === id);
                  return emp ? `${String(emp.firstName || '')} ${String(emp.lastName || '')}` : '';
                }).filter(Boolean).join(', ') || 'לא ידוע';
                
                let cellContent = `${String(firstEveryTwoWeeks.startTime || '')}-${String(firstEveryTwoWeeks.endTime || '')}\n${String(room?.name || 'לא ידוע')}\n${employeeNames}\n${patientNames}`;
                if (firstEveryTwoWeeks.notes && String(firstEveryTwoWeeks.notes).trim()) {
                  cellContent += `\nהערות: ${String(firstEveryTwoWeeks.notes)}`;
                }
                row.push(String(cellContent));
              } else {
                row.push('');
              }
              
              // Second column
              if (secondEveryTwoWeeks) {
                const room = options.rooms.find((r: Room) => r.id === secondEveryTwoWeeks.roomId);
                const patientNames = secondEveryTwoWeeks.patients?.map((p: Patient) => `${String(p.firstName || '')} ${String(p.lastName || '')}`).join(', ') || 'חסר מטופל';
                const employeeNames = secondEveryTwoWeeks.employeeIds?.map((id: string) => {
                  const emp = options.employees.find((e: Employee) => e.id === id);
                  return emp ? `${String(emp.firstName || '')} ${String(emp.lastName || '')}` : '';
                }).filter(Boolean).join(', ') || 'לא ידוע';
                
                let cellContent = `${String(secondEveryTwoWeeks.startTime || '')}-${String(secondEveryTwoWeeks.endTime || '')}\n${String(room?.name || 'לא ידוע')}\n${employeeNames}\n${patientNames}`;
                if (secondEveryTwoWeeks.notes && String(secondEveryTwoWeeks.notes).trim()) {
                  cellContent += `\nהערות: ${String(secondEveryTwoWeeks.notes)}`;
                }
                row.push(String(cellContent));
              } else {
                row.push('');
              }
              
              return; // Skip regular session handling for this employee
            }
            
            // Handle regular sessions
            const currentSession = regularSessions[sessionRowIndex];
            
            if (currentSession) {
              const room = options.rooms.find((r: Room) => r.id === currentSession.roomId);
              const patientNames = currentSession.patients?.map((p: Patient) => `${String(p.firstName || '')} ${String(p.lastName || '')}`).join(', ') || 'חסר מטופל';
              const employeeNames = currentSession.employeeIds?.map((id: string) => {
                const emp = options.employees.find((e: Employee) => e.id === id);
                return emp ? `${String(emp.firstName || '')} ${String(emp.lastName || '')}` : '';
              }).filter(Boolean).join(', ') || 'לא ידוע';
              
              let cellContent = `${String(currentSession.startTime || '')}-${String(currentSession.endTime || '')}\n${String(room?.name || 'לא ידוע')}\n${employeeNames}\n${patientNames}`;
              if (currentSession.notes && String(currentSession.notes).trim()) {
                cellContent += `\nהערות: ${String(currentSession.notes)}`;
              }
              
              // Regular sessions span both columns
              row.push(String(cellContent)); // First column
              row.push(''); // Second column will be merged
            } else if (sessionRowIndex === 0) {
              // Check for reserved hours if no session (only in first session row)
              const reservedHour = employee.reservedHours?.find((rh: any) => 
                rh.day === day && 
                rh.startTime >= time && 
                rh.startTime < this.getNextHour(time)
              );
              if (reservedHour) {
                const reservedContent = `${String(reservedHour.startTime || '')}-${String(reservedHour.endTime || '')}\nשעות שמורות\n${String(reservedHour.notes || 'ללא הערות')}`;
                row.push(String(reservedContent)); // First column
                row.push(''); // Second column will be merged
              } else {
                row.push(''); // First column
                row.push(''); // Second column
              }
            } else {
              // Empty cells for additional session rows when this employee has no more sessions
              row.push(''); // First column
              row.push(''); // Second column
            }
          });
          
          data.push(row);
        }
      });
    });

    return data;
  }

  /**
   * Create room schedule worksheet data
   */
  private createRoomScheduleData(options: ExportOptions): any[][] {
    const { sessions, rooms, employees, activities } = options;
    const timeSlots = this.generateTimeSlots();
    const sortedRooms = [...rooms].filter((r: Room) => r.isActive).sort((a: Room, b: Room) => a.name.localeCompare(b.name, 'he'));

    // Create headers: יום, שעה, פעילויות, then room columns (2 columns per room)
    const headers: any[] = ['יום', 'שעה', 'פעילויות'];
    sortedRooms.forEach((room: Room) => {
      headers.push(String(room.name || ''));
      headers.push(''); // Second column for the room (will be merged with first)
    });
    
    const data: any[][] = [headers];
    
    // Create data rows for each day and time slot
    WEEK_DAYS.forEach((day: WeekDay) => {
      const dayLabel = DAY_LABELS[day];
      
      timeSlots.forEach((time, timeIndex) => {
        // Find maximum number of regular sessions for any room in this time slot
        // Every two weeks sessions go side by side, not in additional rows
        let maxSessionsInTimeSlot = 1;
        sortedRooms.forEach((room: Room) => {
          const roomSessions = this.findSessionsForRoomInTimeSlot(sessions, room.id, time, day);
          const regularSessionCount = roomSessions.filter((s: Session) => !s.everyTwoWeeks).length;
          if (regularSessionCount > maxSessionsInTimeSlot) {
            maxSessionsInTimeSlot = regularSessionCount;
          }
        });
        
        // Create rows for this time slot (one or more if there are multiple sessions)
        for (let sessionRowIndex = 0; sessionRowIndex < maxSessionsInTimeSlot; sessionRowIndex++) {
          const row: any[] = [
            timeIndex === 0 && sessionRowIndex === 0 ? String(dayLabel) : '', // Show day only for first time slot and first session row
            sessionRowIndex === 0 ? String(time) : '', // Show time only for first session row
          ];
          
          // Check for activities (only in first session row)
          const activity = sessionRowIndex === 0 ? this.isTimeInActivityPeriod(time, activities, day) : null;
          row.push(activity ? String(activity.name || '') : '');
          
          // Process each room (2 columns per room)
          sortedRooms.forEach((room: Room) => {
            const roomSessions = this.findSessionsForRoomInTimeSlot(sessions, room.id, time, day);
            const regularSessions = roomSessions.filter((s: Session) => !s.everyTwoWeeks);
            const everyTwoWeeksSessions = roomSessions.filter((s: Session) => s.everyTwoWeeks);
            
            // Handle every two weeks sessions only in the first row
            if (sessionRowIndex === 0 && everyTwoWeeksSessions.length > 0) {
              // Handle both every two weeks sessions in the first row
              const firstEveryTwoWeeks = everyTwoWeeksSessions[0];
              const secondEveryTwoWeeks = everyTwoWeeksSessions[1];
              
              // First column
              if (firstEveryTwoWeeks) {
                const patientNames = firstEveryTwoWeeks.patients?.map((p: Patient) => `${String(p.firstName || '')} ${String(p.lastName || '')}`).join(', ') || 'חסר מטופל';
                const employeeNames = firstEveryTwoWeeks.employeeIds?.map((id: string) => {
                  const emp = employees.find((e: Employee) => e.id === id);
                  return emp ? `${String(emp.firstName || '')} ${String(emp.lastName || '')}` : '';
                }).filter(Boolean).join(', ') || 'לא ידוע';
                
                let cellContent = `${String(firstEveryTwoWeeks.startTime || '')}-${String(firstEveryTwoWeeks.endTime || '')}\n${employeeNames}\n${patientNames}`;
                if (firstEveryTwoWeeks.notes && String(firstEveryTwoWeeks.notes).trim()) {
                  cellContent += `\nהערות: ${String(firstEveryTwoWeeks.notes)}`;
                }
                row.push(String(cellContent));
              } else {
                row.push('');
              }
              
              // Second column
              if (secondEveryTwoWeeks) {
                const patientNames = secondEveryTwoWeeks.patients?.map((p: Patient) => `${String(p.firstName || '')} ${String(p.lastName || '')}`).join(', ') || 'חסר מטופל';
                const employeeNames = secondEveryTwoWeeks.employeeIds?.map((id: string) => {
                  const emp = employees.find((e: Employee) => e.id === id);
                  return emp ? `${String(emp.firstName || '')} ${String(emp.lastName || '')}` : '';
                }).filter(Boolean).join(', ') || 'לא ידוע';
                
                let cellContent = `${String(secondEveryTwoWeeks.startTime || '')}-${String(secondEveryTwoWeeks.endTime || '')}\n${employeeNames}\n${patientNames}`;
                if (secondEveryTwoWeeks.notes && String(secondEveryTwoWeeks.notes).trim()) {
                  cellContent += `\nהערות: ${String(secondEveryTwoWeeks.notes)}`;
                }
                row.push(String(cellContent));
              } else {
                row.push('');
              }
              
              return; // Skip regular session handling for this room
            }
            
            // Handle regular sessions
            const currentSession = regularSessions[sessionRowIndex];
            
            if (currentSession) {
              const patientNames = currentSession.patients?.map((p: Patient) => `${String(p.firstName || '')} ${String(p.lastName || '')}`).join(', ') || 'חסר מטופל';
              const employeeNames = currentSession.employeeIds?.map((id: string) => {
                const emp = employees.find((e: Employee) => e.id === id);
                return emp ? `${String(emp.firstName || '')} ${String(emp.lastName || '')}` : '';
              }).filter(Boolean).join(', ') || 'לא ידוע';
              
              let cellContent = `${String(currentSession.startTime || '')}-${String(currentSession.endTime || '')}\n${employeeNames}\n${patientNames}`;
              if (currentSession.notes && String(currentSession.notes).trim()) {
                cellContent += `\nהערות: ${String(currentSession.notes)}`;
              }
              
              // Regular sessions span both columns
              row.push(String(cellContent)); // First column
              row.push(''); // Second column will be merged
            } else {
              // Empty cells for additional session rows when this room has no more sessions
              row.push(''); // First column
              row.push(''); // Second column
            }
          });
          
          data.push(row);
        }
      });
    });

    return data;
  }

  /**
   * Create individual patient schedule worksheet data
   */
  private createPatientScheduleData(patient: Patient, options: ExportOptions): any[][] {
    const { sessions, employees, rooms, activities } = options;
    
    // Filter sessions for this patient
    const patientSessions = sessions.filter((s: Session) => 
      s.patients?.some((p: Patient) => p.id === patient.id)
    );

    // Create data array
    const data: any[][] = [
      [`לוח זמנים עבור: ${patient.firstName} ${patient.lastName}`],
      [''], // Empty row
      ['יום', 'שעת התחלה', 'שעת סיום', 'מטפל', 'תפקיד', 'חדר'] // Headers
    ];
    
    WEEK_DAYS.forEach((day: WeekDay) => {
      const dayLabel = DAY_LABELS[day];
      const daySessions = patientSessions.filter((s: Session) => s.day === day).sort((a: Session, b: Session) => a.startTime.localeCompare(b.startTime));
      
      if (daySessions.length === 0) {
        data.push([String(dayLabel), 'אין טיפולים', '', '', '', '']);
      } else {
        daySessions.forEach((session: Session, index: number) => {
          const room = rooms.find((r: Room) => r.id === session.roomId);
          
                  // For multi-employee sessions, get all employee names
        const employeeNames = session.employeeIds?.map((id: string) => {
          const emp = employees.find((e: Employee) => e.id === id);
          return emp ? `${String(emp.firstName || '')} ${String(emp.lastName || '')}` : '';
        }).filter(Boolean).join(', ') || 'לא ידוע';

        data.push([
          index === 0 ? String(dayLabel) : '', // Show day only for first session
          String(session.startTime || ''),
          String(session.endTime || ''),
          String(employeeNames),
          session.employeeIds?.length ? (() => {
            const firstEmployee = employees.find((e: Employee) => e.id === session.employeeIds[0]);
            if (firstEmployee?.role) {
              return String(firstEmployee.role.name || 'לא ידוע');
            }
            return 'לא ידוע';
          })() : 'לא ידוע',
          room ? String(room.name || '') : 'לא ידוע'
        ]);
        });
      }
      
      // Check for activities on this day
      const dayActivities = activities.filter((activity: Activity) => {
        const timeRange = this.getActivityTimeForDay(activity, day);
        return timeRange !== null;
      });
      
      if (dayActivities.length > 0) {
        data.push(['', 'פעילויות:', '', '', '', '']);
        dayActivities.forEach((activity: Activity) => {
          const timeRange = this.getActivityTimeForDay(activity, day);
          if (timeRange) {
            data.push(['', String(activity.name || ''), String(`${String(timeRange.startTime || '')}-${String(timeRange.endTime || '')}`), '', '', '']);
          }
        });
      }
      
      // Add empty row between days
      data.push(['', '', '', '', '', '']);
    });

    return data;
  }

  /**
   * Create a new spreadsheet
   */
  private async createSpreadsheet(sheetsClient: sheets_v4.Sheets, title: string): Promise<string> {
    const response = await sheetsClient.spreadsheets.create({
      requestBody: {
        properties: {
          title: title,
          locale: 'iw_IL',
          timeZone: 'Asia/Jerusalem',
          defaultFormat: {
            textDirection: 'RIGHT_TO_LEFT'
          }
        }
      }
    });

    if (!response.data.spreadsheetId) {
      throw new Error('Failed to create spreadsheet');
    }

    return response.data.spreadsheetId;
  }

  /**
   * Add worksheet to spreadsheet
   */
  private async addWorksheet(sheetsClient: sheets_v4.Sheets, spreadsheetId: string, title: string, data: any[][], sheetType?: 'employee' | 'room' | 'patient', patient?: Patient, scheduleData?: ExportOptions): Promise<void> {
    // Add new sheet
    const addSheetResponse = await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: title,
              rightToLeft: true,
              gridProperties: {
                rowCount: data.length,
                columnCount: data[0]?.length || 1
              }
            }
          }
        }]
      }
    });

    // Get the sheet ID from the response
    const sheetId = addSheetResponse.data.replies?.[0]?.addSheet?.properties?.sheetId;

    // Add data to the sheet
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: `${title}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: data
      }
    });

    // Apply styling based on sheet type
    if (sheetId !== undefined) {
      await this.applySheetStyling(sheetsClient, spreadsheetId, sheetId, title, data, sheetType, patient, scheduleData);
    }
  }

  /**
   * Convert hex color to RGB values
   */
  private hexToRgb(hex: string): { red: number; green: number; blue: number } {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    return { red: r, green: g, blue: b };
  }

  /**
   * Get contrasting text color (black or white) for a background color
   */
  private getContrastingTextColor(backgroundColor: string): { red: number; green: number; blue: number } {
    const rgb = this.hexToRgb(backgroundColor);
    const luminance = 0.2126 * rgb.red + 0.7152 * rgb.green + 0.0722 * rgb.blue;
    return luminance > 0.179 ? { red: 0, green: 0, blue: 0 } : { red: 1, green: 1, blue: 1 };
  }

  /**
   * Apply styling to a worksheet
   */
  private async applySheetStyling(
    sheetsClient: sheets_v4.Sheets, 
    spreadsheetId: string, 
    sheetId: number, 
    title: string, 
    data: any[][],
    sheetType?: 'employee' | 'room' | 'patient',
    patient?: Patient,
    scheduleData?: ExportOptions
  ): Promise<void> {
    const requests: any[] = [];

    if (sheetType === 'patient' && patient) {
      // Patient sheet styling
      const patientColor = this.hexToRgb(patient.color);
      const textColor = this.getContrastingTextColor(patient.color);

      // Style patient name (first row) - use header row length for proper column span
      const headerRowLength = data[2]?.length || 6; // Use headers row length (row index 2)
      requests.push({
        repeatCell: {
          range: {
            sheetId: sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: headerRowLength
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: patientColor,
              textFormat: {
                foregroundColor: textColor,
                bold: true,
                fontSize: 16
              },
              horizontalAlignment: 'CENTER'
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
        }
      });

      // Style headers (row 2, index 2)
      if (data.length > 2) {
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 2,
              endRowIndex: 3,
              startColumnIndex: 0,
              endColumnIndex: data[2]?.length || 1
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: patientColor,
                textFormat: {
                  foregroundColor: textColor,
                  bold: true
                },
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
          }
        });
      }

      // Merge cells for patient name
      requests.push({
        mergeCells: {
          range: {
            sheetId: sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: headerRowLength
          },
          mergeType: 'MERGE_ALL'
        }
      });

    } else {
      // General styling for employee and room sheets
      const headerColor = this.hexToRgb('#4A90E2'); // Blue header

      // Style headers (first row)
      requests.push({
        repeatCell: {
          range: {
            sheetId: sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: data[0]?.length || 1
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: headerColor,
              textFormat: {
                foregroundColor: { red: 1, green: 1, blue: 1 },
                bold: true
              },
              horizontalAlignment: 'CENTER'
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
        }
      });

      // Merge cells for day labels in the first column
      const timeSlots = this.generateTimeSlots();
      let currentRow = 1;
      WEEK_DAYS.forEach(() => {
        const startRow = currentRow;
        const endRow = currentRow + timeSlots.length - 1;
        requests.push({
          mergeCells: {
            range: {
              sheetId: sheetId,
              startRowIndex: startRow,
              endRowIndex: endRow + 1,
              startColumnIndex: 0,
              endColumnIndex: 1
            },
            mergeType: 'MERGE_ALL'
          }
        });
        currentRow = endRow + 1;
      });

      // Special handling for employee and room sheets - apply colors to data cells
      if (sheetType === 'employee' && scheduleData) {
        await this.applyEmployeeColors(sheetsClient, spreadsheetId, sheetId, data, scheduleData, requests);
      } else if (sheetType === 'room' && scheduleData) {
        await this.applyRoomColors(sheetsClient, spreadsheetId, sheetId, data, scheduleData, requests);
      }
    }

    // Apply all formatting requests
    if (requests.length > 0) {
      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });
    }
  }

  /**
   * Apply employee-specific colors to employee schedule data cells
   */
  private async applyEmployeeColors(
    sheetsClient: sheets_v4.Sheets,
    spreadsheetId: string,
    sheetId: number,
    data: any[][],
    scheduleData: ExportOptions,
    requests: any[]
  ): Promise<void> {
    const { employees } = scheduleData;
    const sortedEmployees = [...employees].filter((e: Employee) => e.isActive).sort((a: Employee, b: Employee) => 
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
    );
    
    // Merge headers for employee names (span across 2 columns)
    sortedEmployees.forEach((employee: Employee, empIndex: number) => {
      const startCol = 3 + (empIndex * 2); // Start after יום, שעה, פעילויות columns
      const endCol = startCol + 1;
      requests.push({
        mergeCells: {
          range: {
            sheetId: sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: startCol,
            endColumnIndex: endCol + 1
          },
          mergeType: 'MERGE_ALL'
        }
      });
    });
    
    // Employee schedule structure: יום, שעה, פעילויות, then employee columns (2 per employee)
    sortedEmployees.forEach((employee: Employee, empIndex: number) => {
      const firstColIndex = 3 + (empIndex * 2); // Start after יום, שעה, פעילויות columns
      const secondColIndex = firstColIndex + 1;
      const employeeColor = this.hexToRgb(employee.color);
      const textColor = this.getContrastingTextColor(employee.color);
      
      // Apply employee color to all data cells in this employee's columns (starting from row 1)
      for (let row = 1; row < data.length; row++) {
        const firstCellValue = data[row][firstColIndex];
        const secondCellValue = data[row][secondColIndex];
        
        // Handle first column
        if (firstCellValue && firstCellValue !== '') {
          // Check if second cell is empty (indicating a regular session that should span both columns)
          if (!secondCellValue || secondCellValue === '') {
            // Merge cells for regular sessions
            requests.push({
              mergeCells: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: row,
                  endRowIndex: row + 1,
                  startColumnIndex: firstColIndex,
                  endColumnIndex: secondColIndex + 1
                },
                mergeType: 'MERGE_ALL'
              }
            });
          }
          
          // Apply styling to first cell
          requests.push({
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: row,
                endRowIndex: row + 1,
                startColumnIndex: firstColIndex,
                endColumnIndex: firstColIndex + 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: employeeColor,
                  textFormat: {
                    foregroundColor: textColor
                  },
                  wrapStrategy: 'WRAP',
                  verticalAlignment: 'TOP',
                  horizontalAlignment: 'RIGHT'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,wrapStrategy,verticalAlignment,horizontalAlignment)'
            }
          });
        }
        
        // Handle second column if it has content (every two weeks sessions)
        if (secondCellValue && secondCellValue !== '') {
          requests.push({
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: row,
                endRowIndex: row + 1,
                startColumnIndex: secondColIndex,
                endColumnIndex: secondColIndex + 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: employeeColor,
                  textFormat: {
                    foregroundColor: textColor
                  },
                  wrapStrategy: 'WRAP',
                  verticalAlignment: 'TOP',
                  horizontalAlignment: 'RIGHT'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,wrapStrategy,verticalAlignment,horizontalAlignment)'
            }
          });
        }
      }
    });
  }

  /**
   * Apply room-specific colors to room schedule data cells
   */
  private async applyRoomColors(
    sheetsClient: sheets_v4.Sheets,
    spreadsheetId: string,
    sheetId: number,
    data: any[][],
    scheduleData: ExportOptions,
    requests: any[]
  ): Promise<void> {
    const { rooms } = scheduleData;
    const sortedRooms = [...rooms].filter((r: Room) => r.isActive).sort((a: Room, b: Room) => a.name.localeCompare(b.name, 'he'));
    
    // Merge headers for room names (span across 2 columns)
    sortedRooms.forEach((room: Room, roomIndex: number) => {
      const startCol = 3 + (roomIndex * 2); // Start after יום, שעה, פעילויות columns
      const endCol = startCol + 1;
      requests.push({
        mergeCells: {
          range: {
            sheetId: sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: startCol,
            endColumnIndex: endCol + 1
          },
          mergeType: 'MERGE_ALL'
        }
      });
    });
    
    // Room schedule structure: יום, שעה, פעילויות, then room columns (2 per room)
    sortedRooms.forEach((room: Room, roomIndex: number) => {
      const firstColIndex = 3 + (roomIndex * 2); // Start after יום, שעה, פעילויות columns
      const secondColIndex = firstColIndex + 1;
      const roomColor = this.hexToRgb(room.color);
      const textColor = this.getContrastingTextColor(room.color);
      
      // Apply room color to all data cells in this room's columns (starting from row 1)
      for (let row = 1; row < data.length; row++) {
        const firstCellValue = data[row][firstColIndex];
        const secondCellValue = data[row][secondColIndex];
        
        // Handle first column
        if (firstCellValue && firstCellValue !== '') {
          // Check if second cell is empty (indicating a regular session that should span both columns)
          if (!secondCellValue || secondCellValue === '') {
            // Merge cells for regular sessions
            requests.push({
              mergeCells: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: row,
                  endRowIndex: row + 1,
                  startColumnIndex: firstColIndex,
                  endColumnIndex: secondColIndex + 1
                },
                mergeType: 'MERGE_ALL'
              }
            });
          }
          
          // Apply styling to first cell
          requests.push({
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: row,
                endRowIndex: row + 1,
                startColumnIndex: firstColIndex,
                endColumnIndex: firstColIndex + 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: roomColor,
                  textFormat: {
                    foregroundColor: textColor
                  },
                  wrapStrategy: 'WRAP',
                  verticalAlignment: 'TOP',
                  horizontalAlignment: 'RIGHT'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,wrapStrategy,verticalAlignment,horizontalAlignment)'
            }
          });
        }
        
        // Handle second column if it has content (every two weeks sessions)
        if (secondCellValue && secondCellValue !== '') {
          requests.push({
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: row,
                endRowIndex: row + 1,
                startColumnIndex: secondColIndex,
                endColumnIndex: secondColIndex + 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: roomColor,
                  textFormat: {
                    foregroundColor: textColor
                  },
                  wrapStrategy: 'WRAP',
                  verticalAlignment: 'TOP',
                  horizontalAlignment: 'RIGHT'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,wrapStrategy,verticalAlignment,horizontalAlignment)'
            }
          });
        }
      }
    });
  }

  /**
   * Export schedule to Google Sheets
   */
  async exportScheduleToSheets(auth: StoredGoogleAuth, exportRequest: GoogleSheetsExportRequest): Promise<GoogleSheetsExportResponse> {
    try {
      const sheetsClient = await this.createSheetsClient(auth);
      const { scheduleData, scheduleName, exportType, patientId } = exportRequest;
      
      // Generate spreadsheet name with new format: לוח_זמנים_<schedule_name>_yyyymmdd_hhmm
      const timestamp = this.generateTimestamp();
      const cleanedScheduleName = this.cleanScheduleName(scheduleName);
      
      let spreadsheetTitle: string;
      let spreadsheetId: string;

      if (exportType === 'patient' && patientId) {
        // Create separate spreadsheet for individual patient
        const patient = scheduleData.patients.find((p: Patient) => p.id === patientId);
        if (!patient) {
          return { success: false, error: 'Patient not found' };
        }
        
        const cleanedPatientName = this.cleanScheduleName(`${patient.firstName}_${patient.lastName}`);
        spreadsheetTitle = `לוח_זמנים_${cleanedScheduleName}_${cleanedPatientName}_${timestamp}`;
        spreadsheetId = await this.createSpreadsheet(sheetsClient, spreadsheetTitle);
        
        // Remove default sheet and add patient schedule
        await sheetsClient.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              deleteSheet: {
                sheetId: 0 // Default sheet
              }
            }]
          }
        });
        
        const patientData = this.createPatientScheduleData(patient, scheduleData);
        await this.addWorksheet(sheetsClient, spreadsheetId, `${patient.firstName} ${patient.lastName}`, patientData, 'patient', patient, scheduleData);
        
      } else {
        // Create main spreadsheet with all schedules
        spreadsheetTitle = `לוח_זמנים_${cleanedScheduleName}_${timestamp}`;
        spreadsheetId = await this.createSpreadsheet(sheetsClient, spreadsheetTitle);
        
        let firstSheetAdded = false;

        // Add employee schedule if requested
        if (exportType === 'all' || exportType === 'employee') {
          const employeeData = this.createEmployeeScheduleData(scheduleData);
          await this.addWorksheet(sheetsClient, spreadsheetId, 'לוח עובדים', employeeData, 'employee', undefined, scheduleData);
          firstSheetAdded = true;
        }

        // Add room schedule if requested
        if (exportType === 'all' || exportType === 'room') {
          const roomData = this.createRoomScheduleData(scheduleData);
          await this.addWorksheet(sheetsClient, spreadsheetId, 'לוח חדרים', roomData, 'room', undefined, scheduleData);
          firstSheetAdded = true;
        }

        // Remove default sheet after we have at least one worksheet
        if (firstSheetAdded) {
          await sheetsClient.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [{
                deleteSheet: {
                  sheetId: 0 // Default sheet
                }
              }]
            }
          });
        }

        // Add individual patient schedules if full export
        if (exportType === 'all') {
          const activePatients = scheduleData.patients.filter((p: Patient) => p.isActive).sort((a: Patient, b: Patient) => 
            `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
          );
          
          for (const patient of activePatients) {
            const patientData = this.createPatientScheduleData(patient, scheduleData);
            const sheetName = `${patient.firstName} ${patient.lastName}`.substring(0, 31); // Google Sheets limit
            await this.addWorksheet(sheetsClient, spreadsheetId, sheetName, patientData, 'patient', patient, scheduleData);
            
            // If this is the first sheet added, mark it and remove default sheet
            if (!firstSheetAdded) {
              firstSheetAdded = true;
              await sheetsClient.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                  requests: [{
                    deleteSheet: {
                      sheetId: 0 // Default sheet
                    }
                  }]
                }
              });
            }
          }
        }
      }

      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      
      return {
        success: true,
        spreadsheetId,
        spreadsheetUrl
      };

    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);
      return {
        success: false,
        error: 'Failed to export to Google Sheets',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default GoogleSheetsService;
