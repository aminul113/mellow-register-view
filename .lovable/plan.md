## Vercel Setup — Click-by-Click Guide

Ye tera **buyer** (ya tu khud) Vercel dashboard pe kya kya karega — step by step.

---

### PART 1: Project Deploy karna (agar pehli baar hai)

1. **vercel.com** khol → **Log in** (GitHub se login recommended)
2. Top-right **"Add New..."** → **"Project"** click
3. **"Import Git Repository"** section → apna GitHub repo select → **Import**
4. **Configure Project** screen aayega:
   - **Framework Preset**: `Vite` auto-detect ho jayega (agar nahi to manually select)
   - **Root Directory**: `./` (default rehne do)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
5. **"Environment Variables"** section expand karo (niche PART 2 dekh)
6. Sab variables add karne ke baad → **"Deploy"** button
7. 2-3 minute wait → Deploy ho jayega → URL milega jaise `your-app.vercel.app`

---

### PART 2: Environment Variables (ye sabse zaroori hai)

Deploy ke time ya baad me: **Project → Settings → Environment Variables**

Har variable ke liye:
- **Key** field me naam daalo
- **Value** field me value paste karo
- **Environments**: teeno tick karo (`Production`, `Preview`, `Development`)
- **Save** click

Ye variables add karo (order koi bhi):

#### A) Supabase (Frontend — public, VITE_ prefix ke saath)
| Key | Value kahan se milega |
|-----|----------------------|
| `VITE_SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API → `anon` `public` key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase URL ka subdomain (jaise `abcd1234` from `abcd1234.supabase.co`) |

#### B) PAN API (Server-side — VITE_ NAHI lagana)
| Key | Value |
|-----|-------|
| `PAN_API_KEY` | Tera PAN provider ka API key |

#### C) Payment Gateway (Server-side — VITE_ NAHI lagana)
| Key | Value |
|-----|-------|
| `PAYMENT_API_URL` | `https://pay.rapidxservices.in` (ya jo bhi provider) |
| `PAYMENT_USER_TOKEN` | RapidX dashboard → Developers section → User Token copy |
| `PAYMENT_API_SECRET` | (Optional) Agar provider secret deta hai signature verify ke liye |

#### D) Supabase Service Role (Optional — sirf agar callback/webhook use karna hai)
| Key | Value |
|-----|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` `secret` key ⚠️ (ye kabhi kisi ko mat dena) |
| `SUPABASE_URL` | Same as `VITE_SUPABASE_URL` |

---

### PART 3: Variables add karne ke baad Redeploy

⚠️ **Important**: Env variables add karne ke baad automatically redeploy nahi hota. Manually karna padega:

1. **Deployments** tab (top nav)
2. Latest deployment ke right side pe **"..."** (three dots)
3. **"Redeploy"** click
4. Popup me **"Use existing Build Cache"** UNTICK karo (fresh build ho)
5. **Redeploy** button

---

### PART 4: RapidX Payment Provider me Redirect URL set karna

1. **pay.rapidxservices.in** → Login
2. **Developers** / **API Settings** section
3. **Callback URL** / **Redirect URL** field me daalo:
   ```
   https://your-app.vercel.app/app/payment-return
   ```
   (`your-app.vercel.app` ki jagah tumhara actual Vercel URL)
4. **Webhook URL** (agar option ho):
   ```
   https://your-app.vercel.app/api/public/payment-callback
   ```
5. **Save**

---

### PART 5: Supabase side me Vercel URL whitelist

1. Supabase dashboard → **Authentication** → **URL Configuration**
2. **Site URL**: `https://your-app.vercel.app`
3. **Redirect URLs** me add karo:
   - `https://your-app.vercel.app/**`
   - `https://your-app.vercel.app/app/payment-return`
4. **Save**

---

### PART 6: Database SQL run (ek baar)

1. Supabase dashboard → **SQL Editor**
2. Project ka `database.sql` file ka pura content copy
3. Paste → **Run**
4. `payment_orders` table + RPCs ban jayenge

---

### PART 7: Test karna

1. Vercel URL open karo → Sign up / Login
2. **Wallet** page → **Add Money** → amount daalo → **Pay Now**
3. Provider ka page khulega → payment karo (test mode)
4. Wapas `/app/payment-return` pe redirect hoga
5. 5-10 second me wallet me paisa credit ho jayega

---

### Custom Domain (Optional)

1. Vercel → Project → **Settings** → **Domains**
2. **Add** → apna domain daalo (e.g. `myapp.com`)
3. Vercel jo DNS records dega, wo apne domain registrar (GoDaddy/Namecheap) me add karo
4. 5-30 min me active ho jayega
5. PART 4 aur PART 5 me URLs update kar dena custom domain se

---

### Quick Checklist (buyer ke liye print karne layak)

- [ ] Vercel pe project import kiya
- [ ] Saare env vars add kiye (VITE_ vs non-VITE_ dhyan rakha)
- [ ] Redeploy kiya
- [ ] Supabase me SQL run kiya
- [ ] Supabase Auth me Vercel URL whitelist kiya
- [ ] Payment provider dashboard me redirect URL set kiya
- [ ] Test payment successful

---

Approve karo to me ye pura guide `SETUP.md` / `DEPLOYMENT.md` me likh du taki buyer ke liye repo me ready mile.
