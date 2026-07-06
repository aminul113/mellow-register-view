# PANME SHOP — Setup Guide

Buyer ke liye complete step-by-step guide. **4 hosting options** available:

- **A. GitHub Codespaces** (browser me sab kuch, kuch install nahi)
- **B. Vercel** (1-click deploy)
- **C. Netlify** (1-click deploy)
- **D. Hostinger / cPanel / shared hosting** (static upload)

Sabhi ke liye pehle **Supabase setup (Step 3 + Step 5)** karna hai — wo common hai.

---

## 🎯 Hosting Quick Guides (choose one, after Supabase setup)

### A. GitHub Codespaces (easiest — no install)

1. Repo fork karo (GitHub → **Fork**).
2. Fork me → **Code → Codespaces → Create codespace on main**.
3. 1-2 min me VS Code browser me khul jayega. Terminal apne aap `bun install` chalayega.
4. Left me `config.ts` kholo → Supabase URL + anon key + admin email paste → **Ctrl+S**.
5. Terminal me: `bun run dev` → forwarded port 8080 pe app khul jayega.
6. Changes commit: **Source Control** tab → message likho → **Commit & Push**.

### B. Vercel (1-click)

1. README ka **Deploy to Vercel** button click.
2. Repo import ka option → apne fork ka URL do.
3. Env vars maango to sirf ye 3 daalo:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_EMAIL`
4. **Deploy**. 2 min me live URL mil jayega.

> `PAN_API_KEY` / `PAN_API_SECRET` Vercel env vars me mat daalo. Wo sirf
> Supabase → Edge Functions → Secrets me jayenge (Step 6.5).

> ⚠️ **Admin Panel dikhne ke liye** (Vercel/Netlify/Cloudflare — sab ke liye same):
> Env var `VITE_ADMIN_EMAIL` sirf frontend fallback hai. Real admin role
> Supabase DB me `admin_emails` table + `user_roles` se decide hoti hai.
> Deploy ke baad Supabase → SQL Editor me ye chalao (email apna daalo):
>
> ```sql
> insert into public.admin_emails(email) values ('YOUR-EMAIL@example.com')
>   on conflict do nothing;
> insert into public.user_roles(user_id, role)
> select u.id, 'admin'::public.app_role
> from auth.users u
> where lower(u.email) = lower('YOUR-EMAIL@example.com')
> on conflict (user_id, role) do nothing;
> ```
>
> Ya seedhe pura `database.sql` dobara run kar do — file ke end me ek
> self-heal block hai jo automatically har `admin_emails` wale user ko admin
> role de deta hai. Fir app me **logout → login** karo, sidebar me
> "Admin Panel" aa jayega.

### C. Netlify (1-click)

1. README ka **Deploy to Netlify** button click.
2. GitHub authorize → repo pick.
3. Site settings → **Environment variables** me wahi 3 env vars daalo.
4. **Trigger deploy → Clear cache & deploy site**. `netlify.toml` build + SPA redirect already handle karta hai.

### D. Hostinger / cPanel / shared hosting

1. Local pe (ya Codespaces me) `config.ts` fill karo.
2. Build karo:
   ```bash
   bun install
   bun run build
   ```
3. `dist/` folder banega. Uska **saara content** (including `.htaccess`) Hostinger File Manager → `public_html/` me upload karo.
4. `public/.htaccess` build ke saath copy ho jata hai — SPA deep-links (jaise `/app/wallet` refresh) chalte hain.
5. Domain pe khol ke test karo.

> **Cloudflare Pages:** Connect repo → Framework preset **None** → Build cmd `bun run build` → Output dir `dist` → Env vars daalo (same 3).

---

## Common Supabase setup

Aapko sirf **2 files** touch karni hain:

1. `config.ts` (ya host pe env vars) — Supabase details
2. `database.sql` — Supabase SQL Editor me paste + Run

Bas. Koi coding nahi.

> **Admin banna:** `config.ts` me `ADMIN_EMAIL` set karo AUR `database.sql` ke top me `insert into public.admin_emails(email) values ('admin@example.com')` line me wahi email daalo. Us email se signup karte hi admin role auto-grant ho jayega.
> **Search price:** default ₹2. Admin panel → Settings se change kar sakte ho.
> **Support contacts:** Admin panel → Settings me phone / WhatsApp / email daalo — Support page aur wallet top-up modal me automatic dikhega.
> **Wallet top-up:** Users admin ko contact karenge → admin `Admin → Users & Wallets` se manually credit karega. (Payment gateway phir kabhi add kar sakte hain.)

---

## Step 1 — Requirements

Aapke computer par install hona chahiye:

- **Node.js 18+** or **Bun** (recommended) — https://bun.sh
- Ek code editor jaise VS Code (bas file kholne ke liye)

---

## Step 2 — Install & run

Project folder me terminal kholo aur:

```bash
bun install
bun run dev
```

App khulega `http://localhost:8080` par. Pehli baar aapko ek screen dikhega jo bolega **"Setup required — open config.ts"**. Ye normal hai. Neeche wale steps follow karo.

