'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Printer, Users, Building2, Plus, X, TestTube } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import toast from 'react-hot-toast'

interface StaffMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'manager' | 'staff'
}

const mockStaff: StaffMember[] = [
  { id: 's1', name: 'Marco Rossi', email: 'marco@bite.so', role: 'owner' },
  { id: 's2', name: 'Sofia Chen', email: 'sofia@bite.so', role: 'manager' },
  { id: 's3', name: 'James Park', email: 'james@bite.so', role: 'staff' },
]

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
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
  const [restaurantName, setRestaurantName] = useState('The Oakwood')
  const [slug, setSlug] = useState('the-oakwood')
  const [cuisine, setCuisine] = useState('Modern European')
  const [address, setAddress] = useState('42 Oak Street, Melbourne VIC 3000')

  const [apiKey, setApiKey] = useState('sk_live_oakwood_printer_001')
  const [printerId, setPrinterId] = useState('PRT-001-KITCHEN')

  const [staff, setStaff] = useState<StaffMember[]>(mockStaff)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'manager' | 'staff'>('staff')

  const handleSaveProfile = () => {
    toast.success('Restaurant profile saved')
  }

  const handleTestPrint = () => {
    toast.success('Test print sent to kitchen printer')
  }

  const handleInvite = () => {
    if (!inviteEmail) return
    const newStaff: StaffMember = {
      id: `s${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
    }
    setStaff([...staff, newStaff])
    setShowInviteModal(false)
    setInviteEmail('')
    toast.success(`Invite sent to ${inviteEmail}`)
  }

  const roleColors: Record<string, string> = {
    owner: 'bg-ink text-surface',
    manager: 'bg-surface border border-border text-muted',
    staff: 'bg-bg text-faint',
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your restaurant configuration" />

      {/* Restaurant Profile */}
      <SectionCard icon={Building2} title="Restaurant Profile">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Restaurant Name</label>
            <input
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Slug</label>
            <div className="flex items-center">
              <span className="text-sm text-muted mr-1">bite.so/</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="flex-1 px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Cuisine Type</label>
            <input
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>
        </div>
        <button
          onClick={handleSaveProfile}
          className="mt-4 px-6 py-2 bg-ink text-surface rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Save Changes
        </button>
      </SectionCard>

      {/* Printer Setup */}
      <SectionCard icon={Printer} title="Printer Setup">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">API Key</label>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Printer ID</label>
            <input
              value={printerId}
              onChange={(e) => setPrinterId(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>
        </div>
        <button
          onClick={handleTestPrint}
          className="mt-4 flex items-center gap-2 px-6 py-2 border border-border rounded-full text-sm font-medium text-ink hover:bg-bg transition-colors"
        >
          <TestTube size={14} />
          Test Print
        </button>
      </SectionCard>

      {/* Staff Accounts */}
      <SectionCard icon={Users} title="Staff Accounts">
        <div className="space-y-3">
          {staff.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-ink">{member.name}</p>
                <p className="text-xs text-muted">{member.email}</p>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[member.role]}`}
              >
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="mt-4 flex items-center gap-2 px-6 py-2 bg-ink text-surface rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={14} />
          Invite Staff
        </button>
      </SectionCard>

      {/* Invite Modal */}
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
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-1 hover:bg-bg rounded-sm transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="staff@example.com"
                    className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-ink/10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'manager' | 'staff')}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none"
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleInvite}
                  className="flex-1 bg-ink text-surface font-medium text-sm py-2.5 rounded-full hover:opacity-90 transition-opacity"
                >
                  Send Invite
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
