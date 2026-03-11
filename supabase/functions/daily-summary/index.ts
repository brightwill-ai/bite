import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from '@supabase/supabase-js'

const RESEND_API_URL = 'https://api.resend.com/emails'

interface TopItem {
  name: string
  quantity: number
}

interface RestaurantSummary {
  restaurantId: string
  restaurantName: string
  ownerEmail: string
  date: string
  orderCount: number
  totalRevenue: number
  topItems: TopItem[]
}

async function getRestaurantSummary(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string,
  todayStart: string,
  tomorrowStart: string
): Promise<RestaurantSummary | null> {
  // Get restaurant name and owner email in one query
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name')
    .eq('id', restaurantId)
    .single()

  if (!restaurant) return null

  const { data: owner } = await supabase
    .from('staff')
    .select('email')
    .eq('restaurant_id', restaurantId)
    .eq('role', 'owner')
    .single()

  if (!owner) return null

  // Get today's orders
  const { data: orders } = await supabase
    .from('orders')
    .select('id, total')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', todayStart)
    .lt('created_at', tomorrowStart)

  const orderCount = orders?.length ?? 0
  const totalRevenue = (orders ?? []).reduce((sum, o) => sum + (o.total ?? 0), 0)

  // Get top items by quantity
  if (orderCount === 0) {
    return {
      restaurantId,
      restaurantName: restaurant.name,
      ownerEmail: owner.email,
      date: todayStart.split('T')[0],
      orderCount: 0,
      totalRevenue: 0,
      topItems: [],
    }
  }

  const orderIds = (orders ?? []).map((o) => o.id)
  const { data: items } = await supabase
    .from('order_items')
    .select('item_name, quantity')
    .in('order_id', orderIds)

  // Aggregate item quantities
  const itemMap = new Map<string, number>()
  for (const item of items ?? []) {
    itemMap.set(item.item_name, (itemMap.get(item.item_name) ?? 0) + item.quantity)
  }

  const topItems: TopItem[] = [...itemMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, quantity]) => ({ name, quantity }))

  return {
    restaurantId,
    restaurantName: restaurant.name,
    ownerEmail: owner.email,
    date: todayStart.split('T')[0],
    orderCount,
    totalRevenue,
    topItems,
  }
}

function buildEmailHtml(summary: RestaurantSummary): string {
  const revenueFormatted = `$${(summary.totalRevenue).toFixed(2)}`
  const topItemsRows = summary.topItems
    .map(
      (item) => `
        <tr>
          <td style="padding: 6px 12px; border-bottom: 1px solid #E0DDD9;">${item.name}</td>
          <td style="padding: 6px 12px; border-bottom: 1px solid #E0DDD9; text-align: right; font-family: monospace;">${item.quantity}</td>
        </tr>`
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: DM Sans, sans-serif; background: #EDECEA; margin: 0; padding: 32px;">
  <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E0DDD9; border-radius: 8px; overflow: hidden;">
    <div style="background: #1A1816; padding: 24px 32px;">
      <h1 style="color: #F5F4F1; font-size: 20px; margin: 0; font-weight: 700;">Daily Summary</h1>
      <p style="color: #A8A49F; font-size: 13px; margin: 4px 0 0;">${summary.restaurantName} &middot; ${summary.date}</p>
    </div>
    <div style="padding: 24px 32px;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 12px; background: #F5F4F1; border-radius: 4px; text-align: center;">
            <div style="font-size: 28px; font-weight: 700; color: #1A1816;">${summary.orderCount}</div>
            <div style="font-size: 12px; color: #6B6760; margin-top: 2px;">Orders</div>
          </td>
          <td style="width: 12px;"></td>
          <td style="padding: 12px; background: #F5F4F1; border-radius: 4px; text-align: center;">
            <div style="font-size: 28px; font-weight: 700; color: #1A1816; font-family: monospace;">${revenueFormatted}</div>
            <div style="font-size: 12px; color: #6B6760; margin-top: 2px;">Revenue</div>
          </td>
        </tr>
      </table>
      ${
        summary.topItems.length > 0
          ? `
      <h2 style="font-size: 13px; font-weight: 600; color: #6B6760; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px;">Top Items</h2>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #E0DDD9; border-radius: 4px; overflow: hidden;">
        <thead>
          <tr style="background: #F5F4F1;">
            <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6B6760; font-weight: 500;">Item</th>
            <th style="padding: 8px 12px; text-align: right; font-size: 12px; color: #6B6760; font-weight: 500;">Qty</th>
          </tr>
        </thead>
        <tbody>${topItemsRows}</tbody>
      </table>`
          : '<p style="color: #A8A49F; font-size: 14px;">No orders today.</p>'
      }
    </div>
    <div style="padding: 16px 32px; border-top: 1px solid #E0DDD9; background: #F5F4F1;">
      <p style="font-size: 11px; color: #A8A49F; margin: 0;">Sent by Bite &mdash; QR table ordering for restaurants</p>
    </div>
  </div>
</body>
</html>`
}

async function sendEmail(
  resendApiKey: string,
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Bite <noreply@trybite.us>',
      to,
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Resend error ${response.status}: ${text}`)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
    return new Response(
      JSON.stringify({ error: 'Missing required environment variables' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Parse optional restaurant_id from body
  let targetRestaurantId: string | undefined
  try {
    const body = await req.json() as { restaurant_id?: string }
    targetRestaurantId = body.restaurant_id
  } catch {
    // No body or invalid JSON — run for all restaurants
  }

  // Date range for "today" in UTC
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

  // Resolve which restaurants to process
  let restaurantIds: string[]
  if (targetRestaurantId) {
    restaurantIds = [targetRestaurantId]
  } else {
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('id')
      .eq('is_active', true)
    restaurantIds = (restaurants ?? []).map((r) => r.id)
  }

  const results: Array<{ restaurant_id: string; status: string; error?: string }> = []

  for (const restaurantId of restaurantIds) {
    try {
      const summary = await getRestaurantSummary(supabase, restaurantId, todayStart, tomorrowStart)
      if (!summary) {
        results.push({ restaurant_id: restaurantId, status: 'skipped', error: 'No restaurant or owner found' })
        continue
      }

      const html = buildEmailHtml(summary)
      const subject = `Your Bite daily summary — ${summary.date}`
      await sendEmail(resendApiKey, summary.ownerEmail, subject, html)

      results.push({ restaurant_id: restaurantId, status: 'sent' })
    } catch (err) {
      results.push({
        restaurant_id: restaurantId,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
