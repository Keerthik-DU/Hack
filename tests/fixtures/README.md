# Labeled Secret Detection Corpus (WO-057)

Machine-readable fixture dataset used to measure detection recall/precision for AirGap Scanner.

## Layout

```
tests/fixtures/
  corpus-schema.ts      # CorpusSample TypeScript schema + runtime validator
  corpus-loader.ts      # Recursive JSON loader for Vitest / scripts
  validate-corpus.ts    # Coverage + schema gate (CI-friendly)
  generate-corpus.ts    # Deterministic regenerator (synthetic secrets only)
  corpus/
    aws/ github/ stripe/ google/ ssh/ jwt/ slack/ database/
    generic-entropy/ contextual/ multi-secret/ true-negatives/ mixed/
```

## Sample schema

Each `*.json` file conforms to `CorpusSample`:

| Field | Description |
| --- | --- |
| `id` | Stable unique id (`pattern-id-tp-001`, `entropy-fp-003`, …) |
| `input` | Source text to scan |
| `expectedFindings[]` | `type`, `lineNumber`, `charRange`, `confidence`, `detectionLayer` |
| `groundTruth` | `TP` \| `FP` \| `TN` \| `FN` |
| `category` | PatternRegistry category or specialized bucket |
| `description` | Human-readable intent |
| `tags` | Filterable labels (`pattern-coverage`, `entropy`, …) |

## Naming convention

- Pattern true positives: `{pattern-id}-tp-{nnn}.json`
- Pattern true negatives: `{pattern-id}-tn-{nnn}.json`
- Specialized buckets: `{bucket}-{label}-{nnn}.json` (e.g. `entropy-fp-001.json`)

## Coverage requirements

- ≥ **500** labeled samples
- Every PatternRegistry pattern (`src/patterns/v1/patterns.json`): **≥3 TP** and **≥1 TN**
- ≥ **50** high-entropy samples (true secrets + UUID/hash false positives)
- ≥ **30** contextual samples (variable-name dependent)
- ≥ **20** multi-secret samples (2+ distinct pattern types)

## Commands

```bash
# Regenerate corpus (deterministic; overwrites corpus/)
npx tsx tests/fixtures/generate-corpus.ts

# Validate schema + coverage
npx tsx tests/fixtures/validate-corpus.ts
# or
npm run validate:corpus
```

## Adding samples

1. Prefer extending `generate-corpus.ts` so regeneration stays deterministic.
2. If hand-authoring a JSON file, match `corpus-schema.ts` exactly.
3. Use synthetic pattern-conformant values only — never real credentials.
4. Re-run `npm run validate:corpus` before committing.

## Downstream consumers

- WO-058 / WO-059 metric automation loads samples via `loadCorpusOrThrow()`.
- Vitest parameterized tests can import `loadCorpus` from `corpus-loader.ts`.

## Push-protection safe encoding

Corpus input fields are stored as JSON \uXXXX escapes so GitHub secret scanning / push protection does not block synthetic fixtures. corpus-loader / JSON.parse restore the real scan text at runtime.

