create table if not exists public.customer_reviews (
 id uuid primary key default gen_random_uuid(),
 customer_name text not null check (char_length(trim(customer_name)) between 1 and 100),
 rating integer not null check (rating between 1 and 5),
 description text not null check (char_length(trim(description)) between 1 and 4000),
 image_url text,
 created_at timestamptz not null default now()
);
alter table public.customer_reviews enable row level security;
grant select, insert, delete on public.customer_reviews to anon, authenticated;
drop policy if exists "Public can read reviews" on public.customer_reviews;
create policy "Public can read reviews" on public.customer_reviews for select to anon, authenticated using (true);
drop policy if exists "Anyone can submit a review" on public.customer_reviews;
create policy "Anyone can submit a review" on public.customer_reviews for insert to anon, authenticated with check (char_length(trim(customer_name)) between 1 and 100 and rating between 1 and 5 and char_length(trim(description)) between 1 and 4000);
drop policy if exists "Admins can delete reviews" on public.customer_reviews;
create policy "Admins can delete reviews" on public.customer_reviews for delete to authenticated using (public.is_spidy_admin());
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('customer-review-images','customer-review-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "Public can upload review images" on storage.objects;
create policy "Public can upload review images" on storage.objects for insert to anon, authenticated with check (bucket_id='customer-review-images');
drop policy if exists "Public can view review images" on storage.objects;
create policy "Public can view review images" on storage.objects for select to anon, authenticated using (bucket_id='customer-review-images');
drop policy if exists "Admins can delete review images" on storage.objects;
create policy "Admins can delete review images" on storage.objects for delete to authenticated using (bucket_id='customer-review-images' and public.is_spidy_admin());
