-- Disable cash on delivery for all new orders, regardless of branch or client.
-- Existing orders are preserved as historical records.

DO $migration$
DECLARE
  definition text;
  old_default text;
  old_methods text;
  old_delivery_rule text;
BEGIN
  definition := pg_get_functiondef(
    'public.create_customer_order(text,text,text,text,uuid,text,jsonb,numeric,numeric,text)'::regprocedure
  );

  old_default := $find$DEFAULT 'cash_on_delivery'::text$find$;
  IF position(old_default in definition) = 0 THEN
    RAISE EXCEPTION 'Expected cash-on-delivery default was not found; no payment restriction was changed.';
  END IF;
  definition := replace(definition, old_default, $replace$DEFAULT 'online'::text$replace$);

  old_methods := $find$IF p_payment_method NOT IN ('cash_on_delivery','cash_on_pickup','online') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;$find$;
  IF position(old_methods in definition) = 0 THEN
    RAISE EXCEPTION 'Expected payment-method allowlist was not found; no payment restriction was changed.';
  END IF;
  definition := replace(
    definition,
    old_methods,
    $replace$IF p_payment_method NOT IN ('cash_on_pickup','online') THEN RAISE EXCEPTION 'Invalid payment method. Cash on delivery is not available.'; END IF;$replace$
  );

  old_delivery_rule := $find$IF p_order_type='ONLINE DELIVERY' AND p_payment_method NOT IN ('cash_on_delivery','online') THEN RAISE EXCEPTION 'Please choose Cash on delivery.'; END IF;$find$;
  IF position(old_delivery_rule in definition) = 0 THEN
    RAISE EXCEPTION 'Expected online-delivery payment rule was not found; no payment restriction was changed.';
  END IF;
  definition := replace(
    definition,
    old_delivery_rule,
    $replace$IF p_order_type='ONLINE DELIVERY' AND p_payment_method <> 'online' THEN RAISE EXCEPTION 'Online delivery requires online payment. Cash on delivery is not available.'; END IF;$replace$
  );

  EXECUTE definition;
END;
$migration$;