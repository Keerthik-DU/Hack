/**
 * Explicit baseline updater for WO-059.
 * Usage: npx tsx tests/regression/update-baseline.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadCorpusOrThrow } from '../fixtures/corpus-loader';
import { RegexEngine } from '../../src/engines/RegexEngine';
import { EntropyAnalyzer } from '../../src/engines/EntropyAnalyzer';
import type { RegressionBaseline } from './types';

async function main() {
  const samples = await loadCorpusOrThrow();
  const regex = new RegexEngine();
  const entropy = new EntropyAnalyzer();
  const commit = process.env.GITHUB_SHA ?? process.env.COMMIT_SHA ?? 'local';
  const out: RegressionBaseline = {
    version: 1,
    generatedAt: new Date().toISOString(),
    samples: [],
  };

  const entries = [];
  for (const sample of samples) {
    const id = String((sample as { id?: string }).id ?? '');
    if (!id) continue;
    const text = String(
      (sample as { input?: string }).input ?? (sample as { text?: string }).text ?? ''
    );
    const findings = [
      ...(await regex.analyze({ text, lines: text.split('\n') })),
      ...(await entropy.analyze({ text, lines: text.split('\n') })),
    ];
    entries.push({
      sampleId: id,
      category: String((sample as { category?: string }).category ?? 'all'),
      expectedDetected: findings.length > 0,
      findingCount: findings.length,
      lastVerifiedCommit: commit,
    });
  }
  (out as { samples: typeof entries }).samples = entries;

  const outPath = path.join(process.cwd(), 'tests/regression/regression-baseline.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  const detected = entries.filter((e) => e.expectedDetected).length;
  console.log(`Wrote ${entries.length} samples (${detected} detected) to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
