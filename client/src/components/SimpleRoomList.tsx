import React from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Button
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Room } from '../types';

interface SimpleRoomListProps {
  rooms: Room[];
  onRefresh: () => Promise<void>;
}

const SimpleRoomList: React.FC<SimpleRoomListProps> = ({ rooms, onRefresh }) => {
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          חדרי טיפול
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            // For now, just refresh to show it's working
            onRefresh();
          }}
        >
          הוסף חדר
        </Button>
      </Box>

      <Paper>
        <List>
          {rooms.length === 0 ? (
            <ListItem>
              <ListItemText primary="אין חדרי טיפול במערכת" />
            </ListItem>
          ) : (
            rooms.map((room) => (
              <ListItem key={room.id} divider>
                <ListItemText
                  primary={room.name}
                  secondary="זמין לטיפולים"
                />
              </ListItem>
            ))
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default SimpleRoomList;
