/**
 * Configuration options for entropy threshold evaluation.
 */
export interface EntropyConfig {
  /** Minimum Shannon entropy in bits/char required (default: 4.5) */
  threshold?: number;
  /** Minimum character length required for evaluation (default: 20) */
  minLength?: number;
}

/** Default minimum Shannon entropy threshold (bits per character) */
export const DEFAULT_ENTROPY_THRESHOLD = 4.5;

/** Default minimum string length threshold for entropy calculation */
export const DEFAULT_ENTROPY_MIN_LENGTH = 20;

/**
 * Calculates the Shannon Entropy (information density) of a string in bits per character.
 * Formula: H = -sum(p_i * log2(p_i)) where p_i is character frequency / total length.
 *
 * @param input Target string to analyze
 * @returns Shannon entropy value in bits per character (0 for empty or single-character repeated strings)
 */
export function calculateEntropy(input: string): number {
  if (!input || input.length === 0) {
    return 0;
  }

  const length = input.length;
  const frequencies = new Map<string, number>();

  for (let i = 0; i < length; i++) {
    const char = input.charAt(i);
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  // If all characters are identical, entropy is 0
  if (frequencies.size <= 1) {
    return 0;
  }

  let entropy = 0;
  for (const count of frequencies.values()) {
    const p = count / length;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Evaluates whether a string meets the minimum length and Shannon entropy thresholds.
 *
 * @param input Target string to evaluate
 * @param config Optional configuration overriding default minLength (20) and threshold (4.5)
 * @returns true iff input.length >= minLength AND calculateEntropy(input) >= threshold
 */
export function meetsEntropyThreshold(input: string, config?: EntropyConfig): boolean {
  if (!input) {
    return false;
  }

  const minLength = config?.minLength ?? DEFAULT_ENTROPY_MIN_LENGTH;
  const threshold = config?.threshold ?? DEFAULT_ENTROPY_THRESHOLD;

  if (input.length < minLength) {
    return false;
  }

  const entropy = calculateEntropy(input);
  return entropy >= threshold;
}
