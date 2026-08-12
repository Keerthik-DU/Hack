/// <reference lib="webworker" />

import { RegexEngine } from '@/engines/RegexEngine';
import { EntropyAnalyzer } from '@/engines/EntropyAnalyzer';
import type {
  ComputationWorkerRequest,
  ComputationWorkerResponse,
} from './computation-worker-types';

const regexEngine = new RegexEngine();
const entropyEngine = new EntropyAnalyzer();

let activeRequestId: string | null = null;
let aborted = false;

function post(message: ComputationWorkerResponse): void {
  self.postMessage(message);
}

async function runAnalyze(
  requestId: string,
  text: string,
  lines: readonly string[]
): Promise<void> {
  aborted = false;
  activeRequestId = requestId;
  const totalLines = lines.length > 0 ? lines.length : 1;
  let lastPct = -1;

  const emitProgress = (linesProcessed: number) => {
    const percentage = Math.min(99, Math.floor((linesProcessed / totalLines) * 100));
    if (percentage >= lastPct + 5 || linesProcessed >= totalLines) {
      lastPct = percentage - (percentage % 5);
      post({
        type: 'PROGRESS',
        requestId,
        percentage: Math.min(95, Math.max(0, lastPct)),
        linesProcessed,
        totalLines,
      });
    }
  };

  try {
    emitProgress(0);
    const input = { text, lines: [...lines] };

    // Chunked progress while engines run — engines are sync-ish async; report mid-point.
    emitProgress(Math.floor(totalLines * 0.25));
    if (aborted || activeRequestId !== requestId) return;

    const regexFindings = await regexEngine.analyze(input);
    emitProgress(Math.floor(totalLines * 0.55));
    if (aborted || activeRequestId !== requestId) return;

    const entropyFindings = await entropyEngine.analyze(input);
    emitProgress(totalLines);
    if (aborted || activeRequestId !== requestId) return;

    post({
      type: 'RESULT',
      requestId,
      findings: [...regexFindings, ...entropyFindings],
      layers: ['regex', 'entropy'],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    post({ type: 'ERROR', requestId, message, stack });
  } finally {
    if (activeRequestId === requestId) {
      activeRequestId = null;
    }
  }
}

self.onmessage = (event: MessageEvent<ComputationWorkerRequest>) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'ABORT') {
    aborted = true;
    if (data.requestId && activeRequestId === data.requestId) {
      activeRequestId = null;
    }
    return;
  }

  if (data.type === 'ANALYZE') {
    void runAnalyze(data.requestId, data.text, data.lines);
  }
};

export {};
