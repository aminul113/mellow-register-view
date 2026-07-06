# Vercel Deployment — Click-by-Click Guide

Ye guide buyer (ya khud) ke liye hai. Har step Vercel dashboard pe kya click karna hai — clear tarike se likha hai.

---

## PART 1: Project Deploy karna (pehli baar)

1. **vercel.com** khol → **Log in** (GitHub se recommended)
2. Top-right **"Add New..."** → **"Project"** click
3. **"Import Git Repository"** → apna GitHub repo select → **Import**
4. **Configure Project** screen:
   - **Framework Preset**: `Vite` (auto-detect)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
5. **"Environment Variables"** section expand karo (niche PART 2 dekh)
6. Sab variables add karne ke baad → **"Deploy"**
7. 2-3 minute wait → URL milega jaise `your-app.vercel.app`

---

## PART 2: Environment Variables (sabse zaroori)

Deploy ke time ya baad: **Project → Settings → Environment Variables**

Har variable ke liye:
- **Key** me naam
- **Value** me value paste
- **Environments**: teeno tick (`Production`, `Preview`, `Development`)
- **Save**

### A) Supabase (Frontend — public, `VITE_` prefix ke saath)

| Key | Value kahan se milega |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API → `anon` `public` key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase URL ka subdomain (`abcd1234` from `abcd1234.supabase.co`) |

### B) PAN API (Server-side — `VITE_` NAHI)

| Key | Value |
|---|---|
| `PAN_API_KEY` | PAN provider ka API key |

### C) Payment Gateway (Server-side — `VITE_` NAHI)

| Key | Value |
|---|---|
| `PAYMENT_API_URL` | `https://pay.rapidxservices.in` (ya jo provider ho) |
| `PAYMENT_USER_TOKEN` | Provider dashboard → Developers → User Token |
| `PAYMENT_API_SECRET` | (Optional) Signature verify ke liye, agar provider de |

### D) Supabase Service Role (Optional — sirf webhook/callback ke liye)

| Key | Value |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` `secret` key ⚠️ (kabhi share mat karo) |
| `SUPABASE_URL` | Same as `VITE_SUPABASE_URL` |

---

## PART 3: Env variables ke baad Redeploy

⚠️ Env vars add karne ke baad automatically redeploy nahi hota.

1. **Deployments** tab
2. Latest deployment ke right side pe **"..."** (three dots)
3. **"Redeploy"**
4. Popup me **"Use existing Build Cache"** UNTICK karo
5. **Redeploy** button

---

## PART 4: RapidX (Payment Provider) me Redirect URL set

1. **pay.rapidxservices.in** → Login
2. **Developers** / **API Settings**
3. **Callback URL** / **Redirect URL**:
   ```
   https://your-app.vercel.app/app/payment-return
   ```
4. **Webhook URL** (agar option ho):
   ```
   https://your-app.vercel.app/api/public/payment-callback
   ```
5. **Save**

---

## PART 5: Supabase me Vercel URL whitelist

1. Supabase → **Authentication** → **URL Configuration**
2. **Site URL**: `https://your-app.vercel.app`
3. **Redirect URLs** add:
   - `https://your-app.vercel.app/**`
   - `https://your-app.vercel.app/app/payment-return`
4. **Save**

---

## PART 6: Database SQL run (ek baar)

1. Supabase → **SQL Editor**
2. Project ka `database.sql` ka pura content copy
3. Paste → **Run**
4. `payment_orders` table + RPCs create ho jayenge

---

## PART 7: Test

1. Vercel URL open → Sign up / Login
2. **Wallet** → **Add Money** → amount → **Pay Now**
3. Provider page khulega → payment complete karo
4. Wapas `/app/payment-return` pe redirect
5. 5-10 sec me wallet credit

---

## Custom Domain (Optional)

1. Vercel → Project → **Settings** → **Domains**
2. **Add** → domain daalo (e.g. `myapp.com`)
3. Vercel ke DNS records apne domain registrar (GoDaddy/Namecheap) me add karo
4. 5-30 min me active
5. PART 4 & PART 5 me URLs custom domain se update kar dena

---

## Quick Checklist

- [ ] Vercel pe project import
- [ ] Saare env vars add (`VITE_` vs non-`VITE_` dhyan)
- [ ] Redeploy done
- [ ] Supabase me SQL run
- [ ] Supabase Auth me Vercel URL whitelist
- [ ] Payment provider dashboard me redirect URL set
- [ ] Test payment successful

---

## Netlify / Cloudflare Pages users

Same env vars, sirf dashboard alag. `VITE_` prefix rule same rehta hai (server-side keys me `VITE_` NAHI).