import React from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Employee, ROLE_LABELS } from '../types';

interface SimpleEmployeeListProps {
  employees: Employee[];
  onRefresh: () => Promise<void>;
}

const SimpleEmployeeList: React.FC<SimpleEmployeeListProps> = ({ employees, onRefresh }) => {
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          עובדים
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            // For now, just refresh to show it's working
            onRefresh();
          }}
        >
          הוסף עובד
        </Button>
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
                        label={ROLE_LABELS[employee.role]} 
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
