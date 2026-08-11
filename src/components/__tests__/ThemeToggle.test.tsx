import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider } from '@/contexts';
import { ThemeToggle } from '../ThemeToggle';

describe('ThemeToggle Integration Component', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('renders ThemeToggle button with correct initial aria-label and toggles theme on click', () => {
    render(
      <ThemeProvider initialTheme="dark">
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggleButton = screen.getByRole('button', { name: /switch to light mode/i });
    expect(toggleButton).toBeDefined();
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => {
      toggleButton.click();
    });

    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeDefined();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
