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
   * Get role name for display
   */
  private getRoleName(role: string, roleId: string): string {
    // This is a simplified version - in a real app you'd look up the role
    return role || 'לא ידוע';
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

    // Create headers
    const mainHeaders: any[] = ['שעה'];
    const subHeaders: any[] = [''];
    
    WEEK_DAYS.forEach((day: WeekDay) => {
      mainHeaders.push(DAY_LABELS[day]);
      // Add empty cells for the rest of the employee columns for this day
      for (let i = 1; i < sortedEmployees.length + 1; i++) { // +1 for activities column
        mainHeaders.push('');
      }
      
      // Sub-headers for this day
      subHeaders.push('פעילויות');
      sortedEmployees.forEach((employee: Employee) => {
        subHeaders.push(`${employee.firstName} ${employee.lastName}`);
      });
    });
    
    const data: any[][] = [mainHeaders, subHeaders];
    
    // Create data rows for each time slot
    timeSlots.forEach(time => {
      const row: any[] = [time];
      
      WEEK_DAYS.forEach((day: WeekDay) => {
        const daySessions = sessions.filter((s: Session) => s.day === day);
        
        // Check for activities
        const activity = this.isTimeInActivityPeriod(time, activities, day);
        row.push(activity ? activity.name : '');
        
        // Check for sessions for each employee
        sortedEmployees.forEach((employee: Employee) => {
          const session = daySessions.find((s: Session) => 
            s.employeeIds && s.employeeIds.includes(employee.id) && 
            s.startTime >= time && 
            s.startTime < this.getNextHour(time)
          );
          
          if (session) {
            const room = options.rooms.find((r: Room) => r.id === session.roomId);
            const patientNames = session.patients?.map((p: Patient) => `${p.firstName} ${p.lastName}`).join(', ') || 'חסר מטופל';
            const employeeNames = session.employeeIds?.map((id: string) => {
              const emp = options.employees.find((e: Employee) => e.id === id);
              return emp ? `${emp.firstName} ${emp.lastName}` : '';
            }).filter(Boolean).join(', ') || 'לא ידוע';
            
            let cellContent = `${session.startTime}-${session.endTime}\n${room?.name || 'לא ידוע'}\n${employeeNames}\n${patientNames}`;
            if (session.notes && session.notes.trim()) {
              cellContent += `\nהערות: ${session.notes}`;
            }
            row.push(cellContent);
          } else {
            // Check for reserved hours if no session
            const reservedHour = employee.reservedHours?.find((rh: any) => 
              rh.day === day && 
              rh.startTime >= time && 
              rh.startTime < this.getNextHour(time)
            );
            if (reservedHour) {
              row.push(`${reservedHour.startTime}-${reservedHour.endTime}\nשעות שמורות\n${reservedHour.notes || 'ללא הערות'}`);
            } else {
              row.push('');
            }
          }
        });
      });
      
      data.push(row);
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

    // Create headers
    const mainHeaders: any[] = ['שעה'];
    const subHeaders: any[] = [''];
    
    WEEK_DAYS.forEach((day: WeekDay) => {
      mainHeaders.push(DAY_LABELS[day]);
      for (let i = 1; i < sortedRooms.length + 1; i++) { // +1 for activities column
        mainHeaders.push('');
      }
      
      subHeaders.push('פעילויות');
      sortedRooms.forEach((room: Room) => {
        subHeaders.push(room.name);
      });
    });
    
    const data: any[][] = [mainHeaders, subHeaders];
    
    // Create data rows for each time slot
    timeSlots.forEach(time => {
      const row: any[] = [time];
      
      WEEK_DAYS.forEach((day: WeekDay) => {
        const daySessions = sessions.filter((s: Session) => s.day === day);
        
        // Check for activities
        const activity = this.isTimeInActivityPeriod(time, activities, day);
        row.push(activity ? activity.name : '');
        
        // Check for sessions for each room
        sortedRooms.forEach((room: Room) => {
          const session = daySessions.find((s: Session) => 
            s.roomId === room.id && 
            s.startTime >= time && 
            s.startTime < this.getNextHour(time)
          );
          
          if (session) {
            const patientNames = session.patients?.map((p: Patient) => `${p.firstName} ${p.lastName}`).join(', ') || 'חסר מטופל';
            const employeeNames = session.employeeIds?.map((id: string) => {
              const emp = employees.find((e: Employee) => e.id === id);
              return emp ? `${emp.firstName} ${emp.lastName}` : '';
            }).filter(Boolean).join(', ') || 'לא ידוע';
            
            let cellContent = `${session.startTime}-${session.endTime}\n${employeeNames}\n${patientNames}`;
            if (session.notes && session.notes.trim()) {
              cellContent += `\nהערות: ${session.notes}`;
            }
            row.push(cellContent);
          } else {
            row.push('');
          }
        });
      });
      
      data.push(row);
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
        data.push([dayLabel, 'אין טיפולים', '', '', '', '']);
      } else {
        daySessions.forEach((session: Session, index: number) => {
          const room = rooms.find((r: Room) => r.id === session.roomId);
          
          // For multi-employee sessions, get all employee names
          const employeeNames = session.employeeIds?.map((id: string) => {
            const emp = employees.find((e: Employee) => e.id === id);
            return emp ? `${emp.firstName} ${emp.lastName}` : '';
          }).filter(Boolean).join(', ') || 'לא ידוע';

          data.push([
            index === 0 ? dayLabel : '', // Show day only for first session
            session.startTime,
            session.endTime,
            employeeNames,
            session.employeeIds?.length && employees.find((e: Employee) => e.id === session.employeeIds[0]) ? 
              this.getRoleName(employees.find((e: Employee) => e.id === session.employeeIds[0])?.role || '', employees.find((e: Employee) => e.id === session.employeeIds[0])?.roleId || '') : 'לא ידוע',
            room ? room.name : 'לא ידוע'
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
            data.push(['', activity.name, `${timeRange.startTime}-${timeRange.endTime}`, '', '', '']);
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

      // Style patient name (first row)
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
            endColumnIndex: data[0]?.length || 1
          },
          mergeType: 'MERGE_ALL'
        }
      });

    } else {
      // General styling for employee and room sheets
      const headerColor = this.hexToRgb('#4A90E2'); // Blue header
      const subHeaderColor = this.hexToRgb('#E0E0E0'); // Gray sub-header

      // Style day headers (first row)
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

      // Style sub-headers (second row) if exists
      if (data.length > 1) {
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              endRowIndex: 2,
              startColumnIndex: 0,
              endColumnIndex: data[1]?.length || 1
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: subHeaderColor,
                textFormat: {
                  foregroundColor: { red: 0, green: 0, blue: 0 },
                  bold: true
                },
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
          }
        });
      }

      // Special handling for room sheets - apply room colors to data cells
      if (sheetType === 'room' && scheduleData) {
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
    
    // Room schedule structure: Time column + 5 days * (Activities column + Room columns)
    let colIndex = 1; // Start after time column
    
    WEEK_DAYS.forEach(() => {
      colIndex++; // Skip activities column
      
      sortedRooms.forEach((room: Room, roomIndex: number) => {
        const roomColor = this.hexToRgb(room.color);
        const textColor = this.getContrastingTextColor(room.color);
        
        // Apply room color to all data cells in this room's column (starting from row 2)
        for (let row = 2; row < data.length; row++) {
          const cellValue = data[row][colIndex];
          // Only color cells that have content (not empty)
          if (cellValue && cellValue !== '') {
            requests.push({
              repeatCell: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: row,
                  endRowIndex: row + 1,
                  startColumnIndex: colIndex,
                  endColumnIndex: colIndex + 1
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
        
        colIndex++;
      });
    });
  }

  /**
   * Export schedule to Google Sheets
   */
  async exportScheduleToSheets(auth: StoredGoogleAuth, exportRequest: GoogleSheetsExportRequest): Promise<GoogleSheetsExportResponse> {
    try {
      const sheetsClient = await this.createSheetsClient(auth);
      const { scheduleData, scheduleName, exportType, patientId } = exportRequest;
      
      // Generate spreadsheet name with timestamp
      const now = new Date();
      const timestamp = now.toLocaleString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jerusalem'
      }).replace(/[\/,]/g, '-');
      
      let spreadsheetTitle: string;
      let spreadsheetId: string;

      if (exportType === 'patient' && patientId) {
        // Create separate spreadsheet for individual patient
        const patient = scheduleData.patients.find((p: Patient) => p.id === patientId);
        if (!patient) {
          return { success: false, error: 'Patient not found' };
        }
        
        spreadsheetTitle = `${scheduleName} - ${patient.firstName} ${patient.lastName} - ${timestamp}`;
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
        spreadsheetTitle = `${scheduleName} - ייצוא מלא - ${timestamp}`;
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
