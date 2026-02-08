import { Link } from 'react-router-dom'
import { Menu, Bell, Settings, LogOut } from 'lucide-react'
import { useAuthStore, useProjectStore } from '../../store'

interface NavbarProps {
  onMenuClick: () => void
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuthStore()
  const { currentProject } = useProjectStore()

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-dark-800 border-b border-dark-700 z-50">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="text-primary-500 text-xl font-bold">AppScope</span>
          </Link>

          {currentProject && (
            <>
              <span className="text-dark-500">/</span>
              <span className="text-gray-300">{currentProject.name}</span>
              <span className="px-2 py-0.5 bg-primary-500/20 text-primary-400 text-xs rounded">
                {currentProject.environment}
              </span>
            </>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-dark-700 rounded-lg transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          <Link
            to="/settings"
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
          </Link>

          <div className="flex items-center gap-3 ml-2 pl-4 border-l border-dark-700">
            <div className="text-right">
              <div className="text-sm text-gray-300">{user?.email}</div>
              <div className="text-xs text-gray-500">{user?.company_name || 'Personal'}</div>
            </div>

            <button
              onClick={logout}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors text-red-400"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
