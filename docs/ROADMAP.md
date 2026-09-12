# Roadmap

Ideas, roughly in order. Nothing here is committed.

## Near term

- Confirm which coins the payment terminal accepts and update the Info tab.
- Replace user-entered cycle lengths with a program list once real cycle times are known
  (`PRESETS` in `public/app.js`; could become per-machine presets in `scripts/seed.sql`).
- QR code poster for the laundry room (link + "tap when you start").
- Self-host the two fonts to remove the only third-party request.

## Later

- **Background push notifications** — opt-in Web Push with VAPID. Privacy design: store the
  push subscription only until the reminder fires, then delete it; never link it to a
  machine action in `events`.
- **Per-machine history** — "usually free after 21:00" hints derived from `events`.
- **Admin view** — read feedback and broken reports without the CLI (behind a Cloudflare
  Access policy, still no resident accounts).
- **Sensors** — an ESP32 + accelerometer per machine would replace crowd-sourcing entirely.
  Only if the building operator agrees.

## Non-goals

- User accounts, reservations, payments.
- Any analytics beyond the anonymous busy-hours matrix.