---

## Step 3 — Supabase project banao (free)

1. https://supabase.com par jao aur **Sign up** karo (Google se login easy hai)
2. **New project** click karo
3. Details bharo:
   - **Project name:** kuch bhi (e.g. `panme-shop`)
   - **Database password:** strong password (kahin note kar lo)
   - **Region:** apne country ke pass ka choose karo
4. **Create new project** — 1–2 minute wait karo project ready hone tak

---

## Step 4 — Config file edit karo

1. Supabase dashboard me apna project khol lo
2. Left sidebar → **Project Settings** (gear icon) → **API**
3. Do values copy karo:
   - **Project URL** (upar box me, `https://xxxxx.supabase.co`)
   - **anon public** key (`Project API keys` section, long string starting with `eyJ...`)

Ab code folder me `config.ts` file kholo. Aapko ye dikhega:

```ts
export const APP_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-PUBLIC-KEY-HERE",
};
```

Placeholder values ki jagah apne real values paste karo:

```ts
export const APP_CONFIG = {
  SUPABASE_URL: "https://abcdxyz12345.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
};
```

**Save** karo (`Ctrl+S` / `Cmd+S`).

---

## Step 5 — Database create karo

Ab tables, users, permissions sab ek script se ban jayenge.

1. Code folder me `database.sql` file kholo
2. **Line ~20** dhundo:
   ```sql
   insert into public.admin_emails(email) values ('admin@example.com')
   ```
   `admin@example.com` ki jagah **wahi email** daalo jo aapne `config.ts` me `ADMIN_EMAIL` me set ki thi. Us email se signup karte hi admin role auto-grant ho jayega.
3. File **save** karo (`Ctrl+S`)
4. Supabase dashboard → left sidebar → **SQL Editor** → **+ New query**
5. `database.sql` ka **saara content copy** karo (Ctrl+A → Ctrl+C) → SQL Editor me paste
6. Right-bottom me **Run** button dabao (ya `Ctrl+Enter`)
7. Green success message aana chahiye: *"Success. No rows returned."*

**Verify karo** — left sidebar → **Table Editor** me ye **7 tables** dikhni chahiye:

| Table | Purpose |
|-------|---------|
| `admin_emails` | Admin email whitelist |
| `profiles` | User name / email |
| `user_roles` | Role assignments (admin / user) |
| `wallets` | Har user ka balance |
| `wallet_transactions` | Credit / debit / refund history |
| `pan_searches` | PAN search records (Aadhaar last 4 only) |
| `app_settings` | Search price + support contacts (singleton) |

Agar koi table missing hai, SQL dobara run karo — script idempotent hai, safe hai.

---

## Step 6 — App chalao

Browser me `http://localhost:8080` refresh karo. Ab register/login screen kholega. Try karo:

1. `/register` → naam, email, password daal ke account banao
2. Supabase dashboard → **Authentication → Users** → aapka user waha dikhega
3. `/login` se wapas login karo → dashboard khulega

**Ho gaya!** App fully working hai aur pura data aapke apne Supabase me store ho raha hai.

---

## Step 6.5 — PAN Finder API setup (2 minutes)

PAN Finder feature ke liye ek Supabase **Edge Function** deploy karni hai. Ye function aapke provider API keys ko secure server-side rakhti hai — browser me kabhi expose nahi hoti.

> Source code sell karne ke liye safe rule: buyer ki PAN provider keys kabhi
> GitHub repo, `config.ts`, `.env`, Vercel, Netlify, ya Cloudflare env vars me
> nahi jayengi. Har buyer apne Supabase project ke Edge Function Secrets me
> khud ki `PAN_API_KEY` / `PAN_API_SECRET` add karega.

### 6.5a — Provider keys add karo (secure, secret)

1. Supabase dashboard → left sidebar → **Edge Functions**
2. Upar right corner → **Manage secrets** (ya `Settings → Edge Functions → Secrets`)
3. **Add new secret** click karke ye do secrets add karo:

| Name | Value |
|------|-------|
| `PAN_API_KEY` | Aapki PanManager AI se mili `x-api-key` |
| `PAN_API_SECRET` | Aapki PanManager AI se mili `x-api-secret` |

> Ye values sirf server par rehti hain. Kabhi bhi `config.ts`, `.env`, Vercel
> env vars, Netlify env vars, Cloudflare env vars, ya code me mat paste karna.
> Secret names exact same hone chahiye: `PAN_API_KEY` and `PAN_API_SECRET`.

### 6.5b — Edge function deploy karo

Ek baar Supabase CLI install karo (agar nahi hai):

```bash
npm install -g supabase
```

