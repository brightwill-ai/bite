// ============================================================
// Enums / Union Types
// ============================================================

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise'
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded'
export type PrintStatus = 'none' | 'sent' | 'failed'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered'
export type StaffRole = 'owner' | 'manager' | 'staff'
export type MenuUploadStatus = 'pending' | 'processing' | 'completed' | 'failed'

// ============================================================
// Core Entities
// ============================================================

export type Restaurant = {
  id: string
  name: string
  slug: string
  logo_url?: string
  cuisine_type?: string
  address?: string
  timezone?: string
  is_active: boolean
  subscription_tier: SubscriptionTier
  printnode_api_key?: string
  printnode_printer_id?: string
  adyen_merchant_id?: string
  created_at?: string
  updated_at?: string
}

export type Staff = {
  id: string
  user_id: string
  restaurant_id: string
  name: string
  email: string
  role: StaffRole
  created_at?: string
  updated_at?: string
}

export type Table = {
  id: string
  restaurant_id: string
  table_number: string
  label?: string
  qr_code_url?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// ============================================================
// Menu
// ============================================================

export type MenuCategory = {
  id: string
  restaurant_id: string
  name: string
  display_order: number
  is_available: boolean
}

export type MenuItem = {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  description?: string
  price: number
  image_url?: string
  emoji?: string
  is_available: boolean
  is_popular: boolean
  is_new?: boolean
  needs_review?: boolean
  display_order: number
}

export type ModifierGroup = {
  id: string
  item_id: string
  name: string
  selection_type: 'single' | 'multiple'
  is_required: boolean
  min_selections: number
  max_selections: number
  display_order: number
}

export type Modifier = {
  id: string
  group_id: string
  name: string
  price_delta: number
  is_available: boolean
  display_order: number
  emoji?: string
}

// ============================================================
// Orders
// ============================================================

export type Order = {
  id: string
  session_id: string
  restaurant_id: string
  table_id: string
  ticket_number: number
  status: OrderStatus
  special_instructions?: string
  subtotal: number
  tax: number
  tip: number
  total: number
  payment_status: PaymentStatus
  payment_intent_id?: string
  print_status: PrintStatus
  created_at: string
  updated_at?: string
  items?: OrderItem[]
  table?: Table
}

export type OrderItem = {
  id: string
  order_id: string
  menu_item_id: string
  item_name: string
  item_price: number
  quantity: number
  subtotal: number
  modifiers?: SelectedModifier[]
}

export type SelectedModifier = {
  modifier_id: string
  name: string
  price_delta: number
}

// ============================================================
// Menu Uploads
// ============================================================

export type MenuUpload = {
  id: string
  restaurant_id: string
  file_url: string
  status: MenuUploadStatus
  parsed_data?: unknown
  error_message?: string
  created_at?: string
  updated_at?: string
}

// ============================================================
// Cart (customer app, client-only)
// ============================================================

export type CartItem = {
  menuItemId: string
  name: string
  price: number
  quantity: number
  emoji?: string
  selectedModifiers: SelectedModifier[]
}
