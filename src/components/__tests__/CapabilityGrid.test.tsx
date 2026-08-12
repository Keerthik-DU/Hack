import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CapabilityGrid } from '../CapabilityGrid';

describe('CapabilityGrid', () => {
  it('renders status icons for each layer combination', () => {
    render(<CapabilityGrid regex="ready" entropy="loading" llm="unavailable" />);
    expect(screen.getByTestId('capability-card-regex')).toBeTruthy();
    expect(screen.getByTestId('capability-icon-ready')).toBeTruthy();
    expect(screen.getByTestId('capability-icon-loading')).toBeTruthy();
    expect(screen.getByTestId('capability-icon-unavailable')).toBeTruthy();
  });
});
