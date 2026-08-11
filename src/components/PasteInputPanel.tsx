import React, { useState, ClipboardEvent, ChangeEvent } from 'react';
import { sanitizeInput } from '@/infra';
import { sampleCodeSnippet } from './__fixtures__/paste-inputs';

export const MAX_INPUT_LENGTH = 100_000;

export interface PasteInputPanelProps {
  /** Initial or external text value */
  value?: string;
  /** Callback fired whenever sanitized text content changes */
  onTextChange?: (text: string) => void;
  /** Custom placeholder text for the input area */
  placeholder?: string;
  /** Optional container CSS class overrides */
  className?: string;
}

export const PasteInputPanel: React.FC<PasteInputPanelProps> = ({
  value: externalValue,
  onTextChange,
  placeholder = 'Paste code snippets, API logs, environment files, or JSON configs here to scan for secrets...',
  className = '',
}) => {
  const [internalText, setInternalText] = useState<string>(externalValue ?? '');
  const [isTruncated, setIsTruncated] = useState<boolean>(false);

  // Controlled input resolution: internal state prioritized unless controlled externally
  const currentText = externalValue !== undefined ? externalValue : internalText;

  const updateText = (newText: string) => {
    let sanitized = sanitizeInput(newText);
    let truncated = false;

    if (sanitized.length > MAX_INPUT_LENGTH) {
      sanitized = sanitized.slice(0, MAX_INPUT_LENGTH);
      truncated = true;
    }

    setIsTruncated(truncated);

    if (externalValue === undefined) {
      setInternalText(sanitized);
    }

    onTextChange?.(sanitized);
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    updateText(e.target.value);
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain') || '';
    const sanitizedPasted = sanitizeInput(pastedText);

    const textarea = e.currentTarget;
    const selectionStart = textarea.selectionStart ?? currentText.length;
    const selectionEnd = textarea.selectionEnd ?? currentText.length;

    const beforeSelection = currentText.slice(0, selectionStart);
    const afterSelection = currentText.slice(selectionEnd);

    const combinedText = beforeSelection + sanitizedPasted + afterSelection;
    updateText(combinedText);
  };

  const handleClear = () => {
    updateText('');
  };

  const handleLoadSample = () => {
    updateText(sampleCodeSnippet);
  };

  const formattedCount = currentText.length.toLocaleString('en-US');
  const formattedMax = MAX_INPUT_LENGTH.toLocaleString('en-US');

  return (
    <div data-testid="paste-input-panel" className={`flex flex-col h-full space-y-3 ${className}`}>
      {/* Header Bar: Title, Character Counter & Action Controls */}
      <div className="flex flex-wrap justify-between items-center pb-2 border-b border-surface-light-border dark:border-surface-dark-border gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-brand-primary">Source Input</h3>
          <span className="text-xs px-2 py-0.5 rounded bg-surface-light-bg dark:bg-surface-dark-bg text-surface-light-textSecondary dark:text-surface-dark-textSecondary border border-surface-light-border dark:border-surface-dark-border font-mono">
            Heap Memory Only
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time Character Counter with ARIA status */}
          <div
            data-testid="character-counter"
            aria-live="polite"
            className={`text-xs font-mono font-medium transition-colors ${
              currentText.length >= MAX_INPUT_LENGTH
                ? 'text-rose-500 font-bold'
                : 'text-surface-light-textSecondary dark:text-surface-dark-textSecondary'
            }`}
          >
            {formattedCount}/{formattedMax}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadSample}
              aria-label="Paste sample code"
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-surface-light-bg dark:bg-surface-dark-bg hover:bg-brand-primary/10 text-surface-light-textPrimary dark:text-surface-dark-textPrimary border border-surface-light-border dark:border-surface-dark-border transition-colors"
            >
              Sample Code
            </button>
            <button
              onClick={handleClear}
              disabled={currentText.length === 0}
              aria-label="Clear input"
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-surface-light-bg dark:bg-surface-dark-bg hover:bg-rose-500/10 hover:text-rose-500 text-surface-light-textSecondary dark:text-surface-dark-textSecondary border border-surface-light-border dark:border-surface-dark-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Truncation Warning Banner */}
      {isTruncated && (
        <div
          data-testid="truncation-warning"
          aria-live="polite"
          className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-medium flex items-center gap-2 animate-fade-rotate-in"
        >
          <span className="text-sm">⚠️</span>
          <span>Input limit reached (100,000 chars max). Content has been truncated.</span>
        </div>
      )}

      {/* Textarea Code Editor Area */}
      <div className="relative flex-1 flex flex-col min-h-[300px]">
        <textarea
          data-testid="paste-textarea"
          value={currentText}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder={placeholder}
          aria-label="Code or text input to scan for secrets"
          maxLength={MAX_INPUT_LENGTH}
          spellCheck={false}
          className="w-full flex-1 p-4 rounded-lg bg-surface-light-bg dark:bg-surface-dark-bg text-surface-light-textPrimary dark:text-surface-dark-textPrimary border border-surface-light-border dark:border-surface-dark-border font-mono text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all placeholder:text-surface-light-textSecondary/60 dark:placeholder:text-surface-dark-textSecondary/60"
        />
      </div>
    </div>
  );
};
