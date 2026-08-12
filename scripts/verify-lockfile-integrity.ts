import * as fs from 'fs';
import * as path from 'path';

export interface PackageEntry {
  version?: string;
  resolved?: string;
  integrity?: string;
  link?: boolean;
  [key: string]: unknown;
}

export interface PackageLockSchema {
  name?: string;
  version?: string;
  lockfileVersion?: number;
  packages?: Record<string, PackageEntry>;
  dependencies?: Record<string, PackageEntry>;
  [key: string]: unknown;
}

export interface LockfileVerificationResult {
  isValid: boolean;
  totalPackagesChecked: number;
  missingIntegrityPackages: string[];
}

/**
 * Audits a package-lock.json JSON string or object structure to verify that every resolved package
 * contains a valid cryptographic integrity hash.
 */
export function verifyLockfileIntegrity(lockfileContent: string | PackageLockSchema): LockfileVerificationResult {
  let parsed: PackageLockSchema;

  if (typeof lockfileContent === 'string') {
    try {
      parsed = JSON.parse(lockfileContent) as PackageLockSchema;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid package-lock.json JSON syntax: ${message}`);
    }
  } else {
    parsed = lockfileContent;
  }

  const missingIntegrityPackages: string[] = [];
  let totalPackagesChecked = 0;

  // Check npm v2/v3 `packages` map
  if (parsed.packages && typeof parsed.packages === 'object') {
    for (const [pkgPath, pkgMeta] of Object.entries(parsed.packages)) {
      // Ignore root project entry ("") and workspace symlinks (link: true)
      if (pkgPath === '' || pkgMeta.link === true) {
        continue;
      }

      totalPackagesChecked++;
      if (!pkgMeta.integrity || typeof pkgMeta.integrity !== 'string' || pkgMeta.integrity.trim() === '') {
        missingIntegrityPackages.push(pkgPath);
      }
    }
  } else if (parsed.dependencies && typeof parsed.dependencies === 'object') {
    // Fallback for npm v1 legacy dependencies map
    const checkDependencies = (depsMap: Record<string, PackageEntry>, parentPrefix = '') => {
      for (const [pkgName, pkgMeta] of Object.entries(depsMap)) {
        if (pkgMeta.link === true) continue;
        const fullKey = parentPrefix ? `${parentPrefix} > ${pkgName}` : pkgName;
        totalPackagesChecked++;

        if (!pkgMeta.integrity || typeof pkgMeta.integrity !== 'string' || pkgMeta.integrity.trim() === '') {
          missingIntegrityPackages.push(fullKey);
        }
      }
    };
    checkDependencies(parsed.dependencies);
  }

  return {
    isValid: missingIntegrityPackages.length === 0,
    totalPackagesChecked,
    missingIntegrityPackages,
  };
}

/**
 * CLI execution entrypoint for lockfile integrity audit.
 */
export function runLockfileVerification(lockfilePath?: string): boolean {
  const targetPath = lockfilePath || path.resolve(process.cwd(), 'package-lock.json');
  if (!fs.existsSync(targetPath)) {
    console.error(`[Supply Chain Error] package-lock.json not found at: ${targetPath}`);
    return false;
  }

  const content = fs.readFileSync(targetPath, 'utf-8');
  const result = verifyLockfileIntegrity(content);

  if (result.isValid) {
    console.log(
      `[Supply Chain Audit ✅] Verified integrity hashes for all ${result.totalPackagesChecked} packages in package-lock.json.`
    );
    return true;
  } else {
    console.error(
      `[Supply Chain Audit ❌] Found ${result.missingIntegrityPackages.length} package(s) missing integrity hashes:`
    );
    for (const pkg of result.missingIntegrityPackages) {
      console.error(`  - ${pkg}`);
    }
    return false;
  }
}

// Execute if run directly from node CLI
if (process.argv[1] && process.argv[1].includes('verify-lockfile-integrity')) {
  const success = runLockfileVerification();
  if (!success) {
    process.exit(1);
  }
}
