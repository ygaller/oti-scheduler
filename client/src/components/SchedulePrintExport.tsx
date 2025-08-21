import { Employee, Room, Schedule, Session, getRoleName, Activity, Patient } from '../types';
import { WeekDay, WEEK_DAYS, DAY_LABELS } from '../types/schedule';

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
    return schedule.sessions.filter(s => 
      s.employeeIds && s.employeeIds.includes(employeeId) && s.patients && s.patients.length > 0
    ).length;
  };

  const getTotalScheduledSessions = () => {
    if (!schedule) return 0;
    return schedule.sessions.length;
  };



  const getPrintStyles = (): string => {
    return `
      <style>
        @media print {
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 20px;
          }
          
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
          
          .print-subtitle {
            font-size: 14px;
            color: #666;
          }
          
          .day-section {
            page-break-inside: avoid;
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
          
          .employee-section {
            margin-bottom: 20px;
            border-bottom: 1px solid #eee;
            padding-bottom: 15px;
          }
          
          .employee-header {
            background-color: #f8f9fa;
            padding: 8px 15px;
            font-weight: bold;
            border-bottom: 1px solid #ddd;
          }
          
          .session-item {
            padding: 8px 15px;
            border-bottom: 1px solid #f0f0f0;
          }
          
          .session-time {
            font-weight: bold;
            color: #b54080;
          }
          
          .session-details {
            margin-top: 4px;
            font-size: 11px;
            color: #666;
          }
          
          .reserved-hour {
            background-color: #fff3e0;
            border-left: 4px solid #ff9800;
            padding: 8px 15px;
            margin: 2px 0;
          }
          
          .no-sessions {
            padding: 15px;
            text-align: center;
            color: #999;
            font-style: italic;
          }
          
          .employee-statistics {
            margin-top: 30px;
            padding: 20px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 8px;
          }
          
          .statistics-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #b54080;
          }
          
          .employee-stat {
            padding: 5px 0;
            border-bottom: 1px dotted #ccc;
          }
          
          .patient-section {
            margin-bottom: 20px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
          }
          
          .patient-header {
            background-color: #f5f5f5;
            padding: 10px 15px;
            font-weight: bold;
            border-bottom: 1px solid #ddd;
          }
          
          .session-card {
            padding: 10px 15px;
            border-bottom: 1px solid #f0f0f0;
            background-color: #fafafa;
            margin: 2px;
            border-radius: 4px;
          }
          
          .room-section {
            margin-bottom: 20px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
          }
          
          .room-header {
            background-color: #f0f8ff;
            padding: 10px 15px;
            font-weight: bold;
            border-bottom: 1px solid #ddd;
          }
        }
      </style>
    `;
  };

  const generatePrintableSchedule = (viewTab: number, selectedPatientId: string): string => {
    if (!schedule) return '<p>אין לוח זמנים להדפסה</p>';

    let html = '';

    if (viewTab === 0) {
      // Employee View
      html += '<div class="print-header"><div class="print-title">לוח זמנים לפי עובדים</div></div>';
      
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
      html += '<div class="print-header"><div class="print-title">לוח זמנים לפי חדרים</div></div>';
      
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
      
      html += `<div class="print-header"><div class="print-title">לוח זמנים עבור ${selectedPatient.firstName} ${selectedPatient.lastName}</div></div>`;
      
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
    if (!schedule) {
      setErrorInfo({
        title: 'שגיאה בהדפסה',
        message: 'אין לוח זמנים להדפסה'
      });
      setErrorModalOpen(true);
      return;
    }

    // Generate the printable content based on schedule view tab  
    const printContent = generatePrintableSchedule(0, patients.find(p => p.isActive)?.id || ''); // Default to employee view
    
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

    try {
      // Check if running in Electron
      if (window.electronAPI && window.electronAPI.print) {
        try {
          const result = await window.electronAPI.print.schedule(htmlContent);
          if (!result.success) {
            setErrorInfo({
              title: 'שגיאה בהדפסה',
              message: result.error || 'שגיאה לא ידועה בהדפסה'
            });
            setErrorModalOpen(true);
          }
          return;
        } catch (electronError) {
          console.warn('Electron print failed, falling back to web print:', electronError);
          // Continue to web fallback
        }
      }

      // Fallback for web version - use window.open
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setErrorInfo({
          title: 'שגיאה בהדפסה',
          message: 'לא ניתן לפתוח חלון הדפסה. אנא בדוק את הגדרות החסימה של הדפדפן.'
        });
        setErrorModalOpen(true);
        return;
      }

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    } catch (error) {
      console.error('Error printing schedule:', error);
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
