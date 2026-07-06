
## Goal

User apni marzi ka amount daale → payment gateway pe jaaye → success hone par wallet auto-credit ho. **Source code sell karne** ke liye buyer sirf 3 env vars daalke apna gateway plug kar sake — koi code change nahi.

Provider docs (rapidxservices) login ke peeche hain, isliye plan **RapidX-style form-encoded UPI PSPs** ke typical shape par based hai (user_token / customer_mobile / amount / order_id / redirect_url → response me `result.payment_url` aur status API me `txnStatus` SUCCESS/PENDING/FAILURE). Ek jagah (config) me field names / response paths tweak karne se koi bhi similar Indian PSP fit ho jaayega.

---

## Kya banega (user ke liye)

1. **Wallet page pe "Add Money" section**
   - Amount input (min ₹10, max ₹50,000 — admin settings me configurable)
   - Quick chips: ₹100 / ₹500 / ₹1000 / ₹2000
   - "Pay Now" button → gateway ke hosted checkout par redirect
2. **Redirect flow**
   - Success/failure ke baad user `/app/wallet/payment-return?order_id=...` par wapas aata hai
   - Wahan hum server se status verify karke result dikhate hain (Success → wallet credited, Pending → "verification pending", Failed → refund/nothing)
3. **Server-side polling safety net**
   - Agar user return na kare (browser band kar de) to admin panel me "Verify pending payments" button — pending orders ki status API call karke settle karta hai
4. **Admin Panel → Settings → "Payment Gateway" section**
   - Min/max amount, enable/disable toggle, "Check Payment setup" button (jaise PAN check hai)

---

## Buyer setup (source-code khareedne wale ke liye)

`SETUP.md` me sirf ye lines add hongi:

```
Hosting Dashboard (Vercel/Netlify/Cloudflare) → Environment Variables:
  PAYMENT_API_URL     = https://pay.rapidxservices.in
  PAYMENT_USER_TOKEN  = <apka provider token>
  PAYMENT_API_SECRET  = <agar provider secret bhi de>   (optional)
```

⚠️ **`VITE_` prefix mat lagana** — warna browser me leak ho jaayega (PAN jaisa warning).

Buyer agar dusra provider use kare (Paytm/PhonePe/Cashfree/EaseBuzz), to `config.ts` me sirf 4 lines edit karega (endpoint paths + response field names). Baaki sab kaam karega.

---

## Files & Changes

### Naya

1. **`src/routes/api/payment-create.ts`** — TSS server route
   - `POST` — auth verify (Supabase JWT) → validate amount → generate `order_id` → call provider Create Order (form-encoded) → DB me `payment_orders` row `pending` status me save → response me `payment_url` return

2. **`src/routes/api/payment-verify.ts`** — TSS server route
   - `POST { order_id }` — auth verify → provider Status API call → agar `SUCCESS` aur pehle credit nahi hua to `credit_wallet_for_payment` RPC call (idempotent) → row update

3. **`src/routes/api/public/payment-callback.ts`** — public route (agar provider server-to-server webhook bhejta hai)
   - Signature/token verify → status API se re-verify (double check) → wallet credit
   - Public prefix isliye kyunki provider bina auth ke hit karega

4. **`src/routes/app.wallet.payment-return.tsx`** — user redirect landing page
   - `order_id` query param se `payment-verify` call → success/pending/failed UI

5. **Migration `add_payment_orders_and_rpcs.sql`**
   - Table `payment_orders` (id, user_id, order_id unique, amount, status pending/success/failed, provider_txn_id, utr, raw jsonb, created_at, credited_at)
   - GRANTs + RLS (user apne orders dekhe, admin sab dekhe)
   - RPC `create_payment_order(_amount)` → row banaye, `order_id` return
   - RPC `credit_wallet_for_payment(_order_id, _provider_txn_id, _utr, _raw)` → idempotent (agar pehle credit hua to skip), wallet balance + karega, `wallet_transactions` me `credit` entry
   - RPC `mark_payment_failed(_order_id, _raw)`

### Edit

6. **`config.ts`** — payment section add:
   ```ts
   PAYMENT: {
     CREATE_ORDER_PATH: "/api/create-order",
     STATUS_PATH: "/api/check-order-status",
     FIELDS: { token: "user_token", amount: "amount", orderId: "order_id",
               mobile: "customer_mobile", redirect: "redirect_url" },
     RESPONSE: { paymentUrlPath: "result.payment_url",
                 statusPath: "result.txnStatus",
                 utrPath: "result.utr",
                 successValue: "SUCCESS", pendingValue: "PENDING" },
     MIN_AMOUNT: 10, MAX_AMOUNT: 50000,
   }
   ```
   Buyer alag provider use kare → sirf ye object edit → deploy → done.

7. **`.env.example`** — `PAYMENT_API_URL`, `PAYMENT_USER_TOKEN`, `PAYMENT_API_SECRET` (server-side, no VITE_ warning)

8. **`src/routes/app.wallet.tsx`** — "Add Money" UI card (amount input + quick chips + Pay Now button)

9. **`src/lib/data-store.ts`** — helpers: `createPaymentOrder(amount)`, `verifyPayment(orderId)`, `listMyPayments()`

10. **`src/routes/app.admin.tsx`** — Payment settings block (min/max amount, "Check Payment setup" health button, pending orders list with "Verify" action)

11. **`SETUP.md` + `README.md`** — buyer instructions (hosting env vars, ⚠️ no VITE_ warning, provider swap guide)

---

## Security

- Keys **sirf server-side** (`process.env`), browser me kabhi nahi
- Amount validation **server-side** (client trust nahi)
- `order_id` server-generated UUID (client-supplied nahi)
- Wallet credit **idempotent** RPC (double-credit impossible even if callback + return page dono trigger karein)
- Public callback route signature/token verify karta hai + status API se re-verify

---

## Ek cheez confirm

Aap "Check Payment setup" button chahenge admin panel me (PAN jaisa) taaki buyer easily verify kar sake ki keys sahi lagi hain? Main plan me include kar chuka hun — agar nahi chahiye to bataiye.

Approve karein to build karta hun. Baad me agar provider ke actual response fields alag nikle to `config.ts` ki 4 lines edit karke fix ho jaayega.
