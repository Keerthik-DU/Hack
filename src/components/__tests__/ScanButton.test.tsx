import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScanButton } from '../ScanButton';
import { mockScanError } from '@/hooks/__fixtures__/scan-mocks';

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
    render(
      <ScanButton
        inputText="const key = 'val';"
        onScanTriggered={handleScanTriggered}
        scanEngineOptions={{ scanDelayMs: 300 }}
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
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('Scan Again')).toBeDefined();
  });

  it('displays user-friendly error banner identifying failed layer when scan error occurs', async () => {
    render(
      <ScanButton
        inputText="sample code"
        scanEngineOptions={{
          scanDelayMs: 200,
          shouldFail: true,
          simulatedError: mockScanError,
        }}
      />
    );

    const button = screen.getByTestId('scan-button');

    act(() => {
      button.click();
    });

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByTestId('scan-error-banner')).toBeDefined();
    expect(screen.getByText(/Regex Engine \(Layer 1\):/i)).toBeDefined();
    expect(screen.getByText(/Regex engine encountered an unexpected pattern error/i)).toBeDefined();
    expect(screen.getByText('Scan Again')).toBeDefined();
  });

  it('allows clicking Scan Again to initiate a new scan', async () => {
    render(
      <ScanButton inputText="const text = 'test';" scanEngineOptions={{ scanDelayMs: 200 }} />
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

    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText('Scan Again')).toBeDefined();
  });
});
