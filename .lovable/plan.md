## Add Money — Popup Flow + Real-time Credit + Webhook

### Goal
Wallet page pe ek "Add Money" button ho. Click karte hi ek **beautiful modal popup** khule jisme amount fill karne ka option ho (quick chips + custom input). "Pay Now" click karte hi gateway pe redirect ho, payment complete hote hi wallet **real-time** credit ho jaye. Buyers ke liye ek fixed **webhook URL** bhi expose ho jo unke gateway dashboard me paste kar sakein.

### UI Changes (`src/routes/app.wallet.tsx`)
1. Current inline "Add Money" section hata ke uski jagah ek prominent **"+ Add Money"** button (gradient, primary).
2. Button click → shadcn `<Dialog>` popup khule with:
   - Header: "Add Money to Wallet" + subtitle
   - Current balance chip
   - **Quick amount chips**: ₹100, ₹200, ₹500, ₹1000, ₹2000, ₹5000 (selected state highlight)
   - **Custom amount** input (₹ prefix, min ₹10, max ₹100000, validation)
   - Big **"Pay ₹XXX Now"** CTA button (disabled jab tak valid amount na ho)
   - Loading state jab order create ho raha ho
   - Footer: "Secured by [Provider]" small text
3. Design tokens use honge (no hardcoded colors), dark/light dono me kaam kare, mobile responsive.

### Real-time Wallet Credit
- Payment return page (`app.payment-return.tsx`) already poll karta hai. Additionally wallet page pe **Supabase Realtime subscription** add karenge `wallet_transactions` table pe — jaise hi naya credit row insert ho, balance instantly update ho jayega (no refresh needed).
- Toast notification: "₹XXX credited to your wallet 🎉"

### Webhook for Buyers
- Endpoint already exists: `/api/public/payment-callback` (server-to-server, no auth, HMAC-verified).
- Wallet page pe (ya settings me) ek chhota **"Webhook Info"** collapsible add karenge jo buyer ke deploy hone ke baad ye dikhaye:
  ```
  Webhook URL: https://<your-domain>/api/public/payment-callback
  Method: POST
  Content-Type: application/x-www-form-urlencoded
  Expected fields: order_id, status, txn_id, amount, signature
  Signature: HMAC-SHA256(order_id|status|amount, PAYMENT_API_SECRET)
  ```
- Ye info `DEPLOYMENT.md` me bhi add hogi with RapidX-specific paste instructions.

### Config (buyer-friendly, `config.ts`)
Already pluggable hai. Confirm karenge ye fields present hain:
- `PAYMENT.provider_name` (display ke liye — "Secured by RapidX")
- `PAYMENT.min_amount` / `PAYMENT.max_amount` / `PAYMENT.quick_amounts[]`
- `PAYMENT.currency_symbol` ("₹")
- Webhook field mapping (buyer apne gateway ke hisab se change kar sake)

### Files to Change
- `src/routes/app.wallet.tsx` — inline form hatao, "Add Money" button + `<AddMoneyDialog />` component
- `src/components/wallet/AddMoneyDialog.tsx` — new file (popup UI)
- `src/routes/app.wallet.tsx` — add realtime subscription hook
- `config.ts` — expose `quick_amounts`, `min_amount`, `max_amount`, `provider_name`
- `DEPLOYMENT.md` — add "Webhook Setup" section with exact URL pattern + RapidX paste steps
- `src/routes/api/public/payment-callback.ts` — verify HMAC signature logic present hai (add if missing)

### No Changes
- DB schema (already done in prior turn)
- Payment create/verify server routes (already done)
- Auth flow

Approve karo to build mode me implement kar deta hun.
