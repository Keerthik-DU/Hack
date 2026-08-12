import React, { useCallback, useId, useRef, useState } from 'react';

export type ResultsTabId = 'findings' | 'redacted';

export interface ResultsTabsProps {
  readonly findingsPanel: React.ReactNode;
  readonly redactedPanel: React.ReactNode;
  readonly defaultTab?: ResultsTabId;
  readonly className?: string;
}

const TABS: readonly { id: ResultsTabId; label: string }[] = [
  { id: 'findings', label: 'Findings' },
  { id: 'redacted', label: 'Redacted Preview' },
];

/**
 * ResultsTabs — accessible tab navigation between Findings and Redacted Preview.
 * Implements keyboard arrow-key support and ARIA tab / tabpanel roles.
 * Both panels stay mounted (hidden via CSS) so tab state is preserved.
 */
export const ResultsTabs: React.FC<ResultsTabsProps> = ({
  findingsPanel,
  redactedPanel,
  defaultTab = 'findings',
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<ResultsTabId>(defaultTab);
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusTab = useCallback((index: number) => {
    const next = ((index % TABS.length) + TABS.length) % TABS.length;
    setActiveTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          focusTab(index + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          focusTab(index - 1);
          break;
        case 'Home':
          event.preventDefault();
          focusTab(0);
          break;
        case 'End':
          event.preventDefault();
          focusTab(TABS.length - 1);
          break;
        default:
          break;
      }
    },
    [focusTab]
  );

  return (
    <div data-testid="results-tabs" className={`flex flex-col gap-4 ${className}`}>
      <div
        role="tablist"
        aria-label="Scan results views"
        className="flex gap-1 border-b border-surface-light-border dark:border-surface-dark-border"
      >
        {TABS.map((tab, index) => {
          const selected = activeTab === tab.id;
          const tabId = `${baseId}-tab-${tab.id}`;
          const panelId = `${baseId}-panel-${tab.id}`;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={tabId}
              type="button"
              role="tab"
              data-testid={`results-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={[
                'px-3 py-2 text-sm font-medium transition-colors duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                selected
                  ? 'border-b-2 border-brand-primary text-brand-primary'
                  : 'text-surface-light-textSecondary dark:text-surface-dark-textSecondary hover:text-surface-light-textPrimary dark:hover:text-surface-dark-textPrimary',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Keep both panels mounted to preserve internal state across tab switches */}
      <div
        id={`${baseId}-panel-findings`}
        role="tabpanel"
        data-testid="results-tabpanel-findings"
        aria-labelledby={`${baseId}-tab-findings`}
        hidden={activeTab !== 'findings'}
      >
        {findingsPanel}
      </div>
      <div
        id={`${baseId}-panel-redacted`}
        role="tabpanel"
        data-testid="results-tabpanel-redacted"
        aria-labelledby={`${baseId}-tab-redacted`}
        hidden={activeTab !== 'redacted'}
      >
        {redactedPanel}
      </div>
    </div>
  );
};
