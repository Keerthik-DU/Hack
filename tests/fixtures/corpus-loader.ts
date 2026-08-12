import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CorpusSample, validateCorpusSample } from './corpus-schema';

const FIXTURES_DIR = path.dirname(fileURLToPath(import.meta.url));
export const CORPUS_DIR = path.join(FIXTURES_DIR, 'corpus');

export interface CorpusLoadResult {
  readonly samples: readonly CorpusSample[];
  readonly errors: readonly string[];
}

async function walkJsonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJsonFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

/**
 * Recursively loads all corpus JSON files, validates each against CorpusSample schema,
 * and returns typed samples plus any validation errors.
 */
export async function loadCorpus(corpusDir: string = CORPUS_DIR): Promise<CorpusLoadResult> {
  const files = await walkJsonFiles(corpusDir);
  const samples: CorpusSample[] = [];
  const errors: string[] = [];

  for (const filePath of files) {
    const relative = path.relative(corpusDir, filePath).replace(/\\/g, '/');
    let parsed: unknown;

    try {
      const raw = await readFile(filePath, 'utf8');
      parsed = JSON.parse(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${relative}: JSON parse failed — ${message}`);
      continue;
    }

    const sampleErrors = validateCorpusSample(parsed);
    if (sampleErrors.length > 0) {
      for (const err of sampleErrors) {
        errors.push(`${relative}: ${err}`);
      }
      continue;
    }

    samples.push(parsed as CorpusSample);
  }

  return { samples, errors };
}

/**
 * Convenience helper for Vitest parameterized tests — throws if any sample is invalid.
 */
export async function loadCorpusOrThrow(corpusDir: string = CORPUS_DIR): Promise<CorpusSample[]> {
  const { samples, errors } = await loadCorpus(corpusDir);
  if (errors.length > 0) {
    throw new Error(`Corpus validation failed (${errors.length} errors):\n${errors.slice(0, 20).join('\n')}`);
  }
  return [...samples];
}
