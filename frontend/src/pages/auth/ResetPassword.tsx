import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import AuthLayout from '../../components/auth/AuthLayout'
import { authApi } from '../../api/auth'
import { validatePassword, getPasswordStrength } from '../../utils/validation'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  const passwordValidation = validatePassword(password)
  const passwordStrength = password ? getPasswordStrength(password) : null

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Invalid or missing reset token')
      return
    }

    // Validate password
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join('. '))
      setPasswordTouched(true)
      return
    }

    // Check password match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      await authApi.resetPassword({ token, password })
      setSuccess(true)
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Failed to reset password. The link may have expired. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthLayout title="Password reset successful" showBackLink>
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-500/10 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-green-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <p className="text-zinc-400 mb-8">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600 text-white text-[15px] font-semibold rounded-xl hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
          >
            Back to login
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Your new password must be different from previously used passwords."
      showBackLink
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">New password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordTouched(true)}
              className={`w-full px-4 pr-12 py-3.5 bg-[#16161e] border rounded-xl text-white text-[15px] placeholder-zinc-500 focus:outline-none transition-all ${
                passwordTouched && !passwordValidation.isValid
                  ? 'border-red-500/50 focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10'
                  : 'border-white/8 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10'
              }`}
              placeholder="Enter new password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Password strength indicator */}
          {password && (
            <div className="mt-3">
              <div className="h-1 bg-[#22222e] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    passwordStrength === 'strong'
                      ? 'w-full bg-green-500'
                      : passwordStrength === 'medium'
                      ? 'w-2/3 bg-yellow-500'
                      : 'w-1/3 bg-red-500'
                  }`}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span
                  className={`text-xs font-medium ${
                    passwordStrength === 'strong'
                      ? 'text-green-400'
                      : passwordStrength === 'medium'
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  }`}
                >
                  {passwordStrength && passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)} password
                </span>
              </div>
            </div>
          )}

          {/* Password validation errors */}
          {passwordTouched && !passwordValidation.isValid && (
            <div className="mt-2 space-y-1">
              {passwordValidation.errors.map((err, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {passwordTouched && passwordValidation.isValid && (
            <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
              <CheckCircle className="w-3 h-3" />
              <span>Password meets requirements</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Confirm password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 pr-12 py-3.5 bg-[#16161e] border border-white/8 rounded-xl text-white text-[15px] placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all"
              placeholder="Confirm new password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !token}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600 text-white text-[15px] font-semibold rounded-xl hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          Reset password
        </button>
      </form>
    </AuthLayout>
  )
}
