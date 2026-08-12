import { describe, expect, it } from 'vitest';
import { formatBytes } from '../format-bytes';

describe('formatBytes', () => {
  it('formats KB/MB/GB with one decimal', () => {
    expect(formatBytes(512)).toBe('512.0 B');
    expect(formatBytes(245 * 1024 * 1024)).toContain('MB');
    expect(formatBytes(800 * 1024 * 1024)).toContain('MB');
  });

  it('handles invalid input', () => {
    expect(formatBytes(-1)).toBe('0.0 KB');
    expect(formatBytes(Number.NaN)).toBe('0.0 KB');
  });
});
