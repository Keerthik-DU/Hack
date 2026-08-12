import type {
  RegressionBaseline,
  RegressionReport,
  SampleDetectionResult,
} from './types';

export class RegressionChecker {
  checkForRegressions(
    baseline: RegressionBaseline,
    results: readonly SampleDetectionResult[],
    absoluteFnCount = 0,
    absolutePositiveCount = 0
  ): RegressionReport {
    if (!baseline.samples.length) {
      throw new Error('Empty regression baseline — run update-baseline.ts first');
    }
    const byId = new Map(results.map((r) => [r.sampleId, r]));
    const regressions = [];
    const warnings: string[] = [];
    let totalChecked = 0;

    for (const sample of baseline.samples) {
      if (!sample.expectedDetected) continue;
      totalChecked++;
      const current = byId.get(sample.sampleId);
      if (!current) {
        warnings.push(`Baseline sample missing from results: ${sample.sampleId}`);
        regressions.push({
          sampleId: sample.sampleId,
          category: sample.category,
          expectedFindingCount: sample.findingCount,
          actualFindingCount: 0,
          description: `Sample ${sample.sampleId} (${sample.category}) was previously detected but is missing from current results`,
        });
        continue;
      }
      if (!current.detected || current.findingCount < 1) {
        regressions.push({
          sampleId: sample.sampleId,
          category: sample.category,
          expectedFindingCount: sample.findingCount,
          actualFindingCount: current.findingCount,
          description: `Sample ${sample.sampleId} (${sample.category}) regressed: expected detected=${sample.findingCount}, actual=${current.findingCount}`,
        });
      }
    }

    const absoluteFnr =
      absolutePositiveCount > 0 ? absoluteFnCount / absolutePositiveCount : 0;

    return {
      regressions,
      totalChecked,
      totalRegressed: regressions.length,
      absoluteFnr,
      warnings,
    };
  }
}
