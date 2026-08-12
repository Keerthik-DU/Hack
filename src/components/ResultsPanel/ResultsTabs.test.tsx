import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResultsTabs } from './ResultsTabs';

describe('WO-029: ResultsTabs', () => {
  function renderTabs() {
    return render(
      <ResultsTabs
        findingsPanel={<div data-testid="findings-content">Findings body</div>}
        redactedPanel={<div data-testid="redacted-content">Redacted body</div>}
      />
    );
  }

  it('shows Findings tabpanel by default and hides Redacted Preview', () => {
    renderTabs();
    const findingsPanel = screen.getByTestId('results-tabpanel-findings');
    const redactedPanel = screen.getByTestId('results-tabpanel-redacted');
    expect(findingsPanel.hasAttribute('hidden')).toBe(false);
    expect(redactedPanel.hasAttribute('hidden')).toBe(true);
    expect(screen.getByTestId('findings-content')).toBeDefined();
  });

  it('switches to Redacted Preview on tab click', () => {
    renderTabs();
    fireEvent.click(screen.getByTestId('results-tab-redacted'));
    expect(screen.getByTestId('results-tabpanel-findings').hasAttribute('hidden')).toBe(true);
    expect(screen.getByTestId('results-tabpanel-redacted').hasAttribute('hidden')).toBe(false);
    expect(screen.getByTestId('redacted-content')).toBeDefined();
  });

  it('supports keyboard arrow navigation between tabs', () => {
    renderTabs();
    const findingsTab = screen.getByTestId('results-tab-findings');
    findingsTab.focus();
    fireEvent.keyDown(findingsTab, { key: 'ArrowRight' });
    expect(screen.getByTestId('results-tab-redacted').getAttribute('aria-selected')).toBe(
      'true'
    );
    expect(screen.getByTestId('results-tabpanel-redacted').hasAttribute('hidden')).toBe(false);

    const redactedTab = screen.getByTestId('results-tab-redacted');
    fireEvent.keyDown(redactedTab, { key: 'ArrowLeft' });
    expect(screen.getByTestId('results-tab-findings').getAttribute('aria-selected')).toBe(
      'true'
    );
  });

  it('uses ARIA tab and tabpanel roles', () => {
    renderTabs();
    expect(screen.getByRole('tablist')).toBeDefined();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    // hidden tabpanels are excluded from role queries in RTL — query by test id
    expect(screen.getByTestId('results-tabpanel-findings').getAttribute('role')).toBe(
      'tabpanel'
    );
    expect(screen.getByTestId('results-tabpanel-redacted').getAttribute('role')).toBe(
      'tabpanel'
    );
  });

  it('preserves both panel contents across tab switches (no unmount)', () => {
    renderTabs();
    fireEvent.click(screen.getByTestId('results-tab-redacted'));
    fireEvent.click(screen.getByTestId('results-tab-findings'));
    expect(screen.getByTestId('findings-content')).toBeDefined();
    expect(screen.getByTestId('redacted-content')).toBeDefined();
  });
});
