export const colors = {
  brand: {
    50: '#ecfeff',
    100: '#cffaff',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
    primary: '#06b6d4',
    secondary: '#3b82f6',
  },
  semantic: {
    success: {
      light: '#10b981',
      DEFAULT: '#10b981',
      dark: '#059669',
      bg: 'rgba(16, 185, 129, 0.1)',
    },
    warning: {
      light: '#f59e0b',
      DEFAULT: '#f59e0b',
      dark: '#d97706',
      bg: 'rgba(245, 158, 11, 0.1)',
    },
    error: {
      light: '#ef4444',
      DEFAULT: '#ef4444',
      dark: '#dc2626',
      bg: 'rgba(239, 68, 68, 0.1)',
    },
    info: {
      light: '#0ea5e9',
      DEFAULT: '#0ea5e9',
      dark: '#0284c7',
      bg: 'rgba(14, 165, 233, 0.1)',
    },
  },
  surface: {
    light: {
      bg: '#ffffff',
      card: '#f9fafb',
      border: '#e5e7eb',
      textPrimary: '#111827',
      textSecondary: '#4b5563',
    },
    dark: {
      bg: '#0b0f19',
      card: '#111827',
      border: 'rgba(255, 255, 255, 0.1)',
      textPrimary: '#f9fafb',
      textSecondary: '#9ca3af',
    },
  },
  badge: {
    regex: {
      bg: 'rgba(168, 85, 247, 0.15)',
      text: '#c084fc',
      border: 'rgba(168, 85, 247, 0.3)',
    },
    entropy: {
      bg: 'rgba(249, 115, 22, 0.15)',
      text: '#fb923c',
      border: 'rgba(249, 115, 22, 0.3)',
    },
    llm: {
      bg: 'rgba(6, 182, 212, 0.15)',
      text: '#22d3ee',
      border: 'rgba(6, 182, 212, 0.3)',
    },
  },
} as const;

export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

export const typography = {
  fontFamilies: {
    sans: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
    mono: [
      'Fira Code',
      'JetBrains Mono',
      'ui-monospace',
      'SFMono-Regular',
      'Menlo',
      'Monaco',
      'Consolas',
      'monospace',
    ],
  },
  fontSizes: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
  },
  fontWeights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeights: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
  glow: '0 0 15px rgba(6, 182, 212, 0.35)',
} as const;

export const radii = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

export const tokens = {
  colors,
  spacing,
  typography,
  shadows,
  radii,
} as const;

export type DesignTokens = typeof tokens;
