import * as XLSX from 'sheetjs-style';
import { Session, Employee, Room, Patient, Activity, getRoleName } from '../types';
import { DAY_LABELS, WeekDay, WEEK_DAYS } from '../types/schedule';
import { getContrastingTextColor } from './colorUtils';

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

// Helper function to get the next hour for session overlap checking
function getNextHour(time: string): string {
  const [hours] = time.split(':').map(Number);
  const nextHour = hours + 1;
  return `${nextHour.toString().padStart(2, '0')}:00`;
}

// Helper function to find all sessions for an employee in a time slot
function findSessionsForEmployeeInTimeSlot(
  sessions: Session[], 
  employeeId: string, 
  time: string, 
  day: WeekDay
): Session[] {
  const nextHour = getNextHour(time);
  return sessions.filter(s => 
    s.day === day &&
    s.employeeIds && 
    s.employeeIds.includes(employeeId) && 
    s.startTime >= time && 
    s.startTime < nextHour
  ).sort((a, b) => a.startTime.localeCompare(b.startTime));
}

// Helper function to find all sessions for a room in a time slot
function findSessionsForRoomInTimeSlot(
  sessions: Session[], 
  roomId: string, 
  time: string, 
  day: WeekDay
): Session[] {
  const nextHour = getNextHour(time);
  return sessions.filter(s => 
    s.day === day &&
    s.roomId === roomId && 
    s.startTime >= time && 
    s.startTime < nextHour
  ).sort((a, b) => a.startTime.localeCompare(b.startTime));
}

// Helper function to clean file names and worksheet names
function cleanFileName(name: string): string {
  // Allow English letters, Hebrew letters, spaces, hyphens, and underscores
  return name.replace(/[^a-zA-Z\u0590-\u05FF\s\-_]/g, '');
}

