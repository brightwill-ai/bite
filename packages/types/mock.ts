import type { Restaurant, MenuCategory, MenuItem, ModifierGroup, Modifier, Order, Table } from './index'

export const mockRestaurant: Restaurant = {
  id: 'rest-001',
  name: 'The Oakwood',
  slug: 'the-oakwood',
  cuisine_type: 'American Bistro',
  address: '142 Main Street, Nashville, TN',
  timezone: 'America/Chicago',
}

export const mockCategories: MenuCategory[] = [
  { id: 'cat-1', restaurant_id: 'rest-001', name: 'Starters', display_order: 1, is_available: true },
  { id: 'cat-2', restaurant_id: 'rest-001', name: 'Mains', display_order: 2, is_available: true },
  { id: 'cat-3', restaurant_id: 'rest-001', name: 'Sides', display_order: 3, is_available: true },
  { id: 'cat-4', restaurant_id: 'rest-001', name: 'Drinks', display_order: 4, is_available: true },
  { id: 'cat-5', restaurant_id: 'rest-001', name: 'Desserts', display_order: 5, is_available: true },
]

export const mockItems: MenuItem[] = [
  { id: 'item-1', restaurant_id: 'rest-001', category_id: 'cat-1', name: 'Truffle Parmesan Fries', description: 'Shoestring fries tossed in truffle oil, shaved parmesan, fresh chives, sea salt', price: 12, emoji: '\u{1F35F}', is_available: true, is_popular: true, display_order: 1 },
  { id: 'item-2', restaurant_id: 'rest-001', category_id: 'cat-1', name: 'Burrata & Heirloom Tomato', description: 'Imported buffalo burrata, heirloom tomatoes, basil oil, aged balsamic, grilled sourdough', price: 16, emoji: '\u{1F9C0}', is_available: true, is_popular: false, is_new: true, display_order: 2 },
  { id: 'item-3', restaurant_id: 'rest-001', category_id: 'cat-1', name: 'Crispy Calamari', description: 'Flash-fried calamari, romesco sauce, lemon aioli, pickled peppers', price: 14, emoji: '\u{1F991}', is_available: true, is_popular: false, display_order: 3 },
  { id: 'item-4', restaurant_id: 'rest-001', category_id: 'cat-1', name: 'Whipped Ricotta Crostini', description: 'House-whipped ricotta, fig jam, candied walnuts, rosemary honey on grilled bread', price: 13, emoji: '\u{1F35E}', is_available: false, is_popular: false, display_order: 4 },
  { id: 'item-5', restaurant_id: 'rest-001', category_id: 'cat-1', name: 'Gulf Shrimp Cocktail', description: 'Six chilled gulf shrimp, house cocktail sauce, preserved lemon, fresh horseradish', price: 18, emoji: '\u{1F364}', is_available: true, is_popular: false, display_order: 5 },
  { id: 'item-6', restaurant_id: 'rest-001', category_id: 'cat-2', name: 'Wagyu Smash Burger', description: 'Two 3oz wagyu patties, aged white cheddar, caramelized onion, house sauce, brioche bun', price: 24, emoji: '\u{1F354}', is_available: true, is_popular: true, display_order: 1 },
  { id: 'item-7', restaurant_id: 'rest-001', category_id: 'cat-2', name: 'Pan-Seared Salmon', description: 'Atlantic salmon, roasted fingerling potatoes, broccolini, lemon beurre blanc', price: 29, emoji: '\u{1F41F}', is_available: true, is_popular: false, display_order: 2 },
  { id: 'item-8', restaurant_id: 'rest-001', category_id: 'cat-2', name: 'Wild Mushroom Risotto', description: 'Arborio rice, hen-of-the-woods mushrooms, parmigiano-reggiano, white truffle oil', price: 22, emoji: '\u{1F35A}', is_available: true, is_popular: false, display_order: 3 },
  { id: 'item-9', restaurant_id: 'rest-001', category_id: 'cat-2', name: '12oz Ribeye', description: 'Prime dry-aged ribeye, compound butter, roasted garlic, choice of side', price: 54, emoji: '\u{1F969}', is_available: true, is_popular: true, display_order: 4 },
  { id: 'item-10', restaurant_id: 'rest-001', category_id: 'cat-3', name: 'Truffle Mac & Cheese', description: 'Cavatappi pasta, four-cheese blend, crispy panko, black truffle', price: 10, emoji: '\u{1F9C0}', is_available: true, is_popular: false, display_order: 1 },
  { id: 'item-11', restaurant_id: 'rest-001', category_id: 'cat-3', name: 'Charred Broccolini', description: 'Garlic, chili flakes, parmesan, lemon zest', price: 9, emoji: '\u{1F966}', is_available: true, is_popular: false, display_order: 2 },
  { id: 'item-12', restaurant_id: 'rest-001', category_id: 'cat-3', name: 'Smashed Potatoes', description: 'Crispy smashed potatoes, herb aioli, smoked paprika', price: 8, emoji: '\u{1F954}', is_available: true, is_popular: false, display_order: 3 },
  { id: 'item-13', restaurant_id: 'rest-001', category_id: 'cat-4', name: 'House Red Wine', description: 'Rotating selection of small-production reds', price: 14, emoji: '\u{1F377}', is_available: true, is_popular: false, display_order: 1 },
  { id: 'item-14', restaurant_id: 'rest-001', category_id: 'cat-4', name: 'Local Draft Beer', description: 'Rotating local craft draught', price: 8, emoji: '\u{1F37A}', is_available: true, is_popular: false, display_order: 2 },
  { id: 'item-15', restaurant_id: 'rest-001', category_id: 'cat-4', name: 'Soft Drinks', description: 'Coke, Diet Coke, Sprite, Ginger Ale, Still or Sparkling Water', price: 4, emoji: '\u{1F964}', is_available: true, is_popular: false, display_order: 3 },
  { id: 'item-16', restaurant_id: 'rest-001', category_id: 'cat-5', name: 'Creme Brulee', description: 'Classic vanilla bean custard, caramelized sugar crust, seasonal berries', price: 11, emoji: '\u{1F36E}', is_available: true, is_popular: true, display_order: 1 },
  { id: 'item-17', restaurant_id: 'rest-001', category_id: 'cat-5', name: 'Warm Chocolate Lava Cake', description: 'Valrhona dark chocolate, molten center, Madagascar vanilla gelato', price: 13, emoji: '\u{1F36B}', is_available: true, is_popular: false, display_order: 2 },
]

