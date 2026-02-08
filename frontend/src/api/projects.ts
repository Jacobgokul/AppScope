import apiClient from './client'
import type { Project, APIKey } from '../types'

export interface CreateProjectData {
  name: string
  description?: string
  environment?: string
}

export interface ProjectWithAPIKey {
  project: Project
  api_key: string
}

export const projectsApi = {
  list: async (): Promise<{ projects: Project[]; total: number }> => {
    const response = await apiClient.get('/projects')
    return response.data
  },

  create: async (data: CreateProjectData): Promise<ProjectWithAPIKey> => {
    const response = await apiClient.post('/projects', data)
    return response.data
  },

  get: async (projectId: string): Promise<Project> => {
    const response = await apiClient.get(`/projects/${projectId}`)
    return response.data
  },

  delete: async (projectId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}`)
  },

  listAPIKeys: async (projectId: string): Promise<APIKey[]> => {
    const response = await apiClient.get(`/projects/${projectId}/api-keys`)
    return response.data
  },

  createAPIKey: async (projectId: string, name?: string): Promise<{ api_key: string }> => {
    const response = await apiClient.post(`/projects/${projectId}/api-keys`, null, {
      params: { name },
    })
    return response.data
  },

  deactivate: async (projectId: string): Promise<Project> => {
    const response = await apiClient.post(`/projects/${projectId}/deactivate`)
    return response.data
  },

  reactivate: async (projectId: string): Promise<Project> => {
    const response = await apiClient.post(`/projects/${projectId}/reactivate`)
    return response.data
  },
}
