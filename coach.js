// coach.js — saqlangan haqiqiy ma’lumotlardan tahlil: zaif tomonlar, haftalik natija, aralash test (interleaving),
// «kecha o‘rganganlarim» va bosh sahifadagi kunlik vazifalar. UI yo‘q.
import { state } from "./store.js";
import { content, completedLessonIds, buildReviewItem, lessonOrder, statusMap, dueCardList, CATEGORIES } from "./learn.js";
import { makeVocabRecallEx, shuffle } from "./engine.js";
import { getMnemonic, dateKey } from "./memory.js";
import { nextLessons } from "./planner.js";
import { DAY } from "./srs.js";

/* ---------- Mavzu (concept) nomlari ---------- */
export const CONCEPT_LABELS = {
  "greetings-time": "Kun vaqtiga qarab salom", "greetings-basic": "Asosiy salomlashuv so‘zlari", "nice-to-meet": "Nice to meet you",
  "how-are-you": "How are you? va javob", "reading-dialogue-1": "O‘qish: ertalabki suhbat", "see-you": "See you tomorrow",
  "ask-name": "Ismni so‘rash", "my-name-is": "My name is…", "i-am-from": "I’m from…", "where-from": "Where are you from?",
  "question-words": "So‘roq so‘zlari (what, where)", "reading-intro": "O‘qish: o‘zini tanishtirish", contractions: "Qisqartmalar (I’m, what’s)",
  "spell-question": "How do you spell…?", "letter-names": "Harf nomlari", "letters-listen": "Harflarni eshitib ajratish",
  "polite-requests": "Iltimos va qayta so‘rash", "slowly-adverb": "slow / slowly", "spelling-name": "Ismni harflab aytish",
  "reading-spelling": "O‘qish: harflab aytish", "numbers-0-20": "Raqamlar 0–20", "teen-numbers": "13–19 raqamlar (-teen)",
  "phone-zero": "Telefon raqamida 0 (oh / zero)", "phone-question": "What’s your phone number?", "phone-answer": "Telefon raqamini aytish",
  "teen-spelling": "Raqamlar imlosi (fifteen)", "phone-listen": "Raqamlarni eshitish", "reading-phone": "O‘qish: telefon raqami",
  "am-are": "am / are (I am, you are)", jobs: "Kasblar", age: "Yosh (I am … years old)", "age-question": "How old are you?",
  "live-question": "Where do you live?", "live-answer": "I live in …", "reading-dialogue-2": "O‘qish: tanishuv suhbati",
  "he-she-it": "he / she / it is", "his-her": "his / her", "family-words": "Oila a’zolari", "this-is": "This is …",
  "family-listen": "Oilani eshitib tushunish", "reading-family": "O‘qish: mening oilam",
};
export function conceptLabel(concept) {
  if (CONCEPT_LABELS[concept]) return CONCEPT_LABELS[concept];
  if (concept && concept.startsWith("vocab:")) { const v = content.vocab.get(concept.slice(6)); return v ? `So‘z: ${v.en}` : concept; }
  return String(concept || "").replace(/-/g, " ");
}

/* ---------- Vaqt yordamchilari (qurilma vaqt zonasi bo‘yicha) ---------- */
export function dayStart(now = Date.now()) { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); }
const inDay = (ts, start) => ts != null && ts >= start && ts < start + DAY;
const realAttempts = () => state.attempts.filter((a) => a.phase !== "diagnostic");

/** Faol vaqtning taxminiy hisobi: ketma-ket urinishlar orasidagi 3 daqiqagacha bo‘lgan tanaffuslar sanaladi. */
export function activeMinutes(attempts, from, to) {
  const ts = attempts.filter((a) => a.ts >= from && a.ts < to).map((a) => a.ts).sort((x, y) => x - y);
  let ms = 0;
  ts.forEach((t, i) => { ms += i === 0 ? 30000 : Math.min(t - ts[i - 1], 180000) || 30000; });
  return Math.round(ms / 60000);
}

