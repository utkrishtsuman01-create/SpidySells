-- Branch-specific product stock status. Missing mappings default to in-stock via row-seeding triggers.
CREATE TABLE IF NOT EXISTS public.branch_product_stock (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'out_of_stock')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, branch_id)
);

ALTER TABLE public.branch_product_stock ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.branch_product_stock FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.branch_product_stock TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.branch_product_stock TO authenticated;

DROP POLICY IF EXISTS "Public reads stock for active published products" ON public.branch_product_stock;
DROP POLICY IF EXISTS "Admins read all branch product stock" ON public.branch_product_stock;
DROP POLICY IF EXISTS "Admins manage branch product stock" ON public.branch_product_stock;

CREATE POLICY "Public reads stock for active published products"
  ON public.branch_product_stock
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = branch_id AND b.active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND p.published = true AND p.available = true
    )
  );

CREATE POLICY "Admins read all branch product stock"
  ON public.branch_product_stock
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_spidy_admin()));

CREATE POLICY "Admins manage branch product stock"
  ON public.branch_product_stock
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_spidy_admin()))
  WITH CHECK ((SELECT public.is_spidy_admin()));

-- New products get a stock setting for every existing branch.
CREATE OR REPLACE FUNCTION public.seed_branch_product_stock_for_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  INSERT INTO public.branch_product_stock (product_id, branch_id)
  SELECT NEW.id, b.id
  FROM public.branches b
  ON CONFLICT (product_id, branch_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- New branches get stock settings for every existing product.
CREATE OR REPLACE FUNCTION public.seed_branch_product_stock_for_branch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  INSERT INTO public.branch_product_stock (product_id, branch_id)
  SELECT p.id, NEW.id
  FROM public.products p
  ON CONFLICT (product_id, branch_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.seed_branch_product_stock_for_product() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.seed_branch_product_stock_for_branch() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS seed_branch_stock_after_product_insert ON public.products;
CREATE TRIGGER seed_branch_stock_after_product_insert
AFTER INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.seed_branch_product_stock_for_product();

DROP TRIGGER IF EXISTS seed_product_stock_after_branch_insert ON public.branches;
CREATE TRIGGER seed_product_stock_after_branch_insert
AFTER INSERT ON public.branches
FOR EACH ROW EXECUTE FUNCTION public.seed_branch_product_stock_for_branch();

-- Backfill all existing product/branch combinations as in-stock without changing existing choices.
INSERT INTO public.branch_product_stock (product_id, branch_id)
SELECT p.id, b.id
FROM public.products p
CROSS JOIN public.branches b
ON CONFLICT (product_id, branch_id) DO NOTHING;

-- Enforce branch-level stock inside the trusted order RPC too, so a stale cart cannot bypass the UI.
DO $migration$
DECLARE
  definition text;
  old_block text;
  replacement_block text;
BEGIN
  definition := pg_get_functiondef(
    'public.create_customer_order(text,text,text,text,uuid,text,jsonb,numeric,numeric,text)'::regprocedure
  );

  old_block := $find$SELECT * INTO v_product FROM public.products WHERE id=(v_item->>'product_id')::uuid AND published AND available;
    IF NOT FOUND THEN RAISE EXCEPTION 'A product is no longer available'; END IF;$find$;

  IF position(old_block in definition) = 0 THEN
    RAISE EXCEPTION 'Expected product availability validation was not found; no stock enforcement change was made.';
  END IF;

  replacement_block := $replacement$SELECT * INTO v_product FROM public.products WHERE id=(v_item->>'product_id')::uuid AND published AND available;
    IF NOT FOUND THEN RAISE EXCEPTION 'A product is no longer available'; END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM public.branch_product_stock bps
      WHERE bps.product_id = v_product.id
        AND bps.branch_id = p_branch_id
        AND bps.status = 'in_stock'
    ) THEN
      RAISE EXCEPTION 'Product "%" is out of stock at this location. Please check other location to order.', v_product.name;
    END IF;$replacement$;

  definition := replace(definition, old_block, replacement_block);
  EXECUTE definition;
END;
$migration$;
