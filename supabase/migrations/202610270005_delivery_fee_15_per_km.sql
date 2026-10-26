-- Keep server-side order validation in sync with the ₹15/km delivery fee.
CREATE OR REPLACE FUNCTION public.create_customer_order(p_order_type text, p_customer_name text, p_customer_phone text, p_delivery_address text, p_branch_id uuid, p_notes text, p_items jsonb, p_delivery_distance_km numeric, p_delivery_charge numeric DEFAULT 0, p_payment_method text DEFAULT 'online'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%rowtype;
  v_subtotal numeric(10,2):=0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_branch public.branches%rowtype;
  v_delivery numeric(10,2):=0;
  v_expected_delivery numeric(10,2):=0;
BEGIN
  IF p_order_type NOT IN ('TAKEAWAY','ONLINE DELIVERY') THEN RAISE EXCEPTION 'Invalid order type'; END IF;
  IF length(trim(coalesce(p_customer_name,'')))<1 OR length(trim(coalesce(p_customer_phone,'')))<8 THEN RAISE EXCEPTION 'Name and valid phone are required'; END IF;
  IF p_order_type='ONLINE DELIVERY' AND length(trim(coalesce(p_delivery_address,'')))<5 THEN RAISE EXCEPTION 'Delivery address is required'; END IF;
  IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'Cart is empty'; END IF;
  IF p_payment_method NOT IN ('cash_on_pickup','online') THEN RAISE EXCEPTION 'Invalid payment method. Cash on delivery is not available.'; END IF;
  IF p_order_type='TAKEAWAY' AND p_payment_method NOT IN ('cash_on_pickup','online') THEN RAISE EXCEPTION 'Please choose Pay at takeaway.'; END IF;
  IF p_order_type='ONLINE DELIVERY' AND p_payment_method <> 'online' THEN RAISE EXCEPTION 'Online delivery requires online payment. Cash on delivery is not available.'; END IF;

  IF p_branch_id IS NULL THEN RAISE EXCEPTION 'Please select your store location'; END IF;
  SELECT * INTO v_branch FROM public.branches WHERE id=p_branch_id AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Selected store location is unavailable'; END IF;
  IF p_order_type='TAKEAWAY' AND NOT v_branch.takeaway_enabled THEN RAISE EXCEPTION 'Takeaway is not available at this location'; END IF;
  IF p_order_type='ONLINE DELIVERY' AND NOT v_branch.delivery_enabled THEN RAISE EXCEPTION 'Delivery is not available at this location'; END IF;

  IF p_order_type='ONLINE DELIVERY' THEN
    IF NOT EXISTS(SELECT 1 FROM public.business_settings WHERE delivery_enabled) THEN RAISE EXCEPTION 'Online delivery is not configured'; END IF;
    IF p_delivery_distance_km IS NULL OR p_delivery_distance_km < 0 THEN RAISE EXCEPTION 'A valid driving distance is required'; END IF;
    -- ₹15 per km, rounded up to the nearest whole rupee (same rule as the Edge Function).
    v_expected_delivery := CEIL(p_delivery_distance_km * 15);
    IF coalesce(p_delivery_charge,-1) <> v_expected_delivery THEN RAISE EXCEPTION 'Delivery charge does not match the driving distance'; END IF;
    v_delivery := v_expected_delivery;
  ELSE
    v_delivery := 0;
    p_delivery_distance_km := NULL;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'quantity')::integer;
    IF v_qty < 1 OR v_qty > 50 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    SELECT * INTO v_product FROM public.products WHERE id=(v_item->>'product_id')::uuid AND published AND available;
    IF NOT FOUND THEN RAISE EXCEPTION 'A product is no longer available'; END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM public.branch_product_stock bps
      WHERE bps.product_id = v_product.id
        AND bps.branch_id = p_branch_id
        AND bps.status = 'in_stock'
    ) THEN
      RAISE EXCEPTION 'Product "%" is out of stock at this location. Please check other location to order.', v_product.name;
    END IF;
    v_subtotal := v_subtotal + (v_product.price * v_qty);
  END LOOP;

  INSERT INTO public.orders(
    order_type,customer_name,customer_phone,delivery_address,branch_id,branch_name_snapshot,notes,
    subtotal,delivery_charge,delivery_distance_km,total,status,payment_method,payment_status
  )
  VALUES(
    p_order_type,trim(p_customer_name),trim(p_customer_phone),
    CASE WHEN p_order_type='ONLINE DELIVERY' THEN trim(p_delivery_address) ELSE NULL END,
    p_branch_id,v_branch.name,nullif(trim(coalesce(p_notes,'')),''),
    v_subtotal,v_delivery,p_delivery_distance_km,v_subtotal+v_delivery,CASE WHEN p_payment_method='online' THEN 'pending' ELSE 'confirmed' END,p_payment_method,'pending'
  )
  RETURNING * INTO v_order;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'quantity')::integer;
    SELECT * INTO v_product FROM public.products WHERE id=(v_item->>'product_id')::uuid;
    INSERT INTO public.order_items(order_id,product_id,product_name_snapshot,quantity,unit_price,line_total)
    VALUES(v_order.id,v_product.id,v_product.name,v_qty,v_product.price,v_product.price*v_qty);
  END LOOP;

  INSERT INTO public.order_status_history(order_id,old_status,new_status) VALUES(v_order.id,NULL,v_order.status);

  RETURN jsonb_build_object(
    'id',v_order.id,
    'order_reference',v_order.order_reference,
    'order_type',v_order.order_type,
    'customer_name',v_order.customer_name,
    'customer_phone',v_order.customer_phone,
    'delivery_address',v_order.delivery_address,
    'branch_name',v_order.branch_name_snapshot,
    'notes',v_order.notes,
    'subtotal',v_order.subtotal,
    'delivery_charge',v_order.delivery_charge,
    'delivery_distance_km',v_order.delivery_distance_km,
    'total',v_order.total,
    'status',v_order.status,
    'payment_method',v_order.payment_method,
    'payment_status',v_order.payment_status,
    'created_at',v_order.created_at,
    'items',(SELECT coalesce(jsonb_agg(jsonb_build_object(
       'product_name_snapshot',oi.product_name_snapshot,
       'quantity',oi.quantity,
       'unit_price',oi.unit_price,
       'line_total',oi.line_total
    ) ORDER BY oi.id),'[]'::jsonb) FROM public.order_items oi WHERE oi.order_id=v_order.id)
  );
END;
$function$
