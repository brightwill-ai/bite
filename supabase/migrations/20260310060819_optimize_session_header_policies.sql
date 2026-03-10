-- Replace direct current_setting() policy calls with a helper function
-- to avoid per-row re-evaluation warnings.

create or replace function public.request_session_id()
returns text
language sql
stable
set search_path = public
as $$
  select ((current_setting('request.headers', true))::json ->> 'x-session-id')::text;
$$;

grant execute on function public.request_session_id() to anon, authenticated, service_role;

drop policy if exists "Customer or staff can view orders" on public.orders;
create policy "Customer or staff can view orders"
on public.orders
for select
to public
using (
  restaurant_id in (select public.get_user_restaurant_ids())
  or session_id = (select public.request_session_id())
);

drop policy if exists "Customer or staff can view order items" on public.order_items;
create policy "Customer or staff can view order items"
on public.order_items
for select
to public
using (
  order_id in (
    select o.id
    from public.orders o
    where o.restaurant_id in (select public.get_user_restaurant_ids())
       or o.session_id = (select public.request_session_id())
  )
);

drop policy if exists "Customer or staff can view order item modifiers" on public.order_item_modifiers;
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
       or o.session_id = (select public.request_session_id())
  )
);
