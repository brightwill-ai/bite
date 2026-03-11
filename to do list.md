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

What's Complete
All frontend (Phase 1) ✓
Supabase auth + RLS + 11-table schema ✓
Order creation flow (customer → DB) ✓
Menu parser (Claude API + PDF/image OCR) ✓
PrintNode webhook trigger on order insert ✓
QR code generation per table ✓
Staff invite API ✓
Admin onboarding wizard ✓
What You Still Need (Prioritized)
P0 — Hard Blockers (App won't work without these)
1. Realtime Order Subscriptions
The orders page currently does a one-time fetch. Kitchen staff would need to manually refresh to see new orders — unusable in a real restaurant. Need to add a Supabase Realtime channel subscription in apps/admin/app/(dashboard)/orders/page.tsx. The spec is already written in to do list.md.

2. Production Hosting & Domains
Docker + Nginx config exists but isn't deployed anywhere. You need:

A server (VPS, Railway, Fly.io, etc.) running the three Next.js apps
bite.so, menu.bite.so, admin.bite.so pointed to it with SSL
NEXT_PUBLIC_MENU_BASE_URL set to the real menu.bite.so URL (QR codes embed this URL — if it's wrong, every QR code is broken)
3. Supabase Production Secrets
The edge functions need secrets deployed to Supabase:

ANTHROPIC_API_KEY → for menu parsing
PRINT_WEBHOOK_SECRET → for PrintNode webhook security
RESEND_API_KEY → for staff invites and daily summary emails
4. Email Provider (Resend)
Staff invite emails and daily summary emails both use Resend. Without a real API key and a verified sending domain, inviting staff doesn't work.

P1 — Core Operations (Restaurant can't run efficiently without these)
5. Adyen Payments (you know this one)
Currently no payment flow at all — customers order for free. Need Adyen for Platforms sub-merchant onboarding + payment step in the customer cart before order submission.

6. Kitchen Printer Connection (you know this one)
The trigger-print edge function is built. But restaurants need to:

Sign up for PrintNode and get an API key
Install PrintNode client on a computer connected to their thermal printer
Enter their API key + printer ID in admin Settings → test print to verify
7. Kitchen Display System (KDS)
If a restaurant doesn't have a printer, they need a screen showing incoming orders. Currently there's no KDS view. This could be as simple as a second tab on the orders page (fullscreen, auto-refreshing) or a dedicated /kitchen route. Without either a printer OR a KDS, kitchen staff have no reliable way to see orders.

8. Daily Summary Cron
The edge function and migration file are both written. Just needs:

Enable pg_cron + pg_net extensions in Supabase dashboard
Run the migration: supabase/migrations/20260311000000_pg_cron_daily_summary.sql
Set RESEND_API_KEY secret (same as #4)
P2 — Quality / Ops Completeness
9. Batch QR Download
The to do list.md has this partially implemented but not wired up. JSZip is already installed. Restaurants need to print QR codes for all their tables at once — downloading 20 individual PNGs is painful.

10. Menu Item Images
The menu-images storage bucket exists and is public, but there's no UI to upload images per menu item. Items currently use emoji only. Not a blocker, but restaurants will ask for it.

11. Customer Order Status Tracking
After placing an order, customers see an "Order Confirmed" screen but get no further updates. No way to know when food is ready. A simple polling or Realtime subscription on the order's status field in the menu app would let you show "Your order is being prepared" / "Ready for pickup."

12. Error Monitoring
Nothing catches production errors right now. At minimum, add Sentry to the admin and menu apps so you know when something breaks in a live restaurant without a customer having to tell you.

13. End-to-End Smoke Test Before Each Restaurant Onboarding
The full path — signup → create tables → upload menu → scan QR → add to cart → checkout → order appears in admin → prints — needs to work reliably. There are no automated tests. Before handing off to a restaurant, run this manually in production.

Recommended Order
1. Set up hosting + real domains + env vars        (unlocks everything)
2. Set up Resend + deploy secrets to Supabase      (email works)
3. Implement Realtime orders subscription          (operations work)
4. Verify PrintNode end-to-end with a real printer (kitchen works)
5. Complete batch QR download                      (onboarding smooth)
6. Enable pg_cron + run daily-summary migration    (quick win, fully coded)
7. KDS view                                        (printer alternative)
8. Customer order status updates                   (experience polish)
9. Adyen payments                                  (revenue)
10. Menu item images                               (nice-to-have)
11. Error monitoring                               (production safety net)