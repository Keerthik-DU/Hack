import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Finding } from '@/types';
import { FindingsList, sortFindingsByConfidenceThenLine } from './FindingsList';
import {
  expectedFullSortOrder,
  progressiveFindings,
} from '@/test/fixtures/scan-progress';

function shuffledFindings(): Finding[] {
  return [
    progressiveFindings.entropyLow,
    progressiveFindings.regexHigh,
    progressiveFindings.entropyMedium,
    progressiveFindings.llmHigh,
    progressiveFindings.regexMedium,
  ];
}

describe('WO-029: FindingsList sorting', () => {
  it('sorts by confidence high → medium → low, then by line number', () => {
    const sorted = sortFindingsByConfidenceThenLine(shuffledFindings());
    expect(sorted.map((f) => f.id)).toEqual([...expectedFullSortOrder]);
  });

  it('keeps stable order for equal confidence and line number', () => {
    const a: Finding = {
      ...progressiveFindings.regexMedium,
      id: 'tie-a',
      lineNumber: 7,
      confidence: 'medium',
    };
    const b: Finding = {
      ...progressiveFindings.entropyMedium,
      id: 'tie-b',
      lineNumber: 7,
      confidence: 'medium',
    };
    const sorted = sortFindingsByConfidenceThenLine([b, a]);
    // insertion order preserved when confidence+line tie (b before a)
    expect(sorted.map((f) => f.id)).toEqual(['tie-b', 'tie-a']);
  });

  it('renders FindingCards in sorted order', () => {
    render(<FindingsList findings={shuffledFindings()} />);
    const items = screen.getAllByTestId(/finding-list-item-/);
    expect(items.map((el) => el.getAttribute('data-finding-id'))).toEqual([
      ...expectedFullSortOrder,
    ]);
  });
});
