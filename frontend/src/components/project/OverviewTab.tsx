import { Activity, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import type { OverallHealth, LogEvent, Metric } from '../../types'
import { format } from 'date-fns'

interface OverviewTabProps {
  health: OverallHealth | null
  logs: LogEvent[]
  metrics: Metric[]
}

export default function OverviewTab({ health, logs }: OverviewTabProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400 bg-green-500/10 border-green-500/30'
      case 'degraded':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
      case 'unhealthy':
        return 'text-red-400 bg-red-500/10 border-red-500/30'
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-5 h-5" />
      case 'degraded':
        return <AlertCircle className="w-5 h-5" />
      case 'unhealthy':
        return <AlertCircle className="w-5 h-5" />
      default:
        return <Activity className="w-5 h-5" />
    }
  }

  const recentLogs = logs.slice(0, 10)
  const errorCount = logs.filter((log) => log.level === 'ERROR' || log.level === 'FATAL').length
  const warnCount = logs.filter((log) => log.level === 'WARN').length

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Overall Health</h3>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="transform -rotate-90 w-32 h-32">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-700"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - (health?.overall_score || 0) / 100)}`}
                    className={`transition-all duration-1000 ${
                      health?.overall_status === 'healthy'
                        ? 'text-green-400'
                        : health?.overall_status === 'degraded'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">
                      {health?.overall_score || 0}
                    </div>
                    <div className="text-xs text-gray-400">Score</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                  health?.overall_status || 'unknown'
                )}`}
              >
                {getStatusIcon(health?.overall_status || 'unknown')}
                {health?.overall_status || 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-400">Errors (24h)</p>
                <p className="text-3xl font-bold text-red-400 mt-2">{errorCount}</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-400">Warnings (24h)</p>
                <p className="text-3xl font-bold text-yellow-400 mt-2">{warnCount}</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Services</p>
                <p className="text-3xl font-bold text-blue-400 mt-2">
                  {health?.components?.length || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Activity className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-400">Health Score</p>
                <p className="text-3xl font-bold text-green-400 mt-2">
                  {health?.overall_score ? `${health.overall_score}%` : 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Services Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {health?.components?.map((component) => (
            <div
              key={component.component}
              className={`p-4 rounded-lg border ${getStatusColor(component.status)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(component.status)}
                  <span className="font-medium">{component.component}</span>
                </div>
                <span className="text-sm">{component.score}</span>
              </div>
              {component.issues && component.issues.length > 0 && (
                <div className="mt-2 space-y-1">
                  {component.issues.map((issue, idx) => (
                    <p key={idx} className="text-xs opacity-80">
                      {issue}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )) || (
            <div className="col-span-full text-center text-gray-400 py-8">
              No service data available
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {recentLogs.length > 0 ? (
            recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Clock className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">
                      {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        log.level === 'ERROR' || log.level === 'FATAL'
                          ? 'bg-red-500/20 text-red-400'
                          : log.level === 'WARN'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {log.level}
                    </span>
                    {log.service && (
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-300">
                        {log.service}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 truncate">{log.message}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-400 py-8">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  )
}
