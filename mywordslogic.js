// mywordslogic.js — «Mening so‘zlarim» mantig‘i (DOM yo‘q, shuning uchun Node’da sinash mumkin).
//
// Ma’lumot IndexedDB ning mavjud «meta» jadvalida saqlanadi (baza sxemasi o‘zgarmaydi, zaxira avtomatik qamrab oladi):
//   myWords   — tanlangan so‘zlarning lug‘atdagi ID lari (massiv, takrorsiz). Sevimlilar (lugatFav) dan MUTLAQO alohida.
//   myTest    — joriy / oxirgi sinov seansi (sahifa yangilansa ham tiklanadi).
//   myResults — oxirgi 10 ta sinov natijasi (o‘sishni ko‘rsatish uchun).
//   myWrong   — xato qilingan so‘zlar { id: { n, last, streak } } (keyingi kunlarda ham qayta mashq qilish uchun).
// So‘zlarning nusxasi yaratilmaydi: hamma narsa lug‘atdagi id orqali boshqariladi.
import { normalize, lev } from "./engine.js";
import { seededShuffle } from "./cardslogic.js";
import { posClass, cardStatus } from "./lugatlogic.js";

export const KEYS = { words: "myWords", test: "myTest", results: "myResults", wrong: "myWrong" };
export const MAX_RESULTS = 10;
/** Xato so‘z ro‘yxatdan shu qadar ketma-ket to‘g‘ri javobdan keyin chiqariladi (bir marta tasodifan topish yetarli emas). */
export const WRONG_CLEAR_STREAK = 2;

/* ===================== Tanlangan so‘zlar ===================== */

/** Saqlangan qiymatdan xavfsiz tiklaydi: faqat satr, takrorsiz, lug‘atda bor id lar (buzilgan ma’lumot ilovani to‘xtatmaydi). */
export function parseWords(raw, validIds = null) {
  const out = [], seen = new Set();
  for (const x of Array.isArray(raw) ? raw : []) {
    if (typeof x !== "string" || seen.has(x) || (validIds && !validIds.has(x))) continue;
    seen.add(x); out.push(x);
  }
  return out;
}

/**
 * So‘z(lar) qo‘shadi. Natija: { list, added, existing, invalid }.
 * added — yangi qo‘shilganlar soni, existing — oldindan bor edi, invalid — lug‘atda yo‘q (qo‘shilmaydi). Takroriy id kiritilmaydi.
 */
export function addWords(current, ids, validIds = null) {
  const list = parseWords(current), have = new Set(list);
  let added = 0, existing = 0, invalid = 0;
  const seenNow = new Set();
  for (const id of ids || []) {
    if (typeof id !== "string" || (validIds && !validIds.has(id))) { invalid++; continue; }
    if (have.has(id)) { if (!seenNow.has(id)) existing++; continue; }
    have.add(id); seenNow.add(id); list.push(id); added++;
  }
  return { list, added, existing, invalid };
}

export function removeWords(current, ids) {
  const drop = new Set(ids || []);
  return parseWords(current).filter((id) => !drop.has(id));
}

/* ===================== Javoblarni solishtirish ===================== */

