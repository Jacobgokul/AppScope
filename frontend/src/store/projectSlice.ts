import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project } from '../types'

interface ProjectState {
  currentProject: Project | null
  projects: Project[]
  setCurrentProject: (project: Project | null) => void
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  removeProject: (projectId: string) => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      currentProject: null,
      projects: [],

      setCurrentProject: (project) => set({ currentProject: project }),

      setProjects: (projects) =>
        set((state) => ({
          projects,
          currentProject: state.currentProject || projects[0] || null,
        })),

      addProject: (project) =>
        set((state) => ({
          projects: [project, ...state.projects],
          currentProject: state.currentProject || project,
        })),

      removeProject: (projectId) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId),
          currentProject:
            state.currentProject?.id === projectId
              ? state.projects.find((p) => p.id !== projectId) || null
              : state.currentProject,
        })),
    }),
    {
      name: 'project-storage',
      partialize: (state) => ({ currentProject: state.currentProject }),
    }
  )
)
