import { ReactNode } from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback = ({ error, resetErrorBoundary }: ErrorFallbackProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4 text-center">
        <div className="mb-6">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Something went wrong
          </h1>
          <p className="text-muted-foreground mb-4">
            We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="text-left bg-muted p-4 rounded-lg mb-4">
              <summary className="cursor-pointer font-medium mb-2">
                Error Details (Development)
              </summary>
              <pre className="text-xs text-destructive whitespace-pre-wrap">
                {error.message}
                {error.stack}
              </pre>
            </details>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <Button onClick={resetErrorBoundary} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button 
            onClick={() => window.location.href = '/'} 
            variant="outline"
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
};

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (props: ErrorFallbackProps) => ReactNode;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
}

export const ErrorBoundary = ({ children, fallback, onError }: ErrorBoundaryProps) => {
  const handleError = (error: Error, errorInfo: { componentStack: string }) => {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    onError?.(error, errorInfo);

    // In production, you might want to send this to an error reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={fallback || ErrorFallback}
      onError={handleError}
      onReset={() => window.location.reload()}
    >
      {children}
    </ReactErrorBoundary>
  );
};

// Specialized error boundaries for different parts of the app
export const WorkspaceErrorBoundary = ({ children }: { children: ReactNode }) => {
  return (
    <ErrorBoundary
      fallback={({ error, resetErrorBoundary }) => (
        <div className="h-full flex items-center justify-center bg-background">
          <div className="text-center max-w-md mx-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Workspace Error</h2>
            <p className="text-muted-foreground mb-4">
              There was an error loading the workspace. Your data is safe.
            </p>
            <Button onClick={resetErrorBoundary}>
              Retry Loading
            </Button>
          </div>
        </div>
      )}
      onError={(error) => {
        console.error('Workspace error:', error);
        // Log workspace-specific errors
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export const DesignEditorErrorBoundary = ({ children }: { children: ReactNode }) => {
  return (
    <ErrorBoundary
      fallback={({ error, resetErrorBoundary }) => (
        <div className="h-full flex items-center justify-center bg-background">
          <div className="text-center max-w-md mx-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Design Editor Error</h2>
            <p className="text-muted-foreground mb-4">
              The design editor encountered an error. Your design has been auto-saved.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={resetErrorBoundary}>
                Reload Editor
              </Button>
              <Button onClick={() => window.history.back()} variant="outline">
                Go Back
              </Button>
            </div>
          </div>
        </div>
      )}
      onError={(error) => {
        console.error('Design editor error:', error);
        // Auto-save design before showing error
        // saveDesignToDraft();
      }}
    >
      {children}
    </ErrorBoundary>
  );
};