import React from 'react';

export const DetectionLayersSection: React.FC = () => {
  const layers = [
    {
      layer: 1,
      name: 'Layer 1: Regex Engine',
      badge: 'Deterministic Regex',
      badgeClass: 'bg-badge-regex-bg text-badge-regex-text border-badge-regex-border',
      description:
        'Uses high-precision regular expression patterns derived from Gitleaks and enterprise secret databases to instantly match known API key formats (AWS, GitHub, Slack, Stripe, JWT).',
    },
    {
      layer: 2,
      name: 'Layer 2: Entropy Engine',
      badge: 'Shannon Entropy',
      badgeClass: 'bg-badge-entropy-bg text-badge-entropy-text border-badge-entropy-border',
      description:
        'Calculates mathematical character randomness (Shannon entropy) to detect custom, unpatterned secret strings and high-entropy passwords that lack fixed prefixes.',
    },
    {
      layer: 3,
      name: 'Layer 3: Local LLM Engine',
      badge: 'WebGPU LLM',
      badgeClass: 'bg-badge-llm-bg text-badge-llm-text border-badge-llm-border',
      description:
        'Executes a small quantized AI model locally inside your browser via WebGPU to resolve ambiguous false positives by analyzing code context surrounding detected candidates.',
    },
  ];

  return (
    <section data-testid="detection-layers-section" className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-bold font-sans text-brand-primary">
          Three-Tier Detection Architecture
        </h2>
        <p className="text-sm text-surface-light-textSecondary dark:text-surface-dark-textSecondary">
          Combining sub-millisecond deterministic matching with local machine learning context
          verification.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {layers.map((l) => (
          <div
            key={l.layer}
            data-testid={`layer-card-${l.layer}`}
            className="p-6 rounded-xl bg-surface-light-card dark:bg-surface-dark-card border border-surface-light-border dark:border-surface-dark-border space-y-3 shadow-md hover:shadow-lg transition-shadow duration-300"
          >
            <div className="flex justify-between items-center">
              <span
                className={`px-2.5 py-0.5 text-xs font-mono font-semibold rounded-md border ${l.badgeClass}`}
              >
                {l.badge}
              </span>
              <span className="text-xs font-bold font-mono text-surface-light-textSecondary dark:text-surface-dark-textSecondary">
                L{l.layer}
              </span>
            </div>
            <h3 className="text-base font-bold font-sans">{l.name}</h3>
            <p className="text-sm text-surface-light-textSecondary dark:text-surface-dark-textSecondary leading-relaxed">
              {l.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
