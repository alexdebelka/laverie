# Contributing

Thanks for helping. This is a small project; the bar is "keep it simple and keep it private".

## Ground rules

1. **No personal data, ever.** No accounts, no analytics, no IP logging, no device
   identifiers stored server-side. If a feature needs any of that, open an issue first and
   explain why it cannot be done client-side.
2. **No build step for the front-end.** `public/` is served as-is. Plain HTML, CSS and ES
   modules.
3. **Status is derived, never stored.** See `src/status.ts`. Add tests for any change there.
4. Keep both languages (`fr`, `en`) in sync when you touch UI text in `public/app.js`.
5. Keep both themes working (light and dark tokens in `public/styles.css`).

## Workflow

```bash
npm install
npm run db:migrate:local && npm run db:seed:local
npm run dev
npm test && npm run typecheck
```

Open a pull request against `main`. CI runs the typecheck and unit tests.

## Commit messages

Short imperative subject line, e.g. `Add dryer presets`, `Fix grace period off-by-one`.
