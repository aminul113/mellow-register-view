## Issue

Error: `Could not find the function public.create_payment_order(_amount) in the schema cache`

Vercel env vars sahi hain — problem alag hai. Aapke Supabase database mein ye 2 functions aur `payment_orders` table abhi tak create nahi hui:
- `public.create_payment_order(_amount numeric)`
- `public.mark_payment_failed(_order_id, _raw)`
- `public.payment_orders` table (RLS + grants ke saath)

Ye SQL `database.sql` file mein already likhi hui hai, bas Supabase par run nahi hui.

## Fix (2 options — same result)

### Option A — Supabase SQL Editor (manual, 30 sec)
1. Supabase Dashboard → SQL Editor → New Query
2. Project ki `database.sql` file ka **payment section** paste karein (table + RPCs + grants + RLS)
3. Run → success

### Option B — Migration tool (recommended)
Main `payment_orders` table + dono RPC functions ek migration ke through create kar dunga. Isse aap ek click mein approve karke apply kar sakte ho, koi manual copy-paste nahi.

Migration mein hoga:
- `CREATE TABLE public.payment_orders` (id, user_id, order_id unique, amount, status, provider_order_id, raw jsonb, timestamps)
- GRANTs: `authenticated` (select/insert/update), `service_role` (all)
- RLS ON + policy: user apni orders dekh sake
- `create_payment_order(_amount numeric)` — security definer, returns `order_id`
- `mark_payment_failed(_order_id text, _raw jsonb)` — security definer
- `credit_wallet_from_order(_order_id text)` — callback verify ke baad wallet credit (idempotent)

Iske baad "Add Money → Pay Now" turant chal jayega, aur wallet realtime credit hoga.

## Recommendation
**Option B** — main migration bana deta hoon, aap approve karo, done.

Approve karein toh proceed karun?
