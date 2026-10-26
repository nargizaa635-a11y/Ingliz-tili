// pomodoro.js — diqqatni boshqarish taymeri. Vaqt FAQAT soat tamg‘alari (Date.now) bo‘yicha hisoblanadi:
// sahifa yopilsa yoki fonda qolsa ham holat tiklanadi. Taymer darslarni hech qachon bloklamaydi.
import { h, toast } from "./ui.js";
import { register, go } from "./nav.js";
import { state, getMeta, setMeta, putRec } from "./store.js";
import { dateKey } from "./memory.js";

export const PRESETS = [{ focus: 25, rest: 5 }, { focus: 15, rest: 5 }, { focus: 45, rest: 10 }];
export const BREAK_TIPS = [
  "Ekrandan ko‘zingizni uzing va 20 soniya uzoqqa qarang.",
  "O‘rningizdan turing, yelka va bo‘yningizni yoying.",
  "Bir stakan suv iching.",
];
const MS = 60000;
const clampInt = (v, lo, hi, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
export const normCfg = (c = {}) => ({ focus: clampInt(c.focus, 1, 180, 25), rest: clampInt(c.rest, 1, 60, 5) });

/* ---------- Sof mantiq (testlanadi) ---------- */
export function initialState(cfg) {
  return { cfg: normCfg(cfg), phase: "focus", status: "idle", elapsedMs: 0, resumedAt: null, phaseStart: null };
}
export const phaseMs = (st) => (st.phase === "focus" ? st.cfg.focus : st.cfg.rest) * MS;
export function remainingMs(st, now = Date.now()) {
  if (st.status === "idle") return phaseMs(st);
  const run = st.status === "running" && st.resumedAt != null ? Math.max(0, now - st.resumedAt) : 0;
  return Math.max(0, phaseMs(st) - st.elapsedMs - run);
}
export function startTimer(st, now = Date.now()) {
  return st.status === "idle" ? { ...st, status: "running", elapsedMs: 0, resumedAt: now, phaseStart: now } : st;
}
export function pauseTimer(st, now = Date.now()) {
  return st.status === "running" ? { ...st, status: "paused", elapsedMs: st.elapsedMs + Math.max(0, now - st.resumedAt), resumedAt: null } : st;
}
export function resumeTimer(st, now = Date.now()) {
  return st.status === "paused" ? { ...st, status: "running", resumedAt: now } : st;
}
export const resetTimer = (st) => initialState(st.cfg);

/**
 * Vaqt tugagan bo‘lsa keyingi bosqichga o‘tkazadi. Qaytaradi: { state, events }.
 * Sahifa uzoq vaqt yopiq turgan bo‘lsa ham (soat bo‘yicha) to‘g‘ri hisoblanadi; seans bir marta yoziladi (id = boshlanish vaqti).
 */
export function advance(st, now = Date.now()) {
  if (st.status !== "running" || remainingMs(st, now) > 0) return { state: st, events: [] };
  const over = st.elapsedMs + (now - st.resumedAt) - phaseMs(st);
  if (st.phase === "focus") {
    const events = [{ type: "focusDone", id: `focus:${st.phaseStart}`, minutes: st.cfg.focus, endedAt: now - over }];
    if (over >= st.cfg.rest * MS) { events.push({ type: "breakDone" }); return { state: initialState(st.cfg), events }; }
    return { state: { ...st, phase: "break", status: "running", elapsedMs: 0, resumedAt: now - over, phaseStart: now - over }, events };
  }
  return { state: initialState(st.cfg), events: [{ type: "breakDone" }] };
}

/* ---------- Saqlash va holat ---------- */
let T = null;
let seen; // T qaysi saqlangan qiymatga mos: zaxira tiklansa yoki hamma narsa o‘chirilsa meta o‘zgaradi va eski T tashlanadi
export function timer() {
  const saved = getMeta("pomodoro");
  if (!T || saved !== seen) { T = saved && saved.cfg ? { ...initialState(saved.cfg), ...saved, cfg: normCfg(saved.cfg) } : initialState(); seen = saved; }
  return T;
}
async function commit(next) { T = next; seen = next; await setMeta("pomodoro", next); }

function showAlert(title, text) {
  if (typeof document === "undefined") return; // sinov muhiti
  const old = document.getElementById("pomo-alert"); if (old) old.remove();
  const box = h("div", { class: "overlay", id: "pomo-alert" }, h("div", { class: "dialog", role: "alertdialog", "aria-modal": "true" }, h("h3", null, title), h("p", null, text),
    h("div", { class: "row" }, h("button", { class: "btn", type: "button", onClick: () => box.remove() }, "Tushunarli"))));
  document.body.append(box);
  try { if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(title, { body: text }); } catch { /* ignore */ }
  try { if (navigator.vibrate) navigator.vibrate(200); } catch { /* ignore */ }
}

/** Vaqt tugaganini tekshiradi: seansni yozadi, vizual bildirishnoma chiqaradi. */
export async function sync(now = Date.now()) {
  const { state: next, events } = advance(timer(), now);
  if (!events.length) return [];
  for (const ev of events) {
    if (ev.type === "focusDone") {
      await putRec("sessions", { id: ev.id, ts: ev.endedAt, kind: "focus", minutes: ev.minutes });
      showAlert("Diqqat vaqti tugadi", `${ev.minutes} daqiqa o‘qidingiz. Tanaffus: ${BREAK_TIPS[Math.floor(Math.random() * BREAK_TIPS.length)]}`);
    } else if (ev.type === "breakDone") showAlert("Tanaffus tugadi", "Tayyor bo‘lsangiz, keyingi diqqat vaqtini boshlang.");
  }
  await commit(next);
  return events;
}

export async function act(kind, now = Date.now()) {
  await sync(now);
  const t = timer();
  if (kind === "start") await commit(startTimer(t, now));
  else if (kind === "pause") await commit(pauseTimer(t, now));
  else if (kind === "resume") await commit(resumeTimer(t, now));
  else if (kind === "reset") await commit(resetTimer(t));
  else if (kind === "skip") await commit(initialState(t.cfg));
}
export async function setConfig(cfg) { await commit(initialState(cfg)); }

/** Kunlik reja bilan bog‘lash: taymer to‘xtab turgan bo‘lsa ishga tushiradi (darslarni cheklamaydi). */
export async function ensureRunning(now = Date.now()) {
  await sync(now);
  if (timer().status === "idle" && timer().phase === "focus") await commit(startTimer(timer(), now));
}

export function pomoStats(now = Date.now()) {
  const focus = [...state.sessions.values()].filter((s) => s.kind === "focus");
  const tk = dateKey(now), weekFrom = now - 7 * 86400000;
  const today = focus.filter((s) => dateKey(s.ts) === tk), week = focus.filter((s) => s.ts >= weekFrom);
  const sum = (a) => a.reduce((s, x) => s + x.minutes, 0);
  return { todayCount: today.length, todayMinutes: sum(today), weekCount: week.length, weekMinutes: sum(week), totalCount: focus.length, totalMinutes: sum(focus) };
}

const fmt = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };

