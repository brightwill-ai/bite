do $$
declare
  v_restaurant_id uuid;
  v_burgers_id uuid;
  v_sides_id uuid;
  v_salads_id uuid;
  v_drinks_id uuid;
  v_desserts_id uuid;

  v_classic_smash_id uuid;
  v_truffle_fries_id uuid;
  v_sparkling_lemonade_id uuid;
  v_veggie_melt_id uuid;
  v_warm_cookie_skillet_id uuid;
  v_iced_tea_id uuid;
  v_caesar_crunch_id uuid;

  v_cheese_group_id uuid;
  v_addons_group_id uuid;
  v_size_group_id uuid;

  v_cheddar_modifier_id uuid;
  v_bacon_modifier_id uuid;
  v_large_modifier_id uuid;

  v_table_1_id uuid;
  v_table_3_id uuid;
  v_table_8_id uuid;

  v_order_result jsonb;
  v_order_id uuid;
begin
  select id
  into v_restaurant_id
  from public.restaurants
  where slug = 'the-oakwood'
  limit 1;

  if v_restaurant_id is null then
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
    returning id into v_restaurant_id;
  end if;

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
  from generate_series(1, 15) as gs
  where not exists (
    select 1
    from public.tables t
    where t.restaurant_id = v_restaurant_id
      and t.table_number = gs::text
  );

  insert into public.menu_categories (restaurant_id, name, display_order, is_available)
  select v_restaurant_id, 'Burgers', 1, true
  where not exists (
    select 1 from public.menu_categories where restaurant_id = v_restaurant_id and name = 'Burgers'
  );

  insert into public.menu_categories (restaurant_id, name, display_order, is_available)
  select v_restaurant_id, 'Sides', 2, true
  where not exists (
    select 1 from public.menu_categories where restaurant_id = v_restaurant_id and name = 'Sides'
  );

  insert into public.menu_categories (restaurant_id, name, display_order, is_available)
  select v_restaurant_id, 'Salads', 3, true
  where not exists (
    select 1 from public.menu_categories where restaurant_id = v_restaurant_id and name = 'Salads'
  );

  insert into public.menu_categories (restaurant_id, name, display_order, is_available)
  select v_restaurant_id, 'Drinks', 4, true
  where not exists (
    select 1 from public.menu_categories where restaurant_id = v_restaurant_id and name = 'Drinks'
  );

  insert into public.menu_categories (restaurant_id, name, display_order, is_available)
  select v_restaurant_id, 'Desserts', 5, true
  where not exists (
    select 1 from public.menu_categories where restaurant_id = v_restaurant_id and name = 'Desserts'
  );

  select id into v_burgers_id
  from public.menu_categories
  where restaurant_id = v_restaurant_id and name = 'Burgers'
  limit 1;

  select id into v_sides_id
  from public.menu_categories
  where restaurant_id = v_restaurant_id and name = 'Sides'
  limit 1;

  select id into v_salads_id
  from public.menu_categories
  where restaurant_id = v_restaurant_id and name = 'Salads'
  limit 1;

  select id into v_drinks_id
  from public.menu_categories
  where restaurant_id = v_restaurant_id and name = 'Drinks'
  limit 1;

  select id into v_desserts_id
  from public.menu_categories
  where restaurant_id = v_restaurant_id and name = 'Desserts'
  limit 1;

  insert into public.menu_items (
    restaurant_id, category_id, name, description, price, emoji, is_available, is_popular, is_new, needs_review, display_order
  )
  select v_restaurant_id, v_burgers_id, 'Classic Smash', 'Two smashed patties, cheddar, pickles, house sauce', 13.50, ':burger:', true, true, false, false, 1
  where not exists (select 1 from public.menu_items where restaurant_id = v_restaurant_id and name = 'Classic Smash');

  insert into public.menu_items (
    restaurant_id, category_id, name, description, price, emoji, is_available, is_popular, is_new, needs_review, display_order
  )
  select v_restaurant_id, v_burgers_id, 'Mushroom Swiss', 'Cremini mushrooms, swiss, truffle aioli', 14.50, ':mushroom:', true, false, true, false, 2
  where not exists (select 1 from public.menu_items where restaurant_id = v_restaurant_id and name = 'Mushroom Swiss');

  insert into public.menu_items (
    restaurant_id, category_id, name, description, price, emoji, is_available, is_popular, is_new, needs_review, display_order
  )
  select v_restaurant_id, v_burgers_id, 'Spicy Jalapeno', 'Pepper jack, jalapeno relish, chipotle mayo', 14.00, ':hot_pepper:', true, false, false, false, 3
  where not exists (select 1 from public.menu_items where restaurant_id = v_restaurant_id and name = 'Spicy Jalapeno');

  insert into public.menu_items (
    restaurant_id, category_id, name, description, price, emoji, is_available, is_popular, is_new, needs_review, display_order
  )
  select v_restaurant_id, v_burgers_id, 'BBQ Bacon Stack', 'Smoky bbq sauce, onion straws, applewood bacon', 15.00, ':bacon:', true, true, false, false, 4
  where not exists (select 1 from public.menu_items where restaurant_id = v_restaurant_id and name = 'BBQ Bacon Stack');

  insert into public.menu_items (
    restaurant_id, category_id, name, description, price, emoji, is_available, is_popular, is_new, needs_review, display_order
  )
  select v_restaurant_id, v_burgers_id, 'Veggie Melt', 'Charred veggie patty, provolone, herb mayo', 13.00, ':leafy_green:', true, false, true, false, 5
  where not exists (select 1 from public.menu_items where restaurant_id = v_restaurant_id and name = 'Veggie Melt');

  insert into public.menu_items (
    restaurant_id, category_id, name, description, price, emoji, is_available, is_popular, is_new, needs_review, display_order
  )
  select v_restaurant_id, v_sides_id, 'Truffle Fries', 'Crispy fries, truffle oil, parmesan', 6.50, ':fries:', true, true, false, false, 1
  where not exists (select 1 from public.menu_items where restaurant_id = v_restaurant_id and name = 'Truffle Fries');

  insert into public.menu_items (
    restaurant_id, category_id, name, description, price, emoji, is_available, is_popular, is_new, needs_review, display_order
  )
  select v_restaurant_id, v_sides_id, 'Onion Rings', 'Beer-battered onion rings with ranch', 6.00, ':onion:', true, false, false, false, 2
  where not exists (select 1 from public.menu_items where restaurant_id = v_restaurant_id and name = 'Onion Rings');

  insert into public.menu_items (
    restaurant_id, category_id, name, description, price, emoji, is_available, is_popular, is_new, needs_review, display_order
  )
  select v_restaurant_id, v_sides_id, 'Sweet Potato Fries', 'Sea salt, paprika, and maple aioli', 6.50, ':sweet_potato:', true, false, true, false, 3
  where not exists (select 1 from public.menu_items where restaurant_id = v_restaurant_id and name = 'Sweet Potato Fries');

  insert into public.menu_items (
    restaurant_id, category_id, name, description, price, emoji, is_available, is_popular, is_new, needs_review, display_order
  )
  select v_restaurant_id, v_sides_id, 'Mac & Cheese Bites', 'Crispy macaroni bites with pepper sauce', 7.00, ':cheese:', true, true, false, false, 4
  where not exists (select 1 from public.menu_items where restaurant_id = v_restaurant_id and name = 'Mac & Cheese Bites');

  insert into public.menu_items (
    restaurant_id, category_id, name, description, price, emoji, is_available, is_popular, is_new, needs_review, display_order
  )
  select v_restaurant_id, v_salads_id, 'House Greens', 'Mixed greens, cucumber, tomato, vinaigrette', 9.00, ':salad:', true, false, true, false, 1
  where not exists (select 1 from public.menu_items where restaurant_id = v_restaurant_id and name = 'House Greens');

  insert into public.menu_items (
    restaurant_id, category_id, name, description, price, emoji, is_available, is_popular, is_new, needs_review, display_order
  )
  select v_restaurant_id, v_salads_id, 'Caesar Crunch', 'Romaine, parmesan crisp, garlic croutons', 10.50, ':salad:', true, true, false, false, 2
  where not exists (select 1 from public.menu_items where restaurant_id = v_restaurant_id and name = 'Caesar Crunch');

  insert into public.menu_items (
    restaurant_id, category_id, name, description, price, emoji, is_available, is_popular, is_new, needs_review, display_order
  )
  select v_restaurant_id, v_salads_id, 'Southwest Chicken', 'Grilled chicken, corn salsa, chipotle-lime dressing', 12.50, ':chicken:', true, false, false, false, 3
  where not exists (select 1 from public.menu_items where restaurant_id = v_restaurant_id and name = 'Southwest Chicken');

  insert into public.menu_items (
    restaurant_id, category_id, name, description, price, emoji, is_available, is_popular, is_new, needs_review, display_order
  )
  select v_restaurant_id, v_drinks_id, 'Sparkling Lemonade', 'Fresh lemon, soda, mint', 4.50, ':lemon:', true, false, false, false, 1
  where not exists (select 1 from public.menu_items where restaurant_id = v_restaurant_id and name = 'Sparkling Lemonade');

  insert into public.menu_items (
    restaurant_id, category_id, name, description, price, emoji, is_available, is_popular, is_new, needs_review, display_order
  )
  select v_restaurant_id, v_drinks_id, 'Cold Brew', 'Single-origin cold brew', 4.00, ':coffee:', true, false, false, false, 2
  where not exists (select 1 from public.menu_items where restaurant_id = v_restaurant_id and name = 'Cold Brew');

  insert into public.menu_items (
    restaurant_id, category_id, name, description, price, emoji, is_available, is_popular, is_new, needs_review, display_order
  )
  select v_restaurant_id, v_drinks_id, 'Iced Tea', 'Black tea with orange peel', 3.50, ':tea:', true, false, false, false, 3
  where not exists (select 1 from public.menu_items where restaurant_id = v_restaurant_id and name = 'Iced Tea');

  insert into public.menu_items (
    restaurant_id, category_id, name, description, price, emoji, is_available, is_popular, is_new, needs_review, display_order
  )
  select v_restaurant_id, v_drinks_id, 'Ginger Beer', 'House ginger syrup and sparkling water', 4.50, ':cocktail:', true, false, true, false, 4
  where not exists (select 1 from public.menu_items where restaurant_id = v_restaurant_id and name = 'Ginger Beer');

  insert into public.menu_items (
    restaurant_id, category_id, name, description, price, emoji, is_available, is_popular, is_new, needs_review, display_order
  )
  select v_restaurant_id, v_desserts_id, 'Warm Cookie Skillet', 'Chocolate chip cookie, vanilla cream, sea salt', 8.50, ':cookie:', true, true, false, false, 1
  where not exists (select 1 from public.menu_items where restaurant_id = v_restaurant_id and name = 'Warm Cookie Skillet');

  select id into v_classic_smash_id from public.menu_items where restaurant_id = v_restaurant_id and name = 'Classic Smash' limit 1;
  select id into v_truffle_fries_id from public.menu_items where restaurant_id = v_restaurant_id and name = 'Truffle Fries' limit 1;
  select id into v_sparkling_lemonade_id from public.menu_items where restaurant_id = v_restaurant_id and name = 'Sparkling Lemonade' limit 1;
  select id into v_veggie_melt_id from public.menu_items where restaurant_id = v_restaurant_id and name = 'Veggie Melt' limit 1;
  select id into v_warm_cookie_skillet_id from public.menu_items where restaurant_id = v_restaurant_id and name = 'Warm Cookie Skillet' limit 1;
  select id into v_iced_tea_id from public.menu_items where restaurant_id = v_restaurant_id and name = 'Iced Tea' limit 1;
  select id into v_caesar_crunch_id from public.menu_items where restaurant_id = v_restaurant_id and name = 'Caesar Crunch' limit 1;

  if v_classic_smash_id is not null then
    insert into public.modifier_groups (
      item_id,
      name,
      selection_type,
      is_required,
      min_selections,
      max_selections,
      display_order
    )
    select v_classic_smash_id, 'Choose your cheese', 'single', true, 1, 1, 1
    where not exists (
      select 1
      from public.modifier_groups
      where item_id = v_classic_smash_id and name = 'Choose your cheese'
    );

    insert into public.modifier_groups (
      item_id,
      name,
      selection_type,
      is_required,
      min_selections,
      max_selections,
      display_order
    )
    select v_classic_smash_id, 'Add-ons', 'multiple', false, 0, 4, 2
    where not exists (
      select 1
      from public.modifier_groups
      where item_id = v_classic_smash_id and name = 'Add-ons'
    );
  end if;

  if v_sparkling_lemonade_id is not null then
    insert into public.modifier_groups (
      item_id,
      name,
      selection_type,
      is_required,
      min_selections,
      max_selections,
      display_order
    )
    select v_sparkling_lemonade_id, 'Size', 'single', true, 1, 1, 1
    where not exists (
      select 1
      from public.modifier_groups
      where item_id = v_sparkling_lemonade_id and name = 'Size'
    );
  end if;

  select id into v_cheese_group_id
  from public.modifier_groups
  where item_id = v_classic_smash_id and name = 'Choose your cheese'
  limit 1;

  select id into v_addons_group_id
  from public.modifier_groups
  where item_id = v_classic_smash_id and name = 'Add-ons'
  limit 1;

  select id into v_size_group_id
  from public.modifier_groups
  where item_id = v_sparkling_lemonade_id and name = 'Size'
  limit 1;

  if v_cheese_group_id is not null then
    insert into public.modifiers (group_id, name, price_delta, is_available, display_order, emoji)
    select v_cheese_group_id, 'Cheddar', 0, true, 1, ':cheese:'
    where not exists (select 1 from public.modifiers where group_id = v_cheese_group_id and name = 'Cheddar');

    insert into public.modifiers (group_id, name, price_delta, is_available, display_order, emoji)
    select v_cheese_group_id, 'Swiss', 0, true, 2, ':cheese:'
    where not exists (select 1 from public.modifiers where group_id = v_cheese_group_id and name = 'Swiss');

    insert into public.modifiers (group_id, name, price_delta, is_available, display_order, emoji)
    select v_cheese_group_id, 'Pepper Jack', 0, true, 3, ':hot_pepper:'
    where not exists (select 1 from public.modifiers where group_id = v_cheese_group_id and name = 'Pepper Jack');
  end if;

  if v_addons_group_id is not null then
    insert into public.modifiers (group_id, name, price_delta, is_available, display_order, emoji)
    select v_addons_group_id, 'Bacon', 2.00, true, 1, ':bacon:'
    where not exists (select 1 from public.modifiers where group_id = v_addons_group_id and name = 'Bacon');

    insert into public.modifiers (group_id, name, price_delta, is_available, display_order, emoji)
    select v_addons_group_id, 'Avocado', 1.50, true, 2, ':avocado:'
    where not exists (select 1 from public.modifiers where group_id = v_addons_group_id and name = 'Avocado');

    insert into public.modifiers (group_id, name, price_delta, is_available, display_order, emoji)
    select v_addons_group_id, 'Caramelized Onions', 1.00, true, 3, ':onion:'
    where not exists (select 1 from public.modifiers where group_id = v_addons_group_id and name = 'Caramelized Onions');

    insert into public.modifiers (group_id, name, price_delta, is_available, display_order, emoji)
    select v_addons_group_id, 'Fried Egg', 2.00, true, 4, ':egg:'
    where not exists (select 1 from public.modifiers where group_id = v_addons_group_id and name = 'Fried Egg');
  end if;

  if v_size_group_id is not null then
    insert into public.modifiers (group_id, name, price_delta, is_available, display_order, emoji)
    select v_size_group_id, 'Regular', 0, true, 1, ':cup_with_straw:'
    where not exists (select 1 from public.modifiers where group_id = v_size_group_id and name = 'Regular');

    insert into public.modifiers (group_id, name, price_delta, is_available, display_order, emoji)
    select v_size_group_id, 'Large', 1.00, true, 2, ':cup_with_straw:'
    where not exists (select 1 from public.modifiers where group_id = v_size_group_id and name = 'Large');
  end if;

  select id into v_cheddar_modifier_id
  from public.modifiers
  where group_id = v_cheese_group_id and name = 'Cheddar'
  limit 1;

  select id into v_bacon_modifier_id
  from public.modifiers
  where group_id = v_addons_group_id and name = 'Bacon'
  limit 1;

  select id into v_large_modifier_id
  from public.modifiers
  where group_id = v_size_group_id and name = 'Large'
  limit 1;

  select id into v_table_1_id
  from public.tables
  where restaurant_id = v_restaurant_id and table_number = '1'
  limit 1;

  select id into v_table_3_id
  from public.tables
  where restaurant_id = v_restaurant_id and table_number = '3'
  limit 1;

  select id into v_table_8_id
  from public.tables
  where restaurant_id = v_restaurant_id and table_number = '8'
  limit 1;

  if not exists (
    select 1
    from public.orders
    where restaurant_id = v_restaurant_id
      and session_id like 'seed-session-%'
  ) then
    if v_table_1_id is not null and v_classic_smash_id is not null and v_truffle_fries_id is not null then
      select public.create_order(
        'seed-session-1',
        v_restaurant_id,
        v_table_1_id,
        'Please cut burger in half.',
        jsonb_build_array(
          jsonb_build_object(
            'menu_item_id', v_classic_smash_id,
            'quantity', 2,
            'modifiers', coalesce(
              (
                select jsonb_agg(jsonb_build_object('modifier_id', mod_id))
                from unnest(array[v_cheddar_modifier_id, v_bacon_modifier_id]) as mod_id
                where mod_id is not null
              ),
              '[]'::jsonb
            )
          ),
          jsonb_build_object(
            'menu_item_id', v_truffle_fries_id,
            'quantity', 1,
            'modifiers', '[]'::jsonb
          )
        )
      ) into v_order_result;

      v_order_id := (v_order_result->>'order_id')::uuid;
      update public.orders
      set status = 'preparing', payment_status = 'paid', print_status = 'sent'
      where id = v_order_id;
    end if;

    if v_table_3_id is not null and v_veggie_melt_id is not null and v_sparkling_lemonade_id is not null then
      select public.create_order(
        'seed-session-2',
        v_restaurant_id,
        v_table_3_id,
        'No mayo on veggie melt.',
        jsonb_build_array(
          jsonb_build_object(
            'menu_item_id', v_veggie_melt_id,
            'quantity', 1,
            'modifiers', '[]'::jsonb
          ),
          jsonb_build_object(
            'menu_item_id', v_sparkling_lemonade_id,
            'quantity', 1,
            'modifiers', coalesce(
              (
                select jsonb_agg(jsonb_build_object('modifier_id', mod_id))
                from unnest(array[v_large_modifier_id]) as mod_id
                where mod_id is not null
              ),
              '[]'::jsonb
            )
          )
        )
      ) into v_order_result;

      v_order_id := (v_order_result->>'order_id')::uuid;
      update public.orders
      set status = 'ready', payment_status = 'pending', print_status = 'none'
      where id = v_order_id;
    end if;

    if v_table_8_id is not null and v_caesar_crunch_id is not null and v_iced_tea_id is not null and v_warm_cookie_skillet_id is not null then
      select public.create_order(
        'seed-session-3',
        v_restaurant_id,
        v_table_8_id,
        null,
        jsonb_build_array(
          jsonb_build_object(
            'menu_item_id', v_caesar_crunch_id,
            'quantity', 1,
            'modifiers', '[]'::jsonb
          ),
          jsonb_build_object(
            'menu_item_id', v_iced_tea_id,
            'quantity', 2,
            'modifiers', '[]'::jsonb
          ),
          jsonb_build_object(
            'menu_item_id', v_warm_cookie_skillet_id,
            'quantity', 1,
            'modifiers', '[]'::jsonb
          )
        )
      ) into v_order_result;

      v_order_id := (v_order_result->>'order_id')::uuid;
      update public.orders
      set status = 'pending', payment_status = 'unpaid', print_status = 'none'
      where id = v_order_id;
    end if;
  end if;
end
$$;
