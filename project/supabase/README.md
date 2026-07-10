# Supabase Media System

Unified file storage for DigiHealth: images, PDFs, video, audio, documents.

## 1. Environment variables

Add to `.env.local`:

```env
# Server (preferred names)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...          # required for media admin
SUPABASE_JWKS_URL=https://YOUR_PROJECT.supabase.co/auth/v1/.well-known/jwks.json

# Browser (Next.js must expose these)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Legacy aliases still work: `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### Important

| Key | Use |
|-----|-----|
| `SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_…` | Browser / SSR (`@supabase/ssr`) |
| `SUPABASE_SECRET_KEY` | **Media system** — sign uploads, `media_assets`, signed downloads |

**Do not** put the publishable key in `SUPABASE_SECRET_KEY`.

## 2. Apply schema

In Supabase **SQL Editor**, run:

`supabase/migrations/001_media_assets.sql`

Creates `media_assets` + private `media` bucket.

## 3. Clients in this repo

| File | Purpose |
|------|---------|
| `lib/supabase/client.ts` | Browser (`createBrowserClient`) |
| `lib/supabase/server.ts` | Cookie SSR client + **service-role admin** |
| `lib/supabase/middleware.ts` | Optional proxy helper |
| `lib/supabase/media.ts` | Upload / sign / complete / delete |

## 4. Auth model

App auth is **MongoDB + JWT cookies**, not Supabase Auth.

- `media_assets.user_id` = Mongo `User._id` (text)
- All media CRUD goes through `/api/media/*` with JWT + service role

## 5. Legacy files

Existing Cloudinary / Firebase URLs are left as-is. Only **new** uploads use Supabase.

## 6. Security checklist

- [ ] Service role / secret only on server
- [ ] Publishable key is public; never treat it as service role
- [ ] Bucket is private
- [ ] Prescriptions always `is_public=false`
- [ ] Run migration SQL once per project
