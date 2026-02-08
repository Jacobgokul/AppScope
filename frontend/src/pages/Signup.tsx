import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, Mail, Lock, Building, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store'
import { validatePassword, getPasswordStrength } from '../utils/validation'

export default function Signup() {
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  const passwordValidation = validatePassword(password)
  const passwordStrength = password ? getPasswordStrength(password) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate password before submitting
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join('. '))
      setPasswordTouched(true)
      return
    }

    setLoading(true)

    try {
      // Create account
      await authApi.signup({
        email,
        password,
        company_name: companyName || undefined,
      })

      // Login
      const tokens = await authApi.login({ email, password })
      setTokens(tokens.access_token, tokens.refresh_token)

      const user = await authApi.getMe()
      setUser(user)

      navigate('/projects/new')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <Activity className="w-10 h-10 text-primary-500" />
            <span className="text-3xl font-bold text-white">AppScope</span>
          </Link>
          <p className="text-gray-500 mt-2">Create your account</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-dark-800 rounded-xl border border-dark-700 p-8"
        >
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setPasswordTouched(true)}
                  className={`w-full pl-10 pr-4 py-3 bg-dark-700 border rounded-lg text-white focus:outline-none ${
                    passwordTouched && !passwordValidation.isValid
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-dark-600 focus:border-primary-500'
                  }`}
                  placeholder="Create a password"
                  required
                />
              </div>

              {/* Password validation feedback */}
              {password && passwordTouched && (
                <div className="mt-2 space-y-1">
                  {passwordValidation.errors.map((err, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-red-400">
                      <AlertCircle className="w-3 h-3" />
                      <span>{err}</span>
                    </div>
                  ))}
                  {passwordValidation.isValid && (
                    <div className="flex items-center gap-2 text-xs text-green-400">
                      <CheckCircle className="w-3 h-3" />
                      <span>Password meets requirements</span>
                    </div>
                  )}
                </div>
              )}

              {/* Password strength indicator */}
              {password && passwordValidation.isValid && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Strength:</span>
                    <div className="flex-1 h-1 bg-dark-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          passwordStrength === 'strong'
                            ? 'w-full bg-green-500'
                            : passwordStrength === 'medium'
                            ? 'w-2/3 bg-yellow-500'
                            : 'w-1/3 bg-red-500'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-xs capitalize ${
                        passwordStrength === 'strong'
                          ? 'text-green-400'
                          : passwordStrength === 'medium'
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }`}
                    >
                      {passwordStrength}
                    </span>
                  </div>
                </div>
              )}

              <p className="mt-2 text-xs text-gray-500">
                Must be 8+ characters with at least one letter and one number
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Company Name <span className="text-gray-600">(optional)</span>
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="Acme Inc"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-500 text-dark-900 rounded-lg font-semibold hover:bg-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              Create Account
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
