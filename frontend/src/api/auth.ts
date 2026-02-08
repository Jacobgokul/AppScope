import apiClient from './client'
import type { User, Token } from '../types'

export interface SignupData {
  email: string
  password: string
  company_name?: string
  name?: string
}

export interface LoginData {
  email: string
  password: string
}

export interface ForgotPasswordData {
  email: string
}

export interface ResetPasswordData {
  token: string
  password: string
}

export interface VerifyEmailData {
  code: string
}

export const authApi = {
  signup: async (data: SignupData): Promise<User> => {
    const response = await apiClient.post('/auth/signup', data)
    return response.data
  },

  login: async (data: LoginData): Promise<Token> => {
    const response = await apiClient.post('/auth/login', data)
    return response.data
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get('/users/me')
    return response.data
  },

  refresh: async (refreshToken: string): Promise<Token> => {
    const response = await apiClient.post('/auth/refresh', null, {
      params: { refresh_token: refreshToken },
    })
    return response.data
  },

  forgotPassword: async (data: ForgotPasswordData): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/forgot-password', data)
    return response.data
  },

  resetPassword: async (data: ResetPasswordData): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/reset-password', data)
    return response.data
  },

  verifyEmail: async (data: VerifyEmailData): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/verify-email', data)
    return response.data
  },

  resendVerification: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/resend-verification')
    return response.data
  },
}
