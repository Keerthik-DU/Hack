import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorCard } from './ErrorCard';
import { ScenarioTag } from './ScenarioTag';
import { ErrorBanner } from './ErrorBanner';
import { InputLimitBar } from './InputLimitBar';
import { ActionButtons } from './ActionButtons';
import { errorCardPropsFixtures } from '@/__fixtures__/error-card-props';

describe('WO-046: ScenarioTag', () => {
  it('renders label with severity and dark mode classes', () => {
    render(<ScenarioTag label="LLM Worker Crash" severity="error" />);
    const tag = screen.getByTestId('scenario-tag');
    expect(tag.textContent).toContain('LLM Worker Crash');
    expect(tag.className).toContain('dark:');
  });
});

describe('WO-046: ErrorBanner', () => {
  it('exposes role=alert and truncates long messages', () => {
    const long = 'x'.repeat(520);
    render(<ErrorBanner severity="error" message={long} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByTestId('error-banner-message').textContent?.endsWith('…')).toBe(true);
    fireEvent.click(screen.getByTestId('error-banner-toggle'));
    expect(screen.getByTestId('error-banner-message').textContent).toBe(long);
  });
});

describe('WO-046: InputLimitBar', () => {
  it('uses amber at exactly 100% and red when over limit', () => {
    const { rerender } = render(<InputLimitBar currentCount={100_000} maxCount={100_000} />);
    const progress = screen.getByTestId('input-limit-progress');
    expect(progress.getAttribute('aria-valuenow')).toBe('100000');
    expect(progress.getAttribute('aria-valuemax')).toBe('100000');
    expect(progress.getAttribute('data-ratio')).toBe('near');

    rerender(<InputLimitBar currentCount={100_001} maxCount={100_000} />);
    expect(screen.getByTestId('input-limit-progress').getAttribute('data-ratio')).toBe('over');
  });

  it('uses green below 80%', () => {
    render(<InputLimitBar currentCount={50_000} maxCount={100_000} />);
    expect(screen.getByTestId('input-limit-progress').getAttribute('data-ratio')).toBe('ok');
  });
});

describe('WO-046: ActionButtons', () => {
  it('invokes handlers and disables missing callbacks', () => {
    const onClick = vi.fn();
    render(
      <ActionButtons
        actions={[
          { label: 'Retry LLM', variant: 'primary', onClick, ariaLabel: 'Retry LLM' },
          { label: 'Missing', variant: 'secondary', ariaLabel: 'Missing' },
        ]}
      />
    );
    fireEvent.click(screen.getByLabelText('Retry LLM'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText('Missing') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('WO-046: ErrorCard variants', () => {
  it('renders llm-crash composition and callbacks', () => {
    const onRetryLLM = vi.fn();
    const onViewPartialResults = vi.fn();
    render(
      <ErrorCard
        {...errorCardPropsFixtures.llmCrash}
        onRetryLLM={onRetryLLM}
        onViewPartialResults={onViewPartialResults}
      />
    );

    expect(screen.getByTestId('error-card').getAttribute('data-variant')).toBe('llm-crash');
    expect(screen.getByTestId('scenario-tag').textContent).toContain('LLM Worker Crash');
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByTestId('layer-status-regex').getAttribute('data-status')).toBe('complete');
    expect(screen.getByTestId('layer-status-llm').getAttribute('data-status')).toBe('error');
    expect(screen.getByTestId('layer-status-list').getAttribute('data-compact')).toBe('true');

    fireEvent.click(screen.getByTestId('error-card-retry-llm'));
    fireEvent.click(screen.getByTestId('error-card-view-partial'));
    expect(onRetryLLM).toHaveBeenCalled();
    expect(onViewPartialResults).toHaveBeenCalled();
    expect(screen.getByTestId('error-card-retry-llm').getAttribute('aria-label')).toBe(
      'Retry LLM'
    );
  });

  it('renders input-too-large with disabled Scan', () => {
    render(<ErrorCard {...errorCardPropsFixtures.inputTooLarge} />);
    expect(screen.getByText('Input exceeds 100,000 character limit')).toBeTruthy();
    expect(screen.getByTestId('input-limit-progress')).toBeTruthy();
    expect(
      (screen.getByTestId('error-card-scan-disabled') as HTMLButtonElement).disabled
    ).toBe(true);
  });

  it('renders model-download-failure with unavailable LLM', () => {
    const onRetryDownload = vi.fn();
    const onContinueWithoutLLM = vi.fn();
    render(
      <ErrorCard
        {...errorCardPropsFixtures.modelDownloadFailure}
        onRetryDownload={onRetryDownload}
        onContinueWithoutLLM={onContinueWithoutLLM}
      />
    );
    expect(screen.getByTestId('layer-status-llm').getAttribute('data-status')).toBe(
      'unavailable'
    );
    fireEvent.click(screen.getByTestId('error-card-retry-download'));
    fireEvent.click(screen.getByTestId('error-card-continue-without-llm'));
    expect(onRetryDownload).toHaveBeenCalled();
    expect(onContinueWithoutLLM).toHaveBeenCalled();
  });

  it('renders integrity-failure message and actions', () => {
    const onRedownloadModel = vi.fn();
    render(
      <ErrorCard
        {...errorCardPropsFixtures.integrityFailure}
        onRedownloadModel={onRedownloadModel}
        onContinueWithoutLLM={vi.fn()}
      />
    );
    expect(screen.getByText('Model integrity verification failed (SHA-256 mismatch)')).toBeTruthy();
    fireEvent.click(screen.getByTestId('error-card-redownload'));
    expect(onRedownloadModel).toHaveBeenCalled();
  });
});
