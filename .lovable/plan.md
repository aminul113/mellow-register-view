## Goal

Isko "fork → 1-click deploy → done" jaisa banana, aur skeleton loading ko sirf main content tak simit karna (sidebar turant aa jaye).

---

## Part 1 — Hosting easy (GitHub / Codespaces / Vercel / Netlify / Hostinger)

### A. Env-var support add karna (backward compatible)
- `config.ts` update: pehle `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` / `VITE_ADMIN_EMAIL` check karega, warna file me paste ki hui values use karega.
- `isConfigured()` dono ko cover karega.
- `.env.example` file add: `VITE_SUPABASE_URL=`, `VITE_SUPABASE_ANON_KEY=`, `VITE_ADMIN_EMAIL=`.
- `.gitignore` me `.env` add (safety).
- Result: Vercel / Netlify / Cloudflare pe buyer file edit kiye bina, sirf env vars set karke deploy kar sake.

### B. GitHub Codespaces ready
- `.devcontainer/devcontainer.json`: Node 20 + Bun image, port 8080 forward, `postCreateCommand: bun install`, VS Code me file explorer khula.
- README top pe **"Open in Codespaces"** badge.
- Codespaces guide `SETUP.md` me: repo fork → Code → Codespaces → `config.ts` browser me edit → commit → deploy.

### C. One-click Deploy buttons (README top)
- **Deploy to Vercel** badge (`vercel.com/new/clone?repository-url=...&env=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY,VITE_ADMIN_EMAIL`).
- **Deploy to Netlify** badge (`app.netlify.com/start/deploy?repository=...`) + `netlify.toml` (build `bun run build`, publish `dist`, SPA redirect).
- **Deploy to Cloudflare Pages** guide (build cmd + output dir + env vars list).

### D. Hostinger / cPanel / static hosting
- `SETUP.md` me naya section:
  1. `bun run build` → `dist/` folder banega.
  2. `dist/*` File Manager se `public_html/` me upload.
  3. `.htaccess` SPA fallback (React Router deep-link fix) — repo me `public/.htaccess` add karenge taaki build ke saath copy ho jaye.
  4. `config.ts` me values pehle bhar ke build karo (env vars build me freeze ho jati hain).

### E. Docs refresh
- `README.md`: badges (Codespaces + Vercel + Netlify + Cloudflare) sabse upar, 3 hosting paths clearly listed.
- `SETUP.md`: 4 hosting flows — Codespaces / Vercel / Netlify / Hostinger — har ek short & click-by-click.

---

## Part 2 — Skeleton loading fix (sidebar turant, sirf content shimmer)

Abhi `src/routes/app.tsx` me auth ready hone tak pura page (sidebar + header + content) shimmer karta hai. Fix:

- `AppLayout` ka gating hataake **sidebar + header hamesha render** karo.
- `<Outlet />` ki jagah, jab tak `ready === false`, ek **main-content-only skeleton** dikhao (stat cards + table rows) — sidebar aur header untouched.
- Har tab (`app.index`, `app.wallet`, `app.pan-list`, `app.support`, `app.admin`) ke andar ka per-section skeleton wahi rakhenge, kyunki wo data-fetch ke liye alag scenario hai.
- Header me user name jab tak load na ho, ek chhota inline skeleton chip dikhega (sidebar/header shift na ho).

Result: navigate karte hi sidebar+header solid dikhta hai, sirf beech ka content area shimmer karta hai — professional feel.

---

## Files touched

**New**
- `.devcontainer/devcontainer.json`
- `.env.example`
- `netlify.toml`
- `public/.htaccess`

**Edited**
- `config.ts` (env-var fallback)
- `.gitignore` (`.env`)
- `README.md` (deploy badges + hosting matrix)
- `SETUP.md` (Codespaces + Vercel + Netlify + Hostinger sections)
- `src/routes/app.tsx` (sidebar always-on, content-only skeleton)

**Untouched**: business logic, DB, edge function, branding, swal, admin panel — kuch nahi chhedenge.

---

## Out of scope
- Payment gateway, new features, DB schema changes.
- Custom domain automation (buyer apna khud connect karega — steps docs me).
