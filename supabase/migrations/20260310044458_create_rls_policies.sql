create or replace function public.get_user_restaurant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select restaurant_id from public.staff where user_id = auth.uid();
$$;

grant execute on function public.get_user_restaurant_ids() to anon, authenticated, service_role;

alter table public.restaurants enable row level security;
alter table public.staff enable row level security;
alter table public.tables enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.modifier_groups enable row level security;
alter table public.modifiers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_modifiers enable row level security;
alter table public.menu_uploads enable row level security;

-- Restaurants
drop policy if exists "Public can view active restaurants" on public.restaurants;
create policy "Public can view active restaurants"
on public.restaurants
for select
to public
using (is_active = true);

drop policy if exists "Staff can view own restaurant" on public.restaurants;
create policy "Staff can view own restaurant"
on public.restaurants
for select
to public
using (id in (select public.get_user_restaurant_ids()));

drop policy if exists "Authenticated users can create restaurants" on public.restaurants;
create policy "Authenticated users can create restaurants"
on public.restaurants
for insert
to public
with check (auth.uid() is not null);

drop policy if exists "Owner/manager can update own restaurant" on public.restaurants;
create policy "Owner/manager can update own restaurant"
on public.restaurants
for update
to public
using (
  id in (
    select s.restaurant_id
    from public.staff s
    where s.user_id = auth.uid()
      and s.role = any (array['owner', 'manager'])
  )
);

-- Staff
drop policy if exists "Staff can view own restaurant staff" on public.staff;
create policy "Staff can view own restaurant staff"
on public.staff
for select
to public
using (restaurant_id in (select public.get_user_restaurant_ids()));

drop policy if exists "User can insert self as owner" on public.staff;
create policy "User can insert self as owner"
on public.staff
for insert
to public
with check (user_id = auth.uid() and role = 'owner');

drop policy if exists "Owner/manager can insert staff" on public.staff;
create policy "Owner/manager can insert staff"
on public.staff
for insert
to public
with check (
  restaurant_id in (
    select s.restaurant_id
    from public.staff s
    where s.user_id = auth.uid()
      and s.role = any (array['owner', 'manager'])
  )
);

drop policy if exists "Owner can update staff" on public.staff;
create policy "Owner can update staff"
on public.staff
for update
to public
using (
  restaurant_id in (
    select s.restaurant_id
    from public.staff s
    where s.user_id = auth.uid()
      and s.role = 'owner'
  )
);

drop policy if exists "Owner can delete staff" on public.staff;
create policy "Owner can delete staff"
on public.staff
for delete
to public
using (
  restaurant_id in (
    select s.restaurant_id
    from public.staff s
    where s.user_id = auth.uid()
      and s.role = 'owner'
  )
);

-- Tables
drop policy if exists "Public can view tables" on public.tables;
create policy "Public can view tables"
on public.tables
for select
to public
using (true);

drop policy if exists "Staff can insert tables" on public.tables;
create policy "Staff can insert tables"
on public.tables
for insert
to public
with check (restaurant_id in (select public.get_user_restaurant_ids()));

drop policy if exists "Staff can update own tables" on public.tables;
create policy "Staff can update own tables"
on public.tables
for update
to public
using (restaurant_id in (select public.get_user_restaurant_ids()));

drop policy if exists "Staff can delete own tables" on public.tables;
create policy "Staff can delete own tables"
on public.tables
for delete
to public
using (restaurant_id in (select public.get_user_restaurant_ids()));

-- Menu categories
drop policy if exists "Public can view categories" on public.menu_categories;
create policy "Public can view categories"
on public.menu_categories
for select
to public
using (true);

drop policy if exists "Staff can insert categories" on public.menu_categories;
create policy "Staff can insert categories"
on public.menu_categories
for insert
to public
with check (restaurant_id in (select public.get_user_restaurant_ids()));

drop policy if exists "Staff can update own categories" on public.menu_categories;
create policy "Staff can update own categories"
on public.menu_categories
for update
to public
using (restaurant_id in (select public.get_user_restaurant_ids()));

drop policy if exists "Staff can delete own categories" on public.menu_categories;
create policy "Staff can delete own categories"
on public.menu_categories
for delete
to public
using (restaurant_id in (select public.get_user_restaurant_ids()));

-- Menu items
drop policy if exists "Public can view items" on public.menu_items;
create policy "Public can view items"
on public.menu_items
for select
to public
using (true);

drop policy if exists "Staff can insert items" on public.menu_items;
create policy "Staff can insert items"
on public.menu_items
for insert
to public
with check (restaurant_id in (select public.get_user_restaurant_ids()));

drop policy if exists "Staff can update own items" on public.menu_items;
create policy "Staff can update own items"
on public.menu_items
for update
to public
using (restaurant_id in (select public.get_user_restaurant_ids()));

drop policy if exists "Staff can delete own items" on public.menu_items;
create policy "Staff can delete own items"
on public.menu_items
for delete
to public
using (restaurant_id in (select public.get_user_restaurant_ids()));

-- Modifier groups
drop policy if exists "Public can view modifier groups" on public.modifier_groups;
create policy "Public can view modifier groups"
on public.modifier_groups
for select
to public
using (true);

