import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ScannerLayout, PlaceholderInputPanel, PlaceholderResultsPanel } from '../ScannerLayout';

describe('ScannerLayout Component', () => {
  it('renders inputPanel and resultsPanel content via slot composition props', () => {
    render(
      <ScannerLayout
        inputPanel={<div data-testid="custom-input">Custom Input</div>}
        resultsPanel={<div data-testid="custom-results">Custom Results</div>}
      />
    );

    expect(screen.getByTestId('custom-input')).toBeDefined();
    expect(screen.getByTestId('custom-results')).toBeDefined();
  });

  it('applies two-column responsive CSS Grid classes', () => {
    render(<ScannerLayout inputPanel={<div>Input</div>} resultsPanel={<div>Results</div>} />);

    const layoutContainer = screen.getByTestId('scanner-layout');
    expect(layoutContainer.className).toContain('grid');
    expect(layoutContainer.className).toContain('grid-cols-1');
    expect(layoutContainer.className).toContain('lg:grid-cols-2');
  });

  it('applies mount slide entry animation and hover shadow classes to both panel slots', () => {
    render(<ScannerLayout inputPanel={<div>Input</div>} resultsPanel={<div>Results</div>} />);

    const inputSlot = screen.getByTestId('input-panel-slot');
    const resultsSlot = screen.getByTestId('results-panel-slot');

    expect(inputSlot.className).toContain('animate-panel-slide-left');
    expect(inputSlot.className).toContain('shadow-md');
    expect(inputSlot.className).toContain('hover:shadow-lg');

    expect(resultsSlot.className).toContain('animate-panel-slide-right');
    expect(resultsSlot.className).toContain('shadow-md');
    expect(resultsSlot.className).toContain('hover:shadow-lg');
  });

  it('renders correctly with placeholder panel fixtures', () => {
    render(
      <ScannerLayout
        inputPanel={<PlaceholderInputPanel />}
        resultsPanel={<PlaceholderResultsPanel />}
      />
    );

    expect(screen.getByTestId('placeholder-input-panel')).toBeDefined();
    expect(screen.getByTestId('placeholder-results-panel')).toBeDefined();
    expect(screen.getByText('Input Source Text')).toBeDefined();
    expect(screen.getByText('Detection Findings')).toBeDefined();
  });
});
