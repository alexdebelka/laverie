import { Hono } from "hono";
import { cors } from "hono/cors";
import { allow } from "./ratelimit";
import {
  busyMatrix,
  computeStatus,
  toView,
  validMinutes,
  type Config,
  type MachineRow,
} from "./status";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  DONE_GRACE_MIN?: string;
  BROKEN_TTL_DAYS?: string;
  EVENT_RETENTION_WEEKS?: string;
}

type App = { Bindings: Env };

const app = new Hono<App>();

const nowS = (): number => Math.floor(Date.now() / 1000);

function config(env: Env): Config {
  return {
    doneGraceMin: Number(env.DONE_GRACE_MIN ?? 45),
    brokenTtlDays: Number(env.BROKEN_TTL_DAYS ?? 7),
  };
}

function clientIp(c: { req: { header: (n: string) => string | undefined } }): string {
  return c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "local";
}

async function getMachine(db: D1Database, id: number): Promise<MachineRow | null> {
  return db.prepare("SELECT * FROM machines WHERE id = ?").bind(id).first<MachineRow>();
}

async function logEvent(db: D1Database, machineId: number, action: string, minutes: number | null, at: number) {
  await db
    .prepare("INSERT INTO events (machine_id, action, minutes, at) VALUES (?, ?, ?, ?)")
    .bind(machineId, action, minutes, at)
    .run();
}

async function pruneEvents(db: D1Database, env: Env, at: number) {
  const weeks = Number(env.EVENT_RETENTION_WEEKS ?? 8);
  await db.prepare("DELETE FROM events WHERE at < ?").bind(at - weeks * 7 * 86400).run();
}

// ---------- middleware ----------

