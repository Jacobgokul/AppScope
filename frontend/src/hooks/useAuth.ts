import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { authApi } from '../api/auth'

export function useAuth() {
  const navigate = useNavigate()
  const { user, isAuthenticated, setUser, setTokens, logout: storeLogout } = useAuthStore()

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await authApi.login({ email, password })
      setTokens(tokens.access_token, tokens.refresh_token)

      const user = await authApi.getMe()
      setUser(user)

      return user
    },
    [setTokens, setUser]
  )

  const signup = useCallback(
    async (email: string, password: string, companyName?: string) => {
      await authApi.signup({
        email,
        password,
        company_name: companyName,
      })

      // Auto-login after signup
      const tokens = await authApi.login({ email, password })
      setTokens(tokens.access_token, tokens.refresh_token)

      const user = await authApi.getMe()
      setUser(user)

      return user
    },
    [setTokens, setUser]
  )

  const logout = useCallback(() => {
    storeLogout()
    navigate('/login')
  }, [storeLogout, navigate])

  return {
    user,
    isAuthenticated,
    login,
    signup,
    logout,
  }
}
