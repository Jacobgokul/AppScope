import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import type { CreateProjectData } from '../../api/projects'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (projectId: string, apiKey: string) => void
}

export default function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)

  const [formData, setFormData] = useState<CreateProjectData>({
    name: '',
    description: '',
    environment: 'production',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await projectsApi.create(formData)
      setProjectId(response.project.id)

      // Store API key in sessionStorage temporarily for setup guide
      if (response.api_key) {
        sessionStorage.setItem(`project_${response.project.id}_api_key`, response.api_key)
      }

      setStep('success')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = () => {
    if (projectId) {
      const storedApiKey = sessionStorage.getItem(`project_${projectId}_api_key`) || ''
      onSuccess(projectId, storedApiKey)
    }
    handleClose()
  }

  const handleClose = () => {
    setStep('form')
    setFormData({ name: '', description: '', environment: 'production' })
    setProjectId(null)
    setError(null)
    onClose()
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
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-dark-800 border border-dark-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Header - Only show close button on form step */}
              {step === 'form' && (
                <div className="flex items-center justify-between p-6 border-b border-dark-700">
                  <h2 className="text-xl font-bold text-white">Create New Project</h2>
                  <button
                    onClick={handleClose}
                    className="w-8 h-8 rounded-lg hover:bg-dark-700 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                {step === 'form' ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Project Name */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                        Project Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
                        placeholder="e.g., E-Commerce API"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                        Description (optional)
                      </label>
                      <textarea
                        id="description"
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors resize-none"
                        placeholder="Brief description of your application"
                      />
                    </div>

                    {/* Environment */}
                    <div>
                      <label htmlFor="environment" className="block text-sm font-medium text-gray-300 mb-2">
                        Environment
                      </label>
                      <select
                        id="environment"
                        value={formData.environment}
                        onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                        className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
                      >
                        <option value="production">Production</option>
                        <option value="staging">Staging</option>
                        <option value="development">Development</option>
                      </select>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white font-semibold rounded-lg hover:from-primary-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Project'
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="p-10 text-center">
                    {/* Animated Checkmark */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className="w-24 h-24 mx-auto mb-8"
                    >
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <motion.circle
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="4"
                        />
                        <motion.path
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                          d="M30 50 L45 65 L70 35"
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </motion.div>

                    {/* Success Message */}
                    <h1 className="text-3xl font-bold text-white mb-3">Project Created!</h1>
                    <p className="text-gray-400 mb-8">
                      Your project <span className="text-primary-400 font-semibold">"{formData.name}"</span> has been created successfully.
                    </p>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <button
                        onClick={handleComplete}
                        className="w-full py-4 px-6 bg-gradient-to-r from-primary-500 to-purple-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-purple-700 transition-all shadow-lg shadow-primary-500/25"
                      >
                        Go to Project Setup
                      </button>
                      <button
                        onClick={handleClose}
                        className="w-full py-4 px-6 bg-dark-700 text-gray-300 font-medium rounded-xl hover:bg-dark-600 transition-all border border-dark-600"
                      >
                        Back to Dashboard
                      </button>
                    </div>
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
