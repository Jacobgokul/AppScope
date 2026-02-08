import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Cpu, MemoryStick, HardDrive, Network, TrendingUp, TrendingDown } from 'lucide-react'
import { metricsApi } from '../../api/metrics'
import type { Metric } from '../../types'
import { format } from 'date-fns'

interface MetricsTabProps {
  projectId: string
  initialMetrics: Metric[]
}

type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d'

export default function MetricsTab({ projectId, initialMetrics }: MetricsTabProps) {
  const [metrics, setMetrics] = useState<Metric[]>(initialMetrics)
  const [loading, setLoading] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [selectedService, setSelectedService] = useState<string>('all')

  // Extract unique services
  const services = ['all', ...Array.from(new Set(metrics.map((m) => m.source).filter((s): s is string => Boolean(s))))]

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const now = new Date()
      const timeRangeMap = {
        '1h': 1,
        '6h': 6,
        '24h': 24,
        '7d': 24 * 7,
        '30d': 24 * 30,
      }
      const hoursAgo = timeRangeMap[timeRange]
      const startTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString()

      const result = await metricsApi.getMetrics(projectId, {
        start_time: startTime,
        limit: 1000,
      })

      setMetrics(result.metrics)
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [projectId, timeRange])

  // Filter metrics by selected service
  const filteredMetrics =
    selectedService === 'all'
      ? metrics
      : metrics.filter((m) => m.source === selectedService)

  // Group metrics by type
  const metricsByType: Record<string, Metric[]> = {}
  filteredMetrics.forEach((metric) => {
    if (!metricsByType[metric.metric_type]) {
      metricsByType[metric.metric_type] = []
    }
    metricsByType[metric.metric_type].push(metric)
  })

  // Prepare chart data
  const prepareChartData = (metricType: string) => {
    const typeMetrics = metricsByType[metricType] || []
    const grouped: Record<string, Record<string, number>> = {}

    typeMetrics.forEach((metric) => {
      const timestamp = format(new Date(metric.timestamp), 'HH:mm')
      if (!grouped[timestamp]) {
        grouped[timestamp] = {}
      }
      grouped[timestamp][metric.metric_name] = metric.value
    })

    return Object.entries(grouped)
      .map(([timestamp, values]) => ({
        timestamp,
        ...values,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }

  // Calculate current values and trends
  const calculateStats = (metricType: string) => {
    const typeMetrics = (metricsByType[metricType] || []).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    if (typeMetrics.length === 0) return null

    const latest = typeMetrics[0]
    const previous = typeMetrics[Math.min(10, typeMetrics.length - 1)]
    const trend = previous ? ((latest.value - previous.value) / previous.value) * 100 : 0

    return {
      current: latest.value,
      unit: latest.unit || '',
      trend,
    }
  }

  const cpuData = prepareChartData('system')
  const memoryData = prepareChartData('system')
  const diskData = prepareChartData('system')
  const networkData = prepareChartData('network')

  const cpuStats = calculateStats('system')
  const memoryStats = calculateStats('system')
  const diskStats = calculateStats('system')
  const networkStats = calculateStats('network')

  const StatCard = ({
    icon: Icon,
    title,
    stats,
    color,
  }: {
    icon: any
    title: string
    stats: any
    color: string
  }) => {
    if (!stats) {
      return (
        <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-400">{title}</p>
              <p className="text-2xl font-bold text-white mt-2">--</p>
            </div>
            <div className={`p-3 ${color} rounded-lg`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-400">{title}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-2xl font-bold text-white">
                {stats.current.toFixed(1)}
                {stats.unit}
              </p>
              <div
                className={`flex items-center gap-1 text-sm ${
                  stats.trend > 0 ? 'text-red-400' : 'text-green-400'
                }`}
              >
                {stats.trend > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>{Math.abs(stats.trend).toFixed(1)}%</span>
              </div>
            </div>
          </div>
          <div className={`p-3 ${color} rounded-lg`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    return (
      <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-lg p-3">
        <p className="text-xs text-gray-400 mb-2">{payload[0].payload.timestamp}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-white">
              {entry.name}: {entry.value.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-4">
        <select
          value={selectedService}
          onChange={(e) => setSelectedService(e.target.value)}
          className="px-4 py-2 bg-black/20 backdrop-blur-xl border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          {services.map((service) => (
            <option key={service} value={service}>
              {service === 'all' ? 'All Services' : service}
            </option>
          ))}
        </select>

        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as TimeRange)}
          className="px-4 py-2 bg-black/20 backdrop-blur-xl border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="1h">Last Hour</option>
          <option value="6h">Last 6 Hours</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>

        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="ml-auto px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Current Values */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Cpu}
          title="CPU Usage"
          stats={cpuStats}
          color="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          icon={MemoryStick}
          title="Memory Usage"
          stats={memoryStats}
          color="bg-purple-500/10 text-purple-400"
        />
        <StatCard
          icon={HardDrive}
          title="Disk Usage"
          stats={diskStats}
          color="bg-orange-500/10 text-orange-400"
        />
        <StatCard
          icon={Network}
          title="Network I/O"
          stats={networkStats}
          color="bg-green-500/10 text-green-400"
        />
      </div>

      {/* CPU Chart */}
      <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">CPU Usage</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={cpuData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
            <XAxis dataKey="timestamp" stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="cpu_usage"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="CPU %"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Memory Chart */}
      <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Memory Usage</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={memoryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
            <XAxis dataKey="timestamp" stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="memory_usage"
              stroke="#a855f7"
              strokeWidth={2}
              dot={false}
              name="Memory %"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Disk Chart */}
      <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Disk Usage</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={diskData}>
            <defs>
              <linearGradient id="diskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
            <XAxis dataKey="timestamp" stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="disk_usage"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#diskGradient)"
              name="Disk %"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Network Chart */}
      <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Network I/O</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={networkData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
            <XAxis dataKey="timestamp" stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="network_in"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="Network In"
            />
            <Line
              type="monotone"
              dataKey="network_out"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
              name="Network Out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
