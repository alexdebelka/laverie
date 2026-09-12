import { describe, expect, it } from "vitest";
import { busyMatrix, computeStatus, toView, validMinutes, type MachineRow } from "../src/status";

const cfg = { doneGraceMin: 45, brokenTtlDays: 7 };
const T = 1_800_000_000; // arbitrary "now"

function row(over: Partial<MachineRow> = {}): MachineRow {
  return {
    id: 1,
    kind: "washer",
    label: "1",
    capacity_kg: 7,
    started_at: null,
    ends_at: null,
    broken_at: null,
    broken_reports: 0,
    broken_note: null,
    updated_at: T - 3600,
    ...over,
  };
}

describe("computeStatus", () => {
  it("is free with no cycle", () => {
    expect(computeStatus(row(), T, cfg)).toBe("free");
  });
  it("is running before ends_at", () => {
    expect(computeStatus(row({ started_at: T - 600, ends_at: T + 600 }), T, cfg)).toBe("running");
  });
  it("is done between ends_at and the grace period", () => {
    expect(computeStatus(row({ started_at: T - 3600, ends_at: T - 60 }), T, cfg)).toBe("done");
    expect(computeStatus(row({ started_at: T - 3600, ends_at: T - 45 * 60 + 1 }), T, cfg)).toBe("done");
  });
  it("auto-frees after the grace period", () => {
    expect(computeStatus(row({ started_at: T - 7200, ends_at: T - 45 * 60 }), T, cfg)).toBe("free");
  });
  it("broken wins over a running cycle", () => {
    expect(computeStatus(row({ started_at: T - 600, ends_at: T + 600, broken_at: T - 10 }), T, cfg)).toBe("broken");
  });
  it("broken flag expires after the TTL", () => {
    expect(computeStatus(row({ broken_at: T - 7 * 86400 }), T, cfg)).toBe("free");
    expect(computeStatus(row({ broken_at: T - 7 * 86400 + 1 }), T, cfg)).toBe("broken");
  });
});

describe("toView", () => {
  it("reports remaining seconds and cycle length while running", () => {
    const v = toView(row({ started_at: T - 600, ends_at: T + 1200 }), T, cfg);
    expect(v.status).toBe("running");
    expect(v.remaining_s).toBe(1200);
    expect(v.cycle_min).toBe(30);
    expect(v.since_s).toBe(600);
  });
  it("hides stale broken details once expired", () => {
    const v = toView(row({ broken_at: T - 30 * 86400, broken_reports: 3, broken_note: "x" }), T, cfg);
    expect(v.status).toBe("free");
    expect(v.broken_reports).toBe(0);
    expect(v.broken_note).toBeNull();
  });
  it("never returns negative values", () => {
    const v = toView(row({ updated_at: T + 100 }), T, cfg);
    expect(v.since_s).toBe(0);
    expect(v.remaining_s).toBe(0);
  });
});

describe("validMinutes", () => {
  it("accepts integers in range only", () => {
    expect(validMinutes(45)).toBe(true);
    expect(validMinutes(1)).toBe(true);
    expect(validMinutes(180)).toBe(true);
    expect(validMinutes(0)).toBe(false);
    expect(validMinutes(181)).toBe(false);
    expect(validMinutes(45.5)).toBe(false);
    expect(validMinutes("45")).toBe(false);
    expect(validMinutes(null)).toBe(false);
  });
});

describe("busyMatrix", () => {
  it("buckets by local weekday and hour, Monday first", () => {
    // 2026-09-14 is a Monday. 10:30 UTC -> 12:30 in UTC+2.
    const t = Date.UTC(2026, 8, 14, 10, 30) / 1000;
    const m = busyMatrix([t, t], 120);
    expect(m[0]?.[12]).toBe(2);
    expect(m.flat().reduce((a, b) => a + b, 0)).toBe(2);
    // Same instant in UTC-11 lands on Sunday 23:30.
    const m2 = busyMatrix([t], -660);
    expect(m2[6]?.[23]).toBe(1);
  });
});
