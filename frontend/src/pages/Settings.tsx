import { useState, useEffect } from 'react'
import { User, Bell, Key, Shield } from 'lucide-react'
import { useAuthStore } from '../store'
import { usersApi } from '../api/users'
import type { NotificationPreferences } from '../types'

export default function Settings() {
  const { user, logout, setUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Profile form state
  const [companyName, setCompanyName] = useState(user?.company_name || '')

  // Notification preferences state
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_critical_alerts: true,
    email_daily_summary: true,
    email_weekly_reports: false,
    email_ai_analysis: true,
  })

  // Load user preferences on mount
  useEffect(() => {
    if (user?.notification_preferences) {
      setPreferences(user.notification_preferences)
    }
    if (user?.company_name) {
      setCompanyName(user.company_name)
    }
  }, [user])

  const handleUpdateProfile = async () => {
    setIsLoading(true)
    setMessage(null)
    try {
      const updatedUser = await usersApi.updateProfile({ company_name: companyName })
      setUser(updatedUser)
      setMessage({ type: 'success', text: 'Profile updated successfully' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePreferences = async (newPreferences: NotificationPreferences) => {
    setPreferences(newPreferences)
    setMessage(null)
    try {
      const updatedUser = await usersApi.updatePreferences({ notification_preferences: newPreferences })
      setUser(updatedUser)
      setMessage({ type: 'success', text: 'Preferences updated successfully' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update preferences' })
      // Revert on error
      if (user?.notification_preferences) {
        setPreferences(user.notification_preferences)
      }
    }
  }

  const handlePreferenceChange = (key: keyof NotificationPreferences) => {
    const newPreferences = { ...preferences, [key]: !preferences[key] }
    handleUpdatePreferences(newPreferences)
  }

  return (
    <div className="mt-16">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64">
          <nav className="space-y-1">
            {[
              { id: 'profile', icon: User, label: 'Profile' },
              { id: 'notifications', icon: Bell, label: 'Notifications' },
              { id: 'api-keys', icon: Key, label: 'API Keys' },
              { id: 'security', icon: Shield, label: 'Security' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-gray-400 hover:bg-dark-700'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-dark-800 rounded-xl border border-dark-700 p-6">
          {message && (
            <div
              className={`mb-4 px-4 py-3 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {message.text}
            </div>
          )}

          {activeTab === 'profile' && (
            <div>
              <h2 className="text-lg font-semibold mb-6">Profile Settings</h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
                <button
                  onClick={handleUpdateProfile}
                  disabled={isLoading}
                  className="px-6 py-2 bg-primary-500 text-dark-900 rounded-lg font-medium hover:bg-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-lg font-semibold mb-6">Notification Preferences</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.email_critical_alerts}
                    onChange={() => handlePreferenceChange('email_critical_alerts')}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-gray-300">Email alerts for critical issues</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.email_daily_summary}
                    onChange={() => handlePreferenceChange('email_daily_summary')}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-gray-300">Daily health summary</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.email_weekly_reports}
                    onChange={() => handlePreferenceChange('email_weekly_reports')}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500"
                  />
                  <span className="text-gray-300">Weekly reports</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.email_ai_analysis}
                    onChange={() => handlePreferenceChange('email_ai_analysis')}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500"
                  />
                  <span className="text-gray-300">AI analysis notifications</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'api-keys' && (
            <div>
              <h2 className="text-lg font-semibold mb-6">API Keys</h2>
              <p className="text-gray-500 mb-4">
                API keys are managed per project. Go to Projects to manage API keys.
              </p>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h2 className="text-lg font-semibold mb-6">Security</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Change Password</h3>
                  <div className="space-y-3 max-w-md">
                    <input
                      type="password"
                      placeholder="Current password"
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    />
                    <input
                      type="password"
                      placeholder="New password"
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    />
                    <button className="px-6 py-2 bg-primary-500 text-dark-900 rounded-lg font-medium hover:bg-primary-400 transition-colors">
                      Update Password
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-dark-700">
                  <h3 className="text-sm font-medium text-red-400 mb-2">Danger Zone</h3>
                  <button
                    onClick={logout}
                    className="px-6 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
