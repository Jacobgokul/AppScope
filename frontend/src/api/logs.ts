import apiClient from './client'
import type { LogEvent } from '../types'

export const logsApi = {
  getLogs: async (
    projectId: string,
    params?: {
      level?: string
      source?: string
      search?: string
      start_time?: string
      end_time?: string
      limit?: number
      offset?: number
    }
  ): Promise<{ logs: LogEvent[]; total: number }> => {
    const response = await apiClient.get(`/logs/${projectId}`, { params })
    return response.data
  },

  getLatest: async (
    projectId: string,
    limit: number = 100
  ): Promise<{ logs: LogEvent[] }> => {
    const response = await apiClient.get(`/logs/${projectId}/latest`, {
      params: { limit },
    })
    return response.data
  },

  getErrors: async (
    projectId: string,
    params?: {
      start_time?: string
      end_time?: string
      limit?: number
    }
  ): Promise<{ logs: LogEvent[]; total: number }> => {
    const response = await apiClient.get(`/logs/${projectId}/errors`, {
      params,
    })
    return response.data
  },

  getSources: async (projectId: string): Promise<{ sources: string[] }> => {
    const response = await apiClient.get(`/logs/${projectId}/sources`)
    return response.data
  },
}
