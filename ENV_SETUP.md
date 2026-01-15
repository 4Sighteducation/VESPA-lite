## VESPA Lite env setup (local + Vercel)

This app uses Vite. Local environment variables should go in **`.env.local`** (not committed).

### Required variables

```bash
VITE_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_PUBLIC_ANON_KEY"
```

### Local dev

Create `VESPA-lite/.env.local` with the variables above, then:

```bash
npm run dev
```

### Vercel

In your Vercel Project:

- Settings → Environment Variables
  - Add `VITE_SUPABASE_URL`
  - Add `VITE_SUPABASE_ANON_KEY`

Then redeploy.

