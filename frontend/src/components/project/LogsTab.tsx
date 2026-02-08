import { useState, useEffect } from 'react'
import {
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileText,
  AlertCircle,
  Info,
  Bug,
} from 'lucide-react'
import { logsApi } from '../../api/logs'
import type { LogEvent } from '../../types'
import { format } from 'date-fns'

interface LogsTabProps {
  projectId: string
  initialLogs: LogEvent[]
}

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'
type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d'

export default function LogsTab({ projectId, initialLogs }: LogsTabProps) {
  const [logs, setLogs] = useState<LogEvent[]>(initialLogs)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set())
  const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(new Set(['INFO']))
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(true)

  // Extract unique services from logs
  const services = Array.from(new Set(logs.map((log) => log.service).filter(Boolean))) as string[]

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
      case 'FATAL':
        return <AlertCircle className="w-4 h-4" />
      case 'WARN':
        return <AlertCircle className="w-4 h-4" />
      case 'DEBUG':
        return <Bug className="w-4 h-4" />
      case 'INFO':
        return <Info className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
      case 'FATAL':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'WARN':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'DEBUG':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'INFO':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getServiceColor = (service: string) => {
    const colors = [
      'bg-blue-500/20 text-blue-400',
      'bg-green-500/20 text-green-400',
      'bg-purple-500/20 text-purple-400',
      'bg-orange-500/20 text-orange-400',
      'bg-pink-500/20 text-pink-400',
      'bg-cyan-500/20 text-cyan-400',
    ]
    const hash = service.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  const fetchLogs = async () => {
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

      const params: any = {
        start_time: startTime,
        limit: 500,
      }

      if (searchQuery) {
        params.search = searchQuery
      }

      if (selectedLevels.size > 0) {
        params.level = Array.from(selectedLevels).join(',')
      }

      const result = await logsApi.getLogs(projectId, params)

      // Filter by selected services client-side
      let filteredLogs = result.logs
      if (selectedServices.size > 0) {
        filteredLogs = filteredLogs.filter(
          (log) => log.service && selectedServices.has(log.service)
        )
      }

      setLogs(filteredLogs)
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [projectId, timeRange, selectedLevels, selectedServices, searchQuery])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh, projectId, timeRange, selectedLevels, selectedServices, searchQuery])

  const toggleService = (service: string) => {
    const newSet = new Set(selectedServices)
    if (newSet.has(service)) {
      newSet.delete(service)
    } else {
      newSet.add(service)
    }
    setSelectedServices(newSet)
  }

  const toggleLevel = (level: LogLevel) => {
    const newSet = new Set(selectedLevels)
    if (newSet.has(level)) {
      newSet.delete(level)
    } else {
      newSet.add(level)
    }
    setSelectedLevels(newSet)
  }

  const allLevels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']
  const allLevelsSelected = allLevels.every((level) => selectedLevels.has(level))

  const toggleAllLevels = () => {
    if (allLevelsSelected) {
      setSelectedLevels(new Set())
    } else {
      setSelectedLevels(new Set(allLevels))
    }
  }

  const clearFilters = () => {
    setSelectedServices(new Set())
    setSelectedLevels(new Set())
    setSearchQuery('')
  }

  return (
    <div className="flex gap-6">
      {/* Filters Sidebar */}
      {showFilters && (
        <div className="w-64 flex-shrink-0 space-y-4">
          <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Filters</h3>
              <button
                onClick={clearFilters}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Clear All
              </button>
            </div>

            {/* Services Filter */}
            <div className="mb-6">
              <h4 className="text-xs font-medium text-gray-400 mb-2">Services</h4>
              <div className="space-y-2">
                {services.map((service) => (
                  <label
                    key={service}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedServices.has(service)}
                      onChange={() => toggleService(service)}
                      className="w-4 h-4 rounded bg-white/10 border-white/20 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                      {service}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Level Filter */}
            <div>
              <h4 className="text-xs font-medium text-gray-400 mb-2">Level</h4>
              <div className="space-y-2">
                {/* Select All Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer group pb-2 border-b border-white/10">
                  <input
                    type="checkbox"
                    checked={allLevelsSelected}
                    onChange={toggleAllLevels}
                    className="w-4 h-4 rounded bg-white/10 border-white/20 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors font-medium">
                    Select All
                  </span>
                </label>

                {(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] as LogLevel[]).map((level) => (
                  <label key={level} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedLevels.has(level)}
                      onChange={() => toggleLevel(level)}
                      className="w-4 h-4 rounded bg-white/10 border-white/20 text-blue-500 focus:ring-blue-500"
                    />
                    <span
                      className={`text-xs px-2 py-0.5 rounded border ${getLevelColor(level)}`}
                    >
                      {level}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs List */}
      <div className="flex-1 space-y-4">
        {/* Controls */}
        <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Time Range */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            {/* Toggle Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>

            {/* Auto Refresh */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg transition-colors ${
                autoRefresh
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            </button>

            {/* Manual Refresh */}
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 bg-white/5 text-gray-400 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
          {logs.length > 0 ? (
            <div className="divide-y divide-white/10">
              {logs.map((log) => {
                const isExpanded = expandedLog === log.id

                return (
                  <div key={log.id} className="p-4 hover:bg-white/5 transition-colors">
                    <div
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs text-gray-400">
                            {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss.SSS')}
                          </span>

                          {log.service && (
                            <span
                              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getServiceColor(
                                log.service
                              )}`}
                            >
                              <div className="w-2 h-2 rounded-full bg-current" />
                              {log.service}
                            </span>
                          )}

                          <span
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${getLevelColor(
                              log.level
                            )}`}
                          >
                            {getLevelIcon(log.level)}
                            {log.level}
                          </span>

                          {log.source && (
                            <span className="text-xs text-gray-500">{log.source}</span>
                          )}
                        </div>

                        <p className="text-sm text-gray-300 font-mono">{log.message}</p>

                        {isExpanded && (
                          <div className="mt-4 space-y-3">
                            {log.http_method && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-400">HTTP:</span>
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded font-mono">
                                  {log.http_method}
                                </span>
                                <span className="text-gray-300">{log.http_path}</span>
                                {log.http_status && (
                                  <span
                                    className={`px-2 py-0.5 rounded font-mono ${
                                      log.http_status >= 500
                                        ? 'bg-red-500/20 text-red-400'
                                        : log.http_status >= 400
                                        ? 'bg-yellow-500/20 text-yellow-400'
                                        : 'bg-green-500/20 text-green-400'
                                    }`}
                                  >
                                    {log.http_status}
                                  </span>
                                )}
                                {log.response_time_ms && (
                                  <span className="text-gray-400">
                                    {log.response_time_ms}ms
                                  </span>
                                )}
                              </div>
                            )}

                            {log.stack_trace && (
                              <div className="p-3 bg-black/40 rounded-lg">
                                <div className="text-xs text-gray-400 mb-2">Stack Trace:</div>
                                <pre className="text-xs text-red-400 font-mono whitespace-pre-wrap overflow-x-auto">
                                  {log.stack_trace}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No logs found</p>
              <p className="text-sm mt-2">Try adjusting your filters or time range</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
