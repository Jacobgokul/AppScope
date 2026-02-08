import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, RefreshCw, Check } from 'lucide-react'

type ConnectionStatus = 'connecting' | 'failed' | 'success'

interface ConnectionStep {
  label: string
  status: 'complete' | 'loading' | 'pending' | 'failed'
}

interface ConnectAgentModalProps {
  isOpen: boolean
  status: ConnectionStatus
  onClose: () => void
  onRetry: () => void
  onBackToSetup: () => void
}

export default function ConnectAgentModal({
  isOpen,
  status,
  onClose,
  onRetry,
  onBackToSetup,
}: ConnectAgentModalProps) {
  // Auto-close on success after a short delay
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        onClose()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [status, onClose])

  const getSteps = (): ConnectionStep[] => {
    switch (status) {
      case 'connecting':
        return [
          { label: 'Validating API key', status: 'complete' },
          { label: 'Reaching server endpoint', status: 'complete' },
          { label: 'Waiting for agent heartbeat...', status: 'loading' },
          { label: 'Fetching initial metrics', status: 'pending' },
        ]
      case 'failed':
        return [
          { label: 'Validating API key', status: 'complete' },
          { label: 'Reaching server endpoint', status: 'complete' },
          { label: 'Waiting for agent heartbeat...', status: 'failed' },
          { label: 'Fetching initial metrics', status: 'pending' },
        ]
      case 'success':
        return [
          { label: 'Validating API key', status: 'complete' },
          { label: 'Reaching server endpoint', status: 'complete' },
          { label: 'Agent heartbeat received', status: 'complete' },
          { label: 'Fetching initial metrics', status: 'complete' },
        ]
      default:
        return []
    }
  }

  const renderStepIcon = (stepStatus: ConnectionStep['status']) => {
    switch (stepStatus) {
      case 'complete':
        return (
          <Check className="w-5 h-5 text-green-400" strokeWidth={2.5} />
        )
      case 'loading':
        return (
          <RefreshCw className="w-5 h-5 text-primary-400 animate-spin" />
        )
      case 'failed':
        return (
          <X className="w-5 h-5 text-red-400" strokeWidth={2.5} />
        )
      case 'pending':
        return (
          <div className="w-5 h-5 rounded-full border-2 border-dark-500"></div>
        )
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={status === 'connecting' ? undefined : onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-dark-800 border border-dark-600 rounded-3xl max-w-lg w-full text-center shadow-2xl"
            >
              <div className="p-10">
                {status === 'connecting' && (
                  <>
                    {/* Connecting Animation */}
                    <div className="relative w-40 h-40 mx-auto mb-8">
                      {/* Server Icon */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-16 h-16 bg-dark-700 rounded-2xl flex items-center justify-center border border-dark-600">
                        <svg
                          className="w-8 h-8 text-primary-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                          />
                        </svg>
                      </div>

                      {/* Connection Line */}
                      <div className="absolute left-16 right-16 top-1/2 -translate-y-1/2 h-1 bg-dark-600 overflow-hidden rounded">
                        <motion.div
                          className="h-full w-1/2 bg-gradient-to-r from-transparent via-primary-500 to-transparent"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        />
                      </div>

                      {/* Agent Icon */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-16 h-16 bg-primary-500/20 rounded-2xl flex items-center justify-center border border-primary-500/30">
                        <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
                      </div>
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-3">Connecting to Agent...</h1>
                    <p className="text-gray-400 mb-6">
                      Attempting to establish connection with your server
                    </p>
                  </>
                )}

                {status === 'failed' && (
                  <>
                    {/* Error Icon */}
                    <div className="w-24 h-24 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center border-2 border-red-500/30">
                      <AlertTriangle className="w-12 h-12 text-red-400" />
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-3">Connection Failed</h1>
                    <p className="text-gray-400 mb-6">
                      We couldn't detect the agent running on your server
                    </p>

                    {/* Error Details */}
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-left">
                      <p className="text-red-400 text-sm font-medium mb-2">Possible reasons:</p>
                      <ul className="text-red-300/80 text-sm space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-red-400">•</span>
                          Agent is not installed or not running
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-400">•</span>
                          Firewall blocking outbound connections
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-400">•</span>
                          Incorrect API key or server URL in config
                        </li>
                      </ul>
                    </div>

                    {/* Troubleshooting */}
                    <div className="bg-dark-700/50 rounded-xl p-4 mb-6 text-left">
                      <p className="text-gray-300 text-sm font-medium mb-3">Troubleshooting steps:</p>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-dark-600 flex items-center justify-center text-xs text-gray-400">
                            1
                          </span>
                          <div>
                            <p className="text-gray-300">Check if agent is running:</p>
                            <code className="text-primary-400 text-xs">sudo systemctl status appscope</code>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-dark-600 flex items-center justify-center text-xs text-gray-400">
                            2
                          </span>
                          <div>
                            <p className="text-gray-300">View agent logs:</p>
                            <code className="text-primary-400 text-xs">sudo journalctl -u appscope -f</code>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-dark-600 flex items-center justify-center text-xs text-gray-400">
                            3
                          </span>
                          <div>
                            <p className="text-gray-300">Restart agent:</p>
                            <code className="text-primary-400 text-xs">sudo systemctl restart appscope</code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {status === 'success' && (
                  <>
                    {/* Success Icon */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className="w-24 h-24 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/30"
                    >
                      <Check className="w-12 h-12 text-green-400" strokeWidth={3} />
                    </motion.div>

                    <h1 className="text-2xl font-bold text-white mb-3">Connected Successfully!</h1>
                    <p className="text-gray-400 mb-6">
                      Your agent is now connected and sending data
                    </p>
                  </>
                )}

                {/* Progress Steps */}
                <div className="bg-dark-700/50 rounded-xl p-4 mb-6 text-left">
                  <div className="space-y-3">
                    {getSteps().map((step, index) => (
                      <div key={index} className="flex items-center gap-3">
                        {renderStepIcon(step.status)}
                        <span
                          className={`text-sm ${
                            step.status === 'pending'
                              ? 'text-gray-500'
                              : step.status === 'failed'
                              ? 'text-red-400'
                              : step.status === 'loading'
                              ? 'text-gray-400'
                              : 'text-gray-300'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                {status === 'connecting' && (
                  <button
                    onClick={onClose}
                    className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                )}

                {status === 'failed' && (
                  <div className="space-y-3">
                    <button
                      onClick={onRetry}
                      className="w-full py-4 px-6 bg-gradient-to-r from-primary-500 to-purple-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-purple-700 transition-all shadow-lg shadow-primary-500/25"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={onBackToSetup}
                      className="w-full py-4 px-6 bg-dark-700 text-gray-300 font-medium rounded-xl hover:bg-dark-600 transition-all border border-dark-600"
                    >
                      Back to Setup Guide
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
