Context
Phase 3 adds real-time operational capabilities to the Bite admin portal. The admin app already has full Supabase integration (queries, auth, mutations). This phase adds: live order streaming via Supabase Realtime, batch QR code export via jszip, and a daily summary email Edge Function via Resend. Staff invite emails already work via Supabase Auth's inviteUserByEmail.

1. Live Order Updates (Realtime Subscription)
File: apps/admin/app/(dashboard)/orders/page.tsx
The page already loads orders in a useEffect. Add a second useEffect that opens a Supabase Realtime channel.
Changes:

Add a useEffect (separate from the data-loading one) that:

Guards on restaurantId being set
Creates channel: supabase.channel('orders-realtime')
Subscribes to postgres_changes with:

event: 'INSERT', schema: 'public', table: 'orders', filter: restaurant_id=eq.${restaurantId}
event: 'UPDATE', same filter


On INSERT: fetch the new order row with the same nested query (table, order_items, order_item_modifiers), map to UiOrder, prepend to orders state
On UPDATE: update matching order in orders state and selectedOrder (same pattern as handleUpdateStatus already does)
Returns cleanup: supabase.removeChannel(channel)


The time field in UiOrder uses formatRelativeTime — it renders stale after minutes. Add a setInterval (60s) in a third useEffect to force a re-render of relative times by cloning the orders array.

No schema changes needed — postgres_changes works on existing orders table with existing RLS.

2. QR Code Batch Download
File: apps/admin/app/(dashboard)/tables/page.tsx
Install jszip:
npm install jszip --workspace=apps/admin
Changes:

Import JSZip from jszip
Add isDownloadingAll state (boolean, for loading indicator on button)
Add handleDownloadAllQRs async function:

Set isDownloadingAll = true
Create new JSZip()
For each table: reuse existing SVG-to-canvas logic (handleDownloadQR pattern) but collect the PNG dataURL instead of triggering a download. Convert dataURL to blob via fetch(dataURL).then(r => r.blob()).
Add each blob to zip as table-${table.number}-qr.png
zip.generateAsync({ type: 'blob' }) → trigger download as all-qr-codes.zip
Set isDownloadingAll = false


Add "Download All QRs" button to the PageHeader action area (secondary style: border border-border text-ink) — only shown when tables.length > 0
The existing handleDownloadQR can be refactored to call a shared svgToBlob(svgElement) helper to avoid code duplication

No Supabase Storage upload needed at this stage — QR URLs are already stored in tables.qr_code_url on table creation (this already works).

3. Daily Summary Edge Function
Files:

supabase/functions/daily-summary/index.ts (new)
supabase/functions/daily-summary/deno.json (new)
New migration: supabase/migrations/YYYYMMDDHHMMSS_pg_cron_daily_summary.sql

Edge Function (daily-summary/index.ts):

Accept POST with optional { restaurant_id?: string } body (for manual triggers); if not provided, run for all active restaurants
Query orders for records where created_at >= today 00:00:00 in restaurant's timezone
Compute: total revenue, order count, top 5 items by quantity
Send email via Resend REST API (https://api.resend.com/emails) with:

To: restaurant owner's email (from staff table where role = 'owner')
Subject: Your Bite daily summary — {date}
HTML body: simple table with stats


Uses env vars: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

deno.json (mirror parse-menu/deno.json pattern):
json{
  "imports": {
    "@supabase/supabase-js": "npm:@supabase/supabase-js@2"
  },
  "compilerOptions": { "strict": true }
}
pg_cron migration:
sql-- Enable pg_cron extension (requires Supabase dashboard approval or already enabled)
select cron.schedule(
  'daily-summary',
  '0 21 * * *',  -- 9 PM UTC daily (adjust per restaurant timezone in function)
  $$
  select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/daily-summary',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

Note: pg_net + pg_cron must be enabled in the Supabase dashboard. If not available, the function can also be triggered via an external cron job (e.g., GitHub Actions on a schedule) calling the Edge Function URL with the service role key.


Critical Files
FileChangeapps/admin/app/(dashboard)/orders/page.tsxAdd Realtime channel subscription + time refresh intervalapps/admin/app/(dashboard)/tables/page.tsxAdd batch download with jszipapps/admin/package.jsonAdd jszip dependencysupabase/functions/daily-summary/index.tsNew Edge Functionsupabase/functions/daily-summary/deno.jsonDeno config for new functionsupabase/migrations/*_pg_cron_daily_summary.sqlpg_cron schedule

Verification

Realtime: Open admin orders page, then insert a test order in Supabase dashboard SQL editor → order appears in table without refresh. Update status → badge updates instantly.
Batch QR download: Create 3+ tables, click "Download All QRs" → ZIP file downloads containing one PNG per table.
Daily summary: Deploy edge function, invoke manually via supabase functions invoke daily-summary → email arrives at owner address. Check pg_cron job exists via select * from cron.job.


Order of Implementation

Realtime orders (self-contained, no new deps)
Batch QR download (install jszip first)
Daily summary edge function + migration