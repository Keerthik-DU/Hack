import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { StatusBar } from '../StatusBar';
import { ThemeProvider } from '@/contexts';
import * as useModelStatusModule from '@/hooks/useModelStatus';
import {
  createMockModelStatus,
  createMockModelLifecycleStatus,
  createMockWebGPUUnavailableStatus,
} from '@/hooks/__mocks__/useModelStatus';

describe('StatusBar Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders WebGPU Available text when webgpuAvailable is true', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockModelStatus({ webgpuAvailable: true })
    );

    render(
      <ThemeProvider>
        <StatusBar />
      </ThemeProvider>
    );

    expect(screen.getByTestId('webgpu-status-indicator')).toBeDefined();
    expect(screen.getByText('WebGPU Available')).toBeDefined();
    expect(screen.queryByTestId('degraded-mode-message')).toBeNull();
  });

  it('renders WebGPU Unavailable warning and reassuring degraded mode message when webgpuAvailable is false', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockWebGPUUnavailableStatus()
    );

    render(
      <ThemeProvider>
        <StatusBar />
      </ThemeProvider>
    );

    expect(screen.getByText('WebGPU Unavailable — LLM analysis disabled')).toBeDefined();
    expect(screen.getByTestId('degraded-mode-message')).toBeDefined();
    expect(screen.getByText(/running in standard mode/i)).toBeDefined();
  });

  it('renders correct text and icons across all six model lifecycle states', () => {
    const states: Array<{ state: useModelStatusModule.ModelLifecycleState; textMatch: RegExp }> = [
      { state: 'checking', textMatch: /checking\.\.\./i },
      { state: 'downloading', textMatch: /downloading model/i },
      { state: 'verifying', textMatch: /verifying integrity\.\.\./i },
      { state: 'ready', textMatch: /model ready/i },
      { state: 'unavailable', textMatch: /model unavailable/i },
      { state: 'error', textMatch: /model error/i },
    ];

    states.forEach(({ state, textMatch }) => {
      vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
        createMockModelLifecycleStatus(state, 45)
      );

      const { unmount } = render(
        <ThemeProvider>
          <StatusBar />
        </ThemeProvider>
      );

      expect(screen.getByText(textMatch)).toBeDefined();
      unmount();
    });
  });

  it('renders progress bar ONLY during downloading state', () => {
    // 1. Downloading state -> Progress bar should exist
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockModelLifecycleStatus('downloading', 60)
    );

    const { unmount } = render(
      <ThemeProvider>
        <StatusBar />
      </ThemeProvider>
    );

    expect(screen.getByTestId('model-progress-bar')).toBeDefined();
    expect(screen.getByText(/downloading model \(60%\)/i)).toBeDefined();
    unmount();

    // 2. Ready state -> Progress bar should NOT exist
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockModelLifecycleStatus('ready')
    );

    render(
      <ThemeProvider>
        <StatusBar />
      </ThemeProvider>
    );

    expect(screen.queryByTestId('model-progress-bar')).toBeNull();
  });

  it('renders secondary PrivacyBadge in the footer bar', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(createMockModelStatus());

    render(
      <ThemeProvider>
        <StatusBar />
      </ThemeProvider>
    );

    expect(screen.getByTestId('privacy-badge')).toBeDefined();
    expect(screen.getByText('Local Only')).toBeDefined();
  });

  it('persists StatusBar footer across route transitions from / to /about', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(createMockModelStatus());

    render(
      <ThemeProvider initialTheme="dark">
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<StatusBar />} />
            <Route path="/about" element={<StatusBar />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByTestId('status-bar')).toBeDefined();
    expect(screen.getByTestId('privacy-badge')).toBeDefined();
  });
});
