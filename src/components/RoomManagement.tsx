import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
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

interface RoomManagementProps {
  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
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

  const handleSave = () => {
    if (!roomName.trim()) return;

    const roomData: Room = {
      id: editingRoom?.id || Date.now().toString(),
      name: roomName.trim()
    };

    if (editingRoom) {
      setRooms(prev => prev.map(room => room.id === editingRoom.id ? roomData : room));
    } else {
      setRooms(prev => [...prev, roomData]);
    }

    handleCloseDialog();
  };

  const handleDelete = (roomId: string) => {
    setRooms(prev => prev.filter(room => room.id !== roomId));
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
