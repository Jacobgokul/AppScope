import {
  LayoutDashboard,
  FileText,
  BarChart3,
  AlertTriangle,
  Brain,
  Settings
} from 'lucide-react'

export type TabType = 'overview' | 'logs' | 'metrics' | 'alerts' | 'analysis' | 'settings'

interface TabNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

interface TabItem {
  id: TabType
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const tabs: TabItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'logs', label: 'All Logs', icon: FileText },
  { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { id: 'analysis', label: 'AI Analysis', icon: Brain },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="border-b border-white/10">
      <div className="flex space-x-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all duration-200
                border-b-2 -mb-px relative
                ${
                  isActive
                    ? 'text-blue-400 border-blue-400'
                    : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-600'
                }
              `}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
              <span>{tab.label}</span>

              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-t-lg" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
