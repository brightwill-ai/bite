'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ElementType, ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, Plus, Printer, TestTube, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/PageHeader'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'

interface StaffMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'manager' | 'staff'
}

function normalizeRole(value: string): 'owner' | 'manager' | 'staff' {
  if (value === 'owner' || value === 'manager') {
    return value
  }
  return 'staff'
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: ElementType
  title: string
  children: ReactNode
}) {
  return (
    <div className="bg-surface2 border border-border rounded">
      <div className="flex items-center gap-3 p-5 border-b border-border">
        <Icon size={18} className="text-muted" />
        <h2 className="font-display font-bold text-base text-ink">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), [])
  const restaurant = useAuthStore((state) => state.restaurant)

  const [restaurantName, setRestaurantName] = useState('')
  const [slug, setSlug] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [address, setAddress] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  const [apiKey, setApiKey] = useState('')
  const [printerId, setPrinterId] = useState('')

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [isLoadingStaff, setIsLoadingStaff] = useState(false)

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'manager' | 'staff'>('staff')
  const [isInviting, setIsInviting] = useState(false)

  useEffect(() => {
    if (!restaurant) {
      return
    }

    setRestaurantName(restaurant.name)
    setSlug(restaurant.slug)
    setCuisine(restaurant.cuisine_type ?? '')
    setAddress(restaurant.address ?? '')
    setTimezone(restaurant.timezone ?? 'America/New_York')
    setApiKey(restaurant.printnode_api_key ?? '')
    setPrinterId(restaurant.printnode_printer_id ?? '')
  }, [restaurant])

  const loadStaff = useCallback(async () => {
    if (!restaurant) {
      setStaff([])
      return
    }

    setIsLoadingStaff(true)
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, email, role')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: true })

    if (error || !data) {
      setIsLoadingStaff(false)
      return
    }

    setStaff(
      data.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        role: normalizeRole(member.role),
      }))
    )
    setIsLoadingStaff(false)
  }, [restaurant, supabase])

  useEffect(() => {
    void loadStaff()
  }, [loadStaff])

  const handleSaveProfile = async () => {
    if (!restaurant) {
      return
    }

    const { error } = await supabase
      .from('restaurants')
      .update({
        name: restaurantName.trim(),
        slug: slug.trim(),
        cuisine_type: cuisine.trim() || null,
        address: address.trim() || null,
        timezone: timezone.trim() || null,
        printnode_api_key: apiKey.trim() || null,
        printnode_printer_id: printerId.trim() || null,
      })
      .eq('id', restaurant.id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Restaurant profile saved')
  }

  const handleTestPrint = async () => {
    if (!restaurant) {
      return
    }

    const { error } = await supabase.functions.invoke('trigger-print', {
      body: {
        mode: 'test',
        restaurantId: restaurant.id,
      },
    })

    if (error) {
      toast.error(error.message || 'Could not send test print')
      return
    }

    toast.success('Test print sent to kitchen printer')
  }

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase()
    if (!email) {
      toast.error('Please enter an email')
      return
    }

    setIsInviting(true)

    const response = await fetch('/api/invite-staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        role: inviteRole,
      }),
    })

    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    if (!response.ok) {
      const message =
        typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : 'Failed to send invite'
      toast.error(message)
      setIsInviting(false)
      return
    }

    toast.success('Invite sent')
    setShowInviteModal(false)
    setInviteEmail('')
    setInviteRole('staff')
    setIsInviting(false)
    await loadStaff()
  }

  const roleColors: Record<'owner' | 'manager' | 'staff', string> = {
    owner: 'bg-ink text-surface',
    manager: 'bg-surface border border-border text-muted',
    staff: 'bg-bg text-faint',
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your restaurant configuration" />

      <SectionCard icon={Building2} title="Restaurant Profile">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Restaurant Name</label>
            <input
              value={restaurantName}
              onChange={(event) => setRestaurantName(event.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Slug</label>
            <div className="flex items-center">
              <span className="text-sm text-muted mr-1">menu/</span>
              <input
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                className="flex-1 px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Cuisine Type</label>
            <input
              value={cuisine}
              onChange={(event) => setCuisine(event.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Timezone</label>
            <input
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-ink mb-1.5">Address</label>
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>
        </div>
        <button
          onClick={() => {
            void handleSaveProfile()
          }}
          className="mt-4 px-6 py-2 bg-ink text-surface rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Save Changes
        </button>
      </SectionCard>

      <SectionCard icon={Printer} title="Printer Setup">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">PrintNode API Key</label>
            <input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Printer ID</label>
            <input
              value={printerId}
              onChange={(event) => setPrinterId(event.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>
        </div>
        <button
          onClick={() => {
            void handleTestPrint()
          }}
          className="mt-4 flex items-center gap-2 px-6 py-2 border border-border rounded-full text-sm font-medium text-ink hover:bg-bg transition-colors"
        >
          <TestTube size={14} />
          Test Print
        </button>
      </SectionCard>

      <SectionCard icon={Users} title="Staff Accounts">
        <div className="space-y-3">
          {staff.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium text-ink">{member.name}</p>
                <p className="text-xs text-muted">{member.email}</p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[member.role]}`}>
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </span>
            </div>
          ))}
          {!isLoadingStaff && staff.length === 0 && <p className="text-sm text-muted">No staff members found.</p>}
          {isLoadingStaff && <p className="text-sm text-muted">Loading staff...</p>}
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="mt-4 flex items-center gap-2 px-6 py-2 bg-ink text-surface rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={14} />
          Invite Staff
        </button>
      </SectionCard>

      <AnimatePresence>
        {showInviteModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInviteModal(false)}
              className="fixed inset-0 bg-ink z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-surface2 border border-border rounded-lg p-6 z-50 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg text-ink">Invite Staff</h2>
                <button onClick={() => setShowInviteModal(false)} className="p-1 hover:bg-bg rounded-sm transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="staff@example.com"
                    className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-ink/10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value as 'manager' | 'staff')}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none"
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    void handleInvite()
                  }}
                  disabled={isInviting}
                  className="flex-1 bg-ink text-surface font-medium text-sm py-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isInviting ? 'Sending...' : 'Send Invite'}
                </button>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2.5 text-sm text-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
