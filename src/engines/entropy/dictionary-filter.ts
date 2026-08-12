import { COMMON_ENGLISH_WORDS, COMMON_WORDS_SET } from './word-list';

export interface DictionaryFilterConfig {
  /** Minimum length of dictionary word to match (default: 3) */
  minWordLength?: number;
  /** Minimum number of dictionary words required to flag as false positive (default: 2) */
  minWordCount?: number;
  /** Optional custom word list overriding default bundled word set */
  customWordList?: readonly string[];
}

export interface DictionaryFilterResult {
  hasDictionaryWords: boolean;
  wordCount: number;
  matchedWords: string[];
}

/**
 * Tokenizes a candidate string into potential word tokens using splitters:
 * camelCase boundaries, snake_case/kebab-case delimiters, non-alphanumeric characters,
 * and extracts continuous alphabetic sub-chunks.
 */
export function extractCandidateTokens(input: string, minWordLength: number): string[] {
  if (!input || input.length < minWordLength) {
    return [];
  }

  // Split on camelCase boundaries (e.g. 'getAccessTokenFromStorage' -> 'get Access Token From Storage')
  const camelSplit = input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  // Split on non-alphabetical characters
  const rawTokens = camelSplit.split(/[^a-zA-Z]+/);

  const tokens: string[] = [];
  for (const token of rawTokens) {
    const lower = token.toLowerCase();
    if (lower.length >= minWordLength) {
      tokens.push(lower);
    }
  }

  return tokens;
}

/**
 * Pure function evaluating whether an input string contains 2 or more common English words.
 * Handles case-insensitivity, camelCase, snake_case, dash-case, and substring lookups.
 *
 * @param input Candidate string token
 * @param config Optional filter configuration overrides
 * @returns DictionaryFilterResult with hasDictionaryWords, wordCount, and matchedWords array
 */
export function containsDictionaryWords(
  input: string,
  config?: DictionaryFilterConfig
): DictionaryFilterResult {
  const minWordLength = config?.minWordLength ?? 3;
  const minWordCount = config?.minWordCount ?? 2;

  if (!input || input.length < minWordLength) {
    return {
      hasDictionaryWords: false,
      wordCount: 0,
      matchedWords: [],
    };
  }

  const wordLookupSet: ReadonlySet<string> = config?.customWordList
    ? new Set(config.customWordList.map((w) => w.toLowerCase()))
    : COMMON_WORDS_SET;

  const tokens = extractCandidateTokens(input, minWordLength);
  const matchedWordsSet = new Set<string>();

  // 1. Direct token lookup
  for (const token of tokens) {
    if (wordLookupSet.has(token)) {
      matchedWordsSet.add(token);
    }
  }

  // 2. If direct tokens are fewer than minWordCount, perform substring scanning on longer tokens
  if (matchedWordsSet.size < minWordCount) {
    const wordList = config?.customWordList ?? COMMON_ENGLISH_WORDS;
    for (const token of tokens) {
      if (token.length >= minWordLength * 2) {
        for (const word of wordList) {
          if (word && word.length >= minWordLength && token.includes(word.toLowerCase())) {
            matchedWordsSet.add(word.toLowerCase());
            if (matchedWordsSet.size >= minWordCount) {
              break;
            }
          }
        }
      }
      if (matchedWordsSet.size >= minWordCount) {
        break;
      }
    }
  }

  const matchedWords = Array.from(matchedWordsSet);
  const wordCount = matchedWords.length;
  const hasDictionaryWords = wordCount >= minWordCount;

  return {
    hasDictionaryWords,
    wordCount,
    matchedWords,
  };
}
