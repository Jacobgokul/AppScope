import { useState, useEffect } from 'react'
import {
  Brain,
  Loader2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
  Lightbulb,
} from 'lucide-react'
import { metricsApi } from '../../api/metrics'
import type { Analysis } from '../../types'
import { format } from 'date-fns'

interface AIAnalysisTabProps {
  projectId: string
}

export default function AIAnalysisTab({ projectId }: AIAnalysisTabProps) {
  const [analyzing, setAnalyzing] = useState(false)
  const [currentAnalysis, setCurrentAnalysis] = useState<Analysis | null>(null)
  const [analysisHistory, setAnalysisHistory] = useState<Analysis[]>([])
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalysisHistory()
  }, [projectId])

  const fetchAnalysisHistory = async () => {
    try {
      setLoading(true)
      const result = await metricsApi.getAnalysisHistory(projectId, 10)
      setAnalysisHistory(result.analyses)
      if (result.analyses.length > 0) {
        setCurrentAnalysis(result.analyses[0])
      }
    } catch (error) {
      console.error('Error fetching analysis history:', error)
    } finally {
      setLoading(false)
    }
  }

  const runAnalysis = async () => {
    setAnalyzing(true)
    try {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      const result = await metricsApi.requestAnalysis(projectId, {
        time_range_start: oneHourAgo.toISOString(),
        time_range_end: now.toISOString(),
      })

      setCurrentAnalysis(result)
      await fetchAnalysisHistory()
    } catch (error) {
      console.error('Error running analysis:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'low':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500'
    if (score >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">AI Analysis</h2>
          <p className="text-sm text-gray-400 mt-1">
            AI-powered root cause analysis of your application health
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="w-5 h-5" />
              Analyze Now
            </>
          )}
        </button>
      </div>

      {/* Analyzing State */}
      {analyzing && (
        <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-50 animate-pulse" />
              <Brain className="w-16 h-16 text-blue-400 animate-pulse relative" />
            </div>
            <h3 className="text-xl font-semibold text-white">Analyzing Your System...</h3>
            <p className="text-gray-400 text-center max-w-md">
              Our AI is correlating metrics, logs, and events across all services to identify
              potential issues and their root causes.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              Processing data...
            </div>
          </div>
        </div>
      )}

      {/* Current Analysis */}
      {!analyzing && currentAnalysis && (
        <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-semibold text-white">Latest Analysis</h3>
                {currentAnalysis.severity && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border uppercase ${getSeverityColor(
                      currentAnalysis.severity
                    )}`}
                  >
                    {currentAnalysis.severity}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">
                {format(new Date(currentAnalysis.created_at), 'MMM dd, yyyy HH:mm:ss')}
              </p>
            </div>
            {currentAnalysis.confidence_score !== null && (
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {Math.round(currentAnalysis.confidence_score * 100)}%
                </div>
                <div className="text-xs text-gray-400">Confidence</div>
              </div>
            )}
          </div>

          {/* Confidence Bar */}
          {currentAnalysis.confidence_score !== null && (
            <div>
              <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                <span>Confidence Score</span>
                <span>{Math.round(currentAnalysis.confidence_score * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getConfidenceColor(
                    currentAnalysis.confidence_score
                  )} transition-all duration-1000 ease-out`}
                  style={{ width: `${currentAnalysis.confidence_score * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Root Cause */}
          <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-sm font-semibold text-blue-400 mb-1">Root Cause</h4>
                <p className="text-white">{currentAnalysis.root_cause}</p>
                {currentAnalysis.root_cause_component && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-400">Affected Component: </span>
                    <span className="text-sm text-gray-300">
                      {currentAnalysis.root_cause_component}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          {currentAnalysis.summary && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Summary</h4>
              <p className="text-gray-300">{currentAnalysis.summary}</p>
            </div>
          )}

          {/* Evidence */}
          {currentAnalysis.evidence && currentAnalysis.evidence.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-3">Evidence</h4>
              <div className="space-y-2">
                {currentAnalysis.evidence.map((evidence, idx) => {
                  const isExpanded = expandedEvidence === `${currentAnalysis.id}-${idx}`

                  return (
                    <div
                      key={idx}
                      className="bg-white/5 border border-white/10 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setExpandedEvidence(
                            isExpanded ? null : `${currentAnalysis.id}-${idx}`
                          )
                        }
                        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                          <div className="text-left">
                            <div className="text-sm text-white">{evidence.description}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {format(new Date(evidence.timestamp), 'MMM dd, HH:mm:ss')}
                              {evidence.source && ` • ${evidence.source}`}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs ${getSeverityColor(
                            evidence.type
                          )}`}
                        >
                          {evidence.type}
                        </span>
                      </button>
                      {isExpanded && evidence.value && (
                        <div className="px-4 pb-4">
                          <div className="p-3 bg-black/40 rounded font-mono text-xs text-gray-300 whitespace-pre-wrap">
                            {evidence.value}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {currentAnalysis.suggestions && currentAnalysis.suggestions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-3">Suggested Actions</h4>
              <div className="space-y-3">
                {currentAnalysis.suggestions
                  .sort((a, b) => b.priority - a.priority)
                  .map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-lg"
                    >
                      <Lightbulb className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-300 mb-2">{suggestion.action}</p>
                        {suggestion.command && (
                          <div className="p-2 bg-black/40 rounded font-mono text-xs text-green-400">
                            {suggestion.command}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        Priority: {suggestion.priority}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Analysis Yet */}
      {!analyzing && !currentAnalysis && (
        <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-12 text-center">
          <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-white mb-2">No Analysis Yet</h3>
          <p className="text-gray-400 mb-6">
            Run your first AI analysis to get insights about your system health
          </p>
          <button
            onClick={runAnalysis}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all"
          >
            <Brain className="w-5 h-5" />
            Run Analysis
          </button>
        </div>
      )}

      {/* Analysis History */}
      {analysisHistory.length > 1 && (
        <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Analysis History</h3>
          <div className="space-y-3">
            {analysisHistory.slice(1).map((analysis) => (
              <button
                key={analysis.id}
                onClick={() => setCurrentAnalysis(analysis)}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-white font-medium truncate max-w-md">
                      {analysis.root_cause}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(analysis.created_at), 'MMM dd, yyyy HH:mm:ss')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {analysis.severity && (
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(
                        analysis.severity
                      )}`}
                    >
                      {analysis.severity}
                    </span>
                  )}
                  {analysis.confidence_score !== null && (
                    <span className="text-sm text-gray-400">
                      {Math.round(analysis.confidence_score * 100)}%
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
