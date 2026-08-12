/**
 * WebGPU capability fixture objects for unit and integration tests.
 *
 * Provides pre-built WebGPUCapability instances for three canonical test scenarios:
 *   1. `webgpuSupported`   — WebGPU fully available with a valid adapter
 *   2. `webgpuUnsupported` — navigator.gpu is undefined (no WebGPU API)
 *   3. `webgpuAdapterFailure` — navigator.gpu present but requestAdapter() returned null
 *   4. `webgpuMemoryPressure` — WebGPU supported but system memory pressure is critical
 *
 * These fixtures represent the final typed results from WebGPUDetector.detect() and
 * are intended for use in hook and component tests that need to mock the detection
 * result without exercising the detector itself.
 *
 * For navigator.gpu mock factories (used to test WebGPUDetector directly), see:
 *   src/test-utils/mock-webgpu.ts
 */

import type { WebGPUCapability } from '@/types/webgpu';

/**
 * WebGPU fully supported — adapter found with realistic hardware metadata.
 * Use this fixture when testing the "full capability" code path.
 */
export const webgpuSupported: WebGPUCapability = {
  supported: true,
  adapterInfo: {
    vendor: 'nvidia',
    architecture: 'ampere',
    description: 'NVIDIA GeForce RTX 3090',
  },
  detectionTimeMs: 12,
  memoryPressure: false,
};

/**
 * WebGPU unsupported — navigator.gpu was absent (e.g., Firefox without flag, older Safari).
 * Use this fixture when testing degraded mode driven by missing browser API.
 */
export const webgpuUnsupported: WebGPUCapability = {
  supported: false,
  reason: 'WebGPU API not available in this browser',
  detectionTimeMs: 1,
};

/**
 * WebGPU adapter failure — navigator.gpu was present but requestAdapter() returned null.
 * Use this fixture when testing degraded mode driven by missing hardware adapter.
 */
export const webgpuAdapterFailure: WebGPUCapability = {
  supported: false,
  reason: 'No suitable GPU adapter found',
  detectionTimeMs: 8,
};

/**
 * WebGPU supported but memory pressure is critical.
 * Use this fixture when testing LLM-skip behaviour triggered by heap pressure.
 */
export const webgpuMemoryPressure: WebGPUCapability = {
  supported: true,
  adapterInfo: {
    vendor: 'intel',
    architecture: 'xe',
    description: 'Intel Arc A770',
  },
  detectionTimeMs: 10,
  memoryPressure: true,
};
