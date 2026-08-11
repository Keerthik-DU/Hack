import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PasteInputPanel, MAX_INPUT_LENGTH } from '../PasteInputPanel';
import { sampleCodeSnippet } from '../__fixtures__/paste-inputs';
import { sanitizeInput } from '@/infra';

describe('PasteInputPanel Component & Sanitization Integration', () => {
  it('renders controlled textarea with initial 0/100,000 character counter', () => {
    render(<PasteInputPanel />);

    const textarea = screen.getByRole('textbox', {
      name: /code or text input to scan for secrets/i,
    }) as HTMLTextAreaElement;

    expect(textarea).toBeDefined();
    expect(textarea.value).toBe('');
    expect(screen.getByTestId('character-counter').textContent).toBe('0/100,000');
  });

  it('updates text state, updates character counter, and invokes onTextChange when typing', () => {
    const handleTextChange = vi.fn();
    render(<PasteInputPanel onTextChange={handleTextChange} />);

    const textarea = screen.getByRole('textbox', {
      name: /code or text input to scan for secrets/i,
    });

    fireEvent.change(textarea, { target: { value: 'const token = "secret";' } });

    const expectedSanitized = 'const token = &quot;secret&quot;;';
    expect(screen.getByTestId('character-counter').textContent).toBe(
      `${expectedSanitized.length.toLocaleString('en-US')}/100,000`
    );
    expect(handleTextChange).toHaveBeenCalledWith(expectedSanitized);
  });

  it('intercepts onPaste event, delegates to InputSanitizer, and sanitizes XSS vectors', () => {
    const handleTextChange = vi.fn();
    render(<PasteInputPanel onTextChange={handleTextChange} />);

    const textarea = screen.getByRole('textbox', {
      name: /code or text input to scan for secrets/i,
    });

    const xssPayload = '<script>alert("XSS")</script>';

    fireEvent.paste(textarea, {
      clipboardData: {
        getData: (format: string) => (format === 'text/plain' ? xssPayload : ''),
      },
    });

    const expectedSanitized = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';
    expect((textarea as HTMLTextAreaElement).value).toBe(expectedSanitized);
    expect(handleTextChange).toHaveBeenCalledWith(expectedSanitized);
  });

  it('enforces 100,000-character max limit and shows truncation warning indicator', () => {
    const handleTextChange = vi.fn();
    render(<PasteInputPanel onTextChange={handleTextChange} />);

    const textarea = screen.getByRole('textbox', {
      name: /code or text input to scan for secrets/i,
    });

    const oversizedText = 'A'.repeat(MAX_INPUT_LENGTH + 500);

    fireEvent.change(textarea, { target: { value: oversizedText } });

    expect((textarea as HTMLTextAreaElement).value.length).toBe(MAX_INPUT_LENGTH);
    expect(screen.getByTestId('character-counter').textContent).toBe('100,000/100,000');
    expect(screen.getByTestId('truncation-warning')).toBeDefined();
    expect(screen.getByText(/input limit reached/i)).toBeDefined();
    expect(handleTextChange).toHaveBeenCalledWith('A'.repeat(MAX_INPUT_LENGTH));
  });

  it('clears input state and resets character counter when Clear button is clicked', () => {
    const handleTextChange = vi.fn();
    render(<PasteInputPanel value="some secret content" onTextChange={handleTextChange} />);

    const clearBtn = screen.getByRole('button', { name: /clear input/i });
    fireEvent.click(clearBtn);

    expect(handleTextChange).toHaveBeenCalledWith('');
  });

  it('populates textarea with sanitized sample code when Sample Code button is clicked', () => {
    const handleTextChange = vi.fn();
    render(<PasteInputPanel onTextChange={handleTextChange} />);

    const sampleBtn = screen.getByRole('button', { name: /paste sample code/i });
    fireEvent.click(sampleBtn);

    expect(handleTextChange).toHaveBeenCalledWith(sanitizeInput(sampleCodeSnippet));
  });

  it('has accessible ARIA attributes and polite live region', () => {
    render(<PasteInputPanel />);

    const counter = screen.getByTestId('character-counter');
    expect(counter.getAttribute('aria-live')).toBe('polite');

    const textarea = screen.getByRole('textbox', {
      name: /code or text input to scan for secrets/i,
    });
    expect(textarea.getAttribute('aria-label')).toBe('Code or text input to scan for secrets');
  });
});
