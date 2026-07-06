## Full SQL file + step-by-step database setup guide

Aap already sab kuch hai project me — bas kaha kya hai wo confirm karke ek clean summary de raha hu. Koi naya code change nahi hoga is turn me (agar aap approve karo to sirf ek chhoti si docs update).

---

### 1. Full SQL file kaha hai

**File path:** `database.sql` (project root me, `config.ts` ke saath)

Ye ek hi file me **sab kuch** hai (309 lines, idempotent — dobara run karne se kuch nahi tootega):

| Section | Kya banata hai |
|---|---|
| `admin_emails` table | Admin email whitelist (signup par auto admin role) |
| `profiles` | User ka naam / email |
| `user_roles` + `app_role` enum + `has_role()` | Role system (admin / user) |
| `app_settings` (singleton) | Search price + support phone / WhatsApp / email |
| `wallets` | Har user ka balance |
| `wallet_transactions` | Credit / debit / refund history |
| `pan_searches` | PAN search records (sirf Aadhaar last 4 store hota hai) |
| `handle_new_user()` trigger | Signup par profile + wallet + role auto-create |
| **RPCs (server-authoritative)** | `debit_wallet_for_search`, `finalize_search`, `admin_credit_wallet`, `admin_update_settings`, `admin_find_user`, `admin_force_refund_search` |
| RLS policies + GRANTs | Har table par |

**PAN Finder edge function** SQL me nahi hoti — wo alag file hai: `supabase/functions/pan-find/index.ts` (Step 6 me deploy hoti hai).

---

### 2. Step-by-step database setup (buyer ke liye)

**Step 1 — Supabase project banao**
- https://supabase.com → Sign up → **New project**
- Password + region choose karo → 1–2 min wait

**Step 2 — `config.ts` edit karo** (project root me)
```ts
export const APP_CONFIG = {
  SUPABASE_URL: "https://YOUR-REF.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGc...",
  ADMIN_EMAIL: "youremail@example.com",   // ye email admin ban jayegi
  DEFAULT_SEARCH_PRICE: 2,
};
```
Values Supabase → **Project Settings → API** se milengi.

**Step 3 — Admin email `database.sql` me set karo**
File open karo, line ~20 dhundo:
```sql
insert into public.admin_emails(email) values ('admin@example.com')
```
`admin@example.com` ki jagah wahi email daalo jo `config.ts` me `ADMIN_EMAIL` me daali thi.

**Step 4 — SQL run karo**
- Supabase dashboard → **SQL Editor** → **+ New query**
- `database.sql` ka **pura content** copy → paste → **Run** (Ctrl+Enter)
- Green message: *"Success. No rows returned."*
- Verify: **Table Editor** me `profiles`, `wallets`, `pan_searches`, `wallet_transactions`, `app_settings`, `admin_emails`, `user_roles` — 7 tables dikhengi

**Step 5 — App chalao & admin banao**
- `bun install && bun run dev`
- `/register` → wahi email use karo jo admin set kiya
- Login karte hi sidebar me **Admin** option dikhega

**Step 6 — PAN Finder edge function deploy karo** (one-time)
- Supabase → **Edge Functions → Manage secrets** → 2 secrets add karo:
  - `PAN_API_KEY` = PanManager AI ka x-api-key
  - `PAN_API_SECRET` = x-api-secret
- Terminal me:
  ```bash
  npm install -g supabase
  supabase login
  supabase link --project-ref YOUR-REF
  supabase functions deploy pan-find
  ```

**Step 7 — Test**
- Admin → Users & Wallets → apne user ko ₹100 credit karo
- Admin → Settings → search price set karo (e.g. ₹2 ya ₹70)
- PAN Finder → 12-digit Aadhaar → Search
- Success → PAN card + Copy button. Fail → auto refund.

---

### 3. Chhoti si docs improvement (optional — aap approve karo to karunga)

Abhi `SETUP.md` me Step 5 ke baad Step 6.5 hai. Do chhoti additions helpful hongi:
- **Step 5 me clearly likha jaye:** "line 20 par `admin@example.com` ki jagah apni email daalo" (abhi ye Step 5 me nahi, sirf top blockquote me mention hai)
- **Verification checklist:** SQL run ke baad kaunsi 7 tables dikhni chahiye ki list

Ye sirf `SETUP.md` me 15-20 line ka addition hoga — koi code / SQL change nahi.

---

Confirm karo:
- **"OK, docs update kar do"** → main `SETUP.md` me ye 2 additions kar dunga
- **"Bas summary chahiye thi, kuch mat karo"** → koi file touch nahi hogi, ye plan hi aapka reference hai