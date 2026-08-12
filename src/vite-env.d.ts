/// <reference types="vite/client" />

/**
 * Augment Vite's ImportMetaEnv to include AirGap Scanner build-time variables.
 * These are injected by the Forge pipeline during the build stage via:
 *   VITE_COMMIT_SHA — git commit SHA from VCS metadata
 *   VITE_BUILD_TIMESTAMP — ISO 8601 build timestamp from pipeline
 */
interface ImportMetaEnv {
  /** Git commit SHA injected by the Forge pipeline (or 'dev' when building locally) */
  readonly VITE_COMMIT_SHA: string;
  /** ISO 8601 build timestamp injected by the Forge pipeline */
  readonly VITE_BUILD_TIMESTAMP: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