/* ---------- Zaif tomonlar (Deliberate Practice) ---------- */
export function weakTopics(now = Date.now()) {
  const groups = new Map();
  for (const e of state.errors.values()) {
    if (!content.exercises.has(e.id)) continue;
    const g = groups.get(e.concept) || { concept: e.concept, label: conceptLabel(e.concept), errors: [], cats: {}, lessons: {} };
    g.errors.push(e);
    const cat = e.category || (e.skill === "vocabulary" ? "vocabulary" : e.skill === "listening" ? "listening" : e.skill === "reading" ? "reading" : "grammar");
    g.cats[cat] = (g.cats[cat] || 0) + 1;
    if (e.lessonId) g.lessons[e.lessonId] = (g.lessons[e.lessonId] || 0) + 1;
    groups.set(e.concept, g);
  }
  const week = now - 7 * DAY;
  const list = [];
  for (const g of groups.values()) {
    const open = g.errors.filter((e) => !e.mastered);
    const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
    list.push({
      concept: g.concept, label: g.label, category: top(g.cats)[0], categoryName: CATEGORIES[top(g.cats)[0]] || "",
      openCount: open.length, repeated: g.errors.filter((e) => e.count >= 2).length, totalErrors: g.errors.reduce((s, e) => s + e.count, 0),
      fixedCount: g.errors.reduce((s, e) => s + (e.fixedCount || 0), 0), masteredCount: g.errors.filter((e) => e.mastered).length,
      lastAt: Math.max(...g.errors.map((e) => e.lastAt)), lessonId: g.lessons ? (top(g.lessons) || [null])[0] : null,
      errorIds: open.map((e) => e.id),
      score: open.length * 2 + g.errors.filter((e) => e.count >= 2).length * 1.5 + (g.errors.some((e) => e.lastAt >= week) ? 1 : 0),
    });
  }
  return list.filter((t) => t.openCount > 0).sort((a, b) => b.score - a.score || b.lastAt - a.lastAt);
}

/** Feynman yozuvlaridagi «Qaysi joyini hali tushunmadim?» javoblari. */
export function unclearNotes() {
  return [...state.feynman.values()].filter((f) => f.answers && f.answers.unclear).sort((a, b) => b.updatedAt - a.updatedAt)
    .map((f) => ({ id: f.id, lessonId: f.lessonId, text: f.answers.unclear, updatedAt: f.updatedAt }));
}

/** Zaif mavzu bo‘yicha qisqa mashq: shu mavzuning boshqa mashqlari (boshlangan darslardan), xato qilinganlari oldinda. */
export function resolveConceptDrill(concept, count = 6, rng = Math.random) {
  const started = new Set([...state.lessons.values()].filter((l) => l.status !== "new").map((l) => l.id));
  const exs = [...content.exercises.values()].filter((e) => e.concept === concept && (started.has(e.lessonId) || state.errors.has(e.id)));
  const withErr = exs.filter((e) => state.errors.has(e.id) && !state.errors.get(e.id).mastered);
  const rest = exs.filter((e) => !withErr.includes(e));
  return [...shuffle(withErr, rng), ...shuffle(rest, rng)].slice(0, count).map((e) => ({ ex: e, phase: "drill" }));
}

/* ---------- Haftalik natijalar ---------- */
export function weeklyStats(now = Date.now()) {
  const today = dayStart(now);
  const from = today - 6 * DAY, to = today + DAY;
  const att = realAttempts().filter((a) => a.ts >= from && a.ts < to);
  const graded = att.filter((a) => a.selfRating == null);
  const right = graded.filter((a) => a.correct && !a.hint).length;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const s = today - i * DAY;
    const d = att.filter((a) => inDay(a.ts, s));
    days.push({ date: s, attempts: d.length, minutes: activeMinutes(att, s, s + DAY) });
  }
  const errs = [...state.errors.values()];
  const sessions = [...state.sessions.values()].filter((s) => s.ts >= from && s.ts < to && s.kind === "focus");
  return {
    days, attempts: att.length, accuracy: graded.length ? right / graded.length : null,
    daysStudied: days.filter((d) => d.attempts > 0).length,
    newWords: [...state.cards.values()].filter((c) => c.kind === "vocab-rec" && c.created >= from && c.created < to).length,
    wordsMastered: [...state.cards.values()].filter((c) => c.kind === "vocab-rec" && c.stage >= state.settings.masteryStage).length,
    lessonsCompleted: [...state.lessons.values()].filter((l) => l.status === "completed" && l.completedAt >= from && l.completedAt < to).length,
    recalls: att.filter((a) => a.etype === "recall").length,
    errorsMade: att.filter((a) => !a.correct && a.selfRating == null && a.etype !== "recall").length,
    errorsFixed: errs.filter((e) => (e.lastFixedAt >= from && e.lastFixedAt < to) || (e.masteredAt >= from && e.masteredAt < to)).length,
    activeMinutes: activeMinutes(att, from, to), pomodoroMinutes: sessions.reduce((s, x) => s + x.minutes, 0), pomodoroCount: sessions.length,
  };
}

