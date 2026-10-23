-- Spidy Sells initial database schema. Apply in Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create table if not exists public.branches (id uuid primary key default gen_random_uuid(), name text not null, address text, google_maps_url text, contact_phone text, active boolean not null default false, takeaway_enabled boolean not null default true, delivery_enabled boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.products (id uuid primary key default gen_random_uuid(), name text not null, description text not null default '', price numeric(10,2) not null check(price>=0), image_url text, published boolean not null default false, available boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.business_settings (id uuid primary key default gen_random_uuid(), business_name text not null default 'Spidy Sells', whatsapp_number text not null default '918910882074', currency text not null default 'INR', delivery_enabled boolean not null default false, delivery_charge numeric(10,2) not null default 0 check(delivery_charge>=0), pickup_instructions text, updated_at timestamptz not null default now());
insert into public.business_settings(business_name) select 'Spidy Sells' where not exists(select 1 from public.business_settings);
create table if not exists public.orders (id uuid primary key default gen_random_uuid(), order_reference text not null unique default ('SS-'||upper(substr(encode(gen_random_bytes(6),'hex'),1,10))), order_type text not null check(order_type in ('TAKEAWAY','ONLINE DELIVERY')), customer_name text not null, customer_phone text not null, delivery_address text, branch_id uuid references public.branches(id) on delete set null, branch_name_snapshot text, notes text, subtotal numeric(10,2) not null check(subtotal>=0), delivery_charge numeric(10,2) not null default 0 check(delivery_charge>=0), total numeric(10,2) not null check(total>=0), status text not null default 'whatsapp_initiated' check(status in ('whatsapp_initiated','confirmed','preparing','ready_for_pickup','out_for_delivery','completed','cancelled','not_converted')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(order_type <> 'ONLINE DELIVERY' or delivery_address is not null));
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_branch_idx on public.orders(branch_id);
create table if not exists public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, product_id uuid references public.products(id) on delete set null, product_name_snapshot text not null, quantity integer not null check(quantity>0), unit_price numeric(10,2) not null check(unit_price>=0), line_total numeric(10,2) not null check(line_total>=0));
create table if not exists public.order_status_history (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, old_status text, new_status text not null, changed_by uuid references auth.users(id), changed_at timestamptz not null default now());
create table if not exists public.audit_events (id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id), action text not null, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create or replace function public.is_spidy_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.admin_users where user_id=auth.uid()) $$;
revoke all on function public.is_spidy_admin() from public;
grant execute on function public.is_spidy_admin() to authenticated;
alter table public.admin_users enable row level security;
alter table public.branches enable row level security;
alter table public.products enable row level security;
alter table public.business_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.audit_events enable row level security;
create policy "Admins read admin roster" on public.admin_users for select to authenticated using (public.is_spidy_admin());
create policy "Public reads active branches" on public.branches for select to anon, authenticated using (active=true);
create policy "Admins manage branches" on public.branches for all to authenticated using (public.is_spidy_admin()) with check (public.is_spidy_admin());
create policy "Public reads published available products" on public.products for select to anon, authenticated using (published=true and available=true);
create policy "Admins manage products" on public.products for all to authenticated using (public.is_spidy_admin()) with check (public.is_spidy_admin());
create policy "Public reads business settings" on public.business_settings for select to anon, authenticated using (true);
create policy "Admins manage business settings" on public.business_settings for all to authenticated using (public.is_spidy_admin()) with check (public.is_spidy_admin());
create policy "Admins read orders" on public.orders for select to authenticated using (public.is_spidy_admin());
create policy "Admins update orders" on public.orders for update to authenticated using (public.is_spidy_admin()) with check (public.is_spidy_admin());
create policy "Admins read order items" on public.order_items for select to authenticated using (public.is_spidy_admin());
create policy "Admins read status history" on public.order_status_history for select to authenticated using (public.is_spidy_admin());
create policy "Admins read audit events" on public.audit_events for select to authenticated using (public.is_spidy_admin());
create policy "Admins insert audit events" on public.audit_events for insert to authenticated with check (public.is_spidy_admin());
-- Customer orders must be created only by the trusted RPC, which validates current product price/availability server-side.
create or replace function public.create_customer_order(p_order_type text,p_customer_name text,p_customer_phone text,p_delivery_address text,p_branch_id uuid,p_notes text,p_items jsonb,p_delivery_charge numeric default 0)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_subtotal numeric(10,2):=0; v_item jsonb; v_product public.products%rowtype; v_qty integer; v_branch public.branches%rowtype; v_delivery numeric(10,2):=0;
begin
 if p_order_type not in ('TAKEAWAY','ONLINE DELIVERY') then raise exception 'Invalid order type'; end if;
 if length(trim(coalesce(p_customer_name,'')))<1 or length(trim(coalesce(p_customer_phone,'')))<8 then raise exception 'Name and valid phone are required'; end if;
 if p_order_type='ONLINE DELIVERY' and length(trim(coalesce(p_delivery_address,'')))<5 then raise exception 'Delivery address is required'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Cart is empty'; end if;
 if p_order_type='TAKEAWAY' and p_branch_id is not null then select * into v_branch from public.branches where id=p_branch_id and active and takeaway_enabled; if not found then raise exception 'Selected pickup branch is unavailable'; end if; end if;
 if p_order_type='ONLINE DELIVERY' then
  if not exists(select 1 from public.business_settings where delivery_enabled) then raise exception 'Online delivery is not enabled'; end if;
  select delivery_charge into v_delivery from public.business_settings order by updated_at desc limit 1;
 end if;
 for v_item in select * from jsonb_array_elements(p_items) loop
  v_qty:= (v_item->>'quantity')::integer; if v_qty<1 or v_qty>50 then raise exception 'Invalid quantity'; end if;
  select * into v_product from public.products where id=(v_item->>'product_id')::uuid and published and available;
  if not found then raise exception 'A product is no longer available'; end if;
  v_subtotal:=v_subtotal+(v_product.price*v_qty);
 end loop;
 insert into public.orders(order_type,customer_name,customer_phone,delivery_address,branch_id,branch_name_snapshot,notes,subtotal,delivery_charge,total,status)
 values(p_order_type,trim(p_customer_name),trim(p_customer_phone),case when p_order_type='ONLINE DELIVERY' then trim(p_delivery_address) else null end,p_branch_id,case when p_branch_id is not null then v_branch.name else null end,nullif(trim(coalesce(p_notes,'')),''),v_subtotal,v_delivery,v_subtotal+v_delivery,'whatsapp_initiated') returning * into v_order;
 for v_item in select * from jsonb_array_elements(p_items) loop
  v_qty:=(v_item->>'quantity')::integer; select * into v_product from public.products where id=(v_item->>'product_id')::uuid;
  insert into public.order_items(order_id,product_id,product_name_snapshot,quantity,unit_price,line_total) values(v_order.id,v_product.id,v_product.name,v_qty,v_product.price,v_product.price*v_qty);
 end loop;
 insert into public.order_status_history(order_id,old_status,new_status) values(v_order.id,null,'whatsapp_initiated');
 return jsonb_build_object('id',v_order.id,'order_reference',v_order.order_reference,'total',v_order.total);
end $$;
revoke all on function public.create_customer_order(text,text,text,text,uuid,text,jsonb,numeric) from public;
grant execute on function public.create_customer_order(text,text,text,text,uuid,text,jsonb,numeric) to anon,authenticated;
