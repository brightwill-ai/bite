do $$
declare
  v_restaurant_id uuid;
  v_burgers_id uuid;
  v_sides_id uuid;
  v_salads_id uuid;
  v_drinks_id uuid;
  v_classic_smash_id uuid;
  v_cheese_group_id uuid;
  v_addons_group_id uuid;
begin
  insert into public.restaurants (
    name,
    slug,
    cuisine_type,
    address,
    timezone,
    is_active,
    subscription_tier
  )
  values (
    'The Oakwood',
    'the-oakwood',
    'American Bistro',
    '142 Main Street, Nashville, TN',
    'America/Chicago',
    true,
    'starter'
  )
  on conflict (slug) do update
  set
    name = excluded.name,
    cuisine_type = excluded.cuisine_type,
    address = excluded.address,
    timezone = excluded.timezone,
    is_active = excluded.is_active,
    subscription_tier = excluded.subscription_tier
  returning id into v_restaurant_id;

  if not exists (
    select 1
    from public.tables
    where restaurant_id = v_restaurant_id
  ) then
    insert into public.tables (
      restaurant_id,
      table_number,
      label,
      is_active
    )
    select
      v_restaurant_id,
      gs::text,
      'Table ' || gs::text,
      true
    from generate_series(1, 15) as gs;
  end if;

  if not exists (
    select 1
    from public.menu_categories
    where restaurant_id = v_restaurant_id
  ) then
    insert into public.menu_categories (
      restaurant_id,
      name,
      display_order,
      is_available
    )
    values
      (v_restaurant_id, 'Burgers', 1, true),
      (v_restaurant_id, 'Sides', 2, true),
      (v_restaurant_id, 'Salads', 3, true),
      (v_restaurant_id, 'Drinks', 4, true);
  end if;

  select id into v_burgers_id
  from public.menu_categories
  where restaurant_id = v_restaurant_id
    and name = 'Burgers'
  limit 1;

  select id into v_sides_id
  from public.menu_categories
  where restaurant_id = v_restaurant_id
    and name = 'Sides'
  limit 1;

  select id into v_salads_id
  from public.menu_categories
  where restaurant_id = v_restaurant_id
    and name = 'Salads'
  limit 1;

  select id into v_drinks_id
  from public.menu_categories
  where restaurant_id = v_restaurant_id
    and name = 'Drinks'
  limit 1;

  if not exists (
    select 1
    from public.menu_items
    where restaurant_id = v_restaurant_id
  ) then
    insert into public.menu_items (
      restaurant_id,
      category_id,
      name,
      description,
      price,
      emoji,
      is_available,
      is_popular,
      is_new,
      needs_review,
      display_order
    )
    values
      (v_restaurant_id, v_burgers_id, 'Classic Smash', 'Two smashed patties, cheddar, pickles, house sauce', 13.50, ':burger:', true, true, false, false, 1),
      (v_restaurant_id, v_burgers_id, 'Mushroom Swiss', 'Cremini mushrooms, swiss, truffle aioli', 14.50, ':mushroom:', true, false, true, false, 2),
      (v_restaurant_id, v_burgers_id, 'Spicy Jalapeno', 'Pepper jack, jalapeno relish, chipotle mayo', 14.00, ':hot_pepper:', true, false, false, false, 3),
      (v_restaurant_id, v_sides_id, 'Truffle Fries', 'Crispy fries, truffle oil, parmesan', 6.50, ':fries:', true, true, false, false, 1),
      (v_restaurant_id, v_sides_id, 'Onion Rings', 'Beer-battered onion rings with ranch', 6.00, ':onion:', true, false, false, false, 2),
      (v_restaurant_id, v_salads_id, 'House Greens', 'Mixed greens, cucumber, tomato, vinaigrette', 9.00, ':salad:', true, false, true, false, 1),
      (v_restaurant_id, v_drinks_id, 'Sparkling Lemonade', 'Fresh lemon, soda, mint', 4.50, ':lemon:', true, false, false, false, 1),
      (v_restaurant_id, v_drinks_id, 'Cold Brew', 'Single-origin cold brew', 4.00, ':coffee:', true, false, false, false, 2);
  end if;

  select id into v_classic_smash_id
  from public.menu_items
  where restaurant_id = v_restaurant_id
    and name = 'Classic Smash'
  limit 1;

  if v_classic_smash_id is not null then
    if not exists (
      select 1
      from public.modifier_groups
      where item_id = v_classic_smash_id
        and name = 'Choose your cheese'
    ) then
      insert into public.modifier_groups (
        item_id,
        name,
        selection_type,
        is_required,
        min_selections,
        max_selections,
        display_order
      )
      values (
        v_classic_smash_id,
        'Choose your cheese',
        'single',
        true,
        1,
        1,
        1
      );
    end if;

    if not exists (
      select 1
      from public.modifier_groups
      where item_id = v_classic_smash_id
        and name = 'Add-ons'
    ) then
      insert into public.modifier_groups (
        item_id,
        name,
        selection_type,
        is_required,
        min_selections,
        max_selections,
        display_order
      )
      values (
        v_classic_smash_id,
        'Add-ons',
        'multiple',
        false,
        0,
        4,
        2
      );
    end if;

    select id into v_cheese_group_id
    from public.modifier_groups
    where item_id = v_classic_smash_id
      and name = 'Choose your cheese'
    limit 1;

    select id into v_addons_group_id
    from public.modifier_groups
    where item_id = v_classic_smash_id
      and name = 'Add-ons'
    limit 1;

    if v_cheese_group_id is not null and not exists (
      select 1 from public.modifiers where group_id = v_cheese_group_id
    ) then
      insert into public.modifiers (
        group_id,
        name,
        price_delta,
        is_available,
        display_order,
        emoji
      )
      values
        (v_cheese_group_id, 'Cheddar', 0, true, 1, ':cheese:'),
        (v_cheese_group_id, 'Swiss', 0, true, 2, ':cheese:'),
        (v_cheese_group_id, 'Pepper Jack', 0, true, 3, ':hot_pepper:');
    end if;

    if v_addons_group_id is not null and not exists (
      select 1 from public.modifiers where group_id = v_addons_group_id
    ) then
      insert into public.modifiers (
        group_id,
        name,
        price_delta,
        is_available,
        display_order,
        emoji
      )
      values
        (v_addons_group_id, 'Bacon', 2.00, true, 1, ':bacon:'),
        (v_addons_group_id, 'Avocado', 1.50, true, 2, ':avocado:'),
        (v_addons_group_id, 'Caramelized Onions', 1.00, true, 3, ':onion:'),
        (v_addons_group_id, 'Fried Egg', 2.00, true, 4, ':egg:');
    end if;
  end if;
end
$$;
