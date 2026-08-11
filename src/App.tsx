import React from 'react';
import { Header } from '@/components';
import '@/styles/globals.css';

export const App: React.FC = () => {
  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <div className="card hero-card">
          <h2>Zero-Trust Local Secret Scanning</h2>
          <p>
            Paste your code, logs, or configuration files to detect exposed API keys, credentials,
            and sensitive data client-side before sending to third-party tools.
          </p>
          <div className="status-banner">
            <span className="status-dot"></span>
            <span>Client-Side Engine Ready — 100% Air-Gapped Privacy</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
