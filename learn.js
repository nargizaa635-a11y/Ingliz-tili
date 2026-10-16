// learn.js — o‘quv mantiqi: kontent yuklash, natijalarni yozish, xatolar, takrorlash, o‘zlashtirish.
import { CONTENT_FILES, CURRICULUM, allLessonSlots } from "./curriculum.js";
import { state, putCard, putError, putLesson, addAttempt, getMeta } from "./store.js";
import { newCard, reviewCard, isMastered, dueCards, RETRY_MIN, DAY, GRADES } from "./srs.js";
import { makeVocabRecEx, makeVocabProdEx, makeListenEx, makeVocabRecallEx, shuffle, expectedText } from "./engine.js";
import { getMnemonic } from "./memory.js";

export const content = { lessons: new Map(), exercises: new Map(), vocab: new Map(), loadErrors: [] };

/** Barcha mavjud kontent fayllarini yuklaydi. Buzilgan fayl butun ilovani to‘xtatmaydi. */
export async function loadContent(importer = (f) => import("./" + f)) {
  for (const f of CONTENT_FILES) {
    try {
      const mod = await importer(f);
      for (const lesson of mod.default.lessons) {
        content.lessons.set(lesson.id, lesson);
        for (const ex of lesson.exercises) content.exercises.set(ex.id, { ...ex, lessonId: lesson.id });
        for (const v of lesson.vocab) if (!content.vocab.has(v.id)) content.vocab.set(v.id, { ...v, lessonId: lesson.id });
      }
    } catch (e) {
      content.loadErrors.push(`${f}: ${(e && e.message) || e}`);
    }
  }
}

export function lessonOrder() {
  return allLessonSlots().map((s) => {
    const l = content.lessons.get(s.id);
    return { id: s.id, title: s.title, level: s.level, unit: s.unit, implemented: !!l, minutes: l ? l.minutes : 15, prereq: l ? l.prereq : [] };
  });
}

export function statusMap() {
  const o = {};
  for (const [id, r] of state.lessons) o[id] = { status: r.status };
  return o;
}

export function lessonRecord(id) {
  return state.lessons.get(id) || { id, status: "new", step: 0, results: {}, bestCheck: null, checkAttempts: 0, startedAt: null, completedAt: null };
}

export function promptText(ex) {
  return String(ex.prompt || ex.text || ex.wrong || ex.uz || ex.say || ex.id).replace(/\n/g, " ");
}

/* ---------- Lug‘at kartalari ---------- */
export function ensureVocabCards(lesson, now = Date.now()) {
  for (const v of lesson.vocab) {
    const id = "v:" + v.id + ":rec";
    if (!state.cards.has(id)) putCard(newCard(id, "vocab-rec", { ref: v.id, lessonId: lesson.id }, now));
  }
}

/* ---------- Xato kategoriyalari (maqsadli mashq uchun) ---------- */
export const CATEGORIES = { grammar: "Grammatika", vocabulary: "Lug‘at", spelling: "Imlo / so‘z shakli", translation: "Tarjima", listening: "Tinglash", reading: "O‘qish", writing: "Yozish", speaking: "Gapirish" };
export function errorCategory(ex, near = false) {
  if (near && ["fill", "translate", "correct"].includes(ex.type)) return "spelling";
  if (ex.type === "translate") return "translation";
  return CATEGORIES[ex.skill] ? ex.skill : "grammar";
}

/* ---------- Natijani yozish ---------- */
export function recordResult({ ex, correct, hint = false, phase, lessonId = null, cardId = null, userAnswer = "", via = null, noAudio = false, selfRating = null, grade = null, near = false }, now = Date.now()) {
  const a = {
    ts: now, exId: ex.id, lessonId: lessonId || ex.lessonId || null, skill: ex.skill, concept: ex.concept,
    correct: !!correct, hint: !!hint, mode: state.settings.mode, phase, via, etype: ex.type,
  };
  const gname = grade == null ? null : typeof grade === "number" ? GRADES[grade] : grade;
  if (gname) a.grade = gname;
  if (noAudio) a.noAudio = true;
  if (selfRating != null) a.selfRating = selfRating;
  addAttempt(a);
  if (phase === "diagnostic") return;
  const isDynamic = /^(vrec|vprod|vlis|vrecall|prec|nrec):/.test(ex.id);
  if (!correct && !isDynamic) upsertError(ex, userAnswer, lessonId, now, near);
  // Ilgari xato qilingan aynan shu savolga keyin to‘g‘ri javob berilsa, natija yangilanadi
  if (correct && !cardId && !isDynamic && state.errors.has(ex.id)) markFixed(ex.id, now);
  if (cardId) updateCard(cardId, correct, hint, now, gname);
}

