/**
 * WO-061: Comprehensive Unit Tests for RegexEngine Module
 *
 * Run:
 *   npx vitest run tests/unit/engines/RegexEngine.test.ts
 */

import { describe, it, expect } from 'vitest';
import { RegexEngine } from '@/engines/regex/regex-engine';
import { PatternRegistry } from '@/engines/regex/pattern-registry';
import type { IDetectionEngine, Finding, PatternDefinition } from '@/engines/types';
import { MockPatternRegistry } from './mocks/MockPatternRegistry';

/** Built at runtime so static secret scanners do not flag fixture literals. */
const join = (...parts: string[]) => parts.join('');

const AWS_ACCESS_KEY = join('AKIA', 'IOSFODNN7', 'NOTREAL');
const AWS_SECRET_KEY = join('wJalrXUtnFEMI/K7MDENG/', 'bPxRfiCY', 'EXAMPLEKEY');
const AWS_SESSION_TOKEN = join(
  'FwoGZXIvYXdzEBYaDFakeSessionTokenValueForUnitTestsOnly0123456789+/=',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/AB'
);
const GITHUB_PAT = join('ghp_', 'abcdefghijklmnopqrstuvwxyz0123456789');
const GITHUB_FINE = join(
  'github_pat_',
  'abcdefghijklmnopqrstuv_',
  'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVW'
);
const GITHUB_OAUTH = join('gho_', 'abcdefghijklmnopqrstuvwxyz0123456789');
const GITHUB_APP = join('ghs_', 'abcdefghijklmnopqrstuvwxyz0123456789');
const STRIPE_LIVE = join('sk_', 'live_', 'abcdefghijklmnopqrstuvwx');
const STRIPE_PUBLISHABLE = join('pk_', 'live_', 'abcdefghijklmnopqrstuvwx');
const GOOGLE_API_KEY = join('AIza', 'SyA-', 'abcdefghijklmnopqrstuvwxyz01234');
const SSH_RSA = join('-----BEGIN ', 'RSA PRIVATE KEY-----');
const SSH_EC = join('-----BEGIN ', 'EC PRIVATE KEY-----');
const SSH_OPENSSH = join('-----BEGIN ', 'OPENSSH PRIVATE KEY-----');
const JWT = join(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.',
  'eyJzdWIiOiIxMjM0NTY3ODkwIn0.',
  'signaturepart1234567890abcdef'
);
const SLACK_WEBHOOK = join(
  'https://hooks.slack.com/services/',
  'T00000000/B00000000/',
  'XXXXXXXXXXXXXXXXXXXXXXXX'
);
const SLACK_BOT = join(
  'xoxb-',
  '123456789012-1234567890123-',
  'abcdefghijklmnopqrstuvwx'
);
const MONGODB_URI = join('mongodb://user:', 'p4ssw0rd', '@cluster0.example.com');
const POSTGRES_URI = join('postgresql://user:', 'p4ssw0rd', '@localhost:5432/');
const MYSQL_URI = join('mysql://user:', 'p4ssw0rd', '@localhost:3306/');
const REDIS_URI = join('redis://default:', 'p4ssw0rd', '@localhost:6379');
const HEROKU_LINE = join(
  'heroku_api_key = "',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '"'
);
const TWILIO_AUTH = join('SK', '0123456789abcdef0123456789abcdef');
const SENDGRID_KEY = join(
  'SG.',
  'abcdefghijklmnopqrstuv.',
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ'
);
const MAILGUN_KEY = join('key-', '0123456789abcdef0123456789abcdef');
const GENERIC_API_KEY_HEADER = join('X-API-Key: ', 'abcdefghijklmnopqrstuvwxyz0123');

const SIMPLE_PATTERN: PatternDefinition = {
  id: 'mock-simple-secret',
  secretType: 'generic_secret',
  regex: 'MOCKSECRET_[A-Z0-9]{8}',
  keywords: ['MOCKSECRET_'],
  category: 'generic',
};

const PK_LIVE_PATTERN: PatternDefinition = {
  id: 'stripe-publishable-key-mock',
  secretType: 'api_key',
  regex: 'pk_live_[0-9a-zA-Z]{24}',
  keywords: ['pk_live_', 'stripe'],
  category: 'payment',
};

