import { useState, useEffect, useCallback, useRef } from 'react'
import { projectsApi } from '../api/projects'
import { metricsApi } from '../api/metrics'
import { logsApi } from '../api/logs'
import type { Project, Metric, LogEvent, OverallHealth } from '../types'

interface UseProjectDataResult {
  project: Project | null
  health: OverallHealth | null
  metrics: Metric[]
  logs: LogEvent[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useProjectData(projectId: string): UseProjectDataResult {
  const [project, setProject] = useState<Project | null>(null)
  const [health, setHealth] = useState<OverallHealth | null>(null)
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [logs, setLogs] = useState<LogEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)

      // Fetch project details
      const projectData = await projectsApi.get(projectId)
      setProject(projectData)

      // Fetch health status
      const healthData = await metricsApi.getHealth(projectId)
      setHealth(healthData)

      // Fetch latest metrics
      const metricsData = await metricsApi.getLatest(projectId)
      setMetrics(metricsData.metrics)

      // Fetch latest logs
      const logsData = await logsApi.getLatest(projectId, 100)
      setLogs(logsData.logs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project data')
      console.error('Error fetching project data:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // WebSocket connection for real-time updates
  const connectWebSocket = useCallback(() => {
    if (!projectId) return

    const token = localStorage.getItem('access_token')
    if (!token) return

    const wsUrl = (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:8000'
    const ws = new WebSocket(`${wsUrl}/api/v1/ingest/stream?project_id=${projectId}&token=${token}`)

    ws.onopen = () => {
      console.log('WebSocket connected for project:', projectId)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        // Handle different message types
        if (data.type === 'metric') {
          setMetrics((prev) => [data.data, ...prev].slice(0, 1000))
        } else if (data.type === 'log') {
          setLogs((prev) => [data.data, ...prev].slice(0, 1000))
        } else if (data.type === 'health') {
          setHealth(data.data)
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      // Fall back to polling
      startPolling()
    }

    ws.onclose = () => {
      console.log('WebSocket closed, falling back to polling')
      startPolling()
    }

    wsRef.current = ws
  }, [projectId])

  // Polling fallback
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current as number)
    }

    pollingIntervalRef.current = setInterval(async () => {
      if (!projectId) return

      try {
        // Fetch latest health and data
        const [healthData, metricsData, logsData] = await Promise.all([
          metricsApi.getHealth(projectId),
          metricsApi.getLatest(projectId),
          logsApi.getLatest(projectId, 100),
        ])

        setHealth(healthData)
        setMetrics(metricsData.metrics)
        setLogs(logsData.logs)
      } catch (err) {
        console.error('Error polling project data:', err)
      }
    }, 30000) as unknown as number // Poll every 30 seconds
  }, [projectId])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Setup WebSocket connection
  useEffect(() => {
    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current as number)
      }
    }
  }, [connectWebSocket])

  return {
    project,
    health,
    metrics,
    logs,
    loading,
    error,
    refetch: fetchData,
  }
}
