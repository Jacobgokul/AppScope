import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Search, Loader2 } from 'lucide-react'
import { projectsApi } from '../api/projects'
import { useProjectStore } from '../store'
import StatsOverview from '../components/dashboard/StatsOverview'
import ProjectCard from '../components/dashboard/ProjectCard'
import CreateProjectModal from '../components/dashboard/CreateProjectModal'
import type { Project } from '../types'

type FilterTab = 'all' | 'healthy' | 'warning' | 'critical'

export default function DashboardOverview() {
  const navigate = useNavigate()
  const { projects, setProjects } = useProjectStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await projectsApi.list()

      // Use real data - no mock data
      const projectsWithStatus = response.projects.map((project: Project) => ({
        ...project,
        services: project.services || [],
        stats: project.stats || undefined,
        // agent_connected is now computed server-side based on heartbeat timeout
      }))

      setProjects(projectsWithStatus)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load projects')
      console.error('Failed to load projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const getOverallStatus = (project: Project) => {
    if (!project.services || project.services.length === 0) return 'unknown'
    const hasCritical = project.services.some(s => s.status === 'critical')
    const hasWarning = project.services.some(s => s.status === 'warning')
    if (hasCritical) return 'critical'
    if (hasWarning) return 'warning'
    return 'healthy'
  }

  const filteredProjects = projects.filter((project) => {
    // Search filter
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())

    // Status filter
    if (activeFilter === 'all') return matchesSearch

    const status = getOverallStatus(project)
    return matchesSearch && status === activeFilter
  })

  const stats = {
    totalProjects: projects.length,
    totalServices: projects.reduce((acc, p) => acc + (p.services?.length || 0), 0),
    overallUptime: projects.length > 0
      ? projects.reduce((acc, p) => acc + (p.stats?.uptime || 0), 0) / projects.length
      : 0,
    activeAlerts: projects.reduce((acc, p) => {
      const critical = p.services?.filter(s => s.status === 'critical').length || 0
      const warning = p.services?.filter(s => s.status === 'warning').length || 0
      return acc + critical + warning
    }, 0),
  }

  const handleProjectCreated = (projectId: string, apiKey: string) => {
    // Navigate to project detail page with new project flag and API key
    navigate(`/projects/${projectId}`, {
      state: {
        isNewProject: true,
        apiKey,
      },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Monitor all your applications in one place</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-purple-700 transition-all shadow-lg shadow-primary-500/25"
        >
          <Plus className="w-5 h-5" />
          New Project
        </motion.button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search projects, services, metrics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
        />
      </div>

      {/* Stats Overview */}
      <StatsOverview
        totalProjects={stats.totalProjects}
        totalServices={stats.totalServices}
        overallUptime={stats.overallUptime}
        activeAlerts={stats.activeAlerts}
      />

      {/* Projects Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Your Projects</h2>
          <div className="flex gap-2">
            {(['all', 'healthy', 'warning', 'critical'] as FilterTab[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeFilter === filter
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'bg-dark-800/50 text-gray-400 border border-dark-700 hover:bg-dark-700 hover:text-gray-300'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="p-8 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={loadProjects}
              className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-12 bg-dark-800/50 border-2 border-dashed border-dark-700 rounded-2xl text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-dark-700 rounded-2xl flex items-center justify-center">
              <Plus className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchQuery || activeFilter !== 'all'
                ? 'No projects found'
                : 'No projects yet'}
            </h3>
            <p className="text-gray-400 mb-6">
              {searchQuery || activeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first project to start monitoring'}
            </p>
            {!searchQuery && activeFilter === 'all' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-purple-700 transition-all"
              >
                Create Project
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}

            {/* Add Project Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -6, scale: 1.02 }}
              onClick={() => setIsModalOpen(true)}
              className="bg-dark-800/30 backdrop-blur-xl border-2 border-dashed border-dark-700 rounded-2xl p-6 cursor-pointer hover:border-primary-500/40 transition-all duration-300 flex flex-col items-center justify-center min-h-[400px]"
            >
              <div className="w-16 h-16 rounded-2xl bg-dark-700 flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Add New Project</h3>
              <p className="text-sm text-gray-500 text-center">Monitor another application</p>
            </motion.div>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleProjectCreated}
      />
    </div>
  )
}
