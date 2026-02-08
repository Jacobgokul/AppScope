import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Key, Download, Settings, Zap, Copy, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface SetupGuideProps {
  projectName: string
  apiKey: string
  serverUrl: string
  onConnectClick: () => void
}

export default function SetupGuide({
  projectName,
  apiKey,
  serverUrl,
  onConnectClick,
}: SetupGuideProps) {
  const navigate = useNavigate()
  const [copiedField, setCopiedField] = useState<'server' | 'key' | 'command' | null>(null)

  const handleCopy = async (text: string, field: 'server' | 'key' | 'command') => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const installCommand = apiKey
    ? `curl -sSL ${serverUrl}/install.sh | bash -s -- --key ${apiKey} --server ${serverUrl}`
    : `curl -sSL ${serverUrl}/install.sh | bash -s -- --key YOUR_API_KEY --server ${serverUrl}`

  const configExample = `# /etc/appscope/config.yaml

api_key: "${apiKey || 'YOUR_API_KEY'}"
server_url: "${serverUrl}"
service_name: "default"  # Change to identify your service (e.g., "backend-api", "frontend")

# Log files to monitor
logs:
  - /var/log/myapp/app.log
  - /var/log/nginx/access.log
  - /var/log/nginx/error.log

# Database monitoring (optional)
database:
  type: postgres
  host: localhost
  port: 5432
  user: monitor_readonly

# System metrics
system_metrics: true
collection_interval: 30`

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="border-b border-dark-700 bg-dark-800/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full border border-yellow-500/30">
              Setup Required
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Project Title */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">{projectName}</h1>
          <p className="text-gray-400">Complete the setup to start monitoring your application</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center gap-4 mb-12 p-4 bg-dark-800/50 rounded-xl border border-dark-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold">
              1
            </div>
            <span className="text-white font-medium">Get Credentials</span>
          </div>
          <div className="flex-1 h-1 bg-dark-600 rounded">
            <div className="h-full w-1/3 bg-primary-500 rounded"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-gray-400 text-sm font-bold">
              2
            </div>
            <span className="text-gray-400 font-medium">Install Agent</span>
          </div>
          <div className="flex-1 h-1 bg-dark-600 rounded"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-gray-400 text-sm font-bold">
              3
            </div>
            <span className="text-gray-400 font-medium">Connect</span>
          </div>
        </div>

        {/* Step 1: Credentials */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Step 1: Your Credentials</h2>
              <p className="text-gray-400 text-sm">Keep these safe - you'll need them to connect your agent</p>
            </div>
          </div>

          <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6 space-y-5">
            {/* Server URL */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Server URL</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-dark-700 rounded-xl px-4 py-3 font-mono text-sm text-gray-300 border border-dark-600">
                  {serverUrl}
                </div>
                <button
                  onClick={() => handleCopy(serverUrl, 'server')}
                  className="px-4 py-3 bg-dark-700 hover:bg-dark-600 rounded-xl border border-dark-600 transition-all group"
                >
                  {copiedField === 'server' ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-400 group-hover:text-white" />
                  )}
                </button>
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">API Key</label>
              {apiKey ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-dark-700 rounded-xl px-4 py-3 font-mono text-sm text-gray-300 border border-dark-600 break-all">
                      {apiKey}
                    </div>
                    <button
                      onClick={() => handleCopy(apiKey, 'key')}
                      className="px-4 py-3 bg-dark-700 hover:bg-dark-600 rounded-xl border border-dark-600 transition-all group"
                    >
                      {copiedField === 'key' ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <Copy className="w-5 h-5 text-gray-400 group-hover:text-white" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    This key is shown only once. Store it securely!
                  </p>
                </>
              ) : (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 text-sm font-medium mb-1">API Key Not Available</p>
                  <p className="text-red-300/80 text-xs">
                    The API key was shown only during project creation. Go to Settings &gt; API Keys to generate a new one.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: Install Agent */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center">
              <Download className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Step 2: Install the Agent</h2>
              <p className="text-gray-400 text-sm">Run this command on your server</p>
            </div>
          </div>

          <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6">
            <div className="bg-dark-900 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500">Terminal</span>
                <button
                  onClick={() => handleCopy(installCommand, 'command')}
                  className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                >
                  {copiedField === 'command' ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="text-sm text-green-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                {installCommand}
              </pre>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <svg
                className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">Requirements</p>
                <ul className="list-disc list-inside text-blue-300/80 space-y-1">
                  <li>Linux server (Ubuntu, Debian, CentOS, etc.)</li>
                  <li>Root or sudo access</li>
                  <li>Outbound internet access to reach AppScope server</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Configure (Optional) */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center">
              <Settings className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Step 3: Configure (Optional)</h2>
              <p className="text-gray-400 text-sm">Customize monitoring settings on your server</p>
            </div>
          </div>

          <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6">
            <p className="text-gray-400 text-sm mb-4">
              Edit the config file at <code className="text-primary-400">/etc/appscope/config.yaml</code>
            </p>
            <div className="bg-dark-900 rounded-xl p-4 overflow-x-auto">
              <pre className="text-sm text-gray-300 font-mono whitespace-pre">{configExample}</pre>
            </div>
          </div>
        </div>

        {/* Connect Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary-500/10 to-purple-500/10 border border-primary-500/20 rounded-2xl p-8 text-center"
        >
          <h3 className="text-xl font-bold text-white mb-2">Ready to connect?</h3>
          <p className="text-gray-400 mb-6">
            Click below to verify your agent is running and start monitoring
          </p>
          <button
            onClick={onConnectClick}
            className="px-8 py-4 bg-gradient-to-r from-primary-500 to-purple-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-purple-700 transition-all shadow-lg shadow-primary-500/25 text-lg flex items-center gap-3 mx-auto"
          >
            <Zap className="w-6 h-6" />
            Connect Agent
          </button>
        </motion.div>
      </main>
    </div>
  )
}
