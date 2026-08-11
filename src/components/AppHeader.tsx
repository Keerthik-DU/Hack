import React from 'react';
import { NavLink } from 'react-router-dom';
import { PrivacyBadge } from './PrivacyBadge';
import { StatusIndicators } from './StatusIndicators';
import { ThemeToggle } from './ThemeToggle';

export const AppHeader: React.FC = () => {
  return (
    <header className="app-header animate-slide-down sticky top-0 z-50 flex flex-wrap justify-between items-center px-4 sm:px-6 py-3.5 border-b border-surface-light-border dark:border-surface-dark-border bg-surface-light-card/85 dark:bg-surface-dark-card/85 backdrop-blur-md transition-colors duration-300">
      {/* Brand Logo & Privacy Badge */}
      <div className="flex items-center gap-3">
        <NavLink
          to="/"
          className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-brand-primary rounded-lg p-1"
        >
          <span
            className="brand-icon text-2xl transform group-hover:scale-110 transition-transform duration-200"
            role="img"
            aria-label="shield"
          >
            🛡️
          </span>
          <span className="brand-title font-sans font-bold text-lg sm:text-xl text-brand-primary tracking-tight">
            AirGap Scanner
          </span>
        </NavLink>
        <PrivacyBadge />
      </div>

      {/* Center Engine Status Indicators */}
      <StatusIndicators />

      {/* Navigation Links & Theme Toggle */}
      <div className="flex items-center gap-4">
        <nav aria-label="Main Navigation" className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                isActive
                  ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                  : 'text-surface-light-textSecondary dark:text-surface-dark-textSecondary hover:text-surface-light-textPrimary dark:hover:text-surface-dark-textPrimary hover:bg-surface-light-bg dark:hover:bg-surface-dark-bg'
              }`
            }
          >
            Scanner
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                isActive
                  ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                  : 'text-surface-light-textSecondary dark:text-surface-dark-textSecondary hover:text-surface-light-textPrimary dark:hover:text-surface-dark-textPrimary hover:bg-surface-light-bg dark:hover:bg-surface-dark-bg'
              }`
            }
          >
            About
          </NavLink>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
};
