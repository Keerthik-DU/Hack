import { describe, it, expect } from 'vitest';
import { createDefaultScanOrchestrator } from '../create-default-orchestrator';

describe('createDefaultScanOrchestrator', () => {
  it('registers regex and entropy engines and reports llm unavailable', () => {
    const orchestrator = createDefaultScanOrchestrator();
    const capabilities = orchestrator.getCapabilities();

    expect(capabilities.regexAvailable).toBe(true);
    expect(capabilities.entropyAvailable).toBe(true);
    expect(capabilities.llmAvailable).toBe(false);
  });

  it('completes a clean-text scan without findings', async () => {
    const orchestrator = createDefaultScanOrchestrator();
    let lastStatus = '';
    let findingsCount = -1;

    for await (const progress of orchestrator.scan(
      'export function greet(name: string) {\n  return `Hello, ${name}`;\n}\n'
    )) {
      lastStatus = progress.status;
      findingsCount = progress.findings.length;
    }

    expect(lastStatus).toBe('complete');
    expect(findingsCount).toBe(0);
  });

  it('detects an obviously fake AWS access key via the regex layer', async () => {
    const orchestrator = createDefaultScanOrchestrator();
    let findingsCount = 0;
    let serialized = '';

    for await (const progress of orchestrator.scan(
      'const awsKey = "AKIAIOSFODNN7EXAMPLE";\n'
    )) {
      findingsCount = progress.findings.length;
      serialized = JSON.stringify(progress.findings);
    }

    expect(findingsCount).toBeGreaterThan(0);
    expect(serialized).toMatch(/AKIAIOSFODNN7EXAMPLE|aws|AWS/i);
  });
});
