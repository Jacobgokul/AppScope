import { useEffect, useState } from 'react'
import { Activity, TrendingUp, Filter, Calendar, Loader2 } from 'lucide-react'
import { metricsApi } from '../api/metrics'
import { useProjectStore } from '../store'
import type { Metric } from '../types'

interface MetricGroup {
  name: string
  metrics: Metric[]
}

export default function Metrics() {
  const { currentProject } = useProjectStore()
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<string>('1h')

  useEffect(() => {
    if (currentProject) {
      loadMetrics()
    }
  }, [currentProject, selectedType, timeRange])

  const loadMetrics = async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const now = new Date()
      let startTime: Date

      switch (timeRange) {
        case '15m':
          startTime = new Date(now.getTime() - 15 * 60 * 1000)
          break
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000)
          break
        case '6h':
          startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000)
          break
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        default:
          startTime = new Date(now.getTime() - 60 * 60 * 1000)
      }

      const data = await metricsApi.getMetrics(currentProject.id, {
        metric_type: selectedType !== 'all' ? selectedType : undefined,
        start_time: startTime.toISOString(),
        end_time: now.toISOString(),
        limit: 1000
      })
      setMetrics(data.metrics || [])
    } catch (err) {
      console.error('Failed to load metrics', err)
    } finally {
      setLoading(false)
    }
  }

  const groupMetricsByName = (): MetricGroup[] => {
    const grouped = new Map<string, Metric[]>()

    metrics.forEach(metric => {
      const existing = grouped.get(metric.metric_name) || []
      grouped.set(metric.metric_name, [...existing, metric])
    })

    return Array.from(grouped.entries()).map(([name, metrics]) => ({
      name,
      metrics: metrics.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    }))
  }

  const metricTypes = ['all', 'system', 'application', 'database', 'network']
  const timeRanges = [
    { label: '15 minutes', value: '15m' },
    { label: '1 hour', value: '1h' },
    { label: '6 hours', value: '6h' },
    { label: '24 hours', value: '24h' },
    { label: '7 days', value: '7d' }
  ]

  if (!currentProject) {
    return (
      <div className="mt-16 text-center py-16">
        <h2 className="text-xl text-gray-400 mb-4">No project selected</h2>
        <p className="text-gray-500">Select or create a project to view metrics</p>
      </div>
    )
  }

  const groupedMetrics = groupMetricsByName()

  return (
    <div className="mt-16 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Metrics</h1>
          <p className="text-gray-500">Time-series metrics and performance data</p>
        </div>
        <button
          onClick={loadMetrics}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-400 transition-colors"
        >
          <Activity className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
        <div className="flex flex-wrap gap-4">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-500">Type:</span>
            <div className="flex gap-2">
              {metricTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                    selectedType === type
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Time Range Filter */}
          <div className="flex items-center gap-2 ml-auto">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-500">Range:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1 bg-dark-700 text-white text-sm rounded-lg border border-dark-600 focus:outline-none focus:border-primary-500"
            >
              {timeRanges.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Display */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : groupedMetrics.length === 0 ? (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-12 text-center">
          <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No Metrics Found</h3>
          <p className="text-gray-500">
            No metrics available for the selected filters. Try adjusting your time range or filter settings.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedMetrics.map(group => (
            <div key={group.name} className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
              {/* Metric Header */}
              <div className="flex items-center justify-between p-4 border-b border-dark-700">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-primary-500" />
                  <div>
                    <h3 className="font-semibold text-white">{group.name}</h3>
                    <p className="text-sm text-gray-500">{group.metrics.length} data points</p>
                  </div>
                </div>
                {group.metrics.length > 0 && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {group.metrics[group.metrics.length - 1].value.toFixed(2)}
                      {group.metrics[0].unit && (
                        <span className="text-sm text-gray-500 ml-1">{group.metrics[0].unit}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">Latest value</div>
                  </div>
                )}
              </div>

              {/* Metric Values Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-900">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Timestamp</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Value</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Source</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Tags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700">
                    {group.metrics.slice(-20).reverse().map((metric, idx) => (
                      <tr key={metric.id || idx} className="hover:bg-dark-700/50">
                        <td className="px-4 py-2 text-sm text-gray-400 font-mono">
                          {new Date(metric.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-white">
                          {metric.value.toFixed(2)}
                          {metric.unit && <span className="text-gray-500 ml-1">{metric.unit}</span>}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-400">
                          {metric.source || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-400">
                          {metric.tags ? (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(metric.tags).map(([key, value]) => (
                                <span key={key} className="px-2 py-0.5 bg-dark-600 rounded text-xs">
                                  {key}: {value}
                                </span>
                              ))}
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
