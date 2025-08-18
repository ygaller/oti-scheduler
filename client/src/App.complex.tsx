import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container, Box, Tabs, Tab, Button, Alert, CircularProgress, IconButton } from '@mui/material'; // Added IconButton
import { HelpOutline } from '@mui/icons-material'; // Added HelpOutline
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import './App.css';
import SimpleEmployeeList from './components/SimpleEmployeeList';
import SimpleRoomList from './components/SimpleRoomList';
import ScheduleConfiguration from './components/ScheduleConfiguration';
import HelpModal from './components/HelpModal'; // Added HelpModal
import { useEmployees, useRooms, useSchedule } from './hooks';
import { demoService } from './services/demoService';

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
  const [activeTab, setActiveTab] = useState(0);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false); // Added state for HelpModal

  // Use custom hooks for data management
  const employeesState = useEmployees();
  const roomsState = useRooms();
  const scheduleState = useSchedule();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const loadDemoData = async () => {
    try {
      setLoadingDemo(true);
      setDemoError(null);
      await demoService.loadDemoData();
      // Refetch data to update the UI
      await Promise.all([
        employeesState.refetch(),
        roomsState.refetch()
      ]);
    } catch (error) {
      console.error('Error loading demo data:', error);
      setDemoError(error instanceof Error ? error.message : 'Failed to load demo data');
    } finally {
      setLoadingDemo(false);
    }
  };

  // Check if any data exists
  const hasData = employeesState.employees.length > 0 || roomsState.rooms.length > 0;
  const isLoading = employeesState.loading || roomsState.loading || scheduleState.loading;

  return (
    <CacheProvider value={cacheRtl}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box dir="rtl" sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
          <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Loading indicator */}
            {isLoading && (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
              </Box>
            )}

            {/* Error messages */}
            {(employeesState.error || roomsState.error || scheduleState.error || demoError) && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {employeesState.error || roomsState.error || scheduleState.error || demoError}
              </Alert>
            )}

            {/* Welcome message and demo data button */}
            {!isLoading && !hasData && (
              <Alert 
                severity="info" 
                sx={{ mb: 3 }}
                action={
                  <Button 
                    color="inherit" 
                    size="small" 
                    onClick={loadDemoData}
                    disabled={loadingDemo}
                  >
                    {loadingDemo ? <CircularProgress size={20} /> : 'טען נתוני דמו'}
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

            {!isLoading && (
              <>
                {activeTab === 0 && (
                  <SimpleEmployeeList 
                    employees={employeesState.employees} 
                    onRefresh={employeesState.refetch}
                    setShowHelpModal={setShowHelpModal} // Pass prop
                    activeTab={activeTab} // Pass prop
                  />
                )}
                
                {activeTab === 1 && (
                  <SimpleRoomList 
                    rooms={roomsState.rooms} 
                    onRefresh={roomsState.refetch}
                    setShowHelpModal={setShowHelpModal} // Pass prop
                    activeTab={activeTab} // Pass prop
                  />
                )}
                
                {activeTab === 2 && (
                  <ScheduleConfiguration 
                    onDataChange={async () => {
                      await Promise.all([
                        employeesState.refetch(),
                        roomsState.refetch(),
                      ]);
                    }}
                    setShowHelpModal={setShowHelpModal} // Pass prop
                    activeTab={activeTab} // Pass prop
                  />
                )}
                
                {activeTab === 3 && (
                  <div>
                    <h2>לוח זמנים</h2>
                    <p>תכונה זו תהיה זמינה בקרוב</p>
                    <IconButton color="primary" onClick={() => setShowHelpModal(true)}>
                      <HelpOutline sx={{ fontSize: 24 }} />
                    </IconButton>
                  </div>
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

export default App;
