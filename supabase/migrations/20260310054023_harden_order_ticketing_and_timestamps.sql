alter table public.order_items
  add column if not exists updated_at timestamptz default now();

update public.order_items
set updated_at = created_at
where updated_at is null;

alter table public.order_items
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.order_item_modifiers
  add column if not exists updated_at timestamptz default now();

update public.order_item_modifiers
set updated_at = created_at
where updated_at is null;

alter table public.order_item_modifiers
  alter column updated_at set default now(),
  alter column updated_at set not null;

drop trigger if exists set_updated_at on public.order_items;
create trigger set_updated_at
before update on public.order_items
for each row
execute function public.update_updated_at();

drop trigger if exists set_updated_at on public.order_item_modifiers;
create trigger set_updated_at
before update on public.order_item_modifiers
for each row
execute function public.update_updated_at();

drop index if exists public.orders_restaurant_ticket_number_daily_unique;
create unique index if not exists orders_restaurant_ticket_number_daily_unique
on public.orders (restaurant_id, ((timezone('utc', created_at))::date), ticket_number);

create or replace function public.get_next_ticket_number(p_restaurant_id uuid)
returns integer
language plpgsql
as $$
declare
  next_num integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_restaurant_id::text || ':' || current_date::text));

  select coalesce(max(ticket_number), 0) + 1
  into next_num
  from public.orders
  where restaurant_id = p_restaurant_id
    and created_at >= date_trunc('day', now())
    and created_at < date_trunc('day', now()) + interval '1 day';

  return next_num;
end;
$$;
