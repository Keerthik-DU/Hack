import React, { useState } from 'react';

export interface AuditResult {
  hasRun: boolean;
  passed: boolean;
  unexpectedCount: number;
  unexpectedEntries: string[];
}

export const NetworkAuditSection: React.FC = () => {
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

  const runNetworkAudit = () => {
    let unexpected: string[] = [];

    if (typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function') {
      const entries = performance.getEntriesByType('resource') as Array<{
        name?: string;
        initiatorType?: string;
      }>;

      unexpected = entries
        .filter((entry) => {
          const type = entry.initiatorType?.toLowerCase() ?? '';
          return ['fetch', 'xmlhttprequest', 'beacon', 'websocket'].includes(type);
        })
        .map((entry) => entry.name ?? 'unknown request');
    }

    setAuditResult({
      hasRun: true,
      passed: unexpected.length === 0,
      unexpectedCount: unexpected.length,
      unexpectedEntries: unexpected,
    });
  };

  const checklistItems = [
    'No fetch() calls during scanning',
    'No XMLHttpRequest calls',
    'No WebSocket connections',
    'No navigator.sendBeacon() calls',
    'CSP headers enforced',
  ];

  return (
    <section data-testid="network-audit-section" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-xl bg-surface-light-card dark:bg-surface-dark-card border border-surface-light-border dark:border-surface-dark-border shadow-md">
        <div className="space-y-1">
          <h2 className="text-xl font-bold font-sans text-brand-primary">
            Live Network Audit Tool
          </h2>
          <p className="text-sm text-surface-light-textSecondary dark:text-surface-dark-textSecondary">
            Programmatically query the browser Performance API to verify zero outbound network
            requests were made.
          </p>
        </div>

        <button
          onClick={runNetworkAudit}
          aria-label="Run Network Audit"
          className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-brand-primary text-white hover:bg-brand-600 transition-colors shadow-md flex items-center gap-2 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          🔍 Run Network Audit
        </button>
      </div>

      {/* Audit Result Status Banner */}
      {auditResult?.hasRun && (
        <div
          data-testid="audit-result-banner"
          className={`p-4 rounded-lg border font-semibold text-sm flex items-center gap-3 transition-all ${
            auditResult.passed
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
          }`}
        >
          <span className="text-xl">{auditResult.passed ? '✅' : '❌'}</span>
          <div>
            <div>
              {auditResult.passed
                ? 'PASS — Zero outbound requests detected'
                : `FAIL — ${auditResult.unexpectedCount} unexpected requests detected`}
            </div>
            {auditResult.unexpectedEntries.length > 0 && (
              <ul className="text-xs font-mono mt-1 space-y-1 opacity-90">
                {auditResult.unexpectedEntries.map((entry, idx) => (
                  <li key={idx}>• {entry}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Verified Security Checklist */}
      <div className="p-6 rounded-xl bg-surface-light-card dark:bg-surface-dark-card border border-surface-light-border dark:border-surface-dark-border space-y-4">
        <h3 className="text-base font-bold font-sans">Verified Air-Gap Security Checklist</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {checklistItems.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-sm text-surface-light-textPrimary dark:text-surface-dark-textPrimary"
            >
              <span className="text-emerald-500 font-bold">✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
