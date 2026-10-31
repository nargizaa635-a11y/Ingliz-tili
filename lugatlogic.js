// lugatlogic.js — Lug‘at sahifasi mantig‘i (DOM yo‘q, shuning uchun Node’da sinash mumkin).
import { vdata, catOf, levelOf, slug, CATEGORIES } from "./vocabdata.js";
import { imageKeyOf } from "./imagelib.js";

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
      ipa: d.ipa, icon: d.icon, ext: !!v.ext,
      level: levelOf(v), cat: catOf(v), catName: CATEGORIES[catOf(v)] || "", slug: slug(v.en), img: imageKeyOf(slug(v.en)),
      nEn: normSearch(v.en), nUz: normSearch(v.uz), letter: letterOf(v.en),
    });
  }
  out.sort((a, b) => (a.nEn < b.nEn ? -1 : a.nEn > b.nEn ? 1 : a.id < b.id ? -1 : 1));
  return out;
}

/**
 * Bitta so‘zning o‘rganish holati. card — "v:<id>:rec" kartasi yoki undefined.
 * Holatlar (kind) bir-biriga zid emas, bitta karta aynan bittasida bo‘ladi:
 *   none    — kartasi yo‘q (so‘z darsda hali ko‘rilmagan)
 *   due     — muddati kelgan (due <= hozir): takrorlash navbatida. Mezon srs.js dueCards bilan bir xil.
 *   new     — hali bir marta ham takrorlanmagan (reps === 0) va birinchi takror muddati hali kelmagan
 *   waiting — takrorlangan (reps > 0), muddati hali kelmagan
 * Muhim: birinchi takror muddati (1 soat) kelgach, hech qachon takrorlanmagan karta ham «due» bo‘ladi,
 * chunki takrorlash sahifasi uni navbatga qo‘yadi. Shunda Lug‘atdagi «Takror» soni navbat bilan mos tushadi.
 * Xato javobdan keyin stage 0 ga tushgan, lekin reps > 0 bo‘lgan karta hech qachon «new» emas.
 */
export function cardStatus(card, now, masteryStage = 4) {
  if (!card || typeof card !== "object") return { kind: "none", learned: false, isNew: false, isDue: false, isWaiting: false, mastered: false, lapsed: false, never: false, due: null, label: "Hali o‘rganilmagan" };
  const stage = typeof card.stage === "number" ? card.stage : 0;
  const never = typeof card.reps === "number" ? card.reps === 0 : !card.last; // reps bo‘lmagan eski yozuv uchun zaxira mezoni
  const due = typeof card.due === "number" ? card.due : null;
  const isDue = due !== null && due <= now;
  const mastered = stage >= masteryStage;
  const lapsed = (card.lapses || 0) > 0;
  let kind, label;
  if (isDue) { kind = "due"; label = never ? "Takrorlash kerak (birinchi takror)" : "Takrorlash kerak"; }
  else if (never) { kind = "new"; label = "Yangi: hali takrorlanmagan"; }
  else { kind = "waiting"; label = mastered ? "O‘zlashtirilgan" : "O‘rganilmoqda"; }
  return { kind, learned: true, isNew: kind === "new", isDue: kind === "due", isWaiting: kind === "waiting", mastered, lapsed, never, due, label };
}

/** «3 kundan keyin» ko‘rinishidagi matn (muddat hali kelmagan bo‘lsa). */
export function whenText(due, now) {
  const ms = due - now;
  if (!(ms > 0)) return "hozir";
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `${min} daqiqadan keyin`;
  const hr = Math.round(ms / 3600000);
  if (hr < 24) return `${hr} soatdan keyin`;
  return `${Math.round(ms / 86400000)} kundan keyin`;
}

/**
 * Sevimlini almashtiradi va saqlaydi. save(massiv) — saqlash funksiyasi (store.setMeta); IndexedDB'da muvaffaqiyatli
 * yozilsa qiymat qaytaradi (put kalitni qaytaradi), xatoda store.persist null qaytaradi (xatoni yutadi).
 * Saqlash muvaffaqiyatsiz bo‘lsa holat O‘ZGARMAYDI (ok:false) va oldingi ro‘yxat qayta yoziladi.
 * memoryMode — IndexedDB umuman yo‘q (store xotira rejimi): saqlab bo‘lmaydi, lekin seans davomida ishlaydi (persisted:false).
 */
export async function toggleFavorite(favs, id, save, { memoryMode = false } = {}) {
  const next = new Set(favs);
  const on = !next.has(id);
  if (on) next.add(id); else next.delete(id);
  let res = null;
  try { res = await save([...next]); } catch { res = null; }
  const persisted = res !== null && res !== undefined;
  if (!persisted && !memoryMode) {
    try { await save([...favs]); } catch { /* xotiradagi nusxani qaytarishga urinish */ }
    return { ok: false, on: favs.has(id), favs: new Set(favs), persisted: false };
  }
  return { ok: true, on, favs: next, persisted };
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
 * opts: { q, filter: all|fav|due|new, letter, level (A1|A2), cat (mavzu kaliti), favs:Set, statusOf(entry) }
 */
export function filterEntries(entries, { q = "", filter = "all", letter = "", level = "", cat = "", favs = new Set(), statusOf = () => ({}) } = {}) {
  const nq = normSearch(q);
  let list = entries;
  if (letter) list = list.filter((e) => e.letter === letter);
  if (level) list = list.filter((e) => e.level === level);
  if (cat) list = list.filter((e) => e.cat === cat);
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
