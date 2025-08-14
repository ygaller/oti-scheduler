import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { ScheduleConfig } from '../types';

interface ScheduleConfigurationProps {
  config: ScheduleConfig;
  setConfig: React.Dispatch<React.SetStateAction<ScheduleConfig>>;
}

const ScheduleConfiguration: React.FC<ScheduleConfigurationProps> = ({ config, setConfig }) => {
  const parseTime = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return '00:00';
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const handleTimeChange = (
    period: keyof ScheduleConfig,
    field: 'startTime' | 'endTime',
    value: Date | null
  ) => {
    if (!value) return;
    
    const timeString = formatTime(value);
    setConfig(prev => ({
      ...prev,
      [period]: {
        ...prev[period],
        [field]: timeString
      }
    }));
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" mb={3}>
        הגדרות מערכת הזמנים
      </Typography>

      <Box display="flex" flexWrap="wrap" gap={3}>
        <Card sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.333% - 16px)' } }}>
          <CardContent>
            <Typography variant="h6" component="h2" mb={2} color="primary">
              ארוחת בוקר
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <TimePicker
                label="שעת התחלה"
                value={parseTime(config.breakfast.startTime)}
                onChange={(newValue) => handleTimeChange('breakfast', 'startTime', newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <TimePicker
                label="שעת סיום"
                value={parseTime(config.breakfast.endTime)}
                onChange={(newValue) => handleTimeChange('breakfast', 'endTime', newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.333% - 16px)' } }}>
          <CardContent>
            <Typography variant="h6" component="h2" mb={2} color="primary">
              מפגש בוקר
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <TimePicker
                label="שעת התחלה"
                value={parseTime(config.morningMeetup.startTime)}
                onChange={(newValue) => handleTimeChange('morningMeetup', 'startTime', newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <TimePicker
                label="שעת סיום"
                value={parseTime(config.morningMeetup.endTime)}
                onChange={(newValue) => handleTimeChange('morningMeetup', 'endTime', newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.333% - 16px)' } }}>
          <CardContent>
            <Typography variant="h6" component="h2" mb={2} color="primary">
              ארוחת צהריים
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <TimePicker
                label="שעת התחלה"
                value={parseTime(config.lunch.startTime)}
                onChange={(newValue) => handleTimeChange('lunch', 'startTime', newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <TimePicker
                label="שעת סיום"
                value={parseTime(config.lunch.endTime)}
                onChange={(newValue) => handleTimeChange('lunch', 'endTime', newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" component="h3" mb={2}>
          תצוגה מקדימה של הגדרות הזמנים
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={2}>
          <Typography variant="body2" color="text.secondary">
            ארוחת בוקר: {config.breakfast.startTime} - {config.breakfast.endTime}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            מפגש בוקר: {config.morningMeetup.startTime} - {config.morningMeetup.endTime}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ארוחת צהריים: {config.lunch.startTime} - {config.lunch.endTime}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          <strong>הערה:</strong> בזמנים אלה לא ניתן לתזמן טיפולים. השינויים נשמרים אוטומטית.
        </Typography>
      </Paper>
    </Box>
  );
};

export default ScheduleConfiguration;
