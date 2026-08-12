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
      keyframes: {
        checkBounce: {
          '0%': { transform: 'scale(0) rotate(0deg)', opacity: '0' },
          '60%': { transform: 'scale(1.2) rotate(300deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(360deg)', opacity: '1' },
        },
        titleReveal: {
          '0%': { letterSpacing: '0.5em', opacity: '0' },
          '100%': { letterSpacing: '0em', opacity: '1' },
        },
        descFadeUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        statPopIn: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        badgeSlideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        findingEnter: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'check-bounce': 'checkBounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
        'title-reveal': 'titleReveal 0.6s ease-out both',
        'desc-fade-up': 'descFadeUp 0.5s ease-out both',
        'stat-pop-in': 'statPopIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
        'badge-slide-up': 'badgeSlideUp 0.4s ease-out both',
        'finding-enter': 'findingEnter 0.28s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config;
