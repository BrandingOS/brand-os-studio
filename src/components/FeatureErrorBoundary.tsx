import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface FeatureErrorBoundaryProps {
  children: React.ReactNode;
  /** Human-readable name of the feature for the error message */
  feature?: string;
  /** Optional compact mode for inline features (vs full-page) */
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Feature-level error boundary — catches errors in a specific feature
 * module without taking down the whole app. Offers retry.
 *
 * Usage:
 *   <FeatureErrorBoundary feature="Brand Kit">
 *     <BrandKitModuleView ... />
 *   </FeatureErrorBoundary>
 */
export class FeatureErrorBoundary extends React.Component<FeatureErrorBoundaryProps, State> {
  constructor(props: FeatureErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[FeatureErrorBoundary:${this.props.feature || 'unknown'}]`, error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { feature, compact } = this.props;

    if (compact) {
      return (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-sm text-destructive">
            {feature ? `${feature} failed to load.` : 'Something went wrong.'}
          </span>
          <button
            onClick={this.handleRetry}
            className="ml-auto text-xs text-destructive underline hover:no-underline flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center max-w-sm mx-auto p-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {feature ? `${feature} encountered an error` : 'Something went wrong'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            This section failed to load. You can retry or navigate elsewhere.
          </p>
          {this.state.error && (
            <pre className="text-xs text-left bg-muted p-3 rounded-md mb-4 overflow-auto max-h-24 text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      </div>
    );
  }
}