/** Xato qilingan mavzuning boshqa savoli to‘g‘ri yechilganda xato yozuvini yangilaydi. */
export function creditFix(errorId, now = Date.now()) { markFixed(errorId, now); }

function markFixed(errorId, now) {
  const e = state.errors.get(errorId);
  if (e) putError({ ...e, fixedCount: (e.fixedCount || 0) + 1, lastFixedAt: now });
}

function upsertError(ex, userAnswer, lessonId, now, near = false) {
  const prev = state.errors.get(ex.id);
  const hist = ((prev && prev.history) || []).concat([{ ts: now, answer: String(userAnswer ?? ""), near: !!near }]).slice(-5);
  const rec = {
    id: ex.id, lessonId: lessonId || ex.lessonId || null, concept: ex.concept, skill: ex.skill,
    prompt: promptText(ex), correct: expectedText(ex), why: ex.why || "",
    count: (prev ? prev.count : 0) + 1, firstAt: prev ? prev.firstAt : now, lastAt: now, mastered: false, masteredAt: null, history: hist,
    category: errorCategory(ex, near), fixedCount: prev ? prev.fixedCount || 0 : 0, lastFixedAt: prev ? prev.lastFixedAt || null : null,
  };
  putError(rec);
  const cid = "e:" + ex.id;
  const card = state.cards.get(cid);
  if (!card) putCard(newCard(cid, "error", { ref: ex.id }, now - 60000 * (60 - RETRY_MIN))); // 10 daqiqadan keyin
  else putCard(reviewCard(card, false, {}, now));
}

function updateCard(cardId, correct, hint, now, grade = null) {
  const card = state.cards.get(cardId);
  if (!card) return;
  const c = reviewCard(card, correct, { hint, grade }, now);
  putCard(c);
  if (card.kind === "vocab-rec" && c.stage >= 2) {
    const pid = "v:" + card.ref + ":prod";
    if (!state.cards.has(pid)) putCard(newCard(pid, "vocab-prod", { ref: card.ref, lessonId: card.lessonId }, now - 3600000));
  }
  if (card.kind === "error") {
    const e = state.errors.get(card.ref);
    if (e) {
      const m = isMastered(c, state.settings.masteryStage);
      const fixed = correct ? { fixedCount: (e.fixedCount || 0) + 1, lastFixedAt: now } : {};
      if (e.mastered !== m || correct) putError({ ...e, ...fixed, mastered: m, masteredAt: m ? (e.mastered ? e.masteredAt || now : now) : null });
    }
  }
}

/* ---------- Takrorlash ---------- */
function isValidCard(c) {
  if (c.kind === "error") return content.exercises.has(c.ref);
  if (c.kind === "palace") { const p = state.palaces.get(c.ref && c.ref.palaceId); return !!p && p.spots.some((s) => s.id === c.ref.spotId); }
  if (c.kind === "note") { const b = state.readings.get(c.ref && c.ref.bookId); return !!b && b.notes.some((n) => n.id === c.ref.noteId); }
  return content.vocab.has(c.ref);
}

export function validCards() {
  return [...state.cards.values()].filter(isValidCard);
}

export function dueCardList(now = Date.now()) {
  return dueCards(validCards(), now);
}

/** «Bugun nima o‘rganay?» uchun saqlangan haqiqiy ma’lumotlardan kontekst. */
export function planContext(minutes, now = Date.now()) {
  return {
    minutes, now, cards: validCards(), lessonOrder: lessonOrder(), status: statusMap(), attempts: state.attempts,
    diagnosticDone: !!getMeta("diagnostic"), drillPool: drillPool(),
  };
}