/* ---------- Pastdagi kichik ko‘rsatkich (hamma ekranda) va global tekshiruv ---------- */
export function startTicker() {
  const pill = h("button", { class: "pomo-pill", id: "pomo-pill", type: "button", hidden: true, "aria-label": "Pomodoro taymeri", onClick: () => go("pomodoro") });
  document.body.append(pill);
  const tick = async () => {
    try { await sync(); } catch (e) { console.error(e); }
    const t = timer();
    pill.hidden = t.status === "idle";
    if (!pill.hidden) pill.textContent = `${t.phase === "focus" ? "Diqqat" : "Tanaffus"} ${fmt(remainingMs(t))}${t.status === "paused" ? " ⏸" : ""}`;
  };
  setInterval(tick, 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
  tick();
}

/* ---------- Ekran ---------- */
let repaint = null;
register("pomodoro", () => {
  if (repaint) { clearInterval(repaint); repaint = null; }
  const t = timer();
  const display = h("div", { class: "pomo-time", role: "timer", "aria-live": "off" }, fmt(remainingMs(t)));
  const phaseEl = h("div", { class: "pomo-phase" }, t.phase === "focus" ? "Diqqat vaqti" : "Tanaffus");
  const refresh = async () => { const now = Date.now(); await sync(now); const c = timer(); display.textContent = fmt(remainingMs(c, now)); phaseEl.textContent = c.phase === "focus" ? "Diqqat vaqti" : "Tanaffus"; };
  repaint = setInterval(() => { if (!document.body.contains(display)) { clearInterval(repaint); repaint = null; return; } refresh(); }, 500);
  const rerender = async (kind) => { await act(kind); go("pomodoro", {}, { replace: true }); };
  const btn = (label, kind, cls = "") => h("button", { class: "btn " + cls, type: "button", onClick: () => rerender(kind) }, label);
  const controls = t.status === "idle" ? [btn("Boshlash", "start", "big")]
    : t.status === "running" ? [btn("Pauza", "pause", "big"), btn("Qayta boshlash", "reset", "ghost")]
    : [btn("Davom ettirish", "resume", "big"), btn("Qayta boshlash", "reset", "ghost")];
  if (t.phase === "break" && t.status !== "idle") controls.push(btn("Tanaffusni o‘tkazib yuborish", "skip", "ghost"));
  const f = h("input", { type: "number", class: "inp", min: 1, max: 180, value: t.cfg.focus, inputmode: "numeric", "aria-label": "Diqqat daqiqalari" });
  const r = h("input", { type: "number", class: "inp", min: 1, max: 60, value: t.cfg.rest, inputmode: "numeric", "aria-label": "Tanaffus daqiqalari" });
  const st = pomoStats();
  const canNotify = typeof Notification !== "undefined" && Notification.permission === "default";
  return h("div", { class: "page" }, h("h1", null, "Pomodoro"),
    h("div", { class: "card pomo" }, phaseEl, display,
      t.phase === "break" ? h("ul", { class: "small" }, BREAK_TIPS.map((x) => h("li", null, x))) : null,
      h("div", { class: "row" }, controls)),
    h("div", { class: "card" }, h("h3", null, "Davomiylik"),
      h("div", { class: "chips" }, PRESETS.map((p) => h("button", { class: "chip" + (t.cfg.focus === p.focus && t.cfg.rest === p.rest ? " on" : ""), type: "button", onClick: async () => { await setConfig(p); go("pomodoro", {}, { replace: true }); } }, `${p.focus}/${p.rest}`))),
      h("div", { class: "row" }, h("label", { class: "field" }, "O‘qish (daq): ", f), h("label", { class: "field" }, "Tanaffus (daq): ", r)),
      h("button", { class: "btn ghost small", type: "button", onClick: async () => { await setConfig({ focus: f.value, rest: r.value }); toast("Saqlandi"); go("pomodoro", {}, { replace: true }); } }, "Saqlash"),
      h("p", { class: "small muted" }, "Sozlama o‘zgarsa taymer qayta boshlanadi.")),
    h("div", { class: "card" }, h("h3", null, "Statistika"),
      h("div", { class: "kv" }, [["Bugun", `${st.todayCount} ta, ${st.todayMinutes} daqiqa`], ["7 kun", `${st.weekCount} ta, ${st.weekMinutes} daqiqa`], ["Hammasi", `${st.totalCount} ta, ${st.totalMinutes} daqiqa`]].map(([k, v]) => h("div", null, h("span", null, k), h("b", null, v))))),
    h("div", { class: "card" }, h("p", { class: "small muted" }, "Taymer darslarni cheklamaydi va to‘xtatmaydi: u faqat vaqtni boshqarishga yordam beradi. Vaqt soat bo‘yicha hisoblanadi, shuning uchun sahifa yopilsa ham qaytganingizda to‘g‘ri ko‘rinadi. Tugash signali esa faqat ilova ochiq turganida chiqadi: brauzer fondagi sahifalarni to‘xtatishi mumkin."),
      canNotify ? h("button", { class: "btn ghost small", type: "button", onClick: async () => { try { await Notification.requestPermission(); } catch { /* ignore */ } go("pomodoro", {}, { replace: true }); } }, "Brauzer bildirishnomasini yoqish (ixtiyoriy)") : null));
}, { tab: "more" });
