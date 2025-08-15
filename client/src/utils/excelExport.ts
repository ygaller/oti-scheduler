import * as XLSX from 'sheetjs-style';
import { Session, Employee, Room, Patient, Activity, DAY_LABELS, getRoleName, WeekDay, WEEK_DAYS } from '../types';

interface ExcelExportOptions {
  sessions: Session[];
  employees: Employee[];
  rooms: Room[];
  patients: Patient[];
  activities: Activity[];
}

// Helper function to convert hex color to Excel color format for sheetjs-style
function hexToExcelColor(hex: string): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  // sheetjs-style expects ARGB format with alpha channel
  return 'FF' + cleanHex.toUpperCase();
}

// Helper function to get the effective time range for an activity on a specific day
function getActivityTimeForDay(activity: Activity, day: WeekDay): { startTime: string; endTime: string } | null {
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

// Helper function to check if a time is within an activity period
function isTimeInActivityPeriod(time: string, activities: Activity[], day: WeekDay): Activity | null {
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const targetMinutes = timeToMinutes(time);

  for (const activity of activities) {
    const timeRange = getActivityTimeForDay(activity, day);
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

// Generate time slots (15-minute intervals from 7:00 to 17:00)
function generateTimeSlots(): string[] {
  const slots = [];
  for (let hour = 7; hour < 17; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }
  return slots;
}

// Create employee schedule worksheet
function createEmployeeScheduleWorksheet(options: ExcelExportOptions): XLSX.WorkSheet {
  const { sessions, employees, activities } = options;
  const timeSlots = generateTimeSlots().filter(time => time.endsWith(':00')); // Only hourly marks
  const sortedEmployees = [...employees].filter(e => e.isActive).sort((a, b) => 
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
  );

  // Create headers: Time column + Days with employees under each day
  const mainHeaders: any[] = ['שעה'];
  const subHeaders: any[] = [''];
  
  WEEK_DAYS.forEach(day => {
    mainHeaders.push(DAY_LABELS[day]);
    // Add empty cells for the rest of the employee columns for this day
    for (let i = 1; i < sortedEmployees.length + 1; i++) { // +1 for activities column
      mainHeaders.push('');
    }
    
    // Sub-headers for this day
    subHeaders.push('פעילויות');
    sortedEmployees.forEach(employee => {
      subHeaders.push(`${employee.firstName} ${employee.lastName}`);
    });
  });
  
  const data: any[][] = [mainHeaders, subHeaders];
  
  // Create data rows for each time slot
  timeSlots.forEach(time => {
    const row: any[] = [time];
    
    WEEK_DAYS.forEach(day => {
      const daySessions = sessions.filter(s => s.day === day);
      
      // Check for activities
      const activity = isTimeInActivityPeriod(time, activities, day);
      row.push(activity ? activity.name : '');
      
      // Check for sessions for each employee
      sortedEmployees.forEach(employee => {
        const session = daySessions.find(s => 
          s.employeeId === employee.id && 
          s.startTime <= time && 
          s.endTime > time
        );
        
        if (session) {
          const room = options.rooms.find(r => r.id === session.roomId);
          const patientNames = session.patients?.map(p => `${p.firstName} ${p.lastName}`).join(', ') || 'חסר מטופל';
          row.push(`${session.startTime}-${session.endTime}\n${room?.name || 'לא ידוע'}\n${patientNames}`);
        } else {
          row.push('');
        }
      });
    });
    
    data.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Apply styling
  const range = XLSX.utils.decode_range(ws['!ref']!);
  
  // Merge cells for day headers
  let colIndex = 1;
  WEEK_DAYS.forEach(day => {
    const startCol = colIndex;
    const endCol = colIndex + sortedEmployees.length; // +1 for activities column
    
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({
      s: { r: 0, c: startCol },
      e: { r: 0, c: endCol }
    });
    
    colIndex = endCol + 1;
  });
  
  // Style day headers (first row)
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellRef]) continue;
    
    ws[cellRef].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { 
        patternType: 'solid',
        fgColor: { rgb: 'FF4A90E2' }
      },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
  }
  
  // Style sub-headers (second row)
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 1, c: col });
    if (!ws[cellRef]) continue;
    
    ws[cellRef].s = {
      font: { bold: true, color: { rgb: '000000' } },
      fill: { 
        patternType: 'solid',
        fgColor: { rgb: 'FFE0E0E0' }
      },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
  }
  
  // Apply employee colors to their columns
  colIndex = 1;
  WEEK_DAYS.forEach(day => {
    colIndex++; // Skip activities column
    
    sortedEmployees.forEach((employee, empIndex) => {
      for (let row = 2; row <= range.e.r; row++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: colIndex });
        if (ws[cellRef] && ws[cellRef].v && ws[cellRef].v !== '') {
          if (!ws[cellRef].s) ws[cellRef].s = {};
          ws[cellRef].s.fill = { 
            patternType: 'solid',
            fgColor: { rgb: hexToExcelColor(employee.color) }
          };
          ws[cellRef].s.alignment = { wrapText: true, vertical: 'top' };
          ws[cellRef].s.font = { color: { rgb: 'FFFFFF' } };
        }
      }
      colIndex++;
    });
  });

  // Set column widths
  const colWidths: any[] = [{ width: 10 }]; // Time column
  WEEK_DAYS.forEach(() => {
    colWidths.push({ width: 15 }); // Activities column
    sortedEmployees.forEach(() => {
      colWidths.push({ width: 20 }); // Employee columns
    });
  });
  
  ws['!cols'] = colWidths;

  // Set worksheet direction to RTL
  if (!ws['!views']) ws['!views'] = [{}];
  ws['!views'][0].rightToLeft = true;

  return ws;
}

