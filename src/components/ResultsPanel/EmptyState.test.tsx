import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('WO-029: EmptyState', () => {
  it('renders scanning placeholder message', () => {
    render(<EmptyState scanning />);
    expect(screen.getByTestId('results-empty-state')).toBeDefined();
    expect(screen.getByTestId('empty-state-spinner')).toBeDefined();
    expect(screen.getByTestId('empty-state-title').textContent).toMatch(/Scanning/i);
  });

  it('renders idle placeholder when not scanning', () => {
    render(<EmptyState scanning={false} />);
    expect(screen.queryByTestId('empty-state-spinner')).toBeNull();
    expect(screen.getByTestId('empty-state-title').textContent).toBe('No findings yet');
  });
});
