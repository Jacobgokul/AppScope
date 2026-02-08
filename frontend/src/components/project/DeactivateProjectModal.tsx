import { useState } from 'react'
import Modal from '../ui/Modal'
import { AlertTriangle, Power, WifiOff, Terminal, Loader2 } from 'lucide-react'
import { projectsApi } from '../../api/projects'

interface DeactivateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectName: string
  scenario: 'user-initiated' | 'agent-disconnected'
  onDeactivateSuccess?: () => void
  onReconnectAttempt?: () => void
}

export default function DeactivateProjectModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  scenario,
  onDeactivateSuccess,
  onReconnectAttempt,
}: DeactivateProjectModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDeactivate = async () => {
    setLoading(true)
    setError(null)

    try {
      await projectsApi.deactivate(projectId)
      onDeactivateSuccess?.()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to deactivate project')
    } finally {
      setLoading(false)
    }
  }

  const handleReconnect = () => {
    onReconnectAttempt?.()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" closeOnOverlayClick={!loading}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-2">
              {scenario === 'user-initiated'
                ? 'Deactivate Project'
                : 'Agent Disconnected'}
            </h3>
            <p className="text-gray-400 text-sm">
              {scenario === 'user-initiated'
                ? `You are about to deactivate "${projectName}"`
                : `The agent for "${projectName}" is no longer connected`}
            </p>
          </div>
        </div>

        {/* User-Initiated Scenario */}
        {scenario === 'user-initiated' && (
          <div className="space-y-4">
            {/* Warning Box */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <WifiOff className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-200">
                  <p className="font-semibold mb-2">Before you deactivate, please stop the agent:</p>
                  <ol className="list-decimal list-inside space-y-1 text-yellow-200/90">
                    <li>SSH into your server where the agent is running</li>
                    <li>Stop the agent service</li>
                    <li>Wait a few moments for the connection to terminate</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Stop Agent Instructions */}
            <div className="bg-dark-700/50 border border-dark-600 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="w-4 h-4 text-primary-400" />
                <span className="text-sm font-semibold text-white">How to stop the agent:</span>
              </div>
              <div className="space-y-2">
                <div className="bg-black/40 rounded p-3 font-mono text-sm text-gray-300">
                  sudo systemctl stop appscope-agent
                </div>
                <p className="text-xs text-gray-500">
                  Or if you installed it manually:
                </p>
                <div className="bg-black/40 rounded p-3 font-mono text-sm text-gray-300">
                  pkill -f appscope
                </div>
              </div>
            </div>

            {/* What Happens */}
            <div className="bg-dark-700/30 border border-dark-600/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-white mb-2">What happens when you deactivate:</h4>
              <ul className="space-y-1 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-primary-400 mt-0.5">•</span>
                  <span>Project status changes to inactive</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-400 mt-0.5">•</span>
                  <span>Data ingestion stops (new metrics/logs won't be collected)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-400 mt-0.5">•</span>
                  <span>All historical data is preserved</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-400 mt-0.5">•</span>
                  <span>You can reactivate the project anytime</span>
                </li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Agent Disconnected Scenario */}
        {scenario === 'agent-disconnected' && (
          <div className="space-y-4">
            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <WifiOff className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-200">
                  <p className="font-semibold mb-2">The agent connection has been lost</p>
                  <p className="text-blue-200/90">
                    This could be due to network issues, server downtime, or the agent being stopped.
                  </p>
                </div>
              </div>
            </div>

            {/* Reconnect Instructions */}
            <div className="bg-dark-700/50 border border-dark-600 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-white mb-3">To reconnect the agent:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                <li>Check if your server is running</li>
                <li>SSH into your server</li>
                <li>Verify the agent process is running:
                  <div className="bg-black/40 rounded p-2 font-mono text-xs text-gray-300 mt-1 ml-5">
                    sudo systemctl status appscope-agent
                  </div>
                </li>
                <li>If stopped, restart it:
                  <div className="bg-black/40 rounded p-2 font-mono text-xs text-gray-300 mt-1 ml-5">
                    sudo systemctl start appscope-agent
                  </div>
                </li>
                <li>Check agent logs for errors:
                  <div className="bg-black/40 rounded p-2 font-mono text-xs text-gray-300 mt-1 ml-5">
                    sudo journalctl -u appscope-agent -f
                  </div>
                </li>
              </ol>
            </div>

            {/* Options */}
            <div className="bg-dark-700/30 border border-dark-600/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-white mb-2">Your options:</h4>
              <ul className="space-y-1 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">•</span>
                  <span><strong className="text-gray-300">Try to reconnect:</strong> Fix the issue and wait for the agent to reconnect automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">•</span>
                  <span><strong className="text-gray-300">Deactivate:</strong> Stop monitoring for now, preserving all historical data</span>
                </li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-dark-700">
          {scenario === 'user-initiated' ? (
            <>
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deactivating...
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4" />
                    Deactivate Project
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleDeactivate}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deactivating...
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4" />
                    Deactivate
                  </>
                )}
              </button>
              <button
                onClick={handleReconnect}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <WifiOff className="w-4 h-4" />
                Try to Reconnect
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
