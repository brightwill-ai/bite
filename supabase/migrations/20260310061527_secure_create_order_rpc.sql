-- Secure and stabilize order creation by making create_order a validated SECURITY DEFINER RPC.
-- This avoids anon RETURNING/RLS conflicts while preventing direct table inserts.

-- Deny direct client inserts; order creation must go through public.create_order().
drop policy if exists "Anyone can create orders" on public.orders;
drop policy if exists "Anyone can create order items" on public.order_items;
drop policy if exists "Anyone can create order item modifiers" on public.order_item_modifiers;

create or replace function public.create_order(
  p_session_id text,
  p_restaurant_id uuid,
  p_table_id uuid,
  p_special_instructions text default null,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
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

  v_quantity_text text;
  v_quantity integer;

  v_item_id_text text;
  v_menu_item_id uuid;
  v_menu_item_name text;
  v_menu_item_price numeric(10,2);

  v_modifier_id_text text;
  v_modifier_id uuid;
  v_modifier_name text;
  v_modifier_price numeric(10,2);
begin
  if p_session_id is null or length(trim(p_session_id)) = 0 then
    raise exception 'session_id is required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items array is required';
  end if;

  if not exists (
    select 1
    from public.restaurants r
    where r.id = p_restaurant_id
      and r.is_active = true
  ) then
    raise exception 'restaurant is invalid or inactive';
  end if;

  if not exists (
    select 1
    from public.tables t
    where t.id = p_table_id
      and t.restaurant_id = p_restaurant_id
      and t.is_active = true
  ) then
    raise exception 'table is invalid or inactive for restaurant';
  end if;

  -- Allocate daily ticket number (concurrency-safe via advisory lock in helper)
  v_ticket_number := public.get_next_ticket_number(p_restaurant_id);

  -- Pass 1: validate payload against canonical DB pricing and compute totals.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id_text := v_item->>'menu_item_id';
    if v_item_id_text is null or v_item_id_text !~* '^[0-9a-f-]{36}$' then
      raise exception 'menu_item_id is required and must be a UUID';
    end if;
    v_menu_item_id := v_item_id_text::uuid;

    select mi.name, mi.price
      into v_menu_item_name, v_menu_item_price
    from public.menu_items mi
    where mi.id = v_menu_item_id
      and mi.restaurant_id = p_restaurant_id
      and mi.is_available = true;

    if not found then
      raise exception 'menu item % is invalid/unavailable for restaurant', v_menu_item_id;
    end if;

    v_quantity_text := coalesce(v_item->>'quantity', '1');
    if v_quantity_text !~ '^[0-9]+$' then
      raise exception 'quantity must be a positive integer';
    end if;

    v_quantity := greatest(v_quantity_text::integer, 1);
    v_item_subtotal := v_menu_item_price * v_quantity;

    if jsonb_typeof(v_item->'modifiers') = 'array' then
      for v_modifier in select * from jsonb_array_elements(v_item->'modifiers')
      loop
        v_modifier_id_text := v_modifier->>'modifier_id';
        if v_modifier_id_text is null or v_modifier_id_text !~* '^[0-9a-f-]{36}$' then
          raise exception 'modifier_id must be a UUID when modifiers are provided';
        end if;

        v_modifier_id := v_modifier_id_text::uuid;

        select m.name, coalesce(m.price_delta, 0)
          into v_modifier_name, v_modifier_price
        from public.modifiers m
        join public.modifier_groups mg on mg.id = m.group_id
        join public.menu_items mi on mi.id = mg.item_id
        where m.id = v_modifier_id
          and mi.id = v_menu_item_id
          and mi.restaurant_id = p_restaurant_id
          and m.is_available = true;

        if not found then
          raise exception 'modifier % is invalid for menu item %', v_modifier_id, v_menu_item_id;
        end if;

        v_item_subtotal := v_item_subtotal + (v_modifier_price * v_quantity);
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

  -- Pass 2: persist canonicalized order items/modifiers.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_menu_item_id := (v_item->>'menu_item_id')::uuid;

    select mi.name, mi.price
      into v_menu_item_name, v_menu_item_price
    from public.menu_items mi
    where mi.id = v_menu_item_id
      and mi.restaurant_id = p_restaurant_id;

    v_quantity := greatest(coalesce((v_item->>'quantity')::integer, 1), 1);
    v_item_subtotal := v_menu_item_price * v_quantity;

    if jsonb_typeof(v_item->'modifiers') = 'array' then
      for v_modifier in select * from jsonb_array_elements(v_item->'modifiers')
      loop
        v_modifier_id := (v_modifier->>'modifier_id')::uuid;

        select m.name, coalesce(m.price_delta, 0)
          into v_modifier_name, v_modifier_price
        from public.modifiers m
        join public.modifier_groups mg on mg.id = m.group_id
        join public.menu_items mi on mi.id = mg.item_id
        where m.id = v_modifier_id
          and mi.id = v_menu_item_id
          and mi.restaurant_id = p_restaurant_id;

        v_item_subtotal := v_item_subtotal + (v_modifier_price * v_quantity);
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
      v_menu_item_id,
      v_menu_item_name,
      v_menu_item_price,
      v_quantity,
      v_item_subtotal
    )
    returning id into v_order_item_id;

    if jsonb_typeof(v_item->'modifiers') = 'array' then
      for v_modifier in select * from jsonb_array_elements(v_item->'modifiers')
      loop
        v_modifier_id := (v_modifier->>'modifier_id')::uuid;

        select m.name, coalesce(m.price_delta, 0)
          into v_modifier_name, v_modifier_price
        from public.modifiers m
        join public.modifier_groups mg on mg.id = m.group_id
        join public.menu_items mi on mi.id = mg.item_id
        where m.id = v_modifier_id
          and mi.id = v_menu_item_id
          and mi.restaurant_id = p_restaurant_id;

        insert into public.order_item_modifiers (
          order_item_id,
          modifier_id,
          name,
          price_delta
        )
        values (
          v_order_item_id,
          v_modifier_id,
          v_modifier_name,
          v_modifier_price
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

grant execute on function public.create_order(text, uuid, uuid, text, jsonb)
to anon, authenticated, service_role;
