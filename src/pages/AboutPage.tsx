import React from 'react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-8 rounded-xl bg-surface-light-card dark:bg-surface-dark-card border border-surface-light-border dark:border-surface-dark-border space-y-6">
      <h2 className="text-2xl font-bold text-brand-primary">About AirGap Scanner</h2>
      <p className="text-surface-light-textSecondary dark:text-surface-dark-textSecondary leading-relaxed">
        AirGap Scanner is a client-side secret detection application designed to ensure that API
        keys, tokens, credentials, and sensitive data are caught before being submitted to
        third-party services or AI chat engines.
      </p>
      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm font-semibold">
        🛡️ 100% Client-Side Air-Gapped Privacy Architecture — Zero Server Uploads.
      </div>
    </div>
  );
};
