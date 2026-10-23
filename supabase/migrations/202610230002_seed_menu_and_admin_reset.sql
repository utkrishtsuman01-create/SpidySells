-- Initial menu and audited order reset. Run after 202610230001_spidy_sells.sql.
insert into public.products(id,name,description,price,image_url,published,available)
values ('11111111-1111-4111-8111-111111111111','Classic Tiramisu','Coffee-kissed layers, soft cream, and a delicate dusting of cocoa. A little moment of joy.',130,'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=1200&q=85',true,true)
on conflict (id) do nothing;

create or replace function public.admin_reset_orders(p_confirmation text)
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
 if not public.is_spidy_admin() then raise exception 'Administrator access required'; end if;
 if p_confirmation <> 'RESET ALL ORDERS' then raise exception 'Confirmation text did not match'; end if;
 select count(*) into v_count from public.orders;
 insert into public.audit_events(actor_id,action,details) values(auth.uid(),'reset_orders',jsonb_build_object('deleted_order_count',v_count));
 delete from public.orders;
 return v_count;
end $$;
revoke all on function public.admin_reset_orders(text) from public;
grant execute on function public.admin_reset_orders(text) to authenticated;
