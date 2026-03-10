create or replace function public.trigger_print_on_order_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  request_id bigint;
begin
  select net.http_post(
    url := 'https://ltswdtctfrelzomozmme.supabase.co/functions/v1/trigger-print',
    body := jsonb_build_object(
      'mode', 'order',
      'orderId', new.id
    ),
    params := '{}'::jsonb,
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 5000
  )
  into request_id;

  return new;
exception
  when others then
    return new;
end;
$$;
