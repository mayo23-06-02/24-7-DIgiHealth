# Supabase magic-link email verification

DigiHealth uses **password login** day-to-day. New accounts must confirm email via a **Supabase sign-in / magic link** (no 6-digit OTP).

## Flow

1. **Register** — wizard saves password; user created with `emailVerified: false`
2. Redirect to **`/verify-email?email=...`**
3. **Send sign-in link** — `POST /api/auth/otp/send` `{ purpose: "verify" }` → Supabase `signInWithOtp` with `emailRedirectTo`
4. User clicks link in email → **`/auth/callback`**
5. Callback exchanges `code` (or `token_hash`), sets `emailVerified: true`, redirects to **`/login?verified=true`**
6. **Login** — email + password; blocked if `emailVerified === false`

## Environment

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
JWT_SECRET=
# Optional — used for magic-link redirect origin
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Supabase Dashboard

1. **Authentication → Providers → Email** → Enable  
2. Prefer **magic link** email templates (not OTP-only)  
3. **URL configuration**  
   - Site URL: your app origin  
   - Redirect URLs must include:  
     - `http://localhost:3000/auth/callback`  
     - `https://your-domain.com/auth/callback`  
4. Disable “Confirm email” OTP if you only want link-based confirmation  

## Key files

| Path | Role |
|------|------|
| `lib/supabase/auth.ts` | `sendMagicLink` |
| `app/api/auth/otp/send` | Send magic link |
| `app/auth/callback/route.ts` | Link click → mark verified |
| `components/auth/VerifyEmail/*` | UI (no code field) |
| `app/api/auth/login` | Blocks unverified emails |
