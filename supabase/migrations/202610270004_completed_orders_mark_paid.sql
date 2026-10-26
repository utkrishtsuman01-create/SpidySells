create or replace function public.sync_completed_order_payment_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'completed' then
    new.payment_status := 'paid';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_completed_order_payment_status on public.orders;
create trigger trg_sync_completed_order_payment_status
before insert or update on public.orders
for each row
execute function public.sync_completed_order_payment_status();

update public.orders
set payment_status = 'paid',
    updated_at = now()
where status = 'completed'
  and payment_status is distinct from 'paid';
