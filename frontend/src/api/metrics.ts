import apiClient from './client'
import type { Metric, OverallHealth, Analysis } from '../types'

export const metricsApi = {
  getMetrics: async (
    projectId: string,
    params?: {
      metric_type?: string
      start_time?: string
      end_time?: string
      limit?: number
    }
  ): Promise<{ metrics: Metric[]; total: number }> => {
    const response = await apiClient.get(`/metrics/${projectId}`, { params })
    return response.data
  },

  getLatest: async (projectId: string): Promise<{ metrics: Metric[] }> => {
    const response = await apiClient.get(`/metrics/${projectId}/latest`)
    return response.data
  },

  getHealth: async (projectId: string): Promise<OverallHealth> => {
    const response = await apiClient.get(`/health/${projectId}`)
    return response.data
  },

  requestAnalysis: async (
    projectId: string,
    params?: {
      time_range_start?: string
      time_range_end?: string
      focus_component?: string
    }
  ): Promise<Analysis> => {
    const response = await apiClient.post(`/analysis/${projectId}`, params || {})
    return response.data
  },

  getAnalysisHistory: async (
    projectId: string,
    limit?: number
  ): Promise<{ analyses: Analysis[]; total: number }> => {
    const response = await apiClient.get(`/analysis/${projectId}/history`, {
      params: { limit },
    })
    return response.data
  },
}
