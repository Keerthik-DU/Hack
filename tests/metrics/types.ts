export interface SampleResult {
  readonly sampleId: string;
  readonly category?: string;
  readonly expectedFindings: readonly { secretType: string; start: number; end: number }[];
  readonly actualFindings: readonly { secretType: string; startColumn: number; endColumn: number }[];
}

export interface MetricsReport {
  readonly tp: number;
  readonly fp: number;
  readonly fn: number;
  readonly tn: number;
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
  readonly fpr: number;
  readonly fnr: number;
  readonly totalSamples: number;
  readonly timestamp: string;
  readonly commitSha: string;
  readonly thresholds: { recall: number; precision: number };
  readonly passed: boolean;
  readonly perCategory: Record<string, { tp: number; fp: number; fn: number; precision: number; recall: number }>;
}
