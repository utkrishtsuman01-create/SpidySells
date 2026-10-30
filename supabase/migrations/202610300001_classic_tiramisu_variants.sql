-- Add server-validated size pricing for the existing Classic Tiramisu product.
-- 300 ml remains ₹130; 200 ml is ₹99. The storefront sends variant_ml with the product ID.
DO $migration$
DECLARE
  definition text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'create_customer_order'
    AND pg_get_function_identity_arguments(p.oid) = 'p_order_type text, p_customer_name text, p_customer_phone text, p_delivery_address text, p_branch_id uuid, p_notes text, p_items jsonb, p_delivery_distance_km numeric, p_delivery_charge numeric, p_payment_method text';

  IF definition IS NULL THEN
    RAISE EXCEPTION 'Target order function not found';
  END IF;

  IF position('variant_ml' in definition) = 0 THEN
    definition := replace(definition, '  v_qty integer;', '  v_qty integer;' || chr(10) || '  v_unit_price numeric(10,2);');
    definition := replace(definition, '    v_subtotal := v_subtotal + (v_product.price * v_qty);', $variant$
    IF v_product.id = '11111111-1111-4111-8111-111111111111'::uuid THEN
      IF coalesce(v_item->>'variant_ml','300') NOT IN ('200','300') THEN RAISE EXCEPTION 'Please select a valid Classic Tiramisu size'; END IF;
      v_unit_price := CASE WHEN coalesce(v_item->>'variant_ml','300') = '200' THEN 99.00 ELSE 130.00 END;
    ELSE
      IF v_item ? 'variant_ml' THEN RAISE EXCEPTION 'Invalid product variant'; END IF;
      v_unit_price := v_product.price;
    END IF;
    v_subtotal := v_subtotal + (v_unit_price * v_qty);$variant$);
    definition := replace(definition, '    INSERT INTO public.order_items(order_id,product_id,product_name_snapshot,quantity,unit_price,line_total)' || chr(10) || '    VALUES(v_order.id,v_product.id,v_product.name,v_qty,v_product.price,v_product.price*v_qty);', $variant$
    IF v_product.id = '11111111-1111-4111-8111-111111111111'::uuid THEN
      v_unit_price := CASE WHEN coalesce(v_item->>'variant_ml','300') = '200' THEN 99.00 ELSE 130.00 END;
      INSERT INTO public.order_items(order_id,product_id,product_name_snapshot,quantity,unit_price,line_total)
      VALUES(v_order.id,v_product.id,v_product.name || ' (' || coalesce(v_item->>'variant_ml','300') || ' ml)',v_qty,v_unit_price,v_unit_price*v_qty);
    ELSE
      INSERT INTO public.order_items(order_id,product_id,product_name_snapshot,quantity,unit_price,line_total)
      VALUES(v_order.id,v_product.id,v_product.name,v_qty,v_product.price,v_product.price*v_qty);
    END IF;$variant$);
    IF position('variant_ml' in definition) = 0 THEN
      RAISE EXCEPTION 'Variant logic insertion failed';
    END IF;
    EXECUTE definition;
  END IF;
END
$migration$;
