import React from 'react';
import { Box, Alert } from '@mui/material';
import ScheduleView from './ScheduleView';
import { Employee, Room, Patient, Schedule } from '../types';

interface ScheduleViewWrapperProps {
  employees: Employee[];
  rooms: Room[];
  patients: Patient[];
  schedule: Schedule | null;
  selectedScheduleId: string | null;
  setSchedule: () => Promise<void>;
  activeTab: number;
  allSchedules: Schedule[];
}

const ScheduleViewWrapper: React.FC<ScheduleViewWrapperProps> = ({
  employees,
  rooms,
  patients,
  schedule,
  selectedScheduleId,
  setSchedule,
  activeTab,
  allSchedules,
}) => {
  // Validate that we have a valid UUID and schedule
  const isValidUUID = (str: string | null): boolean => {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Show message if: no schedules exist, no schedule selected, or invalid schedule ID
  if (allSchedules.length === 0 || !selectedScheduleId || !schedule || !isValidUUID(selectedScheduleId)) {
    return (
      <Box mt={2}>
        <Alert severity="info">
          בחר לוח זמנים כדי להתחיל לעבוד איתו, או צור לוח זמנים חדש.
        </Alert>
      </Box>
    );
  }

  return (
    <ScheduleView
      employees={employees}
      rooms={rooms}
      patients={patients}
      schedule={schedule}
      selectedScheduleId={selectedScheduleId}
      setSchedule={setSchedule}
      activeTab={activeTab}
    />
  );
};

export default ScheduleViewWrapper;
