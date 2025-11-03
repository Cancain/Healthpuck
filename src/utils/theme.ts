export const colors = {
  primary: {
    background: "#C0E8F7",
    deep: "#000080",
    dark: "#336699",
  },

  text: {
    primary: "#FFFFFF",
    secondary: "#336699",
  },

  device: {
    frame: "#1A1A1A",
    iconGray: "#808080",
  },

  semantic: {
    white: "#FFFFFF",
    black: "#000000",
  },
} as const;

export const fonts = {
  family: {
    primary:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  },

  weight: {
    regular: 400,
    semiBold: 600,
    bold: 700,
  },

  styles: {
    title: {
      fontWeight: 700,
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    },
    body: {
      fontWeight: 400,
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    },
  },
} as const;

export const cssVariables = {
  "--color-primary-background": colors.primary.background,
  "--color-primary-deep": colors.primary.deep,
  "--color-primary-dark": colors.primary.dark,
  "--color-text-primary": colors.text.primary,
  "--color-text-secondary": colors.text.secondary,
  "--color-device-frame": colors.device.frame,
  "--color-device-icon-gray": colors.device.iconGray,
  "--color-semantic-white": colors.semantic.white,
  "--color-semantic-black": colors.semantic.black,

  "--font-family-primary": fonts.family.primary,
  "--font-weight-regular": fonts.weight.regular.toString(),
  "--font-weight-semi-bold": fonts.weight.semiBold.toString(),
  "--font-weight-bold": fonts.weight.bold.toString(),
} as const;

export type Colors = typeof colors;
export type Fonts = typeof fonts;
