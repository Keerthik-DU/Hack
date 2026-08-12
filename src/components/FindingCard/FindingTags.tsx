import React from 'react';
import { DetectionLayer } from '@/types';
import { getDetectionLayerBadgeClass, getDetectionLayerLabel } from './finding-card.utils';

export interface FindingTagsProps {
  readonly layers: readonly DetectionLayer[];
}

export const FindingTags: React.FC<FindingTagsProps> = ({ layers }) => {
  const uniqueLayers = Array.from(new Set(layers));

  return (
    <div className="flex flex-wrap gap-2" aria-label="Detection layers">
      {uniqueLayers.map((layer) => (
        <span
          key={layer}
          data-testid={`finding-layer-tag-${layer}`}
          className={`px-2.5 py-0.5 text-xs font-mono font-semibold rounded-md border ${getDetectionLayerBadgeClass(layer)}`}
        >
          {getDetectionLayerLabel(layer)}
        </span>
      ))}
    </div>
  );
};