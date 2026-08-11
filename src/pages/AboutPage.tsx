import React from 'react';
import {
  TrustGrid,
  DetectionLayersSection,
  NetworkAuditSection,
  BrowserCompatibilityTable,
} from '@/components/About';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-12 py-4">
      {/* Hero Section */}
      <section data-testid="about-hero-section" className="space-y-4 text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-extrabold font-sans text-brand-primary tracking-tight">
          About AirGap Scanner
        </h1>
        <p className="text-base sm:text-lg text-surface-light-textSecondary dark:text-surface-dark-textSecondary leading-relaxed max-w-3xl">
          AirGap Scanner is a local, in-browser web application that scans pasted code, logs, and
          JSON configurations for exposed credentials before they reach third-party AI models or
          remote APIs. Combining deterministic pattern matching with local WebGPU AI models, AirGap
          Scanner enforces a 100% air-gapped guarantee: nothing you paste ever leaves your machine.
        </p>
      </section>

      {/* Trust Grid Cards */}
      <TrustGrid />

      {/* Three-Tier Detection Layers */}
      <DetectionLayersSection />

      {/* Live Network Audit Tool */}
      <NetworkAuditSection />

      {/* Browser Compatibility Matrix */}
      <BrowserCompatibilityTable />
    </div>
  );
};

export default AboutPage;