app.use("/api/*", cors({ origin: "*", allowMethods: ["GET", "POST"] }));
app.use("/api/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});

// ---------- read ----------

app.get("/api/health", (c) => c.json({ ok: true, now: nowS() }));

app.get("/api/machines", async (c) => {
  const now = nowS();
  const cfg = config(c.env);
  const { results } = await c.env.DB.prepare("SELECT * FROM machines ORDER BY kind DESC, id").all<MachineRow>();
  return c.json({
    now,
    config: cfg,
    machines: results.map((r) => toView(r, now, cfg)),
  });
});

app.get("/api/busy", async (c) => {
  const tz = Number(c.req.query("tz") ?? 0);
  const tzOffsetMin = Number.isFinite(tz) ? Math.max(-840, Math.min(840, Math.round(tz))) : 0;
  const now = nowS();
  const weeks = Number(c.env.EVENT_RETENTION_WEEKS ?? 8);
  const { results } = await c.env.DB.prepare(
    "SELECT at FROM events WHERE action = 'start' AND at >= ?",
  )
    .bind(now - weeks * 7 * 86400)
    .all<{ at: number }>();
  const times = results.map((r) => r.at);
  return c.json({ weeks, samples: times.length, tz_offset_min: tzOffsetMin, matrix: busyMatrix(times, tzOffsetMin) });
});

// Calendar reminder: an .ics event that ends when the cycle ends. Everything comes from the
// query string; nothing is stored or logged. Works on every phone without installing the app.
app.get("/api/reminder.ics", (c) => {
  const ends = Number(c.req.query("ends"));
  const label = (c.req.query("label") ?? "").replace(/[^\w\s#°-]/g, "").slice(0, 40) || "?";
  const kind = c.req.query("kind") === "dryer" ? "dryer" : "washer";
  const lang = c.req.query("lang") === "en" ? "en" : "fr";
  const now = nowS();
  if (!Number.isFinite(ends) || ends < now - 3600 || ends > now + 24 * 3600) return c.json({ error: "invalid_time" }, 400);
  const title = lang === "fr"
    ? `${kind === "dryer" ? "Sèche-linge" : "Lave-linge"} n°${label} terminé`
    : `${kind === "dryer" ? "Dryer" : "Washer"} #${label} finished`;
  const body = lang === "fr" ? "Le cycle est fini, tu peux récupérer ton linge." : "The cycle is done, you can collect your laundry.";
  const fmt = (t: number) => new Date(t * 1000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const url = new URL(c.req.url).origin;
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Laverie//reminder//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@laverie`,
    `DTSTAMP:${fmt(now)}`, `DTSTART:${fmt(ends)}`, `DTEND:${fmt(ends + 15 * 60)}`,
    `SUMMARY:${title}`, `DESCRIPTION:${body}`, `URL:${url}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${title}`, "TRIGGER:PT0M", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
  return c.body(ics, 200, {
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": `attachment; filename="laverie-${label}.ics"`,
    "Cache-Control": "no-store",
  });
});

// ---------- write ----------

type Action = "start" | "collect" | "cancel" | "broken" | "fixed";
const ACTIONS: Action[] = ["start", "collect", "cancel", "broken", "fixed"];

app.post("/api/machines/:id/:action", async (c) => {
  const id = Number(c.req.param("id"));
  const action = c.req.param("action") as Action;
  if (!Number.isInteger(id) || !ACTIONS.includes(action)) return c.json({ error: "not_found" }, 404);

  if (!(await allow(clientIp(c), "machine", 30, 60_000))) return c.json({ error: "rate_limited" }, 429);

  const body = (await c.req.json().catch(() => ({}))) as { minutes?: unknown; note?: unknown };
  const now = nowS();
  const cfg = config(c.env);
  const db = c.env.DB;

  const row = await getMachine(db, id);
  if (!row) return c.json({ error: "not_found" }, 404);
  const status = computeStatus(row, now, cfg);

  switch (action) {
    case "start": {
      if (!validMinutes(body.minutes)) return c.json({ error: "invalid_minutes" }, 400);
      if (status === "running") return c.json({ error: "already_running" }, 409);
      if (status === "broken") return c.json({ error: "broken" }, 409);
      await db
        .prepare("UPDATE machines SET started_at = ?, ends_at = ?, updated_at = ? WHERE id = ?")
        .bind(now, now + body.minutes * 60, now, id)
        .run();
      await logEvent(db, id, "start", body.minutes, now);
      c.executionCtx.waitUntil(pruneEvents(db, c.env, now));
      break;
    }
    case "collect":
    case "cancel": {
      if (status !== "running" && status !== "done") return c.json({ error: "not_running" }, 409);
      await db
        .prepare("UPDATE machines SET started_at = NULL, ends_at = NULL, updated_at = ? WHERE id = ?")
        .bind(now, id)
        .run();
      await logEvent(db, id, action, null, now);
      break;
    }
    case "broken": {
      const note = typeof body.note === "string" ? body.note.trim().slice(0, 140) : null;
      await db
        .prepare(
          "UPDATE machines SET broken_at = ?, broken_reports = broken_reports + 1, broken_note = COALESCE(?, broken_note), started_at = NULL, ends_at = NULL, updated_at = ? WHERE id = ?",
        )
        .bind(now, note && note.length > 0 ? note : null, now, id)
        .run();
      await logEvent(db, id, "broken", null, now);
      break;
    }
    case "fixed": {
      if (status !== "broken") return c.json({ error: "not_broken" }, 409);
      await db
        .prepare("UPDATE machines SET broken_at = NULL, broken_reports = 0, broken_note = NULL, updated_at = ? WHERE id = ?")
        .bind(now, id)
        .run();
      await logEvent(db, id, "fixed", null, now);
      break;
    }
  }

  const updated = await getMachine(db, id);
  return c.json({ now, machine: updated ? toView(updated, now, cfg) : null });
});

app.post("/api/feedback", async (c) => {
  if (!(await allow(clientIp(c), "feedback", 5, 10 * 60_000))) return c.json({ error: "rate_limited" }, 429);
  const body = (await c.req.json().catch(() => ({}))) as { message?: unknown };
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 3 || message.length > 500) return c.json({ error: "invalid_message" }, 400);
  await c.env.DB.prepare("INSERT INTO feedback (message, created_at) VALUES (?, ?)").bind(message, nowS()).run();
  return c.json({ ok: true });
});

app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "server_error" }, 500);
});

export default app;
