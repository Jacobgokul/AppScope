import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Plus,
  Bell,
  Clock,
  Settings,
  Trash2,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { alertsApi, type Alert, type AlertRule } from '../../api/alerts'

interface AlertsTabProps {
  projectId: string
}

export default function AlertsTab({ projectId }: AlertsTabProps) {
  const [, setShowCreateModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active')
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [alertsResponse, rulesResponse] = await Promise.all([
        alertsApi.list(projectId),
        alertsApi.listRules(projectId),
      ])
      setAlerts(alertsResponse.alerts)
      setAlertRules(rulesResponse.rules)
    } catch (error) {
      console.error('Error loading alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolveAlert = async (alertId: string) => {
    try {
      await alertsApi.resolve(projectId, alertId)
      await loadData()
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      await alertsApi.updateRule(projectId, ruleId, { is_active: enabled })
      await loadData()
    } catch (error) {
      console.error('Error updating rule:', error)
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await alertsApi.deleteRule(projectId, ruleId)
      await loadData()
    } catch (error) {
      console.error('Error deleting rule:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'info':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-5 h-5" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />
      case 'info':
        return <Bell className="w-5 h-5" />
      default:
        return <Bell className="w-5 h-5" />
    }
  }

  const activeAlerts = alerts.filter((a) => a.status === 'active' || a.status === 'acknowledged')
  const resolvedAlerts = alerts.filter((a) => a.status === 'resolved')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'active'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-black/20 text-gray-400 border border-white/10 hover:bg-white/5'
            }`}
          >
            Active ({activeAlerts.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-black/20 text-gray-400 border border-white/10 hover:bg-white/5'
            }`}
          >
            History ({resolvedAlerts.length})
          </button>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Alert Rule
        </button>
      </div>

      {/* Active/Resolved Alerts */}
      {activeTab === 'active' ? (
        <div className="space-y-4">
          {activeAlerts.length > 0 ? (
            activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`bg-black/20 backdrop-blur-xl rounded-xl border p-6 ${getSeverityColor(
                  alert.severity
                )}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-lg ${
                        alert.severity === 'critical'
                          ? 'bg-red-500/20'
                          : alert.severity === 'warning'
                          ? 'bg-yellow-500/20'
                          : 'bg-blue-500/20'
                      }`}
                    >
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white">{alert.title}</h3>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium border uppercase ${getSeverityColor(
                            alert.severity
                          )}`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{alert.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(alert.triggered_at), 'MMM dd, HH:mm:ss')}
                        </div>
                        {alert.service_id && (
                          <div className="flex items-center gap-1">
                            <Settings className="w-3 h-3" />
                            Service
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    className="px-4 py-2 bg-white/5 text-gray-300 hover:bg-white/10 rounded-lg transition-colors text-sm"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-gray-300 text-lg">No active alerts</p>
              <p className="text-gray-400 text-sm mt-2">Your system is healthy</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {resolvedAlerts.length > 0 ? (
            resolvedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-500/20 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-300">{alert.title}</h3>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                        RESOLVED
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{alert.message}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div>
                        Triggered: {format(new Date(alert.triggered_at), 'MMM dd, HH:mm:ss')}
                      </div>
                      {alert.resolved_at && (
                        <div>
                          Resolved: {format(new Date(alert.resolved_at), 'MMM dd, HH:mm:ss')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-12 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 opacity-50" />
              <p className="text-gray-400">No alert history</p>
            </div>
          )}
        </div>
      )}

      {/* Alert Rules */}
      <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Alert Rules</h3>
        <div className="space-y-3">
          {alertRules.length > 0 ? (
            alertRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.is_active}
                      className="sr-only peer"
                      onChange={(e) => handleToggleRule(rule.id, e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                  <div>
                    <h4 className="text-sm font-medium text-white">{rule.name}</h4>
                    <p className="text-xs text-gray-400">
                      {rule.condition_type}: {rule.metric_type} {rule.operator} {rule.threshold} - {rule.severity}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-white transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-400 py-8">
              No alert rules configured. Create one to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
