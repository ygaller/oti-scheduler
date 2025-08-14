import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container, Box, Tabs, Tab, Typography, Paper, CircularProgress } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import './App.css';

// Import components and services
import EmployeeManagement from './components/EmployeeManagement';
import RoomManagement from './components/RoomManagement';
import ScheduleConfiguration from './components/ScheduleConfiguration';
import ScheduleView from './components/ScheduleView';
import { employeeService, roomService, scheduleService } from './services';
import { Employee, Room, ScheduleConfig, Schedule } from './types';

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
});

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [config, setConfig] = useState<ScheduleConfig | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [employeesData, roomsData, configData, activeSchedule] = await Promise.all([
        employeeService.getAll(),
        roomService.getAll(),
        scheduleService.getConfig(),
        scheduleService.getActive().catch(() => null) // Handle case where no active schedule exists
      ]);
      
      setEmployees(employeesData);
      setRooms(roomsData);
      setConfig(configData);
      setSchedule(activeSchedule);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshEmployees = async () => {
    try {
      const employeesData = await employeeService.getAll();
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error refreshing employees:', error);
    }
  };

  const refreshRooms = async () => {
    try {
      const roomsData = await roomService.getAll();
      setRooms(roomsData);
    } catch (error) {
      console.error('Error refreshing rooms:', error);
    }
  };

  const updateConfig = async (newConfig: ScheduleConfig) => {
    try {
      const updatedConfig = await scheduleService.updateConfig(newConfig);
      setConfig(updatedConfig);
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  };

  const refreshSchedule = async () => {
    try {
      const activeSchedule = await scheduleService.getActive();
      setSchedule(activeSchedule);
    } catch (error) {
      console.error('Error refreshing schedule:', error);
      setSchedule(null);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <CacheProvider value={cacheRtl}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box dir="rtl" sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
            <Container maxWidth="xl" sx={{ py: 3 }}>
              <Typography variant="h3" component="h1" mb={3} textAlign="center">
                🎯 מערכת התיזמון
              </Typography>
              
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeTab} onChange={handleTabChange} aria-label="navigation tabs">
                  <Tab label="עובדים" />
                  <Tab label="חדרי טיפול" />
                  <Tab label="הגדרות" />
                  <Tab label="לוח זמנים" />
                </Tabs>
              </Box>

              {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {activeTab === 0 && (
                    <EmployeeManagement 
                      employees={employees} 
                      setEmployees={refreshEmployees} 
                    />
                  )}
                  
                  {activeTab === 1 && (
                    <RoomManagement 
                      rooms={rooms} 
                      setRooms={refreshRooms} 
                    />
                  )}
                  
                  {activeTab === 2 && (
                    config ? (
                      <ScheduleConfiguration 
                        config={config} 
                        setConfig={updateConfig} 
                      />
                    ) : (
                      <Paper sx={{ p: 3 }}>
                        <Typography>טוען הגדרות...</Typography>
                      </Paper>
                    )
                  )}
                  
                  {activeTab === 3 && (
                    config ? (
                      <ScheduleView 
                        employees={employees} 
                        rooms={rooms} 
                        scheduleConfig={config}
                        schedule={schedule}
                        setSchedule={refreshSchedule} 
                      />
                    ) : (
                      <Paper sx={{ p: 3 }}>
                        <Typography>טוען נתוני לוח זמנים...</Typography>
                      </Paper>
                    )
                  )}
                </>
              )}

              <Box sx={{ mt: 4, p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'white', borderRadius: 1 }}>
                <Typography variant="body2">
                  ✅ מסד הנתונים: PostgreSQL מוטמע | 🚀 API: http://localhost:3001 | 💾 נתונים נשמרים באופן קבוע
                </Typography>
              </Box>
            </Container>
          </Box>
        </ThemeProvider>
      </LocalizationProvider>
    </CacheProvider>
  );
}

export default App;
