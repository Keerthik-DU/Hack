import type { Page, Request } from '@playwright/test';
import { expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export type NetworkPhase = 'load' | 'scan';

export interface CapturedRequest {
  url: string;
  method: string;
  resourceType: string;
  phase: NetworkPhase;
  timestamp: string;
  /** Best-effort initiator hint from Playwright frame URL / resource type */
  initiator: string;
  headers: Record<string, string>;
}

export interface NetworkPhaseSummary {
  loadPhaseCount: number;
  scanPhaseCount: number;
  loadPhaseRequests: CapturedRequest[];
  scanPhaseRequests: CapturedRequest[];
}

const IGNORED_URL_PREFIXES = [
  'chrome-extension://',
  'devtools://',
  'chrome://',
  'edge://',
  'about:',
  'data:',
  'blob:',
];

/**
 * Filters browser-internal / non-application traffic that must not fail the
 * zero-network invariant (extensions, DevTools, opaque data/blob URLs).
 */
export function isIgnorableRequest(url: string): boolean {
  const normalized = url.toLowerCase();
  return IGNORED_URL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/**
 * NetworkMonitor wraps Playwright request interception, categorizes each
 * request into load vs scan phase, and asserts the zero-network invariant.
 */
export class NetworkMonitor {
  private readonly page: Page;
  private phase: NetworkPhase = 'load';
  private readonly requests: CapturedRequest[] = [];
  private readonly testName: string;
  private listening = false;

  constructor(page: Page, testName = 'unnamed') {
    this.page = page;
    this.testName = testName;
  }

  /** Begin capturing requests (idempotent). Defaults to load phase. */
  attach(): void {
    if (this.listening) return;
    this.listening = true;

    this.page.on('request', (request: Request) => {
      const url = request.url();
      if (isIgnorableRequest(url)) return;

      const frameUrl = request.frame()?.url() ?? 'unknown-frame';
      const captured: CapturedRequest = {
        url,
        method: request.method(),
        resourceType: request.resourceType(),
        phase: this.phase,
        timestamp: new Date().toISOString(),
        initiator: `${request.resourceType()}@${frameUrl}`,
        headers: request.headers(),
      };

      this.requests.push(captured);
    });
  }

  /** Mark the start of the scan-execution window (deterministic, not timing-based). */
  async startScanPhase(): Promise<void> {
    this.phase = 'scan';
    await this.page.evaluate(() => {
      document.body.setAttribute('data-scan-phase', 'active');
      document.body.setAttribute('data-network-monitor-phase', 'scan');
    });
  }

  /** Mark the end of the scan-execution window. */
  async endScanPhase(): Promise<void> {
    this.phase = 'load';
    await this.page.evaluate(() => {
      document.body.setAttribute('data-scan-phase', 'idle');
      document.body.setAttribute('data-network-monitor-phase', 'load');
    });
  }

  getLoadPhaseRequests(): CapturedRequest[] {
    return this.requests.filter((r) => r.phase === 'load');
  }

  getScanPhaseRequests(): CapturedRequest[] {
    return this.requests.filter((r) => r.phase === 'scan');
  }

  getSummary(): NetworkPhaseSummary {
    const loadPhaseRequests = this.getLoadPhaseRequests();
    const scanPhaseRequests = this.getScanPhaseRequests();
    return {
      loadPhaseCount: loadPhaseRequests.length,
      scanPhaseCount: scanPhaseRequests.length,
      loadPhaseRequests,
      scanPhaseRequests,
    };
  }

  /**
   * Asserts exactly zero outbound requests during the scan phase.
   * On failure, includes URL, method, resource type, and initiator.
   */
  assertZeroScanRequests(): void {
    const violations = this.getScanPhaseRequests();
    if (violations.length === 0) return;

    const details = violations
      .map(
        (r, i) =>
          `[${i + 1}] ${r.method} ${r.url} (type=${r.resourceType}, initiator=${r.initiator})`
      )
      .join('\n');

    expect(
      violations,
      `Zero-network invariant violated during scan phase: ${violations.length} request(s):\n${details}`
    ).toHaveLength(0);
  }

  /**
   * Writes a JSON summary artifact for auditability (load vs scan counts).
   */
  writeSummaryReport(outputDir = 'test-results/network-reports'): string {
    const summary = this.getSummary();
    const report = {
      testName: this.testName,
      generatedAt: new Date().toISOString(),
      loadPhaseCount: summary.loadPhaseCount,
      scanPhaseCount: summary.scanPhaseCount,
      loadPhaseRequests: summary.loadPhaseRequests,
      scanPhaseRequests: summary.scanPhaseRequests,
    };

    fs.mkdirSync(outputDir, { recursive: true });
    const safeName = this.testName.replace(/[^\w.-]+/g, '_');
    const filePath = path.join(outputDir, `${safeName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
    return filePath;
  }
}
