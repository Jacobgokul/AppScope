import { useEffect, useState } from 'react'
import { Brain, Loader2, AlertTriangle, TrendingUp, Clock } from 'lucide-react'
import { metricsApi } from '../api/metrics'
import { useProjectStore } from '../store'
import type { Analysis as AnalysisType } from '../types'

export default function Analysis() {
  const { currentProject } = useProjectStore()
  const [analyses, setAnalyses] = useState<AnalysisType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisType | null>(null)

  useEffect(() => {
    if (currentProject) {
      loadAnalyses()
    }
  }, [currentProject])

  const loadAnalyses = async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const data = await metricsApi.getAnalysisHistory(currentProject.id, 50)
      setAnalyses(data.analyses || [])
      if (data.analyses && data.analyses.length > 0) {
        setSelectedAnalysis(data.analyses[0])
      }
    } catch (err) {
      console.error('Failed to load analyses', err)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string | null) => {
    if (!severity) return 'text-gray-400 bg-gray-500/20'
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'text-red-400 bg-red-500/20'
      case 'major':
        return 'text-yellow-400 bg-yellow-500/20'
      case 'minor':
        return 'text-blue-400 bg-blue-500/20'
      default:
        return 'text-gray-400 bg-gray-500/20'
    }
  }

  const getConfidenceColor = (score: number | null) => {
    if (!score) return 'text-gray-400'
    if (score >= 0.8) return 'text-green-400'
    if (score >= 0.6) return 'text-yellow-400'
    return 'text-red-400'
  }

  if (!currentProject) {
    return (
      <div className="mt-16 text-center py-16">
        <h2 className="text-xl text-gray-400 mb-4">No project selected</h2>
        <p className="text-gray-500">Select or create a project to view AI analyses</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mt-16 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="mt-16 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Analysis History</h1>
          <p className="text-gray-500">Past root cause analyses and recommendations</p>
        </div>
        <button
          onClick={loadAnalyses}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-400 transition-colors"
        >
          <Brain className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {analyses.length === 0 ? (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-12 text-center">
          <Brain className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No Analyses Yet</h3>
          <p className="text-gray-500 mb-4">
            Run your first AI analysis from the Dashboard to get started.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-400 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Analysis List */}
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Analysis History</h3>
            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
              {analyses.map((analysis) => (
                <button
                  key={analysis.id}
                  onClick={() => setSelectedAnalysis(analysis)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedAnalysis?.id === analysis.id
                      ? 'bg-dark-700 border-primary-500'
                      : 'bg-dark-800 border-dark-700 hover:border-dark-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-400" />
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${getSeverityColor(analysis.severity)}`}>
                        {analysis.severity || 'Unknown'}
                      </span>
                    </div>
                    {analysis.confidence_score !== null && (
                      <span className={`text-xs font-medium ${getConfidenceColor(analysis.confidence_score)}`}>
                        {Math.round(analysis.confidence_score * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-white mb-1 line-clamp-2">
                    {analysis.root_cause}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {new Date(analysis.created_at).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Analysis Details */}
          {selectedAnalysis && (
            <div className="lg:col-span-2 bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-dark-700">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Brain className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">AI Analysis</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(selectedAnalysis.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedAnalysis.severity && (
                      <span className={`px-2 py-1 text-xs rounded font-medium ${getSeverityColor(selectedAnalysis.severity)}`}>
                        {selectedAnalysis.severity}
                      </span>
                    )}
                    {selectedAnalysis.confidence_score !== null && (
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getConfidenceColor(selectedAnalysis.confidence_score)}`}>
                          {Math.round(selectedAnalysis.confidence_score * 100)}%
                        </div>
                        <div className="text-xs text-gray-500">Confidence</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Time Range */}
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  Analysis period: {new Date(selectedAnalysis.time_range_start).toLocaleString()} -{' '}
                  {new Date(selectedAnalysis.time_range_end).toLocaleString()}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                {/* Root Cause */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-purple-400" />
                    <h4 className="font-semibold text-white">Root Cause</h4>
                  </div>
                  <div className="bg-dark-900 rounded-lg p-4">
                    <div className="text-purple-400 font-medium mb-2">
                      {selectedAnalysis.root_cause}
                    </div>
                    {selectedAnalysis.root_cause_component && (
                      <div className="text-sm text-gray-500">
                        Component: <span className="text-white">{selectedAnalysis.root_cause_component}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <h4 className="font-semibold text-white mb-3">Summary</h4>
                  <div className="bg-dark-900 rounded-lg p-4">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {selectedAnalysis.summary}
                    </p>
                  </div>
                </div>

                {/* Evidence */}
                {selectedAnalysis.evidence && selectedAnalysis.evidence.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                      <h4 className="font-semibold text-white">Evidence</h4>
                    </div>
                    <div className="space-y-2">
                      {selectedAnalysis.evidence.map((item, i) => (
                        <div key={i} className="bg-dark-900 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                              {item.type}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 mb-1">{item.description}</p>
                          {item.value && (
                            <div className="text-xs font-mono text-gray-500">
                              Value: {item.value}
                            </div>
                          )}
                          {item.source && (
                            <div className="text-xs text-gray-500">
                              Source: {item.source}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {selectedAnalysis.suggestions && selectedAnalysis.suggestions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-white mb-3">Suggested Actions</h4>
                    <div className="space-y-3">
                      {selectedAnalysis.suggestions
                        .sort((a, b) => a.priority - b.priority)
                        .map((item, i) => (
                          <div key={i} className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-sm font-bold text-primary-400">{i + 1}</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-primary-300 mb-2">{item.action}</p>
                                {item.command && (
                                  <div className="bg-dark-900 rounded px-3 py-2 font-mono text-xs text-gray-400">
                                    {item.command}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
