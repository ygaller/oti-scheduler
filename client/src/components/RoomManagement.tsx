import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,

  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { Room } from '../types';
import { roomService } from '../services';

interface RoomManagementProps {
  rooms: Room[];
  setRooms: () => Promise<void>;
}

const RoomManagement: React.FC<RoomManagementProps> = ({ rooms, setRooms }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomName, setRoomName] = useState('');

  const handleOpenDialog = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      setRoomName(room.name);
    } else {
      setEditingRoom(null);
      setRoomName('');
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRoom(null);
    setRoomName('');
  };

  const handleSave = async () => {
    if (!roomName.trim()) return;

    try {
      const roomData: Omit<Room, 'id'> = {
        name: roomName.trim()
      };

      if (editingRoom) {
        await roomService.update(editingRoom.id, roomData);
      } else {
        await roomService.create(roomData);
      }

      await setRooms(); // Refresh the list
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving room:', error);
      // TODO: Add proper error handling/notification
    }
  };

  const handleDelete = async (roomId: string) => {
    try {
      await roomService.delete(roomId);
      await setRooms(); // Refresh the list
    } catch (error) {
      console.error('Error deleting room:', error);
      // TODO: Add proper error handling/notification
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          ניהול חדרי טיפול
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          הוסף חדר טיפול
        </Button>
      </Box>

      {rooms.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              אין חדרי טיפול במערכת. לחץ על "הוסף חדר טיפול" כדי להתחיל.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>שם החדר</TableCell>
                <TableCell>פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell>
                    <Typography variant="body1">{room.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenDialog(room)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(room.id)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRoom ? 'עריכת חדר טיפול' : 'הוספת חדר טיפול חדש'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="שם החדר"
            fullWidth
            variant="outlined"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>ביטול</Button>
          <Button onClick={handleSave} variant="contained" disabled={!roomName.trim()}>
            {editingRoom ? 'עדכן' : 'הוסף'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoomManagement;
