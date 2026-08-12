import fs from 'node:fs';
import path from 'node:path';
import type { MetricsReport } from './types';

export class MetricsReporter {
  formatConsoleTable(report: MetricsReport): string {
    const pct = (n: number) => (n * 100).toFixed(2) + '%';
    return [
      '=== Precision/Recall Metrics ===',
      'Samples: ' + report.totalSamples,
      'TP=' + report.tp + ' FP=' + report.fp + ' FN=' + report.fn + ' TN=' + report.tn,
      'Precision=' + pct(report.precision) + ' Recall=' + pct(report.recall) + ' F1=' + report.f1.toFixed(3),
      'Pass=' + report.passed,
    ].join('\n');
  }

  writeJsonReport(report: MetricsReport, outPath = 'tests/metrics/output/metrics-report.json'): void {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  }
}
