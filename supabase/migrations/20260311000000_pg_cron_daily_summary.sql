-- Schedule daily summary emails via pg_cron + pg_net
-- Requires pg_cron and pg_net extensions to be enabled in Supabase dashboard
-- pg_cron fires at 9 PM UTC daily; adjust if restaurants are in a specific timezone

select cron.schedule(
  'daily-summary',
  '0 21 * * *',
  $$
  select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/daily-summary',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  $$
);
