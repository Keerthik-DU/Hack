import type { ModelLifecycleEvent } from '@/types/model-lifecycle';

export const lifecycleIdle: ModelLifecycleEvent = { state: 'idle' };

export const lifecycleCheckingWebgpu: ModelLifecycleEvent = { state: 'checking-webgpu' };

export const lifecycleDownloading: ModelLifecycleEvent = {
  state: 'downloading',
  progress: { bytesLoaded: 245 * 1024 * 1024, totalBytes: 800 * 1024 * 1024, percent: 30 },
};

export const lifecycleReady: ModelLifecycleEvent = { state: 'ready' };

export const lifecycleDegraded: ModelLifecycleEvent = {
  state: 'degraded',
  error: 'WebGPU unsupported',
};

export const lifecycleError: ModelLifecycleEvent = {
  state: 'error',
  error: 'CDN unreachable',
};

export const lifecycleSequence: readonly ModelLifecycleEvent[] = [
  lifecycleCheckingWebgpu,
  { state: 'checking-cache' },
  lifecycleDownloading,
  { state: 'verifying-download' },
  lifecycleReady,
];
