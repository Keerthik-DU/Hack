import { SecretType, DetectionLayer, Finding, EngineInput } from '@/types';
export type { SecretType, DetectionLayer, Finding, EngineInput };

/**
 * Pattern category for grouping detection rules.
 */
export type PatternCategory =
  'aws' | 'github' | 'slack' | 'stripe' | 'private_key' | 'jwt' | 'generic' | string;

/**
 * Raw pattern definition schema parsed from patterns.json.
 */
export interface PatternDefinition {
  readonly id: string;
  readonly secretType: SecretType;
  readonly regex: string;
  readonly keywords: readonly string[];
  readonly category: PatternCategory;
  readonly severity?: 'critical' | 'high' | 'medium' | 'low';
  readonly secretGroup?: number;
  readonly allowlist?: readonly string[];
}

/**
 * Compiled pattern object with native RegExp instance and fast lookup structures.
 */
export interface CompiledPattern {
  readonly id: string;
  readonly secretType: SecretType;
  readonly regex: RegExp;
  readonly keywords: readonly string[];
  readonly category: PatternCategory;
  readonly severity?: 'critical' | 'high' | 'medium' | 'low';
  readonly secretGroup?: number;
  readonly allowlist?: readonly string[];
}

/**
 * Common detection engine interface implemented by Layer 1 (Regex), Layer 2 (Entropy), and Layer 3 (LLM).
 */
export interface IDetectionEngine {
  readonly name: string;
  readonly layer: DetectionLayer;
  /**
   * Executes engine analysis over the preprocessed engine input.
   */
  analyze(input: EngineInput): Promise<Finding[]> | Finding[];
  /**
   * Returns true if engine hardware or runtime dependencies are satisfied.
   */
  isAvailable(): boolean;
}
