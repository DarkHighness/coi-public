import React, { Component, ErrorInfo, ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback UI to display when an error occurs */
  fallback?: ReactNode;
  /** Optional name for identifying which boundary caught the error */
  name?: string;
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show a retry button */
  showRetry?: boolean;
  /** Whether to propagate the error to parent boundaries */
  propagate?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component for catching and handling React errors.
 * Can be used at various levels of the component tree to provide
 * graceful degradation and user-friendly error messages.
 */
class ErrorBoundaryClass extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { name, onError, propagate } = this.props;

    console.error(
      `[ErrorBoundary${name ? `:${name}` : ""}] Caught error:`,
      error,
      errorInfo,
    );

    this.setState({ errorInfo });

    if (onError) {
      onError(error, errorInfo);
    }

    // If propagate is true, re-throw to parent boundary
    if (propagate) {
      throw error;
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, showRetry = true, name } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <ErrorFallbackUI
          error={error}
          onRetry={showRetry ? this.handleRetry : undefined}
          boundaryName={name}
        />
      );
    }

    return children;
  }
}

/**
 * Default fallback UI for error states
 */
interface ErrorFallbackUIProps {
  error: Error | null;
  onRetry?: () => void;
  boundaryName?: string;
}

function ErrorFallbackUI({
  error,
  onRetry,
  boundaryName,
}: ErrorFallbackUIProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-[200px] bg-red-900/10 border border-red-500/30 rounded-lg m-2">
      <div className="text-3xl mb-4">⚠️</div>
      <h3 className="text-lg font-semibold text-red-400 mb-2">
        {t("errorPanel.componentError", { defaultValue: "Something went wrong" })}
      </h3>
      <p className="text-sm text-theme-muted text-center mb-4 max-w-md">
        {t("errorPanel.componentDescription", {
          defaultValue:
            "This section encountered an errorPanel. You can try again or continue using other parts of the app.",
        })}
      </p>
      {error && (
        <div className="bg-black/30 p-3 rounded text-left overflow-auto max-h-24 w-full max-w-md mb-4">
          <p className="text-xs text-red-400 font-mono break-all">
            {error.message || "Unknown error"}
          </p>
        </div>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-theme-primary/20 hover:bg-theme-primary/30 text-theme-primary border border-theme-primary/30 rounded transition-colors text-sm"
        >
          {t("errorPanel.retry", { defaultValue: "Try Again" })}
        </button>
      )}
      {boundaryName && (
        <p className="text-xs text-theme-muted/50 mt-2">
          Component: {boundaryName}
        </p>
      )}
    </div>
  );
}

/**
 * Inline/compact error fallback for smaller components
 */
interface InlineErrorFallbackProps {
  error?: Error | null;
  message?: string;
  onRetry?: () => void;
}

export function InlineErrorFallback({
  error,
  message,
  onRetry,
}: InlineErrorFallbackProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-900/10 border border-red-500/30 rounded text-sm">
      <span className="text-red-400">⚠️</span>
      <span className="text-theme-muted flex-1">
        {message || error?.message || "Error loading content"}
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-theme-primary hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Section-level error boundary for major UI sections
 */
export function SectionErrorBoundary({
  children,
  name,
  onError,
}: {
  children: ReactNode;
  name: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}): React.ReactElement {
  return (
    <ErrorBoundaryClass name={name} onError={onError} showRetry={true}>
      {children}
    </ErrorBoundaryClass>
  );
}

/**
 * Card/item level error boundary for smaller components
 */
export function ItemErrorBoundary({
  children,
  name,
}: {
  children: ReactNode;
  name?: string;
}): React.ReactElement {
  return (
    <ErrorBoundaryClass
      name={name}
      showRetry={true}
      fallback={<InlineErrorFallback message="Failed to render item" />}
    >
      {children}
    </ErrorBoundaryClass>
  );
}

/**
 * Silent error boundary that logs but shows nothing on error
 * Useful for non-critical decorative components
 */
export function SilentErrorBoundary({
  children,
  name,
}: {
  children: ReactNode;
  name?: string;
}): React.ReactElement {
  return (
    <ErrorBoundaryClass name={name} fallback={null} showRetry={false}>
      {children}
    </ErrorBoundaryClass>
  );
}

export default ErrorBoundaryClass;
export { ErrorBoundaryClass as ErrorBoundary };
