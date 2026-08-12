import type { AllClearStateProps } from '@/components/AllClearState';

/**
 * Mock props for AllClearState component tests.
 *
 * Covers:
 *  - Standard 2-layer scan (regex + entropy)
 *  - 3-layer scan with LLM
 *  - Fast scan (< 100ms duration)
 *  - Large input (100K chars, 5K lines)
 *  - Empty input
 */

/** Standard 2-layer scan — regex + entropy, no LLM */
export const twoLayerScanScenario: AllClearStateProps = {
  originalText: 'const foo = "bar";\nconst baz = "qux";',
  scanStats: {
    findingsCount: 0,
    charactersScanned: 38,
    linesScanned: 2,
    scanDurationMs: 423,
  },
  layersCompleted: ['regex', 'entropy'],
};

/** 3-layer scan — regex + entropy + LLM */
export const threeLayerScanScenario: AllClearStateProps = {
  originalText:
    'export const config = {\n  apiUrl: "https://api.example.com",\n  timeout: 5000\n};',
  scanStats: {
    findingsCount: 0,
    charactersScanned: 80,
    linesScanned: 4,
    scanDurationMs: 1247,
  },
  layersCompleted: ['regex', 'entropy', 'llm'],
};

/** Fast scan — duration < 100ms, shown as '< 0.1s' */
export const fastScanScenario: AllClearStateProps = {
  originalText: 'hello world',
  scanStats: {
    findingsCount: 0,
    charactersScanned: 11,
    linesScanned: 1,
    scanDurationMs: 42,
  },
  layersCompleted: ['regex', 'entropy'],
};

/** Large input — 100K chars, 5K lines, numbers need locale separators */
export const largeInputScenario: AllClearStateProps = {
  originalText: 'x'.repeat(100000),
  scanStats: {
    findingsCount: 0,
    charactersScanned: 100000,
    linesScanned: 5000,
    scanDurationMs: 3521,
  },
  layersCompleted: ['regex', 'entropy', 'llm'],
};

/** Empty input — originalText is an empty string */
export const emptyInputScenario: AllClearStateProps = {
  originalText: '',
  scanStats: {
    findingsCount: 0,
    charactersScanned: 0,
    linesScanned: 0,
    scanDurationMs: 12,
  },
  layersCompleted: ['regex', 'entropy'],
};
