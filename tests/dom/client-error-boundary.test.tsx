import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/components/LanguageProvider';
import ClientErrorBoundary from '@/components/ClientErrorBoundary';

function Boom(): never {
  throw new Error('widget exploded');
}

function withQuietConsole(run: () => void) {
  const original = console.error;
  console.error = mock(() => {});
  try {
    run();
  } finally {
    console.error = original;
  }
}

describe('ClientErrorBoundary', () => {
  test('renders children when nothing throws', () => {
    render(<ClientErrorBoundary label="t"><p>fine</p></ClientErrorBoundary>);
    expect(screen.getByText('fine')).toBeTruthy();
  });

  test('contains a throwing widget: siblings keep rendering, a note replaces it', () => {
    withQuietConsole(() => {
      render(
        <LanguageProvider>
          <article>
            <p>article text</p>
            <ClientErrorBoundary label="widget"><Boom /></ClientErrorBoundary>
          </article>
        </LanguageProvider>,
      );
    });
    expect(screen.getByText('article text')).toBeTruthy();
    expect(screen.getByRole('note').textContent).toBe("This section couldn't be loaded.");
  });

  test('uses a custom fallback when given', () => {
    withQuietConsole(() => {
      render(<ClientErrorBoundary label="w" fallback={<span>custom</span>}><Boom /></ClientErrorBoundary>);
    });
    expect(screen.getByText('custom')).toBeTruthy();
  });
});
