export type ScanProgressEventType =
  | 'SCAN_START'
  | 'LAYER_START'
  | 'LAYER_PROGRESS'
  | 'LAYER_COMPLETE'
  | 'LAYER_SKIPPED'
  | 'EARLY_FINDING'
  | 'MEMORY_WARNING'
  | 'SCAN_COMPLETE'
  | 'SCAN_ERROR';

export type LayerProgressStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'error';
