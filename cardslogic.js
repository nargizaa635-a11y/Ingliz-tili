// cardslogic.js — «So‘z kartochkalari» mantig‘i (DOM yo‘q, shuning uchun Node’da sinash mumkin).
// Takrorlash algoritmi yangidan yozilmaydi: baholash learn.js dagi gradeVocab orqali srs.js ga boradi,
// bu yerda faqat «qaysi so‘zlar, qaysi tartibda» va seans holati hisoblanadi.
import { dueCards } from "./srs.js";

export const MODES = { en: "Rasm → inglizcha", uz: "Rasm → o‘zbekcha" };
export const SOURCES = { mix: "Aralash", due: "Takror", new: "Yangi", fav: "Sevimli", hard: "Qiyin", all: "Hammasi" };
export const GRADE_LABELS = { again: "Eslanmadi", hard: "Qiyin", good: "Esladim", easy: "Oson" };
export const DEFAULT_COUNT = 20;
export const COUNTS = [10, 20, 30];

/** Savol matni (rejimga qarab). Javob ochilguncha tarjima ko‘rsatilmaydi. */
export const promptFor = (mode) => (mode === "uz" ? "Ma’nosini toping" : "Inglizchasini toping");

/** Karta «qiyin» sanaladimi: ko‘p xato qilingan yoki hali mustahkam emas. */
export function isHard(card) {
  return !!card && ((card.lapses || 0) > 0 || ((card.reps || 0) > 0 && card.stage <= 1));
}

/** Karta hali bir marta ham takrorlanmagan (yoki umuman yo‘q) — «yangi» so‘z. */
export const isNewWord = (card) => !card || (card.reps || 0) === 0;

/** Deterministik aralashtirish (seans bir xil tartibda tiklanishi va testlar uchun). */
export function seededShuffle(arr, seed = 1) {
  const a = arr.slice();
  let s = (seed >>> 0) || 1;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * Seans uchun so‘zlar ro‘yxatini (id lar) tuzadi.
 * entries — buildEntries natijasi; opts:
 *   cards (Map id→karta), favs (Set), hasVisual(entry) → bool, now, seed
 *   source: mix|due|new|fav|hard|all,  level: ""|A1|A2,  cat: ""|kalit,  count, onlyIds (aniq ro‘yxat)
 * Rasmi (SVG yoki emoji) yo‘q so‘z kartochkaga kirmaydi: «rasm → so‘z» savoli unga mos kelmaydi. skipped — shunday so‘zlar soni.
 */
export function buildDeck(entries, opts = {}) {
  const { cards = new Map(), favs = new Set(), hasVisual = () => true, now = Date.now(), seed = 1,
    source = "mix", level = "", cat = "", count = DEFAULT_COUNT, onlyIds = null } = opts;
  const cardOf = (e) => cards.get("v:" + e.id + ":rec");
  let list = entries;
  if (onlyIds) { const set = new Set(onlyIds); list = list.filter((e) => set.has(e.id)); }
  if (level) list = list.filter((e) => e.level === level);
  if (cat) list = list.filter((e) => e.cat === cat);
  const visual = list.filter((e) => hasVisual(e));
  const skipped = list.length - visual.length;
  // Darsda hali ko‘rilmagan lekin kartasi yo‘q so‘zlar ham «yangi» hisoblanadi; darsdagi so‘zlar kartasi dars tugagach paydo bo‘ladi.
  const dueSet = new Set(dueCards([...cards.values()].filter((c) => c.kind === "vocab-rec"), now).map((c) => c.id));
  const isDue = (e) => dueSet.has("v:" + e.id + ":rec");
  const dueList = visual.filter(isDue).sort((a, b) => dueRank(cardOf(b), now) - dueRank(cardOf(a), now));
  let picked;
  if (onlyIds) picked = visual;
  else if (source === "due") picked = dueList;
  else if (source === "new") picked = seededShuffle(visual.filter((e) => isNewWord(cardOf(e))), seed);
  else if (source === "fav") picked = seededShuffle(visual.filter((e) => favs.has(e.id)), seed);
  else if (source === "hard") picked = visual.filter((e) => isHard(cardOf(e))).sort((a, b) => ((cardOf(b).lapses || 0) - (cardOf(a).lapses || 0)));
  else if (source === "all") picked = seededShuffle(visual, seed);
  else {
    const rest = visual.filter((e) => !isDue(e) && isNewWord(cardOf(e)));
    picked = [...dueList, ...seededShuffle(rest, seed)];
  }
  const n = onlyIds ? picked.length : Math.max(1, count | 0);
  return { ids: picked.slice(0, n).map((e) => e.id), available: picked.length, skipped, total: list.length };
}

function dueRank(card, now) { return card ? (now - card.due) / 86400000 + (card.lapses || 0) * 0.5 - card.stage * 0.1 : 0; }

/* ----- Seans holati (qayta ochilganda davom ettirish uchun meta «fcSession» ga saqlanadi) ----- */
export function newSession({ ids, mode = "en", source = "mix", level = "", cat = "" }, now = Date.now()) {
  return { v: 1, ids: ids.slice(), mode: mode === "uz" ? "uz" : "en", source, level, cat, idx: 0, results: {}, startedAt: now };
}

/** Saqlangan seans yaroqlimi (id lar hali mavjud, tugamagan). validIds — mavjud so‘zlar. */
export function resumable(s, validIds) {
  if (!s || s.v !== 1 || !Array.isArray(s.ids) || !s.ids.length) return false;
  if (s.idx >= s.ids.length) return false;
  if (!s.ids.every((id) => validIds.has(id))) return false;
  return Object.keys(s.results || {}).length < s.ids.length;
}

export function gradeInSession(s, id, grade) {
  if (!GRADE_LABELS[grade] || !s.ids.includes(id) || s.results[id]) return false; // bitta so‘z seansda bir marta baholanadi
  s.results[id] = grade;
  return true;
}

export const clampIdx = (s, i) => Math.max(0, Math.min(s.ids.length - 1, i));

/** Seans yakuni: har bahodan nechta, o‘tkazilgan, to‘g‘ri eslanganlar foizi. */
export function sessionStats(s) {
  const out = { total: s.ids.length, graded: 0, again: 0, hard: 0, good: 0, easy: 0, skipped: 0, recalledPct: null, hardIds: [] };
  for (const id of s.ids) {
    const g = s.results[id];
    if (!g) { out.skipped++; continue; }
    out.graded++; out[g]++;
    if (g === "again" || g === "hard") out.hardIds.push(id);
  }
  if (out.graded) out.recalledPct = Math.round(((out.good + out.easy) / out.graded) * 100);
  return out;
}