/* ---------- Aralash test (Interleaving) ---------- */
const PRODUCTION = new Set(["translate", "fill", "order", "correct"]);
export function recentAccuracy(n = 30) {
  const g = realAttempts().filter((a) => a.selfRating == null && a.etype !== "recall").slice(-n);
  return g.length >= 8 ? g.filter((a) => a.correct && !a.hint).length / g.length : null;
}

/**
 * Faqat TUGALLANGAN darslardagi mavzulardan, turli mavzu va ko‘nikmalarni ketma-ket almashtirib beradi.
 * Qiyinlik: oxirgi natijaga qarab yozma (ishlab chiqarish) yoki tanish turdagi mashqlar ko‘proq.
 */
export function resolveMixed(count = 10, rng = Math.random) {
  const pool = completedLessonIds().flatMap((id) => (content.lessons.get(id) || { exercises: [] }).exercises.map((e) => content.exercises.get(e.id))).filter(Boolean);
  const acc = recentAccuracy();
  const level = acc == null ? "balanced" : acc >= 0.85 ? "harder" : acc <= 0.6 ? "easier" : "balanced";
  if (pool.length < 3) return { items: [], level, topics: 0 };
  const open = (concept) => [...state.errors.values()].filter((e) => e.concept === concept && !e.mastered).length;
  const weight = (e) => (1 + 2 * open(e.concept)) * (level === "harder" ? (PRODUCTION.has(e.type) ? 3 : 1) : level === "easier" ? (PRODUCTION.has(e.type) ? 1 : 3) : 1);
  const chosen = [];
  const left = pool.slice();
  while (chosen.length < count && left.length) {
    const total = left.reduce((s, e) => s + weight(e), 0);
    let r = rng() * total, i = 0;
    for (; i < left.length - 1; i++) { r -= weight(left[i]); if (r <= 0) break; }
    chosen.push(left.splice(i, 1)[0]);
  }
  // Interleaving: ketma-ket bir xil mavzu va ko‘nikma kelmasligi uchun qayta tartiblash
  const out = [];
  const rest = chosen.slice();
  while (rest.length) {
    const last = out[out.length - 1];
    let k = rest.findIndex((e) => !last || (e.concept !== last.concept && e.skill !== last.skill));
    if (k < 0) k = rest.findIndex((e) => !last || e.concept !== last.concept);
    if (k < 0) k = 0;
    out.push(rest.splice(k, 1)[0]);
  }
  return { items: out.map((e) => ({ ex: e, phase: "mixed" })), level, topics: new Set(out.map((e) => e.concept)).size };
}

/* ---------- Faol eslash va «Kecha o‘rganganlarim» ---------- */
const vocabRecall = (v) => { const m = getMnemonic(v.id); return makeVocabRecallEx(v, m && m.text); };

/** Bugun takrorlash kerak bo‘lgan (yoki o‘rganilgan) so‘zlardan faol eslash kartochkalari. */
export function resolveRecall(count = 5, now = Date.now(), rng = Math.random) {
  const due = dueCardList(now).filter((c) => c.kind === "vocab-rec" && content.vocab.has(c.ref));
  const rest = [...state.cards.values()].filter((c) => c.kind === "vocab-rec" && content.vocab.has(c.ref) && !due.includes(c));
  const picks = [...due, ...shuffle(rest, rng)].slice(0, count);
  return picks.map((c) => ({ ex: vocabRecall(content.vocab.get(c.ref)), cardId: c.due <= now ? c.id : null, phase: "recall" }));
}

export function yesterdayInfo(now = Date.now()) {
  const today = dayStart(now);
  for (let back = 1; back <= 7; back++) {
    const s = today - back * DAY;
    const vocabIds = [...state.cards.values()].filter((c) => c.kind === "vocab-rec" && inDay(c.created, s) && content.vocab.has(c.ref)).map((c) => c.ref);
    const errorIds = [...state.errors.values()].filter((e) => (inDay(e.firstAt, s) || inDay(e.lastAt, s)) && content.exercises.has(e.id)).map((e) => e.id);
    const lessons = [...state.lessons.values()].filter((l) => inDay(l.completedAt, s)).map((l) => l.id);
    if (vocabIds.length || errorIds.length || lessons.length) return { dayStart: s, isYesterday: back === 1, vocabIds, errorIds, lessons };
  }
  return { dayStart: null, isYesterday: false, vocabIds: [], errorIds: [], lessons: [] };
}

