import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScanButton } from '../ScanButton';
import { mockScanCapabilities } from '@/hooks/__fixtures__/scan-mocks';
import { IScanOrchestrator, ScanCapabilities, ScanProgress } from '@/types';

class ImmediateMockOrchestrator implements IScanOrchestrator {
  public getCapabilities(): ScanCapabilities {
    return mockScanCapabilities;
  }

  public abort(): void {
    // no-op for tests
  }

  public async *scan(): AsyncGenerator<ScanProgress, void, unknown> {
    yield {
      status: 'scanning',
      stage: 'Scan running',
      percentage: 50,
      findings: [],
    };

    yield {
      status: 'complete',
      stage: 'Scan complete',
      percentage: 100,
      findings: [],
    };
  }
}

describe('ScanButton Component & State Machine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders disabled button when inputText is empty or whitespace', () => {
    render(<ScanButton inputText="" />);

    const button = screen.getByTestId('scan-button');
    expect(button).toBeDefined();
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('disabled')).not.toBeNull();
  });

  it('renders enabled idle button displaying Scan text when inputText is non-empty', () => {
    render(<ScanButton inputText="const AWS_KEY = 'AKIA123';" />);

    const button = screen.getByTestId('scan-button');
    expect(button.getAttribute('aria-disabled')).toBe('false');
    expect(screen.getByText('Scan')).toBeDefined();
  });

  it('transitions to scanning state displaying spinner and Scanning... text when clicked', async () => {
    const handleScanTriggered = vi.fn();
    const orchestrator = new ImmediateMockOrchestrator();
    render(
      <ScanButton
        inputText="const key = 'val';"
        onScanTriggered={handleScanTriggered}
        orchestrator={orchestrator}
      />
    );

    const button = screen.getByTestId('scan-button');

    act(() => {
      button.click();
    });

    expect(handleScanTriggered).toHaveBeenCalledWith("const key = 'val';");
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByTestId('scan-spinner')).toBeDefined();
    expect(screen.getByText('Scanning...')).toBeDefined();

    // Fast-forward scan completion
    await act(async () => {});

    expect(screen.getByText('Scan Again')).toBeDefined();
  });

  it('allows clicking Scan Again to initiate a new scan', async () => {
    const orchestrator = new ImmediateMockOrchestrator();
    render(
      <ScanButton inputText="const text = 'test';" orchestrator={orchestrator} />
    );

    const button = screen.getByTestId('scan-button');

    // 1st scan
    act(() => {
      button.click();
    });
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByText('Scan Again')).toBeDefined();

    // 2nd scan trigger
    act(() => {
      button.click();
    });
    expect(screen.getByText('Scanning...')).toBeDefined();

    await act(async () => {});
    expect(screen.getByText('Scan Again')).toBeDefined();
  });
});
