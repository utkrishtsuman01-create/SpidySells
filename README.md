# Spidy Sells

Mobile-first storefront for Spidy Sells, a Kolkata dessert business. Visual identity uses the supplied cream/chocolate/gold direction. The uploaded logo is a raster artwork in chat; add the original image file to `public/spidy-sells-logo.png` after uploading it to the repo. Until then, the header uses a simple chef-hat wordmark rather than pretending it is the original logo.

## Current status
- Customer journey: location choice, takeaway selection, menu, bag, checkout, WhatsApp click-to-chat.
- Classic Tiramisu is the only initial provisional menu item at ₹130.
- More-coming-soon location is disabled.
- WhatsApp destination defaults to +91 8910882074.
- Database migration defines branches, products, settings, orders, order items, status history, audit events and an admin allowlist.
- **Important:** do not launch accepting real orders until Supabase migration is applied and the customer ordering RPC is integrated/tested. The current simple storefront fallback does not persist orders; do not treat a WhatsApp click as an order confirmation.

## Run locally
```bash
npm install
npm run dev
``

## Supabase setup
1. Create/open the Supabase project and run `supabase/migrations/202610230001_spidy_sells.sql` in SQL Editor.
2. Add Vite environment variables in Lovable/Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (the publishable/anon key only; never put service-role keys in the browser).
3. Create the first admin account through Supabase Auth, then insert its user UUID into `public.admin_users` using the SQL editor as project owner:
   `insert into public.admin_users(user_id) values ('AUTH_USER_UUID');`
   There is no public admin registration.
4. Add the verified Kolkata branch address and upload product images before publishing the live menu. Delivery is disabled by default until availability/fees are verified.
5. Create a Supabase Storage bucket for product images and add restricted policies before enabling admin uploads.
6. Test all flows in a non-production environment before accepting real customers.

## Security notes
RLS protects customer order records. Public users may read only active branches, published/available products and public business settings. Customer order creation should go through the price-validating RPC. Admin status transitions and destructive reset should be implemented as audited server-side operations before enabling those controls. Never ship a service-role key or an admin password in frontend code.

## Business details still needed
- Verified Kolkata branch name/address and pickup instructions.
- Confirmed menu/product photos and final menu pricing.
- Whether delivery is offered, eligible areas and exact delivery charge.
- Approved customer-facing business hours.
