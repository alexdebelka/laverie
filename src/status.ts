/**
 * Pure status logic. No I/O, fully unit-tested (test/status.test.ts).
 *
 * A machine's status is never stored; it is derived from timestamps at read
 * time so that stale rows heal themselves without a cron job.
 */

export type Kind = "washer" | "dryer";
export type Status = "free" | "running" | "done" | "broken";

export interface MachineRow {
  id: number;
  kind: Kind;
  label: string;
  capacity_kg: number | null;
  started_at: number | null;
  ends_at: number | null;
  broken_at: number | null;
  broken_reports: number;
  broken_note: string | null;
  updated_at: number;
}

export interface Config {
  /** Minutes a finished cycle stays "done" before auto-freeing. */
  doneGraceMin: number;
  /** Days a broken flag survives without a new report. */
  brokenTtlDays: number;
}

export interface MachineView {
  id: number;
  kind: Kind;
  label: string;
  capacity_kg: number | null;
  status: Status;
  /** Seconds until the cycle ends (running) — 0 otherwise. */
  remaining_s: number;
  /** Seconds since the current state was reported (for "reported X min ago"). */
  since_s: number;
  /** Cycle length in minutes when running/done. */
  cycle_min: number | null;
  broken_reports: number;
  broken_note: string | null;
}

export const DEFAULT_CONFIG: Config = { doneGraceMin: 45, brokenTtlDays: 7 };

export function isBroken(row: MachineRow, now: number, cfg: Config): boolean {
  if (row.broken_at === null) return false;
  return now - row.broken_at < cfg.brokenTtlDays * 86400;
}

export function computeStatus(row: MachineRow, now: number, cfg: Config = DEFAULT_CONFIG): Status {
  if (isBroken(row, now, cfg)) return "broken";
  if (row.started_at === null || row.ends_at === null) return "free";
  if (now < row.ends_at) return "running";
  if (now < row.ends_at + cfg.doneGraceMin * 60) return "done";
  return "free";
}

export function toView(row: MachineRow, now: number, cfg: Config = DEFAULT_CONFIG): MachineView {
  const status = computeStatus(row, now, cfg);
  const running = status === "running" || status === "done";
  let since: number;
  switch (status) {
    case "broken":
      since = now - (row.broken_at ?? now);
      break;
    case "running":
      since = now - (row.started_at ?? now);
      break;
    case "done":
      since = now - (row.ends_at ?? now);
      break;
    default:
      since = now - row.updated_at;
  }
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
    capacity_kg: row.capacity_kg,
    status,
    remaining_s: status === "running" ? Math.max(0, (row.ends_at ?? now) - now) : 0,
    since_s: Math.max(0, since),
    cycle_min:
      running && row.started_at !== null && row.ends_at !== null
        ? Math.round((row.ends_at - row.started_at) / 60)
        : null,
    broken_reports: isBroken(row, now, cfg) ? row.broken_reports : 0,
    broken_note: isBroken(row, now, cfg) ? row.broken_note : null,
  };
}

/** Allowed cycle lengths entered by users, in minutes. */
export const MIN_CYCLE_MIN = 1;
export const MAX_CYCLE_MIN = 180;

export function validMinutes(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= MIN_CYCLE_MIN && v <= MAX_CYCLE_MIN;
}

/** Busy-hours aggregation: 7 x 24 matrix of start counts, Monday first. */
export function busyMatrix(startTimes: number[], tzOffsetMin: number): number[][] {
  const m: number[][] = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const t of startTimes) {
    const d = new Date((t + tzOffsetMin * 60) * 1000);
    const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
    const row = m[day];
    if (row) row[d.getUTCHours()] = (row[d.getUTCHours()] ?? 0) + 1;
  }
  return m;
}
