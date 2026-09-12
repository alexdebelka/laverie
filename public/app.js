/* Laverie — front-end. Plain ES module, no build step.
   State lives in memory; localStorage only holds the language, the list of
   cycles started from this device ("mine") and pending local notifications. */

const API = "/api";
const POLL_MS = 30_000;
const PRESETS = { washer: [30, 45, 60, 90], dryer: [15, 30, 45, 60] };

// ---------- i18n ----------
const I18N = {
  fr: {
    syncing: "…", synced: "à jour", sync_err: "hors ligne",
    lede: "Statut partagé par les résidents. Indique quand tu lances ou récupères une machine, tout le monde en profite.",
    offline: "Hors ligne — les statuts affichés peuvent être anciens.",
    washers: "Lave-linge", dryers: "Sèche-linge",
    legend_free_w: "libre (lavage)", legend_free_d: "libre (séchage)", legend_busy: "occupée", legend_broken: "en panne",
    tab_board: "Machines", tab_busy: "Affluence", tab_info: "Infos", tab_fb: "Avis",
    busy_title: "Affluence", busy_sub: "Nombre de cycles lancés par jour et par heure sur les dernières semaines. Plus c'est foncé, plus c'est chargé.",
    busy_samples: (n, w) => n === 0 ? "Pas encore de données — elles apparaîtront au fil des cycles lancés." : `${n} cycles sur ${w} semaines · heure locale`,
    info_title: "Infos pratiques", price_wash: "Lavage", price_dry: "Séchage", pay: "Paiement",
    pay_v: "Espèces ou carte bancaire à la centrale de paiement. Le terminal CB a parfois des ratés : prévoir des espèces.",
    bills: "Billets acceptés", coins: "Pièces", how: "Comment faire",
    how_v: "Charger la machine, fermer le hublot, choisir le programme, payer à la centrale avec le numéro de la machine, revenir appuyer sur Start. Puis indiquer le lancement ici.",
    privacy_title: "Vie privée",
    privacy_v: "Pas de compte, pas de cookie, pas de suivi. L'application enregistre uniquement « machine n°X lancée à telle heure ». Le code est ouvert.",
    fb_title: "Un avis, une idée ?", fb_sub: "Anonyme. Ne mets ni ton nom ni ta chambre.", fb_label: "Message", send: "Envoyer",
    fb_ok: "Merci, c'est envoyé.", fb_err: "Envoi impossible pour le moment.", fb_rate: "Trop de messages, réessaie plus tard.",
    washer: "Lave-linge", dryer: "Sèche-linge", kg: "kg",
    st_free: "Libre", st_running: "Occupée", st_done: "Terminée", st_broken: "En panne",
    sub_free: (t) => t ? `libre depuis ${t}` : "",
    sub_running: (t) => `fin dans ${t}`,
    sub_done: (t) => `finie il y a ${t} · à récupérer`,
    sub_broken: (n, t) => `signalée ${n > 1 ? n + "× " : ""}il y a ${t}`,
    mine: "la tienne",
    machine: (k, l) => `${k} n°${l}`,
    sheet_free: "Libre. Tu viens de la lancer ?",
    sheet_running: (t) => `Occupée, fin dans ${t}.`,
    sheet_done: "Cycle terminé. Le linge est encore dedans ?",
    sheet_broken: "Signalée en panne.",
    duration: "Durée du cycle", minutes: "min", custom: "autre",
    notify_me: "Me prévenir à la fin", notify_hint: "Notification locale sur cet appareil, rien n'est envoyé au serveur. Fonctionne tant que l'app reste ouverte en arrière-plan.",
    notify_unsupported_short: "Après le lancement, tu pourras ajouter un rappel dans ton calendrier.",
    start: "Lancée !", collected: "Récupéré, machine libre", cancel: "Erreur, annuler", report_broken: "Signaler en panne",
    fixed: "Elle remarche", report_again: "Toujours en panne", note_ph: "Quel problème ? (facultatif)",
    remind: "Me prévenir à la fin", calendar: "Rappel dans mon calendrier", calendar_hint: "Crée un événement avec alarme à la fin du cycle, sur ton téléphone uniquement.", remind_set: "Rappel activé", remind_denied: "Notifications refusées par le navigateur",
    notif_title: (k, l) => `${k} n°${l} terminée`, notif_body: "Le cycle est fini, tu peux récupérer ton linge.",
    err_running: "Quelqu'un vient de la lancer.", err_minutes: "Durée entre 1 et 180 min.", err_broken: "Signalée en panne, appuie d'abord sur « Elle remarche ».", err_rate: "Trop d'actions, patiente une minute.", err_generic: "Ça n'a pas marché, réessaie.",
    days: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
    m: "min", h: "h", d: "j",
  },
  en: {
    syncing: "…", synced: "up to date", sync_err: "offline",
    lede: "Status shared by residents. Say when you start or collect a machine and everyone benefits.",
    offline: "Offline — statuses shown may be stale.",
    washers: "Washers", dryers: "Dryers",
    legend_free_w: "free (washer)", legend_free_d: "free (dryer)", legend_busy: "in use", legend_broken: "out of order",
    tab_board: "Machines", tab_busy: "Busy hours", tab_info: "Info", tab_fb: "Feedback",
    busy_title: "Busy hours", busy_sub: "Cycles started per weekday and hour over the last weeks. Darker means busier.",
    busy_samples: (n, w) => n === 0 ? "No data yet — it fills in as cycles are started." : `${n} cycles over ${w} weeks · local time`,
    info_title: "Practical info", price_wash: "Wash", price_dry: "Dry", pay: "Payment",
    pay_v: "Cash or bank card at the payment terminal. The card reader is sometimes flaky: bring cash as a backup.",
    bills: "Notes accepted", coins: "Coins", how: "How it works",
    how_v: "Load the machine, close the door, pick a program, pay at the terminal with the machine number, come back and press Start. Then mark it as started here.",
    privacy_title: "Privacy",
    privacy_v: "No account, no cookies, no tracking. The app only stores “machine X started at this time”. The code is open source.",
    fb_title: "Feedback or ideas?", fb_sub: "Anonymous. Don't include your name or room.", fb_label: "Message", send: "Send",
    fb_ok: "Thanks, sent.", fb_err: "Could not send right now.", fb_rate: "Too many messages, try again later.",
    washer: "Washer", dryer: "Dryer", kg: "kg",
    st_free: "Free", st_running: "In use", st_done: "Done", st_broken: "Out of order",
    sub_free: (t) => t ? `free for ${t}` : "",
    sub_running: (t) => `ends in ${t}`,
    sub_done: (t) => `finished ${t} ago · not collected`,
    sub_broken: (n, t) => `reported ${n > 1 ? n + "× " : ""}${t} ago`,
    mine: "yours",
    machine: (k, l) => `${k} #${l}`,
    sheet_free: "Free. Did you just start it?",
    sheet_running: (t) => `In use, ends in ${t}.`,
    sheet_done: "Cycle finished. Laundry still inside?",
    sheet_broken: "Reported out of order.",
    duration: "Cycle length", minutes: "min", custom: "other",
    notify_me: "Notify me when done", notify_hint: "Local notification on this device only; nothing is sent to the server. Works while the app stays open in the background.",
    notify_unsupported_short: "After starting, you can add a reminder to your calendar.",
    start: "Started!", collected: "Collected, machine is free", cancel: "Mistake, cancel", report_broken: "Report out of order",
    fixed: "It works again", report_again: "Still broken", note_ph: "What's wrong? (optional)",
    remind: "Notify me when done", calendar: "Reminder in my calendar", calendar_hint: "Creates a calendar event with an alarm at the end of the cycle, on your phone only.", remind_set: "Reminder set", remind_denied: "Notifications blocked by the browser",
    notif_title: (k, l) => `${k} #${l} finished`, notif_body: "The cycle is done, you can collect your laundry.",
    err_running: "Someone just started it.", err_minutes: "Length must be 1–180 min.", err_broken: "Reported out of order, tap \"It works again\" first.", err_rate: "Too many actions, wait a minute.", err_generic: "That didn't work, try again.",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    m: "min", h: "h", d: "d",
  },
};

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