// Create room schedule worksheet
function createRoomScheduleWorksheet(options: ExcelExportOptions): XLSX.WorkSheet {
  const { sessions, rooms, employees, activities } = options;
  const timeSlots = generateTimeSlots().filter(time => time.endsWith(':00')); // Only hourly marks
  const sortedRooms = [...rooms].filter(r => r.isActive).sort((a, b) => a.name.localeCompare(b.name, 'he'));

  // Create headers: Time column + Days with rooms under each day
  const mainHeaders: any[] = ['שעה'];
  const subHeaders: any[] = [''];
  
  WEEK_DAYS.forEach(day => {
    mainHeaders.push(DAY_LABELS[day]);
    // Add empty cells for the rest of the room columns for this day
    for (let i = 1; i < sortedRooms.length + 1; i++) { // +1 for activities column
      mainHeaders.push('');
    }
    
    // Sub-headers for this day
    subHeaders.push('פעילויות');
    sortedRooms.forEach(room => {
      subHeaders.push(room.name);
    });
  });
  
  const data: any[][] = [mainHeaders, subHeaders];
  
  // Create data rows for each time slot
  timeSlots.forEach(time => {
    const row: any[] = [time];
    
    WEEK_DAYS.forEach(day => {
      const daySessions = sessions.filter(s => s.day === day);
      
      // Check for activities
      const activity = isTimeInActivityPeriod(time, activities, day);
      row.push(activity ? activity.name : '');
      
      // Check for sessions for each room
      sortedRooms.forEach(room => {
        const session = daySessions.find(s => 
          s.roomId === room.id && 
          s.startTime <= time && 
          s.endTime > time
        );
        
        if (session) {
          const employee = employees.find(e => e.id === session.employeeId);
          const patientNames = session.patients?.map(p => `${p.firstName} ${p.lastName}`).join(', ') || 'חסר מטופל';
          row.push(`${session.startTime}-${session.endTime}\n${employee ? `${employee.firstName} ${employee.lastName}` : 'לא ידוע'}\n${patientNames}`);
        } else {
          row.push('');
        }
      });
    });
    
    data.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Apply styling
  const range = XLSX.utils.decode_range(ws['!ref']!);
  
  // Merge cells for day headers
  let colIndex = 1;
  WEEK_DAYS.forEach(day => {
    const startCol = colIndex;
    const endCol = colIndex + sortedRooms.length; // +1 for activities column
    
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({
      s: { r: 0, c: startCol },
      e: { r: 0, c: endCol }
    });
    
    colIndex = endCol + 1;
  });
  
  // Style day headers (first row)
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellRef]) continue;
    
    ws[cellRef].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { 
        patternType: 'solid',
        fgColor: { rgb: 'FF4A90E2' }
      },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
  }
  
  // Style sub-headers (second row)
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 1, c: col });
    if (!ws[cellRef]) continue;
    
    ws[cellRef].s = {
      font: { bold: true, color: { rgb: '000000' } },
      fill: { 
        patternType: 'solid',
        fgColor: { rgb: 'FFE0E0E0' }
      },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
  }
  
  // Apply room colors to their columns
  colIndex = 1;
  WEEK_DAYS.forEach(day => {
    colIndex++; // Skip activities column
    
    sortedRooms.forEach((room, roomIndex) => {
      for (let row = 2; row <= range.e.r; row++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: colIndex });
        if (ws[cellRef] && ws[cellRef].v && ws[cellRef].v !== '') {
          if (!ws[cellRef].s) ws[cellRef].s = {};
          ws[cellRef].s.fill = { 
            patternType: 'solid',
            fgColor: { rgb: hexToExcelColor(room.color) }
          };
          ws[cellRef].s.alignment = { wrapText: true, vertical: 'top' };
          ws[cellRef].s.font = { color: { rgb: 'FFFFFF' } };
        }
      }
      colIndex++;
    });
  });

  // Set column widths
  const colWidths: any[] = [{ width: 10 }]; // Time column
  WEEK_DAYS.forEach(() => {
    colWidths.push({ width: 15 }); // Activities column
    sortedRooms.forEach(() => {
      colWidths.push({ width: 20 }); // Room columns
    });
  });
  
  ws['!cols'] = colWidths;

  // Set worksheet direction to RTL
  if (!ws['!views']) ws['!views'] = [{}];
  ws['!views'][0].rightToLeft = true;

  return ws;
}

