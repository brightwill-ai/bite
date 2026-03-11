'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'

export default function OnboardingPage() {
  const router = useRouter()
  const {
    initialize,
    isLoading,
    isAuthenticated,
    needsOnboarding,
    createRestaurant,
  } = useAuthStore((state) => ({
    initialize: state.initialize,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    needsOnboarding: state.needsOnboarding,
    createRestaurant: state.createRestaurant,
  }))

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [cuisineType, setCuisineType] = useState('')
  const [address, setAddress] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void initialize()
  }, [initialize])

  useEffect(() => {
    if (name && !slug) {
      setSlug(
        name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
      )
    }
  }, [name, slug])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
    if (!isLoading && isAuthenticated && !needsOnboarding) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, needsOnboarding, router])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const result = await createRestaurant({
      name: name.trim(),
      slug: slug.trim(),
      cuisineType: cuisineType.trim() || undefined,
      address: address.trim() || undefined,
      timezone: timezone.trim() || undefined,
    })

    if (!result.success) {
      setError(result.error ?? 'Failed to create restaurant')
      setSubmitting(false)
      return
    }

    router.push('/menu/upload?onboarding=1')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse text-muted text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[520px] bg-surface2 border border-border rounded-lg p-8">
        <div className="mb-6">
          <h1 className="font-display font-bold text-3xl text-ink tracking-tight">
            Finish Setup
          </h1>
          <p className="text-muted text-sm mt-2">
            Step 1 of 3. Create your restaurant workspace, then upload your menu and set up tables.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Restaurant Name
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="The Oakwood"
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Slug
            </label>
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="the-oakwood"
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Cuisine Type
              </label>
              <input
                value={cuisineType}
                onChange={(event) => setCuisineType(event.target.value)}
                placeholder="American Bistro"
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Timezone
              </label>
              <input
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                placeholder="America/New_York"
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Address
            </label>
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="142 Main Street, Nashville, TN"
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>

          {error && <p className="text-error text-sm font-medium">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-ink text-surface font-medium text-sm py-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? 'Creating workspace...' : 'Create Restaurant'}
          </button>
        </form>
      </div>
    </div>
  )
}
