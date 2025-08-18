import React from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  IconButton
} from '@mui/material';
import { Add as AddIcon, HelpOutline } from '@mui/icons-material';
import { Employee, getRoleName } from '../types';

interface SimpleEmployeeListProps {
  employees: Employee[];
  onRefresh: () => Promise<void>;
  setShowHelpModal: (show: boolean) => void;
  activeTab: number;
}

const SimpleEmployeeList: React.FC<SimpleEmployeeListProps> = ({ employees, onRefresh, setShowHelpModal, activeTab }) => {
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          עובדים
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              onRefresh();
            }}
          >
            הוסף עובד
          </Button>
          {/* Help Button for Employees Tab */}
          <IconButton color="primary" onClick={() => setShowHelpModal(true)}>
            <HelpOutline sx={{ fontSize: 24 }} />
          </IconButton>
        </Box>
      </Box>

      <Paper>
        <List>
          {employees.length === 0 ? (
            <ListItem>
              <ListItemText primary="אין עובדים במערכת" />
            </ListItem>
          ) : (
            employees.map((employee) => (
              <ListItem key={employee.id} divider>
                <ListItemText
                  primary={`${employee.firstName} ${employee.lastName}`}
                  secondary={
                    <Box>
                      <Chip 
                        label={getRoleName(employee.role, employee.roleId)} 
                        size="small" 
                        sx={{ mr: 1 }}
                      />
                      <Typography variant="body2" component="span">
                        {employee.weeklySessionsCount} טיפולים שבועיים
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default SimpleEmployeeList;