let lang = store.get("lang", (navigator.language || "fr").startsWith("fr") ? "fr" : "en");
const t = (k, ...a) => { const v = I18N[lang][k]; return typeof v === "function" ? v(...a) : (v ?? k); };

// ---------- state ----------
const state = {
  machines: [],
  fetchedAt: 0,          // client ms when the last snapshot arrived
  serverNow: 0,          // server unix seconds at that moment
  mine: store.get("mine", {}),         // { [id]: startedAtServerSeconds }
  reminders: store.get("reminders", {}), // { [id]: endsAtServerSeconds }
  open: null,            // machine id open in the sheet
  sheetStatus: null,     // status the open sheet was rendered for
};

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, attrs = {}, ...children) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) n.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined) n.append(c);
  return n;
};

/** replaceChildren that ignores null/undefined (conditional elements). */
const fill = (node, ...kids) => node.replaceChildren(...kids.filter((k) => k !== null && k !== undefined));

const nowServer = () => state.serverNow + (Date.now() - state.fetchedAt) / 1000;

function fmtDuration(s) {
  s = Math.max(0, Math.round(s));
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} ${t("m")}`;
  const h = Math.floor(m / 60), rm = m % 60;
  if (h < 24) return rm ? `${h} ${t("h")} ${String(rm).padStart(2, "0")}` : `${h} ${t("h")}`;
  return `${Math.floor(h / 24)} ${t("d")}`;
}

/** Recompute a machine's live status from the last snapshot, without the server. */
function live(m) {
  const elapsed = nowServer() - state.serverNow;
  const grace = (state.config?.doneGraceMin ?? 45) * 60;
  if (m.status === "running") {
    const rem = m.remaining_s - elapsed;
    if (rem > 0) return { ...m, remaining_s: rem, since_s: m.since_s + elapsed };
    const over = -rem;
    if (over < grace) return { ...m, status: "done", remaining_s: 0, since_s: over };
    return { ...m, status: "free", remaining_s: 0, since_s: 0 };
  }
  if (m.status === "done" && m.since_s + elapsed >= grace) return { ...m, status: "free", since_s: 0 };
  return { ...m, since_s: m.since_s + elapsed };
}

// ---------- rendering ----------
function applyI18n() {
  document.documentElement.lang = lang;
  $("#lang").textContent = lang === "fr" ? "EN" : "FR";
  document.querySelectorAll("[data-i18n]").forEach((n) => { n.textContent = t(n.dataset.i18n); });
  $("#fb-message").placeholder = lang === "fr" ? "Par exemple : la machine 4 laisse le linge trempé…" : "For example: machine 4 leaves clothes soaking wet…";
  $("#sync").textContent = state.fetchedAt ? t("synced") : t("syncing");
}

function card(m) {
  const kindLabel = t(m.kind);
  const mine = state.mine[m.id] !== undefined && (m.status === "running" || m.status === "done");
  let sub, statusLabel = t(`st_${m.status}`);
  switch (m.status) {
    case "running": sub = t("sub_running", fmtDuration(m.remaining_s)); break;
    case "done": sub = t("sub_done", fmtDuration(m.since_s)); break;
    case "broken": sub = t("sub_broken", m.broken_reports, fmtDuration(m.since_s)); break;
    default: sub = t("sub_free", m.since_s > 120 ? fmtDuration(m.since_s) : "");
  }
  const progress = m.status === "running" && m.cycle_min ? 100 * (1 - m.remaining_s / (m.cycle_min * 60)) : m.status === "done" ? 100 : 0;
  return el("button", { class: "card", type: "button", "data-kind": m.kind, "data-status": m.status, "data-mine": mine ? "true" : null, "aria-label": `${t("machine", kindLabel, m.label)} — ${statusLabel}`, onclick: () => openSheet(m.id) },
    el("div", { class: "card__head" },
      el("span", { class: "card__num" }, m.label),
      el("span", { class: "card__kind" }, kindLabel, m.capacity_kg ? el("span", { class: "kg" }, ` · ${m.capacity_kg} ${t("kg")}`) : null),
    ),
    el("span", { class: "pill" }, el("i", { class: "pill__dot" }), statusLabel, mine ? ` · ${t("mine")}` : ""),
    el("div", { class: "card__sub" }, m.status === "broken" && m.broken_note ? el("span", {}, el("strong", {}, m.broken_note), ` · ${sub}`) : sub),
    (m.status === "running" || m.status === "done") ? el("div", { class: "bar" }, el("i", { style: `width:${Math.min(100, Math.max(0, progress))}%` })) : null,
  );
}

function renderBoard() {
  const ms = state.machines.map(live);
  const w = $("#washers"), d = $("#dryers");
  w.replaceChildren(...ms.filter((m) => m.kind === "washer").map(card));
  d.replaceChildren(...ms.filter((m) => m.kind === "dryer").map(card));
  if (state.open !== null) {
    // Only rebuild the sheet when the machine's status changed; otherwise just
    // refresh the countdown text, so typed input is never wiped mid-edit.
    const m = ms.find((x) => x.id === state.open);
    if (!m) closeSheet();
    else if (m.status !== state.sheetStatus) renderSheet();
    else if (m.status === "running") $("#sheet-sub").textContent = t("sheet_running", fmtDuration(m.remaining_s));
  }
}

// ---------- sheet ----------
function openSheet(id) { state.open = id; $("#sheet").hidden = false; renderSheet(); }
function closeSheet() { state.open = null; state.sheetStatus = null; $("#sheet").hidden = true; }

function renderSheet() {
  const raw = state.machines.find((x) => x.id === state.open);
  if (!raw) return closeSheet();
  const m = live(raw);
  state.sheetStatus = m.status;
  const kindLabel = t(m.kind);
  $("#sheet-title").textContent = t("machine", kindLabel, m.label);
  const body = $("#sheet-body");
  const btnTone = m.kind === "washer" ? "btn--washer" : "btn--dryer";

  const brokenBtn = (label) => el("button", { class: "btn btn--danger", type: "button", onclick: () => askBroken(m) }, label);

  if (m.status === "free") {
    $("#sheet-sub").textContent = t("sheet_free");
    let minutes = PRESETS[m.kind][1];
    const chips = PRESETS[m.kind].map((v) => el("button", { class: "chip", type: "button", "aria-pressed": String(v === minutes), onclick: (e) => { minutes = v; input.value = v; chips.forEach((c) => c.setAttribute("aria-pressed", String(c === e.currentTarget))); } }, `${v} ${t("minutes")}`));
    const input = el("input", { type: "number", id: "minutes", min: 1, max: 180, step: 1, value: minutes, inputmode: "numeric",
      oninput: (e) => { minutes = Number(e.target.value); chips.forEach((c) => c.setAttribute("aria-pressed", "false")); } });
    const canNotify = "Notification" in window;
    const notify = el("input", { type: "checkbox", id: "notify", checked: canNotify && Notification.permission === "granted" ? "" : null });
    fill(body, 
      el("p", { class: "hint" }, t("duration")),
      el("div", { class: "chips" }, ...chips),
      el("div", { class: "field" }, el("label", { for: "minutes", class: "muted small" }, t("custom")), input, el("span", { class: "muted small" }, t("minutes"))),
      canNotify ? el("label", { class: "check", for: "notify" }, notify, t("notify_me")) : null,
      el("p", { class: "hint" }, canNotify ? t("notify_hint") : t("notify_unsupported_short")),
      el("div", { class: "actions" },
        el("button", { class: `btn ${btnTone} btn--block`, type: "button", onclick: () => doStart(m, minutes, notify.checked) }, t("start")),
        brokenBtn(t("report_broken")),
      ),
    );
  } else if (m.status === "running" || m.status === "done") {
    $("#sheet-sub").textContent = m.status === "running" ? t("sheet_running", fmtDuration(m.remaining_s)) : t("sheet_done");
    const hasReminder = state.reminders[m.id] !== undefined;
    fill(body, 
      el("div", { class: "actions" },
        el("button", { class: "btn btn--primary btn--block", type: "button", onclick: () => act(m, "collect", {}, t("collected")) }, t("collected")),
        m.status === "running" && "Notification" in window
          ? el("button", { class: "btn", type: "button", disabled: hasReminder ? "" : null, onclick: () => setReminder(m) }, hasReminder ? t("remind_set") : t("remind"))
          : null,
        m.status === "running" ? el("a", { class: "btn", href: icsUrl(m), target: "_blank", rel: "noopener" }, t("calendar")) : null,
        m.status === "running" ? el("p", { class: "hint" }, t("calendar_hint")) : null,
        m.status === "running" && state.mine[m.id] !== undefined
          ? el("button", { class: "btn", type: "button", onclick: () => act(m, "cancel", {}, null) }, t("cancel"))
          : null,
        brokenBtn(t("report_broken")),
      ),
    );
  } else {
    $("#sheet-sub").textContent = t("sheet_broken") + (m.broken_note ? ` « ${m.broken_note} »` : "");
    fill(body, 
      el("div", { class: "actions" },
        el("button", { class: "btn btn--primary btn--block", type: "button", onclick: () => act(m, "fixed", {}, null) }, t("fixed")),
        brokenBtn(t("report_again")),
      ),
    );
  }
}

function askBroken(m) {
  const note = el("input", { type: "text", id: "note", maxlength: 140, placeholder: t("note_ph") });
  fill($("#sheet-body"), 
    el("div", { class: "field" }, note),
    el("div", { class: "actions" },
      el("button", { class: "btn btn--danger btn--block", type: "button", onclick: () => act(m, "broken", { note: note.value }, null) }, t("report_broken")),
    ),
  );
  note.focus();
}

// ---------- API ----------
async function api(path, opts = {}) {
  const r = await fetch(API + path, { headers: { "content-type": "application/json" }, ...opts });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || r.statusText), { code: data.error, status: r.status });
  return data;
}

async function refresh() {
  try {
    const data = await api("/machines");
    state.machines = data.machines;
    state.config = data.config;
    state.serverNow = data.now;
    state.fetchedAt = Date.now();
    // Forget "mine" entries once the machine is free again or was restarted by someone else.
    for (const [id, started] of Object.entries(state.mine)) {
      const m = data.machines.find((x) => x.id === Number(id));
      const gone = !m || m.status === "free" || m.status === "broken";
      const restarted = m?.status === "running" && Math.abs(data.now - m.since_s - started) > 90;
      if (gone || restarted) delete state.mine[id];
    }
    store.set("mine", state.mine);
    $("#sync").textContent = t("synced");
    $("#sync").classList.remove("is-error");
    $("#offline").hidden = true;
    renderBoard();
  } catch {
    $("#sync").textContent = t("sync_err");
    $("#sync").classList.add("is-error");
    $("#offline").hidden = false;
  }
}

async function act(m, action, body, successMsg) {
  try {
    const data = await api(`/machines/${m.id}/${action}`, { method: "POST", body: JSON.stringify(body) });
    if (action === "start") state.mine[m.id] = data.now;
    if (action !== "start") { delete state.mine[m.id]; clearReminder(m.id); }
    store.set("mine", state.mine);
    closeSheet();
    await refresh();
    if (successMsg) toast(successMsg);
    return data;
  } catch (e) {
    toast(e.code === "already_running" ? t("err_running") : e.code === "invalid_minutes" ? t("err_minutes") : e.code === "broken" ? t("err_broken") : e.status === 429 ? t("err_rate") : t("err_generic"));
    await refresh();
    return null;
  }
}

async function doStart(m, minutes, notify) {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) return toast(t("err_minutes"));
  // Ask for permission first, while we are still inside the user's tap.
  let granted = false;
  if (notify && "Notification" in window) {
    granted = (Notification.permission === "granted" ? "granted" : await Notification.requestPermission()) === "granted";
  }
  const data = await act(m, "start", { minutes }, t("start"));
  if (!data) return;
  if (notify && !granted) toast(t("remind_denied"));
  if (granted) setReminder({ ...m, remaining_s: minutes * 60, kind: m.kind, label: m.label }, data.now + minutes * 60);
  if (!("Notification" in window)) openSheet(m.id); // show the calendar reminder button
}

function icsUrl(m) {
  const ends = Math.round(nowServer() + m.remaining_s);
  return `${API}/reminder.ics?ends=${ends}&label=${encodeURIComponent(m.label)}&kind=${m.kind}&lang=${lang}`;
}

// ---------- notifications (local only) ----------
const timers = new Map();

async function setReminder(m, endsAtServer) {
  if (!("Notification" in window)) return;
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") return toast(t("remind_denied"));
  const endsAt = endsAtServer ?? nowServer() + m.remaining_s;
  state.reminders[m.id] = endsAt;
  store.set("reminders", state.reminders);
  scheduleReminders();
  toast(t("remind_set"));
  if (state.open === m.id) renderSheet();
}

function clearReminder(id) {
  delete state.reminders[id];
  store.set("reminders", state.reminders);
  const tm = timers.get(id);
  if (tm) { clearTimeout(tm); timers.delete(id); }
}

function scheduleReminders() {
  for (const [id, endsAt] of Object.entries(state.reminders)) {
    if (timers.has(Number(id))) continue;
    const delay = Math.max(0, (endsAt - nowServer()) * 1000);
    timers.set(Number(id), setTimeout(() => fireReminder(Number(id)), delay));
  }
}

async function fireReminder(id) {
  timers.delete(id);
  if (state.reminders[id] === undefined) return;
  clearReminder(id);
  const m = state.machines.find((x) => x.id === id);
  const title = t("notif_title", t(m?.kind ?? "washer"), m?.label ?? id);
  const opts = { body: t("notif_body"), icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: `laverie-${id}` };
  if (Notification.permission !== "granted") return;
  try {
    const reg = await Promise.race([navigator.serviceWorker?.ready, new Promise((r) => setTimeout(() => r(null), 1500))]);
    if (reg?.showNotification) await reg.showNotification(title, opts);
    else new Notification(title, opts);
  } catch {
    try { new Notification(title, opts); } catch { /* ignore */ }
  }
  toast(title);
}

// ---------- busy hours ----------
async function renderBusy() {
  const heat = $("#heat");
  try {
    const tz = -new Date().getTimezoneOffset();
    const data = await api(`/busy?tz=${tz}`);
    const max = Math.max(1, ...data.matrix.flat());
    const nowD = new Date(), nowDay = (nowD.getDay() + 6) % 7, nowHr = nowD.getHours();
    const nodes = [el("span")];
    for (let h = 0; h < 24; h++) nodes.push(el("span", { class: "heat__hr" }, h % 3 === 0 ? String(h) : ""));
    data.matrix.forEach((row, d) => {
      nodes.push(el("span", { class: "heat__lbl" }, t("days")[d]));
      row.forEach((v, h) => nodes.push(el("span", { class: "heat__cell", style: `--v:${(v / max).toFixed(2)}`, title: `${t("days")[d]} ${h}h · ${v}`, "data-now": d === nowDay && h === nowHr ? "true" : null })));
    });
    heat.replaceChildren(...nodes);
    // On narrow screens the grid scrolls sideways: bring the current hour into view.
    const wrap = heat.parentElement, nowCell = heat.querySelector('[data-now="true"]');
    if (wrap && nowCell) wrap.scrollLeft = Math.max(0, nowCell.offsetLeft - wrap.clientWidth / 2);
    $("#busy-samples").textContent = t("busy_samples", data.samples, data.weeks);
  } catch {
    $("#busy-samples").textContent = t("sync_err");
  }
}

// ---------- feedback ----------
function initFeedback() {
  const form = $("#fb-form"), msg = $("#fb-message"), count = $("#fb-count"), status = $("#fb-status");
  msg.addEventListener("input", () => { count.textContent = `${msg.value.length} / 500`; });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.className = "small";
    const btn = form.querySelector("button"); btn.disabled = true;
    try {
      await api("/feedback", { method: "POST", body: JSON.stringify({ message: msg.value }) });
      status.textContent = t("fb_ok"); status.classList.add("is-ok");
      msg.value = ""; count.textContent = "0 / 500";
    } catch (err) {
      status.textContent = err.status === 429 ? t("fb_rate") : t("fb_err"); status.classList.add("is-err");
    } finally { btn.disabled = false; }
  });
}

// ---------- tabs / misc ----------
function showTab(name) {
  document.querySelectorAll(".view").forEach((v) => { v.hidden = v.dataset.view !== name; });
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === name));
  if (name === "busy") renderBusy();
  window.scrollTo({ top: 0 });
}

function toast(text) {
  const n = $("#toast");
  n.textContent = text; n.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { n.hidden = true; }, 2600);
}

function init() {
  applyI18n();
  $("#lang").addEventListener("click", () => { lang = lang === "fr" ? "en" : "fr"; store.set("lang", lang); applyI18n(); renderBoard(); if (!$("#view-busy").hidden) renderBusy(); });
  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
  $("#sheet").addEventListener("click", (e) => { if (e.target.hasAttribute("data-close")) closeSheet(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && state.open !== null) closeSheet(); });
  initFeedback();

  refresh();
  setInterval(refresh, POLL_MS);
  setInterval(() => { if (state.machines.length && !document.hidden) renderBoard(); }, 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { refresh(); scheduleReminders(); } });
  window.addEventListener("online", refresh);

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  scheduleReminders();
}

init();
