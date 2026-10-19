'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { T } from '@/components/T';

interface ClientErrorBoundaryProps {
  children: ReactNode;
  /** Names the widget in the console error. */
  label: string;
  /** Rendered instead of the widget after it throws; defaults to a short note. */
  fallback?: ReactNode;
}

/**
 * Contains a client widget's render/effect-phase error (a d3 or mermaid
 * exception, a comment-embed failure) to the widget itself. Without it the
 * error propagates to the route's error.tsx and replaces the whole page —
 * the article included — with the error screen.
 */
export default class ClientErrorBoundary extends Component<ClientErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.label}] failed to render:`, error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      this.props.fallback ?? (
        <p role="note" className="my-6 rounded-lg border border-line bg-ink/[0.03] p-4 text-sm text-muted">
          <T k="widget_error" />
        </p>
      )
    );
  }
}
