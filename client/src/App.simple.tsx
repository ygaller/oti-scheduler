import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container, Box, Tabs, Tab, Typography, Paper, List, ListItem, ListItemText, Button, CircularProgress } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import './App.css';

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
  const [employees, setEmployees] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [employeesRes, roomsRes] = await Promise.all([
        fetch('http://localhost:3001/api/employees'),
        fetch('http://localhost:3001/api/rooms')
      ]);
      
      if (employeesRes.ok && roomsRes.ok) {
        const employeesData = await employeesRes.json();
        const roomsData = await roomsRes.json();
        setEmployees(employeesData);
        setRooms(roomsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h5" mb={2}>עובדים ({employees.length})</Typography>
                      <List>
                        {employees.map((emp) => (
                          <ListItem key={emp.id}>
                            <ListItemText 
                              primary={`${emp.firstName} ${emp.lastName}`}
                              secondary={`${emp.role} - ${emp.weeklySessionsCount} טיפולים שבועיים`}
                            />
                          </ListItem>
                        ))}
                      </List>
                      {employees.length === 0 && (
                        <Typography color="text.secondary">אין עובדים במערכת</Typography>
                      )}
                    </Paper>
                  )}
                  
                  {activeTab === 1 && (
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h5" mb={2}>חדרי טיפול ({rooms.length})</Typography>
                      <List>
                        {rooms.map((room) => (
                          <ListItem key={room.id}>
                            <ListItemText primary={room.name} />
                          </ListItem>
                        ))}
                      </List>
                      {rooms.length === 0 && (
                        <Typography color="text.secondary">אין חדרי טיפול במערכת</Typography>
                      )}
                    </Paper>
                  )}
                  
                  {activeTab === 2 && (
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h5" mb={2}>הגדרות מערכת</Typography>
                      <Button 
                        variant="contained" 
                        color="error" 
                        onClick={() => alert('תכונת איפוס נתונים תהיה זמינה בקרוב')}
                      >
                        איפוס כל הנתונים
                      </Button>
                    </Paper>
                  )}
                  
                  {activeTab === 3 && (
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h5" mb={2}>לוח זמנים</Typography>
                      <Typography>תכונה זו תהיה זמינה בקרוב</Typography>
                    </Paper>
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

