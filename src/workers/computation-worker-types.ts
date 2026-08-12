import type { Finding } from '@/types';

export const COMPUTATION_WORKER_THRESHOLD = 10_000;

export type ComputationWorkerRequestType = 'ANALYZE' | 'ABORT';
export type ComputationWorkerResponseType = 'RESULT' | 'PROGRESS' | 'ERROR';

export interface AnalyzeWorkerRequest {
  readonly type: 'ANALYZE';
  readonly requestId: string;
  readonly text: string;
  readonly lines: readonly string[];
}

export interface AbortWorkerRequest {
  readonly type: 'ABORT';
  readonly requestId?: string;
}

export type ComputationWorkerRequest = AnalyzeWorkerRequest | AbortWorkerRequest;

export interface ResultWorkerResponse {
  readonly type: 'RESULT';
  readonly requestId: string;
  readonly findings: Finding[];
  readonly layers: readonly ('regex' | 'entropy')[];
}

export interface ProgressWorkerResponse {
  readonly type: 'PROGRESS';
  readonly requestId: string;
  readonly percentage: number;
  readonly linesProcessed: number;
  readonly totalLines: number;
}

export interface ErrorWorkerResponse {
  readonly type: 'ERROR';
  readonly requestId: string;
  readonly message: string;
  readonly stack?: string;
}

export type ComputationWorkerResponse =
  | ResultWorkerResponse
  | ProgressWorkerResponse
  | ErrorWorkerResponse;
