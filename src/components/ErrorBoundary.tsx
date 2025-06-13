
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full text-center px-6">
            <div className="mb-8">
              <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-4xl">⚠️</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Oops! Something went wrong</h1>
              <p className="text-gray-600 mb-8">
                We're sorry, but something unexpected happened. Please try refreshing the page or return to the homepage.
              </p>
            </div>
            
            <div className="space-y-4">
              <Button onClick={this.handleRefresh} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Page
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Go to Homepage
              </Button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 text-left bg-gray-100 p-4 rounded-lg">
                <summary className="cursor-pointer font-medium">Error Details (Development)</summary>
                <pre className="mt-2 text-sm text-red-600 whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
