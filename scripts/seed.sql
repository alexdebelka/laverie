-- Machine inventory. Edit to match your laundry room, then run `npm run db:seed:local` / `db:seed:remote`.
-- Re-running is safe: existing rows keep their state, only kind/label/capacity are refreshed.
INSERT INTO machines (id, kind, label, capacity_kg) VALUES
  (1, 'washer', '1', 7),
  (2, 'washer', '2', 7),
  (3, 'washer', '3', 7),
  (4, 'washer', '4', 7),
  (5, 'washer', '5', 7),
  (6, 'dryer',  '6', 8),
  (7, 'dryer',  '7', 8),
  (8, 'dryer',  '8', 8),
  (9, 'dryer',  '9', 8)
ON CONFLICT(id) DO UPDATE SET
  kind = excluded.kind,
  label = excluded.label,
  capacity_kg = excluded.capacity_kg;
