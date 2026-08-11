import React from 'react';

export const PrivacyBadge: React.FC = () => {
  return (
    <span
      data-testid="privacy-badge"
      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 shadow-sm"
      title="100% Client-Side Scanning — No Data Ever Leaves Your Browser"
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
      <span>Local Only</span>
    </span>
  );
};