export const mockModifierGroups: Record<string, ModifierGroup[]> = {
  'item-6': [
    { id: 'mg-1', item_id: 'item-6', name: 'Doneness', selection_type: 'single', is_required: true, min_selections: 1, max_selections: 1, display_order: 1 },
    { id: 'mg-2', item_id: 'item-6', name: 'Add-ons', selection_type: 'multiple', is_required: false, min_selections: 0, max_selections: 4, display_order: 2 },
    { id: 'mg-3', item_id: 'item-6', name: 'Bun', selection_type: 'single', is_required: true, min_selections: 1, max_selections: 1, display_order: 3 },
  ],
  'item-9': [
    { id: 'mg-4', item_id: 'item-9', name: 'Doneness', selection_type: 'single', is_required: true, min_selections: 1, max_selections: 1, display_order: 1 },
    { id: 'mg-5', item_id: 'item-9', name: 'Side Choice', selection_type: 'single', is_required: true, min_selections: 1, max_selections: 1, display_order: 2 },
  ],
}

export const mockModifiers: Record<string, Modifier[]> = {
  'mg-1': [
    { id: 'mod-1', group_id: 'mg-1', name: 'Rare', price_delta: 0, is_available: true, display_order: 1, emoji: '\u{1FA78}' },
    { id: 'mod-2', group_id: 'mg-1', name: 'Medium Rare', price_delta: 0, is_available: true, display_order: 2, emoji: '\u{1F969}' },
    { id: 'mod-3', group_id: 'mg-1', name: 'Medium', price_delta: 0, is_available: true, display_order: 3, emoji: '\u{1F356}' },
    { id: 'mod-4', group_id: 'mg-1', name: 'Well Done', price_delta: 0, is_available: true, display_order: 4, emoji: '\u{1F525}' },
  ],
  'mg-2': [
    { id: 'mod-5', group_id: 'mg-2', name: 'Bacon', price_delta: 2, is_available: true, display_order: 1, emoji: '\u{1F953}' },
    { id: 'mod-6', group_id: 'mg-2', name: 'Avocado', price_delta: 2.5, is_available: true, display_order: 2, emoji: '\u{1F951}' },
    { id: 'mod-7', group_id: 'mg-2', name: 'Extra Cheese', price_delta: 1.5, is_available: true, display_order: 3, emoji: '\u{1F9C0}' },
    { id: 'mod-8', group_id: 'mg-2', name: 'Fried Egg', price_delta: 1.5, is_available: true, display_order: 4, emoji: '\u{1F373}' },
  ],
  'mg-3': [
    { id: 'mod-9', group_id: 'mg-3', name: 'Brioche Bun', price_delta: 0, is_available: true, display_order: 1, emoji: '\u{1F35E}' },
    { id: 'mod-10', group_id: 'mg-3', name: 'Gluten-Free Bun', price_delta: 2, is_available: true, display_order: 2, emoji: '\u{1F33E}' },
    { id: 'mod-11', group_id: 'mg-3', name: 'Lettuce Wrap', price_delta: 0, is_available: true, display_order: 3, emoji: '\u{1F96C}' },
  ],
  'mg-4': [
    { id: 'mod-12', group_id: 'mg-4', name: 'Rare', price_delta: 0, is_available: true, display_order: 1, emoji: '\u{1FA78}' },
    { id: 'mod-13', group_id: 'mg-4', name: 'Medium Rare', price_delta: 0, is_available: true, display_order: 2, emoji: '\u{1F969}' },
    { id: 'mod-14', group_id: 'mg-4', name: 'Medium', price_delta: 0, is_available: true, display_order: 3, emoji: '\u{1F356}' },
    { id: 'mod-15', group_id: 'mg-4', name: 'Well Done', price_delta: 0, is_available: true, display_order: 4, emoji: '\u{1F525}' },
  ],
  'mg-5': [
    { id: 'mod-16', group_id: 'mg-5', name: 'Truffle Mac & Cheese', price_delta: 0, is_available: true, display_order: 1, emoji: '\u{1F9C0}' },
    { id: 'mod-17', group_id: 'mg-5', name: 'Charred Broccolini', price_delta: 0, is_available: true, display_order: 2, emoji: '\u{1F966}' },
    { id: 'mod-18', group_id: 'mg-5', name: 'Smashed Potatoes', price_delta: 0, is_available: true, display_order: 3, emoji: '\u{1F954}' },
  ],
}

