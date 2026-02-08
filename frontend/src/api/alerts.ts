import apiClient from './client'

export interface AlertRule {
  id: string
  name: string
  description: string | null
  condition_type: 'threshold' | 'anomaly' | 'absence'
  metric_type: string
  operator: string
  threshold: number | null
  duration_seconds: number
  severity: 'info' | 'warning' | 'critical'
  is_active: boolean
  notification_channels: string[]
  created_at: string
  updated_at: string
}

export interface Alert {
  id: string
  rule_id: string
  status: 'active' | 'acknowledged' | 'resolved'
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  metric_value: number | null
  triggered_at: string
  acknowledged_at: string | null
  acknowledged_by: string | null
  resolved_at: string | null
  service_id: string | null
}

export interface AlertRuleCreate {
  name: string
  description?: string
  condition_type: 'threshold' | 'anomaly' | 'absence'
  metric_type: string
  operator?: string
  threshold?: number
  duration_seconds?: number
  severity?: 'info' | 'warning' | 'critical'
  is_active?: boolean
  notification_channels?: string[]
  service_id?: string
}

export interface AlertListResponse {
  alerts: Alert[]
  total: number
  active_count: number
  acknowledged_count: number
  resolved_count: number
}

export interface AlertRuleListResponse {
  rules: AlertRule[]
  total: number
}

export interface AlertStats {
  total_alerts: number
  active_alerts: number
  critical_alerts: number
  warning_alerts: number
  info_alerts: number
  alerts_last_24h: number
  alerts_last_7d: number
  most_triggered_rule: {
    rule_id: string
    rule_name: string
    trigger_count: number
  } | null
  alert_rate_trend: 'increasing' | 'decreasing' | 'stable'
}

export const alertsApi = {
  // Alert Rules
  listRules: async (projectId: string, isActive?: boolean): Promise<AlertRuleListResponse> => {
    const params = isActive !== undefined ? { is_active: isActive } : {}
    const response = await apiClient.get(`/alerts/${projectId}/rules`, { params })
    return response.data
  },

  createRule: async (projectId: string, data: AlertRuleCreate): Promise<AlertRule> => {
    const response = await apiClient.post(`/alerts/${projectId}/rules`, data)
    return response.data
  },

  getRule: async (projectId: string, ruleId: string): Promise<AlertRule> => {
    const response = await apiClient.get(`/alerts/${projectId}/rules/${ruleId}`)
    return response.data
  },

  updateRule: async (projectId: string, ruleId: string, data: Partial<AlertRuleCreate>): Promise<AlertRule> => {
    const response = await apiClient.put(`/alerts/${projectId}/rules/${ruleId}`, data)
    return response.data
  },

  deleteRule: async (projectId: string, ruleId: string): Promise<void> => {
    await apiClient.delete(`/alerts/${projectId}/rules/${ruleId}`)
  },

  // Alerts
  list: async (
    projectId: string,
    options?: { status?: string; severity?: string; limit?: number; offset?: number }
  ): Promise<AlertListResponse> => {
    const response = await apiClient.get(`/alerts/${projectId}`, { params: options })
    return response.data
  },

  get: async (projectId: string, alertId: string): Promise<Alert> => {
    const response = await apiClient.get(`/alerts/${projectId}/${alertId}`)
    return response.data
  },

  acknowledge: async (projectId: string, alertId: string, note?: string): Promise<Alert> => {
    const response = await apiClient.post(`/alerts/${projectId}/${alertId}/acknowledge`, { note })
    return response.data
  },

  resolve: async (projectId: string, alertId: string): Promise<Alert> => {
    const response = await apiClient.post(`/alerts/${projectId}/${alertId}/resolve`)
    return response.data
  },

  getStats: async (projectId: string): Promise<AlertStats> => {
    const response = await apiClient.get(`/alerts/${projectId}/stats`)
    return response.data
  },
}
