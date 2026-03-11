-- Avoid recursive staff-policy evaluation by moving owner checks into
-- SECURITY DEFINER helper functions.

create or replace function public.is_owner_or_manager_for_restaurant(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff s
    where s.user_id = auth.uid()
      and s.restaurant_id = p_restaurant_id
      and s.role = any (array['owner', 'manager'])
  );
$$;

create or replace function public.is_owner_for_restaurant(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff s
    where s.user_id = auth.uid()
      and s.restaurant_id = p_restaurant_id
      and s.role = 'owner'
  );
$$;

grant execute on function public.is_owner_or_manager_for_restaurant(uuid) to anon, authenticated, service_role;
grant execute on function public.is_owner_for_restaurant(uuid) to anon, authenticated, service_role;

drop policy if exists "Owner manager or self-owner can insert staff" on public.staff;
create policy "Owner manager or self-owner can insert staff"
on public.staff
for insert
to public
with check (
  ((user_id = auth.uid()) and (role = 'owner'))
  or public.is_owner_or_manager_for_restaurant(restaurant_id)
);

drop policy if exists "Owner can update staff" on public.staff;
create policy "Owner can update staff"
on public.staff
for update
to public
using (public.is_owner_for_restaurant(restaurant_id))
with check (public.is_owner_for_restaurant(restaurant_id));

drop policy if exists "Owner can delete staff" on public.staff;
create policy "Owner can delete staff"
on public.staff
for delete
to public
using (public.is_owner_for_restaurant(restaurant_id));
