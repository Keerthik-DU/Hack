import { DetectionLayer, Finding } from './finding';

/**
 * Input content and options supplied to a detection engine for analysis.
 */
export interface EngineInput {
  /** The text content to analyze (code, logs, config) */
  readonly text: string;
  /** Optional pre-split line array for fast line-by-line scanning */
  readonly lines?: readonly string[];
  /** Optional execution parameters for engine customization */
  readonly options?: Record<string, unknown>;
  /** Optional AbortSignal for early cancellation */
  readonly signal?: AbortSignal;
}

/**
 * Contract shared by all detection engine implementations (RegexEngine, EntropyAnalyzer, LLMAnalyzer).
 */
export interface IDetectionEngine {
  /** Human-readable engine identifier */
  readonly name: string;
  /** Layer number (1: Regex, 2: Entropy, 3: LLM) */
  readonly layer: DetectionLayer;
  /**
   * Analyzes input text and returns detected findings.
   * @param input EngineInput containing text to analyze
   * @returns Promise resolving to an array of Finding objects
   */
  analyze(input: EngineInput): Promise<Finding[]>;
  /**
   * Checks whether this detection engine is supported and available in the current environment.
   * @returns boolean indicating engine availability
   */
  isAvailable(): boolean;
}
