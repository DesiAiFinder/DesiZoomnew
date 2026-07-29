-- ── Fulfillment options ───────────────────────────────────────────────────────
-- Businesses choose how customers get their order:
--   pickup   — customer collects (default, existing behaviour)
--   delivery — the BUSINESS delivers itself within its own radius (not us)
--   shipping — mailed anywhere (e.g. homemade pickles, sweets, dry goods)
--
-- Delivery/shipping fees go 100% to the business; our commission stays on the
-- item subtotal only. Safe to run more than once.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['businesses', 'restaurants'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('
        ALTER TABLE public.%I
          ADD COLUMN IF NOT EXISTS offers_pickup          boolean DEFAULT true,
          ADD COLUMN IF NOT EXISTS offers_delivery        boolean DEFAULT false,
          ADD COLUMN IF NOT EXISTS offers_shipping        boolean DEFAULT false,
          ADD COLUMN IF NOT EXISTS delivery_fee_cents     integer DEFAULT 0,
          ADD COLUMN IF NOT EXISTS delivery_minimum_cents integer DEFAULT 0,
          ADD COLUMN IF NOT EXISTS delivery_radius_miles  integer DEFAULT 10,
          ADD COLUMN IF NOT EXISTS shipping_fee_cents     integer DEFAULT 0,
          ADD COLUMN IF NOT EXISTS delivery_note          text', t);
      RAISE NOTICE 'fulfillment columns added to %', t;
    END IF;
  END LOOP;
END $$;

-- Orders record which method the customer chose
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_type   text DEFAULT 'pickup', -- pickup | delivery | shipping
  ADD COLUMN IF NOT EXISTS delivery_address   text,
  ADD COLUMN IF NOT EXISTS delivery_fee_cents integer DEFAULT 0;

-- Existing restaurants keep working as pickup-only
UPDATE public.restaurants SET offers_pickup = true WHERE offers_pickup IS NULL;
UPDATE public.businesses  SET offers_pickup = true WHERE offers_pickup IS NULL;

SELECT
  (select count(*) from public.restaurants where offers_delivery) as restaurants_with_delivery,
  (select count(*) from public.businesses  where offers_shipping) as businesses_with_shipping;
