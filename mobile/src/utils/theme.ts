export const colors = {
  primary: {
    background: '#C0E8F7',
    deep: '#000080',
    dark: '#336699',
  },

  text: {
    primary: '#FFFFFF',
    secondary: '#336699',
  },

  device: {
    frame: '#1A1A1A',
    iconGray: '#808080',
  },

  semantic: {
    white: '#FFFFFF',
    black: '#000000',
  },
} as const;

export type Colors = typeof colors;
