import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt } from '../prompt-template';
import {
  ambiguousApiKeyFinding,
  ambiguousFalsePositiveFinding,
} from './fixtures/ambiguous-findings';
import type { AmbiguousFinding } from '@/types/llm-types';

describe('prompt-template', () => {
  describe('buildSystemPrompt', () => {
    it('instructs the model to act as a secret detection expert', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('secret detection expert');
      expect(prompt).toContain('real secret');
      expect(prompt).toContain('false positive');
    });

    it('includes the expected JSON output schema', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('"verdict"');
      expect(prompt).toContain('real_secret');
      expect(prompt).toContain('false_positive');
      expect(prompt).toContain('uncertain');
      expect(prompt).toContain('confidence');
      expect(prompt).toMatch(/JSON/i);
    });
  });

  describe('buildUserPrompt', () => {
    it('includes finding details and context lines', () => {
      const prompt = buildUserPrompt(ambiguousApiKeyFinding);

      expect(prompt).toContain(`findingId: ${ambiguousApiKeyFinding.id}`);
      expect(prompt).toContain(`secretType: ${ambiguousApiKeyFinding.secretType}`);
      expect(prompt).toContain(`maskedValue: ${ambiguousApiKeyFinding.maskedValue}`);
      expect(prompt).toContain('Surrounding context lines (±5):');

      for (const line of ambiguousApiKeyFinding.contextLines) {
        expect(prompt).toContain(line);
      }
    });

    it('includes candidate types and entropy when present', () => {
      const prompt = buildUserPrompt(ambiguousFalsePositiveFinding);
      expect(prompt).toContain('generic_secret');
      expect(prompt).toContain('token');
      expect(prompt).toContain(`entropyScore: ${ambiguousFalsePositiveFinding.entropyScore}`);
    });

    it('handles empty context lines without throwing', () => {
      const finding: AmbiguousFinding = {
        ...ambiguousApiKeyFinding,
        contextLines: [],
        candidates: undefined,
        entropyScore: undefined,
      };
      const prompt = buildUserPrompt(finding);
      expect(prompt).toContain('(no context lines provided)');
      expect(prompt).toContain('candidates: none');
      expect(prompt).toContain('entropyScore: n/a');
    });

    it('asks for JSON verdict/confidence/reasoning output', () => {
      const prompt = buildUserPrompt(ambiguousApiKeyFinding);
      expect(prompt).toContain('Return JSON');
      expect(prompt).toContain('verdict');
      expect(prompt).toContain('confidence');
      expect(prompt).toContain('reasoning');
    });
  });
});
