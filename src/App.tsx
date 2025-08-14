import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container, Box, Tabs, Tab, Button, Alert } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import './App.css';
import EmployeeManagement from './components/EmployeeManagement';
import RoomManagement from './components/RoomManagement';
import ScheduleConfiguration from './components/ScheduleConfiguration';
import ScheduleView from './components/ScheduleView';
import { Employee, Room, ScheduleConfig, Schedule } from './types';
import { createDemoEmployees, createDemoRooms } from './utils/demoData';

// Create RTL cache
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#ff4081',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({
    breakfast: { startTime: '08:00', endTime: '08:30' },
    morningMeetup: { startTime: '09:00', endTime: '09:15' },
    lunch: { startTime: '12:00', endTime: '13:00' }
  });
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const loadDemoData = () => {
    setEmployees(createDemoEmployees());
    setRooms(createDemoRooms());
  };

  return (
    <CacheProvider value={cacheRtl}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box dir="rtl" sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
          <Container maxWidth="xl" sx={{ py: 3 }}>
            {employees.length === 0 && rooms.length === 0 && (
              <Alert 
                severity="info" 
                sx={{ mb: 3 }}
                action={
                  <Button color="inherit" size="small" onClick={loadDemoData}>
                    טען נתוני דמו
                  </Button>
                }
              >
                ברוכים הבאים למערכת התיזמון! התחל על ידי הוספת עובדים וחדרי טיפול, או טען נתוני דמו לבדיקה מהירה.
              </Alert>
            )}
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={activeTab} onChange={handleTabChange} aria-label="navigation tabs">
                <Tab label="עובדים" />
                <Tab label="חדרי טיפול" />
                <Tab label="הגדרות מערכת הזמנים" />
                <Tab label="לוח זמנים" />
              </Tabs>
            </Box>

            {activeTab === 0 && (
              <EmployeeManagement 
                employees={employees} 
                setEmployees={setEmployees}
              />
            )}
            
            {activeTab === 1 && (
              <RoomManagement 
                rooms={rooms} 
                setRooms={setRooms}
              />
            )}
            
            {activeTab === 2 && (
              <ScheduleConfiguration 
                config={scheduleConfig} 
                setConfig={setScheduleConfig}
              />
            )}
            
            {activeTab === 3 && (
              <ScheduleView 
                employees={employees}
                rooms={rooms}
                scheduleConfig={scheduleConfig}
                schedule={schedule}
                setSchedule={setSchedule}
              />
            )}
          </Container>
          </Box>
        </ThemeProvider>
      </LocalizationProvider>
    </CacheProvider>
  );
}

export default App;
