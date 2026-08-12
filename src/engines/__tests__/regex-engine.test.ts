import { describe, it, expect } from 'vitest';
import { RegexEngine, generateMaskedPreview } from '../regex/regex-engine';
import { PatternRegistry } from '../regex/pattern-registry';
import regexInputsFixture from '../../../tests/fixtures/regex-engine-inputs.json';

describe('RegexEngine Module (Layer 1 Detection Engine)', () => {
  describe('Engine Metadata & Capability Checks', () => {
    it('implements IDetectionEngine with correct name and layer properties', () => {
      const engine = new RegexEngine();
      expect(engine.name).toBe('RegexEngine');
      expect(engine.layer).toBe(1);
    });

    it('returns true for isAvailable() unconditionally', () => {
      const engine = new RegexEngine();
      expect(engine.isAvailable()).toBe(true);
    });
  });

  describe('Masked Preview Generation', () => {
    it('replaces entire match with *** for matches shorter than 8 characters', () => {
      expect(generateMaskedPreview('')).toBe('***');
      expect(generateMaskedPreview('1234567')).toBe('***');
      expect(generateMaskedPreview('sk_live')).toBe('***');
    });

    it('generates first 4 + *** + last 4 preview for matches exactly 8 characters or longer', () => {
      expect(generateMaskedPreview('12345678')).toBe('1234***5678');
      expect(generateMaskedPreview('AKIA1234567890ABCDEF')).toBe('AKIA***CDEF');
      expect(generateMaskedPreview('ghp_1234567890abcdef1234567890abcdef1234')).toBe('ghp_***1234');
    });
  });

  describe('Pattern Matching & Input Analysis', () => {
    it('returns empty array when input text is empty or whitespace', async () => {
      const engine = new RegexEngine();
      expect(await engine.analyze({ text: '' })).toEqual([]);
      expect(await engine.analyze({ text: '   \n  ' })).toEqual([]);
    });

    it('returns empty array when input text contains no matching secrets', async () => {
      const engine = new RegexEngine();
      const findings = await engine.analyze({ text: regexInputsFixture.noSecretLine });
      expect(findings).toEqual([]);
    });

    it('detects a single secret on a single line with correct finding metadata', async () => {
      const engine = new RegexEngine();
      const findings = await engine.analyze({ text: regexInputsFixture.singleLineInput });

      expect(findings).toHaveLength(1);
      const f = findings[0];

      expect(f.secretType).toBe('aws_access_key');
      expect(f.lineNumber).toBe(1);
      expect(f.columnStart).toBe(17); // Start index of "AKIA..." in 'const AWS_KEY = "AKIA...'
      expect(f.columnEnd).toBe(37);
      expect(f.confidence).toBe('high');
      expect(f.detectionLayer).toBe(1);
      expect(f.maskedValue).toBe('AKIA***CDEF');
      expect(f.rawValue).toBeUndefined();
    });

    it('detects secrets across multi-line inputs with accurate line numbers', async () => {
      const engine = new RegexEngine();
      const findings = await engine.analyze({ text: regexInputsFixture.multiLineInput });

      expect(findings.length).toBeGreaterThanOrEqual(3);

      const githubFinding = findings.find((f) => f.secretType === 'token');
      expect(githubFinding).toBeDefined();
      expect(githubFinding?.lineNumber).toBe(2);

      const stripeFinding = findings.find((f) => f.secretType === 'api_key');
      expect(stripeFinding).toBeDefined();
      expect(stripeFinding?.lineNumber).toBe(3);

      const rsaFinding = findings.find((f) => f.secretType === 'private_key');
      expect(rsaFinding).toBeDefined();
      expect(rsaFinding?.lineNumber).toBe(4);
    });

    it('detects multiple findings on the same line', async () => {
      const engine = new RegexEngine();
      const findings = await engine.analyze({ text: regexInputsFixture.multiFindingLine });

      expect(findings.length).toBeGreaterThanOrEqual(2);
      expect(findings.every((f) => f.lineNumber === 1)).toBe(true);

      const awsFinding = findings.find((f) => f.secretType === 'aws_access_key');
      const ghpFinding = findings.find((f) => f.secretType === 'token');

      expect(awsFinding).toBeDefined();
      expect(ghpFinding).toBeDefined();
      expect(awsFinding?.columnStart).not.toEqual(ghpFinding?.columnStart);
    });

    it('supports custom PatternRegistry constructor dependency injection', async () => {
      const customRegistry = new PatternRegistry([
        {
          id: 'custom-secret-rule',
          secretType: 'generic_secret',
          regex: 'CUSTOM_SECRET_[0-9]{4}',
          keywords: ['CUSTOM_SECRET_'],
          category: 'generic',
        },
      ]);

      const engine = new RegexEngine(customRegistry);
      const findings = await engine.analyze({ text: 'export val = "CUSTOM_SECRET_9999";' });

      expect(findings).toHaveLength(1);
      expect(findings[0].secretType).toBe('generic_secret');
      expect(findings[0].maskedValue).toBe('CUST***9999');
    });
  });

  describe('System Integration & Performance SLA', () => {
    it('system integration test: analyzes 50-line input with 10 embedded secrets and returns exactly 10 findings', async () => {
      const registry = new PatternRegistry();
      const engine = new RegexEngine(registry);

      const findings = await engine.analyze({ text: regexInputsFixture.tenSecretInput });

      expect(findings).toHaveLength(10);

      const secretTypes = findings.map((f) => f.secretType);
      expect(secretTypes).toContain('aws_access_key');
      expect(secretTypes).toContain('token');
      expect(secretTypes).toContain('api_key');
      expect(secretTypes).toContain('private_key');
      expect(secretTypes).toContain('generic_secret');
    });

    it('performance SLA: completes scanning 10,000-character input against 50 patterns in < 500ms', async () => {
      const registry = new PatternRegistry();
      const engine = new RegexEngine(registry);

      const lineSample =
        'const AWS_KEY = "AKIA1234567890ABCDEF"; // sample config key\nconst GITHUB_TOKEN = "ghp_1234567890abcdef1234567890abcdef1234";\n';
      const largeInput = lineSample.repeat(100); // ~12,000 characters (200 lines)

      expect(largeInput.length).toBeGreaterThan(10000);

      const startTime = performance.now();
      const findings = await engine.analyze({ text: largeInput });
      const durationMs = performance.now() - startTime;

      expect(findings.length).toBeGreaterThan(100);
      expect(durationMs).toBeLessThan(500); // Must complete in < 500ms
    });
  });
});