drop policy if exists "Staff can insert modifier groups" on public.modifier_groups;
create policy "Staff can insert modifier groups"
on public.modifier_groups
for insert
to public
with check (
  (
    select mi.restaurant_id
    from public.menu_items mi
    where mi.id = modifier_groups.item_id
  ) in (select public.get_user_restaurant_ids())
);

drop policy if exists "Staff can update own modifier groups" on public.modifier_groups;
create policy "Staff can update own modifier groups"
on public.modifier_groups
for update
to public
using (
  (
    select mi.restaurant_id
    from public.menu_items mi
    where mi.id = modifier_groups.item_id
  ) in (select public.get_user_restaurant_ids())
);

drop policy if exists "Staff can delete own modifier groups" on public.modifier_groups;
create policy "Staff can delete own modifier groups"
on public.modifier_groups
for delete
to public
using (
  (
    select mi.restaurant_id
    from public.menu_items mi
    where mi.id = modifier_groups.item_id
  ) in (select public.get_user_restaurant_ids())
);

-- Modifiers
drop policy if exists "Public can view modifiers" on public.modifiers;
create policy "Public can view modifiers"
on public.modifiers
for select
to public
using (true);

drop policy if exists "Staff can insert modifiers" on public.modifiers;
create policy "Staff can insert modifiers"
on public.modifiers
for insert
to public
with check (
  (
    select mi.restaurant_id
    from public.modifier_groups mg
    join public.menu_items mi on mi.id = mg.item_id
    where mg.id = modifiers.group_id
  ) in (select public.get_user_restaurant_ids())
);

drop policy if exists "Staff can update own modifiers" on public.modifiers;
create policy "Staff can update own modifiers"
on public.modifiers
for update
to public
using (
  (
    select mi.restaurant_id
    from public.modifier_groups mg
    join public.menu_items mi on mi.id = mg.item_id
    where mg.id = modifiers.group_id
  ) in (select public.get_user_restaurant_ids())
);

drop policy if exists "Staff can delete own modifiers" on public.modifiers;
create policy "Staff can delete own modifiers"
on public.modifiers
for delete
to public
using (
  (
    select mi.restaurant_id
    from public.modifier_groups mg
    join public.menu_items mi on mi.id = mg.item_id
    where mg.id = modifiers.group_id
  ) in (select public.get_user_restaurant_ids())
);

-- Orders
drop policy if exists "Anyone can create orders" on public.orders;
create policy "Anyone can create orders"
on public.orders
for insert
to public
with check (true);

drop policy if exists "Customers can view own orders by session" on public.orders;
create policy "Customers can view own orders by session"
on public.orders
for select
to public
using (
  session_id = ((current_setting('request.headers', true))::json ->> 'x-session-id')
);

drop policy if exists "Staff can view own restaurant orders" on public.orders;
create policy "Staff can view own restaurant orders"
on public.orders
for select
to public
using (restaurant_id in (select public.get_user_restaurant_ids()));

drop policy if exists "Staff can update own restaurant orders" on public.orders;
create policy "Staff can update own restaurant orders"
on public.orders
for update
to public
using (restaurant_id in (select public.get_user_restaurant_ids()));

-- Order items
drop policy if exists "Anyone can create order items" on public.order_items;
create policy "Anyone can create order items"
on public.order_items
for insert
to public
with check (true);

drop policy if exists "Customers can view own order items" on public.order_items;
create policy "Customers can view own order items"
on public.order_items
for select
to public
using (
  order_id in (
    select o.id
    from public.orders o
    where o.session_id = ((current_setting('request.headers', true))::json ->> 'x-session-id')
  )
);

drop policy if exists "Staff can view own restaurant order items" on public.order_items;
create policy "Staff can view own restaurant order items"
on public.order_items
for select
to public
using (
  order_id in (
    select o.id
    from public.orders o
    where o.restaurant_id in (select public.get_user_restaurant_ids())
  )
);

-- Order item modifiers
drop policy if exists "Anyone can create order item modifiers" on public.order_item_modifiers;
create policy "Anyone can create order item modifiers"
on public.order_item_modifiers
for insert
to public
with check (true);

drop policy if exists "Customers can view own order item modifiers" on public.order_item_modifiers;
create policy "Customers can view own order item modifiers"
on public.order_item_modifiers
for select
to public
using (
  order_item_id in (
    select oi.id
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.session_id = ((current_setting('request.headers', true))::json ->> 'x-session-id')
  )
);

drop policy if exists "Staff can view own restaurant order item modifiers" on public.order_item_modifiers;
create policy "Staff can view own restaurant order item modifiers"
on public.order_item_modifiers
for select
to public
using (
  order_item_id in (
    select oi.id
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.restaurant_id in (select public.get_user_restaurant_ids())
  )
);

-- Menu uploads
drop policy if exists "Staff can view own uploads" on public.menu_uploads;
create policy "Staff can view own uploads"
on public.menu_uploads
for select
to public
using (restaurant_id in (select public.get_user_restaurant_ids()));

drop policy if exists "Staff can insert uploads" on public.menu_uploads;
create policy "Staff can insert uploads"
on public.menu_uploads
for insert
to public
with check (restaurant_id in (select public.get_user_restaurant_ids()));

drop policy if exists "Staff can update own uploads" on public.menu_uploads;
create policy "Staff can update own uploads"
on public.menu_uploads
for update
to public
using (restaurant_id in (select public.get_user_restaurant_ids()));
