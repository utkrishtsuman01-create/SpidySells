DO $migration$
DECLARE
  definition text;
  old_block text;
BEGIN
  definition := pg_get_functiondef(
    'public.create_customer_order(text,text,text,text,uuid,text,jsonb,numeric,numeric,text)'::regprocedure
  );

  old_block := $find$IF p_payment_method='online' THEN RAISE EXCEPTION 'Online payment is not available yet. Please choose the available cash payment option.'; END IF;$find$;
  IF position(old_block in definition) = 0 THEN
    RAISE EXCEPTION 'Expected online-payment guard was not found; no function change was made.';
  END IF;
  definition := replace(definition, old_block, '');

  old_block := $find$IF p_order_type='TAKEAWAY' AND p_payment_method<>'cash_on_pickup' THEN$find$;
  IF position(old_block in definition) = 0 THEN
    RAISE EXCEPTION 'Expected takeaway payment validation was not found; no function change was made.';
  END IF;
  definition := replace(
    definition,
    old_block,
    $replacement$IF p_order_type='TAKEAWAY' AND p_payment_method NOT IN ('cash_on_pickup','online') THEN$replacement$
  );

  old_block := $find$IF p_order_type='ONLINE DELIVERY' AND p_payment_method<>'cash_on_delivery' THEN$find$;
  IF position(old_block in definition) = 0 THEN
    RAISE EXCEPTION 'Expected delivery payment validation was not found; no function change was made.';
  END IF;
  definition := replace(
    definition,
    old_block,
    $replacement$IF p_order_type='ONLINE DELIVERY' AND p_payment_method NOT IN ('cash_on_delivery','online') THEN$replacement$
  );

  old_block := $find$v_subtotal,v_delivery,p_delivery_distance_km,v_subtotal+v_delivery,'confirmed',p_payment_method,'pending'$find$;
  IF position(old_block in definition) = 0 THEN
    RAISE EXCEPTION 'Expected order insert status fields were not found; no function change was made.';
  END IF;
  definition := replace(
    definition,
    old_block,
    $replacement$v_subtotal,v_delivery,p_delivery_distance_km,v_subtotal+v_delivery,CASE WHEN p_payment_method='online' THEN 'pending' ELSE 'confirmed' END,p_payment_method,'pending'$replacement$
  );

  old_block := $find$VALUES(v_order.id,NULL,'confirmed');$find$;
  IF position(old_block in definition) = 0 THEN
    RAISE EXCEPTION 'Expected status history insert was not found; no function change was made.';
  END IF;
  definition := replace(definition, old_block, $replacement$VALUES(v_order.id,NULL,v_order.status);$replacement$);

  IF position('Online payment is not available yet' in definition) > 0
     OR position($check$p_payment_method NOT IN ('cash_on_pickup','online')$check$ in definition) = 0
     OR position($check$p_payment_method NOT IN ('cash_on_delivery','online')$check$ in definition) = 0
     OR position($check$CASE WHEN p_payment_method='online' THEN 'pending' ELSE 'confirmed' END$check$ in definition) = 0 THEN
    RAISE EXCEPTION 'Online payment function verification failed; no function change was made.';
  END IF;

  EXECUTE definition;
END
$migration$;