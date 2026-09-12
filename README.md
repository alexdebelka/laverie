# Laverie

Live: https://laverie.laverie.workers.dev · Source: https://github.com/alexdebelka/laverie

A privacy-first, crowd-sourced status board for a shared laundry room. Residents tap
"started" / "collected" / "out of order" on their phone; everyone else sees which machines
are free, when a cycle ends, and which machines are broken.

No accounts, no cookies, no tracking. The server only ever stores
*"machine N started at this time"*.

- **Board** — every washer and dryer with live status (free · in use · done · out of order),
  countdown, and "reported X min ago" so stale data is honest.
- **One-tap reports** — start (with cycle length), collected, cancel, out of order, fixed.
- **Auto-healing state** — a cycle becomes "done" when the timer ends, and "free" after a
  grace period; a broken flag expires after a week unless someone re-reports it.
- **Busy hours** — weekday × hour heatmap built from anonymous start events.
- **Reminders without data** — a browser notification (where supported) or a one-tap calendar
  event (.ics) with an alarm at cycle end; nothing is sent to or stored on the server.
- **Practical info** and an **anonymous feedback** box.
- French/English, light/dark, installable PWA, works offline for the shell.

## Stack

| Layer     | Choice                                                     |
|-----------|------------------------------------------------------------|
| Runtime   | [Cloudflare Workers](https://workers.cloudflare.com/) + [Hono](https://hono.dev/) |
| Database  | [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite)       |
| Front-end | Static PWA in `public/` — plain HTML/CSS/ES modules, no build step |
| Tests     | Vitest (pure status logic) + `tsc --noEmit`                |

Everything fits in Cloudflare's free tier for a building-sized audience.

## Project layout

```
src/            Worker: API routes (index.ts), status logic (status.ts), rate limiting
public/         PWA: index.html, app.js, styles.css, sw.js, manifest, icons
migrations/     D1 schema (applied with wrangler d1 migrations)
scripts/        seed.sql — your machine inventory
test/           Vitest unit tests
docs/           PRIVACY.md, ROADMAP.md, DEPLOY.md
.github/        CI (typecheck + tests) and deploy workflow
```

## Run locally

```bash
npm install
npm run db:migrate:local
npm run db:seed:local          # edit scripts/seed.sql first to match your room
npm run dev                    # http://localhost:8787
```

`npm test` runs the unit tests, `npm run typecheck` the TypeScript check.

## Deploy

See [docs/DEPLOY.md](docs/DEPLOY.md). Short version:

```bash
npx wrangler login
npx wrangler d1 create laverie          # paste database_id into wrangler.toml
npm run db:migrate:remote
npm run db:seed:remote
npm run deploy
```

## API

All responses are JSON and `Cache-Control: no-store`.

| Method | Path                            | Body                 | Notes |
|--------|---------------------------------|----------------------|-------|
| GET    | `/api/machines`                 |                      | All machines with derived status |
| POST   | `/api/machines/:id/start`       | `{ "minutes": 45 }`  | 1–180 min; 409 if running or broken |
| POST   | `/api/machines/:id/collect`     |                      | Frees a running/done machine |
| POST   | `/api/machines/:id/cancel`      |                      | Same as collect, logged as a mistake |
| POST   | `/api/machines/:id/broken`      | `{ "note": "…" }`    | Note optional, ≤ 140 chars |
| POST   | `/api/machines/:id/fixed`       |                      | Clears the broken flag |
| GET    | `/api/busy?tz=120`              |                      | 7×24 matrix of start counts, `tz` = local offset in minutes |
| GET    | `/api/reminder.ics?ends=…&label=…&kind=…&lang=…` | | Calendar event with an alarm at cycle end; built from the query string, nothing stored |
| POST   | `/api/feedback`                 | `{ "message": "…" }` | 3–500 chars, anonymous |

Writes are rate-limited per client (30/min for machine actions, 5 per 10 min for feedback)
using a salted, in-memory hash that is never persisted — see [docs/PRIVACY.md](docs/PRIVACY.md).

## Configuration

`wrangler.toml` → `[vars]`:

| Variable                | Default | Meaning |
|-------------------------|---------|---------|
| `DONE_GRACE_MIN`        | 45      | Minutes a finished machine stays "done" before auto-freeing |
| `BROKEN_TTL_DAYS`       | 7       | Days a broken flag survives without a new report |
| `EVENT_RETENTION_WEEKS` | 8       | Weeks of anonymous events kept for the busy-hours chart |

Prices, payment notes and cycle presets live in `public/index.html` and `public/app.js`
(`PRESETS`).

## Reading feedback

```bash
npm run db:feedback
```

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
