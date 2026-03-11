create extension if not exists "uuid-ossp" with schema extensions;

create table if not exists public.restaurants (
  id uuid primary key default extensions.uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  logo_url text,
  cuisine_type text,
  address text,
  timezone text default 'America/Chicago',
  is_active boolean default false,
  subscription_tier text default 'free' check (subscription_tier = any (array['free', 'starter', 'pro', 'enterprise'])),
  printnode_api_key text,
  printnode_printer_id text,
  adyen_merchant_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.staff (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id),
  restaurant_id uuid not null references public.restaurants(id),
  name text not null,
  email text not null,
  role text not null default 'staff' check (role = any (array['owner', 'manager', 'staff'])),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, restaurant_id)
);

create table if not exists public.tables (
  id uuid primary key default extensions.uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id),
  table_number text not null,
  label text,
  qr_code_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (restaurant_id, table_number)
);

create table if not exists public.menu_categories (
  id uuid primary key default extensions.uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id),
  name text not null,
  display_order integer default 0,
  is_available boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.menu_items (
  id uuid primary key default extensions.uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id),
  category_id uuid not null references public.menu_categories(id),
  name text not null,
  description text,
  price numeric(10,2) not null,
  image_url text,
  emoji text,
  is_available boolean default true,
  is_popular boolean default false,
  is_new boolean default false,
  needs_review boolean default false,
  display_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.modifier_groups (
  id uuid primary key default extensions.uuid_generate_v4(),
  item_id uuid not null references public.menu_items(id),
  name text not null,
  selection_type text not null default 'single' check (selection_type = any (array['single', 'multiple'])),
  is_required boolean default false,
  min_selections integer default 0,
  max_selections integer default 1,
  display_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.modifiers (
  id uuid primary key default extensions.uuid_generate_v4(),
  group_id uuid not null references public.modifier_groups(id),
  name text not null,
  price_delta numeric(10,2) default 0,
  is_available boolean default true,
  display_order integer default 0,
  emoji text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default extensions.uuid_generate_v4(),
  session_id text not null,
  restaurant_id uuid not null references public.restaurants(id),
  table_id uuid not null references public.tables(id),
  ticket_number integer not null,
  status text not null default 'pending' check (status = any (array['pending', 'confirmed', 'preparing', 'ready', 'delivered'])),
  special_instructions text,
  subtotal numeric(10,2) default 0,
  tax numeric(10,2) default 0,
  tip numeric(10,2) default 0,
  total numeric(10,2) default 0,
  payment_status text default 'unpaid' check (payment_status = any (array['unpaid', 'pending', 'paid', 'failed', 'refunded'])),
  payment_intent_id text,
  print_status text default 'none' check (print_status = any (array['none', 'sent', 'failed'])),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.order_items (
  id uuid primary key default extensions.uuid_generate_v4(),
  order_id uuid not null references public.orders(id),
  menu_item_id uuid references public.menu_items(id),
  item_name text not null,
  item_price numeric(10,2) not null,
  quantity integer not null default 1,
  subtotal numeric(10,2) not null,
  created_at timestamptz default now()
);

create table if not exists public.order_item_modifiers (
  id uuid primary key default extensions.uuid_generate_v4(),
  order_item_id uuid not null references public.order_items(id),
  modifier_id uuid references public.modifiers(id),
  name text not null,
  price_delta numeric(10,2) default 0,
  created_at timestamptz default now()
);

create table if not exists public.menu_uploads (
  id uuid primary key default extensions.uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id),
  file_url text not null,
  status text not null default 'pending' check (status = any (array['pending', 'processing', 'completed', 'failed'])),
  parsed_data jsonb,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_staff_user_id on public.staff(user_id);
create index if not exists idx_staff_restaurant_id on public.staff(restaurant_id);

create index if not exists idx_tables_restaurant_id on public.tables(restaurant_id);

create index if not exists idx_menu_categories_restaurant_id on public.menu_categories(restaurant_id);

create index if not exists idx_menu_items_restaurant_id on public.menu_items(restaurant_id);
create index if not exists idx_menu_items_category_id on public.menu_items(category_id);

create index if not exists idx_modifier_groups_item_id on public.modifier_groups(item_id);

create index if not exists idx_modifiers_group_id on public.modifiers(group_id);

create index if not exists idx_orders_restaurant_id on public.orders(restaurant_id);
create index if not exists idx_orders_table_id on public.orders(table_id);
create index if not exists idx_orders_session_id on public.orders(session_id);
create index if not exists idx_orders_created_at on public.orders(created_at);

create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_item_modifiers_order_item_id on public.order_item_modifiers(order_item_id);

create index if not exists idx_menu_uploads_restaurant_id on public.menu_uploads(restaurant_id);

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.get_next_ticket_number(p_restaurant_id uuid)
returns integer
language plpgsql
as $$
declare
  next_num integer;
begin
  select coalesce(max(ticket_number), 0) + 1
  into next_num
  from public.orders
  where restaurant_id = p_restaurant_id
    and created_at >= date_trunc('day', now())
    and created_at < date_trunc('day', now()) + interval '1 day';

  return next_num;
end;
$$;

create or replace function public.create_order(
  p_session_id text,
  p_restaurant_id uuid,
  p_table_id uuid,
  p_special_instructions text default null,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_ticket_number integer;
  v_order_id uuid;
  v_subtotal numeric(10,2) := 0;
  v_tax numeric(10,2);
  v_total numeric(10,2);
  v_item jsonb;
  v_modifier jsonb;
  v_order_item_id uuid;
  v_item_subtotal numeric(10,2);
begin
  v_ticket_number := public.get_next_ticket_number(p_restaurant_id);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_subtotal := (v_item->>'item_price')::numeric * (v_item->>'quantity')::integer;
    if v_item->'modifiers' is not null then
      for v_modifier in select * from jsonb_array_elements(v_item->'modifiers')
      loop
        v_item_subtotal := v_item_subtotal + (v_modifier->>'price_delta')::numeric * (v_item->>'quantity')::integer;
      end loop;
    end if;
    v_subtotal := v_subtotal + v_item_subtotal;
  end loop;

  v_tax := round(v_subtotal * 0.0825, 2);
  v_total := v_subtotal + v_tax;

  insert into public.orders (
    session_id,
    restaurant_id,
    table_id,
    ticket_number,
    special_instructions,
    subtotal,
    tax,
    total
  )
  values (
    p_session_id,
    p_restaurant_id,
    p_table_id,
    v_ticket_number,
    p_special_instructions,
    v_subtotal,
    v_tax,
    v_total
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_subtotal := (v_item->>'item_price')::numeric * (v_item->>'quantity')::integer;
    if v_item->'modifiers' is not null then
      for v_modifier in select * from jsonb_array_elements(v_item->'modifiers')
      loop
        v_item_subtotal := v_item_subtotal + (v_modifier->>'price_delta')::numeric * (v_item->>'quantity')::integer;
      end loop;
    end if;

    insert into public.order_items (
      order_id,
      menu_item_id,
      item_name,
      item_price,
      quantity,
      subtotal
    )
    values (
      v_order_id,
      case when v_item->>'menu_item_id' is not null then (v_item->>'menu_item_id')::uuid else null end,
      v_item->>'item_name',
      (v_item->>'item_price')::numeric,
      (v_item->>'quantity')::integer,
      v_item_subtotal
    )
    returning id into v_order_item_id;

    if v_item->'modifiers' is not null then
      for v_modifier in select * from jsonb_array_elements(v_item->'modifiers')
      loop
        insert into public.order_item_modifiers (
          order_item_id,
          modifier_id,
          name,
          price_delta
        )
        values (
          v_order_item_id,
          case when v_modifier->>'modifier_id' is not null then (v_modifier->>'modifier_id')::uuid else null end,
          v_modifier->>'name',
          (v_modifier->>'price_delta')::numeric
        );
      end loop;
    end if;
  end loop;

  return jsonb_build_object(
    'order_id', v_order_id,
    'ticket_number', v_ticket_number,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'total', v_total
  );
end;
$$;

grant execute on function public.get_next_ticket_number(uuid) to anon, authenticated, service_role;
grant execute on function public.create_order(text, uuid, uuid, text, jsonb) to anon, authenticated, service_role;

drop trigger if exists set_updated_at on public.restaurants;
create trigger set_updated_at
before update on public.restaurants
for each row
execute function public.update_updated_at();

drop trigger if exists set_updated_at on public.staff;
create trigger set_updated_at
before update on public.staff
for each row
execute function public.update_updated_at();

drop trigger if exists set_updated_at on public.tables;
create trigger set_updated_at
before update on public.tables
for each row
execute function public.update_updated_at();

drop trigger if exists set_updated_at on public.menu_categories;
create trigger set_updated_at
before update on public.menu_categories
for each row
execute function public.update_updated_at();

drop trigger if exists set_updated_at on public.menu_items;
create trigger set_updated_at
before update on public.menu_items
for each row
execute function public.update_updated_at();

drop trigger if exists set_updated_at on public.modifier_groups;
create trigger set_updated_at
before update on public.modifier_groups
for each row
execute function public.update_updated_at();

drop trigger if exists set_updated_at on public.modifiers;
create trigger set_updated_at
before update on public.modifiers
for each row
execute function public.update_updated_at();

drop trigger if exists set_updated_at on public.orders;
create trigger set_updated_at
before update on public.orders
for each row
execute function public.update_updated_at();

drop trigger if exists set_updated_at on public.menu_uploads;
create trigger set_updated_at
before update on public.menu_uploads
for each row
execute function public.update_updated_at();
