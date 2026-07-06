## Plan: PAN Finder issue fix, sellable-source safe

Likely issue: `PAN_API_KEY` / `PAN_API_SECRET` must be added in the buyer's own Supabase project under Edge Function secrets, and the `pan-find` function must be deployed to that same Supabase project. If keys were added in Vercel env vars, `config.ts`, `.env`, or a different Supabase project, the app will still show this error.

### What I will change

1. **Keep source-code selling safe**
   - No PAN key or secret will be added to the repo.
   - No PAN key/secret will be added to `config.ts`, `.env.example`, frontend code, or Vercel env docs.
   - Each buyer will add their own keys only in Supabase Edge Function secrets.

2. **Improve the PAN error message in the app**
   - Replace the generic `PAN service unreachable` message with clearer causes:
     - Edge function not deployed
     - PAN secrets missing/wrong place
     - Wrong Supabase project linked
     - Function/network/provider error
   - Still auto-refund wallet as it does now.

3. **Add buyer-friendly setup docs**
   - Update `SETUP.md` and `README.md` to say clearly:
     - Do not put `PAN_API_KEY` / `PAN_API_SECRET` in Vercel env vars.
     - Do not put them in `config.ts`.
     - Put them only in Supabase Dashboard → Edge Functions → Secrets.
     - Then deploy/redeploy `pan-find` to the same Supabase project.

4. **Add a safe health-check guide**
   - Add copy-paste commands/steps for buyers:
     - Confirm `pan-find` exists in Supabase Edge Functions.
     - Confirm secrets names are exactly `PAN_API_KEY` and `PAN_API_SECRET`.
     - Redeploy function after setting secrets.
   - No command will print or expose the secret values.

5. **Optional app-side diagnostic helper**
   - Add an Admin Panel status note/button that tests only whether the edge function responds.
   - It will never show secret values.
   - It will only display statuses like `Function missing`, `Secrets missing`, `Provider error`, or `Ready`.

### Technical details

Current flow:

```text
PAN Finder page
→ debit_wallet_for_search RPC
→ Supabase Edge Function: pan-find
→ PanManager API using PAN_API_KEY / PAN_API_SECRET
→ finalize_search RPC
→ success OR refund
```

The current pasted error means the browser call to `pan-find` failed before a valid success/not-found response was returned. Most common causes:

```text
1. pan-find edge function not deployed
2. PAN_API_KEY / PAN_API_SECRET added in wrong place
3. secrets added to different Supabase project
4. function deployed before secrets and not redeployed/refreshed
5. provider credentials invalid or provider unavailable
```

### Immediate fix for your current deployment

In your Supabase project connected to this deployed app:

```text
Supabase Dashboard
→ Edge Functions
→ Manage secrets
→ Add exactly:
   PAN_API_KEY
   PAN_API_SECRET
→ Edge Functions
→ confirm pan-find exists
→ redeploy pan-find if needed
→ logout/login in app and test again
```

If you approve, I’ll update the app/docs so this is clear for every buyer and easier to debug without exposing anyone’s PAN API keys.