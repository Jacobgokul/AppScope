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
}

export interface Service {
  id: string
  name: string
  type: ServiceType
  status: ServiceStatus
  lastSeen?: string
}

export type ServiceType =
  | 'backend'
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

export interface CreateProjectRequest {
  name: string
  description?: string
  environment?: string
}

export interface CreateProjectResponse {
  project: Project
  api_key: string
}
