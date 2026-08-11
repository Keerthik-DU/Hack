import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AboutPage } from '../AboutPage';
import { AppHeader } from '@/components';
import { ThemeProvider } from '@/contexts';
import { mockCleanPerformanceEntries } from '@/utils/__mocks__/performance-api';

describe('AboutPage Component & Trust Verification Audit', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders Hero section with title text and zero-trust philosophy description', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/about']}>
          <AboutPage />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByTestId('about-hero-section')).toBeDefined();
    expect(screen.getByText('About AirGap Scanner')).toBeDefined();
    expect(screen.getByText(/100% air-gapped guarantee/i)).toBeDefined();
  });

  it('renders TrustGrid with three trust cards', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/about']}>
          <AboutPage />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByTestId('trust-grid')).toBeDefined();
    expect(screen.getByTestId('trust-card-zero-network')).toBeDefined();
    expect(screen.getByTestId('trust-card-local-ai')).toBeDefined();
    expect(screen.getByTestId('trust-card-no-storage')).toBeDefined();
  });

  it('renders DetectionLayersSection with three layer detail cards', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/about']}>
          <AboutPage />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByTestId('detection-layers-section')).toBeDefined();
    expect(screen.getByTestId('layer-card-1')).toBeDefined();
    expect(screen.getByTestId('layer-card-2')).toBeDefined();
    expect(screen.getByTestId('layer-card-3')).toBeDefined();
  });

  it('executes Network Audit when button is clicked and displays PASS result banner', () => {
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue(
      mockCleanPerformanceEntries() as unknown as PerformanceEntry[]
    );

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/about']}>
          <AboutPage />
        </MemoryRouter>
      </ThemeProvider>
    );

    const auditBtn = screen.getByRole('button', { name: /run network audit/i });
    expect(auditBtn).toBeDefined();

    act(() => {
      auditBtn.click();
    });

    expect(screen.getByTestId('audit-result-banner')).toBeDefined();
    expect(screen.getByText(/PASS — Zero outbound requests detected/i)).toBeDefined();
  });

  it('renders BrowserCompatibilityTable with Chrome, Edge, and Safari rows', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/about']}>
          <AboutPage />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByTestId('browser-compatibility-section')).toBeDefined();
    expect(screen.getByTestId('browser-row-google-chrome')).toBeDefined();
    expect(screen.getByTestId('browser-row-microsoft-edge')).toBeDefined();
    expect(screen.getByTestId('browser-row-apple-safari')).toBeDefined();
  });

  it('renders AppHeader with PrivacyBadge on the /about route', () => {
    render(
      <ThemeProvider initialTheme="dark">
        <MemoryRouter initialEntries={['/about']}>
          <AppHeader />
          <Routes>
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByTestId('privacy-badge')).toBeDefined();
    expect(screen.getByText('Local Only')).toBeDefined();
  });
});
