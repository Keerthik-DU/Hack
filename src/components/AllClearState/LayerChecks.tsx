import React from 'react';

/** Detection layer identifier */
export type DetectionLayer = 'regex' | 'entropy' | 'llm';

export interface LayerChecksProps {
  /** Array of detection layers that completed successfully */
  layersCompleted: DetectionLayer[];
}

interface LayerConfig {
  key: DetectionLayer;
  label: string;
  testId: string;
}

/**
 * Ordered list of all possible detection layers. Rendering order follows
 * the natural pipeline order: Regex → Entropy → LLM.
 */
const LAYER_CONFIG: LayerConfig[] = [
  { key: 'regex', label: 'Regex', testId: 'layer-regex' },
  { key: 'entropy', label: 'Entropy', testId: 'layer-entropy' },
  { key: 'llm', label: 'LLM', testId: 'layer-llm' },
];

/**
 * LayerChecks — renders a badge with a checkmark for each detection layer
 * that completed successfully.
 *
 * - 'regex' and 'entropy' are always shown when present in `layersCompleted`.
 * - 'llm' is only shown when it is explicitly included in `layersCompleted`.
 *
 * Each badge uses the `badgeSlideUp` CSS keyframe animation via the Tailwind
 * `animate-badge-slide-up` utility, with a 100 ms stagger delay per badge.
 * Animation class uses `motion-safe:` to respect prefers-reduced-motion.
 */
export const LayerChecks: React.FC<LayerChecksProps> = ({ layersCompleted }) => {
  const visibleLayers = LAYER_CONFIG.filter((layer) => layersCompleted.includes(layer.key));

  return (
    <div data-testid="layer-checks" className="flex flex-wrap gap-2 justify-center">
      {visibleLayers.map((layer, index) => (
        <span
          key={layer.key}
          data-testid={layer.testId}
          className={[
            'inline-flex items-center gap-1.5 px-3 py-1',
            'rounded-full text-sm font-medium',
            'bg-green-100 dark:bg-green-900',
            'text-green-800 dark:text-green-200',
            'border border-green-300 dark:border-green-700',
            'motion-safe:animate-badge-slide-up',
          ].join(' ')}
          style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
        >
          {/* Inline SVG checkmark for visual clarity */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5 text-green-600 dark:text-green-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          {layer.label} ✓
        </span>
      ))}
    </div>
  );
};
