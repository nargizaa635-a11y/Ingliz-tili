// finallogic.js — A1 yakuniy test va zaif mavzularni qayta ishlash. Sof mantiq: DOM yo‘q (ekran final.js da).
// Test faqat TUGATILGAN A1 darslaridan tuziladi: har darsdan 1 ta savol, shu darsda ochiq xatosi bo‘lsa 2 ta.
import { state, getMeta, setMeta } from "./store.js";
import { content, completedLessonIds } from "./learn.js";
import { shuffle } from "./engine.js";
import { CURRICULUM } from "./curriculum.js";

export const FINAL_LEVEL = "A1";
export const FINAL_MIN_LESSONS = 5;     // testni boshlash uchun kamida shuncha dars tugatilgan bo‘lishi kerak
export const FINAL_MAX_QUESTIONS = 60;  // bitta testdagi savollarning eng ko‘pi
const META_KEY = "finalA1";
const KEEP = 10;                        // saqlanadigan oxirgi natijalar soni

/** A1 ning tugatilgan va kontenti mavjud darslari. */
export function finalLessonIds() {
  return completedLessonIds().filter((id) => { const l = content.lessons.get(id); return l && l.level === FINAL_LEVEL; });
}

export function totalLessons() {
  return [...content.lessons.values()].filter((l) => l.level === FINAL_LEVEL).length;
}

/** dars id → { unit, title } (bo‘lim nomi uchun). */
function unitIndex() {
  const idx = new Map(), order = [];
  const lv = CURRICULUM.find((x) => x.level === FINAL_LEVEL);
  for (const u of (lv ? lv.units : [])) { order.push(u.id); for (const l of (u.lessons || [])) idx.set(l.id, { unit: u.id, title: u.title }); }
  return { idx, order };
}

/** Ketma-ket bir xil dars va bir xil turdagi mashq kelmasligi uchun tartiblaydi. */
function spread(list) {
  const out = [], rest = list.slice();
  while (rest.length) {
    const last = out[out.length - 1];
    let k = rest.findIndex((e) => !last || (e.lessonId !== last.lessonId && e.type !== last.type));
    if (k < 0) k = rest.findIndex((e) => !last || e.lessonId !== last.lessonId);
    if (k < 0) k = 0;
    out.push(rest.splice(k, 1)[0]);
  }
  return out;
}

/** Yakuniy test savollari. Qaytaradi: { items: [{ex, phase, lessonId}], lessons, total }. */
export function buildFinalTest(rng = Math.random) {
  const ids = finalLessonIds();
  const base = [], extra = [];
  for (const id of ids) {
    const l = content.lessons.get(id);
    const pool = l.exercises.filter((e) => e.type !== "match").map((e) => content.exercises.get(e.id)).filter(Boolean);
    if (!pool.length) continue;
    const first = shuffle(pool, rng)[0];
    base.push(first);
    const open = new Set([...state.errors.values()].filter((e) => e.lessonId === id && !e.mastered).map((e) => e.concept));
    const weak = pool.filter((e) => open.has(e.concept) && e.id !== first.id);
    if (weak.length) extra.push(shuffle(weak, rng)[0]);
  }
  const room = Math.max(0, FINAL_MAX_QUESTIONS - base.length);
  const chosen = base.concat(shuffle(extra, rng).slice(0, room)).slice(0, FINAL_MAX_QUESTIONS);
  const items = spread(shuffle(chosen, rng)).map((e) => ({ ex: e, phase: "final", lessonId: e.lessonId }));
  return { items, lessons: ids.length, total: items.length };
}

/** Natijalarni tahlil qiladi. results: [{ correct, hint, ex }]. */
export function evaluateFinal(results, now = Date.now()) {
  const { idx, order } = unitIndex();
  const okOf = (r) => !!r.correct && !r.hint;
  const total = results.length, ok = results.filter(okOf).length;
  const byUnitMap = new Map(), bySkill = {}, byLesson = new Map(), weak = [], seen = new Set();
  for (const r of results) {
    const lid = r.ex.lessonId || null;
    const u = (lid && idx.get(lid)) || { unit: "other", title: "Boshqa" };
    const bu = byUnitMap.get(u.unit) || { unit: u.unit, title: u.title, ok: 0, total: 0 };
    bu.total++; if (okOf(r)) bu.ok++; byUnitMap.set(u.unit, bu);
    const sk = bySkill[r.ex.skill] || { ok: 0, total: 0 };
    sk.total++; if (okOf(r)) sk.ok++; bySkill[r.ex.skill] = sk;
    if (lid) { const bl = byLesson.get(lid) || { lessonId: lid, wrong: 0, total: 0 }; bl.total++; if (!okOf(r)) bl.wrong++; byLesson.set(lid, bl); }
    if (!okOf(r) && !seen.has(r.ex.id)) { seen.add(r.ex.id); weak.push({ exId: r.ex.id, lessonId: lid, concept: r.ex.concept, skill: r.ex.skill }); }
  }
  const byUnit = [...byUnitMap.values()].sort((a, b) => (order.indexOf(a.unit) + 1 || 99) - (order.indexOf(b.unit) + 1 || 99));
  const weakLessons = [...byLesson.values()].filter((b) => b.wrong > 0).sort((a, b) => b.wrong - a.wrong).map((b) => ({ ...b, title: (content.lessons.get(b.lessonId) || {}).title || b.lessonId }));
  const score = total ? ok / total : 0;
  return { ts: now, total, ok, score, passed: total > 0 && score >= state.settings.passScore, lessons: byLesson.size, byUnit, bySkill, weak, weakLessons };
}

/** Natijani saqlaydi (oxirgi KEEP tasi qoladi). */
export function recordFinal(summary) {
  const prev = getMeta(META_KEY, { history: [] });
  const history = ((prev && prev.history) || []).concat([summary]).slice(-KEEP);
  return setMeta(META_KEY, { history });
}

export function finalHistory() { const m = getMeta(META_KEY, null); return (m && m.history) || []; }
export function lastFinal() { const h = finalHistory(); return h.length ? h[h.length - 1] : null; }

/**
 * Zaif mavzularni qayta ishlash: xato qilingan har bir mavzu bo‘yicha boshqa gaplar (oldin chiqmagan savollar),
 * yetmasa — o‘sha savolning o‘zi. Mavzular almashib keladi.
 */
export function resolveFinalReview(summary, count = 12, rng = Math.random) {
  if (!summary || !summary.weak || !summary.weak.length) return [];
  const allowed = new Set(finalLessonIds());
  const concepts = [], seen = new Set();
  for (const w of summary.weak) if (!seen.has(w.concept)) { seen.add(w.concept); concepts.push(w); }
  const perConcept = concepts.map((w) => {
    const alts = shuffle([...content.exercises.values()].filter((e) => e.concept === w.concept && e.id !== w.exId && e.type !== "match" && (allowed.has(e.lessonId) || e.lessonId === w.lessonId)), rng).slice(0, 2);
    const own = content.exercises.get(w.exId);
    if (alts.length < 2 && own) alts.push(own);
    return alts;
  }).filter((l) => l.length);
  const out = [];
  for (let round = 0; out.length < count; round++) {
    let added = false;
    for (const l of perConcept) if (l[round] && out.length < count) { out.push(l[round]); added = true; }
    if (!added) break;
  }
  return out.map((e) => ({ ex: e, phase: "drill", lessonId: e.lessonId }));
}
