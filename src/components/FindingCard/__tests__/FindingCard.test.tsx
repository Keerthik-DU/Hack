import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  FindingCard,
  FindingHeader,
  FindingPreview,
  FindingTags,
  FindingDetailToggle,
} from '../index';
import { sampleFindings } from '@/test/fixtures/findings';

describe('WO-028: FindingCard component family', () => {
  it('renders the header, meta, tags, and masked preview for a finding', () => {
    render(<FindingCard finding={sampleFindings[0]} />);

    expect(screen.getByText('AWS Access Key')).toBeDefined();
    expect(screen.getByText(/Line 12/)).toBeDefined();
    expect(screen.getByText(/Characters 8-28/)).toBeDefined();
    expect(screen.getByTestId('confidence-badge').textContent).toBe('high');
    expect(screen.getByTestId('finding-layer-tag-1').textContent).toBe('Regex');
    expect(screen.getByText('AKIA***KEY1')).toBeDefined();
  });

  it('renders confidence badges with accessible color classes for all levels', () => {
    const { rerender } = render(<FindingHeader findingId="x" secretType="token" confidence="high" />);
    expect(screen.getByTestId('confidence-badge').className).toContain('emerald');

    rerender(<FindingHeader findingId="x" secretType="token" confidence="medium" />);
    expect(screen.getByTestId('confidence-badge').className).toContain('amber');

    rerender(<FindingHeader findingId="x" secretType="token" confidence="low" />);
    expect(screen.getByTestId('confidence-badge').className).toContain('rose');
  });

  it('renders detection layer tags using badge showcase patterns', () => {
    render(<FindingTags layers={[1, 2, 3]} />);

    expect(screen.getByTestId('finding-layer-tag-1').className).toContain('badge-regex');
    expect(screen.getByTestId('finding-layer-tag-2').className).toContain('badge-entropy');
    expect(screen.getByTestId('finding-layer-tag-3').className).toContain('badge-llm');
  });

  it('formats masked previews and handles short values gracefully', () => {
    const { rerender } = render(<FindingPreview maskedValue="ABCD1234WXYZ" />);
    expect(screen.getByTestId('finding-preview').textContent).toBe('ABCD***WXYZ');

    rerender(<FindingPreview maskedValue="abc123" />);
    expect(screen.getByTestId('finding-preview').textContent).toBe('abc123');
  });

  it('toggles details with click, Enter, and Space while updating aria attributes', () => {
    function Wrapper() {
      const [expanded, setExpanded] = React.useState(false);

      return (
        <FindingDetailToggle
          expanded={expanded}
          controlsId="detail-body"
          onToggle={() => setExpanded((value) => !value)}
        />
      );
    }

    render(<Wrapper />);
    const button = screen.getByTestId('finding-detail-toggle');

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe('detail-body');

    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(button, { key: 'Enter' });
    expect(button.getAttribute('aria-expanded')).toBe('false');

    fireEvent.keyDown(button, { key: ' ' });
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('expands and collapses the detail table with keyboard activation', () => {
    function Wrapper() {
      const [expanded, setExpanded] = React.useState(false);
      return (
        <FindingDetailToggle
          expanded={expanded}
          controlsId="detail-body"
          onToggle={() => setExpanded((value) => !value)}
        />
      );
    }

    render(<Wrapper />);
    const button = screen.getByTestId('finding-detail-toggle');

    fireEvent.keyDown(button, { key: 'Enter' });
    expect(button.getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(button, { key: ' ' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('shows the detail table in the expanded card state', () => {
    render(<FindingCard finding={sampleFindings[1]} defaultExpanded />);

    const detailBody = screen.getByTestId('finding-detail-body');

    expect(detailBody).toBeDefined();
    expect(within(detailBody).getByText('Secret Type')).toBeDefined();
    expect(within(detailBody).getByText('JWT')).toBeDefined();
    expect(within(detailBody).getByText('Context')).toBeDefined();
  });

  it('supports a multi-layer tag context in list usage', () => {
    render(
      <div>
        {sampleFindings.slice(0, 3).map((finding) => (
          <FindingCard key={finding.id} finding={finding} layerTags={[1, 2, 3]} />
        ))}
      </div>
    );

    expect(screen.getAllByTestId('finding-card')).toHaveLength(3);
    expect(screen.getAllByText('Regex').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Entropy').length).toBeGreaterThan(0);
    expect(screen.getAllByText('LLM').length).toBeGreaterThan(0);
  });

  it('keeps the component list render stable across varying confidence levels', () => {
    render(
      <ul>
        {sampleFindings.map((finding) => (
          <li key={finding.id}>
            <FindingCard finding={finding} />
          </li>
        ))}
      </ul>
    );

    expect(screen.getAllByTestId('finding-card')).toHaveLength(6);
    expect(screen.getByText('High Entropy String')).toBeDefined();
    expect(screen.getByText('Database URL')).toBeDefined();
    expect(screen.getByText('Private Key')).toBeDefined();
  });
});