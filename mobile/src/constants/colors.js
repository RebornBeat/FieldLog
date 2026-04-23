// MetaStrata mobile — design tokens
// Mirror the desktop dark theme (with light theme future support)

export const Colors = {
  // Backgrounds
  bg: {
    void:     '#060709',
    base:     '#0A0B0E',
    raised:   '#0E1013',
    surface:  '#131519',
    overlay:  '#18191F',
    elevated: '#1C1E25',
    hover:    '#21242C',
    active:   '#272B35',
    selected: '#2C3040',
  },

  // Borders
  border: {
    faint:  'rgba(255,255,255,0.04)',
    dim:    'rgba(255,255,255,0.07)',
    subtle: 'rgba(255,255,255,0.10)',
    muted:  'rgba(255,255,255,0.15)',
    strong: 'rgba(255,255,255,0.22)',
  },

  // Text
  text: {
    bright:   '#F2EEE8',
    primary:  '#D4D0C8',
    secondary:'#9A958E',
    muted:    '#636058',
    faint:    '#3A3835',
  },

  // Accent — amber
  amber: {
    bright:  '#D6A94E',
    base:    '#C8933A',
    dim:     '#8A6428',
    faint:   'rgba(200,147,58,0.10)',
    glow:    'rgba(200,147,58,0.18)',
    border:  'rgba(200,147,58,0.30)',
  },

  // Semantic
  success: '#4D8460',
  successBright: '#60A375',
  successFaint: 'rgba(77,132,96,0.14)',

  danger: '#924040',
  dangerBright: '#BE5252',
  dangerFaint: 'rgba(146,64,64,0.14)',

  warning: '#A07830',
  info: '#3A6A8E',

  // Tab bar
  tabActive:   '#C8933A',
  tabInactive: '#636058',

  // Transparent
  transparent: 'transparent',
};

export const Fonts = {
  display: 'Georgia',        // serif fallback for Playfair Display
  mono:    'Courier New',    // monospace fallback for JetBrains Mono
  sans:    undefined,        // uses system default (SF Pro on iOS, Roboto on Android)
};

export const Radius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const Spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
};
