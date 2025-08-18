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
  Paper,
  Checkbox,
  FormControlLabel,
  Chip,
  Tooltip
} from '@mui/material';
import { Add, Edit, PowerOff, Power, HelpOutline } from '@mui/icons-material';
import { Room, getRandomColor } from '../types';
import { roomService } from '../services';
import ColorPicker from './ColorPicker';

interface RoomManagementProps {
  rooms: Room[];
  setRooms: (includeInactive?: boolean) => Promise<void>;
  setRoomActive: (id: string, isActive: boolean) => Promise<Room>;
  setShowHelpModal: (show: boolean) => void; // Add prop to open help modal
  activeTab: number; // Add prop to pass active tab index
}

const RoomManagement: React.FC<RoomManagementProps> = ({ rooms, setRooms, setRoomActive, setShowHelpModal, activeTab }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomName, setRoomName] = useState('');
  const [roomColor, setRoomColor] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  const handleOpenDialog = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      setRoomName(room.name);
      setRoomColor(room.color);
    } else {
      setEditingRoom(null);
      setRoomName('');
      setRoomColor(getRandomColor());
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRoom(null);
    setRoomName('');
    setRoomColor('');
  };

  const handleSave = async () => {
    if (!roomName.trim()) return;

    try {
      const roomData: Omit<Room, 'id' | 'isActive'> = {
        name: roomName.trim(),
        color: roomColor
      };

      if (editingRoom) {
        await roomService.update(editingRoom.id, roomData);
      } else {
        await roomService.create(roomData);
      }

      await setRooms(!showActiveOnly); // Refresh the list
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving room:', error);
      // TODO: Add proper error handling/notification
    }
  };

  const handleToggleActive = async (roomId: string, currentStatus: boolean) => {
    try {
      await setRoomActive(roomId, !currentStatus);
      await setRooms(!showActiveOnly); // Refresh the list
    } catch (error) {
      console.error('Error updating room status:', error);
      // TODO: Add proper error handling/notification
    }
  };

  const handleShowActiveToggle = async (checked: boolean) => {
    setShowActiveOnly(checked);
    await setRooms(!checked); // If showing active only, don't include inactive
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          ניהול חדרי טיפול
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <FormControlLabel
            control={
              <Checkbox
                checked={showActiveOnly}
                onChange={(e) => handleShowActiveToggle(e.target.checked)}
              />
            }
            label="הראה פעילים בלבד"
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            הוסף חדר טיפול
          </Button>
          {/* Help Button for Rooms Tab */}
          <IconButton color="primary" onClick={() => setShowHelpModal(true)}>
            <HelpOutline sx={{ fontSize: 24 }} />
          </IconButton>
        </Box>
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
                <TableCell>צבע</TableCell>
                <TableCell>סטטוס</TableCell>
                <TableCell>פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...rooms].sort((a, b) => a.name.localeCompare(b.name, 'he')).map((room) => (
                <TableRow key={room.id} sx={{ opacity: room.isActive ? 1 : 0.6 }}>
                  <TableCell>
                    <Typography variant="body1">{room.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        backgroundColor: room.color,
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'grey.300'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={room.isActive ? 'פעיל' : 'כבוי'}
                      color={room.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenDialog(room)}>
                      <Edit />
                    </IconButton>
                    <Tooltip title={room.isActive ? 'כבה' : 'הפעל'}>
                      <IconButton onClick={() => handleToggleActive(room.id, room.isActive)}>
                        {room.isActive ? <PowerOff /> : <Power />}
                      </IconButton>
                    </Tooltip>
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              autoFocus
              label="שם החדר"
              fullWidth
              variant="outlined"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
            <ColorPicker
              value={roomColor}
              onChange={setRoomColor}
              label="צבע החדר"
            />
          </Box>
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