const AWS_MWS_PATTERN: PatternDefinition = {
  id: 'aws-mws-auth-token-mock',
  secretType: 'aws_access_key',
  regex: 'amzn\\.mws\\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
  keywords: ['amzn.mws', 'mws'],
  category: 'cloud-provider',
};

function assertHighConfidenceFinding(
  finding: Finding,
  expected: {
    secretType: Finding['secretType'];
    lineNumber: number;
    columnStart: number;
    columnEnd: number;
  }
): void {
  expect(finding.secretType).toBe(expected.secretType);
  expect(finding.lineNumber).toBe(expected.lineNumber);
  expect(finding.columnStart).toBe(expected.columnStart);
  expect(finding.columnEnd).toBe(expected.columnEnd);
  expect(finding.confidence).toBe('high');
  expect(finding.detectionLayer).toBe(1);
  expect(finding.maskedValue).toBeTruthy();
  expect(finding.id).toBeTruthy();
  expect(finding.context).toBeTruthy();
  expect(finding.rawValue).toBeUndefined();
}

describe('WO-061: RegexEngine comprehensive unit tests', () => {
  describe('Engine Mechanics', () => {
    const registry = new MockPatternRegistry([SIMPLE_PATTERN]);
    const engine = new RegexEngine(registry);

    it('implements IDetectionEngine with name RegexEngine and layer 1', () => {
      const asEngine: IDetectionEngine = engine;
      expect(asEngine.name).toBe('RegexEngine');
      expect(asEngine.layer).toBe(1);
      expect(asEngine.isAvailable()).toBe(true);
    });

    it('uses MockPatternRegistry with a single injected pattern', () => {
      expect(registry.getPatternCount()).toBe(1);
      expect(registry.getInjectedPatterns()[0].id).toBe('mock-simple-secret');
    });

    it('constructs a finding with all required fields populated', async () => {
      const text = 'value=MOCKSECRET_ABCD1234;';
      const findings = await engine.analyze({ text });
      expect(findings).toHaveLength(1);
      assertHighConfidenceFinding(findings[0], {
        secretType: 'generic_secret',
        lineNumber: 1,
        columnStart: 6,
        columnEnd: 25,
      });
    });

    it('tracks line numbers across multi-line input', async () => {
      const text = ['noop', 'prefix MOCKSECRET_ABCD1234 suffix', 'noop2'].join('\n');
      const findings = await engine.analyze({ text });
      expect(findings).toHaveLength(1);
      expect(findings[0].lineNumber).toBe(2);
    });

    it('reports accurate character ranges (columnStart/columnEnd)', async () => {
      const secret = 'MOCKSECRET_ZZZZ9999';
      const text = `leading ${secret}`;
      const findings = await engine.analyze({ text });
      expect(findings[0].columnStart).toBe(text.indexOf(secret));
      expect(findings[0].columnEnd).toBe(text.indexOf(secret) + secret.length);
    });

    it('assigns confidence level high for regex matches', async () => {
      const findings = await engine.analyze({ text: 'MOCKSECRET_1111AAAA' });
      expect(findings[0].confidence).toBe('high');
    });

    it('returns empty findings for empty and whitespace-only input', async () => {
      expect(await engine.analyze({ text: '' })).toEqual([]);
      expect(await engine.analyze({ text: '   \n\t  ' })).toEqual([]);
    });

    it('returns empty findings when AbortSignal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      const findings = await engine.analyze({
        text: 'MOCKSECRET_ABORT001',
        signal: controller.signal,
      });
      expect(findings).toEqual([]);
    });

    it('detects a secret at the beginning of the input (line 1, column 0)', async () => {
      const findings = await engine.analyze({ text: 'MOCKSECRET_START001' });
      expect(findings[0].lineNumber).toBe(1);
      expect(findings[0].columnStart).toBe(0);
    });

    it('detects a secret at the very end of the input', async () => {
      const text = 'prefix-MOCKSECRET_END00002';
      const findings = await engine.analyze({ text });
      expect(findings[0].columnEnd).toBe(text.length);
    });

    it('handles an input consisting entirely of a single secret', async () => {
      const findings = await engine.analyze({ text: 'MOCKSECRET_ONLYONES' });
      expect(findings).toHaveLength(1);
      expect(findings[0].columnStart).toBe(0);
    });

    it('ignores regex metacharacters that are not part of a secret', async () => {
      const findings = await engine.analyze({
        text: 'const re = /[a-z]+|foo*|bar?/; // brackets pipes asterisks',
      });
      expect(findings).toEqual([]);
    });

    it('detects secrets embedded in comments and string literals', async () => {
      const conforming = [
        '// comment MOCKSECRET_COMMENT0',
        "const x = 'MOCKSECRET_STRING01';",
        'const y = "MOCKSECRET_STRING02";',
      ].join('\n');
      const findings = await engine.analyze({ text: conforming });
      expect(findings).toHaveLength(3);
      expect(findings.map((f) => f.lineNumber)).toEqual([1, 2, 3]);
    });

    it('true-negative: short MOCKSECRET suffixes in comments are not matched', async () => {
      const text = [
        '// comment MOCKSECRET_COMMENT',
        "const x = 'MOCKSECRET_STRING1';",
      ].join('\n');
      expect(await engine.analyze({ text })).toEqual([]);
    });
  });

  describe('AWS Patterns', () => {
    const engine = new RegexEngine(new PatternRegistry());

    it('detects AWS Access Key ID (AKIA prefix) with correct metadata', async () => {
      const text = `const AWS_KEY = "${AWS_ACCESS_KEY}";`;
      const findings = await engine.analyze({ text });
      const f = findings.find((x) => x.secretType === 'aws_access_key');
      expect(f).toBeDefined();
      assertHighConfidenceFinding(f!, {
        secretType: 'aws_access_key',
        lineNumber: 1,
        columnStart: text.indexOf(AWS_ACCESS_KEY),
        columnEnd: text.indexOf(AWS_ACCESS_KEY) + AWS_ACCESS_KEY.length,
      });
    });

    it('true-negative: short AKIA-like token is not matched', async () => {
      const findings = await engine.analyze({ text: 'AKIA_SHORT' });
      expect(findings.filter((f) => f.secretType === 'aws_access_key')).toHaveLength(0);
    });

    it('detects AWS Secret Access Key assignment', async () => {
      const text = `aws_secret_access_key = "${AWS_SECRET_KEY}"`;
      const findings = await engine.analyze({ text });
      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0].secretType).toBe('aws_access_key');
      expect(findings[0].confidence).toBe('high');
      expect(findings[0].lineNumber).toBe(1);
      expect(findings[0].columnStart).toBe(0);
      expect(findings[0].columnEnd).toBe(text.length);
    });

    it('true-negative: aws_secret_access_key with non-40-char value is not matched', async () => {
      const findings = await engine.analyze({
        text: 'aws_secret_access_key = "tooshort"',
      });
      expect(findings).toEqual([]);
    });

    it('detects AWS Session Token assignment', async () => {
      const text = `aws_session_token = "${AWS_SESSION_TOKEN}"`;
      const findings = await engine.analyze({ text });
      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0].secretType).toBe('aws_access_key');
      expect(findings[0].confidence).toBe('high');
      expect(findings[0].lineNumber).toBe(1);
    });

    it('detects AWS MWS Auth Token via MockPatternRegistry (not in production set)', async () => {
      const mws = 'amzn.mws.12345678-1234-1234-1234-123456789012';
      const mockEngine = new RegexEngine(new MockPatternRegistry([AWS_MWS_PATTERN]));
      const text = `mws_auth = "${mws}"`;
      const findings = await mockEngine.analyze({ text });
      expect(findings).toHaveLength(1);
      assertHighConfidenceFinding(findings[0], {
        secretType: 'aws_access_key',
        lineNumber: 1,
        columnStart: text.indexOf(mws),
        columnEnd: text.indexOf(mws) + mws.length,
      });
    });
  });

  describe('GitHub Patterns', () => {
    const engine = new RegexEngine(new PatternRegistry());

    it('detects classic PAT (ghp_)', async () => {
      const text = `GITHUB_TOKEN=${GITHUB_PAT}`;
      const findings = await engine.analyze({ text });
      const f = findings.find((x) => x.maskedValue.startsWith('ghp_'));
      expect(f).toBeDefined();
      assertHighConfidenceFinding(f!, {
        secretType: 'token',
        lineNumber: 1,
        columnStart: text.indexOf(GITHUB_PAT),
        columnEnd: text.indexOf(GITHUB_PAT) + GITHUB_PAT.length,
      });
    });

    it('true-negative: ghp_ with insufficient length is not matched', async () => {
      const findings = await engine.analyze({ text: 'ghp_tooshort' });
      expect(findings.filter((f) => f.maskedValue.startsWith('ghp_'))).toHaveLength(0);
    });

    it('detects fine-grained token (github_pat_)', async () => {
      const text = `token: ${GITHUB_FINE}`;
      const findings = await engine.analyze({ text });
      const f = findings.find((x) => x.maskedValue.startsWith('gith'));
      expect(f).toBeDefined();
      assertHighConfidenceFinding(f!, {
        secretType: 'token',
        lineNumber: 1,
        columnStart: text.indexOf(GITHUB_FINE),
        columnEnd: text.indexOf(GITHUB_FINE) + GITHUB_FINE.length,
      });
    });

    it('detects OAuth token (gho_)', async () => {
      const text = `oauth=${GITHUB_OAUTH}`;
      const findings = await engine.analyze({ text });
      expect(findings.some((f) => f.secretType === 'token')).toBe(true);
      expect(findings[0].confidence).toBe('high');
      expect(findings[0].lineNumber).toBe(1);
      expect(findings[0].columnStart).toBe(text.indexOf(GITHUB_OAUTH));
    });

    it('detects app/server token (ghs_)', async () => {
      const text = `app_token=${GITHUB_APP}`;
      const findings = await engine.analyze({ text });
      expect(findings.some((f) => f.secretType === 'token')).toBe(true);
      expect(findings[0].confidence).toBe('high');
      expect(findings[0].columnEnd).toBe(text.indexOf(GITHUB_APP) + GITHUB_APP.length);
    });
  });

  describe('Payment Patterns', () => {
    const engine = new RegexEngine(new PatternRegistry());

    it('detects Stripe live secret key (sk_live_)', async () => {
      const text = `STRIPE_KEY=${STRIPE_LIVE}`;
      const findings = await engine.analyze({ text });
      const f = findings.find((x) => x.secretType === 'api_key');
      expect(f).toBeDefined();
      assertHighConfidenceFinding(f!, {
        secretType: 'api_key',
        lineNumber: 1,
        columnStart: text.indexOf(STRIPE_LIVE),
        columnEnd: text.indexOf(STRIPE_LIVE) + STRIPE_LIVE.length,
      });
    });

    it('true-negative: sk_live_ with short body is not matched', async () => {
      const findings = await engine.analyze({ text: 'sk_live_short' });
      expect(findings).toEqual([]);
    });

    it('detects Stripe publishable key (pk_live_) via MockPatternRegistry', async () => {
      const mockEngine = new RegexEngine(new MockPatternRegistry([PK_LIVE_PATTERN]));
      const text = `publishable=${STRIPE_PUBLISHABLE}`;
      const findings = await mockEngine.analyze({ text });
      assertHighConfidenceFinding(findings[0], {
        secretType: 'api_key',
        lineNumber: 1,
        columnStart: text.indexOf(STRIPE_PUBLISHABLE),
        columnEnd: text.indexOf(STRIPE_PUBLISHABLE) + STRIPE_PUBLISHABLE.length,
      });
    });

    it('detects Stripe restricted live key (rk_live_) as payment-related pattern', async () => {
      const key = join('rk_', 'live_', 'abcdefghijklmnopqrstuvwx');
      const text = `rk=${key}`;
      const findings = await engine.analyze({ text });
      expect(findings[0].secretType).toBe('api_key');
      expect(findings[0].confidence).toBe('high');
      expect(findings[0].columnStart).toBe(text.indexOf(key));
    });
  });

  describe('Infrastructure Patterns', () => {
    const engine = new RegexEngine(new PatternRegistry());

    it('detects SSH RSA private key header', async () => {
      const text = SSH_RSA;
      const findings = await engine.analyze({ text });
      assertHighConfidenceFinding(findings[0], {
        secretType: 'private_key',
        lineNumber: 1,
        columnStart: 0,
        columnEnd: SSH_RSA.length,
      });
    });

    it('detects SSH EC private key header', async () => {
      const findings = await engine.analyze({ text: SSH_EC });
      expect(findings[0].secretType).toBe('private_key');
      expect(findings[0].confidence).toBe('high');
      expect(findings[0].columnStart).toBe(0);
      expect(findings[0].columnEnd).toBe(SSH_EC.length);
    });

    it('detects OPENSSH private key header', async () => {
      const findings = await engine.analyze({ text: SSH_OPENSSH });
      expect(findings[0].secretType).toBe('private_key');
      expect(findings[0].confidence).toBe('high');
    });

    it('true-negative: public key header is not matched as private_key', async () => {
      const findings = await engine.analyze({ text: '-----BEGIN PUBLIC KEY-----' });
      expect(findings.filter((f) => f.secretType === 'private_key')).toHaveLength(0);
    });

    it('detects MongoDB URI with credentials', async () => {
      const text = MONGODB_URI;
      const findings = await engine.analyze({ text });
      assertHighConfidenceFinding(findings[0], {
        secretType: 'database_url',
        lineNumber: 1,
        columnStart: 0,
        columnEnd: text.length,
      });
    });

    it('detects PostgreSQL URI with credentials', async () => {
      const text = POSTGRES_URI;
      const findings = await engine.analyze({ text });
      assertHighConfidenceFinding(findings[0], {
        secretType: 'database_url',
        lineNumber: 1,
        columnStart: 0,
        columnEnd: text.length,
      });
    });

    it('detects MySQL URI with credentials', async () => {
      const text = MYSQL_URI;
      const findings = await engine.analyze({ text });
      assertHighConfidenceFinding(findings[0], {
        secretType: 'database_url',
        lineNumber: 1,
        columnStart: 0,
        columnEnd: text.length,
      });
    });

    it('detects Redis URI with credentials', async () => {
      const text = REDIS_URI;
      const findings = await engine.analyze({ text });
      assertHighConfidenceFinding(findings[0], {
        secretType: 'database_url',
        lineNumber: 1,
        columnStart: 0,
        columnEnd: text.length,
      });
    });

    it('detects Heroku API key assignment', async () => {
      const findings = await engine.analyze({ text: HEROKU_LINE });
      expect(findings[0].secretType).toBe('api_key');
      expect(findings[0].confidence).toBe('high');
      expect(findings[0].lineNumber).toBe(1);
    });

    it('detects Twilio API/auth key (SK + 32 hex)', async () => {
      const text = `TWILIO_AUTH=${TWILIO_AUTH}`;
      const findings = await engine.analyze({ text });
      const f = findings.find((x) => x.secretType === 'api_key');
      expect(f).toBeDefined();
      expect(f!.confidence).toBe('high');
      expect(f!.columnStart).toBe(text.indexOf(TWILIO_AUTH));
      expect(f!.columnEnd).toBe(text.indexOf(TWILIO_AUTH) + TWILIO_AUTH.length);
    });

    it('detects SendGrid API key', async () => {
      const text = SENDGRID_KEY;
      const findings = await engine.analyze({ text });
      assertHighConfidenceFinding(findings[0], {
        secretType: 'api_key',
        lineNumber: 1,
        columnStart: 0,
        columnEnd: text.length,
      });
    });

    it('detects Mailgun API key', async () => {
      const text = MAILGUN_KEY;
      const findings = await engine.analyze({ text });
      assertHighConfidenceFinding(findings[0], {
        secretType: 'api_key',
        lineNumber: 1,
        columnStart: 0,
        columnEnd: text.length,
      });
    });

    it('detects Google API key (AIzaSy...)', async () => {
      const text = `GOOGLE_KEY=${GOOGLE_API_KEY}`;
      const findings = await engine.analyze({ text });
      const f = findings.find((x) => x.secretType === 'api_key');
      expect(f).toBeDefined();
      expect(f!.confidence).toBe('high');
      expect(f!.lineNumber).toBe(1);
      expect(f!.columnStart).toBe(text.indexOf(GOOGLE_API_KEY));
    });
  });

  describe('Token Patterns', () => {
    const engine = new RegexEngine(new PatternRegistry());

    it('detects JWT tokens with eyJ header structure', async () => {
      const text = `Authorization: Bearer ${JWT}`;
      const findings = await engine.analyze({ text });
      const jwtFinding = findings.find((f) => f.secretType === 'jwt');
      expect(jwtFinding).toBeDefined();
      expect(jwtFinding!.confidence).toBe('high');
      expect(jwtFinding!.lineNumber).toBe(1);
      expect(jwtFinding!.columnStart).toBe(text.indexOf(JWT));
      expect(jwtFinding!.columnEnd).toBe(text.indexOf(JWT) + JWT.length);
    });

    it('true-negative: incomplete JWT (missing segments) is not matched', async () => {
      const findings = await engine.analyze({ text: 'eyJhbGciOiJIUzI1NiJ9.onlytwo' });
      expect(findings.filter((f) => f.secretType === 'jwt')).toHaveLength(0);
    });

    it('detects Slack webhook URLs', async () => {
      const text = SLACK_WEBHOOK;
      const findings = await engine.analyze({ text });
      assertHighConfidenceFinding(findings[0], {
        secretType: 'token',
        lineNumber: 1,
        columnStart: 0,
        columnEnd: text.length,
      });
    });

    it('detects Slack bot tokens (xoxb-)', async () => {
      const text = `BOT=${SLACK_BOT}`;
      const findings = await engine.analyze({ text });
      const f = findings.find((x) => x.secretType === 'token');
      expect(f).toBeDefined();
      assertHighConfidenceFinding(f!, {
        secretType: 'token',
        lineNumber: 1,
        columnStart: text.indexOf(SLACK_BOT),
        columnEnd: text.indexOf(SLACK_BOT) + SLACK_BOT.length,
      });
    });

    it('detects generic API key header pattern', async () => {
      const text = GENERIC_API_KEY_HEADER;
      const findings = await engine.analyze({ text });
      assertHighConfidenceFinding(findings[0], {
        secretType: 'api_key',
        lineNumber: 1,
        columnStart: 0,
        columnEnd: text.length,
      });
    });
  });

  describe('Multi-Match Scenarios', () => {
    const engine = new RegexEngine(new PatternRegistry());

    it('detects two secrets on the same line', async () => {
      const text = `keys ${AWS_ACCESS_KEY} ${GITHUB_PAT}`;
      const findings = await engine.analyze({ text });
      expect(findings.length).toBeGreaterThanOrEqual(2);
      expect(findings.every((f) => f.lineNumber === 1)).toBe(true);
      expect(findings.some((f) => f.secretType === 'aws_access_key')).toBe(true);
      expect(findings.some((f) => f.secretType === 'token')).toBe(true);
      const starts = findings.map((f) => f.columnStart);
      expect(new Set(starts).size).toBeGreaterThanOrEqual(2);
    });

    it('detects five secrets across ten lines with different types', async () => {
      const lines = [
        'line1',
        `aws=${AWS_ACCESS_KEY}`,
        'line3',
        `gh=${GITHUB_PAT}`,
        'line5',
        `stripe=${STRIPE_LIVE}`,
        'line7',
        SSH_RSA,
        'line9',
        `mongo=${MONGODB_URI}`,
      ];
      const findings = await engine.analyze({ text: lines.join('\n') });
      expect(findings.length).toBeGreaterThanOrEqual(5);
      const types = new Set(findings.map((f) => f.secretType));
      expect(types.size).toBeGreaterThanOrEqual(4);
      expect(findings.find((f) => f.secretType === 'aws_access_key')?.lineNumber).toBe(2);
      expect(findings.find((f) => f.maskedValue.startsWith('ghp_'))?.lineNumber).toBe(4);
      expect(findings.find((f) => f.secretType === 'private_key')?.lineNumber).toBe(8);
    });

    it('detects 10+ different secret types in a .env-like file', async () => {
      const envFile = [
        `AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY}`,
        `aws_secret_access_key=${AWS_SECRET_KEY}`,
        `GITHUB_TOKEN=${GITHUB_PAT}`,
        `STRIPE_SECRET_KEY=${STRIPE_LIVE}`,
        `GOOGLE_API_KEY=${GOOGLE_API_KEY}`,
        SSH_OPENSSH,
        `JWT=${JWT}`,
        `SLACK_WEBHOOK=${SLACK_WEBHOOK}`,
        `SLACK_BOT_TOKEN=${SLACK_BOT}`,
        `DATABASE_URL=${POSTGRES_URI}`,
        `MONGO_URI=${MONGODB_URI}`,
        `REDIS_URL=${REDIS_URI}`,
        HEROKU_LINE,
        `TWILIO_AUTH_TOKEN=${TWILIO_AUTH}`,
        `SENDGRID_API_KEY=${SENDGRID_KEY}`,
        `MAILGUN_API_KEY=${MAILGUN_KEY}`,
        GENERIC_API_KEY_HEADER,
      ].join('\n');
      const findings = await engine.analyze({ text: envFile });
      expect(findings.length).toBeGreaterThanOrEqual(10);
      const types = new Set(findings.map((f) => f.secretType));
      expect(types.has('aws_access_key')).toBe(true);
      expect(types.has('token')).toBe(true);
      expect(types.has('api_key')).toBe(true);
      expect(types.has('private_key')).toBe(true);
      expect(types.has('jwt')).toBe(true);
      expect(types.has('database_url')).toBe(true);
    });

    it('handles secrets spanning conceptual line-boundary context without crashing', async () => {
      const text = 'aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/\\\nbPxRfiCYEXAMPLEKEYXXXX"';
      await expect(engine.analyze({ text })).resolves.toBeDefined();
    });
  });

  describe('No-Match Scenarios', () => {
    const engine = new RegexEngine(new PatternRegistry());

    it('returns empty findings for plain English text', async () => {
      const findings = await engine.analyze({
        text: 'The deployment pipeline finished successfully with no credentials present.',
      });
      expect(findings).toEqual([]);
    });

    it('returns empty findings for code without secrets', async () => {
      const findings = await engine.analyze({
        text: [
          'function add(a: number, b: number) {',
          '  return a + b;',
          '}',
          'console.log(add(1, 2));',
        ].join('\n'),
      });
      expect(findings).toEqual([]);
    });

    it('returns empty findings for documentation snippets without live secrets', async () => {
      const findings = await engine.analyze({
        text: 'See docs: replace YOUR_API_KEY_HERE with a project token from the dashboard.',
      });
      expect(findings).toEqual([]);
    });

    it('documents that AWS EXAMPLE placeholder matches the AKIA pattern (no allowlist yet)', async () => {
      const findings = await engine.analyze({ text: join('AKIA', 'IOSFODNN7', 'EXAMPLE') });
      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0].secretType).toBe('aws_access_key');
    });
  });

  describe('Scale & Line-Count Handling', () => {
    const engine = new RegexEngine(new PatternRegistry());

    it('handles a 1-line input without errors', async () => {
      const findings = await engine.analyze({ text: `k=${AWS_ACCESS_KEY}` });
      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0].lineNumber).toBe(1);
    });

    it('handles a 100-line input without errors', async () => {
      const lines = Array.from({ length: 100 }, (_, i) =>
        i === 50 ? `secret=${GITHUB_PAT}` : `// filler line ${i}`
      );
      const findings = await engine.analyze({ text: lines.join('\n') });
      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0].lineNumber).toBe(51);
    });

    it('handles a 1000+ line input without errors', async () => {
      const lines = Array.from({ length: 1200 }, (_, i) =>
        i === 999 ? `stripe=${STRIPE_LIVE}` : `noop_${i}=value`
      );
      const findings = await engine.analyze({ text: lines.join('\n') });
      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings.some((f) => f.lineNumber === 1000)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('scans ~10,000 characters with 5 embedded secrets in under 500ms', async () => {
      const engine = new RegexEngine(new PatternRegistry());
      const secrets = [
        `AWS=${AWS_ACCESS_KEY}`,
        `GH=${GITHUB_PAT}`,
        `STRIPE=${STRIPE_LIVE}`,
        `GOOGLE=${GOOGLE_API_KEY}`,
        `MONGO=${MONGODB_URI}`,
      ];
      const filler = 'x'.repeat(250);
      const chunks: string[] = [];
      while (chunks.join('\n').length < 11000) {
        chunks.push(filler);
      }
      chunks[10] = secrets[0];
      chunks[20] = secrets[1];
      chunks[30] = secrets[2];
      chunks[40] = secrets[3];
      chunks[50] = secrets[4];
      const text = chunks.join('\n');
      expect(text.length).toBeGreaterThanOrEqual(10000);

      const start = performance.now();
      const findings = await engine.analyze({ text });
      const elapsed = performance.now() - start;

      expect(findings.length).toBeGreaterThanOrEqual(5);
      expect(elapsed).toBeLessThan(500);
    });

    it('completes adversarial metacharacter-heavy input without hanging', async () => {
      const engine = new RegexEngine(new PatternRegistry());
      const adversarial = ('(((([[[[{{{{||||||****????++++' + 'a'.repeat(200) + '\n').repeat(40);
      const start = performance.now();
      const findings = await engine.analyze({ text: adversarial });
      const elapsed = performance.now() - start;
      expect(Array.isArray(findings)).toBe(true);
      expect(elapsed).toBeLessThan(500);
    });
  });
});
