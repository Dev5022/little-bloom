# Little Bloom — Vercel + Supabase

This is the Vercel-ready version of Meet & Himani's baby shower invitation. It preserves the Gujarati/English design, Shrimant wording, inviter names, illustrations, music, countdown, calendar, sharing, RSVP form, and CSV guest list.

This checkout migrates the existing `Dev5022/little-bloom` repository to Vercel and Supabase. Its Git history is retained. The previous published Sites deployment stays available independently; this source now targets Vercel.

## What runs where

- **GitHub:** project source and the supplied song/illustrations.
- **Vercel:** Next.js website and server API routes.
- **Supabase Postgres:** permanent guest responses.
- **Supabase Auth:** the host's email/password login at `/host`.

Guests submit without signing in. Public visitors cannot read guest responses. The Supabase secret key is used only by the server-side RSVP write API. Host reads use a verified Supabase session and database row-level security.

## 1. Create your Supabase project

Create a dedicated Supabase project. From Project Settings > API Keys, find the project URL, publishable key, and server-only secret key.

In **SQL Editor**, run:

`supabase/migrations/202610140001_baby_shower.sql`

This creates the RSVP table, host allowlist, constraints, and row-level security. No guest data is seeded.

## 2. Create the host login

1. Open **Authentication > Users > Add user** in Supabase.
2. Create your host email/password user and confirm the email using the dashboard's confirmation option. Choose your own password there.
3. Open `supabase/enable-host.sql`, replace `your-host-email@example.com` with that email, and run it in SQL Editor.
4. For this invitation-only project, disable new public sign-ups in Supabase Auth settings.

Both the `HOST_EMAIL` setting and the database host allowlist must match the host account. Signing in as another user does not grant guest-list access.

## 3. Check locally (optional)

Requires Node.js 22.18 or newer.

```powershell
cd "E:\Baby Shower\little-bloom"
npm ci
Copy-Item .env.example .env.local
```

Fill `.env.local` with your own values:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `SUPABASE_SECRET_KEY` | Server-only Supabase secret key |
| `HOST_EMAIL` | Email of your enabled Supabase host user |
| `SITE_URL` | Production website origin, once known; optional locally |

The URL and publishable key can be included in browser code. Keep the secret key server-side and never give it a `NEXT_PUBLIC_` prefix. `.env.local` is ignored by Git.

```powershell
npm run dev
```

Open the printed URL. Visit `/host` to sign in. The music starts when the browser permits autoplay, with a first-interaction fallback and a pause/resume note button.

## 4. Push this folder to GitHub

Keep the existing GitHub repository, `https://github.com/Dev5022/little-bloom`. This folder is already its checkout. Commit all migration changes, including the removed Cloudflare files and the new Supabase files.

The `.gitignore` excludes dependencies, build output, local environment values, and QA artifacts. The song is included at `public/music/nanha-sa-mehmaan.m4a`.

After configuring Supabase and the Vercel environment variables, publish the migration from this checkout:

```powershell
git add -A
git commit -m "Migrate invitation to Next.js and Supabase for Vercel"
git push origin main
```

## 5. Import into Vercel

1. Open your existing Vercel project connected to `Dev5022/little-bloom` and check **Settings > Build and Deployment**.
2. Framework preset: **Next.js**.
3. Root directory: the repository root (`.`), where this `package.json` is located.
4. Build command: `npm run build`. Install command: `npm ci`. Leave output directory at the Next.js default.
5. Add the environment variables listed above in Vercel before deploying. `SITE_URL` may be left unset initially; Vercel's production URL is used for metadata automatically.
6. Deploy, then open `/host` and sign in.
7. If you later set a custom domain, set `SITE_URL` to its HTTPS origin and redeploy. The RSVP API validates the current request origin, so production and Vercel preview addresses do not need hardcoded changes in the form.

Use a separate Supabase project for Preview if you do not want preview/test responses in the production guest list. In Vercel, configure the Supabase variables separately for Preview and Production environments.

## 6. Verify before sharing the new link

- Send one attending RSVP and one declining RSVP.
- Refresh the page and confirm the successful receipt remains available in that browser tab.
- Sign in at `/host`; check names, guest totals, wishes, and CSV download.
- Open `/api/host/rsvps` in a signed-out/incognito window; it must not return guest rows.
- Check Gujarati/English switching and music pause/resume on a phone.
- Remove your test RSVPs through Supabase's Table Editor before collecting real responses.

There are no existing production RSVP records to transfer according to the owner. Keep the original website available until the new setup is verified. The previous `chatgpt.site` address will continue pointing at the original website until you deliberately change or redirect it.

## Updates after setup

Edit, save, test, commit, and push to Vercel's configured production branch. Vercel then builds and publishes the update. Use a separate branch for preview changes.

```powershell
npm run typecheck
npm test
npm run build
git add app lib public
git commit -m "Update invitation"
git push
```

Database records survive website redeployments because Supabase stores them separately. For future schema changes, add a new SQL migration rather than editing an already applied migration.

## Checks

```powershell
npm run typecheck
npm test
npm run build
```

The route tests execute the real handlers and Supabase SDK against an HTTP fixture. They verify validation, successful writes, idempotent retries, storage failure handling, rejected forged identity headers, host authorization, pagination, and CSV safety. A real Supabase project is still required to verify hosted row-level security and end-to-end sign-in.

## References

- [Vercel Git deployments](https://vercel.com/docs/git)
- [Supabase Next.js server-side authentication](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
