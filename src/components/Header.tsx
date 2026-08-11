import React from 'react';
import { ThemeToggle } from './ThemeToggle';

export const Header: React.FC = () => {
  return (
    <header className="app-header flex justify-between items-center px-6 py-4 border-b border-surface-light-border dark:border-surface-dark-border bg-surface-light-card/80 dark:bg-surface-dark-card/80 backdrop-blur-md">
      <div className="header-brand flex items-center gap-3">
        <span className="brand-icon text-2xl" role="img" aria-label="shield">
          🛡️
        </span>
        <h1 className="brand-title text-xl font-bold text-brand-primary">AirGap Scanner</h1>
        <span className="security-badge text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
          Local-Only Security
        </span>
      </div>
      <ThemeToggle />
    </header>
  );
};
