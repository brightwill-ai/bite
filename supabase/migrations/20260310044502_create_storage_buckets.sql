insert into storage.buckets (id, name, public)
values
  ('qr-codes', 'qr-codes', true),
  ('menu-uploads', 'menu-uploads', false),
  ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

-- Storage policies
drop policy if exists "Public can view QR codes" on storage.objects;
create policy "Public can view QR codes"
on storage.objects
for select
to public
using (bucket_id = 'qr-codes');

drop policy if exists "Public can view menu images" on storage.objects;
create policy "Public can view menu images"
on storage.objects
for select
to public
using (bucket_id = 'menu-images');

drop policy if exists "Staff can upload QR codes" on storage.objects;
create policy "Staff can upload QR codes"
on storage.objects
for insert
to public
with check (bucket_id = 'qr-codes' and auth.uid() is not null);

drop policy if exists "Staff can upload menu images" on storage.objects;
create policy "Staff can upload menu images"
on storage.objects
for insert
to public
with check (bucket_id = 'menu-images' and auth.uid() is not null);

drop policy if exists "Staff can upload menus" on storage.objects;
create policy "Staff can upload menus"
on storage.objects
for insert
to public
with check (bucket_id = 'menu-uploads' and auth.uid() is not null);

drop policy if exists "Staff can view own menu uploads" on storage.objects;
create policy "Staff can view own menu uploads"
on storage.objects
for select
to public
using (bucket_id = 'menu-uploads' and auth.uid() is not null);
