# Privacy

Goal: someone reading the database should learn nothing about any resident.

## What the server stores

| Table      | Columns                                          | Personal? |
|------------|--------------------------------------------------|-----------|
| `machines` | id, kind, label, cycle start/end, broken flag+note | No — one row per physical machine |
| `events`   | machine id, action, cycle length, timestamp      | No — used for the busy-hours chart, pruned after `EVENT_RETENTION_WEEKS` |
| `feedback` | free text, timestamp                             | Only if the writer puts personal details in the text; the UI asks them not to |

There is no user table, no session table, no request log table.

## What the server processes but does not store

- **Client IP** — used only to key the in-memory rate limiter. The key is a SHA-256 of
  `random-per-isolate-salt | scope | ip`, kept in Worker memory for at most 10 minutes,
  never written anywhere. Cloudflare's own edge logs are outside this project's control;
  observability/logging is disabled in `wrangler.toml`.
- **Request body** — validated and either applied to a machine row or discarded.

## What stays on the device (localStorage)

- Chosen language.
- Which machines were started from this device ("yours" badge, cancel button).
- Pending local reminders (`machine id → end time`) for notifications.

None of this is sent to the server. Clearing site data removes it.

## What the app does not do

- No cookies, no analytics, no third-party scripts. Fonts are loaded from Google Fonts;
  swap the `<link>` in `public/index.html` for self-hosted files if you prefer zero third-party requests.
- No push notifications (they would require storing a push endpoint per device). See
  `docs/ROADMAP.md` for an opt-in design.
