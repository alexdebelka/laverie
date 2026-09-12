# Deploying

## First deploy (about 5 minutes)

1. Create a free Cloudflare account and log in from the CLI:

   ```bash
   npx wrangler login
   ```

2. Create the database and copy its id into `wrangler.toml` (`database_id`):

   ```bash
   npx wrangler d1 create laverie
   ```

3. Apply the schema and seed your machines (edit `scripts/seed.sql` first):

   ```bash
   npm run db:migrate:remote
   npm run db:seed:remote
   ```

4. Deploy:

   ```bash
   npm run deploy
   ```

   Wrangler prints the URL (`https://laverie.<your-subdomain>.workers.dev`). Add a custom
   domain later from the Cloudflare dashboard → Workers → laverie → Settings → Domains.

## Continuous deployment (optional)

`.github/workflows/deploy.yml` deploys on every push to `main`. It needs two repository
secrets:

- `CLOUDFLARE_API_TOKEN` — token with the *Edit Cloudflare Workers* template plus
  *D1: Edit*.
- `CLOUDFLARE_ACCOUNT_ID` — from the dashboard sidebar.

Migrations are applied automatically before each deploy.

## Changing the machine list

Edit `scripts/seed.sql` and run `npm run db:seed:remote`. Existing rows keep their live state.

## Homelab instead of Cloudflare?

The Worker only depends on the D1 binding, so it is not portable as-is. If you want to
self-host, the practical route is keeping the Worker on Cloudflare (free, no port
forwarding, no exposure of your home network) and pointing a Cloudflare Tunnel at anything
you later want to add from home. For a building-wide public app, an always-on edge with
no home IP exposure is the safer choice.
