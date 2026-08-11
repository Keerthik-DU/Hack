import React from 'react';

export const TrustGrid: React.FC = () => {
  const cards = [
    {
      id: 'zero-network',
      icon: '🛡️',
      title: 'Zero Network Calls',
      description:
        'All scanning execution runs completely client-side in your browser sandbox. No input text or findings are ever sent to any remote server or third-party API.',
    },
    {
      id: 'local-ai',
      icon: '🧠',
      title: 'Local AI Analysis',
      description:
        'Contextual secret verification utilizes a small quantized LLM executing locally via WebGPU hardware acceleration. Zero cloud LLM API calls are made.',
    },
    {
      id: 'no-storage',
      icon: '🗑️',
      title: 'No Persistent Storage',
      description:
        'Pasted code and raw secret strings are kept strictly in transient component memory during your active browser session and are purged immediately when closed.',
    },
  ];

  return (
    <div data-testid="trust-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
      {cards.map((card) => (
        <div
          key={card.id}
          data-testid={`trust-card-${card.id}`}
          className="p-6 rounded-xl bg-surface-light-card dark:bg-surface-dark-card border border-surface-light-border dark:border-surface-dark-border shadow-md hover:shadow-lg transition-shadow duration-300 space-y-3"
        >
          <div className="text-3xl">{card.icon}</div>
          <h3 className="text-lg font-bold font-sans text-brand-primary">{card.title}</h3>
          <p className="text-sm text-surface-light-textSecondary dark:text-surface-dark-textSecondary leading-relaxed">
            {card.description}
          </p>
        </div>
      ))}
    </div>
  );
};
