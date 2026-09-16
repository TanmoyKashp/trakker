import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F3ED] px-4 text-[#242424]">
          <div className="card-shadow w-full max-w-md rounded-2xl border border-stone-300/80 bg-[#FFFCF7] p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#242424]">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              An unexpected error occurred while rendering this page. Your data is safe.
            </p>
            {this.state.error?.message && (
              <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-left font-mono text-xs text-stone-700 overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-[#242424] px-4 py-2.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50"
              >
                <Home className="h-3.5 w-3.5" />
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
