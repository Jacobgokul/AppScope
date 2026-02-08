import apiClient from './client'
import type { User, NotificationPreferences } from '../types'

export interface UpdateProfileData {
  company_name?: string | null
}

export interface UpdatePreferencesData {
  notification_preferences: NotificationPreferences
}

export const usersApi = {
  getMe: async (): Promise<User> => {
    const response = await apiClient.get('/users/me')
    return response.data
  },

  updateProfile: async (data: UpdateProfileData): Promise<User> => {
    const response = await apiClient.patch('/users/me/profile', data)
    return response.data
  },

  updatePreferences: async (data: UpdatePreferencesData): Promise<User> => {
    const response = await apiClient.patch('/users/me/preferences', data)
    return response.data
  },
}
