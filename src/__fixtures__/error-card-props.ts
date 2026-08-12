import type { ErrorCardProps } from '@/components/errors/ErrorCard';
import type { LayerStatus } from '@/types';

export const llmCrashLayerStatuses: readonly LayerStatus[] = [
  { layer: 'regex', status: 'complete', findings: [] },
  { layer: 'entropy', status: 'complete', findings: [] },
  { layer: 'llm', status: 'error', findings: [] },
];

export const modelDownloadLayerStatuses: readonly LayerStatus[] = [
  { layer: 'regex', status: 'complete', findings: [] },
  { layer: 'entropy', status: 'complete', findings: [] },
  { layer: 'llm', status: 'unavailable', findings: [] },
];

/** Typed ErrorCard prop fixtures for each variant (WO-046). */
export const errorCardPropsFixtures = {
  llmCrash: {
    variant: 'llm-crash',
    errorMessage: 'LLM worker terminated unexpectedly',
    layerStatuses: llmCrashLayerStatuses,
  } satisfies ErrorCardProps,

  inputTooLarge: {
    variant: 'input-too-large',
    characterCount: 120_500,
    maxCharacterCount: 100_000,
  } satisfies ErrorCardProps,

  inputAtLimit: {
    variant: 'input-too-large',
    characterCount: 100_000,
    maxCharacterCount: 100_000,
  } satisfies ErrorCardProps,

  modelDownloadFailure: {
    variant: 'model-download-failure',
    errorMessage: 'Model download failed after 3 retries',
    layerStatuses: modelDownloadLayerStatuses,
  } satisfies ErrorCardProps,

  integrityFailure: {
    variant: 'integrity-failure',
    errorMessage: 'Model integrity verification failed (SHA-256 mismatch)',
  } satisfies ErrorCardProps,
} as const;
