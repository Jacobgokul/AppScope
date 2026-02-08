import { FolderKanban, Server, Activity, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'

interface StatsOverviewProps {
  totalProjects: number
  totalServices: number
  overallUptime: number
  activeAlerts: number
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string | number
  trend?: string
  colorClass: string
}

function StatCard({ icon: Icon, label, value, trend, colorClass }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-800/50 backdrop-blur-xl border border-dark-700/50 rounded-2xl p-6 hover:border-primary-500/30 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${colorClass} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className="text-xs font-semibold text-green-400">{trend}</span>
        )}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </motion.div>
  )
}

export default function StatsOverview({
  totalProjects,
  totalServices,
  overallUptime,
  activeAlerts,
}: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        icon={FolderKanban}
        label="Active Projects"
        value={totalProjects}
        trend="+2 this week"
        colorClass="bg-primary-500/20 text-primary-400"
      />
      <StatCard
        icon={Server}
        label="Total Services"
        value={totalServices}
        colorClass="bg-cyan-500/20 text-cyan-400"
      />
      <StatCard
        icon={Activity}
        label="Overall Uptime"
        value={`${overallUptime.toFixed(1)}%`}
        trend="+0.5%"
        colorClass="bg-green-500/20 text-green-400"
      />
      <StatCard
        icon={AlertTriangle}
        label="Active Alerts"
        value={activeAlerts}
        colorClass={activeAlerts > 0 ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}
      />
    </div>
  )
}
