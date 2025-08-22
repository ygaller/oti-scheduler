import { Employee, Room, Schedule, Session, getRoleName, Activity, Patient } from '../types';
import { WEEK_DAYS, DAY_LABELS } from '../types/schedule';
import { calculateEmployeeSessionCount, calculateTotalSessionCount } from '../utils/sessionCounting';

interface PrintExportService {
  handlePrint: () => Promise<void>;
  handleExportExcel: () => void;
}

export const createPrintExportService = (
  schedule: Schedule | null,
  patients: Patient[],
  employees: Employee[],
  rooms: Room[],
  activities: Activity[],
  setErrorInfo: (info: { title: string; message: string; details?: string }) => void,
  setErrorModalOpen: (open: boolean) => void
): PrintExportService => {

  const getEmployeeSessionCount = (employeeId: string) => {
    if (!schedule) return 0;
    return calculateEmployeeSessionCount(schedule.sessions, employeeId, true);
  };

  const getTotalScheduledSessions = () => {
    if (!schedule) return 0;
    return calculateTotalSessionCount(schedule.sessions);
  };



  const getPrintStyles = (): string => {
    return `
      <style>
        /* Reset and base styles for all media */
        * {
          box-sizing: border-box;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #333;
          margin: 0;
          padding: 20px;
          direction: rtl;
        }

        /* Print-specific styles */
        @media print {
          @page {
            size: A4;
            margin: 1.5cm 1cm;
          }

          body {
            font-size: 11px;
            line-height: 1.3;
            padding: 0;
            margin: 0;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }

          .print-header {
            text-align: center;
            margin-bottom: 25px;
            border-bottom: 2px solid #b54080;
            padding-bottom: 12px;
            page-break-after: avoid;
          }

          .print-title {
            font-size: 20px;
            font-weight: bold;
            color: #b54080;
            margin-bottom: 8px;
          }

          .print-subtitle {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
          }

          .print-date {
            font-size: 10px;
            color: #888;
          }

          .day-section {
            page-break-inside: avoid;
            margin-bottom: 25px;
            border: 1px solid #ddd;
            border-radius: 6px;
            overflow: hidden;
            break-inside: avoid;
          }

          .day-header {
            background-color: #b54080 !important;
            color: white !important;
            padding: 8px 12px;
            font-weight: bold;
            font-size: 14px;
            text-align: center;
            page-break-after: avoid;
          }

          .employee-section {
            margin-bottom: 15px;
            border-bottom: 1px solid #eee;
            padding-bottom: 12px;
            page-break-inside: avoid;
          }

          .employee-header {
            background-color: #f8f9fa !important;
            padding: 6px 12px;
            font-weight: bold;
            border-bottom: 1px solid #ddd;
            font-size: 12px;
            page-break-after: avoid;
          }

          .session-item {
            padding: 6px 12px;
            border-bottom: 1px solid #f0f0f0;
            page-break-inside: avoid;
          }

          .session-time {
            font-weight: bold;
            color: #b54080;
            font-size: 11px;
          }

          .session-details {
            margin-top: 3px;
            font-size: 10px;
            color: #666;
            line-height: 1.2;
          }

          .reserved-hour {
            background-color: #fff3e0 !important;
            border-left: 3px solid #ff9800;
            padding: 6px 12px;
            margin: 1px 0;
            page-break-inside: avoid;
          }

          .no-sessions {
            padding: 12px;
            text-align: center;
            color: #999;
            font-style: italic;
            font-size: 10px;
          }

          .employee-statistics {
            margin-top: 25px;
            padding: 15px;
            background-color: #f9f9f9 !important;
            border: 1px solid #ddd;
            border-radius: 6px;
            page-break-inside: avoid;
          }

          .statistics-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 12px;
            color: #b54080;
            page-break-after: avoid;
          }

          .employee-stat {
            padding: 3px 0;
            border-bottom: 1px dotted #ccc;
            font-size: 10px;
          }

          .patient-section, .room-section {
            margin-bottom: 15px;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            overflow: hidden;
            page-break-inside: avoid;
          }

          .patient-header, .room-header {
            background-color: #f5f5f5 !important;
            padding: 8px 12px;
            font-weight: bold;
            border-bottom: 1px solid #ddd;
            font-size: 12px;
            page-break-after: avoid;
          }

          .room-header {
            background-color: #f0f8ff !important;
          }

          .session-card {
            padding: 8px 12px;
            border-bottom: 1px solid #f0f0f0;
            background-color: #fafafa !important;
            margin: 1px;
            border-radius: 3px;
            page-break-inside: avoid;
          }

          /* Force page breaks for better layout */
          .page-break {
            page-break-before: always;
          }

          /* Ensure backgrounds print */
          .day-header,
          .employee-header,
          .patient-header,
          .room-header,
          .reserved-hour,
          .employee-statistics,
          .session-card {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }

        /* Screen styles for preview */
        @media screen {
          .print-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #b54080;
            padding-bottom: 15px;
          }

          .print-title {
            font-size: 24px;
            font-weight: bold;
            color: #b54080;
            margin-bottom: 5px;
          }

          .day-section {
            margin-bottom: 30px;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
          }

          .day-header {
            background-color: #b54080;
            color: white;
            padding: 10px 15px;
            font-weight: bold;
            font-size: 16px;
            text-align: center;
          }
        }
      </style>
    `;
  };

  const generatePrintableSchedule = (viewTab: number, selectedPatientId: string): string => {
    if (!schedule) return '<p>אין לוח זמנים להדפסה</p>';

    let html = '';

    // Add current date to header
    const currentDate = new Date().toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (viewTab === 0) {
      // Employee View
      html += `
        <div class="print-header">
          <div class="print-title">לוח זמנים לפי עובדים</div>
          <div class="print-subtitle">${schedule.name}</div>
          <div class="print-date">נוצר בתאריך: ${currentDate}</div>
        </div>
      `;
      
      WEEK_DAYS.forEach(day => {
        const dayLabel = DAY_LABELS[day];
        html += `<div class="day-section"><div class="day-header">${dayLabel}</div>`;
        
        const sortedEmployees = [...employees].sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
        );
        
        let hasSessions = false;
        
        sortedEmployees.forEach(employee => {
          const employeeSessions = schedule.sessions.filter(s => 
            s.day === day && s.employeeIds && s.employeeIds.includes(employee.id)
          ).sort((a, b) => a.startTime.localeCompare(b.startTime));
          
          const reservedHours = employee.reservedHours.filter(rh => rh.day === day);
          
          if (employeeSessions.length > 0 || reservedHours.length > 0) {
            hasSessions = true;
            html += `<div class="employee-section">`;
            html += `<div class="employee-header">${employee.firstName} ${employee.lastName} - ${getRoleName(employee.role, employee.roleId)}</div>`;
            
            // Combine sessions and reserved hours, then sort by time
            const allItems: Array<{type: 'session' | 'reserved', data: any, startTime: string}> = [
              ...employeeSessions.map(s => ({type: 'session' as const, data: s, startTime: s.startTime})),
              ...reservedHours.map(rh => ({type: 'reserved' as const, data: rh, startTime: rh.startTime}))
            ].sort((a, b) => a.startTime.localeCompare(b.startTime));
            
            allItems.forEach(item => {
              if (item.type === 'session') {
                const session = item.data as Session;
                const room = rooms.find(r => r.id === session.roomId);
                html += `
                  <div class="session-item">
                    <div class="session-time">${session.startTime} - ${session.endTime}</div>
                    <div class="session-details">
                      חדר: ${room ? room.name : 'לא ידוע'}${session.patients && session.patients.length > 0 ? '<br>מטופלים: ' + session.patients.map((p: Patient) => `${p.firstName} ${p.lastName}`).join(', ') : '<br>ללא מטופל'}${session.notes && session.notes.trim() ? '<br>הערות: ' + session.notes : ''}
                    </div>
                  </div>
                `;
              } else {
                const reservedHour = item.data;
                html += `
                  <div class="reserved-hour">
                    <div class="session-time">${reservedHour.startTime} - ${reservedHour.endTime}</div>
                    <div class="session-details">שעות שמורות: ${reservedHour.description || 'ללא תיאור'}</div>
                  </div>
                `;
              }
            });
            
            html += `</div>`;
          }
        });
        
        if (!hasSessions) {
          html += '<div class="no-sessions">אין טיפולים מתוכננים ביום זה</div>';
        }
        
        html += '</div>';
      });
      
      // Add employee statistics
      html += '<div class="employee-statistics"><div class="statistics-title">סטטיסטיקת עובדים</div>';
      const sortedEmployees = [...employees].sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'he')
      );
      
      sortedEmployees.forEach(employee => {
        const employeeSessionCount = getEmployeeSessionCount(employee.id);
        html += `
          <div class="employee-stat">
            <strong>${employee.firstName} ${employee.lastName}:</strong> ${employeeSessionCount}/${employee.weeklySessionsCount} טיפולים
          </div>
        `;
      });
      
      html += `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
          <strong>סה"כ טיפולים: ${getTotalScheduledSessions()}</strong>
        </div>
      </div>`;
      
    } else if (viewTab === 1) {
      // Room View
      html += `
        <div class="print-header">
          <div class="print-title">לוח זמנים לפי חדרים</div>
          <div class="print-subtitle">${schedule.name}</div>
          <div class="print-date">נוצר בתאריך: ${currentDate}</div>
        </div>
      `;
      
      WEEK_DAYS.forEach(day => {
        const dayLabel = DAY_LABELS[day];
        html += `<div class="day-section"><div class="day-header">${dayLabel}</div>`;
        
        const sortedRooms = [...rooms].sort((a, b) => a.name.localeCompare(b.name, 'he'));
        
        let hasSessions = false;
        
        sortedRooms.forEach(room => {
          const roomSessions = schedule.sessions.filter(s => 
            s.day === day && s.roomId === room.id
          ).sort((a, b) => a.startTime.localeCompare(b.startTime));
          
          if (roomSessions.length > 0) {
            hasSessions = true;
            html += `<div class="room-section">`;
            html += `<div class="room-header">${room.name}</div>`;
            
            roomSessions.forEach(session => {
              const sessionEmployees = session.employeeIds ? employees.filter(e => session.employeeIds.includes(e.id)) : [];
              html += `
                <div class="session-item">
                  <div class="session-time">${session.startTime} - ${session.endTime}</div>
                  <div class="session-details">
                    עובדים: ${sessionEmployees.length > 0 ? sessionEmployees.map(emp => `${emp.firstName} ${emp.lastName}`).join(', ') : 'לא ידוע'}<br>
                    תפקידים: ${sessionEmployees.length > 0 ? sessionEmployees.map(emp => getRoleName(emp.role, emp.roleId)).join(', ') : 'לא ידוע'}${session.patients && session.patients.length > 0 ? '<br>מטופלים: ' + session.patients.map(p => `${p.firstName} ${p.lastName}`).join(', ') : ''}${session.notes && session.notes.trim() ? '<br>הערות: ' + session.notes : ''}
                  </div>
                </div>
              `;
            });
            
            html += `</div>`;
          }
        });
        
        if (!hasSessions) {
          html += '<div class="no-sessions">אין טיפולים מתוכננים ביום זה</div>';
        }
        
        html += '</div>';
      });
      
    } else if (viewTab === 2) {
      // Patient View
      const selectedPatient = patients.find(p => p.id === selectedPatientId);
      if (!selectedPatient) {
        return '<p>מטופל לא נמצא</p>';
      }
      
      html += `
        <div class="print-header">
          <div class="print-title">לוח זמנים עבור ${selectedPatient.firstName} ${selectedPatient.lastName}</div>
          <div class="print-subtitle">${schedule.name}</div>
          <div class="print-date">נוצר בתאריך: ${currentDate}</div>
        </div>
      `;
      
      WEEK_DAYS.forEach(day => {
        const dayLabel = DAY_LABELS[day];
        html += `<div class="day-section"><div class="day-header">${dayLabel}</div>`;
        
        const patientSessions = schedule.sessions.filter(session => 
          session.day === day && 
          session.patients?.some(p => p.id === selectedPatientId)
        ).sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        if (patientSessions.length > 0) {
          patientSessions.forEach(session => {
            const sessionEmployees = session.employeeIds ? employees.filter(e => session.employeeIds.includes(e.id)) : [];
            const room = rooms.find(r => r.id === session.roomId);
            
            html += `
              <div class="session-card">
                <div class="session-time">${session.startTime} - ${session.endTime}</div>
                <div class="session-details">
                  מטפלים: ${sessionEmployees.length > 0 ? sessionEmployees.map(emp => `${emp.firstName} ${emp.lastName}`).join(', ') : 'לא ידוע'}<br>
                  טיפול: ${sessionEmployees.length > 0 ? sessionEmployees.map(emp => getRoleName(emp.role, emp.roleId)).join(', ') : 'לא ידוע'}<br>
                  חדר: ${room ? room.name : 'לא ידוע'}${session.notes && session.notes.trim() ? '<br>הערות: ' + session.notes : ''}
                </div>
              </div>
            `;
          });
        } else {
          html += '<div class="no-sessions">אין טיפולים מתוכננים ביום זה</div>';
        }
        
        html += '</div>';
      });
    }

    return html;
  };

  const handlePrint = async () => {
    console.log('🖨️ [CLIENT DEBUG] Print button clicked');
    console.log('🖨️ [CLIENT DEBUG] Schedule available:', !!schedule);
    console.log('🖨️ [CLIENT DEBUG] electronAPI available:', !!window.electronAPI);
    console.log('🖨️ [CLIENT DEBUG] electronAPI.print available:', !!window.electronAPI?.print);
    console.log('🖨️ [CLIENT DEBUG] Platform:', window.electronAPI?.platform);

    if (!schedule) {
      console.log('🖨️ [CLIENT DEBUG] No schedule available for printing');
      setErrorInfo({
        title: 'שגיאה בהדפסה',
        message: 'אין לוח זמנים להדפסה'
      });
      setErrorModalOpen(true);
      return;
    }

    console.log('🖨️ [CLIENT DEBUG] Generating printable content...');
    // Generate the printable content based on schedule view tab
    const printContent = generatePrintableSchedule(0, patients.find(p => p.isActive)?.id || ''); // Default to employee view
    console.log('🖨️ [CLIENT DEBUG] Print content generated, length:', printContent.length);

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>לוח זמנים</title>
          ${getPrintStyles()}
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `;
    console.log('🖨️ [CLIENT DEBUG] Full HTML content generated, length:', htmlContent.length);

    try {
      // Check if running in Electron
      if (window.electronAPI && window.electronAPI.print) {
        console.log('🖨️ [CLIENT DEBUG] Using Electron print API');
        try {
          console.log('🖨️ [CLIENT DEBUG] Calling electronAPI.print.schedule...');
          const result = await window.electronAPI.print.schedule(htmlContent);
          console.log('🖨️ [CLIENT DEBUG] Print result:', result);

          if (!result.success) {
            console.error('🖨️ [CLIENT DEBUG] Electron print failed:', result.error);

            // Try alternative approaches for Windows
            if (window.electronAPI.platform === 'win32') {
              console.log('🖨️ [CLIENT DEBUG] Windows detected, trying alternative print methods...');

              // Try using window.print() as fallback for Windows
              try {
                console.log('🖨️ [CLIENT DEBUG] Trying window.print() fallback...');
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(htmlContent);
                  printWindow.document.close();

                  // Use a longer delay for Windows
                  setTimeout(() => {
                    try {
                      printWindow.print();
                      printWindow.close();
                      console.log('🖨️ [CLIENT DEBUG] Window.print() fallback succeeded');
                      return;
                    } catch (windowPrintError) {
                      console.error('🖨️ [CLIENT DEBUG] Window.print() fallback failed:', windowPrintError);
                      printWindow.close();
                    }
                  }, 1000);
                  return; // Exit early if window.open succeeded
                }
              } catch (windowPrintError) {
                console.error('🖨️ [CLIENT DEBUG] Window.print() fallback error:', windowPrintError);
              }
            }

            // Show error if all methods failed
            setErrorInfo({
              title: 'שגיאה בהדפסה',
              message: `שגיאה בהדפסה: ${result.error || 'שגיאה לא ידועה'}. אנא נסה שוב או בדוק שמדפסת זמינה במערכת.`
            });
            setErrorModalOpen(true);
          } else {
            console.log('🖨️ [CLIENT DEBUG] Print completed successfully');
          }
          return;
        } catch (electronError) {
          console.error('🖨️ [CLIENT DEBUG] Electron print error:', electronError);
          console.warn('Electron print failed, falling back to web print:', electronError);

          // For Windows, show a more specific error message
          if (window.electronAPI.platform === 'win32') {
            setErrorInfo({
              title: 'שגיאה בהדפסה',
              message: 'שגיאה בהדפסה באפליקציית Windows. אנא בדוק שמדפסת מחוברת ופעילה, או נסה להפעיל מחדש את האפליקציה.'
            });
            setErrorModalOpen(true);
            return;
          }
          // Continue to web fallback for other platforms
        }
      } else {
        console.log('🖨️ [CLIENT DEBUG] electronAPI not available, using web fallback');
      }

      console.log('🖨️ [CLIENT DEBUG] Using web print fallback');
      // Fallback for web version - use window.open
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        console.error('🖨️ [CLIENT DEBUG] Failed to open print window');
        setErrorInfo({
          title: 'שגיאה בהדפסה',
          message: 'לא ניתן לפתוח חלון הדפסה. אנא בדוק את הגדרות החסימה של הדפדפן.'
        });
        setErrorModalOpen(true);
        return;
      }

      console.log('🖨️ [CLIENT DEBUG] Writing content to print window');
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = () => {
        console.log('🖨️ [CLIENT DEBUG] Print window loaded, calling print()');
        try {
          printWindow.print();
          printWindow.close();
        } catch (printError) {
          console.error('🖨️ [CLIENT DEBUG] Web print error:', printError);
          printWindow.close();
          setErrorInfo({
            title: 'שגיאה בהדפסה',
            message: 'שגיאה בהדפסה. אנא נסה שוב.'
          });
          setErrorModalOpen(true);
        }
      };

      // Fallback timeout in case onload doesn't fire
      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          try {
            printWindow.print();
            printWindow.close();
          } catch (timeoutPrintError) {
            console.error('🖨️ [CLIENT DEBUG] Timeout print error:', timeoutPrintError);
            printWindow.close();
          }
        }
      }, 3000);

    } catch (error) {
      console.error('🖨️ [CLIENT DEBUG] General print error:', error);
      setErrorInfo({
        title: 'שגיאה בהדפסה',
        message: error instanceof Error ? error.message : 'שגיאה לא ידועה'
      });
      setErrorModalOpen(true);
    }
  };

  const handleExportExcel = () => {
    if (!schedule || schedule.sessions.length === 0) {
      setErrorInfo({
        title: 'שגיאה בייצוא',
        message: 'אין טיפולים לייצא'
      });
      setErrorModalOpen(true);
      return;
    }

    try {
      // Import the Excel export function dynamically
      import('../utils/excelExport').then(({ exportScheduleToExcel }) => {
        exportScheduleToExcel({
          sessions: schedule.sessions,
          patients: patients,
          employees: employees,
          rooms: rooms,
          activities: activities
        });
      }).catch(error => {
        console.error('Error importing Excel export:', error);
        setErrorInfo({
          title: 'שגיאה בייצוא',
          message: 'שגיאה בטעינת מודול הייצוא'
        });
        setErrorModalOpen(true);
      });
    } catch (error) {
      console.error('Error exporting schedule:', error);
      setErrorInfo({
        title: 'שגיאה בייצוא',
        message: error instanceof Error ? error.message : 'שגיאה לא ידועה'
      });
      setErrorModalOpen(true);
    }
  };

  return {
    handlePrint,
    handleExportExcel
  };
};
