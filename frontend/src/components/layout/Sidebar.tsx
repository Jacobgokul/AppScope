import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FolderKanban, Settings } from 'lucide-react'
import clsx from 'clsx'

interface SidebarProps {
  isOpen: boolean
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: FolderKanban, label: 'Projects', path: '/projects' },
  { icon: Settings, label: 'Settings', path: '/settings' },
]

export default function Sidebar({ isOpen }: SidebarProps) {
  const location = useLocation()

  if (!isOpen) return null

  return (
    <aside className="fixed top-16 left-0 w-64 h-[calc(100vh-4rem)] bg-dark-800 border-r border-dark-700 z-40">
      <div className="p-4">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-gray-400 hover:bg-dark-700 hover:text-gray-200'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Health Overview Mini */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-dark-700">
        <div className="text-xs text-gray-500 mb-2">System Health</div>
        <div className="space-y-2">
          {['Frontend', 'Backend', 'Database', 'Server'].map((component) => (
            <div key={component} className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{component}</span>
              <div className="w-20 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${Math.random() * 30 + 70}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
