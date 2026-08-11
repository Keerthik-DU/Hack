import React, { useState, useEffect } from 'react';
import { tokens } from '@/styles/tokens';

export const DesignTokenShowcase: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-8 bg-surface-light-card dark:bg-surface-dark-card text-surface-light-textPrimary dark:text-surface-dark-textPrimary border border-surface-light-border dark:border-surface-dark-border rounded-xl shadow-xl transition-colors duration-300">
      {/* Header & Theme Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-surface-light-border dark:border-surface-dark-border">
        <div>
          <h2 className="text-2xl font-bold font-sans text-brand-primary">Design Token System</h2>
          <p className="text-sm text-surface-light-textSecondary dark:text-surface-dark-textSecondary">
            Visual verification showcase for AirGap Scanner enterprise security tokens.
          </p>
        </div>
        <button
          onClick={toggleDarkMode}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-primary text-white hover:bg-brand-600 transition-colors shadow-md flex items-center gap-2"
        >
          {isDarkMode ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
        </button>
      </div>

      {/* Detection Layer Badges */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold font-sans">Detection Layer Badges</h3>
        <div className="flex flex-wrap gap-4">
          <span className="px-3 py-1.5 text-xs font-mono font-semibold rounded-md bg-badge-regex-bg text-badge-regex-text border border-badge-regex-border">
            [Regex Engine] Pattern Match
          </span>
          <span className="px-3 py-1.5 text-xs font-mono font-semibold rounded-md bg-badge-entropy-bg text-badge-entropy-text border border-badge-entropy-border">
            [Entropy Engine] Shannon Entropy High
          </span>
          <span className="px-3 py-1.5 text-xs font-mono font-semibold rounded-md bg-badge-llm-bg text-badge-llm-text border border-badge-llm-border">
            [LLM Engine] Contextual Verification
          </span>
        </div>
      </section>

      {/* Brand & Primary Colors */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold font-sans">Brand / Primary Palette</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
          {Object.entries(tokens.colors.brand)
            .filter(([key]) => !isNaN(Number(key)))
            .map(([shade, hex]) => (
              <div key={shade} className="flex flex-col items-center space-y-1">
                <div
                  className="w-full h-12 rounded-md shadow-sm border border-surface-light-border dark:border-surface-dark-border"
                  style={{ backgroundColor: hex }}
                />
                <span className="text-xs font-mono">{shade}</span>
              </div>
            ))}
        </div>
      </section>

      {/* Semantic Colors */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold font-sans">Semantic Colors</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-semantic-success-bg border border-semantic-success-light dark:border-semantic-success-dark">
            <span className="text-sm font-semibold text-semantic-success-light dark:text-semantic-success-dark">
              ✔ Success / Safe
            </span>
          </div>
          <div className="p-3 rounded-lg bg-semantic-warning-bg border border-semantic-warning-light dark:border-semantic-warning-dark">
            <span className="text-sm font-semibold text-semantic-warning-light dark:text-semantic-warning-dark">
              ⚠️ Warning / Low Confidence
            </span>
          </div>
          <div className="p-3 rounded-lg bg-semantic-error-bg border border-semantic-error-light dark:border-semantic-error-dark">
            <span className="text-sm font-semibold text-semantic-error-light dark:text-semantic-error-dark">
              ✖ Error / Exposed Secret
            </span>
          </div>
          <div className="p-3 rounded-lg bg-semantic-info-bg border border-semantic-info-light dark:border-semantic-info-dark">
            <span className="text-sm font-semibold text-semantic-info-light dark:text-semantic-info-dark">
              ℹ Info / AirGap Active
            </span>
          </div>
        </div>
      </section>

      {/* Typography Scale */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold font-sans">Typography Scale</h3>
        <div className="space-y-2 p-4 rounded-lg bg-surface-light-bg dark:bg-surface-dark-bg border border-surface-light-border dark:border-surface-dark-border">
          <p className="text-3xl font-bold font-sans">3xl: AirGap Scanner Security</p>
          <p className="text-2xl font-semibold font-sans">2xl: Zero-Trust Local Scanning</p>
          <p className="text-xl font-medium font-sans">xl: High-performance Client Engine</p>
          <p className="text-lg font-medium font-sans">lg: Pattern Matching & WebGPU LLM</p>
          <p className="text-base font-normal font-sans">
            base: Standard text body copy for AirGap Scanner UI.
          </p>
          <p className="text-sm font-normal font-sans">sm: Secondary metadata and labels.</p>
          <p className="text-xs font-mono text-brand-primary">
            xs (mono): const SECRET_KEY = "sk_live_123456789";
          </p>
        </div>
      </section>

      {/* Spacing & Radii Showcase */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold font-sans">Spacing & Border Radius Tokens</h3>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="p-2 bg-brand-primary text-white rounded-sm text-xs font-mono">
            sm (4px)
          </div>
          <div className="p-3 bg-brand-primary text-white rounded-md text-xs font-mono">
            md (8px)
          </div>
          <div className="p-4 bg-brand-primary text-white rounded-lg text-xs font-mono">
            lg (12px)
          </div>
          <div className="p-5 bg-brand-primary text-white rounded-xl text-xs font-mono">
            xl (16px)
          </div>
          <div className="p-4 bg-brand-primary text-white rounded-full text-xs font-mono">
            full (9999px)
          </div>
        </div>
      </section>
    </div>
  );
};
