import { useState, useEffect } from 'react'
import {
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Plus,
  Settings,
  Trash2,
  AlertTriangle,
  Check,
  Server,
  Database,
  FileText,
  Loader2,
  Power,
  PlayCircle,
} from 'lucide-react'
import { projectsApi } from '../../api/projects'
import { servicesApi } from '../../api/services'
import DeactivateProjectModal from './DeactivateProjectModal'
import type { Project, Service } from '../../types'

interface SettingsTabProps {
  project: Project
  projectId: string
  onProjectUpdate: () => void
}

export default function SettingsTab({ project, projectId, onProjectUpdate }: SettingsTabProps) {
  const [apiKey, setApiKey] = useState<string>('ask_proj_**********************')
  const [showApiKey, setShowApiKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [services, setServices] = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [reactivating, setReactivating] = useState(false)

  useEffect(() => {
    loadServices()
  }, [projectId])

  const loadServices = async () => {
    setLoadingServices(true)
    try {
      const response = await servicesApi.list(projectId)
      setServices(response.services)
    } catch (error) {
      console.error('Error loading services:', error)
    } finally {
      setLoadingServices(false)
    }
  }

  const handleDeleteService = async (serviceId: string) => {
    try {
      await servicesApi.delete(projectId, serviceId)
      await loadServices()
    } catch (error) {
      console.error('Error deleting service:', error)
    }
  }

  const copyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const regenerateApiKey = async () => {
    setRegenerating(true)
    try {
      const result = await projectsApi.createAPIKey(projectId, 'Main API Key')
      setApiKey(result.api_key)
      setShowApiKey(true)
      setShowRegenerateModal(false)
    } catch (error) {
      console.error('Error regenerating API key:', error)
    } finally {
      setRegenerating(false)
    }
  }

  const deleteProject = async () => {
    if (deleteConfirmation !== project.name) {
      return
    }

    try {
      await projectsApi.delete(projectId)
      window.location.href = '/projects'
    } catch (error) {
      console.error('Error deleting project:', error)
    }
  }

  const handleReactivate = async () => {
    setReactivating(true)
    try {
      await projectsApi.reactivate(projectId)
      onProjectUpdate()
    } catch (error) {
      console.error('Error reactivating project:', error)
    } finally {
      setReactivating(false)
    }
  }

  const handleDeactivateSuccess = () => {
    onProjectUpdate()
  }

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'backend_api':
      case 'microservice':
        return <Server className="w-4 h-4" />
      case 'postgresql':
      case 'mongodb':
      case 'redis':
        return <Database className="w-4 h-4" />
      case 'frontend':
        return <FileText className="w-4 h-4" />
      default:
        return <Settings className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Project Info */}
      <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Project Information</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Project Name</label>
            <input
              type="text"
              value={project.name}
              disabled
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Description</label>
            <textarea
              value={project.description || 'No description'}
              disabled
              rows={3}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Environment</label>
            <input
              type="text"
              value={project.environment}
              disabled
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* API Key Section */}
      <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">API Key</h3>
        <p className="text-sm text-gray-400 mb-4">
          Use this API key to authenticate the AppScope agent on your server.
        </p>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                readOnly
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none"
              />
            </div>
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            <button
              onClick={copyApiKey}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRegenerateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/30 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate Key
            </button>
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">Installation</h4>
          <p className="text-xs text-gray-400 mb-3">
            Run this command on your server to install the AppScope agent:
          </p>
          <div className="p-3 bg-black/40 rounded-lg font-mono text-sm text-green-400 overflow-x-auto">
            curl -sSL https://appscope.io/install.sh | bash -s -- --key {apiKey}
          </div>
        </div>
      </div>

      {/* Services Configuration */}
      <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Configured Services</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors">
            <Plus className="w-4 h-4" />
            Add Service
          </button>
        </div>
        <div className="space-y-3">
          {loadingServices ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : services.length > 0 ? (
            services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                    {getServiceIcon(service.service_type)}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">{service.name}</h4>
                    <p className="text-xs text-gray-400 capitalize">{service.service_type.replace('_', ' ')}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      service.is_active
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}
                  >
                    {service.is_active ? 'active' : 'inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-white transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteService(service.id)}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-400 py-8">
              No services configured. Services will appear here when the agent starts sending data.
            </div>
          )}
        </div>
      </div>

      {/* Project Status Section */}
      <div className={`${project.is_active ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'} border rounded-xl p-6`}>
        <div className="flex items-start gap-3">
          <Power className={`w-5 h-5 ${project.is_active ? 'text-green-400' : 'text-yellow-400'} flex-shrink-0 mt-1`} />
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${project.is_active ? 'text-green-400' : 'text-yellow-400'} mb-2`}>
              Project Status
            </h3>
            <p className="text-sm text-gray-300 mb-4">
              {project.is_active ? (
                <>
                  This project is <strong>active</strong> and collecting data. You can deactivate it
                  temporarily if you want to stop monitoring without deleting historical data.
                </>
              ) : (
                <>
                  This project is <strong>deactivated</strong>. Data ingestion is paused, but all
                  historical data is preserved. You can reactivate it anytime to resume monitoring.
                </>
              )}
            </p>
            <div className="flex gap-3">
              {project.is_active ? (
                <button
                  onClick={() => setShowDeactivateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/30 transition-colors"
                >
                  <Power className="w-4 h-4" />
                  Deactivate Project
                </button>
              ) : (
                <button
                  onClick={handleReactivate}
                  disabled={reactivating}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reactivating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Reactivating...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4" />
                      Reactivate Project
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
            <p className="text-sm text-gray-300 mb-4">
              Once you delete a project, there is no going back. All data, metrics, logs, and
              configurations will be permanently deleted.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Project
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-red-500/30 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Delete Project</h3>
                <p className="text-sm text-gray-400">
                  This action cannot be undone. This will permanently delete the project and all
                  associated data.
                </p>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">
                Type <span className="font-bold text-white">{project.name}</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-red-500"
                placeholder={project.name}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmation('')
                }}
                className="flex-1 px-4 py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteProject}
                disabled={deleteConfirmation !== project.name}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate API Key Modal */}
      {showRegenerateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-yellow-500/30 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Regenerate API Key</h3>
                <p className="text-sm text-gray-400">
                  This will invalidate the current API key. You'll need to update the agent
                  configuration on all servers using this project.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRegenerateModal(false)}
                className="flex-1 px-4 py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={regenerateApiKey}
                disabled={regenerating}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
              >
                {regenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Project Modal */}
      <DeactivateProjectModal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        projectId={projectId}
        projectName={project.name}
        scenario="user-initiated"
        onDeactivateSuccess={handleDeactivateSuccess}
      />
    </div>
  )
}