Ab project folder me:

```bash
supabase login
supabase link --project-ref <YOUR-PROJECT-REF>
supabase functions deploy pan-find
```

`<YOUR-PROJECT-REF>` = aapke Supabase project URL ka pehla part (jaise `abcdxyz12345` from `https://abcdxyz12345.supabase.co`).

Deploy successful hone par terminal me green message aayega: `Deployed Function pan-find`.

> Agar secrets add karne ke baad bhi error aaye, `supabase functions deploy pan-find`
> dobara chalao. Function aur secrets dono **same Supabase project** me hone chahiye
> jiska URL/key `config.ts` ya hosting env vars me laga hai.

### 6.5b-verify — Safe check (secret value show nahi hoti)

App me admin login → **Admin Panel → Settings → PAN API setup check** →
**Check PAN setup** dabao.

Status ka matlab:

| Status | Matlab | Fix |
|--------|--------|-----|
| `ready` | Function deployed + secrets present | PAN search test karo |
| `missing secrets` | Function hai, par keys missing/wrong name | Edge Function Secrets me exact names add karo |
| `function missing` | `pan-find` deploy nahi hua | `supabase functions deploy pan-find` chalao |
| `unauthorized` | Login/session issue | Logout → login, phir test |
| `error` | Network/provider/config issue | Function logs dekho + same project verify karo |

### 6.5c — Test karo

1. App me login karo
2. Admin panel → **Users & Wallets** → apne user ko kuch balance credit karo (e.g. ₹100)
3. Admin → **Settings** → **Search price** set karo (default ₹2, provider ke hisab se ₹70 bhi rakh sakte ho)
4. **PAN Finder** page kholo → 12-digit Aadhaar enter karo → Search
5. Success ho to PAN card dikhega + Copy button, fail ho to wallet auto-refund

### Kaise kaam karta hai (security summary)

- Aap **12-digit Aadhaar** enter karte ho
- Pehle server par wallet debit hota hai (RPC: `debit_wallet_for_search`) — balance kam hua to API call hi nahi hoti, error dikhta hai
- Fir edge function `pan-find` provider ko call karti hai (keys server par)
- Success → PAN card dikhta hai, no refund
- Fail / not found → server-side atomic refund (RPC: `finalize_search`)
- **Double refund impossible** — RPC pending guard hai, retry safe
- Full Aadhaar kabhi store nahi hoti — sirf last 4 digits DB me
- Provider ke wallet fields (`wallet_balance`, `provider_balance`) client tak nahi jaate

### Stuck pending search?

Agar kabhi network partition ki wajah se koi search `pending` me atak jaye (10+ min), Admin → **All Searches** tab me **Force refund** button dikhega. Safe hai — already-refunded rows par no-op ho jayega.

---

## Step 7 — Deploy (optional)

Apne server / cloud pe host karne ke liye:

```bash
bun run build
```

Ye `dist/` folder banayega. Isko in me se kahin bhi deploy kar sakte ho:

- **Vercel** — https://vercel.com → New Project → repo import → Deploy
- **Netlify** — https://netlify.com → drag-and-drop `dist/` folder
- **Cloudflare Pages** — https://pages.cloudflare.com
- **Apna VPS / cPanel** — `dist/` ka content upload kar do

`config.ts` values build me include ho jati hain, alag se kuch set karne ki zarurat nahi.

---

## Troubleshooting

### "Setup required" screen ja hi nahi raha
- `config.ts` me values save hui hain? File save karke browser hard-refresh (`Ctrl+Shift+R`) karo
- Dev server restart karo (`Ctrl+C` phir `bun run dev`)

### Register par error: "relation profiles does not exist"
- Aapne `database.sql` run nahi kiya. Step 5 dobara karo.

### Register par error: "Invalid API key" / "fetch failed"
- `config.ts` me URL ya anon key galat paste hui hai. Supabase dashboard se dobara copy karo. URL ke end me `/` nahi hona chahiye.

### Users register kar rahe hain but email confirmation aa raha hai
- Supabase → **Authentication → Providers → Email** → **"Confirm email"** toggle OFF karo agar aap instant signup chahte ho.

### Password reset chahiye
- Supabase built-in hai — code me `supabase.auth.resetPasswordForEmail()` use karo.

---

## Files reference

| File | Kya karta hai | Edit karna hai? |
|------|---------------|-----------------|
| `config.ts` | Supabase URL + key | **Yes** — Step 4 |
| `database.sql` | Tables + RLS + triggers | **Copy-paste** — Step 5 |
| `supabase/functions/pan-find/` | PAN provider edge function | **Deploy once** — Step 6.5 |
| `SETUP.md` | Ye guide | No |
| `src/**` | App source code | No |

Koi problem aaye toh `database.sql` ke top se saara SQL dobara Supabase me run kar do — script safe hai, dobara run karne se kuch nahi tootega.