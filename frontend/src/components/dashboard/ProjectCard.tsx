import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart3, Settings, WifiOff, Wifi } from 'lucide-react'
import type { Project, ServiceStatus } from '../../types'
import { formatDistanceToNow } from 'date-fns'

interface ProjectCardProps {
  project: Project
}

const serviceTypeColors: Record<string, string> = {
  backend: 'from-purple-500 to-purple-600',
  frontend: 'from-cyan-500 to-cyan-600',
  postgresql: 'from-blue-500 to-blue-600',
  mongodb: 'from-green-500 to-green-600',
  redis: 'from-red-500 to-red-600',
  microservice: 'from-pink-500 to-pink-600',
  langfuse: 'from-orange-500 to-orange-600',
  custom: 'from-gray-500 to-gray-600',
}

const statusColors: Record<ServiceStatus, string> = {
  healthy: 'bg-green-500',
  warning: 'bg-yellow-500',
  critical: 'bg-red-500',
  unknown: 'bg-gray-500',
}

const statusBgColors: Record<ServiceStatus, string> = {
  healthy: 'bg-green-500/15 text-green-400',
  warning: 'bg-yellow-500/15 text-yellow-400',
  critical: 'bg-red-500/15 text-red-400',
  unknown: 'bg-gray-500/15 text-gray-400',
}

function getOverallStatus(services?: Project['services']): ServiceStatus {
  if (!services || services.length === 0) return 'unknown'

  const hasCritical = services.some(s => s.status === 'critical')
  const hasWarning = services.some(s => s.status === 'warning')

  if (hasCritical) return 'critical'
  if (hasWarning) return 'warning'
  return 'healthy'
}

function getProjectInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate()
  const overallStatus = getOverallStatus(project.services)

  const handleCardClick = () => {
    navigate(`/projects/${project.id}`)
  }

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/projects/${project.id}/settings`)
  }

  const handleMetricsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/projects/${project.id}/metrics`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -6, scale: 1.02 }}
      onClick={handleCardClick}
      className="bg-dark-800/50 backdrop-blur-xl border border-dark-700/50 rounded-2xl p-6 cursor-pointer hover:border-primary-500/40 hover:shadow-2xl hover:shadow-primary-500/20 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${serviceTypeColors.backend || serviceTypeColors.custom} flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
            {getProjectInitial(project.name)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">{project.name}</h3>
            <p className="text-xs text-gray-500">{project.environment || 'production'}</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${statusBgColors[overallStatus]}`}>
          <span className={`w-2 h-2 rounded-full ${statusColors[overallStatus]} animate-pulse`} />
          {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
        </div>
      </div>

      {/* Agent Connection Status */}
      <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg ${
        project.agent_connected
          ? 'bg-green-500/10 border border-green-500/20'
          : 'bg-yellow-500/10 border border-yellow-500/20'
      }`}>
        {project.agent_connected ? (
          <>
            <Wifi className="w-4 h-4 text-green-400" />
            <span className="text-xs text-green-400">Agent connected</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-yellow-400">Agent not connected</span>
          </>
        )}
      </div>

      {/* Services */}
      {project.services && project.services.length > 0 ? (
        <div className="mb-5">
          <div className="flex flex-wrap gap-2">
            {project.services.slice(0, 4).map((service) => (
              <div
                key={service.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-dark-700/50 rounded-lg border border-dark-600/50"
              >
                <span className={`w-2 h-2 rounded-full ${statusColors[service.status || 'unknown']}`} />
                <span className="text-xs text-gray-300">{service.name}</span>
              </div>
            ))}
            {project.services.length > 4 && (
              <div className="flex items-center px-3 py-1.5 bg-dark-700/50 rounded-lg border border-dark-600/50">
                <span className="text-xs text-gray-400">+{project.services.length - 4} more</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-5 text-center py-3 bg-dark-700/30 rounded-lg">
          <span className="text-xs text-gray-500">No services detected yet</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="text-center p-3 bg-dark-700/30 rounded-xl">
          <div className="text-xl font-bold text-white mb-1">
            {project.stats?.uptime?.toFixed(1) || 'N/A'}
            {project.stats?.uptime !== undefined && '%'}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Uptime</div>
        </div>
        <div className="text-center p-3 bg-dark-700/30 rounded-xl">
          <div className="text-xl font-bold text-white mb-1">
            {project.stats?.avgLatency?.toFixed(0) || 'N/A'}
            {project.stats?.avgLatency !== undefined && 'ms'}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Latency</div>
        </div>
        <div className="text-center p-3 bg-dark-700/30 rounded-xl">
          <div className={`text-xl font-bold mb-1 ${project.stats?.errorRate && project.stats.errorRate > 0 ? 'text-red-400' : 'text-white'}`}>
            {project.stats?.errorRate?.toFixed(1) || '0'}
            {project.stats?.errorRate !== undefined && '%'}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Errors</div>
        </div>
      </div>

      {/* Mini Chart */}
      <div className="h-16 bg-dark-700/30 rounded-xl mb-5 p-3 flex items-center justify-center">
        {project.agent_connected ? (
          <div className="w-full h-full flex items-end gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-primary-500/60 rounded-sm transition-all hover:bg-primary-500"
                style={{ height: `${20}%` }}
              />
            ))}
          </div>
        ) : (
          <span className="text-xs text-gray-500">No metrics data</span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-dark-700/50">
        <span className="text-xs text-gray-500">
          {project.stats?.lastActivity
            ? `Active ${formatDistanceToNow(new Date(project.stats.lastActivity), { addSuffix: true })}`
            : 'No recent activity'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMetricsClick}
            className="w-8 h-8 rounded-lg bg-dark-700/50 border border-dark-600/50 flex items-center justify-center hover:bg-primary-500/20 hover:border-primary-500/30 transition-all"
          >
            <BarChart3 className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={handleSettingsClick}
            className="w-8 h-8 rounded-lg bg-dark-700/50 border border-dark-600/50 flex items-center justify-center hover:bg-primary-500/20 hover:border-primary-500/30 transition-all"
          >
            <Settings className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
