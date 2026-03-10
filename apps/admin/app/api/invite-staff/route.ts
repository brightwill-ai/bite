import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@bite/types/supabase'

type InvitePayload = {
  email?: string
  role?: 'manager' | 'staff'
  name?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseInvitePayload(value: unknown): InvitePayload {
  if (!isRecord(value)) {
    return {}
  }

  return {
    email: typeof value.email === 'string' ? value.email : undefined,
    role: value.role === 'manager' ? 'manager' : 'staff',
    name: typeof value.name === 'string' ? value.name : undefined,
  }
}

function fallbackNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] ?? 'Staff'
  if (!localPart) {
    return 'Staff'
  }

  return localPart
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = parseInvitePayload(await request.json().catch(() => null))
  const email = body.email?.trim().toLowerCase()
  const role = body.role ?? 'staff'
  const name = body.name?.trim() || (email ? fallbackNameFromEmail(email) : 'Staff')

  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  const { data: staffRow, error: staffError } = await supabase
    .from('staff')
    .select('restaurant_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (staffError || !staffRow) {
    return NextResponse.json({ error: 'Staff context not found' }, { status: 403 })
  }

  if (staffRow.role !== 'owner' && staffRow.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Service role key is not configured' }, { status: 500 })
  }

  const admin = createServiceClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { data: invitedData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name },
    redirectTo: `${request.nextUrl.origin}/login`,
  })

  if (inviteError || !invitedData.user?.id) {
    return NextResponse.json({ error: inviteError?.message ?? 'Failed to invite user' }, { status: 400 })
  }

  const { error: upsertError } = await admin
    .from('staff')
    .upsert(
      {
        user_id: invitedData.user.id,
        restaurant_id: staffRow.restaurant_id,
        name,
        email,
        role,
      },
      { onConflict: 'user_id,restaurant_id' }
    )

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
