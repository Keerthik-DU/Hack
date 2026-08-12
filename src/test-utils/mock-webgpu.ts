/**
 * Mock factory functions for navigator.gpu used in WebGPUDetector unit tests.
 *
 * Each factory produces a minimal in-memory fake that satisfies the subset of the
 * WebGPU GPU interface actually exercised by WebGPUDetector.probe(). Using explicit
 * factories instead of generic mocking keeps test setup readable and makes the
 * intended scenario obvious at the call site.
 *
 * Usage:
 *   Object.defineProperty(navigator, 'gpu', {
 *     value: createMockGPUWithAdapter(),
 *     configurable: true,
 *     writable: true,
 *   });
 */

import { vi } from 'vitest';

/** Minimal subset of GPUAdapterInfo needed by WebGPUDetector */
export interface MockGPUAdapterInfo {
  vendor: string;
  architecture: string;
  device: string;
  description: string;
}

/** Minimal subset of GPUAdapter needed by WebGPUDetector */
export interface MockGPUAdapter {
  info: MockGPUAdapterInfo;
}

/** Minimal subset of the GPU interface needed by WebGPUDetector */
export interface MockGPU {
  requestAdapter: ReturnType<typeof vi.fn>;
}

/** Default adapter info used when no overrides are supplied */
const DEFAULT_ADAPTER_INFO: MockGPUAdapterInfo = {
  vendor: 'mock-vendor',
  architecture: 'mock-architecture',
  device: 'mock-device',
  description: 'Mock GPU Adapter for unit tests',
};

/**
 * Creates a mock GPU adapter object with an `info` property that returns the
 * given metadata values. Simulates a real GPU adapter being successfully found.
 *
 * @param overrides - Optional partial overrides for adapter info fields.
 */
export function createMockGPUAdapter(
  overrides: Partial<MockGPUAdapterInfo> = {}
): MockGPUAdapter {
  return {
    info: { ...DEFAULT_ADAPTER_INFO, ...overrides },
  };
}

/**
 * Creates a mock navigator.gpu object whose requestAdapter() resolves to a
 * valid adapter with the given info overrides.
 *
 * Scenario: WebGPU is fully supported — happy path.
 *
 * @param adapterInfoOverrides - Optional partial overrides for adapter info fields.
 */
export function createMockGPUWithAdapter(
  adapterInfoOverrides: Partial<MockGPUAdapterInfo> = {}
): MockGPU {
  const adapter = createMockGPUAdapter(adapterInfoOverrides);
  return {
    requestAdapter: vi.fn().mockResolvedValue(adapter),
  };
}

/**
 * Creates a mock navigator.gpu object whose requestAdapter() resolves to null.
 *
 * Scenario: The WebGPU API is exposed by the browser but no suitable physical
 * or virtual GPU is available (e.g., headless server, software renderer disabled).
 */
export function createMockGPUWithNullAdapter(): MockGPU {
  return {
    requestAdapter: vi.fn().mockResolvedValue(null),
  };
}

/**
 * Creates a mock navigator.gpu object whose requestAdapter() rejects with the
 * given error.
 *
 * Scenario: navigator.gpu exists (browser has partial WebGPU support or a
 * polyfill) but throws during adapter request — e.g., DOMException from a
 * GPU driver error or a polyfill that does not fully implement the API.
 *
 * @param error - The error that requestAdapter() will reject with.
 *                Defaults to a DOMException with 'NotSupportedError' name.
 */
export function createMockGPUThatThrows(
  error: Error = new DOMException('GPU adapter request failed', 'NotSupportedError')
): MockGPU {
  return {
    requestAdapter: vi.fn().mockRejectedValue(error),
  };
}

/**
 * Installs a mock GPU object on navigator for the duration of a test.
 * Returns a cleanup function that removes the mock when called.
 *
 * Example usage in a beforeEach / afterEach pair:
 *
 *   let cleanup: () => void;
 *   beforeEach(() => { cleanup = installMockGPU(createMockGPUWithAdapter()); });
 *   afterEach(() => cleanup());
 *
 * @param mockGpu - The mock GPU to install, or undefined to simulate the
 *                  absence of navigator.gpu entirely.
 */
export function installMockGPU(mockGpu: MockGPU | undefined): () => void {
  Object.defineProperty(navigator, 'gpu', {
    value: mockGpu,
    configurable: true,
    writable: true,
  });

  return () => {
    Object.defineProperty(navigator, 'gpu', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  };
}
