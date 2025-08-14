import { Session, Employee, Room, DAY_LABELS, ROLE_LABELS } from '../types';

export function exportScheduleToCSV(
  sessions: Session[],
  employees: Employee[],
  rooms: Room[]
): void {
  if (sessions.length === 0) {
    alert('אין נתונים לייצוא');
    return;
  }

  const headers = ['יום', 'שעת התחלה', 'שעת סיום', 'עובד', 'תפקיד', 'חדר'];
  const rows = sessions.map(session => {
    const employee = employees.find(e => e.id === session.employeeId);
    const room = rooms.find(r => r.id === session.roomId);
    
    return [
      DAY_LABELS[session.day],
      session.startTime,
      session.endTime,
      employee ? `${employee.firstName} ${employee.lastName}` : 'לא ידוע',
      employee ? ROLE_LABELS[employee.role] : 'לא ידוע',
      room ? room.name : 'לא ידוע'
    ];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `לוח_זמנים_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}
