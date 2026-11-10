// pronounce.js — gapirishni baholash mantiqi (sof mantiq, DOM yo‘q). Ovozni tanish: recognize.js.
// Brauzer aytilgan gapni matnga aylantiradi; bu yerda o‘sha matn namuna gap bilan so‘zma-so‘z solishtiriladi.
// Bu talaffuzni tovushma-tovush baholamaydi: «brauzer so‘zni tanidimi» degan amaliy o‘lchov.
import { normalize } from "./engine.js";

const NUMS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
const ORD = { "1st": "first", "2nd": "second", "3rd": "third", "4th": "fourth", "5th": "fifth" };

/** Gapni solishtirish uchun so‘zlarga ajratadi: qisqartmalar ochiladi, raqamlar so‘zga aylanadi («3» → «three»). */
const S_PRON = new Set(["he", "she", "it", "that", "there", "what", "where", "who", "here", "how"]);
const D_PRON = new Set(["i", "you", "he", "she", "it", "we", "they"]);

/** Bitta matnni tokenlarga ajratadi («'s/'d» birlashtirilmagan). */
function rawTokens(s) {
  const pre = String(s ?? "").replace(/\b([ap])\.\s?m\.?/gi, "$1m").replace(/[-–—/]/g, " ").replace(/\.\.\.|…/g, " ");
  return normalize(pre).split(" ").filter(Boolean).flatMap((w) => {
    if (ORD[w]) return [ORD[w]];
    if (/^\d+$/.test(w) && +w <= 20) return [NUMS[+w]];
    if (/^\d+(am|pm)$/.test(w)) { const n = +w.slice(0, -2); return [n <= 20 ? NUMS[n] : String(n), w.slice(-2)]; }
    return [w.replace(/'s$/, "").replace(/'/g, "")];
  });
}

/** «she's» ham «she is», ham «she has» bo‘lishi mumkin: ovozda farqi yo‘q, shuning uchun bir xil belgi («'s», «'d»). */
function unify(toks) {
  return toks.map((w, i) => (i > 0 && (w === "is" || w === "has") && S_PRON.has(toks[i - 1]) ? "'s" : i > 0 && (w === "would" || w === "had") && D_PRON.has(toks[i - 1]) ? "'d" : w));
}

/** Gapni solishtirish uchun so‘zlarga ajratadi: qisqartmalar ochiladi, raqamlar so‘zga aylanadi («3» → «three»). */
export function speechTokens(s) { return unify(rawTokens(s)); }

/**
 * Namuna gap (model) va eshitilgan matn variantlarini (heard: [{ text, confidence }] yoki satrlar) solishtiradi.
 * Eng yaxshi mos keladigan variant tanlanadi. Natija:
 *   { score: 0..1, words: [{ w, ok }], heard, matched, total, level: "good" | "ok" | "low" }
 * words — namuna gapning so‘zlari (asl yozilishida), ok — shu so‘z eshitilgan matnda tartib bo‘yicha topildimi.
 */
export function scoreSpeech(model, heard) {
  const display = String(model ?? "").replace(/[–—]/g, " ").split(/\s+/).filter(Boolean);
  // Har bir ko‘rinadigan so‘zga uning tokenlarini bog‘laymiz (masalan «I’m» → «i», «am»).
  const map = display.map((w) => ({ w, toks: rawTokens(w) })).filter((x) => x.toks.length);
  const flat = map.flatMap((x, i) => x.toks.map((t) => ({ t, i })));
  const uni = unify(flat.map((x) => x.t));
  const target = flat.map((x, k) => ({ t: uni[k], i: x.i }));
  const alts = (Array.isArray(heard) ? heard : [heard]).map((h) => (typeof h === "string" ? { text: h } : h)).filter((h) => h && h.text);
  let best = null;
  for (const alt of alts.length ? alts : [{ text: "" }]) {
    const said = speechTokens(alt.text);
    const hit = lcsHits(target.map((x) => x.t), said);
    const matched = hit.filter(Boolean).length;
    if (!best || matched > best.matched) best = { hit, matched, text: alt.text };
  }
  const okWord = map.map((_, i) => target.every((x, k) => x.i !== i || best.hit[k]));
  const total = map.length;
  const matchedWords = okWord.filter(Boolean).length;
  const score = total ? matchedWords / total : 0;
  return {
    score, matched: matchedWords, total, heard: best.text,
    words: map.map((x, i) => ({ w: x.w, ok: okWord[i] })),
    level: score >= 0.9 ? "good" : score >= 0.6 ? "ok" : "low",
  };
}

/** Eng uzun umumiy ketma-ketlik: target ning qaysi tokenlari said da shu tartibda bor. */
function lcsHits(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hit = new Array(m).fill(false);
  for (let i = 0, j = 0; i < m && j < n;) {
    if (a[i] === b[j]) { hit[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  return hit;
}

/** Natija uchun qisqa o‘zbekcha izoh. */
export function speechFeedback(r) {
  if (!r || !r.total) return "";
  const missed = r.words.filter((x) => !x.ok).map((x) => x.w.replace(/[.,!?;:"“”]/g, ""));
  if (!r.heard) return "Hech narsa eshitilmadi. Telefonni yaqinroq tuting va aniqroq ayting.";
  if (r.level === "good") return missed.length ? `Juda yaxshi. Faqat «${missed.join("», «")}» aniq eshitilmadi.` : "Ajoyib: hamma so‘z aniq eshitildi.";
  if (r.level === "ok") return `Yaxshi. Aniq eshitilmagan so‘zlar: «${missed.slice(0, 5).join("», «")}». Namunani tinglab, shu so‘zlarni qayta ayting.`;
  return "Ko‘p so‘z tanilmadi. Namunani bir necha marta tinglang, sekinroq va aniqroq qayta ayting.";
}