export function resolveYesterday(info, now = Date.now(), rng = Math.random) {
  const items = [];
  for (const id of shuffle(info.vocabIds, rng).slice(0, 8)) {
    const c = state.cards.get("v:" + id + ":rec");
    items.push({ ex: vocabRecall(content.vocab.get(id)), cardId: c && c.due <= now ? c.id : null, phase: "yesterday" });
  }
  for (const id of shuffle(info.errorIds, rng).slice(0, 4)) {
    const c = state.cards.get("e:" + id);
    const it = c && buildReviewItem(c, rng);
    if (it) items.push({ ...it, cardId: c.due <= now ? c.id : null, phase: "yesterday" });
  }
  return shuffle(items, rng);
}

/* ---------- Kurs ma’lumotidan fikrlar xaritasi uchun guruhlar ---------- */
export function courseGroups() {
  const started = new Set([...state.lessons.values()].filter((l) => l.status !== "new").map((l) => l.id));
  const byUnit = new Map();
  for (const o of lessonOrder()) {
    if (!o.implemented || !started.has(o.id)) continue;
    const l = content.lessons.get(o.id);
    const concepts = [...new Set(l.exercises.map((e) => e.concept))].filter((c) => !c.startsWith("reading-")).map(conceptLabel);
    const g = byUnit.get(o.unit) || { unit: o.unit, lessons: [] };
    g.lessons.push({ id: o.id, title: o.title, concepts });
    byUnit.set(o.unit, g);
  }
  return [...byUnit.values()];
}

/* ---------- Bosh sahifa: bugungi vazifalar ---------- */
export function dailyTasks(now = Date.now()) {
  const today = dayStart(now);
  const att = realAttempts().filter((a) => inDay(a.ts, today));
  const due = dueCardList(now).length;
  const hasVocab = [...state.cards.values()].some((c) => c.kind === "vocab-rec");
  const next = nextLessons(lessonOrder(), statusMap(), 1)[0];
  const lessonToday = att.filter((a) => a.lessonId && ["practice", "check"].includes(a.phase)).length >= 5 || [...state.lessons.values()].some((l) => inDay(l.completedAt, today));
  const spots = [...state.palaces.values()].reduce((s, p) => s + p.spots.length, 0);
  const tk = dateKey(now);
  const y = yesterdayInfo(now);
  const yCount = y.vocabIds.length + y.errorIds.length;
  const focus = [...state.sessions.values()].filter((s) => s.kind === "focus" && dateKey(s.ts) === tk).length;
  const tasks = [
    { id: "lesson", essential: true, label: "Bugungi dars", detail: next ? next.title : "Yangi dars hali yo‘q", done: !next || lessonToday, go: next ? { view: "lesson", params: { lessonId: next.id } } : null },
    { id: "review", essential: true, label: "Takrorlash", detail: due ? `${due} ta karta` : "Hozir takrorlash yo‘q", done: due === 0, go: { view: "review", params: {} } },
  ];
  if (hasVocab) tasks.push({ id: "recall", essential: true, label: "Faol eslash (5 ta)", detail: "Javobni ko‘rishdan oldin o‘zingiz eslang", done: att.filter((a) => a.etype === "recall").length >= 5, go: { view: "recallrun", params: {} } });
  tasks.push(
    { id: "speaking", essential: false, label: "Gapirish mashqi", detail: "Ovoz yozing va tinglang", done: att.some((a) => a.skill === "speaking"), go: { view: "speak", params: {} } },
    spots ? { id: "memory", essential: false, label: "Xotira saroyi mashqi", detail: `${spots} ta nuqta`, done: att.some((a) => a.exId && a.exId.startsWith("prec:")), go: { view: "palace", params: {} } }
      : { id: "memory", essential: false, label: "Mnemonika yozing", detail: "Bitta so‘zga o‘zingizning assotsiatsiyangizni qo‘shing", done: [...state.mnemonics.values()].some((m) => inDay(m.updatedAt, today)), go: { view: "vocab", params: {} } },
    { id: "reading", essential: false, label: "Kitobxonlik va fikrlash", detail: "Bugun bitta fikr yoki xulosa yozing", done: [...state.readings.values()].some((b) => b.notes.some((n) => inDay(n.createdAt, today))) || [...state.feynman.values()].some((f) => f.date === tk), go: { view: "reading", params: {} } },
    { id: "pomodoro", essential: false, label: "Pomodoro", detail: "Diqqat bilan o‘qish vaqti", done: focus >= 1, go: { view: "pomodoro", params: {} } },
  );
  if (yCount) tasks.push({ id: "yesterday", essential: false, label: y.isYesterday ? "Kecha o‘rganganlarim" : "Oxirgi o‘rganganlarim", detail: `${yCount} ta narsa`, done: att.filter((a) => a.phase === "yesterday").length >= 3, go: { view: "yesterday", params: {} } });
  return { tasks, doneCount: tasks.filter((t) => t.done).length, total: tasks.length };
}
