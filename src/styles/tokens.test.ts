import { describe, it, expect } from 'vitest';
import { tokens, colors, spacing, typography, shadows, radii } from './tokens';

describe('Design Tokens System', () => {
  it('contains expected color categories and detection layer badges', () => {
    expect(colors.brand).toBeDefined();
    expect(colors.brand.primary).toBe('#06b6d4');
    expect(colors.semantic.success).toBeDefined();
    expect(colors.semantic.warning).toBeDefined();
    expect(colors.semantic.error).toBeDefined();
    expect(colors.semantic.info).toBeDefined();
    expect(colors.surface.light).toBeDefined();
    expect(colors.surface.dark).toBeDefined();
    expect(colors.badge.regex).toBeDefined();
    expect(colors.badge.entropy).toBeDefined();
    expect(colors.badge.llm).toBeDefined();
  });

  it('contains spacing scale from 4px (1) to 96px (24)', () => {
    expect(spacing[1]).toBe('4px');
    expect(spacing[4]).toBe('16px');
    expect(spacing[24]).toBe('96px');
  });

  it('contains typography configuration with font scale from 3xl to xs', () => {
    expect(typography.fontFamilies.sans).toContain('Poppins');
    expect(typography.fontFamilies.mono).toBeDefined();
    expect(typography.fontSizes['3xl']).toBeDefined();
    expect(typography.fontSizes.xs).toBeDefined();
    expect(typography.fontWeights.normal).toBe('400');
    expect(typography.fontWeights.bold).toBe('700');
  });

  it('contains shadow and border radius tokens', () => {
    expect(shadows.glow).toBeDefined();
    expect(radii.full).toBe('9999px');
  });

  it('exports composite tokens object matching individual exports', () => {
    expect(tokens.colors).toEqual(colors);
    expect(tokens.spacing).toEqual(spacing);
    expect(tokens.typography).toEqual(typography);
    expect(tokens.shadows).toEqual(shadows);
    expect(tokens.radii).toEqual(radii);
  });
});
