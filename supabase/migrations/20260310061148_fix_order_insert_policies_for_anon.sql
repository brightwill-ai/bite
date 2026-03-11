-- Fix anon compatibility for order creation RPC while keeping non-trivial checks.

-- orders
drop policy if exists "Anyone can create orders" on public.orders;
create policy "Anyone can create orders"
on public.orders
for insert
to public
with check (
  restaurant_id is not null
  and table_id is not null
  and session_id is not null
  and length(trim(session_id)) > 0
);

-- order_items
drop policy if exists "Anyone can create order items" on public.order_items;
create policy "Anyone can create order items"
on public.order_items
for insert
to public
with check (
  order_id is not null
  and item_name is not null
  and quantity > 0
);

-- order_item_modifiers
drop policy if exists "Anyone can create order item modifiers" on public.order_item_modifiers;
create policy "Anyone can create order item modifiers"
on public.order_item_modifiers
for insert
to public
with check (
  order_item_id is not null
  and name is not null
);
