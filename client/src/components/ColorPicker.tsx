import React from 'react';
import { Box, FormControl, FormLabel, IconButton } from '@mui/material';
import { Check } from '@mui/icons-material';
import { AVAILABLE_COLORS } from '../types';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => {
  return (
    <FormControl fullWidth>
      {label && <FormLabel component="legend" sx={{ mb: 1 }}>{label}</FormLabel>}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {AVAILABLE_COLORS.map((color) => (
          <IconButton
            key={color}
            onClick={() => onChange(color)}
            sx={{
              width: 40,
              height: 40,
              backgroundColor: color,
              border: value === color ? 3 : 1,
              borderColor: value === color ? 'primary.main' : 'grey.300',
              borderRadius: 1,
              '&:hover': {
                borderColor: 'primary.main',
                borderWidth: 2,
              },
            }}
          >
            {value === color && (
              <Check 
                sx={{ 
                  color: 'white',
                  fontSize: 20,
                  filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))'
                }} 
              />
            )}
          </IconButton>
        ))}
      </Box>
    </FormControl>
  );
};

export default ColorPicker;