export const mockOrders: Order[] = [
  {
    id: 'ord-1', session_id: 'sess-1', restaurant_id: 'rest-001', table_id: 'tbl-4', ticket_number: 42, status: 'preparing',
    created_at: new Date(Date.now() - 8 * 60000).toISOString(),
    items: [
      { id: 'oi-1', order_id: 'ord-1', menu_item_id: 'item-6', item_name: 'Wagyu Smash Burger', item_price: 24, quantity: 2, subtotal: 48, modifiers: [{ modifier_id: 'mod-2', name: 'Medium Rare', price_delta: 0 }] },
      { id: 'oi-2', order_id: 'ord-1', menu_item_id: 'item-1', item_name: 'Truffle Parmesan Fries', item_price: 12, quantity: 1, subtotal: 12 },
    ],
  },
  {
    id: 'ord-2', session_id: 'sess-2', restaurant_id: 'rest-001', table_id: 'tbl-7', ticket_number: 41, status: 'ready',
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    items: [
      { id: 'oi-3', order_id: 'ord-2', menu_item_id: 'item-9', item_name: '12oz Ribeye', item_price: 54, quantity: 1, subtotal: 54, modifiers: [{ modifier_id: 'mod-13', name: 'Medium Rare', price_delta: 0 }, { modifier_id: 'mod-16', name: 'Truffle Mac & Cheese', price_delta: 0 }] },
      { id: 'oi-4', order_id: 'ord-2', menu_item_id: 'item-13', item_name: 'House Red Wine', item_price: 14, quantity: 2, subtotal: 28 },
    ],
  },
  {
    id: 'ord-3', session_id: 'sess-3', restaurant_id: 'rest-001', table_id: 'tbl-2', ticket_number: 40, status: 'pending',
    created_at: new Date(Date.now() - 2 * 60000).toISOString(),
    items: [
      { id: 'oi-5', order_id: 'ord-3', menu_item_id: 'item-7', item_name: 'Pan-Seared Salmon', item_price: 29, quantity: 1, subtotal: 29 },
      { id: 'oi-6', order_id: 'ord-3', menu_item_id: 'item-11', item_name: 'Charred Broccolini', item_price: 9, quantity: 1, subtotal: 9 },
      { id: 'oi-7', order_id: 'ord-3', menu_item_id: 'item-15', item_name: 'Soft Drinks', item_price: 4, quantity: 2, subtotal: 8 },
    ],
  },
  {
    id: 'ord-4', session_id: 'sess-4', restaurant_id: 'rest-001', table_id: 'tbl-11', ticket_number: 39, status: 'delivered',
    created_at: new Date(Date.now() - 32 * 60000).toISOString(),
    items: [
      { id: 'oi-8', order_id: 'ord-4', menu_item_id: 'item-16', item_name: 'Creme Brulee', item_price: 11, quantity: 2, subtotal: 22 },
    ],
  },
  {
    id: 'ord-5', session_id: 'sess-5', restaurant_id: 'rest-001', table_id: 'tbl-3', ticket_number: 38, status: 'confirmed',
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    items: [
      { id: 'oi-9', order_id: 'ord-5', menu_item_id: 'item-2', item_name: 'Burrata & Heirloom Tomato', item_price: 16, quantity: 1, subtotal: 16 },
      { id: 'oi-10', order_id: 'ord-5', menu_item_id: 'item-8', item_name: 'Wild Mushroom Risotto', item_price: 22, quantity: 1, subtotal: 22 },
      { id: 'oi-11', order_id: 'ord-5', menu_item_id: 'item-17', item_name: 'Warm Chocolate Lava Cake', item_price: 13, quantity: 1, subtotal: 13 },
    ],
  },
]

export const mockTables: Table[] = Array.from({ length: 15 }, (_, i) => ({
  id: `tbl-${i + 1}`,
  restaurant_id: 'rest-001',
  table_number: String(i + 1),
  is_active: true,
}))
