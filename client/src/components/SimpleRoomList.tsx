import React from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Button,
  IconButton
} from '@mui/material';
import { Add as AddIcon, HelpOutline } from '@mui/icons-material';
import { Room } from '../types';

interface SimpleRoomListProps {
  rooms: Room[];
  onRefresh: () => Promise<void>;
  setShowHelpModal: (show: boolean) => void;
  activeTab: number;
}

const SimpleRoomList: React.FC<SimpleRoomListProps> = ({ rooms, onRefresh, setShowHelpModal, activeTab }) => {
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          חדרי טיפול
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
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
          {/* Help Button for Rooms Tab */}
          <IconButton color="primary" onClick={() => setShowHelpModal(true)}>
            <HelpOutline sx={{ fontSize: 24 }} />
          </IconButton>
        </Box>
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

