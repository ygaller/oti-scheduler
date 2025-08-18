export function getContrastingTextColor(backgroundColor: string): string {
  // Function to convert hex to RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return { r, g, b };
  };

  // Function to convert RGB to luminance
  const getLuminance = (r: number, g: number, b: number): number => {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };

  let r, g, b;

  // Handle hex colors (e.g., #RRGGBB)
  if (backgroundColor.startsWith('#') && backgroundColor.length === 7) {
    const rgb = hexToRgb(backgroundColor);
    if (rgb) {
      ({ r, g, b } = rgb);
    } else {
      // Fallback if hex parsing fails
      return 'black'; 
    }
  } else if (backgroundColor.startsWith('rgb')) {
    // Handle rgb(a) colors (e.g., rgb(255, 0, 0) or rgba(255, 0, 0, 1))
    const parts = backgroundColor.match(/\d+/g)?.map(Number);
    if (parts && parts.length >= 3) {
      [r, g, b] = parts;
    } else {
      // Fallback if rgb parsing fails
      return 'black';
    }
  } else {
    // Default to black for unknown formats or invalid colors
    return 'black';
  }

  // Calculate luminance
  const luminance = getLuminance(r, g, b);

  // Use a threshold to determine text color (0.179 is a common value)
  return luminance > 0.179 ? 'black' : 'white';
}
