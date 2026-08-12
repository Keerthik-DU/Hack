import { describe, it, expect } from 'vitest';
import { EntropyAnalyzer } from '../entropy-analyzer';
import { EngineInput } from '../../types';
import { REALISTIC_ENGINE_INPUT_FIXTURES } from './fixtures/entropy-analyzer-fixtures';

describe('WO-022: Assemble EntropyAnalyzer Implementing IDetectionEngine Suite', () => {
  describe('IDetectionEngine Contract Compliance', () => {
    it('implements contract properties: name = "entropy", layer = 3', () => {
      const analyzer = new EntropyAnalyzer();
      expect(analyzer.name).toBe('entropy');
      expect(analyzer.layer).toBe(3);
    });

    it('isAvailable() always returns true (no hardware dependencies)', () => {
      const analyzer = new EntropyAnalyzer();
      expect(analyzer.isAvailable()).toBe(true);
    });

    it('constructor accepts options overrides via dependency injection', () => {
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: 4.8, minLength: 25 },
        dictionaryConfig: { minWordCount: 1 },
      });
      expect(analyzer).toBeDefined();
    });
  });

  describe('Full Pipeline & Integration Tests', () => {
    it('returns high-confidence finding for AWS key pattern with sensitive variable name (awsApiKey)', async () => {
      const analyzer = new EntropyAnalyzer();
      const input: EngineInput = {
        text: 'const awsApiKey = "AKIA1234567890ABCDEF9876543210GHIJKL";',
      };

      const findings = await analyzer.analyze(input);
      expect(findings.length).toBe(1);

      const f = findings[0];
      expect(f.detectionLayer).toBe(3);
      expect(f.confidence).toBe('high');
      expect(f.secretType).toBe('high_entropy_string');
      expect(f.lineNumber).toBe(1);
      expect(f.maskedValue).toMatch(/^AKIA\*\*\*IJKL$/);
    });

    it('returns zero findings for natural language text (dictionary filtered)', async () => {
      const analyzer = new EntropyAnalyzer();
      const input: EngineInput = {
        text: 'The quick brown fox jumps over the lazy dog in the sunny meadow near the old castle wall.',
      };

      const findings = await analyzer.analyze(input);
      expect(findings.length).toBe(0);
    });

    it('returns medium-confidence finding for random 40-char hex string assigned to non-sensitive variable (loopCounter)', async () => {
      const analyzer = new EntropyAnalyzer();
      const input: EngineInput = {
        text: 'const loopCounter = "a1B2c3D4e5F67890!@#$%^&*()_+=-~`1234567890";',
      };

      const findings = await analyzer.analyze(input);
      expect(findings.length).toBe(1);
      expect(findings[0].confidence).toBe('medium');
    });

    it('evaluates multi-line code snippet with 3 known secrets and 5 non-secrets', async () => {
      const analyzer = new EntropyAnalyzer();
      const fixture = REALISTIC_ENGINE_INPUT_FIXTURES.find(
        (f) => f.id === 'code-snippet-3-secrets-5-non-secrets'
      );
      expect(fixture).toBeDefined();

      if (fixture) {
        const findings = await analyzer.analyze(fixture.input);
        expect(findings.length).toBeGreaterThanOrEqual(2);

        const highConfFindings = findings.filter((f) => f.confidence === 'high');
        expect(highConfFindings.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('meets SLA performance: analyze() completes in <= 200ms for 500 candidate strings in a 10K char input', async () => {
      const analyzer = new EntropyAnalyzer();
      const candidateLines: string[] = [];

      for (let i = 0; i < 500; i++) {
        if (i % 2 === 0) {
          candidateLines.push(
            `const token_${i} = "wJalrXUtnFEMI/K7MDENG/bPxRfiCY9876543210XYZ${i}";`
          );
        } else {
          candidateLines.push(`const appConfigName_${i} = "ApplicationConfigurationName${i}";`);
        }
      }

      const input: EngineInput = {
        text: candidateLines.join('\n'),
      };

      const start = performance.now();
      const findings = await analyzer.analyze(input);
      const duration = performance.now() - start;

      console.log(
        `[WO-022 Perf Audit] EntropyAnalyzer scanned 500 strings in ${duration.toFixed(2)}ms (SLA <= 200ms)`
      );

      expect(duration).toBeLessThan(200.0);
      expect(findings.length).toBeGreaterThan(0);
    });
  });
});