export function buildReviewItem(card, rng = Math.random) {
  if (card.kind === "vocab-rec") {
    const v = content.vocab.get(card.ref); if (!v) return null;
    // Takrorlash uslubi: «aralash» — dastlab variant tanlash, 2-bosqichdan boshlab faol eslash (javobni o‘zi eslaydi)
    const style = state.settings.reviewStyle || "mixed";
    if (style === "recall" || (style === "mixed" && card.stage >= 2)) {
      const m = getMnemonic(v.id);
      return { ex: makeVocabRecallEx(v, m && m.text), cardId: card.id, phase: "review" };
    }
    return { ex: makeVocabRecEx(v, [...content.vocab.values()], rng), cardId: card.id, phase: "review" };
  }
  if (card.kind === "palace") {
    const p = state.palaces.get(card.ref.palaceId), sp = p && p.spots.find((x) => x.id === card.ref.spotId);
    if (!sp) return null;
    const ex = { id: `prec:${p.id}:${sp.id}`, type: "recall", skill: "vocabulary", concept: "palace:" + sp.id, phase: "review", cue: `Xotira saroyi: «${p.name}»`,
      front: sp.label, ask: "Bu joyda qaysi inglizcha so‘zni joylagan edingiz?", back: sp.uz ? `${sp.en} — ${sp.uz}` : sp.en, speak: sp.en,
      example: sp.example ? { en: sp.example, uz: "" } : null, mnemonic: sp.assoc || null, why: `«${sp.label}» joyidagi so‘z: ${sp.en}${sp.uz ? " — " + sp.uz : ""}.` };
    return { ex, cardId: card.id, phase: "review" };
  }
  if (card.kind === "note") {
    const b = state.readings.get(card.ref.bookId), n = b && b.notes.find((x) => x.id === card.ref.noteId);
    if (!n) return null;
    const ex = { id: `nrec:${b.id}:${n.id}`, type: "recall", skill: "reading", concept: "note:" + n.id, phase: "review", cue: `Kitob: «${b.title}»`,
      front: n.text, back: n.answer, why: "O‘zingiz yozgan javob: " + n.answer };
    return { ex, cardId: card.id, phase: "review" };
  }
  if (card.kind === "vocab-prod") {
    const v = content.vocab.get(card.ref); if (!v) return null;
    return { ex: makeVocabProdEx(v), cardId: card.id, phase: "review" };
  }
  const base = content.exercises.get(card.ref); if (!base) return null;
  const alts = [...content.exercises.values()].filter((e) => e.concept === base.concept && e.id !== base.id);
  const alt = alts.length ? alts[Math.floor(rng() * alts.length)] : null;
  return { ex: alt || base, cardId: card.id, phase: "review", via: alt ? "alt" : "same" };
}

/* ---------- O‘zlashtirish ---------- */
export function lessonMastery(lessonId) {
  const rec = state.lessons.get(lessonId);
  const lesson = content.lessons.get(lessonId);
  if (!lesson || !rec || rec.status !== "completed") return { mastered: false, completed: false, vocabMastered: 0, vocabTotal: lesson ? lesson.vocab.length : 0, openErrors: 0 };
  const stage = state.settings.masteryStage;
  const total = lesson.vocab.length;
  const ok = lesson.vocab.filter((v) => isMastered(state.cards.get("v:" + v.id + ":rec"), stage)).length;
  const openErrors = [...state.errors.values()].filter((e) => e.lessonId === lessonId && !e.mastered).length;
  return { mastered: ok / total >= 0.7 && openErrors === 0, completed: true, vocabMastered: ok, vocabTotal: total, openErrors };
}

export function completedLessonIds() {
  return [...state.lessons.values()].filter((l) => l.status === "completed").map((l) => l.id);
}

function startedLessons() {
  return [...state.lessons.values()].filter((l) => l.status !== "new" && content.lessons.has(l.id)).map((l) => content.lessons.get(l.id));
}

