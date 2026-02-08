import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string | React.ReactNode
  showLogo?: boolean
  showBackLink?: boolean
}

export default function AuthLayout({
  children,
  title,
  subtitle,
  showLogo = true,
  showBackLink = false,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Left side - Features */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/5" />

        {/* Radial gradient effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-radial from-indigo-500/20 via-transparent to-transparent rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-20 py-16">
          <h1 className="text-5xl font-extrabold mb-6 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Monitor with confidence
          </h1>
          <p className="text-lg text-zinc-400 mb-12 max-w-md">
            Join thousands of developers who trust AppScope to keep their applications running smoothly.
          </p>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1a1a24] flex items-center justify-center text-2xl">
                ⚡
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">Real-time Monitoring</h4>
                <p className="text-sm text-zinc-500">See issues as they happen</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1a1a24] flex items-center justify-center text-2xl">
                🤖
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">AI-Powered Analysis</h4>
                <p className="text-sm text-zinc-500">Automatic root cause detection</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1a1a24] flex items-center justify-center text-2xl">
                🔒
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">Enterprise Security</h4>
                <p className="text-sm text-zinc-500">SOC 2 compliant infrastructure</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[440px]">
          {/* Logo */}
          {showLogo && (
            <Link to="/" className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">A</span>
              </div>
              <span className="text-2xl font-bold text-white">AppScope</span>
            </Link>
          )}

          {/* Card */}
          <div className="bg-[#12121a] border border-white/8 rounded-3xl p-12">
            {/* Back link */}
            {showBackLink && (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-8"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to login
              </Link>
            )}

            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>
              {subtitle && (
                <div className="text-zinc-400 text-[15px]">{subtitle}</div>
              )}
            </div>

            {/* Content */}
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
