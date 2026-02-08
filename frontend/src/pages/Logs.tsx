import { useEffect, useState } from 'react'
import { FileText, Search, Filter, Calendar, Loader2, AlertTriangle } from 'lucide-react'
import { logsApi } from '../api/logs'
import { useProjectStore } from '../store'
import type { LogEvent } from '../types'
import ErrorDetailsModal from '../components/dashboard/ErrorDetailsModal'

export default function Logs() {
  const { currentProject } = useProjectStore()
  const [logs, setLogs] = useState<LogEvent[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [timeRange, setTimeRange] = useState<string>('1h')
  const [selectedLog, setSelectedLog] = useState<LogEvent | null>(null)

  useEffect(() => {
    if (currentProject) {
      loadSources()
      loadLogs()
    }
  }, [currentProject, selectedLevel, selectedSource, timeRange])

  const loadSources = async () => {
    if (!currentProject) return
    try {
      const data = await logsApi.getSources(currentProject.id)
      setSources(data.sources || [])
    } catch (err) {
      console.error('Failed to load sources', err)
    }
  }

  const loadLogs = async () => {
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

      const data = await logsApi.getLogs(currentProject.id, {
        level: selectedLevel !== 'all' ? selectedLevel : undefined,
        source: selectedSource !== 'all' ? selectedSource : undefined,
        start_time: startTime.toISOString(),
        end_time: now.toISOString(),
        limit: 500
      })
      setLogs(data.logs || [])
    } catch (err) {
      console.error('Failed to load logs', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      log.message.toLowerCase().includes(query) ||
      (log.source && log.source.toLowerCase().includes(query)) ||
      (log.service && log.service.toLowerCase().includes(query))
    )
  })

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'text-red-400 bg-red-500/20'
      case 'warn':
      case 'warning':
        return 'text-yellow-400 bg-yellow-500/20'
      case 'info':
        return 'text-blue-400 bg-blue-500/20'
      case 'debug':
        return 'text-purple-400 bg-purple-500/20'
      default:
        return 'text-gray-400 bg-gray-500/20'
    }
  }

  const logLevels = ['all', 'error', 'warn', 'info', 'debug']
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
        <p className="text-gray-500">Select or create a project to view logs</p>
      </div>
    )
  }

  return (
    <div className="mt-16 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Logs</h1>
          <p className="text-gray-500">Application logs and events</p>
        </div>
        <button
          onClick={loadLogs}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-400 transition-colors"
        >
          <FileText className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 space-y-4">
        {/* Search */}
        <div className="flex items-center gap-2 bg-dark-700 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          {/* Level Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-500">Level:</span>
            <div className="flex gap-2">
              {logLevels.map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                    selectedLevel === level
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Source Filter */}
          {sources.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Source:</span>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="px-3 py-1 bg-dark-700 text-white text-sm rounded-lg border border-dark-600 focus:outline-none focus:border-primary-500"
              >
                <option value="all">All Sources</option>
                {sources.map(source => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>
          )}

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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{filteredLogs.length}</div>
          <div className="text-sm text-gray-500">Total Logs</div>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
          <div className="text-2xl font-bold text-red-400">
            {filteredLogs.filter(log => log.level.toLowerCase() === 'error').length}
          </div>
          <div className="text-sm text-gray-500">Errors</div>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
          <div className="text-2xl font-bold text-yellow-400">
            {filteredLogs.filter(log => ['warn', 'warning'].includes(log.level.toLowerCase())).length}
          </div>
          <div className="text-sm text-gray-500">Warnings</div>
        </div>
      </div>

      {/* Logs Display */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No Logs Found</h3>
          <p className="text-gray-500">
            No logs available for the selected filters. Try adjusting your filter settings.
          </p>
        </div>
      ) : (
        <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-900">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Timestamp</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Level</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Message</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-dark-700/50">
                    <td className="px-4 py-3 text-sm text-gray-400 font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded font-medium ${getLevelColor(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 truncate max-w-xs">
                      {log.source || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      <div className="flex items-start gap-2">
                        {log.stack_trace && (
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="truncate max-w-2xl">{log.message}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-primary-400 hover:text-primary-300 text-sm font-medium"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLog && (
        <ErrorDetailsModal
          error={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  )
}
