/**
 * Schema for labeled secret-detection corpus samples (WO-057).
 * Consumed by corpus-loader, validate-corpus, and downstream metric stories.
 */

export type GroundTruthLabel = 'TP' | 'FP' | 'TN' | 'FN';

export type CorpusConfidence = 'high' | 'medium' | 'low';

/** Detection layer: 1 = regex, 2 = entropy, 3 = LLM */
export type CorpusDetectionLayer = 1 | 2 | 3;

/**
 * Expected finding annotation for a corpus sample.
 * `type` is the PatternRegistry pattern id (or synthetic type for entropy/context).
 */
export interface CorpusFinding {
  readonly type: string;
  readonly lineNumber: number;
  readonly charRange: readonly [number, number];
  readonly confidence: CorpusConfidence;
  readonly detectionLayer: CorpusDetectionLayer;
}

/**
 * Machine-readable labeled corpus sample used by Vitest parameterized runners.
 */
export interface CorpusSample {
  readonly id: string;
  readonly input: string;
  readonly expectedFindings: readonly CorpusFinding[];
  readonly groundTruth: GroundTruthLabel;
  /** Pattern category or specialized corpus bucket */
  readonly category: string;
  readonly description: string;
  readonly tags: readonly string[];
}

export const GROUND_TRUTH_VALUES: readonly GroundTruthLabel[] = ['TP', 'FP', 'TN', 'FN'];
export const CONFIDENCE_VALUES: readonly CorpusConfidence[] = ['high', 'medium', 'low'];
export const DETECTION_LAYER_VALUES: readonly CorpusDetectionLayer[] = [1, 2, 3];

/**
 * Runtime validation for a parsed CorpusSample object.
 * Returns a list of human-readable validation errors (empty when valid).
 */
export function validateCorpusSample(value: unknown): string[] {
  const errors: string[] = [];

  if (!value || typeof value !== 'object') {
    return ['Sample must be a non-null object'];
  }

  const sample = value as Record<string, unknown>;

  if (typeof sample.id !== 'string' || sample.id.trim().length === 0) {
    errors.push('id must be a non-empty string');
  }
  if (typeof sample.input !== 'string') {
    errors.push('input must be a string');
  }
  if (typeof sample.category !== 'string' || sample.category.trim().length === 0) {
    errors.push('category must be a non-empty string');
  }
  if (typeof sample.description !== 'string' || sample.description.trim().length === 0) {
    errors.push('description must be a non-empty string');
  }
  if (!GROUND_TRUTH_VALUES.includes(sample.groundTruth as GroundTruthLabel)) {
    errors.push(`groundTruth must be one of ${GROUND_TRUTH_VALUES.join(', ')}`);
  }
  if (!Array.isArray(sample.tags)) {
    errors.push('tags must be an array of strings');
  } else if (!sample.tags.every((t) => typeof t === 'string')) {
    errors.push('tags must contain only strings');
  }

  if (!Array.isArray(sample.expectedFindings)) {
    errors.push('expectedFindings must be an array');
  } else {
    sample.expectedFindings.forEach((finding, index) => {
      if (!finding || typeof finding !== 'object') {
        errors.push(`expectedFindings[${index}] must be an object`);
        return;
      }
      const f = finding as Record<string, unknown>;
      if (typeof f.type !== 'string' || f.type.trim().length === 0) {
        errors.push(`expectedFindings[${index}].type must be a non-empty string`);
      }
      if (typeof f.lineNumber !== 'number' || !Number.isInteger(f.lineNumber) || f.lineNumber < 1) {
        errors.push(`expectedFindings[${index}].lineNumber must be a positive integer`);
      }
      if (
        !Array.isArray(f.charRange) ||
        f.charRange.length !== 2 ||
        typeof f.charRange[0] !== 'number' ||
        typeof f.charRange[1] !== 'number' ||
        f.charRange[0] < 0 ||
        f.charRange[1] < f.charRange[0]
      ) {
        errors.push(
          `expectedFindings[${index}].charRange must be [start, end] with end >= start >= 0`
        );
      }
      if (!CONFIDENCE_VALUES.includes(f.confidence as CorpusConfidence)) {
        errors.push(
          `expectedFindings[${index}].confidence must be one of ${CONFIDENCE_VALUES.join(', ')}`
        );
      }
      if (!DETECTION_LAYER_VALUES.includes(f.detectionLayer as CorpusDetectionLayer)) {
        errors.push(
          `expectedFindings[${index}].detectionLayer must be one of ${DETECTION_LAYER_VALUES.join(', ')}`
        );
      }
    });
  }

  const groundTruth = sample.groundTruth as GroundTruthLabel;
  const findings = Array.isArray(sample.expectedFindings) ? sample.expectedFindings : [];
  if ((groundTruth === 'TP' || groundTruth === 'FN') && findings.length === 0) {
    errors.push(`${groundTruth} samples must include at least one expectedFinding`);
  }
  if ((groundTruth === 'TN' || groundTruth === 'FP') && findings.length !== 0) {
    errors.push(`${groundTruth} samples must have an empty expectedFindings array`);
  }

  return errors;
}
