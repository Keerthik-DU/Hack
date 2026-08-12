import type { MetricsReport } from './types';

export interface FalseNegativeGateResult {
  pass: boolean;
  falseNegatives: number;
  maxAllowed: number;
  message: string;
}

/** Hard CI gate: zero false negatives when FORCE_FN_GATE=true. */
export function evaluateFalseNegativeGate(
  report: MetricsReport,
  maxAllowed = 0
): FalseNegativeGateResult {
  const fn = report.fn ?? 0;
  const pass = fn <= maxAllowed;
  return {
    pass,
    falseNegatives: fn,
    maxAllowed,
    message: pass
      ? `FN gate passed (${fn} <= ${maxAllowed})`
      : `FN gate failed: ${fn} false negatives (max ${maxAllowed})`,
  };
}
