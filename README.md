# PANME SHOP — self-hosted source

A "bring your own Supabase" app. Every buyer plugs in their own Supabase
project. Fully isolated — no central server.

## 🚀 One-click deploy

| Host | Click |
|------|-------|
| Vercel | [![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FYOUR-USER%2FYOUR-REPO&env=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY,VITE_ADMIN_EMAIL) |
| Netlify | [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR-USER/YOUR-REPO) |
| Codespaces | [![Open in Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/YOUR-USER/YOUR-REPO) |
| Cloudflare Pages | Connect repo → Build cmd `bun run build` → Output `dist` |

> Replace `YOUR-USER/YOUR-REPO` with your GitHub path after forking.

## Setup in 2 files

1. **`config.ts`** — paste your Supabase URL + anon key (OR set env vars on host)
2. **`database.sql`** — paste into Supabase SQL Editor and Run

**👉 Full guide: [`SETUP.md`](./SETUP.md)**

## Local quick start

```bash
bun install
bun run dev
```

## Environment variables (recommended for hosts)

Instead of editing `config.ts`, set these on Vercel / Netlify / Cloudflare:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon public key |
| `VITE_ADMIN_EMAIL` | Email that becomes the first admin |

See `.env.example` for a template.