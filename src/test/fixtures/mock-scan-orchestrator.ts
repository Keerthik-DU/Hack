/**
 * Re-export MockScanOrchestrator from the __tests__ fixtures for use in
 * src/ components and hooks that need a default orchestrator at runtime.
 */
export { MockScanOrchestrator, MOCK_PROGRESS_EVENTS, MOCK_CAPABILITIES } from '../../__tests__/fixtures/mock-orchestrator';
export type { MockOrchestratorOptions } from '../../__tests__/fixtures/mock-orchestrator';
