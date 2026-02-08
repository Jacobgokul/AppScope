import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle } from 'lucide-react'
import AuthLayout from '../../components/auth/AuthLayout'
import { authApi } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCountdown])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newCode = [...code]

    for (let i = 0; i < 6; i++) {
      newCode[i] = pastedData[i] || ''
    }

    setCode(newCode)

    // Focus the next empty input or the last one
    const nextEmptyIndex = newCode.findIndex((c) => !c)
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex
    inputRefs.current[focusIndex]?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits')
      return
    }

    setLoading(true)

    try {
      await authApi.verifyEmail({ code: fullCode })
      setSuccess(true)
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid verification code. Please try again.')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setResendLoading(true)

    try {
      await authApi.resendVerification()
      setResendCountdown(60)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend code. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  if (success) {
    return (
      <AuthLayout title="Email verified!" showLogo={false}>
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-500/10 rounded-full flex items-center justify-center animate-scale-in">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <p className="text-zinc-400 mb-4">Your email has been successfully verified.</p>
          <p className="text-sm text-zinc-500">Redirecting to dashboard...</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Check your email" showLogo={false}>
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-6 bg-green-500/10 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-green-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <p className="text-zinc-400">
          We've sent a verification code to
          <br />
          <strong className="text-white">{user?.email || 'your email'}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* OTP Inputs */}
        <div className="flex gap-3 justify-center" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-14 h-16 bg-[#16161e] border border-white/8 rounded-xl text-white text-2xl font-semibold text-center focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all"
              autoFocus={index === 0}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || code.some((d) => !d)}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600 text-white text-[15px] font-semibold rounded-xl hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          Verify email
        </button>

        <div className="text-center text-sm text-zinc-500">
          Didn't receive the email?{' '}
          {resendCountdown > 0 ? (
            <span className="text-zinc-400">Resend in {resendCountdown}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
            >
              {resendLoading ? 'Sending...' : 'Click to resend'}
            </button>
          )}
        </div>
      </form>
    </AuthLayout>
  )
}
