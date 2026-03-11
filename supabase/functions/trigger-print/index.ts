import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from '@supabase/supabase-js'

type TriggerPrintPayload = {
  mode?: 'test' | 'order'
  restaurantId?: string
  orderId?: string
  record?: {
    id?: string
    restaurant_id?: string
  }
}

type OrderLine = {
  name: string
  quantity: number
  subtotal: number
  modifiers: { name: string; price_delta: number }[]
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parsePayload(value: unknown): TriggerPrintPayload {
  if (!isRecord(value)) {
    return {}
  }

  const record = isRecord(value.record) ? value.record : undefined
  return {
    mode: value.mode === 'test' ? 'test' : 'order',
    restaurantId: typeof value.restaurantId === 'string' ? value.restaurantId : undefined,
    orderId: typeof value.orderId === 'string' ? value.orderId : undefined,
    record: record
      ? {
          id: typeof record.id === 'string' ? record.id : undefined,
          restaurant_id: typeof record.restaurant_id === 'string' ? record.restaurant_id : undefined,
        }
      : undefined,
  }
}

function buildOrderTicket(params: {
  ticketNumber: number
  tableLabel: string
  lines: OrderLine[]
  specialInstructions: string | null
  subtotal: number
  tax: number
  total: number
}): string {
  const lines: string[] = []
  lines.push('BITE KITCHEN TICKET')
  lines.push('------------------------------')
  lines.push(`Ticket #${String(params.ticketNumber).padStart(3, '0')}`)
  lines.push(`Table: ${params.tableLabel}`)
  lines.push(`Time: ${new Date().toLocaleString('en-US', { hour12: false })}`)
  lines.push('------------------------------')

  for (const line of params.lines) {
    lines.push(`${line.quantity}x ${line.name}`)
    if (line.modifiers.length > 0) {
      for (const modifier of line.modifiers) {
        const delta = modifier.price_delta > 0 ? ` (+$${modifier.price_delta.toFixed(2)})` : ''
        lines.push(`  - ${modifier.name}${delta}`)
      }
    }
    lines.push(`  Subtotal: $${line.subtotal.toFixed(2)}`)
    lines.push('')
  }

  if (params.specialInstructions) {
    lines.push('Special Instructions:')
    lines.push(params.specialInstructions)
    lines.push('')
  }

  lines.push('------------------------------')
  lines.push(`Subtotal: $${params.subtotal.toFixed(2)}`)
  lines.push(`Tax: $${params.tax.toFixed(2)}`)
  lines.push(`Total: $${params.total.toFixed(2)}`)
  lines.push('------------------------------')

  return lines.join('\n')
}

function buildTestTicket(restaurantName: string): string {
  return [
    'BITE TEST PRINT',
    '------------------------------',
    `Restaurant: ${restaurantName}`,
    `Time: ${new Date().toISOString()}`,
    '',
    'If you see this, PrintNode is connected.',
    '------------------------------',
  ].join('\n')
}

async function sendToPrintNode(params: {
  apiKey: string
  printerId: string
  title: string
  content: string
}) {
  const parsedPrinterId = Number.parseInt(params.printerId, 10)
  if (!Number.isFinite(parsedPrinterId)) {
    throw new Error('PrintNode printer ID must be numeric')
  }

  const authHeader = `Basic ${btoa(`${params.apiKey}:`)}`
  const printJobResponse = await fetch('https://api.printnode.com/printjobs', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      printerId: parsedPrinterId,
      title: params.title,
      contentType: 'raw_base64',
      content: btoa(params.content),
      source: 'Bite',
    }),
  })

  if (!printJobResponse.ok) {
    const errorText = await printJobResponse.text()
    throw new Error(errorText || 'PrintNode API request failed')
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const webhookSecret = Deno.env.get('PRINT_WEBHOOK_SECRET')
  if (webhookSecret) {
    const providedSecret = request.headers.get('x-print-secret')
    if (providedSecret !== webhookSecret) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase service role is not configured' }, 500)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  let payload: TriggerPrintPayload
  try {
    payload = parsePayload(await request.json())
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400)
  }

  const mode = payload.mode ?? 'order'

  if (mode === 'test') {
    const restaurantId = payload.restaurantId
    if (!restaurantId) {
      return jsonResponse({ error: 'restaurantId is required for test mode' }, 400)
    }

    const { data: restaurant, error: restaurantError } = await admin
      .from('restaurants')
      .select('name, printnode_api_key, printnode_printer_id')
      .eq('id', restaurantId)
      .single()

    if (restaurantError || !restaurant) {
      return jsonResponse({ error: 'Restaurant not found' }, 404)
    }

    if (!restaurant.printnode_api_key || !restaurant.printnode_printer_id) {
      return jsonResponse({ error: 'PrintNode is not configured for this restaurant' }, 400)
    }

    await sendToPrintNode({
      apiKey: restaurant.printnode_api_key,
      printerId: restaurant.printnode_printer_id,
      title: 'Bite Test Print',
      content: buildTestTicket(restaurant.name),
    })

    return jsonResponse({ success: true })
  }

  const orderId = payload.orderId ?? payload.record?.id
  if (!orderId) {
    return jsonResponse({ error: 'orderId is required' }, 400)
  }

  const orderQuery = admin
    .from('orders')
    .select(
      `
        id,
        ticket_number,
        special_instructions,
        subtotal,
        tax,
        total,
        table:tables(table_number, label),
        restaurant:restaurants(name, printnode_api_key, printnode_printer_id),
        order_items(
          item_name,
          quantity,
          subtotal,
          order_item_modifiers(name, price_delta)
        )
      `
    )
    .eq('id', orderId)
    .single()

  const { data: order, error: orderError } = await orderQuery

  if (orderError || !order) {
    return jsonResponse({ error: 'Order not found' }, 404)
  }

  const restaurant = order.restaurant
  if (!restaurant?.printnode_api_key || !restaurant.printnode_printer_id) {
    await admin.from('orders').update({ print_status: 'none' }).eq('id', orderId)
    return jsonResponse({ success: true, skipped: true, reason: 'printer_not_configured' })
  }

  const orderLines: OrderLine[] = (order.order_items ?? []).map((item) => ({
    name: item.item_name,
    quantity: item.quantity,
    subtotal: item.subtotal,
    modifiers: (item.order_item_modifiers ?? []).map((modifier) => ({
      name: modifier.name,
      price_delta: modifier.price_delta ?? 0,
    })),
  }))

  const tableLabel = order.table?.label ?? order.table?.table_number ?? '?'
  const ticket = buildOrderTicket({
    ticketNumber: order.ticket_number,
    tableLabel,
    lines: orderLines,
    specialInstructions: order.special_instructions,
    subtotal: order.subtotal ?? 0,
    tax: order.tax ?? 0,
    total: order.total ?? 0,
  })

  try {
    await sendToPrintNode({
      apiKey: restaurant.printnode_api_key,
      printerId: restaurant.printnode_printer_id,
      title: `Bite Order #${order.ticket_number}`,
      content: ticket,
    })
    await admin.from('orders').update({ print_status: 'sent' }).eq('id', orderId)
    return jsonResponse({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Print request failed'
    await admin.from('orders').update({ print_status: 'failed' }).eq('id', orderId)
    return jsonResponse({ error: message }, 500)
  }
})