// Create employee schedule worksheet
function createEmployeeScheduleWorksheet(options: ExcelExportOptions): XLSX.WorkSheet {
  const { sessions, employees, activities } = options;
  const timeSlots = generateTimeSlots().filter(time => time.endsWith(':00')); // Only hourly marks
  const sortedEmployees = [...employees].filter(e => e.isActive).sort((a, b) => 
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
  );

  // Create headers: יום, שעה, פעילויות, then employee columns (2 columns per employee)
  const headers: any[] = ['יום', 'שעה', 'פעילויות'];
  sortedEmployees.forEach(employee => {
    headers.push(`${employee.firstName} ${employee.lastName}`);
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
      sortedEmployees.forEach(employee => {
        const employeeSessions = findSessionsForEmployeeInTimeSlot(sessions, employee.id, time, day);
        const regularSessionCount = employeeSessions.filter(s => !s.everyTwoWeeks).length;
        if (regularSessionCount > maxSessionsInTimeSlot) {
          maxSessionsInTimeSlot = regularSessionCount;
        }
      });
      
      // Create rows for this time slot (one or more if there are multiple sessions)
      for (let sessionRowIndex = 0; sessionRowIndex < maxSessionsInTimeSlot; sessionRowIndex++) {
        const row: any[] = [
          timeIndex === 0 && sessionRowIndex === 0 ? dayLabel : '', // Show day only for first time slot and first session row
          sessionRowIndex === 0 ? time : '', // Show time only for first session row
        ];
        
        // Check for activities (only in first session row)
        const activity = sessionRowIndex === 0 ? isTimeInActivityPeriod(time, activities, day) : null;
        row.push(activity ? activity.name : '');
        
        // Process each employee (2 columns per employee)
        sortedEmployees.forEach(employee => {
          const employeeSessions = findSessionsForEmployeeInTimeSlot(sessions, employee.id, time, day);
          const regularSessions = employeeSessions.filter(s => !s.everyTwoWeeks);
          const everyTwoWeeksSessions = employeeSessions.filter(s => s.everyTwoWeeks);
          
          // Handle every two weeks sessions only in the first row
          if (sessionRowIndex === 0 && everyTwoWeeksSessions.length > 0) {
            // Handle both every two weeks sessions in the first row
            const firstEveryTwoWeeks = everyTwoWeeksSessions[0];
            const secondEveryTwoWeeks = everyTwoWeeksSessions[1];
            
            // First column
            if (firstEveryTwoWeeks) {
              const room = options.rooms.find(r => r.id === firstEveryTwoWeeks.roomId);
              const patientNames = firstEveryTwoWeeks.patients?.map(p => `${p.firstName} ${p.lastName}`).join(', ') || 'חסר מטופל';
              const employeeNames = firstEveryTwoWeeks.employeeIds?.map(id => options.employees.find(e => e.id === id)?.firstName + " " + options.employees.find(e => e.id === id)?.lastName).filter(Boolean).join(', ') || 'לא ידוע';
              let cellContent = `${firstEveryTwoWeeks.startTime}-${firstEveryTwoWeeks.endTime}\n${room?.name || 'לא ידוע'}\n${employeeNames}\n${patientNames}`;
              if (firstEveryTwoWeeks.notes && firstEveryTwoWeeks.notes.trim()) {
                cellContent += `\nהערות: ${firstEveryTwoWeeks.notes}`;
              }
              row.push(cellContent);
            } else {
              row.push('');
            }
            
            // Second column
            if (secondEveryTwoWeeks) {
              const room = options.rooms.find(r => r.id === secondEveryTwoWeeks.roomId);
              const patientNames = secondEveryTwoWeeks.patients?.map(p => `${p.firstName} ${p.lastName}`).join(', ') || 'חסר מטופל';
              const employeeNames = secondEveryTwoWeeks.employeeIds?.map(id => options.employees.find(e => e.id === id)?.firstName + " " + options.employees.find(e => e.id === id)?.lastName).filter(Boolean).join(', ') || 'לא ידוע';
              let cellContent = `${secondEveryTwoWeeks.startTime}-${secondEveryTwoWeeks.endTime}\n${room?.name || 'לא ידוע'}\n${employeeNames}\n${patientNames}`;
              if (secondEveryTwoWeeks.notes && secondEveryTwoWeeks.notes.trim()) {
                cellContent += `\nהערות: ${secondEveryTwoWeeks.notes}`;
              }
              row.push(cellContent);
            } else {
              row.push('');
            }
            
            return; // Skip regular session handling for this employee
          }
          
          // Handle regular sessions
          const currentSession = regularSessions[sessionRowIndex];
          
          if (currentSession) {
            const room = options.rooms.find(r => r.id === currentSession.roomId);
            const patientNames = currentSession.patients?.map(p => `${p.firstName} ${p.lastName}`).join(', ') || 'חסר מטופל';
            const employeeNames = currentSession.employeeIds?.map(id => options.employees.find(e => e.id === id)?.firstName + " " + options.employees.find(e => e.id === id)?.lastName).filter(Boolean).join(', ') || 'לא ידוע';
            let cellContent = `${currentSession.startTime}-${currentSession.endTime}\n${room?.name || 'לא ידוע'}\n${employeeNames}\n${patientNames}`;
            if (currentSession.notes && currentSession.notes.trim()) {
              cellContent += `\nהערות: ${currentSession.notes}`;
            }
            
            // Regular sessions span both columns
            row.push(cellContent); // First column
            row.push(''); // Second column will be merged
          } else if (sessionRowIndex === 0) {
            // Check for reserved hours if no session (only in first session row)
            const reservedHour = employee.reservedHours?.find(rh => 
              rh.day === day && 
              rh.startTime >= time && 
              rh.startTime < getNextHour(time)
            );
            if (reservedHour) {
              const reservedContent = `${reservedHour.startTime}-${reservedHour.endTime}\nשעות שמורות\n${reservedHour.notes || 'ללא הערות'}`;
              row.push(reservedContent); // First column
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

  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Apply styling
  const range = XLSX.utils.decode_range(ws['!ref']!);
  
  // Style headers (first row)
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
  
  // Merge cells for day labels
  if (!ws['!merges']) ws['!merges'] = [];
  let currentRow = 1;
  WEEK_DAYS.forEach(() => {
    const startRow = currentRow;
    const endRow = currentRow + timeSlots.length - 1;
    ws['!merges']!.push({
      s: { r: startRow, c: 0 },
      e: { r: endRow, c: 0 }
    });
    currentRow = endRow + 1;
  });
  
  // Merge headers for employee names (span across 2 columns)
  if (!ws['!merges']) ws['!merges'] = [];
  sortedEmployees.forEach((employee, empIndex) => {
    const startCol = 3 + (empIndex * 2); // Start after יום, שעה, פעילויות columns
    const endCol = startCol + 1;
    ws['!merges']!.push({
      s: { r: 0, c: startCol },
      e: { r: 0, c: endCol }
    });
  });

  // Apply employee colors to their columns and merge regular sessions
  sortedEmployees.forEach((employee, empIndex) => {
    const firstColIndex = 3 + (empIndex * 2); // Start after יום, שעה, פעילויות columns
    const secondColIndex = firstColIndex + 1;
    
    for (let row = 1; row <= range.e.r; row++) {
      const firstCellRef = XLSX.utils.encode_cell({ r: row, c: firstColIndex });
      const secondCellRef = XLSX.utils.encode_cell({ r: row, c: secondColIndex });
      
      // Check if first cell has content
      if (ws[firstCellRef] && ws[firstCellRef].v && ws[firstCellRef].v !== '') {
        // Check if second cell is empty (indicating a regular session that should span both columns)
        if (!ws[secondCellRef] || !ws[secondCellRef].v || ws[secondCellRef].v === '') {
          // Merge cells for regular sessions
          ws['!merges']!.push({
            s: { r: row, c: firstColIndex },
            e: { r: row, c: secondColIndex }
          });
        }
        
        // Apply styling to first cell
        if (!ws[firstCellRef].s) ws[firstCellRef].s = {};
        const textColor = getContrastingTextColor(employee.color);
        ws[firstCellRef].s.fill = { 
          patternType: 'solid',
          fgColor: { rgb: hexToExcelColor(employee.color) }
        };
        ws[firstCellRef].s.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' };
        ws[firstCellRef].s.font = { color: { rgb: textColor === 'white' ? 'FFFFFF' : '000000' } };
      }
      
      // Apply styling to second cell if it has content (every two weeks sessions)
      if (ws[secondCellRef] && ws[secondCellRef].v && ws[secondCellRef].v !== '') {
        if (!ws[secondCellRef].s) ws[secondCellRef].s = {};
        const textColor = getContrastingTextColor(employee.color);
        ws[secondCellRef].s.fill = { 
          patternType: 'solid',
          fgColor: { rgb: hexToExcelColor(employee.color) }
        };
        ws[secondCellRef].s.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' };
        ws[secondCellRef].s.font = { color: { rgb: textColor === 'white' ? 'FFFFFF' : '000000' } };
      }
    }
  });

  // Set column widths
  const colWidths: any[] = [
    { width: 12 }, // יום column
    { width: 10 }, // שעה column
    { width: 15 }  // פעילויות column
  ];
  sortedEmployees.forEach(() => {
    colWidths.push({ width: 15 }); // Employee first column
    colWidths.push({ width: 15 }); // Employee second column
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

  // Create headers: יום, שעה, פעילויות, then room columns (2 columns per room)
  const headers: any[] = ['יום', 'שעה', 'פעילויות'];
  sortedRooms.forEach(room => {
    headers.push(room.name);
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
      sortedRooms.forEach(room => {
        const roomSessions = findSessionsForRoomInTimeSlot(sessions, room.id, time, day);
        const regularSessionCount = roomSessions.filter(s => !s.everyTwoWeeks).length;
        if (regularSessionCount > maxSessionsInTimeSlot) {
          maxSessionsInTimeSlot = regularSessionCount;
        }
      });
      
      // Create rows for this time slot (one or more if there are multiple sessions)
      for (let sessionRowIndex = 0; sessionRowIndex < maxSessionsInTimeSlot; sessionRowIndex++) {
        const row: any[] = [
          timeIndex === 0 && sessionRowIndex === 0 ? dayLabel : '', // Show day only for first time slot and first session row
          sessionRowIndex === 0 ? time : '', // Show time only for first session row
        ];
        
        // Check for activities (only in first session row)
        const activity = sessionRowIndex === 0 ? isTimeInActivityPeriod(time, activities, day) : null;
        row.push(activity ? activity.name : '');
        
        // Process each room (2 columns per room)
        sortedRooms.forEach(room => {
          const roomSessions = findSessionsForRoomInTimeSlot(sessions, room.id, time, day);
          const regularSessions = roomSessions.filter(s => !s.everyTwoWeeks);
          const everyTwoWeeksSessions = roomSessions.filter(s => s.everyTwoWeeks);
          
          // Handle every two weeks sessions only in the first row
          if (sessionRowIndex === 0 && everyTwoWeeksSessions.length > 0) {
            // Handle both every two weeks sessions in the first row
            const firstEveryTwoWeeks = everyTwoWeeksSessions[0];
            const secondEveryTwoWeeks = everyTwoWeeksSessions[1];
            
            // First column
            if (firstEveryTwoWeeks) {
              const patientNames = firstEveryTwoWeeks.patients?.map(p => `${p.firstName} ${p.lastName}`).join(', ') || 'חסר מטופל';
              const employeeNames = firstEveryTwoWeeks.employeeIds?.map(id => employees.find(e => e.id === id)?.firstName + " " + employees.find(e => e.id === id)?.lastName).filter(Boolean).join(', ') || 'לא ידוע';
              let cellContent = `${firstEveryTwoWeeks.startTime}-${firstEveryTwoWeeks.endTime}\n${employeeNames}\n${patientNames}`;
              if (firstEveryTwoWeeks.notes && firstEveryTwoWeeks.notes.trim()) {
                cellContent += `\nהערות: ${firstEveryTwoWeeks.notes}`;
              }
              row.push(cellContent);
            } else {
              row.push('');
            }
            
            // Second column
            if (secondEveryTwoWeeks) {
              const patientNames = secondEveryTwoWeeks.patients?.map(p => `${p.firstName} ${p.lastName}`).join(', ') || 'חסר מטופל';
              const employeeNames = secondEveryTwoWeeks.employeeIds?.map(id => employees.find(e => e.id === id)?.firstName + " " + employees.find(e => e.id === id)?.lastName).filter(Boolean).join(', ') || 'לא ידוע';
              let cellContent = `${secondEveryTwoWeeks.startTime}-${secondEveryTwoWeeks.endTime}\n${employeeNames}\n${patientNames}`;
              if (secondEveryTwoWeeks.notes && secondEveryTwoWeeks.notes.trim()) {
                cellContent += `\nהערות: ${secondEveryTwoWeeks.notes}`;
              }
              row.push(cellContent);
            } else {
              row.push('');
            }
            
            return; // Skip regular session handling for this room
          }
          
          // Handle regular sessions
          const currentSession = regularSessions[sessionRowIndex];
          
          if (currentSession) {
            const patientNames = currentSession.patients?.map(p => `${p.firstName} ${p.lastName}`).join(', ') || 'חסר מטופל';
            const employeeNames = currentSession.employeeIds?.map(id => employees.find(e => e.id === id)?.firstName + " " + employees.find(e => e.id === id)?.lastName).filter(Boolean).join(', ') || 'לא ידוע';
            let cellContent = `${currentSession.startTime}-${currentSession.endTime}\n${employeeNames}\n${patientNames}`;
            if (currentSession.notes && currentSession.notes.trim()) {
              cellContent += `\nהערות: ${currentSession.notes}`;
            }
            
            // Regular sessions span both columns
            row.push(cellContent); // First column
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

  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Apply styling
  const range = XLSX.utils.decode_range(ws['!ref']!);
  
  // Style headers (first row)
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
  
  // Merge cells for day labels
  if (!ws['!merges']) ws['!merges'] = [];
  let currentRow = 1;
  WEEK_DAYS.forEach(() => {
    const startRow = currentRow;
    const endRow = currentRow + timeSlots.length - 1;
    ws['!merges']!.push({
      s: { r: startRow, c: 0 },
      e: { r: endRow, c: 0 }
    });
    currentRow = endRow + 1;
  });
  
  // Merge headers for room names (span across 2 columns)
  if (!ws['!merges']) ws['!merges'] = [];
  sortedRooms.forEach((room, roomIndex) => {
    const startCol = 3 + (roomIndex * 2); // Start after יום, שעה, פעילויות columns
    const endCol = startCol + 1;
    ws['!merges']!.push({
      s: { r: 0, c: startCol },
      e: { r: 0, c: endCol }
    });
  });

  // Apply room colors to their columns and merge regular sessions
  sortedRooms.forEach((room, roomIndex) => {
    const firstColIndex = 3 + (roomIndex * 2); // Start after יום, שעה, פעילויות columns
    const secondColIndex = firstColIndex + 1;
    
    for (let row = 1; row <= range.e.r; row++) {
      const firstCellRef = XLSX.utils.encode_cell({ r: row, c: firstColIndex });
      const secondCellRef = XLSX.utils.encode_cell({ r: row, c: secondColIndex });
      
      // Check if first cell has content
      if (ws[firstCellRef] && ws[firstCellRef].v && ws[firstCellRef].v !== '') {
        // Check if second cell is empty (indicating a regular session that should span both columns)
        if (!ws[secondCellRef] || !ws[secondCellRef].v || ws[secondCellRef].v === '') {
          // Merge cells for regular sessions
          ws['!merges']!.push({
            s: { r: row, c: firstColIndex },
            e: { r: row, c: secondColIndex }
          });
        }
        
        // Apply styling to first cell
        if (!ws[firstCellRef].s) ws[firstCellRef].s = {};
        const textColor = getContrastingTextColor(room.color);
        ws[firstCellRef].s.fill = { 
          patternType: 'solid',
          fgColor: { rgb: hexToExcelColor(room.color) }
        };
        ws[firstCellRef].s.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' };
        ws[firstCellRef].s.font = { color: { rgb: textColor === 'white' ? 'FFFFFF' : '000000' } };
      }
      
      // Apply styling to second cell if it has content (every two weeks sessions)
      if (ws[secondCellRef] && ws[secondCellRef].v && ws[secondCellRef].v !== '') {
        if (!ws[secondCellRef].s) ws[secondCellRef].s = {};
        const textColor = getContrastingTextColor(room.color);
        ws[secondCellRef].s.fill = { 
          patternType: 'solid',
          fgColor: { rgb: hexToExcelColor(room.color) }
        };
        ws[secondCellRef].s.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' };
        ws[secondCellRef].s.font = { color: { rgb: textColor === 'white' ? 'FFFFFF' : '000000' } };
      }
    }
  });

  // Set column widths
  const colWidths: any[] = [
    { width: 12 }, // יום column
    { width: 10 }, // שעה column
    { width: 15 }  // פעילויות column
  ];
  sortedRooms.forEach(() => {
    colWidths.push({ width: 15 }); // Room first column
    colWidths.push({ width: 15 }); // Room second column
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
  
  WEEK_DAYS.forEach((day: WeekDay) => {
    const dayLabel = DAY_LABELS[day];
    const daySessions = patientSessions.filter(s => s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    if (daySessions.length === 0) {
      data.push([dayLabel, 'אין טיפולים', '', '', '', '']);
    } else {
      daySessions.forEach((session, index) => {
        const room = rooms.find(r => r.id === session.roomId);
        
        // For multi-employee sessions, get all employee names
        const employeeNames = session.employeeIds?.map(id => employees.find(e => e.id === id)?.firstName + " " + employees.find(e => e.id === id)?.lastName).filter(Boolean).join(', ') || 'לא ידוע';

        data.push([
          index === 0 ? dayLabel : '', // Show day only for first session
          session.startTime,
          session.endTime,
          employeeNames,
          // For roles, assuming either all employees have same role or just show for first if different
          session.employeeIds?.length && employees.find(e => e.id === session.employeeIds[0]) ? getRoleName(employees.find(e => e.id === session.employeeIds[0])?.role, employees.find(e => e.id === session.employeeIds[0])?.roleId) : 'לא ידוע',
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

export function exportScheduleToExcel(options: ExcelExportOptions, scheduleName?: string): void {
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
  XLSX.utils.book_append_sheet(workbook, employeeWs, cleanFileName('לוח עובדים'));
  
  // Add room schedule worksheet
  const roomWs = createRoomScheduleWorksheet(options);
  XLSX.utils.book_append_sheet(workbook, roomWs, cleanFileName('לוח חדרים'));
  
  // Add individual patient worksheets
  const activePatients = patients.filter(p => p.isActive).sort((a, b) => 
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
  );
  
  activePatients.forEach(patient => {
    const patientWs = createPatientScheduleWorksheet(patient, options);
    // Limit worksheet name length and ensure it's valid
    const sheetName = cleanFileName(`${patient.firstName} ${patient.lastName}`).substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, patientWs, sheetName);
  });
  
  // Generate Excel file and download
  const cleanedScheduleName = scheduleName ? cleanFileName(scheduleName).replace(/\s+/g, '_') : 'Schedule';
  const fileName = `Schedule_${cleanedScheduleName}_Export.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
