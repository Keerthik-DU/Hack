import type { MetricsReport, SampleResult } from './types';

function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  const inter = Math.max(0, end - start);
  const union = Math.max(aEnd, bEnd) - Math.min(aStart, bStart);
  return union <= 0 ? 0 : inter / union;
}

export class MetricsRunner {
  constructor(private readonly overlapThreshold = 0.8) {}

  computeMetrics(
    results: readonly SampleResult[],
    thresholds = { recall: 0.95, precision: 0.85 }
  ): MetricsReport {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    const perCategory: MetricsReport['perCategory'] = {};

    for (const sample of results) {
      const cat = sample.category ?? 'all';
      perCategory[cat] ??= { tp: 0, fp: 0, fn: 0, precision: 0, recall: 0 };
      const matchedExpected = new Set<number>();

      sample.actualFindings.forEach((actual) => {
        let found = false;
        sample.expectedFindings.forEach((exp, ei) => {
          if (matchedExpected.has(ei)) return;
          if (
            actual.secretType === exp.secretType &&
            overlap(actual.startColumn, actual.endColumn, exp.start, exp.end) >= this.overlapThreshold
          ) {
            matchedExpected.add(ei);
            found = true;
          }
        });
        if (found) {
          tp += 1;
          perCategory[cat].tp += 1;
        } else {
          fp += 1;
          perCategory[cat].fp += 1;
        }
      });

      sample.expectedFindings.forEach((_e, ei) => {
        if (!matchedExpected.has(ei)) {
          fn += 1;
          perCategory[cat].fn += 1;
        }
      });

      if (sample.expectedFindings.length === 0 && sample.actualFindings.length === 0) tn += 1;
    }

    for (const cat of Object.keys(perCategory)) {
      const c = perCategory[cat];
      c.precision = c.tp + c.fp === 0 ? 1 : c.tp / (c.tp + c.fp);
      c.recall = c.tp + c.fn === 0 ? 1 : c.tp / (c.tp + c.fn);
    }

    const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    const fpr = fp + tn === 0 ? 0 : fp / (fp + tn);
    const fnr = fn + tp === 0 ? 0 : fn / (fn + tp);

    return {
      tp, fp, fn, tn, precision, recall, f1, fpr, fnr,
      totalSamples: results.length,
      timestamp: new Date().toISOString(),
      commitSha: process.env.COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'local',
      thresholds,
      passed: recall >= thresholds.recall && precision >= thresholds.precision,
      perCategory,
    };
  }
}
