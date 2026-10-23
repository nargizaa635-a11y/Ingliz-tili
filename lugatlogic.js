// lugatlogic.js — Lug‘at sahifasi mantig‘i (DOM yo‘q, shuning uchun Node’da sinash mumkin).
import { vdata } from "./vocabdata.js";

const APOS = /[’‘ʻʼ`´']/g;

/** Qidiruv uchun matnni tenglashtiradi: kichik harf, apostroflarsiz (o‘ = o' = o), ortiqcha bo‘shliqsiz. */
export function normSearch(s) {
  return String(s == null ? "" : s).toLowerCase().replace(APOS, "").replace(/\s+/g, " ").trim();
}

/** Qism turi → uslub sinfi (harfli kartochka rangi uchun). */
export function posClass(pos) {
  const p = String(pos || "");
  if (p.startsWith("ot")) return "n";
  if (p.startsWith("fe")) return "v";
  if (p.startsWith("sifat")) return "a";
  if (p.startsWith("ravish")) return "r";
  return "o";
}

/** Rasm belgisi bo‘lmasa chiqadigan harfli kartochka matni. Hafta kunlari va oylar uchun 3 harf. */
export function tileText(en) {
  const w = String(en || "").trim();
  if (/^[A-Z][a-z]{3,}$/.test(w)) return w.slice(0, 3);
  return (w[0] || "?").toUpperCase();
}

export function letterOf(en) {
  const m = String(en || "").match(/[A-Za-z]/);
  return m ? m[0].toUpperCase() : "#";
}

/** content.vocab (Map) dan qidiruvga tayyor yozuvlar ro‘yxati: A–Z tartibda, takrorlarsiz. */
export function buildEntries(vocab) {
  const out = [];
  const seen = new Set();
  for (const v of vocab.values()) {
    if (!v || !v.id || !v.en || seen.has(v.id)) continue;
    seen.add(v.id);
    const d = vdata(v);
    out.push({
      id: v.id, en: v.en, uz: v.uz || "", pos: v.pos || "", ex: v.ex || null, lessonId: v.lessonId || null,
      ipa: d.ipa, icon: d.icon,
      nEn: normSearch(v.en), nUz: normSearch(v.uz), letter: letterOf(v.en),
    });
  }
  out.sort((a, b) => (a.nEn < b.nEn ? -1 : a.nEn > b.nEn ? 1 : a.id < b.id ? -1 : 1));
  return out;
}

/** Bitta so‘zning o‘rganish holati. card — "v:<id>:rec" kartasi yoki undefined. */
export function cardStatus(card, now, masteryStage = 4) {
  if (!card) return { learned: false, isNew: false, isDue: false, mastered: false, label: "Hali o‘rganilmagan" };
  const stage = card.stage || 0;
  const isNew = stage === 0;
  const isDue = typeof card.due === "number" && card.due <= now;
  const mastered = stage >= masteryStage;
  const label = isNew ? "Yangi" : isDue ? "Takrorlash kerak" : mastered ? "O‘zlashtirilgan" : "O‘rganilmoqda";
  return { learned: true, isNew, isDue, mastered, label };
}

function score(e, nq) {
  if (e.nEn === nq) return 0;
  if (e.nEn.startsWith(nq)) return 1;
  if (e.nEn.includes(" " + nq)) return 2;
  if (e.nEn.includes(nq)) return 3;
  if (e.nUz.startsWith(nq)) return 4;
  if (e.nUz.includes(" " + nq) || e.nUz.includes("," + nq) || e.nUz.includes("(" + nq)) return 5;
  if (e.nUz.includes(nq)) return 6;
  return -1;
}

/**
 * Hamma so‘zlar bo‘yicha qidiradi (hech narsa o‘tkazib yuborilmaydi).
 * opts: { q, filter: all|fav|due|new, letter, favs:Set, statusOf(entry) }
 */
export function filterEntries(entries, { q = "", filter = "all", letter = "", favs = new Set(), statusOf = () => ({}) } = {}) {
  const nq = normSearch(q);
  let list = entries;
  if (letter) list = list.filter((e) => e.letter === letter);
  if (filter === "fav") list = list.filter((e) => favs.has(e.id));
  else if (filter === "due") list = list.filter((e) => statusOf(e).isDue);
  else if (filter === "new") list = list.filter((e) => statusOf(e).isNew);
  if (!nq) return list;
  const scored = [];
  for (const e of list) { const s = score(e, nq); if (s >= 0) scored.push([s, e]); }
  scored.sort((a, b) => a[0] - b[0] || (a[1].nEn < b[1].nEn ? -1 : a[1].nEn > b[1].nEn ? 1 : 0));
  return scored.map((x) => x[1]);
}

/** Sevimlilar ro‘yxatini saqlangan qiymatdan xavfsiz tiklaydi (buzilgan ma’lumot ilovani to‘xtatmaydi). */
export function parseFavs(raw, validIds = null) {
  const arr = Array.isArray(raw) ? raw : [];
  return new Set(arr.filter((x) => typeof x === "string" && (!validIds || validIds.has(x))));
}
