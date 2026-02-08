import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary component to catch React render errors
 * Prevents the entire app from crashing when a component throws an error
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    })

    // TODO: Send error to logging service (e.g., Sentry)
    // logErrorToService(error, errorInfo)
  }

  handleReload = () => {
    // Reset error state and reload the page
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
    window.location.reload()
  }

  handleReset = () => {
    // Reset error state without reloading
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
          <div className="max-w-lg w-full">
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-8 text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="w-16 h-16 text-red-500" />
              </div>

              <h1 className="text-2xl font-bold text-white mb-2">
                Something went wrong
              </h1>

              <p className="text-gray-400 mb-6">
                We encountered an unexpected error. Please try reloading the page.
              </p>

              {/* Show error details in development mode */}
              {import.meta.env && import.meta.env.DEV && this.state.error && (
                <div className="mb-6 text-left">
                  <details className="bg-dark-700 rounded-lg p-4 text-sm">
                    <summary className="text-gray-300 cursor-pointer mb-2">
                      Error Details (Dev Mode)
                    </summary>
                    <div className="text-red-400 font-mono text-xs overflow-auto">
                      <p className="mb-2">
                        <strong>Error:</strong> {this.state.error.message}
                      </p>
                      {this.state.error.stack && (
                        <pre className="whitespace-pre-wrap break-words">
                          {this.state.error.stack}
                        </pre>
                      )}
                      {this.state.errorInfo?.componentStack && (
                        <div className="mt-2">
                          <strong>Component Stack:</strong>
                          <pre className="whitespace-pre-wrap break-words">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <button
                  onClick={this.handleReload}
                  className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-dark-900 rounded-lg font-semibold hover:bg-primary-400 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  Reload Page
                </button>

                <button
                  onClick={this.handleReset}
                  className="px-6 py-3 bg-dark-700 text-gray-300 rounded-lg font-semibold hover:bg-dark-600 transition-colors"
                >
                  Try Again
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-6">
                If this problem persists, please contact support
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
