export interface DictionaryTestFixture {
  id: string;
  category: 'should-filter' | 'should-pass';
  input: string;
  description: string;
  expectedHasWords: boolean;
  expectedMinWordCount?: number;
}

export const DICTIONARY_TEST_FIXTURES: DictionaryTestFixture[] = [
  // 1. Should Filter (has >= 2 dictionary words)
  {
    id: 'camelcase-compound-1',
    category: 'should-filter',
    input: 'getAccessTokenFromStorage',
    description: 'camelCase compound string containing get, access, token, from, storage',
    expectedHasWords: true,
    expectedMinWordCount: 2,
  },
  {
    id: 'snake-case-compound',
    category: 'should-filter',
    input: 'user_session_token_identifier',
    description: 'snake_case compound string containing user, session, token, identifier',
    expectedHasWords: true,
    expectedMinWordCount: 2,
  },
  {
    id: 'kebab-case-compound',
    category: 'should-filter',
    input: 'global-authentication-secret-provider',
    description: 'kebab-case compound string containing global, authentication, secret, provider',
    expectedHasWords: true,
    expectedMinWordCount: 2,
  },
  {
    id: 'embedded-subwords',
    category: 'should-filter',
    input: 'PasswordResetTokenGeneratorService',
    description: 'PascalCase compound string with password, reset, token, generator, service',
    expectedHasWords: true,
    expectedMinWordCount: 2,
  },
  {
    id: 'natural-language-sentence',
    category: 'should-filter',
    input: 'The quick brown fox jumps over the lazy dog',
    description: 'Natural language English sentence',
    expectedHasWords: true,
    expectedMinWordCount: 2,
  },

  // 2. Should Pass (has < 2 dictionary words, true high-entropy secrets)
  {
    id: 'api-key-openai',
    category: 'should-pass',
    input: 'sk-proj-abc123XYZ789defGHI456',
    description: 'Random OpenAI API key structure',
    expectedHasWords: false,
  },
  {
    id: 'api-key-aws',
    category: 'should-pass',
    input: 'AKIA1234567890ABCDEF',
    description: 'AWS access key ID format',
    expectedHasWords: false,
  },
  {
    id: 'random-uuid-v4',
    category: 'should-pass',
    input: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID v4 random hex string',
    expectedHasWords: false,
  },
  {
    id: 'sha256-hash',
    category: 'should-pass',
    input: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    description: 'SHA-256 hash string',
    expectedHasWords: false,
  },
  {
    id: 'base64-random-token',
    category: 'should-pass',
    input: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCY9876543210',
    description: 'High entropy Base64 random key',
    expectedHasWords: false,
  },
  {
    id: 'single-word-only',
    category: 'should-pass',
    input: 'token1234567890987654321',
    description: 'String containing only 1 dictionary word (token) below threshold 2',
    expectedHasWords: false,
  },
  {
    id: 'short-noise-words',
    category: 'should-pass',
    input: 'is_it_at_in_on_to_by',
    description: 'String containing only 1 and 2 character noise words (below min length 3)',
    expectedHasWords: false,
  },
  {
    id: 'empty-string',
    category: 'should-pass',
    input: '',
    description: 'Empty string',
    expectedHasWords: false,
  },
];
