import { DetectionLayer, SecretType, ConfidenceLevel } from '@/types';

const SECRET_TYPE_LABELS: Record<SecretType, string> = {
  api_key: 'API Key',
  aws_access_key: 'AWS Access Key',
  private_key: 'Private Key',
  jwt: 'JWT',
  generic_secret: 'Generic Secret',
  database_url: 'Database URL',
  token: 'Token',
  high_entropy_string: 'High Entropy String',
};

const DETECTION_LAYER_LABELS: Record<DetectionLayer, string> = {
  1: 'Regex',
  2: 'Entropy',
  3: 'LLM',
};

export function formatSecretTypeLabel(secretType: SecretType): string {
  return SECRET_TYPE_LABELS[secretType] ?? secretType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatMaskedPreview(maskedValue: string): string {
  if (maskedValue.includes('***') || maskedValue.length < 8) {
    return maskedValue;
  }

  return `${maskedValue.slice(0, 4)}***${maskedValue.slice(-4)}`;
}

export function getDetectionLayerLabel(layer: DetectionLayer): string {
  return DETECTION_LAYER_LABELS[layer];
}

export function getConfidenceBadgeClass(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case 'high':
      return 'bg-emerald-600 text-white dark:bg-emerald-300 dark:text-emerald-950 border-emerald-700/20 dark:border-emerald-200/40';
    case 'medium':
      return 'bg-amber-500 text-white dark:bg-amber-300 dark:text-amber-950 border-amber-600/20 dark:border-amber-200/40';
    case 'low':
      return 'bg-rose-600 text-white dark:bg-rose-300 dark:text-rose-950 border-rose-700/20 dark:border-rose-200/40';
  }
}

export function getDetectionLayerBadgeClass(layer: DetectionLayer): string {
  switch (layer) {
    case 1:
      return 'bg-badge-regex-bg text-badge-regex-text border-badge-regex-border';
    case 2:
      return 'bg-badge-entropy-bg text-badge-entropy-text border-badge-entropy-border';
    case 3:
      return 'bg-badge-llm-bg text-badge-llm-text border-badge-llm-border';
  }
}