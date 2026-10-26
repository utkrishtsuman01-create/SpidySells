alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check check (payment_method = any (array['cash_on_pickup'::text, 'online'::text]));

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check (payment_status = any (array['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text]));
