import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  verifyLockfileIntegrity,
  runLockfileVerification,
} from '../../../scripts/verify-lockfile-integrity';

describe('WO-052: Dependency Integrity Verification & Supply Chain Suite', () => {
  it('validates live package-lock.json and confirms all packages have SHA integrity hashes', () => {
    const liveLockfilePath = path.resolve(process.cwd(), 'package-lock.json');
    const liveContent = fs.readFileSync(liveLockfilePath, 'utf-8');

    const result = verifyLockfileIntegrity(liveContent);
    expect(result.isValid).toBe(true);
    expect(result.missingIntegrityPackages).toHaveLength(0);
    expect(result.totalPackagesChecked).toBeGreaterThan(50);
  });

  it('correctly detects missing integrity hashes in mock-package-lock.json fixture', () => {
    const mockPath = path.resolve(__dirname, '../../test/fixtures/mock-package-lock.json');
    const mockContent = fs.readFileSync(mockPath, 'utf-8');

    const result = verifyLockfileIntegrity(mockContent);
    expect(result.isValid).toBe(false);
    expect(result.totalPackagesChecked).toBe(3); // 4 minus root & link
    expect(result.missingIntegrityPackages).toHaveLength(2);
    expect(result.missingIntegrityPackages).toContain(
      'node_modules/invalid-package-missing-integrity'
    );
    expect(result.missingIntegrityPackages).toContain(
      'node_modules/invalid-package-empty-integrity'
    );
  });

  it('runLockfileVerification() returns true for live package-lock.json and false for mock invalid fixture', () => {
    const livePath = path.resolve(process.cwd(), 'package-lock.json');
    expect(runLockfileVerification(livePath)).toBe(true);

    const mockPath = path.resolve(__dirname, '../../test/fixtures/mock-package-lock.json');
    expect(runLockfileVerification(mockPath)).toBe(false);
  });

  it('throws descriptive error on malformed JSON string', () => {
    expect(() => verifyLockfileIntegrity('{ invalid json')).toThrow(
      /Invalid package-lock.json JSON syntax/
    );
  });
});
