export interface NotificationPreferences {
  email_critical_alerts: boolean
  email_daily_summary: boolean
  email_weekly_reports: boolean
  email_ai_analysis: boolean
}

export interface User {
  id: string
  email: string
  company_name: string | null
  is_active: boolean
  is_verified: boolean
  created_at: string
  notification_preferences: NotificationPreferences
}

export interface Project {
  id: string
  name: string
  description: string | null
  environment: string
  is_active: boolean
  created_at: string
  updated_at: string
  services?: Service[]
  stats?: ProjectStats
  last_agent_heartbeat?: string | null
  agent_connected: boolean
}

export interface Service {
  id: string
  name: string
  service_type: ServiceType
  description: string | null
  config: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
  last_heartbeat: string | null
  project_id: string
  // Computed fields for UI
  status?: ServiceStatus
}

export type ServiceType =
  | 'backend_api'
  | 'frontend'
  | 'postgresql'
  | 'mongodb'
  | 'redis'
  | 'microservice'
  | 'langfuse'
  | 'custom'

export type ServiceStatus = 'healthy' | 'warning' | 'critical' | 'unknown'

export interface ProjectStats {
  uptime: number
  errorRate: number
  avgLatency: number
  lastActivity?: string
  healthScore?: number
}

export interface APIKey {
  id: string
  key_prefix: string
  name: string
  is_active: boolean
  last_used_at: string | null
  created_at: string
}

export interface Metric {
  id: string
  timestamp: string
  metric_type: string
  metric_name: string
  source: string | null
  value: number
  unit: string | null
  tags: Record<string, string> | null
}

export interface LogEvent {
  id: string
  timestamp: string
  level: string
  source: string | null
  service: string | null  // alias for service_name for UI compatibility
  service_name: string | null
  message: string
  stack_trace: string | null
  http_method: string | null
  http_path: string | null
  http_status: number | null
  response_time_ms: number | null
  extra_metadata: Record<string, unknown> | null
}

export interface HealthStatus {
  component: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  score: number
  last_updated: string
  issues: string[]
}

export interface OverallHealth {
  overall_status: 'healthy' | 'degraded' | 'unhealthy'
  overall_score: number
  components: HealthStatus[]
  last_updated: string
}

export interface EvidenceItem {
  type: string
  timestamp: string
  description: string
  value: string | null
  source: string | null
}

export interface SuggestionItem {
  action: string
  command: string | null
  priority: number
}

export interface Analysis {
  id: string
  created_at: string
  time_range_start: string
  time_range_end: string
  root_cause: string
  root_cause_component: string | null
  severity: string | null
  confidence_score: number | null
  summary: string
  evidence: EvidenceItem[] | null
  suggestions: SuggestionItem[] | null
}

export interface Token {
  access_token: string
  refresh_token: string
  token_type: string
}
