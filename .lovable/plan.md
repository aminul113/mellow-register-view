
## Goal
Create beautiful Register and Login pages that visually match the uploaded reference — split layout with a deep green left panel (headline + illustration) and a clean white right panel with the form. Smooth animations, rounded inputs, matching green buttons.

## Pages

### 1. `/register` — Register new account
Left panel (green `#0f5132`-ish):
- Handwritten-style headline: "Lost your PAN card? Find it instantly."
- Subtitle: "Trace the truth."
- Uploaded illustration (`photo_6224495368666288683_y.jpg`) displayed inside a soft rounded card with curved corners, fitted nicely.

Right panel (white):
- Title: "Register new account"
- Fields (only these — no phone, no Cloudflare, no T&C checkbox):
  - Name
  - Email
  - Password (with eye toggle to show/hide)
- Green "REGISTER" button (full width, rounded, hover + press animations)
- Footer: "Have an account? Login" → links to `/login`

### 2. `/login` — Login
Same split layout, same left panel.
Right panel:
- Title: "Login to your account"
- Fields: Email, Password (with eye toggle)
- Green "LOGIN" button (same style as Register)
- Footer: "New here? Register" → links to `/register`
- On successful login → redirect to `/dashboard`

### 3. `/dashboard` — Placeholder
Simple protected-looking dashboard page shown after login/register success, with a welcome message and logout button. Same green accent styling.

## Design system (tokens in `src/styles.css`)
- Primary green: deep forest green matching reference (`oklch` equivalent of ~#0f5132)
- Primary-hover: slightly lighter green
- Background: white right side, green left side
- Rounded inputs (rounded-lg), soft borders, focus ring in primary green
- Handwritten font for hero headline (Google Font: "Caveat" or "Kalam"), body: Inter
- Smooth transitions: 200–300ms on buttons/inputs; subtle fade + slide-in on card mount
- Buttons: white text on green, hover lift + shadow, active scale-95, disabled state

## Auth behavior (scope for this pass)
No backend requested. Implement as client-side only:
- Store account in `localStorage` on register (name, email, password)
- Login validates against stored credentials
- On success → navigate to `/dashboard`
- Basic zod validation (email format, password min 6 chars, name required) with inline error messages

If you'd like real authentication (persistent accounts, secure passwords, email verification), I can enable Lovable Cloud in a follow-up — just say the word.

## Files to create/modify
- `src/styles.css` — add green primary token + font import via `<link>` in root
- `src/routes/__root.tsx` — add Google Fonts `<link>`, update title/meta to "PANME SHOP"
- `src/routes/register.tsx` — Register page
- `src/routes/login.tsx` — Login page
- `src/routes/dashboard.tsx` — Dashboard placeholder
- `src/routes/index.tsx` — redirect to `/register` (or a small landing that links to both)
- `src/components/AuthLayout.tsx` — shared split-screen layout
- Add uploaded illustration as a Lovable asset via `lovable-assets`

## Confirm before I build
1. OK to use `localStorage` for now (no real backend)?
2. Should `/` redirect to `/register`, or show a small landing page?