// Create individual patient schedule worksheet
function createPatientScheduleWorksheet(patient: Patient, options: ExcelExportOptions): XLSX.WorkSheet {
  const { sessions, employees, rooms, activities } = options;
  
  // Filter sessions for this patient
  const patientSessions = sessions.filter(s => 
    s.patients?.some(p => p.id === patient.id)
  );

  // Create data array
  const data: any[][] = [
    [`לוח זמנים עבור: ${patient.firstName} ${patient.lastName}`],
    [''], // Empty row
    ['יום', 'שעת התחלה', 'שעת סיום', 'מטפל', 'תפקיד', 'חדר'] // Headers
  ];
  
  WEEK_DAYS.forEach(day => {
    const dayLabel = DAY_LABELS[day];
    const daySessions = patientSessions.filter(s => s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    if (daySessions.length === 0) {
      data.push([dayLabel, 'אין טיפולים', '', '', '', '']);
    } else {
      daySessions.forEach((session, index) => {
        const employee = employees.find(e => e.id === session.employeeId);
        const room = rooms.find(r => r.id === session.roomId);
        
        data.push([
          index === 0 ? dayLabel : '', // Show day only for first session
          session.startTime,
          session.endTime,
          employee ? `${employee.firstName} ${employee.lastName}` : 'לא ידוע',
          employee ? getRoleName(employee.role, employee.roleId) : 'לא ידוע',
          room ? room.name : 'לא ידוע'
        ]);
      });
    }
    
    // Check for activities on this day
    const dayActivities = activities.filter(activity => {
      const timeRange = getActivityTimeForDay(activity, day);
      return timeRange !== null;
    });
    
    if (dayActivities.length > 0) {
      data.push(['', 'פעילויות:', '', '', '', '']);
      dayActivities.forEach(activity => {
        const timeRange = getActivityTimeForDay(activity, day);
        if (timeRange) {
          data.push(['', activity.name, `${timeRange.startTime}-${timeRange.endTime}`, '', '', '']);
        }
      });
    }
    
    // Add empty row between days
    data.push(['', '', '', '', '', '']);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Apply styling
  // const range = XLSX.utils.decode_range(ws['!ref']!);
  
  // Patient name styling (first row)
  const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (ws[titleCell]) {
    ws[titleCell].s = {
      font: { bold: true, size: 16, color: { rgb: 'FF000000' } },
      fill: { 
        patternType: 'solid',
        fgColor: { rgb: hexToExcelColor(patient.color) }
      },
      alignment: { horizontal: 'center' }
    };
  }
  
  // Header row styling (row 2, index 2)
  for (let col = 0; col < 6; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 2, c: col });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { 
        patternType: 'solid',
        fgColor: { rgb: hexToExcelColor(patient.color) }
      },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
  }
  
  // Merge cells for patient name
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
  
  // Set column widths
  ws['!cols'] = [
    { width: 15 }, // Day
    { width: 15 }, // Start time
    { width: 15 }, // End time
    { width: 20 }, // Employee
    { width: 20 }, // Role
    { width: 20 }  // Room
  ];

  // Set worksheet direction to RTL
  if (!ws['!views']) ws['!views'] = [{}];
  ws['!views'][0].rightToLeft = true;

  return ws;
}

export function exportScheduleToExcel(options: ExcelExportOptions): void {
  const { sessions, patients } = options;
  
  if (sessions.length === 0) {
    alert('אין נתונים לייצוא');
    return;
  }

  // Create workbook with RTL support
  const workbook = XLSX.utils.book_new();
  workbook.Workbook = {
    Views: [{ RTL: true }]
  };
  
  // Add employee schedule worksheet
  const employeeWs = createEmployeeScheduleWorksheet(options);
  XLSX.utils.book_append_sheet(workbook, employeeWs, 'לוח עובדים');
  
  // Add room schedule worksheet
  const roomWs = createRoomScheduleWorksheet(options);
  XLSX.utils.book_append_sheet(workbook, roomWs, 'לוח חדרים');
  
  // Add individual patient worksheets
  const activePatients = patients.filter(p => p.isActive).sort((a, b) => 
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
  );
  
  activePatients.forEach(patient => {
    const patientWs = createPatientScheduleWorksheet(patient, options);
    // Limit worksheet name length and ensure it's valid
    const sheetName = `${patient.firstName} ${patient.lastName}`.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, patientWs, sheetName);
  });
  
  // Generate Excel file and download
  const fileName = `לוח_זמנים_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
