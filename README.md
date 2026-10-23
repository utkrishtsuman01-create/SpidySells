# Spidy Sells

A mobile-first dessert storefront and owner dashboard for Spidy Sells, styled around the supplied cream, chocolate-brown and gold brand direction.

## Implemented in the repository

- Storefront: location selection, takeaway/delivery choice, live menu from Supabase, product cards, bag, quantities and checkout.
- Orders: price-validated server-side order creation through a Postgres RPC; order inquiry saved before WhatsApp is opened.
- Owner area: Supabase Auth login, orders dashboard, conversion statuses, completed-sales calculation, product and branch CRUD, store settings, password change and explicitly confirmed order reset.
- Security foundation: Row Level Security, administrator allowlist, order status history and audit events.
- Initial seed: Classic Tiramisu at ₹130, provisional until the owner confirms the actual menu and price.

## Stack

- React + Vite
- Supabase Auth + Postgres (database and authorization)
- Lucide icons
- Vercel deployment

## Local development

```bash
npm install
npm run dev
```

## Required Supabase setup

1. Open the Supabase project intended for Spidy Sells.
2. Run these SQL files in order in the Supabase SQL Editor:
   - `supabase/migrations/202610230001_spidy_sells.sql`
   - `supabase/migrations/202610230002_seed_menu_and_admin_reset.sql`
3. In Supabase Authentication, create the owner's user account. Do not enable public sign-up.
4. Copy that user's UUID from Authentication → Users, then run as the project owner:
   ```sql
   insert into public.admin_users(user_id) values ('AUTH_USER_UUID');
   ```
   Replace the placeholder with the actual UUID. Never share the owner's password or place it in source code.
5. Configure Vercel environment variables for both Preview and Production:
   - `VITE_SUPABASE_URL` = Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = Supabase anon/publishable key
6. Redeploy after adding environment variables.
7. In the owner dashboard, add the verified branch address and check WhatsApp number, menu, pickup instructions and delivery settings.

**Never** put a Supabase service-role key in a Vite `VITE_*` variable or browser code.

## Live launch checklist

The Vercel build can serve the frontend, but the app is not production-ready until the Supabase project and Vercel environment variables are configured and tested together.

- [ ] Apply both migrations in order.
- [ ] Create the owner account and allowlist its UUID.
- [ ] Add the Supabase URL and anon/publishable key to Vercel Preview and Production.
- [ ] Add a real branch name, address, contact details and pickup instructions.
- [ ] Confirm the WhatsApp destination is the business's correct number.
- [ ] Confirm the menu, prices and product photos.
- [ ] Test a small order end-to-end and verify that it is saved once, WhatsApp opens with the correct reference, and the admin can update conversion status.
- [ ] Test product/branch editing, password change and order reset using non-production test data first.
- [ ] Verify that the public storefront loads without a Vercel login/protection screen before sharing it with customers.

## Business details that remain owner-confirmation items

- Verified Kolkata branch name and address.
- Final menu, prices and product photos.
- Delivery coverage, availability and charge.
- Pickup instructions and business hours.

Do not treat a WhatsApp inquiry as a confirmed order or as a completed sale. Completed-sales totals only include orders manually marked `completed` in the admin dashboard.
