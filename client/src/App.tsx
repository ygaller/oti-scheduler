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
      main: '#003366', // Deep blue from OTI
      light: '#0066CC', // Lighter blue for accents
      dark: '#002244',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ff6b35', // Orange accent color for CTAs
      light: '#ff9463',
      dark: '#c54a23',
      contrastText: '#ffffff',
    },
    background: {
      default: '#ffffff', // Clean white background
      paper: '#fafafa',
    },
    text: {
      primary: '#333333', // Dark gray for readability
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '"Nunito Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 700,
      color: '#003366',
    },
    h4: {
      fontWeight: 600,
      color: '#003366',
    },
    h5: {
      fontWeight: 600,
      color: '#003366',
    },
    h6: {
      fontWeight: 600,
      color: '#003366',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          '&.Mui-selected': {
            color: '#003366',
          },
        },
      },
    },
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
              <Box display="flex" alignItems="center" justifyContent="center" mb={3} gap={2}>
                <img 
                  src="/oti-header-logo.png" 
                  alt="OTI Logo" 
                  style={{ 
                    height: '60px', 
                    width: 'auto',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 51, 102, 0.1))'
                  }} 
                />
                <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
                  ניהול לוח זמנים
                </Typography>
              </Box>
              
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

              <Box sx={{ 
                mt: 4, 
                p: 2, 
                textAlign: 'center', 
                background: 'linear-gradient(135deg, #003366 0%, #0066CC 100%)', 
                color: 'white', 
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0, 51, 102, 0.2)'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
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