/* ---------- Mashqlar to‘plamlari (rejadagi turlar) ---------- */
export function drillPool() {
  const pool = {};
  const lessons = completedLessonIds().map((id) => content.lessons.get(id)).filter(Boolean);
  for (const l of lessons) {
    for (const ex of l.exercises) pool[ex.skill] = (pool[ex.skill] || 0) + 1;
  }
  pool.listening = lessons.reduce((s, l) => s + l.vocab.filter((v) => v.ex).length, 0) + (pool.listening || 0);
  return pool;
}

function listenFromVocab(count, rng) {
  const vs = completedLessonIds().flatMap((id) => (content.lessons.get(id) || { vocab: [] }).vocab).filter((v) => v.ex && v.ex.en);
  const pool = [...content.vocab.values()];
  return shuffle(vs, rng).slice(0, count).map((v) => ({ ex: makeListenEx(v, pool, rng), phase: "drill" }));
}

export function resolveDrill(spec, rng = Math.random) {
  if (spec.skill === "listening") return listenFromVocab(spec.count, rng);
  const exs = completedLessonIds().flatMap((id) => (content.lessons.get(id) || { exercises: [] }).exercises).filter((e) => e.skill === spec.skill);
  const withErr = exs.filter((e) => state.errors.has(e.id) && !state.errors.get(e.id).mastered);
  const rest = exs.filter((e) => !withErr.includes(e));
  const pick = [...shuffle(withErr, rng), ...shuffle(rest, rng)].slice(0, spec.count);
  return pick.map((e) => ({ ex: { ...e, lessonId: e.lessonId || null }, phase: "drill" }));
}

export function resolveListen(count, rng = Math.random) { return listenFromVocab(count, rng); }

export function resolveCheck(count, rng = Math.random) {
  const exs = completedLessonIds().flatMap((id) => (content.lessons.get(id) || { exercises: [] }).exercises).filter((e) => e.phase === "check");
  return shuffle(exs, rng).slice(0, count).map((e) => ({ ex: e, phase: "check" }));
}

export function speakingTasks() {
  return startedLessons().flatMap((l) => (l.speaking || []).map((s) => ({ ...s, lessonId: l.id, lessonTitle: l.title })));
}

export function shadowTasks(rng = Math.random) {
  const sents = completedLessonIds().flatMap((id) => (content.lessons.get(id) || { vocab: [] }).vocab).filter((v) => v.ex).map((v) => ({
    id: "shadow:" + v.id, uz: "Gapni tinglang va takrorlang: " + v.ex.uz, starter: "", model: v.ex.en, shadow: true,
  }));
  return shuffle(sents, rng);
}

/* ---------- Taraqqiyot (faqat haqiqiy ma’lumotdan) ---------- */
export function progressByLevel() {
  const res = [];
  for (const lv of CURRICULUM) {
    const slots = lv.units.flatMap((u) => u.lessons || []);
    const planned = slots.length;
    const implemented = slots.filter((s) => content.lessons.has(s.id)).length;
    const completed = slots.filter((s) => state.lessons.get(s.id) && state.lessons.get(s.id).status === "completed").length;
    const mastered = slots.filter((s) => lessonMastery(s.id).mastered).length;
    res.push({ level: lv.level, units: lv.units.length, planned, implemented, completed, mastered });
  }
  return res;
}

export function studyDays(n = 14, now = Date.now()) {
  const days = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(now - i * DAY); d.setHours(0, 0, 0, 0);
    const start = d.getTime();
    const cnt = state.attempts.filter((a) => a.ts >= start && a.ts < start + DAY && a.phase !== "diagnostic").length;
    days.push({ date: start, attempts: cnt });
  }
  return days;
}

export function backupWarning(now = Date.now()) {
  const hasData = state.attempts.length > 0;
  if (!hasData) return null;
  const last = getMeta("lastExportAt");
  if (!last) return "Hali zaxira nusxa olmagansiz. Brauzer ma’lumoti o‘chib ketsa, taraqqiyotingiz yo‘qoladi.";
  if (now - last > 7 * DAY) return "Oxirgi zaxiradan 7 kundan ko‘proq o‘tdi. Yangi zaxira oling.";
  return null;
}

export { putLesson };
