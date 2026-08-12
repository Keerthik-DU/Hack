/**
 * LLM Web Worker — placeholder for in-browser LLM inference via @mlc-ai/web-llm.
 *
 * This file is the entry point for the dedicated Web Worker that handles
 * GPU-bound LLM inference off the main thread. It is compiled by Vite using
 * the built-in worker support:
 *
 *   new Worker(new URL('./llm-worker.ts', import.meta.url), { type: 'module' })
 *
 * STATUS: Placeholder — LLM integration is not yet complete.
 * The worker accepts the full WorkerMessage protocol and responds with
 * stub messages so the rest of the pipeline can be wired up without
 * requiring a real model. Replace the stub implementations below with
 * actual @mlc-ai/web-llm calls once LLM integration is ready.
 *
 * @see src/types/worker.ts for the WorkerMessage discriminated union.
 */

import type { WorkerMessage } from '@/types/worker';
import { ErrorCode } from '@/types/scan';

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  switch (msg.type) {
    case 'INIT_MODEL': {
      // TODO: Replace with actual @mlc-ai/web-llm model initialisation.
      // Example:
      //   const engine = await CreateWebWorkerMLCEngine(self, msg.modelId, {
      //     initProgressCallback: (progress) => {
      //       self.postMessage({ type: 'MODEL_PROGRESS', progress: progress.progress, text: progress.text });
      //     },
      //   });
      //
      // Placeholder: immediately report MODEL_READY.
      console.debug('[llm-worker] INIT_MODEL received (placeholder) — modelId:', msg.modelId);
      const readyMsg: WorkerMessage = {
        type: 'MODEL_READY',
        capabilities: { webgpu: false, placeholder: true },
      };
      self.postMessage(readyMsg);
      break;
    }

    case 'ANALYZE': {
      // TODO: Replace with actual LLM inference call using the initialised engine.
      // The worker should accept ambiguous findings with ±5 lines of context and
      // return upgraded or downgraded confidence scores.
      //
      // Placeholder: return an empty findings array (no LLM judgements yet).
      console.debug('[llm-worker] ANALYZE received (placeholder) — input length:', msg.payload.text.length);
      const resultMsg: WorkerMessage = {
        type: 'RESULT',
        findings: [],
      };
      self.postMessage(resultMsg);
      break;
    }

    default: {
      // Unrecognised message type — surface as an error so callers can detect
      // protocol mismatches during development.
      const errorMsg: WorkerMessage = {
        type: 'ERROR',
        code: ErrorCode.UNKNOWN_ERROR,
        message: `llm-worker: unrecognised message type received: ${(msg as { type: string }).type}`,
      };
      self.postMessage(errorMsg);
    }
  }
};

// Signal that the worker script loaded correctly.
console.debug('[llm-worker] Worker script loaded (placeholder mode).');
