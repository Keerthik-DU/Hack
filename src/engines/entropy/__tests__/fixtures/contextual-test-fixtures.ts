import { StringContext, ConfidenceAdjustment } from '../../contextual-signals';

export interface ContextualTestFixture {
  id: string;
  description: string;
  context?: StringContext;
  expectedHasSignal: boolean;
  expectedAdjustment: ConfidenceAdjustment;
  expectedMatchedKeywords?: string[];
}

export const CONTEXTUAL_TEST_FIXTURES: ContextualTestFixture[] = [
  {
    id: 'camelcase-apikey',
    description: 'camelCase variable name apiKey',
    context: { variableName: 'apiKey' },
    expectedHasSignal: true,
    expectedAdjustment: 'boost',
    expectedMatchedKeywords: ['key', 'api_key', 'apikey'],
  },
  {
    id: 'snakecase-db-password',
    description: 'snake_case variable name database_password',
    context: { variableName: 'database_password' },
    expectedHasSignal: true,
    expectedAdjustment: 'boost',
    expectedMatchedKeywords: ['password', 'pass', 'pwd'],
  },
  {
    id: 'uppercase-my-api-key',
    description: 'UPPER_CASE variable name MY_API_KEY',
    context: { variableName: 'MY_API_KEY' },
    expectedHasSignal: true,
    expectedAdjustment: 'boost',
    expectedMatchedKeywords: ['key', 'api_key', 'apikey'],
  },
  {
    id: 'pascalcase-client-secret',
    description: 'PascalCase variable name ClientSecretProvider',
    context: { variableName: 'ClientSecretProvider' },
    expectedHasSignal: true,
    expectedAdjustment: 'boost',
    expectedMatchedKeywords: ['secret'],
  },
  {
    id: 'auth-header-surrounding',
    description: 'Context with surrounding keywords containing auth and bearer',
    context: { surroundingKeywords: ['Authorization', 'Bearer', 'Header'] },
    expectedHasSignal: true,
    expectedAdjustment: 'boost',
    expectedMatchedKeywords: ['auth', 'bearer'],
  },
  {
    id: 'assignment-expression',
    context: { assignmentPattern: 'const aws_access_key_id = "..."' },
    description: 'Assignment pattern containing aws_access_key_id',
    expectedHasSignal: true,
    expectedAdjustment: 'boost',
    expectedMatchedKeywords: ['key', 'access_key'],
  },
  {
    id: 'no-context-neutral',
    description: 'Undefined context object',
    context: undefined,
    expectedHasSignal: false,
    expectedAdjustment: 'neutral',
    expectedMatchedKeywords: [],
  },
  {
    id: 'empty-context-neutral',
    description: 'Empty StringContext object',
    context: {},
    expectedHasSignal: false,
    expectedAdjustment: 'neutral',
    expectedMatchedKeywords: [],
  },
  {
    id: 'non-sensitive-variable-name',
    description: 'Variable name with no sensitive keywords (userDisplayName)',
    context: { variableName: 'userDisplayName' },
    expectedHasSignal: false,
    expectedAdjustment: 'neutral',
    expectedMatchedKeywords: [],
  },
];
