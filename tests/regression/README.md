# False-Negative Regression Gate (WO-059)

## Interpreting failures
When `false-negatives.test.ts` fails, each line lists `sampleId`, category, expected vs actual finding counts. That sample was detected when the baseline was generated and is now missed.

## Updating the baseline
Only after intentional detection changes:

```bash
npx tsx tests/regression/update-baseline.ts
```

Review the diff of `regression-baseline.json` in the PR. Do not regenerate automatically in CI.

## Soft vs hard FNR gate
Absolute FNR ≤ 2% is enforced when `FORCE_FN_GATE=true`. Soft runs still fail on per-sample regressions.
