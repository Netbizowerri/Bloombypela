/**
 * ErrorBoundary - catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of a blank white page.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  readonly state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="max-w-lg mx-auto py-20 text-center">
          <h2 className="text-xl font-bold text-stone-900 mb-2">Something went wrong</h2>
          <p className="text-stone-600 mb-4">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
            }}
            className="px-4 py-2 text-xs rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
