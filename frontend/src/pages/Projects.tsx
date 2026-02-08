import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, MoreVertical, Trash2, Key, ExternalLink } from 'lucide-react'
import { projectsApi } from '../api/projects'
import { useProjectStore } from '../store'
import type { Project } from '../types'
import ConfirmationModal from '../components/common/ConfirmationModal'

export default function Projects() {
  const { projects, setProjects, setCurrentProject, removeProject } = useProjectStore()
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; projectId: string | null }>({
    isOpen: false,
    projectId: null,
  })

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const data = await projectsApi.list()
      setProjects(data.projects)
    } catch (err) {
      console.error('Failed to load projects', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (projectId: string) => {
    setDeleteModal({ isOpen: true, projectId })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal.projectId) return

    try {
      await projectsApi.delete(deleteModal.projectId)
      removeProject(deleteModal.projectId)
    } catch (err) {
      console.error('Failed to delete project', err)
    }
  }

  const handleCloseModal = () => {
    setDeleteModal({ isOpen: false, projectId: null })
  }

  const handleViewDashboard = (project: Project) => {
    setCurrentProject(project)
    navigate(`/projects/${project.id}`)
  }

  const handleManageAPIKeys = (project: Project) => {
    setCurrentProject(project)
    navigate(`/projects/${project.id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading projects...</div>
      </div>
    )
  }

  return (
    <div className="mt-16">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Link
          to="/projects/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-dark-900 rounded-lg font-medium hover:bg-primary-400 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 bg-dark-800 rounded-xl border border-dark-700">
          <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
          <p className="text-gray-500 mb-6">Create your first project to start monitoring</p>
          <Link
            to="/projects/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-dark-900 rounded-lg font-medium hover:bg-primary-400 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-dark-800 rounded-xl border border-dark-700 p-6 hover:border-dark-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{project.name}</h3>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-primary-500/20 text-primary-400 text-xs rounded">
                    {project.environment}
                  </span>
                </div>
                <div className="relative group">
                  <button className="p-1 hover:bg-dark-700 rounded">
                    <MoreVertical className="w-5 h-5 text-gray-500" />
                  </button>
                  <div className="absolute right-0 top-8 w-48 bg-dark-700 rounded-lg shadow-xl border border-dark-600 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <button
                      onClick={() => handleViewDashboard(project)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-dark-600 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Dashboard
                    </button>
                    <button
                      onClick={() => handleManageAPIKeys(project)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-dark-600 text-sm"
                    >
                      <Key className="w-4 h-4" />
                      Manage API Keys
                    </button>
                    <button
                      onClick={() => handleDeleteClick(project.id)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-dark-600 text-sm text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Project
                    </button>
                  </div>
                </div>
              </div>

              {project.description && (
                <p className="text-gray-500 text-sm mb-4">{project.description}</p>
              )}

              <div className="text-xs text-gray-600">
                Created {new Date(project.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleCloseModal}
        onConfirm={handleDeleteConfirm}
        title="Delete Project"
        message="Are you sure you want to delete this project? All monitoring data, logs, and metrics will be permanently lost. This action cannot be undone."
        confirmText="Delete Project"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
