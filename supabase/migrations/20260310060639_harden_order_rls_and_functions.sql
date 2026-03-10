-- Security/performance hardening:
-- 1) lock function search_path
-- 2) tighten permissive order insert policies
-- 3) add missing FK indexes

create index if not exists idx_order_items_menu_item_id
on public.order_items(menu_item_id);

create index if not exists idx_order_item_modifiers_modifier_id
on public.order_item_modifiers(modifier_id);

create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.get_next_ticket_number(p_restaurant_id uuid)
returns integer
language plpgsql
set search_path = public
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

create or replace function public.create_order(
  p_session_id text,
  p_restaurant_id uuid,
  p_table_id uuid,
  p_special_instructions text default null,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
set search_path = public
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

create or replace function public.get_user_restaurant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select restaurant_id
  from public.staff
  where user_id = auth.uid();
$$;

drop policy if exists "Anyone can create orders" on public.orders;
create policy "Anyone can create orders"
on public.orders
for insert
to public
with check (
  session_id is not null
  and length(trim(session_id)) > 0
  and exists (
    select 1
    from public.restaurants r
    where r.id = orders.restaurant_id
      and r.is_active = true
  )
  and exists (
    select 1
    from public.tables t
    where t.id = orders.table_id
      and t.restaurant_id = orders.restaurant_id
      and t.is_active = true
  )
);

drop policy if exists "Anyone can create order items" on public.order_items;
create policy "Anyone can create order items"
on public.order_items
for insert
to public
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
  )
  and (
    order_items.menu_item_id is null
    or exists (
      select 1
      from public.orders o
      join public.menu_items mi
        on mi.id = order_items.menu_item_id
       and mi.restaurant_id = o.restaurant_id
      where o.id = order_items.order_id
    )
  )
);

drop policy if exists "Anyone can create order item modifiers" on public.order_item_modifiers;
create policy "Anyone can create order item modifiers"
on public.order_item_modifiers
for insert
to public
with check (
  exists (
    select 1
    from public.order_items oi
    where oi.id = order_item_modifiers.order_item_id
  )
  and (
    order_item_modifiers.modifier_id is null
    or exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      join public.menu_items mi on mi.id = oi.menu_item_id and mi.restaurant_id = o.restaurant_id
      join public.modifier_groups mg on mg.item_id = mi.id
      join public.modifiers m on m.group_id = mg.id
      where oi.id = order_item_modifiers.order_item_id
        and m.id = order_item_modifiers.modifier_id
    )
  )
);
