import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertCircle, WifiOff } from 'lucide-react'
import { useProjectData } from '../hooks/useProjectData'
import { servicesApi } from '../api/services'
import TabNavigation, { TabType } from '../components/project/TabNavigation'
import OverviewTab from '../components/project/OverviewTab'
import LogsTab from '../components/project/LogsTab'
import MetricsTab from '../components/project/MetricsTab'
import AlertsTab from '../components/project/AlertsTab'
import AIAnalysisTab from '../components/project/AIAnalysisTab'
import SettingsTab from '../components/project/SettingsTab'
import SetupGuide from '../components/project/SetupGuide'
import ConnectAgentModal from '../components/project/ConnectAgentModal'
import AddServiceModal from '../components/project/AddServiceModal'
import DeactivateProjectModal from '../components/project/DeactivateProjectModal'
import type { ServiceType } from '../types'

export default function ProjectDetailView() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [showSetupGuide, setShowSetupGuide] = useState(false)
  const [connectModalOpen, setConnectModalOpen] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'failed' | 'success'>('connecting')
  const [addServiceModalOpen, setAddServiceModalOpen] = useState(false)
  const [showDisconnectPrompt, setShowDisconnectPrompt] = useState(false)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)

  const { project, health, metrics, logs, loading, error, refetch } = useProjectData(
    projectId || ''
  )

  // Check if we should show setup guide (new project or agent not connected)
  useEffect(() => {
    if (project) {
      const isNewProject = location.state?.isNewProject
      const agentConnected = project.agent_connected

      if (isNewProject || !agentConnected) {
        setShowSetupGuide(true)
      } else {
        setShowSetupGuide(false)
      }
    }
  }, [project, location.state])

  // Check for agent disconnection (for projects that were previously connected)
  useEffect(() => {
    if (project && !showSetupGuide && project.is_active) {
      const wasConnected = project.last_agent_heartbeat !== null
      const isCurrentlyConnected = project.agent_connected

      // If agent was previously connected but is now disconnected, show prompt
      if (wasConnected && !isCurrentlyConnected) {
        // Wait a bit before showing the prompt to avoid false positives
        const timer = setTimeout(() => {
          if (project.agent_connected === false) {
            setShowDisconnectPrompt(true)
          }
        }, 5000) // 5 seconds delay

        return () => clearTimeout(timer)
      }
    }
  }, [project, showSetupGuide])

  useEffect(() => {
    if (!projectId) {
      navigate('/projects')
    }
  }, [projectId, navigate])

  if (loading && !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Failed to Load Project</h2>
          <p className="text-gray-400 mb-6">{error || 'Project not found'}</p>
          <button
            onClick={() => navigate('/projects')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab health={health} logs={logs} metrics={metrics} />
      case 'logs':
        return <LogsTab projectId={projectId!} initialLogs={logs} />
      case 'metrics':
        return <MetricsTab projectId={projectId!} initialMetrics={metrics} />
      case 'alerts':
        return <AlertsTab projectId={projectId!} />
      case 'analysis':
        return <AIAnalysisTab projectId={projectId!} />
      case 'settings':
        return (
          <SettingsTab
            project={project}
            projectId={projectId!}
            onProjectUpdate={refetch}
          />
        )
      default:
        return <OverviewTab health={health} logs={logs} metrics={metrics} />
    }
  }

  const handleConnectAgent = async () => {
    setConnectModalOpen(true)
    setConnectionStatus('connecting')

    // Simulate connection attempt with polling
    let attempts = 0
    const maxAttempts = 10
    const pollInterval = 3000 // 3 seconds

    const checkConnection = async () => {
      try {
        await refetch()
        const agentConnected = project?.agent_connected

        if (agentConnected) {
          setConnectionStatus('success')
          setShowSetupGuide(false)
          setTimeout(() => {
            setConnectModalOpen(false)
          }, 2000)
        } else {
          attempts++
          if (attempts >= maxAttempts) {
            setConnectionStatus('failed')
          } else {
            setTimeout(checkConnection, pollInterval)
          }
        }
      } catch (err) {
        attempts++
        if (attempts >= maxAttempts) {
          setConnectionStatus('failed')
        } else {
          setTimeout(checkConnection, pollInterval)
        }
      }
    }

    setTimeout(checkConnection, pollInterval)
  }

  const handleRetryConnection = () => {
    setConnectionStatus('connecting')
    handleConnectAgent()
  }

  const handleBackToSetup = () => {
    setConnectModalOpen(false)
    setConnectionStatus('connecting')
  }

  const handleAddService = async (serviceType: ServiceType, name: string, description?: string) => {
    if (!projectId) return

    await servicesApi.create(projectId, {
      name,
      service_type: serviceType,
      description,
    })

    // Refresh project data to show the new service
    await refetch()
  }

  const handleDeactivateClick = () => {
    setShowDisconnectPrompt(false)
    setShowDeactivateModal(true)
  }

  const handleReconnectClick = () => {
    setShowDisconnectPrompt(false)
    // User will try to reconnect manually, just close the prompt
  }

  const handleDeactivateSuccess = () => {
    refetch()
  }

  const getStatusBadge = () => {
    if (!health) return null

    const statusColors = {
      healthy: 'bg-green-500/20 text-green-400 border-green-500/30',
      degraded: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      unhealthy: 'bg-red-500/20 text-red-400 border-red-500/30',
    }

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium border ${
          statusColors[health.overall_status]
        }`}
      >
        {health.overall_status.toUpperCase()}
      </span>
    )
  }

  // Show setup guide if agent not connected
  if (showSetupGuide && project) {
    const serverUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'
    // Retrieve API key from sessionStorage (stored during project creation)
    const storedApiKey = sessionStorage.getItem(`project_${project.id}_api_key`)
    const apiKey = location.state?.apiKey || storedApiKey || ''

    return (
      <>
        <SetupGuide
          projectName={project.name}
          apiKey={apiKey}
          serverUrl={serverUrl}
          onConnectClick={handleConnectAgent}
        />
        <ConnectAgentModal
          isOpen={connectModalOpen}
          status={connectionStatus}
          onClose={() => setConnectModalOpen(false)}
          onRetry={handleRetryConnection}
          onBackToSetup={handleBackToSetup}
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Projects</span>
          </button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-4xl font-bold text-white">{project.name}</h1>
                {getStatusBadge()}
              </div>
              {project.description && (
                <p className="text-gray-400 text-lg">{project.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <div>
                  Environment:{' '}
                  <span className="text-gray-300 font-medium">{project.environment}</span>
                </div>
                <div>•</div>
                <div>
                  Created:{' '}
                  <span className="text-gray-300">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {health && (
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{health.overall_score}</div>
                  <div className="text-xs text-gray-400">Health Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">
                    {health.components?.length || 0}
                  </div>
                  <div className="text-xs text-gray-400">Services</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Tab Content */}
          <div className="p-6">
            <div className="animate-fade-in">{renderTabContent()}</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>

      {/* Add Service Modal */}
      <AddServiceModal
        isOpen={addServiceModalOpen}
        onClose={() => setAddServiceModalOpen(false)}
        onAdd={handleAddService}
      />

      {/* Agent Disconnected Prompt */}
      {showDisconnectPrompt && project && (
        <div className="fixed bottom-6 right-6 max-w-md bg-dark-800 border border-yellow-500/30 rounded-xl shadow-2xl p-5 z-50">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-semibold mb-1">Agent Disconnected</h4>
              <p className="text-sm text-gray-400">
                The monitoring agent is no longer sending data. Would you like to try reconnecting or deactivate the project?
              </p>
            </div>
            <button
              onClick={() => setShowDisconnectPrompt(false)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDeactivateClick}
              className="flex-1 px-3 py-2 bg-dark-700 hover:bg-dark-600 text-white text-sm rounded-lg transition-colors"
            >
              Deactivate
            </button>
            <button
              onClick={handleReconnectClick}
              className="flex-1 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Try to Reconnect
            </button>
          </div>
        </div>
      )}

      {/* Deactivate Project Modal */}
      {project && (
        <DeactivateProjectModal
          isOpen={showDeactivateModal}
          onClose={() => setShowDeactivateModal(false)}
          projectId={projectId!}
          projectName={project.name}
          scenario="agent-disconnected"
          onDeactivateSuccess={handleDeactivateSuccess}
          onReconnectAttempt={handleReconnectClick}
        />
      )}
    </div>
  )
}
