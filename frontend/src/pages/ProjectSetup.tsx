import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Check, Terminal, Loader2 } from 'lucide-react'
import { projectsApi } from '../api/projects'
import { useProjectStore, useAuthStore } from '../store'
import axios from 'axios'

export default function ProjectSetup() {
  const navigate = useNavigate()
  const { addProject, setCurrentProject } = useProjectStore()
  const { isAuthenticated } = useAuthStore()

  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [environment, setEnvironment] = useState('production')
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [copied, setCopied] = useState(false)

  // Debug: Check authentication status
  console.log('Auth status in ProjectSetup:', isAuthenticated)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('Creating project with data:', { name, environment })
      const result = await projectsApi.create({ name, environment })
      console.log('API response:', result)
      console.log('API key from response:', result.api_key)

      if (!result.api_key) {
        console.error('No API key in response:', result)
        alert('Error: API key not received from server')
        return
      }

      addProject(result.project)
      setCurrentProject(result.project)
      setApiKey(result.api_key)
      setStep(2)
    } catch (err) {
      console.error('Failed to create project', err)
      if (axios.isAxiosError(err)) {
        if (err.response) {
          console.error('Error response:', err.response.status, err.response.data)
          const detail = err.response.data?.detail || 'Unknown error'
          alert(`Error creating project: ${detail}`)
        } else if (err.request) {
          console.error('No response received:', err.request)
          alert('Error: No response from server. Is the backend running?')
        } else {
          console.error('Error:', err.message)
          alert(`Error: ${err.message}`)
        }
      } else {
        console.error('Unknown error:', err)
        alert('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const publicUrl = import.meta.env.VITE_PUBLIC_URL || 'http://localhost:8000'
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const installCommand = `curl -sSL ${publicUrl}/install.sh | bash -s -- --key ${apiKey || 'YOUR_API_KEY'} --server ${apiUrl}`

  // Debug logging
  console.log('Current apiKey state:', apiKey, 'type:', typeof apiKey)

  return (
    <div className="mt-16 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary-400' : 'text-gray-500'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary-500 text-dark-900' : 'bg-dark-700'}`}>
            1
          </div>
          <span>Create Project</span>
        </div>
        <div className="flex-1 h-px bg-dark-700" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary-400' : 'text-gray-500'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary-500 text-dark-900' : 'bg-dark-700'}`}>
            2
          </div>
          <span>Install Agent</span>
        </div>
      </div>

      {step === 1 ? (
        <form onSubmit={handleCreate} className="bg-dark-800 rounded-xl border border-dark-700 p-8">
          <h2 className="text-xl font-semibold mb-6">Create New Project</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                placeholder="my-awesome-app"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Environment</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-500 text-dark-900 rounded-lg font-semibold hover:bg-primary-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              Create Project
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Check className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Project Created!</h2>
              <p className="text-gray-500 text-sm">Now install the agent on your server</p>
            </div>
          </div>

          {/* API Key */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Your API Key</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-primary-400 font-mono text-sm">
                {apiKey}
              </code>
              <button
                onClick={copyToClipboard}
                className="p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-yellow-500 text-sm mt-2">
              Save this key! You won't be able to see it again.
            </p>
          </div>

          {/* Install Command */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">
              <Terminal className="w-4 h-4 inline mr-1" />
              Run this command on your Linux server
            </label>
            <div className="relative">
              <pre className="px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-gray-300 font-mono text-sm overflow-x-auto">
                {installCommand}
              </pre>
            </div>
            <p className="text-gray-500 text-sm mt-2">
              This command requires a Linux server with bash. SSH into your server first.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-3 bg-primary-500 text-dark-900 rounded-lg font-semibold hover:bg-primary-400 transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate('/projects')}
              className="px-6 py-3 border border-dark-600 text-gray-300 rounded-lg hover:border-dark-500 transition-colors"
            >
              View Projects
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
