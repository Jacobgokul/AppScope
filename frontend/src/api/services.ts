import apiClient from './client'
import type { Service, ServiceType } from '../types'

export interface CreateServiceData {
  name: string
  service_type: ServiceType
  description?: string
  config?: Record<string, any>
}

export interface ServiceListResponse {
  services: Service[]
  total: number
}

export const servicesApi = {
  list: async (projectId: string): Promise<ServiceListResponse> => {
    const response = await apiClient.get(`/projects/${projectId}/services`)
    return response.data
  },

  create: async (projectId: string, data: CreateServiceData): Promise<Service> => {
    const response = await apiClient.post(`/projects/${projectId}/services`, data)
    return response.data
  },

  get: async (projectId: string, serviceId: string): Promise<Service> => {
    const response = await apiClient.get(`/projects/${projectId}/services/${serviceId}`)
    return response.data
  },

  update: async (projectId: string, serviceId: string, data: Partial<CreateServiceData>): Promise<Service> => {
    const response = await apiClient.put(`/projects/${projectId}/services/${serviceId}`, data)
    return response.data
  },

  delete: async (projectId: string, serviceId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/services/${serviceId}`)
  },

  getStatus: async (projectId: string): Promise<{
    project_id: string
    project_name: string
    services: Array<{
      service_id: string
      service_name: string
      service_type: string
      is_connected: boolean
      last_heartbeat: string | null
      seconds_since_heartbeat: number | null
    }>
    total_services: number
    connected_services: number
    disconnected_services: number
  }> => {
    const response = await apiClient.get(`/projects/${projectId}/agent-status`)
    return response.data
  }
}
