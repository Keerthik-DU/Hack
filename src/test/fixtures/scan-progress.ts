import { Finding, LayerStatusMap, ScanProgress } from '@/types';
import { ResultsScanProgress } from '@/types/scan-progress';

/** Shared finding fixtures for progressive ScanProgress sequences */
export const progressiveFindings = {
  regexHigh: {
    id: 'f-regex-aws',
    secretType: 'aws_access_key',
    lineNumber: 12,
    columnStart: 8,
    columnEnd: 28,
    confidence: 'high',
    detectionLayer: 1,
    maskedValue: 'AKIA***KEY1',
    context: 'const awsKey = "AKIA***KEY1";',
  } satisfies Finding,
  regexMedium: {
    id: 'f-regex-token',
    secretType: 'token',
    lineNumber: 4,
    columnStart: 0,
    columnEnd: 20,
    confidence: 'medium',
    detectionLayer: 1,
    maskedValue: 'ghp_***abcd',
    context: 'token=ghp_***abcd',
  } satisfies Finding,
  entropyMedium: {
    id: 'f-entropy-jwt',
    secretType: 'jwt',
    lineNumber: 5,
    columnStart: 10,
    columnEnd: 50,
    confidence: 'medium',
    detectionLayer: 3,
    maskedValue: 'eyJh***QifQ',
    context: 'const jwt = "eyJh***QifQ";',
  } satisfies Finding,
  entropyLow: {
    id: 'f-entropy-rand',
    secretType: 'high_entropy_string',
    lineNumber: 20,
    columnStart: 2,
    columnEnd: 40,
    confidence: 'low',
    detectionLayer: 3,
    maskedValue: 'rand***5678',
    context: 'seed=rand***5678',
  } satisfies Finding,
  llmHigh: {
    id: 'f-llm-db',
    secretType: 'database_url',
    lineNumber: 8,
    columnStart: 0,
    columnEnd: 40,
    confidence: 'high',
    detectionLayer: 2,
    maskedValue: 'post***prod',
    context: 'DATABASE_URL=post***prod',
  } satisfies Finding,
} as const;

const layers = (
  regex: LayerStatusMap['regex'],
  entropy: LayerStatusMap['entropy'],
  llm: LayerStatusMap['llm']
): LayerStatusMap => ({ regex, entropy, llm });

/**
 * Scenario A — Regex-only progressive completion (entropy/LLM still pending).
 */
export const regexOnlySequence: ScanProgress[] = [
  {
    status: 'scanning',
    stage: 'Layer 1 (RegexEngine) analysis running',
    percentage: 10,
    currentEngine: 'RegexEngine',
    findings: [],
    layerStatuses: layers('running', 'pending', 'pending'),
    scanDurationMs: 40,
  },
  {
    status: 'scanning',
    stage: 'Layer 1 (RegexEngine) analysis complete',
    percentage: 33,
    currentEngine: 'RegexEngine',
    findings: [progressiveFindings.regexHigh, progressiveFindings.regexMedium],
    layerStatuses: layers('complete', 'pending', 'pending'),
    scanDurationMs: 120,
  },
];

/**
 * Scenario B — Regex + Entropy complete while LLM still running.
 */
export const regexEntropySequence: ScanProgress[] = [
  ...regexOnlySequence,
  {
    status: 'scanning',
    stage: 'Layer 3 (EntropyAnalyzer) analysis complete',
    percentage: 66,
    currentEngine: 'EntropyAnalyzer',
    findings: [
      progressiveFindings.regexHigh,
      progressiveFindings.regexMedium,
      progressiveFindings.entropyMedium,
      progressiveFindings.entropyLow,
    ],
    layerStatuses: layers('complete', 'complete', 'pending'),
    scanDurationMs: 280,
  },
  {
    status: 'scanning',
    stage: 'Dispatching ambiguous findings to Layer 2 LLM Engine',
    percentage: 75,
    currentEngine: 'LLM Engine',
    findings: [
      progressiveFindings.regexHigh,
      progressiveFindings.regexMedium,
      progressiveFindings.entropyMedium,
      progressiveFindings.entropyLow,
    ],
    layerStatuses: layers('complete', 'complete', 'running'),
    scanDurationMs: 320,
  },
];

/**
 * Scenario C — Full three-layer progressive completion.
 */
export const fullThreeLayerSequence: ScanProgress[] = [
  ...regexEntropySequence,
  {
    status: 'scanning',
    stage: 'Layer 2 (LLM) analysis complete',
    percentage: 90,
    currentEngine: 'LLM Engine',
    findings: [
      progressiveFindings.regexHigh,
      progressiveFindings.llmHigh,
      progressiveFindings.regexMedium,
      progressiveFindings.entropyMedium,
      progressiveFindings.entropyLow,
    ],
    layerStatuses: layers('complete', 'complete', 'complete'),
    scanDurationMs: 900,
  },
  {
    status: 'complete',
    stage: 'Scan complete',
    percentage: 100,
    currentEngine: 'LLM Engine',
    findings: [
      progressiveFindings.regexHigh,
      progressiveFindings.llmHigh,
      progressiveFindings.regexMedium,
      progressiveFindings.entropyMedium,
      progressiveFindings.entropyLow,
    ],
    layerStatuses: layers('complete', 'complete', 'complete'),
    scanDurationMs: 980,
  },
];

/**
 * Scenario D — LLM unavailable (no WebGPU); regex + entropy only.
 */
export const llmUnavailableSequence: ScanProgress[] = [
  {
    status: 'scanning',
    stage: 'Layer 1 (RegexEngine) analysis complete',
    percentage: 33,
    currentEngine: 'RegexEngine',
    findings: [progressiveFindings.regexHigh],
    layerStatuses: layers('complete', 'running', 'unavailable'),
    scanDurationMs: 110,
  },
  {
    status: 'scanning',
    stage: 'Layer 3 (EntropyAnalyzer) analysis complete',
    percentage: 66,
    currentEngine: 'EntropyAnalyzer',
    findings: [progressiveFindings.regexHigh, progressiveFindings.entropyMedium],
    layerStatuses: layers('complete', 'complete', 'unavailable'),
    scanDurationMs: 240,
  },
  {
    status: 'scanning',
    stage: 'Layer 2 LLM analysis skipped (LLM unavailable)',
    percentage: 90,
    findings: [progressiveFindings.regexHigh, progressiveFindings.entropyMedium],
    layerStatuses: layers('complete', 'complete', 'unavailable'),
    scanDurationMs: 260,
  },
  {
    status: 'complete',
    stage: 'Scan complete',
    percentage: 100,
    findings: [progressiveFindings.regexHigh, progressiveFindings.entropyMedium],
    layerStatuses: layers('complete', 'complete', 'unavailable'),
    scanDurationMs: 300,
  },
];

/**
 * Empty progressive scan — scanning with zero findings yet.
 */
export const emptyScanningProgress: ResultsScanProgress = {
  status: 'scanning',
  layerStatuses: layers('running', 'pending', 'pending'),
  findings: [],
  scanDurationMs: 50,
  stage: 'Layer 1 (RegexEngine) analysis running',
  percentage: 10,
};

/**
 * Expected sorted order for the full three-layer final findings set:
 * high (line 8, 12) → medium (line 4, 5) → low (line 20)
 */
export const expectedFullSortOrder = [
  progressiveFindings.llmHigh.id,
  progressiveFindings.regexHigh.id,
  progressiveFindings.regexMedium.id,
  progressiveFindings.entropyMedium.id,
  progressiveFindings.entropyLow.id,
] as const;
