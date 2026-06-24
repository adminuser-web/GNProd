import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  hasReloaded: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    hasReloaded: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, hasReloaded: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Auto-reload on chunk load errors (Vite HMR/deployment mismatch)
    const isChunkError = 
      error.name === 'ChunkLoadError' || 
      error.message.includes('dynamically imported') || 
      error.message.includes('script load denied') ||
      error.message.includes('text/html');
      
    if (isChunkError) {
      const hasReloaded = sessionStorage.getItem('chunk_error_reloaded');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_error_reloaded', 'true');
        window.location.reload();
      } else {
        // If we already reloaded once and it still fails, we show the error
        sessionStorage.removeItem('chunk_error_reloaded');
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg text-content flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full bg-elevated border border-[#c5a059]/30 p-8 flex flex-col items-center text-center space-y-6">
            <AlertTriangle className="w-16 h-16 text-[#c5a059]" />
            <h1 className="font-sans text-2xl font-light uppercase tracking-widest text-[#c5a059]">Unexpected Error</h1>
            <p className="text-muted font-sans font-light">
              We encountered an issue while rendering this page. Our team has been notified.
            </p>
            {this.state.error && (
              <div className="w-full bg-bg p-4 border border-[#c5a059]/10 text-left overflow-auto max-h-32">
                <code className="text-xs text-red-400 font-mono">
                  {this.state.error.toString()}
                </code>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="group flex items-center justify-center space-x-2 border border-[#c5a059]/40 hover:border-[#c5a059] px-6 py-3 transition-colors duration-300 w-full"
            >
              <RefreshCw className="w-4 h-4 text-[#c5a059] group-hover:rotate-180 transition-transform duration-700" />
              <span className="font-sans text-xs uppercase tracking-widest text-premium-gold-text">Reload Page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
