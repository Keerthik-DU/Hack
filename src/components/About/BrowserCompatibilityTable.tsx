import React from 'react';

export interface BrowserCompatibilityInfo {
  name: string;
  minVersion: string;
  webgpuSupport: string;
  status: 'compatible' | 'unknown' | 'incompatible';
  isCurrent: boolean;
}

export const BrowserCompatibilityTable: React.FC = () => {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isWebGPUAvailable =
    typeof navigator !== 'undefined' && 'gpu' in navigator && navigator.gpu !== undefined;

  const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent);
  const isEdge = /Edg/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);

  const browsers: BrowserCompatibilityInfo[] = [
    {
      name: 'Google Chrome',
      minVersion: '113+',
      webgpuSupport: 'Supported natively',
      status: isChrome ? (isWebGPUAvailable ? 'compatible' : 'unknown') : 'compatible',
      isCurrent: isChrome,
    },
    {
      name: 'Microsoft Edge',
      minVersion: '113+',
      webgpuSupport: 'Supported natively',
      status: isEdge ? (isWebGPUAvailable ? 'compatible' : 'unknown') : 'compatible',
      isCurrent: isEdge,
    },
    {
      name: 'Apple Safari',
      minVersion: '26+ / Tech Preview',
      webgpuSupport: 'Feature Flag / Preview',
      status: isSafari ? (isWebGPUAvailable ? 'compatible' : 'unknown') : 'unknown',
      isCurrent: isSafari,
    },
  ];

  return (
    <section data-testid="browser-compatibility-section" className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-bold font-sans text-brand-primary">
          Browser Compatibility Matrix
        </h2>
        <p className="text-sm text-surface-light-textSecondary dark:text-surface-dark-textSecondary">
          WebGPU hardware acceleration enables local LLM execution. Standard Regex and Entropy
          scanning work on all modern browsers.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-surface-light-border dark:border-surface-dark-border shadow-md">
        <table className="w-full text-left text-sm" data-testid="browser-compatibility-table">
          <thead className="bg-surface-light-card dark:bg-surface-dark-card border-b border-surface-light-border dark:border-surface-dark-border text-xs uppercase font-semibold text-surface-light-textSecondary dark:text-surface-dark-textSecondary">
            <tr>
              <th scope="col" className="px-6 py-3.5">
                Browser
              </th>
              <th scope="col" className="px-6 py-3.5">
                Required Version
              </th>
              <th scope="col" className="px-6 py-3.5">
                WebGPU Capability
              </th>
              <th scope="col" className="px-6 py-3.5">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-light-border dark:divide-surface-dark-border">
            {browsers.map((b) => (
              <tr
                key={b.name}
                data-testid={`browser-row-${b.name.toLowerCase().replace(/\s+/g, '-')}`}
                className={`transition-colors ${
                  b.isCurrent
                    ? 'bg-brand-primary/10 font-semibold'
                    : 'bg-surface-light-bg dark:bg-surface-dark-bg hover:bg-surface-light-card dark:hover:bg-surface-dark-card'
                }`}
              >
                <td className="px-6 py-4 flex items-center gap-2">
                  <span>{b.name}</span>
                  {b.isCurrent && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-brand-primary text-white">
                      Current Browser
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 font-mono text-xs">{b.minVersion}</td>
                <td className="px-6 py-4">{b.webgpuSupport}</td>
                <td className="px-6 py-4">
                  {b.status === 'compatible' && (
                    <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
                      ✓ Full Compatibility
                    </span>
                  )}
                  {b.status === 'unknown' && (
                    <span className="inline-flex items-center gap-1 text-amber-500 font-semibold">
                      ⚠️ Standard Mode Only
                    </span>
                  )}
                  {b.status === 'incompatible' && (
                    <span className="inline-flex items-center gap-1 text-rose-500 font-semibold">
                      ✖ Incompatible
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
