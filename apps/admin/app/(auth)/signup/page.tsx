'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'

export default function SignupPage() {
  const router = useRouter()
  const signup = useAuthStore((s) => s.signup)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    const result = await signup(email, password, name)
    if (result.success) {
      router.push('/onboarding')
    } else {
      setError(result.error || 'Signup failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="bg-surface2 border border-border rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="font-display font-bold text-3xl text-ink tracking-tight">
              Bite
            </h1>
            <p className="text-muted text-sm mt-2">Create your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marco Rossi"
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-sm text-ink placeholder:text-faint text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/20 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-sm text-ink placeholder:text-faint text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/20 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-sm text-ink placeholder:text-faint text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/20 transition-colors"
                required
              />
            </div>

            {error && (
              <p className="text-error text-sm font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-surface font-medium text-sm py-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-border text-center">
            <p className="text-sm text-muted">
              Already have an account?{' '}
              <Link href="/login" className="text-ink font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
