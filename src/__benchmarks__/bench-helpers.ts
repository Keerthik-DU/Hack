export function makeInput(chars: number, seed = 'x'): string {
  const unit = (seed + 'AKIAIOSFODNN7NOTREAL ').repeat(20);
  let out = '';
  while (out.length < chars) out += unit;
  return out.slice(0, chars);
}

export async function timeMs(fn: () => Promise<unknown> | unknown): Promise<number> {
  const t0 = performance.now();
  await fn();
  return performance.now() - t0;
}

export const THRESHOLDS = {
  regex10kMs: 500,
  entropy50kMs: 2000,
  pipeline100kMs: 10000,
} as const;
