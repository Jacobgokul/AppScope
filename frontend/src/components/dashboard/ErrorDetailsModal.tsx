import { X, AlertTriangle, Clock, FileText, Server } from 'lucide-react'
import type { LogEvent } from '../../types'

interface ErrorDetailsModalProps {
  error: LogEvent
  onClose: () => void
}

export default function ErrorDetailsModal({ error, onClose }: ErrorDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 border border-dark-700 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Error Details</h3>
              <p className="text-sm text-gray-500">ID: {error.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-4">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-dark-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Clock className="w-4 h-4" />
                Timestamp
              </div>
              <div className="text-white font-medium">
                {new Date(error.timestamp).toLocaleString()}
              </div>
            </div>

            <div className="bg-dark-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <AlertTriangle className="w-4 h-4" />
                Level
              </div>
              <div className="text-white font-medium">
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    error.level === 'error'
                      ? 'bg-red-500/20 text-red-400'
                      : error.level === 'warn'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {error.level.toUpperCase()}
                </span>
              </div>
            </div>

            {error.source && (
              <div className="bg-dark-900 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <FileText className="w-4 h-4" />
                  Source
                </div>
                <div className="text-white font-medium text-sm truncate">
                  {error.source}
                </div>
              </div>
            )}

            {error.service && (
              <div className="bg-dark-900 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Server className="w-4 h-4" />
                  Service
                </div>
                <div className="text-white font-medium">{error.service}</div>
              </div>
            )}
          </div>

          {/* HTTP Details */}
          {(error.http_method || error.http_path || error.http_status || error.response_time_ms) && (
            <div className="bg-dark-900 rounded-lg p-4">
              <h4 className="text-gray-500 text-sm font-medium mb-3">HTTP Request</h4>
              <div className="grid grid-cols-2 gap-3">
                {error.http_method && error.http_path && (
                  <div>
                    <span className="text-gray-500 text-xs">Request</span>
                    <div className="text-white font-mono text-sm">
                      <span className="text-primary-500">{error.http_method}</span>{' '}
                      {error.http_path}
                    </div>
                  </div>
                )}
                {error.http_status && (
                  <div>
                    <span className="text-gray-500 text-xs">Status</span>
                    <div className="text-white font-mono text-sm">
                      <span
                        className={
                          error.http_status >= 500
                            ? 'text-red-400'
                            : error.http_status >= 400
                            ? 'text-yellow-400'
                            : 'text-green-400'
                        }
                      >
                        {error.http_status}
                      </span>
                    </div>
                  </div>
                )}
                {error.response_time_ms && (
                  <div>
                    <span className="text-gray-500 text-xs">Response Time</span>
                    <div className="text-white font-mono text-sm">
                      {error.response_time_ms}ms
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Message */}
          <div className="bg-dark-900 rounded-lg p-4">
            <h4 className="text-gray-500 text-sm font-medium mb-2">Message</h4>
            <div className="text-white font-mono text-sm break-words whitespace-pre-wrap">
              {error.message}
            </div>
          </div>

          {/* Stack Trace */}
          {error.stack_trace && (
            <div className="bg-dark-900 rounded-lg p-4">
              <h4 className="text-gray-500 text-sm font-medium mb-2">Stack Trace</h4>
              <div className="text-red-400 font-mono text-xs break-words whitespace-pre-wrap overflow-x-auto">
                {error.stack_trace}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-dark-700 p-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-dark-700 text-white rounded-lg font-medium hover:bg-dark-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
