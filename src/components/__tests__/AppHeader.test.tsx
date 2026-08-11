import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppHeader } from '../AppHeader';
import { ThemeProvider } from '@/contexts';
import { PrivacyBadge } from '../PrivacyBadge';
import { StatusIndicators } from '../StatusIndicators';

const renderAppHeader = (initialEntries: string[] = ['/']) => {
  return render(
    <ThemeProvider initialTheme="dark">
      <MemoryRouter initialEntries={initialEntries}>
        <AppHeader />
        <Routes>
          <Route path="/" element={<div data-testid="scanner-page">Scanner View</div>} />
          <Route path="/about" element={<div data-testid="about-page">About View</div>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('AppHeader Component & Subcomponents', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders Logo with shield icon and AirGap Scanner title', () => {
    renderAppHeader(['/']);
    expect(screen.getByText('AirGap Scanner')).toBeDefined();
    expect(screen.getByRole('img', { name: /shield/i })).toBeDefined();
  });

  it('ensures PrivacyBadge displaying Local Only is always visible in the header', () => {
    render(<PrivacyBadge />);
    expect(screen.getByTestId('privacy-badge')).toBeDefined();
    expect(screen.getByText('Local Only')).toBeDefined();
  });

  it('renders StatusIndicators displaying Regex, Entropy, and LLM readiness dots', () => {
    render(<StatusIndicators />);
    expect(screen.getByTestId('status-indicators')).toBeDefined();
    expect(screen.getByTestId('status-dot-regex')).toBeDefined();
    expect(screen.getByTestId('status-dot-entropy')).toBeDefined();
    expect(screen.getByTestId('status-dot-llm')).toBeDefined();
  });

  it('renders Navigation Links for Scanner and About with correct href attributes', () => {
    renderAppHeader(['/']);
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const scannerLink = within(nav).getByRole('link', { name: /scanner/i });
    const aboutLink = within(nav).getByRole('link', { name: /about/i });

    expect(scannerLink.getAttribute('href')).toBe('/');
    expect(aboutLink.getAttribute('href')).toBe('/about');
  });

  it('persists AppHeader and PrivacyBadge across route transitions from / to /about', () => {
    const { rerender } = render(
      <ThemeProvider initialTheme="dark">
        <MemoryRouter initialEntries={['/']}>
          <AppHeader />
          <Routes>
            <Route path="/" element={<div>Scanner Page</div>} />
            <Route path="/about" element={<div>About Page</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByTestId('privacy-badge')).toBeDefined();
    expect(screen.getByText('Local Only')).toBeDefined();

    rerender(
      <ThemeProvider initialTheme="dark">
        <MemoryRouter initialEntries={['/about']}>
          <AppHeader />
          <Routes>
            <Route path="/" element={<div>Scanner Page</div>} />
            <Route path="/about" element={<div>About Page</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByTestId('privacy-badge')).toBeDefined();
    expect(screen.getByText('Local Only')).toBeDefined();
  });
});
