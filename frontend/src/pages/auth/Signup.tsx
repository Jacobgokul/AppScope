import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import AuthLayout from '../../components/auth/AuthLayout'
import { useAuth } from '../../hooks/useAuth'
import { validatePassword, getPasswordStrength } from '../../utils/validation'

export default function Signup() {
  const navigate = useNavigate()
  const { signup } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  const passwordValidation = validatePassword(password)
  const passwordStrength = password ? getPasswordStrength(password) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

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

    // Check terms acceptance
    if (!termsAccepted) {
      setError('Please accept the Terms of Service and Privacy Policy')
      return
    }

    setLoading(true)

    try {
      await signup(email, password, companyName || undefined)
      navigate('/projects/new')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Sign in
          </Link>
        </>
      }
    >
      {/* Social signup buttons */}
      <div className="space-y-3 mb-6">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[#16161e] border border-white/8 rounded-xl text-white text-[15px] font-medium hover:bg-[#22222e] hover:border-white/15 transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <button
          type="button"
          className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[#16161e] border border-white/8 rounded-xl text-white text-[15px] font-medium hover:bg-[#22222e] hover:border-white/15 transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Continue with GitHub
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-white/8" />
        <span className="text-xs text-zinc-500 uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-white/8" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Full name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3.5 bg-[#16161e] border border-white/8 rounded-xl text-white text-[15px] placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            placeholder="John Doe"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Work email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3.5 bg-[#16161e] border border-white/8 rounded-xl text-white text-[15px] placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            placeholder="you@company.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Company name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-4 py-3.5 bg-[#16161e] border border-white/8 rounded-xl text-white text-[15px] placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            placeholder="Acme Inc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Password</label>
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
              placeholder="Create a strong password"
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
              placeholder="Confirm your password"
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

        <div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 w-[18px] h-[18px] rounded accent-indigo-500 cursor-pointer flex-shrink-0"
            />
            <span className="text-sm text-zinc-400">
              I agree to the{' '}
              <Link to="/terms" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                Privacy Policy
              </Link>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600 text-white text-[15px] font-semibold rounded-xl hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          Create account
        </button>
      </form>
    </AuthLayout>
  )
}