const APOS = /[‘’ʻʼ`´']/g;

/** O‘zbekcha javobni solishtirish uchun: kichik harf, har xil apostrof bitta belgiga (o‘ = o' = oʻ), tinish belgilari va «…» siz, ortiqcha bo‘shliqsiz. */
export function normUz(s) {
  let t = String(s == null ? "" : s).toLowerCase().replace(APOS, "'");
  t = t.replace(/…|\.{2,}/g, " ").replace(/[.,!?;:"“”()\[\]]/g, " ");
  t = t.replace(/(^|\s)-+/g, "$1").replace(/\s+/g, " ").trim();
  return t;
}

/** Inglizcha javob uchun: engine.normalize + defis = bo‘shliq + urg‘usiz harf (café = cafe). */
export function normEn(s) {
  return normalize(String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/-/g, " "));
}

const coreCache = new Map();
/**
 * So‘zning O‘ZINING ma’nolari (qavs ichidagi izohsiz): vergul, nuqtali vergul, ikki nuqta va «/» bo‘yicha ajratiladi.
 * «0 (nol)» kabi raqamlarda qavs ichidagi so‘z ham ma’no (0 yoki nol). «salom (norasmiy)» da «norasmiy» — izoh, ma’no emas.
 */
export function coreVariants(uz) {
  const key = String(uz == null ? "" : uz);
  if (coreCache.has(key)) return coreCache.get(key);
  const out = new Set();
  const add = (s) => { const n = normUz(s); if (n) out.add(n); };
  const num = key.match(/^\s*(\d+)\s*\(([^)]+)\)\s*$/);
  if (num) { add(num[1]); add(num[2]); }
  const noParen = key.replace(/\([^)]*\)/g, " ");
  for (const part of noParen.split(/[,;:\/]/)) add(part);
  if (!out.size) add(key);
  const arr = [...out];
  coreCache.set(key, arr);
  return arr;
}

/** O‘zbekcha javob sifatida qabul qilinadigan hamma shakllar: o‘z ma’nolari + matnning to‘liq yozilishi (qavsli ham, qavssiz ham). */
export function uzVariants(uz) {
  const out = new Set(coreVariants(uz));
  const add = (s) => { const n = normUz(s); if (n) out.add(n); };
  add(uz);
  add(String(uz || "").replace(/\([^)]*\)/g, " "));
  return [...out];
}

const isVowel = (c) => /[aeiou]/i.test(c || "");

/** Inglizcha javob sifatida qabul qilinadigan xom shakllar: so‘zning o‘zi + faqat so‘zning O‘Z ma’lumotidagi muqobillar (v.alt)
 *  + so‘z turiga qarab ishonchli shakllar (fe’lga «to», otga a/an/the). Tarjimasi o‘xshash boshqa so‘zlar KIRMAYDI. */
export function enAnswerList(v) {
  const out = [];
  const pc = posClass(v && v.pos);
  for (const base of [v && v.en, ...(v && Array.isArray(v.alt) ? v.alt : [])]) {
    if (!base) continue;
    out.push(base);
    if (pc === "v" && !/^to /i.test(base) && !/\s/.test(base.trim())) out.push("to " + base);
    if (pc === "n" && !/^(a|an|the) /i.test(base)) out.push((isVowel(base[0]) ? "an " : "a ") + base, "the " + base);
  }
  return out;
}
export const enAccepted = (v) => [...new Set(enAnswerList(v).map(normEn).filter(Boolean))];

/* ===================== Ma’nosi o‘xshash so‘zlar (aniqlik uchun) ===================== */

/**
 * Indeks: o‘zbekcha ma’no → shu ma’noga ega so‘zlar. vocabAll — lug‘atdagi barcha so‘zlar (massiv yoki Map.values()).
 * Maqsad — ikki inglizcha so‘z bir xil o‘zbekcha ma’noga ega bo‘lsa (home / house → «uy»), «o‘zbekcha → inglizcha»
 * savolida qaysi biri kutilayotgani noaniq bo‘lib qolmasligi.
 */
export function buildSiblingIndex(vocabAll) {
  const idx = new Map();
  for (const v of vocabAll) {
    if (!v || !v.id) continue;
    for (const c of coreVariants(v.uz)) {
      let arr = idx.get(c); if (!arr) idx.set(c, (arr = []));
      arr.push(v);
    }
  }
  return idx;
}

/** v bilan o‘zbekcha ma’nosi umumiy bo‘lgan boshqa so‘zlar. */
export function siblingsOf(v, sib) {
  const out = new Map();
  for (const c of coreVariants(v.uz)) for (const w of sib.get(c) || []) if (w.id !== v.id) out.set(w.id, w);
  return [...out.values()];
}

/**
 * «O‘zbekcha → inglizcha» yozma savol shu so‘z uchun noaniqmi? Ha: ma’nosi bir xil VA so‘z turi bir xil boshqa so‘z bor
 * (help / assist). So‘z turi boshqa bo‘lsa (slow — sifat, slowly — ravish) savol so‘z turini ko‘rsatadi va ular almashtirilmaydi.
 */
export function isAmbiguousForUz(v, sib) {
  const pc = posClass(v.pos);
  return siblingsOf(v, sib).some((w) => posClass(w.pos) === pc);
}

/* ===================== Bitta javobni baholash ===================== */

/**
 * dir: "en" — savolda inglizcha so‘z, foydalanuvchi O‘ZBEKCHA yozadi; "uz" — savolda o‘zbekcha, foydalanuvchi INGLIZCHA yozadi.
 * Natija: { result: "correct" | "wrong" | "skipped", expected, note? }. Bo‘sh javob — «skipped».
 * Imlo xatosi (masalan 1 harf) to‘g‘ri hisoblanmaydi, lekin izohda aytiladi.
 */
export function gradeAnswer(v, dir, resp, sib = null) {
  const text = String(resp == null ? "" : resp).trim();
  const expected = dir === "uz" ? v.en : v.uz;
  if (!text) return { result: "skipped", expected };
  if (dir === "uz") {
    const u = normEn(text), acc = enAccepted(v);
    if (acc.includes(u)) return { result: "correct", expected };
    const out = { result: "wrong", expected };
    if (sib) {
      const other = siblingsOf(v, sib).find((w) => enAccepted(w).includes(u));
      if (other) out.note = posClass(other.pos) !== posClass(v.pos)
        ? `«${other.en}» boshqa so‘z turi (${other.pos || "—"}); savoldagi so‘z: ${v.pos || "—"}.`
        : `«${other.en}» ham shunga yaqin, lekin bu savolda «${v.en}» kutilgan.`;
    }
    if (!out.note && acc.some((a) => u.length > 3 && lev(a, u) <= 1)) out.note = "Javobingiz to‘g‘riga juda yaqin: imlosini tekshiring.";
    return out;
  }
  const u = normUz(text), acc = uzVariants(v.uz);
  if (acc.includes(u)) return { result: "correct", expected };
  const out = { result: "wrong", expected };
  if (acc.some((a) => u.length > 3 && lev(a, u) <= 1)) out.note = "Javobingiz to‘g‘riga juda yaqin: imlosini tekshiring.";
  return out;
}

/* ===================== Sinov seansi ===================== */

/**
 * Yangi sinov. ids — tanlangan so‘zlar; vocabMap — id → so‘z; sib — buildSiblingIndex natijasi.
 * Hamma so‘z aynan bir marta, aralashtirib chiqadi. Yo‘nalishlar (en → uz / uz → en) taxminan teng, aralash taqsimlanadi;
 * noaniq so‘zlar (isAmbiguousForUz) faqat «inglizcha → o‘zbekcha» yo‘nalishida so‘raladi. Seed bir xil bo‘lsa, tartib ham bir xil (tiklash uchun).
 */
export function newTest({ ids, vocabMap, sib, seed = 1, kind = "all", now = Date.now() }) {
  const seen = new Set(), valid = [];
  for (const id of ids || []) if (typeof id === "string" && !seen.has(id) && vocabMap.has(id)) { seen.add(id); valid.push(id); }
  const order = seededShuffle(valid, seed);
  const half = Math.floor(order.length / 2);
  const pattern = seededShuffle(order.map((_, i) => (i < half ? "uz" : "en")), seed * 7 + 3);
  const dirs = {};
  order.forEach((id, i) => { dirs[id] = pattern[i] === "uz" && !isAmbiguousForUz(vocabMap.get(id), sib) ? "uz" : "en"; });
  return { v: 1, id: "t" + now, kind, ids: order, dirs, answers: {}, idx: 0, startedAt: now, finishedAt: null };
}

export const answeredCount = (s) => Object.keys(s.answers || {}).length;
/** Hozir javob kutilayotgan so‘z (yoki null). */
export function currentId(s) {
  if (!s || s.finishedAt) return null;
  for (const id of s.ids) if (!s.answers[id]) return id;
  return null;
}

const CODE = { correct: "c", wrong: "w", skipped: "s" };
const NAME = { c: "correct", w: "wrong", s: "skipped" };

/**
 * Javobni qayd qiladi (seansni o‘zgartirmaydi, yangisini qaytaradi). Bitta so‘zga ikkinchi marta javob berib bo‘lmaydi.
 * Natija: { session, grade } yoki null (so‘z seansda yo‘q yoki allaqachon javob berilgan).
 */
export function answerTest(s, id, resp, v, sib, now = Date.now()) {
  if (!s || s.finishedAt || !s.ids.includes(id) || s.answers[id]) return null;
  const dir = s.dirs[id] || "en";
  const grade = gradeAnswer(v, dir, resp, sib);
  const answers = { ...s.answers, [id]: { r: CODE[grade.result], a: String(resp == null ? "" : resp).trim(), ts: now } };
  const next = { ...s, answers };
  next.idx = s.ids.findIndex((x) => !answers[x]);
  if (next.idx < 0) { next.idx = s.ids.length; next.finishedAt = now; }
  return { session: next, grade };
}

/** O‘tkazib yuborish = bo‘sh javob. */
export const skipTest = (s, id, v, sib, now) => answerTest(s, id, "", v, sib, now);

/** Saqlangan seansni tekshiradi. validIds — hozir lug‘atda bor id lar: yo‘q so‘zlar seansdan tushiriladi. Yaroqsiz bo‘lsa null. */
export function parseTest(raw, validIds = null) {
  if (!raw || typeof raw !== "object" || raw.v !== 1 || !Array.isArray(raw.ids) || !raw.answers || typeof raw.answers !== "object" || !raw.dirs || typeof raw.dirs !== "object") return null;
  const ids = raw.ids.filter((x) => typeof x === "string" && (!validIds || validIds.has(x)));
  if (!ids.length) return null;
  const answers = {};
  for (const id of ids) { const a = raw.answers[id]; if (a && NAME[a.r]) answers[id] = { r: a.r, a: typeof a.a === "string" ? a.a : "", ts: Number(a.ts) || 0 }; }
  const dirs = {};
  for (const id of ids) dirs[id] = raw.dirs[id] === "uz" ? "uz" : "en";
  const done = ids.every((id) => answers[id]);
  const s = { v: 1, id: String(raw.id || ""), kind: String(raw.kind || "all"), ids, dirs, answers, idx: 0, startedAt: Number(raw.startedAt) || 0, finishedAt: done ? Number(raw.finishedAt) || Date.now() : null };
  s.idx = done ? ids.length : ids.findIndex((x) => !answers[x]);
  return s;
}
export const isResumable = (s) => !!s && !s.finishedAt && answeredCount(s) < s.ids.length;

/* ===================== Natija ===================== */

export const RESULT_TEXT = {
  low: "Yana bir bor urinib ko‘ring! Har bir takrorlash sizni maqsadingizga yaqinlashtiradi.",
  ok: "Yaxshi! Siz to‘g‘ri yo‘ldasiz. Yana biroz mashq qiling!",
  good: "Barakalla! Juda yaxshi natija. Shu tempda davom eting!",
  perfect: "PERFECT! Ajoyib! Siz barcha so‘zlarni to‘g‘ri topdingiz!",
};

/** Natija = to‘g‘ri javoblar / jami so‘zlar × 100. Foiz pastga yaxlitlanadi, shuning uchun 100% faqat HAMMASI to‘g‘ri bo‘lganda chiqadi. */
export function pctOf(correct, total) { return total > 0 ? Math.floor((correct / total) * 100 + 1e-9) : 0; }

export function levelOf(correct, total) {
  if (total > 0 && correct === total) return "perfect";
  const p = total > 0 ? (correct / total) * 100 : 0;
  return p >= 75 ? "good" : p >= 50 ? "ok" : "low";
}

export function summarize(s) {
  const total = s.ids.length;
  let correct = 0, wrong = 0, skipped = 0;
  for (const id of s.ids) {
    const a = s.answers[id];
    if (!a) skipped++; // javobsiz qolgan = o‘tkazilgan deb hisoblanadi (seans tugamay qolgan bo‘lsa ham hisob buzilmaydi)
    else if (a.r === "c") correct++; else if (a.r === "w") wrong++; else skipped++;
  }
  const pct = pctOf(correct, total), level = levelOf(correct, total);
  return { total, correct, wrong, skipped, pct, level, message: RESULT_TEXT[level] };
}

/** Yakuniy jadval satrlari: tanlangan HAMMA so‘z (seansdagi tartibda). */
export function resultRows(s, vocabMap) {
  return s.ids.map((id, i) => {
    const v = vocabMap.get(id) || { en: id, uz: "" };
    const a = s.answers[id];
    const r = a ? NAME[a.r] : "skipped";
    return { n: i + 1, id, en: v.en, uz: v.uz, pos: v.pos || "", dir: s.dirs[id] || "en", answer: a ? a.a : "", result: r, expected: s.dirs[id] === "uz" ? v.en : v.uz };
  });
}

/** Qayta ishlash uchun so‘zlar: "wrong" | "skipped" | "all". */
export function retestIds(s, which) {
  if (which === "all") return [...s.ids];
  const want = which === "wrong" ? "w" : "s";
  return s.ids.filter((id) => { const a = s.answers[id]; return which === "skipped" ? !a || a.r === "s" : a && a.r === want; });
}

/* ===================== Natijalar tarixi va o‘sish ===================== */

export function parseResults(raw) {
  if (!Array.isArray(raw)) return [];
  const ok = raw.filter((r) => r && typeof r === "object" && typeof r.id === "string" && [r.ts, r.total, r.correct, r.wrong, r.skipped, r.pct].every((n) => typeof n === "number" && Number.isFinite(n)));
  return ok.slice(-MAX_RESULTS);
}

/** Tugagan sinov natijasini tarixga qo‘shadi (bitta seans ikki marta yozilmaydi). */
export function pushResult(list, s, now = Date.now()) {
  const sm = summarize(s);
  const rec = { id: s.id, ts: s.finishedAt || now, kind: s.kind, total: sm.total, correct: sm.correct, wrong: sm.wrong, skipped: sm.skipped, pct: sm.pct };
  const base = parseResults(list).filter((r) => r.id !== s.id);
  return [...base, rec].slice(-MAX_RESULTS);
}

/** Oxirgi natija va oldingi to‘liq sinovga nisbatan o‘zgarish (faqat ikkalasi ham «all» turida bo‘lsa). */
export function trend(results) {
  const list = parseResults(results);
  const last = list[list.length - 1] || null;
  if (!last) return { last: null, prev: null, delta: null };
  let prev = null;
  if (last.kind === "all") for (let i = list.length - 2; i >= 0; i--) if (list[i].kind === "all") { prev = list[i]; break; }
  return { last, prev, delta: prev ? last.pct - prev.pct : null };
}

/* ===================== Xato so‘zlar ===================== */

export function parseWrong(raw, validIds = null) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [id, r] of Object.entries(raw)) {
    if (validIds && !validIds.has(id)) continue;
    if (!r || typeof r !== "object") continue;
    out[id] = { n: Math.max(1, Math.floor(Number(r.n)) || 1), last: Number(r.last) || 0, streak: Math.max(0, Math.floor(Number(r.streak)) || 0) };
  }
  return out;
}

/** Bitta javobni xato so‘zlar ro‘yxatiga ta’sir ettiradi: xato → qo‘shiladi / n+1; to‘g‘ri → ketma-ketlik +1, WRONG_CLEAR_STREAK ga yetsa chiqariladi; o‘tkazish → o‘zgarmaydi. */
export function applyWrong(map, id, result, now = Date.now()) {
  const next = { ...parseWrong(map) };
  if (result === "wrong") next[id] = { n: ((next[id] && next[id].n) || 0) + 1, last: now, streak: 0 };
  else if (result === "correct" && next[id]) {
    const streak = next[id].streak + 1;
    if (streak >= WRONG_CLEAR_STREAK) delete next[id]; else next[id] = { ...next[id], streak, last: now };
  }
  return next;
}

/* ===================== SRS bilan bog‘lash ===================== */

/**
 * Sinov natijasini MAVJUD SRS kartasiga yozadi (gradeFn = learn.gradeVocab). Yangi karta HECH QACHON yaratilmaydi:
 * kartasi yo‘q so‘z (darsda hali ko‘rilmagan) uchun gradeFn chaqirilmaydi — u faqat xato so‘zlar ro‘yxatida (myWrong) qoladi.
 *   xato        → «again» (har doim);
 *   to‘g‘ri     → «good», lekin faqat takror muddati kelgan yoki hali takrorlanmagan kartaga: muddati kelmagan kartaga
 *                 qayta-qayta to‘g‘ri javob berish intervalni sun’iy cho‘zmasin (bir marta 100% o‘zlashtirish degani emas);
 *   o‘tkazilgan → o‘zgarmaydi.
 * Natija: { action: "graded" | "no-card" | "no-credit" | "skipped", grade? }
 */
export function applyToSrs(id, result, { cards, gradeFn, now = Date.now(), masteryStage = 4 }) {
  if (result === "skipped") return { action: "skipped" };
  const card = cards.get("v:" + id + ":rec");
  if (!card) return { action: "no-card" };
  if (result === "wrong") { gradeFn(id, "again", now); return { action: "graded", grade: "again" }; }
  const st = cardStatus(card, now, masteryStage);
  if (!(st.isDue || st.isNew)) return { action: "no-credit" };
  gradeFn(id, "good", now);
  return { action: "graded", grade: "good" };
}

/* ===================== Statistika ===================== */

/** Sahifadagi 3–4 ta son: jami, o‘zlashtirilgan, takror kerak, xato so‘zlar; kartasi yo‘q so‘zlar alohida aytiladi. */
export function computeStats(ids, { cards, wrong = {}, results = [], masteryStage = 4, now = Date.now() }) {
  let withCard = 0, mastered = 0, due = 0;
  for (const id of ids) {
    const c = cards.get("v:" + id + ":rec");
    if (!c) continue;
    withCard++;
    const st = cardStatus(c, now, masteryStage);
    if (st.mastered) mastered++;
    if (st.isDue) due++;
  }
  const have = new Set(ids);
  const wrongIds = Object.keys(wrong).filter((id) => have.has(id));
  const top = wrongIds.map((id) => ({ id, n: wrong[id].n })).sort((a, b) => b.n - a.n || (a.id < b.id ? -1 : 1)).slice(0, 3);
  return { total: ids.length, withCard, noCard: ids.length - withCard, mastered, due, wrongCount: wrongIds.length, topWrong: top, trend: trend(results) };
}

/* ===================== Mashq (Mashq qilish bosqichi) ===================== */

function rngFrom(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const overlap = (a, b) => a.some((x) => b.includes(x));

/** Misol gapda so‘z butun holda uchrasa, bo‘sh joyli gap yasaydi (aks holda null). Juda qisqa/umumiy so‘zlarda bo‘sh joy mashqi ma’nosiz. */
export function clozeFor(v) {
  const en = String((v && v.en) || "").trim();
  const sentence = v && v.ex && v.ex.en;
  if (!sentence || !en) return null;
  const pc = posClass(v.pos);
  if (pc === "o" ? !(/\s/.test(en) && en.length >= 6) : en.length < 4) return null;
  const m = new RegExp("(^|[^A-Za-z’'])(" + esc(en) + ")(?![A-Za-z])", "i").exec(sentence);
  if (!m) return null;
  const token = m[2], at = m.index + m[1].length;
  return { text: sentence.slice(0, at) + "___" + sentence.slice(at + token.length), answers: [...new Set([token, en])], hint: `Birinchi harf: ${token[0]}` };
}

function pickDistractors(v, pool, seed, labelOf, n = 3) {
  const core = coreVariants(v.uz), pc = posClass(v.pos), want = normEn(v.en);
  const same = [], other = [], labels = new Set([labelOf(v)]);
  for (const p of seededShuffle(pool, seed)) {
    if (p.id === v.id || !p.en || !p.uz) continue;
    if (overlap(core, coreVariants(p.uz)) || normEn(p.en) === want) continue; // bir xil ma’noli so‘z variant bo‘lmasin (home / house)
    (posClass(p.pos) === pc ? same : other).push(p);
  }
  const out = [];
  for (const p of [...same, ...other]) {
    const l = labelOf(p);
    if (labels.has(l)) continue;
    labels.add(l); out.push(l);
    if (out.length === n) break;
  }
  return out;
}

const tag = (v) => (v.pos ? ` (${v.pos})` : "");
const whyOf = (v) => `«${v.en}» — «${v.uz}».${v.ex ? " Misol: " + v.ex.en + " — " + v.ex.uz : ""}`;

function choiceEx(v, dir, vocabAll, seed) {
  const labelOf = dir === "uz" ? (p) => p.en : (p) => p.uz;
  const right = labelOf(v);
  const options = seededShuffle([right, ...pickDistractors(v, vocabAll, seed, labelOf)], seed + 11);
  if (options.length < 3) return null;
  return {
    id: (dir === "uz" ? "vrec:mw2:" : "vrec:mw1:") + v.id, type: "choice", skill: "vocabulary", concept: "vocab:" + v.id, phase: "practice", wordId: v.id,
    prompt: dir === "uz" ? `${v.uz}${tag(v)}` : v.en, promptKind: dir === "uz" ? "text" : "word", options, answer: options.indexOf(right), why: whyOf(v),
  };
}

function typeEx(v) {
  const answers = [...new Set(enAnswerList(v).flatMap((a) => [a, a.replace(/-/g, " "), a.normalize("NFD").replace(/[̀-ͯ]/g, "")]))];
  return { id: "vprod:mwt:" + v.id, type: "translate", skill: "vocabulary", concept: "vocab:" + v.id, phase: "practice", wordId: v.id, prompt: `${v.uz}${tag(v)}`, answers, why: whyOf(v) };
}

function fillEx(v) {
  const c = clozeFor(v);
  if (!c) return null;
  return { id: "vprod:mwc:" + v.id, type: "fill", skill: "vocabulary", concept: "vocab:" + v.id, phase: "practice", wordId: v.id, text: c.text, answers: c.answers, hint: c.hint, uz: v.ex.uz, why: whyOf(v) };
}

function recallEx(v) {
  return { id: "vrecall:mw:" + v.id, type: "recall", skill: "vocabulary", concept: "vocab:" + v.id, phase: "practice", wordId: v.id, front: v.en, speak: v.en, back: v.uz, example: v.ex ? { en: v.ex.en, uz: v.ex.uz } : null, why: whyOf(v) };
}

/** Moslashtirish: ma’nosi o‘xshash (umumiy ma’noli) so‘zlar bir guruhga tushmasin, o‘zbekcha tomonlari bir xil bo‘lmasin. */
function matchGroup(words) {
  const group = [];
  for (const v of words) {
    if (group.length === 5) break;
    if (group.some((g) => overlap(coreVariants(g.uz), coreVariants(v.uz)) || g.uz === v.uz)) continue;
    group.push(v);
  }
  return group;
}

/**
 * Mashqlar to‘plami. Har so‘z bir seansda bir marta (moslashtirish guruhi ham shuning hisobida) va har xil turda so‘raladi:
 * inglizcha→o‘zbekcha tanlash, o‘zbekcha→inglizcha tanlash, bo‘sh joyni to‘ldirish, moslashtirish, mustaqil yozish / eslash.
 * Noaniq so‘zlar uchun yozma «o‘zbekcha → inglizcha» tuzilmaydi (ularda variantli tanlash bor: noto‘g‘ri variantlar ma’nosi bir xil so‘zlarni o‘z ichiga olmaydi).
 * Seed har safar boshqacha bo‘lsa, to‘plam ham boshqacha bo‘ladi.
 */
export function buildPractice({ ids, vocabMap, vocabAll, sib, count = 10, seed = 1 }) {
  const valid = []; const seen = new Set();
  for (const id of ids || []) if (typeof id === "string" && !seen.has(id) && vocabMap.has(id)) { seen.add(id); valid.push(id); }
  const words = seededShuffle(valid, seed).slice(0, Math.max(0, count)).map((id) => vocabMap.get(id));
  const rng = rngFrom(seed + 5);
  const items = [];
  let singles = words;
  if (words.length >= 5) {
    const g = matchGroup(words);
    if (g.length >= 3) {
      items.push({ id: "vrec:mwm:" + g[0].id, type: "match", skill: "vocabulary", concept: "vocab:" + g[0].id, phase: "practice", wordId: g[0].id, wordIds: g.map((x) => x.id),
        prompt: "Juftlarini toping", pairs: g.map((x) => [x.en, x.uz]), why: g.map((x) => `${x.en} = ${x.uz}`).join("; ") + "." });
      const used = new Set(g.map((x) => x.id));
      singles = words.filter((w) => !used.has(w.id));
    }
  }
  const offset = Math.floor(rng() * 5);
  singles.forEach((v, i) => {
    const amb = sib ? isAmbiguousForUz(v, sib) : false;
    const order = ["en2uz", "uz2en", "fill", "type", "recall"];
    for (let k = 0; k < order.length; k++) {
      const kind = order[(i + offset + k) % order.length];
      let ex = null;
      if (kind === "en2uz") ex = choiceEx(v, "en", vocabAll, seed + i);
      else if (kind === "uz2en") ex = choiceEx(v, "uz", vocabAll, seed + i);
      else if (kind === "fill") ex = fillEx(v);
      else if (kind === "type") ex = amb ? null : typeEx(v);
      else ex = recallEx(v);
      if (ex) { items.push(ex); break; }
    }
  });
  return seededShuffle(items, seed + 99);
}

/** O‘rganish bosqichi uchun kartochkalar tartibi: tanlangan so‘zlar saqlangan tartibda, lug‘atda yo‘q id lar tushiriladi. */
export function learnDeck(ids, vocabMap) {
  return parseWords(ids, new Set(vocabMap.keys()));
}
