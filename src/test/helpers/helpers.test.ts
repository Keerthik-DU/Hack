import { describe, it, expect } from 'vitest';
import { loadFixtures, createTestEngine, assertFindingsMatch } from './index';
import { createMockFinding } from '@/types/__tests__/fixtures';

describe('Test Helpers Suite', () => {
  describe('loadFixtures', () => {
    it('successfully loads and parses sample-secrets.json fixtures', () => {
      const fixtures = loadFixtures('./src/test/fixtures/secrets/sample-secrets.json');
      expect(fixtures).toBeDefined();
      expect(fixtures.length).toBeGreaterThanOrEqual(10);
      expect(fixtures[0].id).toBe('aws-access-key-1');
      expect(fixtures[0].expectedFindings.length).toBe(1);
    });

    it('throws error when file path is invalid', () => {
      expect(() => loadFixtures('./non-existent-fixtures.json')).toThrow();
    });
  });

  describe('createTestEngine', () => {
    it('creates a mock detection engine with default values', () => {
      const engine = createTestEngine();
      expect(engine.name).toBe('MockDetectionEngine');
      expect(engine.layer).toBe(1);
      expect(engine.isAvailable()).toBe(true);
    });

    it('creates a mock detection engine with custom overrides', async () => {
      const mockFinding = createMockFinding();
      const engine = createTestEngine({
        name: 'CustomRegexEngine',
        layer: 2,
        analyze: async () => [mockFinding],
      });

      expect(engine.name).toBe('CustomRegexEngine');
      expect(engine.layer).toBe(2);

      const findings = await engine.analyze({ text: 'sample' });
      expect(findings).toEqual([mockFinding]);
    });
  });

  describe('assertFindingsMatch', () => {
    it('identifies matching findings correctly', () => {
      const mockFinding = createMockFinding({
        secretType: 'aws_access_key',
        lineNumber: 1,
        confidence: 'high',
        detectionLayer: 1,
      });

      const result = assertFindingsMatch(
        [mockFinding],
        [
          {
            secretType: 'aws_access_key',
            lineNumber: 1,
            confidence: 'high',
            detectionLayer: 1,
          },
        ]
      );

      expect(result.matches).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it('identifies mismatched count and properties with diff explanations', () => {
      const mockFinding = createMockFinding({
        secretType: 'api_key',
        lineNumber: 5,
        confidence: 'low',
        detectionLayer: 2,
      });

      const result = assertFindingsMatch(
        [mockFinding],
        [
          {
            secretType: 'aws_access_key',
            lineNumber: 1,
            confidence: 'high',
            detectionLayer: 1,
          },
          {
            secretType: 'token',
            lineNumber: 10,
            confidence: 'high',
          },
        ]
      );

      expect(result.matches).toBe(false);
      expect(result.differences.length).toBeGreaterThan(0);
      expect(result.differences[0]).toContain('Count mismatch');
    });
  });
});
