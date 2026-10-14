# A Little Bloom — Meet & Himani

Public Gujarati baby shower invitation with English language switching, custom teddy bear illustrations, countdown, calendar download, directions, sharing, persistent RSVPs, and a private host dashboard.

Event details are retained from the supplied invitation: 17 November 2026 at 10:00 AM IST, Royal Dine Restaurant & Banquet, Pal Gam, Surat.

## Host dashboard

Visit `/host` on the published website and sign in with the ChatGPT account that owns the site. View responses, total attending guests, wishes, and download a CSV. Guests submit without creating an account. Public visitors cannot read the guest list.

Production `HOST_EMAIL` and `PUBLIC_SITE_ORIGIN` are stored as hosting environment variables. Guest records are saved in Cloudflare D1 through the `DB` binding. Credentials and local preview data are excluded from source and deployment.

## Source

- `app/page.tsx`: bilingual invitation, event details, RSVP, countdown, calendar, and sharing.
- `app/globals.css`: responsive nursery styling and reduced motion support.
- `public/`: original SVG bear illustrations and favicon.
- `app/api/rsvp/route.ts`: validated, idempotent RSVP writes.
- `app/host/`: authenticated host dashboard.
- `app/api/host/rsvps/route.ts`: authorized paginated guest list.
- `db/schema.ts` and `drizzle/`: database schema and versioned migration.
- `tests/`: validation, persistence, retry, access control, pagination, and CSV tests.

## Development

Requires Node.js 22.13 or newer. Install dependencies, then run the preview:

```powershell
npm ci
npm run dev -- --hostname 127.0.0.1
```

On Windows, if npm's command shim has problems, use its direct JavaScript entry point:

```powershell
node 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' run dev -- --hostname 127.0.0.1
```

Local and production D1 databases are separate. Generate the build configuration with `npm run build`, then apply each new local migration once:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_long_ink.sql
```

Production migrations are applied by Sites during deployment. Do not edit an applied migration.

Run checks:

```powershell
node node_modules/typescript/bin/tsc --noEmit
node --test tests/rsvp-routes.test.mjs tests/rsvp-validation.test.mjs
npm run build
```

The original downloaded HTML is unchanged. Local preview test responses are never copied into production.
