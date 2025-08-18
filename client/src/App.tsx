import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container, Box, Tabs, Tab, Typography, CircularProgress } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import './App.css';

// Import components and services
import EmployeeManagement from './components/EmployeeManagement';
import PatientManagement from './components/PatientManagement';
import RoomManagement from './components/RoomManagement';
import ScheduleConfiguration from './components/ScheduleConfiguration';
import ScheduleView from './components/ScheduleView';
import HelpModal from './components/HelpModal'; // Import the new HelpModal component

import { employeeService, patientService, roomService, scheduleService } from './services';

import { Employee, Patient, Room, Schedule } from './types';

// Create RTL cache
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: {
      main: '#9B1E65', // OTI primary color (e-global-color-primary)
      light: '#b54080', // Lighter shade for accents
      dark: '#7a1851',
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
      color: '#9B1E65',
    },
    h4: {
      fontWeight: 600,
      color: '#9B1E65',
    },
    h5: {
      fontWeight: 600,
      color: '#9B1E65',
    },
    h6: {
      fontWeight: 600,
      color: '#9B1E65',
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
            color: '#9B1E65',
          },
        },
      },
    },
  },
});

// Main App Content Component (everything except routing)
function AppContent() {
  const [showHelpModal, setShowHelpModal] = useState(false); // State for help modal visibility

  // Load saved tab from localStorage or default to 0
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('scheduling-app-active-tab');
    const tabIndex = savedTab ? parseInt(savedTab, 10) : 0;
    // Ensure the tab index is valid (0-4 for the 5 tabs)
    return tabIndex >= 0 && tabIndex <= 4 ? tabIndex : 0;
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);



  const fetchData = async () => {
    try {
      setLoading(true);
      const [employeesData, patientsData, roomsData, activeSchedule] = await Promise.all([
        employeeService.getAll(),
        patientService.getAll(),
        roomService.getAll(),
        scheduleService.getActive().catch(() => null) // Handle case where no active schedule exists
      ]);
      
      setEmployees(employeesData);
      setPatients(patientsData);
      setRooms(roomsData);
      setSchedule(activeSchedule);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshEmployees = async (includeInactive = false) => {
    try {
      const employeesData = await employeeService.getAll(includeInactive);
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error refreshing employees:', error);
    }
  };

  const refreshPatients = async (includeInactive = false) => {
    try {
      const patientsData = await patientService.getAll(includeInactive);
      setPatients(patientsData);
    } catch (error) {
      console.error('Error refreshing patients:', error);
    }
  };

  const refreshRooms = async (includeInactive = false) => {
    try {
      const roomsData = await roomService.getAll(includeInactive);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error refreshing rooms:', error);
    }
  };

  const setEmployeeActive = async (id: string, isActive: boolean): Promise<Employee> => {
    try {
      const updatedEmployee = await employeeService.setActive(id, isActive);
      setEmployees(prev => prev.map(emp => emp.id === id ? updatedEmployee : emp));
      return updatedEmployee;
    } catch (error) {
      console.error('Error updating employee status:', error);
      throw error;
    }
  };

  const setPatientActive = async (id: string, isActive: boolean): Promise<Patient> => {
    try {
      const updatedPatient = await patientService.setActive(id, isActive);
      setPatients(prev => prev.map(patient => patient.id === id ? updatedPatient : patient));
      return updatedPatient;
    } catch (error) {
      console.error('Error updating patient status:', error);
      throw error;
    }
  };

  const setRoomActive = async (id: string, isActive: boolean): Promise<Room> => {
    try {
      const updatedRoom = await roomService.setActive(id, isActive);
      setRooms(prev => prev.map(room => room.id === id ? updatedRoom : room));
      return updatedRoom;
    } catch (error) {
      console.error('Error updating room status:', error);
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
    // Save the active tab to localStorage for persistence
    localStorage.setItem('scheduling-app-active-tab', newValue.toString());
  };



  return (
    <CacheProvider value={cacheRtl}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box dir="rtl" sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
            <Container maxWidth="xl" sx={{ py: 3 }}>
              {/* Header with logo and title */}
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                  <img 
                    src={process.env.PUBLIC_URL + '/oti-header-logo.png'} 
                    alt="OTI Logo" 
                    style={{ 
                      height: '60px', 
                      width: 'auto',
                      filter: 'drop-shadow(0 2px 4px rgba(155, 30, 101, 0.1))',
                      borderRadius: '16px'
                    }} 
                  />
                  <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
                    ניהול לוח זמנים לגני תקשורת
                  </Typography>
                </Box>
                {/* Removed Global Help Button */}
              </Box>

              {/* Main content */}
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={activeTab} onChange={handleTabChange} aria-label="navigation tabs">
                      <Tab label="הגדרות" />
                      <Tab label="עובדים" />
                      <Tab label="מטופלים" />
                      <Tab label="חדרי טיפול" />
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
                        <>
                          <ScheduleConfiguration 
                            onDataChange={async () => {
                              await Promise.all([
                                refreshEmployees(),
                                refreshPatients(),
                                refreshRooms(),
                                fetchData()
                              ]);
                            }}
                            setShowHelpModal={setShowHelpModal} // Pass to ScheduleConfiguration
                            activeTab={activeTab}
                          />
                          
                          {/* System status - only show in settings tab */}
                          <Box sx={{ 
                            mt: 4, 
                            p: 2, 
                            textAlign: 'center', 
                            background: 'linear-gradient(135deg, #9B1E65 0%, #b54080 100%)', 
                            color: 'white', 
                            borderRadius: 2,
                            boxShadow: '0 2px 8px rgba(155, 30, 101, 0.2)'
                          }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              ✅ מסד הנתונים: PostgreSQL מוטמע | 🚀 API: http://localhost:3001
                            </Typography>
                          </Box>
                        </>
                      )}
                      
                      {activeTab === 1 && (
                        <EmployeeManagement 
                          employees={employees} 
                          setEmployees={refreshEmployees}
                          setEmployeeActive={setEmployeeActive}
                          setShowHelpModal={setShowHelpModal} // Pass to EmployeeManagement
                          activeTab={activeTab}
                        />
                      )}
                      
                      {activeTab === 2 && (
                        <PatientManagement 
                          patients={patients} 
                          setPatients={refreshPatients}
                          setPatientActive={setPatientActive}
                          setShowHelpModal={setShowHelpModal} // Pass to PatientManagement
                          activeTab={activeTab}
                        />
                      )}
                      
                      {activeTab === 3 && (
                        <RoomManagement 
                          rooms={rooms} 
                          setRooms={refreshRooms}
                          setRoomActive={setRoomActive}
                          setShowHelpModal={setShowHelpModal} // Pass to RoomManagement
                          activeTab={activeTab}
                        />
                      )}
                      
                      {activeTab === 4 && (
                        <ScheduleView 
                          employees={employees} 
                          rooms={rooms} 
                          patients={patients}
                          schedule={schedule}
                          setSchedule={refreshSchedule} 
                          setShowHelpModal={setShowHelpModal} // Pass to ScheduleView
                          activeTab={activeTab}
                        />
                      )}
                    </>
                  )}
            </Container>
            <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} activeTab={activeTab} />
          </Box>
        </ThemeProvider>
      </LocalizationProvider>
    </CacheProvider>
  );
}

// Main App Component with Routing
function App() {
  return (
    <Router>
      <Routes>

        <Route path="*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App;
