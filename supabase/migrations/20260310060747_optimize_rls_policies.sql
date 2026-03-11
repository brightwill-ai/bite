-- RLS policy optimization:
-- - replace row-by-row auth/current_setting calls with initplan-friendly subselect forms
-- - merge overlapping permissive policies to reduce policy fan-out

-- restaurants: merge two SELECT policies into one

drop policy if exists "Public can view active restaurants" on public.restaurants;
drop policy if exists "Staff can view own restaurant" on public.restaurants;

create policy "Public or staff can view restaurants"
on public.restaurants
for select
to public
using (
  is_active = true
  or id in (select public.get_user_restaurant_ids())
);

-- keep INSERT, but optimize auth.uid usage

drop policy if exists "Authenticated users can create restaurants" on public.restaurants;
create policy "Authenticated users can create restaurants"
on public.restaurants
for insert
to public
with check ((select auth.uid()) is not null);

-- keep UPDATE semantics, optimize auth.uid usage

drop policy if exists "Owner/manager can update own restaurant" on public.restaurants;
create policy "Owner/manager can update own restaurant"
on public.restaurants
for update
to public
using (
  id in (
    select s.restaurant_id
    from public.staff s
    where s.user_id = (select auth.uid())
      and s.role = any (array['owner', 'manager'])
  )
);

-- staff: merge two INSERT policies into one

drop policy if exists "Owner/manager can insert staff" on public.staff;
drop policy if exists "User can insert self as owner" on public.staff;

create policy "Owner manager or self-owner can insert staff"
on public.staff
for insert
to public
with check (
  (user_id = (select auth.uid()) and role = 'owner')
  or restaurant_id in (
    select s.restaurant_id
    from public.staff s
    where s.user_id = (select auth.uid())
      and s.role = any (array['owner', 'manager'])
  )
);

-- staff update/delete: optimize auth.uid usage

drop policy if exists "Owner can update staff" on public.staff;
create policy "Owner can update staff"
on public.staff
for update
to public
using (
  restaurant_id in (
    select s.restaurant_id
    from public.staff s
    where s.user_id = (select auth.uid())
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
    where s.user_id = (select auth.uid())
      and s.role = 'owner'
  )
);

-- orders: merge customer/staff SELECT policies into one with OR

drop policy if exists "Customers can view own orders by session" on public.orders;
drop policy if exists "Staff can view own restaurant orders" on public.orders;

create policy "Customer or staff can view orders"
on public.orders
for select
to public
using (
  restaurant_id in (select public.get_user_restaurant_ids())
  or session_id = (
    select (current_setting('request.headers', true))::json ->> 'x-session-id'
  )
);

-- order_items: merge customer/staff SELECT policies into one with OR

drop policy if exists "Customers can view own order items" on public.order_items;
drop policy if exists "Staff can view own restaurant order items" on public.order_items;

create policy "Customer or staff can view order items"
on public.order_items
for select
to public
using (
  order_id in (
    select o.id
    from public.orders o
    where o.restaurant_id in (select public.get_user_restaurant_ids())
       or o.session_id = (
         select (current_setting('request.headers', true))::json ->> 'x-session-id'
       )
  )
);

-- order_item_modifiers: merge customer/staff SELECT policies into one with OR

drop policy if exists "Customers can view own order item modifiers" on public.order_item_modifiers;
drop policy if exists "Staff can view own restaurant order item modifiers" on public.order_item_modifiers;

create policy "Customer or staff can view order item modifiers"
on public.order_item_modifiers
for select
to public
using (
  order_item_id in (
    select oi.id
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.restaurant_id in (select public.get_user_restaurant_ids())
       or o.session_id = (
         select (current_setting('request.headers', true))::json ->> 'x-session-id'
       )
  )
);
