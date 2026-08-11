import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <span className="brand-icon" role="img" aria-label="shield">
          🛡️
        </span>
        <h1 className="brand-title">AirGap Scanner</h1>
        <span className="security-badge">Local-Only Security</span>
      </div>
    </header>
  );
};
