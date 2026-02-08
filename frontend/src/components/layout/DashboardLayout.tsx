import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  LogOut,
  ChevronDown,
  User,
  Plus,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../../store/authSlice'
import { useProjectStore } from '../../store/projectSlice'
import type { ServiceStatus } from '../../types'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const statusColors: Record<ServiceStatus, string> = {
  healthy: 'bg-green-500',
  warning: 'bg-yellow-500',
  critical: 'bg-red-500',
  unknown: 'bg-gray-500',
}

function getOverallStatus(project: any): ServiceStatus {
  if (!project.services || project.services.length === 0) return 'unknown'

  const hasCritical = project.services.some((s: any) => s.status === 'critical')
  const hasWarning = project.services.some((s: any) => s.status === 'warning')

  if (hasCritical) return 'critical'
  if (hasWarning) return 'warning'
  return 'healthy'
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { projects } = useProjectStore()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const mainNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: FolderKanban, label: 'Projects', path: '/projects' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 w-64 h-screen bg-dark-800 border-r border-dark-700 flex flex-col z-50">
        {/* Logo */}
        <div className="p-6 border-b border-dark-700">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
              A
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
              AppScope
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1 mb-6">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
              Main
            </div>
            {mainNavItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-purple-600 text-white shadow-lg'
                      : 'text-gray-400 hover:bg-dark-700 hover:text-gray-200'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Projects List */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Projects
              </div>
              <button
                onClick={() => navigate('/projects/new')}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-dark-700 transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-1">
              {projects.slice(0, 5).map((project) => {
                const status = getOverallStatus(project)
                const isActive = location.pathname.includes(`/projects/${project.id}`)
                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                      isActive
                        ? 'bg-dark-700 text-white'
                        : 'text-gray-400 hover:bg-dark-700 hover:text-gray-200'
                    )}
                  >
                    <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
                    <span className="text-sm truncate">{project.name}</span>
                  </Link>
                )
              })}
              {projects.length > 5 && (
                <Link
                  to="/projects"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:bg-dark-700 hover:text-gray-300 transition-all"
                >
                  <span className="text-xs">View all {projects.length} projects</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-dark-700">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-700 hover:bg-dark-600 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {user?.email?.split('@')[0] || 'User'}
                </div>
                <div className="text-xs text-gray-500">Pro Plan</div>
              </div>
              <ChevronDown
                className={clsx(
                  'w-4 h-4 text-gray-400 transition-transform',
                  userMenuOpen && 'rotate-180'
                )}
              />
            </button>

            {/* User Menu Dropdown */}
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full left-0 right-0 mb-2 bg-dark-700 border border-dark-600 rounded-xl overflow-hidden shadow-xl"
              >
                <Link
                  to="/settings"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-dark-600 transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Account Settings</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-600 transition-colors text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Logout</span>
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  )
}
