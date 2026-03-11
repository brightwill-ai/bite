create extension if not exists pg_net with schema extensions;

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
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object(
      'mode', 'order',
      'orderId', new.id
    )::text
  )
  into request_id;

  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists trigger_print_on_order_insert on public.orders;
create trigger trigger_print_on_order_insert
after insert on public.orders
for each row
execute function public.trigger_print_on_order_insert();
