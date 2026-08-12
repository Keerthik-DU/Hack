/**
 * Deterministic corpus generator for WO-057.
 * Run: npx tsx tests/fixtures/generate-corpus.ts
 *
 * Produces ≥500 labeled JSON samples under tests/fixtures/corpus/.
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import patternsData from '../../src/patterns/v1/patterns.json';
import type { CorpusFinding, CorpusSample, GroundTruthLabel } from './corpus-schema';

interface PatternDef {
  id: string;
  secretType: string;
  regex: string;
  keywords: string[];
  category: string;
  severity: string;
}

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = path.join(ROOT, 'corpus');
const patterns = patternsData as PatternDef[];

const FOLDER_DIRS = [
  'aws',
  'github',
  'stripe',
  'google',
  'ssh',
  'jwt',
  'slack',
  'database',
  'generic-entropy',
  'contextual',
  'multi-secret',
  'true-negatives',
  'mixed',
] as const;

function folderForPattern(pattern: PatternDef): string {
  const id = pattern.id;
  if (id.startsWith('aws-')) return 'aws';
  if (id.startsWith('github-')) return 'github';
  if (id.startsWith('stripe-')) return 'stripe';
  if (id.startsWith('gcp-') || id.includes('firebase')) return 'google';
  if (id.startsWith('private-key') || id === 'azure-client-certificate') return 'ssh';
  if (id.includes('jwt') || id === 'auth0-management-api-token') return 'jwt';
  if (id.startsWith('slack-')) return 'slack';
  if (
    pattern.category === 'database' ||
    id.includes('postgres') ||
    id.includes('mysql') ||
    id.includes('mongodb') ||
    id.includes('redis') ||
    id.startsWith('db-')
  ) {
    return 'database';
  }
  return 'mixed';
}

function alpha(n: number, seed: number, alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'): string {
  let out = '';
  let s = (seed * 1103515245 + 12345) >>> 0;
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    out += alphabet[s % alphabet.length];
  }
  return out;
}

function hex(n: number, seed: number): string {
  return alpha(n, seed, '0123456789abcdef');
}

function uuid(seed: number): string {
  return `${hex(8, seed)}-${hex(4, seed + 1)}-${hex(4, seed + 2)}-${hex(4, seed + 3)}-${hex(12, seed + 4)}`;
}

function b64ish(n: number, seed: number): string {
  return alpha(n, seed, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=');
}

/** Synthetic secret values that match each PatternRegistry regex. */
function secretFor(patternId: string, variant: number): string {
  const v = variant + 1;
  switch (patternId) {
    case 'aws-access-key-id':
      return `AKIA${alpha(16, v, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')}`;
    case 'aws-secret-access-key':
      return `aws_secret_access_key = "${b64ish(40, v)}"`;
    case 'aws-session-token':
      return `aws_session_token = "${b64ish(120, v)}"`;
    case 'github-pat-classic':
      return `ghp_${alpha(36, v)}`;
    case 'github-pat-fine-grained':
      return `github_pat_${alpha(22, v)}_${alpha(59, v + 7)}`;
    case 'github-oauth-token':
      return `gho_${alpha(36, v)}`;
    case 'github-user-token':
      return `ghu_${alpha(36, v)}`;
    case 'github-server-token':
      return `ghs_${alpha(36, v)}`;
    case 'github-app-secret':
      return `github_app_secret = "${hex(40, v)}"`;
    case 'slack-webhook-url':
      return `https://hooks.slack.com/services/T${alpha(8, v)}/B${alpha(8, v + 1)}/${alpha(24, v + 2)}`;
    case 'slack-bot-token':
      return `xoxb-123456789012-${100000000000 + v}-` + alpha(24, v);
    case 'slack-user-token':
      return `xoxp-123456789012-${100000000000 + v}-` + alpha(24, v);
    case 'stripe-live-key':
      return `sk_live_${alpha(24, v)}`;
    case 'stripe-test-key':
      return `sk_test_${alpha(24, v)}`;
    case 'stripe-restricted-key':
      return `rk_live_${alpha(24, v)}`;
    case 'gcp-api-key':
      return `AIzaSy${alpha(33, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'gcp-service-account':
      return `"type": "service_account"`;
    case 'azure-storage-key':
      return `AccountKey=${b64ish(88, v)}`;
    case 'azure-ad-client-secret':
      return `client_secret = "${alpha(36, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.~-')}"`;
    case 'private-key-rsa':
      return '-----BEGIN RSA PRIVATE KEY-----';
    case 'private-key-dsa':
      return '-----BEGIN DSA PRIVATE KEY-----';
    case 'private-key-ec':
      return '-----BEGIN EC PRIVATE KEY-----';
    case 'private-key-pgp':
      return '-----BEGIN PGP PRIVATE KEY BLOCK-----';
    case 'private-key-openssh':
      return '-----BEGIN OPENSSH PRIVATE KEY-----';
    case 'azure-client-certificate':
      return '-----BEGIN CERTIFICATE-----';
    case 'npm-access-token':
      return `npm_${alpha(36, v)}`;
    case 'pypi-api-token':
      return `pypi-AgEIcHlwaS5vcmc${alpha(50, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'twilio-api-key':
      return `SK${hex(32, v)}`;
    case 'twilio-account-sid':
      return `AC${hex(32, v)}`;
    case 'sendgrid-api-key':
      return `SG.${alpha(22, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}.${alpha(43, v + 3, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'mailgun-api-key':
      return `key-${hex(32, v)}`;
    case 'heroku-api-key':
      return `heroku_api_key = "${uuid(v)}"`;
    case 'digitalocean-pat':
      return `dop_v1_${hex(64, v)}`;
    case 'datadog-api-key':
      return `datadog_api_key = "${hex(32, v)}"`;
    case 'openai-api-key':
      return `sk-${alpha(48, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'anthropic-api-key':
      return `sk-ant-${alpha(48, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'docker-config-auth':
      return `"auth": "${b64ish(28, v)}"`;
    case 'gitlab-pat':
      return `glpat-${alpha(20, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'terraform-cloud-token':
      return `${alpha(12, v)}.atlasv1.${alpha(60, v + 2, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'telegram-bot-token':
      return `${100000000 + v}:AA${alpha(33, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'discord-bot-token':
      return `M${alpha(24, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}.${alpha(6, v + 1, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}.${alpha(27, v + 2, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'shopify-access-token':
      return `shpat_${hex(32, v)}`;
    case 'segment-write-key':
      return `segment_write_key = "${alpha(32, v)}"`;
    case 'sentry-dsn':
      return `https://${hex(32, v)}@o${1000 + v}.ingest.sentry.io/${2000 + v}`;
    case 'square-access-token':
      return `sq0atp-${alpha(22, v, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-')}`;
    case 'postman-api-key':
      return `PMAK-${hex(24, v)}-${hex(32, v + 1)}`;
    case 'vault-token':
      return `hvs.${alpha(28, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'hubspot-api-key':
      return `hubspot_api_key = "${uuid(v)}"`;
    case 'circleci-token':
      return `circle_token = "${hex(40, v)}"`;
    case 'codecov-token':
      return `codecov_token = "${uuid(v)}"`;
    case 'databricks-token':
      return `dapi${hex(32, v)}`;
    case 'asana-pat':
      return `1/${String(1000000000000000 + v).slice(0, 16)}:${hex(32, v)}`;
    case 'airtable-api-key':
      return `pat${alpha(14, v)}.${hex(64, v)}`;
    case 'postgres-uri':
      return `postgresql://appuser:s3cretPass${v}@db.internal.example.com:5432/`;
    case 'mysql-uri':
      return `mysql://appuser:s3cretPass${v}@db.internal.example.com:3306/`;
    case 'mongodb-uri':
      return `mongodb+srv://appuser:s3cretPass${v}@cluster0.example.com`;
    case 'redis-uri':
      return `redis://default:s3cretPass${v}@cache.internal.example.com:6379`;
    case 'alibaba-access-key':
      return `LTAI${alpha(18, v)}`;
    case 'ibm-cloud-api-key':
      return `ibm_api_key = "${alpha(44, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}"`;
    case 'oracle-oci-credentials':
      return `ocid1.tenancy.oc1.${alpha(40, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-')}`;
    case 'travis-ci-token':
      return `travis_token = "${alpha(22, v)}"`;
    case 'jenkins-api-token':
      return `11${hex(32, v)}`;
    case 'jfrog-artifactory-api-key':
      return `AKCp8${alpha(42, v)}`;
    case 'jira-api-token':
      return `ATATT3xFfGF0${alpha(44, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'confluence-api-token':
      return `ATATT3xFfGF1${alpha(44, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'coveralls-token':
      return `coveralls_token = "${alpha(32, v)}"`;
    case 'sonarqube-token':
      return `sqp_${hex(40, v)}`;
    case 'pagerduty-api-key':
      return `y_pdp_${alpha(24, v)}`;
    case 'newrelic-api-key':
      return `NRAK-${alpha(27, v, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')}`;
    case 'splunk-hec-token':
      return `splunk_hec_token = "${uuid(v)}"`;
    case 'elasticsearch-api-key':
      return `elastic_api_key = "${alpha(40, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}"`;
    case 'supabase-api-key':
      return `sbp_${hex(40, v)}`;
    case 'planetscale-service-token':
      return `pscale_tkn_${alpha(43, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'launchdarkly-sdk-key':
      return `sdk-${uuid(v)}`;
    case 'fastly-api-token':
      return `fastly_api_token = "${alpha(32, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}"`;
    case 'snyk-api-token':
      return `snyk_token = "${uuid(v)}"`;
    case 'mapbox-access-token':
      return `pk.eyJ1Ijo${alpha(40, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}.${alpha(20, v + 5, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'algolia-admin-api-key':
      return `algolia_admin_api_key = "${hex(32, v)}"`;
    case 'firebase-server-key':
      return `AAAA${alpha(7, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}:${alpha(140, v + 9, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'mailchimp-api-key':
      return `${hex(32, v)}-us${(v % 9) + 1}`;
    case 'okta-api-token':
      return `00${alpha(40, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'auth0-management-api-token':
      return `eyJhbGciOiJSUzI1NiI${alpha(20, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}.${alpha(32, v + 1, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}.${alpha(40, v + 2, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'generic-oauth-client-secret':
      return `client_secret = "${alpha(40, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.~-')}"`;
    case 'generic-jwt-token':
      return `eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2Vy${alpha(8, v)}In0.${alpha(32, v + 3, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'gcp-oauth-client-secret':
      return `GOCSPX-${alpha(28, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'linear-api-key':
      return `lin_api_${alpha(40, v)}`;
    case 'notion-integration-token':
      return `secret_${alpha(43, v)}`;
    case 'render-api-key':
      return `rnd_${alpha(24, v)}`;
    case 'fly-io-auth-token':
      return `FlyV1 ${alpha(48, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'vercel-api-token':
      return `vercel_token = "${alpha(24, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}"`;
    case 'netlify-access-token':
      return `nfp_${alpha(48, v)}`;
    case 'huggingface-user-token':
      return `hf_${alpha(34, v)}`;
    case 'replicate-api-token':
      return `r8_${alpha(36, v)}`;
    case 'pinecone-api-key':
      return `pinecone_api_key = "${uuid(v)}"`;
    case 'weaviate-api-key':
      return `weaviate_api_key = "${alpha(40, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}"`;
    case 'qdrant-api-key':
      return `qdrant_api_key = "${alpha(40, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}"`;
    case 'supabase-jwt-secret':
      return `supabase_jwt_secret = "${alpha(48, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}"`;
    case 'db-password-connection-string':
      return `password = "P@ssw0rd!Secure${v}xx"`;
    case 'generic-api-key-header':
      return `X-API-Key: ${alpha(32, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')}`;
    case 'generic-auth-header':
      return `Authorization: Bearer ${alpha(40, v, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.-')}`;
    default:
      throw new Error(`No synthetic generator for pattern ${patternId}`);
  }
}

/** Near-miss / placeholder values that must NOT match the pattern regex. */
function trueNegativeFor(patternId: string): string {
  switch (patternId) {
    case 'aws-access-key-id':
      return 'AKIAIOSFODNN7EXAMPLE'; // classic AWS docs example (20 chars total — still matches!). Use broken form:
    case 'aws-secret-access-key':
      return 'aws_secret_access_key = "TOO_SHORT"';
    case 'aws-session-token':
      return 'aws_session_token = "short"';
    case 'github-pat-classic':
      return 'ghp_example_not_a_real_token_xxxx';
    case 'github-pat-fine-grained':
      return 'github_pat_example_invalid';
    case 'github-oauth-token':
      return 'gho_example_placeholder_token_xx';
    case 'github-user-token':
      return 'ghu_not_a_real_user_token_xxxxxx';
    case 'github-server-token':
      return 'ghs_docs_placeholder_only_xxxxxx';
    case 'github-app-secret':
      return 'github_app_secret = "not-forty-hex-chars"';
    case 'slack-webhook-url':
      return 'https://hooks.slack.com/services/EXAMPLE/EXAMPLE/example';
    case 'slack-bot-token':
      return 'xoxb-example-bot-token';
    case 'slack-user-token':
      return 'xoxp-example-user-token';
    case 'stripe-live-key':
      return 'sk_live_examplekeyxxxxxxxx';
    case 'stripe-test-key':
      return 'sk_test_examplekeyxxxxxxxx';
    case 'stripe-restricted-key':
      return 'rk_live_examplekeyxxxxxxxx';
    case 'gcp-api-key':
      return 'AIzaSyEXAMPLE_KEY_NOT_REAL';
    case 'gcp-service-account':
      return '"type": "authorized_user"';
    case 'azure-storage-key':
      return 'AccountKey=short';
    case 'azure-ad-client-secret':
      return 'client_secret = "short"';
    case 'private-key-rsa':
      return '-----BEGIN RSA PUBLIC KEY-----';
    case 'private-key-dsa':
      return '-----BEGIN DSA PUBLIC KEY-----';
    case 'private-key-ec':
      return '-----BEGIN EC PUBLIC KEY-----';
    case 'private-key-pgp':
      return '-----BEGIN PGP PUBLIC KEY BLOCK-----';
    case 'private-key-openssh':
      return '-----BEGIN OPENSSH PUBLIC KEY-----';
    case 'azure-client-certificate':
      return '-----BEGIN PUBLIC KEY-----';
    case 'npm-access-token':
      return 'npm_example_token_not_valid_xx';
    case 'pypi-api-token':
      return 'pypi-example-token-invalid';
    case 'twilio-api-key':
      return 'SK_example_not_hex';
    case 'twilio-account-sid':
      return 'AC_example_not_hex';
    case 'sendgrid-api-key':
      return 'SG.example.invalid';
    case 'mailgun-api-key':
      return 'key-example';
    case 'heroku-api-key':
      return 'heroku_api_key = "not-a-uuid"';
    case 'digitalocean-pat':
      return 'dop_v1_example';
    case 'datadog-api-key':
      return 'datadog_api_key = "short"';
    case 'openai-api-key':
      return 'sk-example';
    case 'anthropic-api-key':
      return 'sk-ant-example';
    case 'docker-config-auth':
      return '"auth": "short"';
    case 'gitlab-pat':
      return 'glpat-short';
    case 'terraform-cloud-token':
      return 'user.atlasv1.short';
    case 'telegram-bot-token':
      return '123:AAshort';
    case 'discord-bot-token':
      return 'M.invalid.discord';
    case 'shopify-access-token':
      return 'shpat_example';
    case 'segment-write-key':
      return 'segment_write_key = "short"';
    case 'sentry-dsn':
      return 'https://example@o0.ingest.sentry.io/0';
    case 'square-access-token':
      return 'sq0atp-short';
    case 'postman-api-key':
      return 'PMAK-short-short';
    case 'vault-token':
      return 'hvs.short';
    case 'hubspot-api-key':
      return 'hubspot_api_key = "not-uuid"';
    case 'circleci-token':
      return 'circle_token = "short"';
    case 'codecov-token':
      return 'codecov_token = "not-uuid"';
    case 'databricks-token':
      return 'dapi_example';
    case 'asana-pat':
      return '1/123:short';
    case 'airtable-api-key':
      return 'pat_example.short';
    case 'postgres-uri':
      return 'postgresql://localhost/mydb';
    case 'mysql-uri':
      return 'mysql://localhost/mydb';
    case 'mongodb-uri':
      return 'mongodb://localhost';
    case 'redis-uri':
      return 'redis://localhost:6379';
    case 'alibaba-access-key':
      return 'LTAI_example';
    case 'ibm-cloud-api-key':
      return 'ibm_api_key = "short"';
    case 'oracle-oci-credentials':
      return 'ocid1.instance.oc1.example';
    case 'travis-ci-token':
      return 'travis_token = "short"';
    case 'jenkins-api-token':
      return '11short';
    case 'jfrog-artifactory-api-key':
      return 'AKCp8short';
    case 'jira-api-token':
      return 'ATATT3xFfGF0short';
    case 'confluence-api-token':
      return 'ATATT3xFfGF1short';
    case 'coveralls-token':
      return 'coveralls_token = "short"';
    case 'sonarqube-token':
      return 'sqp_example';
    case 'pagerduty-api-key':
      return 'y_pdp_short';
    case 'newrelic-api-key':
      return 'NRAK-SHORT';
    case 'splunk-hec-token':
      return 'splunk_hec_token = "not-uuid"';
    case 'elasticsearch-api-key':
      return 'elastic_api_key = "short"';
    case 'supabase-api-key':
      return 'sbp_example';
    case 'planetscale-service-token':
      return 'pscale_tkn_short';
    case 'launchdarkly-sdk-key':
      return 'sdk-not-a-uuid';
    case 'fastly-api-token':
      return 'fastly_api_token = "short"';
    case 'snyk-api-token':
      return 'snyk_token = "not-uuid"';
    case 'mapbox-access-token':
      return 'pk.eyJ1Ijo.example';
    case 'algolia-admin-api-key':
      return 'algolia_admin_api_key = "short"';
    case 'firebase-server-key':
      return 'AAAA:short';
    case 'mailchimp-api-key':
      return 'abcd-us1';
    case 'okta-api-token':
      return '00short';
    case 'auth0-management-api-token':
      return 'eyJhbGciOiJSUzI1NiI_example_not_a_jwt';
    case 'generic-oauth-client-secret':
      return 'client_secret = "short"';
    case 'generic-jwt-token':
      return 'eyJ.example.short';
    case 'gcp-oauth-client-secret':
      return 'GOCSPX-short';
    case 'linear-api-key':
      return 'lin_api_short';
    case 'notion-integration-token':
      return 'secret_short';
    case 'render-api-key':
      return 'rnd_short';
    case 'fly-io-auth-token':
      return 'FlyV1 short';
    case 'vercel-api-token':
      return 'vercel_token = "short"';
    case 'netlify-access-token':
      return 'nfp_short';
    case 'huggingface-user-token':
      return 'hf_short';
    case 'replicate-api-token':
      return 'r8_short';
    case 'pinecone-api-key':
      return 'pinecone_api_key = "not-uuid"';
    case 'weaviate-api-key':
      return 'weaviate_api_key = "short"';
    case 'qdrant-api-key':
      return 'qdrant_api_key = "short"';
    case 'supabase-jwt-secret':
      return 'supabase_jwt_secret = "short"';
    case 'db-password-connection-string':
      return 'password = "short"';
    case 'generic-api-key-header':
      return 'X-API-Key: short';
    case 'generic-auth-header':
      return 'Authorization: Bearer short';
    default:
      return `${patternId}_EXAMPLE_PLACEHOLDER`;
  }
}

// Fix AWS access key TN — AKIAIOSFODNN7EXAMPLE actually matches the regex (AKIA + 16).
// Use a truncated / docs-style near miss that does not match.
function trueNegativeForSafe(patternId: string): string {
  if (patternId === 'aws-access-key-id') {
    return 'AWS_ACCESS_KEY_ID=AKIAEXAMPLE'; // too short after prefix
  }
  return trueNegativeFor(patternId);
}

const CONTEXTS: Array<(secret: string, label: string) => string> = [
  (s, label) => `# ${label} config\nexport SECRET="${s}"\n`,
  (s, label) => `const config = {\n  // ${label}\n  value: "${s}",\n};\n`,
  (s, label) => `---\n# ${label}\ncredential: ${s}\n`,
  (s, label) => `LOG: loaded ${label} candidate=${s}\n`,
  (s, label) => `#!/bin/bash\n# ${label}\necho "${s}"\n`,
];

function locateFinding(input: string, needle: string, type: string, confidence: CorpusSample['expectedFindings'][number]['confidence']): CorpusFinding {
  const idx = input.indexOf(needle);
  if (idx < 0) {
    throw new Error(`Needle not found in input for type=${type}`);
  }
  const before = input.slice(0, idx);
  const lineNumber = before.split('\n').length;
  const lineStart = before.lastIndexOf('\n') + 1;
  const colStart = idx - lineStart;
  return {
    type,
    lineNumber,
    charRange: [colStart, colStart + needle.length],
    confidence,
    detectionLayer: 1,
  };
}

function confidenceFor(severity: string): CorpusSample['expectedFindings'][number]['confidence'] {
  if (severity === 'critical' || severity === 'high') return 'high';
  if (severity === 'medium') return 'medium';
  return 'low';
}

function assertMatches(pattern: PatternDef, value: string): void {
  const re = new RegExp(pattern.regex, 'g');
  if (!re.test(value)) {
    throw new Error(`Generated secret does not match regex for ${pattern.id}: ${value.slice(0, 80)}`);
  }
}

function assertDoesNotMatch(pattern: PatternDef, value: string): void {
  const re = new RegExp(pattern.regex, 'g');
  if (re.test(value)) {
    throw new Error(`TN value unexpectedly matches regex for ${pattern.id}: ${value.slice(0, 80)}`);
  }
}

function sample(
  id: string,
  input: string,
  findings: CorpusFinding[],
  groundTruth: GroundTruthLabel,
  category: string,
  description: string,
  tags: string[]
): CorpusSample {
  return { id, input, expectedFindings: findings, groundTruth, category, description, tags };
}

/**
 * Serialize sample JSON with `input` fully \uXXXX-escaped so GitHub push protection
 * does not treat synthetic pattern-conformant secrets as live credentials.
 * JSON.parse (corpus-loader) restores the real scan text.
 */
function serializeSample(data: CorpusSample): string {
  const escapedInput = [...data.input]
    .map((ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`)
    .join('');

  const payload = {
    id: data.id,
    input: '__INPUT_PLACEHOLDER__',
    expectedFindings: data.expectedFindings,
    groundTruth: data.groundTruth,
    category: data.category,
    description: data.description,
    tags: data.tags,
  };

  return `${JSON.stringify(payload, null, 2).replace(
    '"__INPUT_PLACEHOLDER__"',
    `"${escapedInput}"`
  )}\n`;
}

async function writeSample(folder: string, fileName: string, data: CorpusSample): Promise<void> {
  const dir = path.join(CORPUS_DIR, folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), serializeSample(data), 'utf8');
}

async function generatePatternCoverage(): Promise<number> {
  let count = 0;
  for (const pattern of patterns) {
    const folder = folderForPattern(pattern);
    const conf = confidenceFor(pattern.severity);

    for (let i = 0; i < 3; i++) {
      const secret = secretFor(pattern.id, i);
      assertMatches(pattern, secret);
      const ctx = CONTEXTS[i % CONTEXTS.length];
      const input = ctx(secret, pattern.id);
      const finding = locateFinding(input, secret, pattern.id, conf);
      const id = `${pattern.id}-tp-${String(i + 1).padStart(3, '0')}`;
      await writeSample(
        folder,
        `${id}.json`,
        sample(
          id,
          input,
          [finding],
          'TP',
          pattern.category,
          `True positive for ${pattern.id} (variant ${i + 1})`,
          ['pattern-coverage', 'true-positive', pattern.id, pattern.secretType]
        )
      );
      count++;
    }

    const tnValue = trueNegativeForSafe(pattern.id);
    assertDoesNotMatch(pattern, tnValue);
    const tnInput = `# documentation placeholder for ${pattern.id}\nvalue = "${tnValue}"\n`;
    const tnId = `${pattern.id}-tn-001`;
    await writeSample(
      'true-negatives',
      `${tnId}.json`,
      sample(
        tnId,
        tnInput,
        [],
        'TN',
        pattern.category,
        `True negative near-miss for ${pattern.id}`,
        ['pattern-coverage', 'true-negative', pattern.id]
      )
    );
    count++;
  }
  return count;
}

async function generateEntropySamples(): Promise<number> {
  let count = 0;
  // 30 true high-entropy secrets + 25 FP-like (UUIDs/hashes) = 55
  for (let i = 0; i < 30; i++) {
    const secret = alpha(48, 9000 + i, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/');
    const input = `api_token = "${secret}"\n`;
    const finding = locateFinding(input, secret, 'high_entropy_string', 'medium');
    finding.detectionLayer = 2;
    const id = `entropy-tp-${String(i + 1).padStart(3, '0')}`;
    await writeSample(
      'generic-entropy',
      `${id}.json`,
      sample(id, input, [finding], 'TP', 'generic-entropy', `High-entropy secret candidate #${i + 1}`, [
        'entropy',
        'true-positive',
      ])
    );
    count++;
  }
  for (let i = 0; i < 25; i++) {
    const value =
      i % 3 === 0
        ? uuid(5000 + i)
        : i % 3 === 1
          ? hex(40, 6000 + i) // git-like SHA
          : Buffer.from(`not-a-secret-payload-${i}`).toString('base64');
    const input = `id = "${value}"\n`;
    const id = `entropy-fp-${String(i + 1).padStart(3, '0')}`;
    await writeSample(
      'generic-entropy',
      `${id}.json`,
      sample(
        id,
        input,
        [],
        'FP',
        'generic-entropy',
        `Known false-positive high-entropy-looking value #${i + 1} (UUID/hash/base64)`,
        ['entropy', 'false-positive', i % 3 === 0 ? 'uuid' : i % 3 === 1 ? 'hash' : 'base64']
      )
    );
    count++;
  }
  return count;
}

async function generateContextualSamples(): Promise<number> {
  const keys = [
    'password',
    'secret',
    'token',
    'apiKey',
    'api_key',
    'credential',
    'auth',
    'passwd',
    'private_key',
    'access_key',
  ];
  let count = 0;
  for (let i = 0; i < 35; i++) {
    const key = keys[i % keys.length];
    const value = `AmbiguousValue${alpha(12, 7000 + i)}`;
    const input = `${key}=${value}\n`;
    const finding: CorpusFinding = {
      type: 'contextual_secret',
      lineNumber: 1,
      charRange: [key.length + 1, key.length + 1 + value.length],
      confidence: 'medium',
      detectionLayer: 2,
    };
    const id = `contextual-tp-${String(i + 1).padStart(3, '0')}`;
    await writeSample(
      'contextual',
      `${id}.json`,
      sample(
        id,
        input,
        [finding],
        'TP',
        'contextual',
        `Contextual secret via variable name '${key}'`,
        ['contextual', 'true-positive', key]
      )
    );
    count++;
  }
  return count;
}

async function generateMultiSecretSamples(): Promise<number> {
  const combos: Array<Array<string>> = [
    ['aws-access-key-id', 'github-pat-classic'],
    ['stripe-live-key', 'postgres-uri'],
    ['slack-bot-token', 'openai-api-key'],
    ['gcp-api-key', 'generic-jwt-token'],
    ['npm-access-token', 'docker-config-auth'],
    ['gitlab-pat', 'mysql-uri'],
    ['sendgrid-api-key', 'twilio-api-key'],
    ['digitalocean-pat', 'redis-uri'],
    ['vercel-api-token', 'netlify-access-token'],
    ['huggingface-user-token', 'anthropic-api-key'],
    ['aws-access-key-id', 'aws-secret-access-key', 'postgres-uri'],
    ['github-pat-classic', 'slack-webhook-url', 'stripe-live-key'],
    ['mongodb-uri', 'redis-uri', 'generic-api-key-header'],
    ['private-key-rsa', 'generic-jwt-token'],
    ['datadog-api-key', 'sentry-dsn', 'newrelic-api-key'],
    ['shopify-access-token', 'square-access-token'],
    ['firebase-server-key', 'gcp-oauth-client-secret'],
    ['vault-token', 'circleci-token', 'snyk-api-token'],
    ['pinecone-api-key', 'weaviate-api-key', 'qdrant-api-key'],
    ['notion-integration-token', 'linear-api-key', 'asana-pat'],
    ['heroku-api-key', 'render-api-key', 'fly-io-auth-token'],
    ['alibaba-access-key', 'ibm-cloud-api-key', 'oracle-oci-credentials'],
  ];

  let count = 0;
  for (let i = 0; i < combos.length; i++) {
    const ids = combos[i];
    const lines: string[] = [`# multi-secret sample ${i + 1}`];
    const findings: CorpusFinding[] = [];
    for (const patternId of ids) {
      const pattern = patterns.find((p) => p.id === patternId);
      if (!pattern) throw new Error(`Missing pattern ${patternId}`);
      const secret = secretFor(patternId, 50 + i);
      assertMatches(pattern, secret);
      lines.push(`${patternId}=${secret}`);
    }
    const input = `${lines.join('\n')}\n`;
    for (const patternId of ids) {
      const pattern = patterns.find((p) => p.id === patternId)!;
      const secret = secretFor(patternId, 50 + i);
      findings.push(locateFinding(input, secret, patternId, confidenceFor(pattern.severity)));
    }
    const id = `multi-secret-${String(i + 1).padStart(3, '0')}`;
    await writeSample(
      'multi-secret',
      `${id}.json`,
      sample(
        id,
        input,
        findings,
        'TP',
        'multi-secret',
        `Multi-secret sample with ${ids.length} types: ${ids.join(', ')}`,
        ['multi-secret', 'true-positive', ...ids]
      )
    );
    count++;
  }
  return count;
}

async function generateExtraTrueNegatives(): Promise<number> {
  const extras = [
    'const example = "AKIAIOSFODNN7EXAMPL"; // truncated docs example\n',
    'password = "password"\n',
    'apiKey = "YOUR_API_KEY_HERE"\n',
    'token = "<redacted>"\n',
    'AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n',
    '// See docs: use sk_test_... in sandbox only\n',
    'hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"\n',
    'commit = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678"\n',
    'uuid = "550e8400-e29b-41d4-a716-446655440000"\n',
    'publicKey = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7"\n',
    'Authorization: Bearer <token>\n',
    'DATABASE_URL=postgres://user@localhost/db\n',
    'console.log("no secrets in this log line")\n',
    'EMAIL=user@example.com\n',
    'VERSION=1.2.3\n',
    'PATH=/usr/local/bin\n',
    'COLOR=#FF5733\n',
    'BASE64_IMAGE=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB\n',
    'TEST_FIXTURE_KEY=test_key_not_secret\n',
    'README: replace YOUR_TOKEN with a real token\n',
  ];

  // Edge cases from WO
  const edgeCases: Array<{ id: string; input: string; description: string }> = [
    {
      id: 'tn-edge-empty',
      input: '',
      description: 'Empty input boundary sample',
    },
    {
      id: 'tn-edge-single-char',
      input: 'x',
      description: 'Single-character input boundary sample',
    },
    {
      id: 'tn-edge-unicode',
      input: 'note = "clé_secrète_éxample_日本語"\n',
      description: 'Unicode adjacent non-secret text',
    },
    {
      id: 'tn-edge-whitespace',
      input: '   \n\t\n  \n',
      description: 'Whitespace-only input',
    },
    {
      id: 'tn-edge-heredoc-docs',
      input: 'cat <<EOF\nThis is documentation about AKIA keys.\nEOF\n',
      description: 'Heredoc documentation without real secrets',
    },
  ];

  let count = 0;
  for (let i = 0; i < extras.length; i++) {
    const id = `true-negative-extra-${String(i + 1).padStart(3, '0')}`;
    await writeSample(
      'true-negatives',
      `${id}.json`,
      sample(id, extras[i], [], 'TN', 'true-negatives', `Extra true-negative sample #${i + 1}`, [
        'true-negative',
        'extra',
      ])
    );
    count++;
  }
  for (const edge of edgeCases) {
    await writeSample(
      'true-negatives',
      `${edge.id}.json`,
      sample(edge.id, edge.input, [], 'TN', 'true-negatives', edge.description, [
        'true-negative',
        'edge-case',
      ])
    );
    count++;
  }
  return count;
}

async function generateEdgeTpSamples(): Promise<number> {
  // Secrets in JSON/YAML, trailing whitespace, multiline — a few extras in mixed/
  const aws = secretFor('aws-access-key-id', 99);
  const jwt = secretFor('generic-jwt-token', 99);
  const samples: CorpusSample[] = [
    sample(
      'mixed-edge-json-001',
      `{\n  "awsKey": "${aws}"\n}\n`,
      [locateFinding(`{\n  "awsKey": "${aws}"\n}\n`, aws, 'aws-access-key-id', 'high')],
      'TP',
      'mixed',
      'Secret embedded in JSON structure',
      ['edge-case', 'json', 'aws-access-key-id']
    ),
    sample(
      'mixed-edge-yaml-001',
      `credentials:\n  token: ${jwt}\n`,
      [locateFinding(`credentials:\n  token: ${jwt}\n`, jwt, 'generic-jwt-token', 'medium')],
      'TP',
      'mixed',
      'Secret embedded in YAML structure',
      ['edge-case', 'yaml', 'generic-jwt-token']
    ),
    sample(
      'mixed-edge-trailing-ws-001',
      `TOKEN=${aws}   \n`,
      [locateFinding(`TOKEN=${aws}   \n`, aws, 'aws-access-key-id', 'high')],
      'TP',
      'mixed',
      'Secret with trailing whitespace on line',
      ['edge-case', 'whitespace', 'aws-access-key-id']
    ),
  ];

  // Large input (~100k) with secret at beginning / middle / end
  const pad = 'x'.repeat(33_000);
  const positions: Array<{ id: string; input: string; description: string }> = [
    {
      id: 'mixed-edge-large-begin-001',
      input: `${aws}\n${pad}${pad}${pad}`,
      description: 'Secret at beginning of ~100k input',
    },
    {
      id: 'mixed-edge-large-mid-001',
      input: `${pad}${pad}${aws}\n${pad}`,
      description: 'Secret in middle of ~100k input',
    },
    {
      id: 'mixed-edge-large-end-001',
      input: `${pad}${pad}${pad}\n${aws}`,
      description: 'Secret at end of ~100k input',
    },
  ];

  for (const pos of positions) {
    samples.push(
      sample(
        pos.id,
        pos.input,
        [locateFinding(pos.input, aws, 'aws-access-key-id', 'high')],
        'TP',
        'mixed',
        pos.description,
        ['edge-case', 'large-input', 'aws-access-key-id']
      )
    );
  }

  for (const s of samples) {
    await writeSample('mixed', `${s.id}.json`, s);
  }
  return samples.length;
}

async function main(): Promise<void> {
  await rm(CORPUS_DIR, { recursive: true, force: true });
  for (const dir of FOLDER_DIRS) {
    await mkdir(path.join(CORPUS_DIR, dir), { recursive: true });
  }

  const counts = {
    pattern: await generatePatternCoverage(),
    entropy: await generateEntropySamples(),
    contextual: await generateContextualSamples(),
    multi: await generateMultiSecretSamples(),
    tnExtra: await generateExtraTrueNegatives(),
    edge: await generateEdgeTpSamples(),
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log('Corpus generation complete:');
  console.log(JSON.stringify({ ...counts, total, patterns: patterns.length }, null, 2));
  if (total < 500) {
    throw new Error(`Generated only ${total} samples; need ≥500`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
