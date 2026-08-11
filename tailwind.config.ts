import type { Config } from 'tailwindcss';
import { tokens } from './src/styles/tokens';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: tokens.colors.brand,
        semantic: tokens.colors.semantic,
        surface: tokens.colors.surface,
        badge: tokens.colors.badge,
      },
      fontFamily: {
        sans: tokens.typography.fontFamilies.sans,
        mono: tokens.typography.fontFamilies.mono,
      },
      fontSize: tokens.typography.fontSizes,
      fontWeight: tokens.typography.fontWeights,
      lineHeight: tokens.typography.lineHeights,
      spacing: tokens.spacing,
      boxShadow: tokens.shadows,
      borderRadius: tokens.radii,
    },
  },
  plugins: [],
} satisfies Config;
