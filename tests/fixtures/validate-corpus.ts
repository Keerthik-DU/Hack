/**
 * Corpus integrity validator for WO-057.
 * Run: npx tsx tests/fixtures/validate-corpus.ts
 *
 * Exits non-zero when schema/coverage requirements fail.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import patternsData from '../../src/patterns/v1/patterns.json';
import { loadCorpus, CORPUS_DIR } from './corpus-loader';

interface PatternDef {
  id: string;
}

const patterns = patternsData as PatternDef[];
const ROOT = path.dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  console.log(`Validating corpus at ${CORPUS_DIR}`);
  const { samples, errors } = await loadCorpus(CORPUS_DIR);

  const stats = {
    totalSamples: samples.length,
    byCategory: {} as Record<string, number>,
    byGroundTruth: {} as Record<string, number>,
    entropySamples: 0,
    contextualSamples: 0,
    multiSecretSamples: 0,
    trueNegativeSamples: 0,
  };

  for (const sample of samples) {
    stats.byCategory[sample.category] = (stats.byCategory[sample.category] ?? 0) + 1;
    stats.byGroundTruth[sample.groundTruth] = (stats.byGroundTruth[sample.groundTruth] ?? 0) + 1;

    if (sample.tags.includes('entropy') || sample.category === 'generic-entropy') {
      stats.entropySamples++;
    }
    if (sample.tags.includes('contextual') || sample.category === 'contextual') {
      stats.contextualSamples++;
    }
    if (sample.tags.includes('multi-secret') || sample.category === 'multi-secret') {
      stats.multiSecretSamples++;
    }
    if (sample.groundTruth === 'TN') {
      stats.trueNegativeSamples++;
    }
  }

  // Pattern coverage: ≥3 TP and ≥1 TN per pattern id
  const coverageGaps: string[] = [];
  for (const pattern of patterns) {
    const tp = samples.filter(
      (s) =>
        s.groundTruth === 'TP' &&
        s.expectedFindings.some((f) => f.type === pattern.id) &&
        s.tags.includes('pattern-coverage')
    ).length;
    const tn = samples.filter(
      (s) =>
        s.groundTruth === 'TN' &&
        (s.id.startsWith(`${pattern.id}-tn-`) || s.tags.includes(pattern.id))
    ).length;

    if (tp < 3 || tn < 1) {
      coverageGaps.push(`${pattern.id}: TP=${tp} (need ≥3), TN=${tn} (need ≥1)`);
    }
  }

  const requirementErrors: string[] = [];
  if (samples.length < 500) {
    requirementErrors.push(`Total samples ${samples.length} < 500`);
  }
  if (stats.entropySamples < 50) {
    requirementErrors.push(`Entropy samples ${stats.entropySamples} < 50`);
  }
  if (stats.contextualSamples < 30) {
    requirementErrors.push(`Contextual samples ${stats.contextualSamples} < 30`);
  }
  if (stats.multiSecretSamples < 20) {
    requirementErrors.push(`Multi-secret samples ${stats.multiSecretSamples} < 20`);
  }
  if (coverageGaps.length > 0) {
    requirementErrors.push(`Pattern coverage gaps: ${coverageGaps.length}`);
  }

  console.log('\n=== Corpus Statistics ===');
  console.log(JSON.stringify(stats, null, 2));
  console.log(`\nPattern types in registry: ${patterns.length}`);
  console.log(`Coverage gaps: ${coverageGaps.length}`);

  if (errors.length > 0) {
    console.error('\n=== Schema Errors ===');
    for (const err of errors.slice(0, 50)) {
      console.error(` - ${err}`);
    }
    if (errors.length > 50) {
      console.error(` ... and ${errors.length - 50} more`);
    }
  }

  if (coverageGaps.length > 0) {
    console.error('\n=== Coverage Gaps ===');
    for (const gap of coverageGaps.slice(0, 30)) {
      console.error(` - ${gap}`);
    }
    if (coverageGaps.length > 30) {
      console.error(` ... and ${coverageGaps.length - 30} more`);
    }
  }

  if (requirementErrors.length > 0) {
    console.error('\n=== Requirement Failures ===');
    for (const err of requirementErrors) {
      console.error(` - ${err}`);
    }
  }

  const failed = errors.length > 0 || requirementErrors.length > 0;
  if (failed) {
    console.error(`\nValidation FAILED (schemaErrors=${errors.length}, requirementErrors=${requirementErrors.length})`);
    process.exit(1);
  }

  console.log(`\nValidation PASSED — ${samples.length} samples, 100% pattern coverage (${patterns.length} types).`);
  console.log(`Fixtures root: ${ROOT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
