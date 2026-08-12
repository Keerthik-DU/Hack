/**
 * Fixture: React dangerouslySetInnerHTML
 * Expected ESLint rule: react/no-danger
 * Used by scripts/verify-lint-rules to confirm the rule fires as an error.
 */
import React from 'react';

export function UnsafeHtml({ html }: { html: string }): React.ReactElement {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
