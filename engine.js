// engine.js — mashq javoblarini tekshirish (sof mantiq, DOM yo‘q)

// Aniq qisqartmalar (bitta ma’no). Tartib muhim: uzunroq/maxsus shakllar oldin.
const CONTRACTIONS = [
  ["won't", "will not"], ["shan't", "shall not"], ["can't", "cannot"], ["let's", "let us"],
  ["isn't", "is not"], ["aren't", "are not"], ["wasn't", "was not"], ["weren't", "were not"],
  ["don't", "do not"], ["doesn't", "does not"], ["didn't", "did not"],
  ["haven't", "have not"], ["hasn't", "has not"], ["hadn't", "had not"],
  ["shouldn't", "should not"], ["couldn't", "could not"], ["wouldn't", "would not"],
  ["mustn't", "must not"], ["needn't", "need not"], ["mightn't", "might not"],
  ["i'm", "i am"], ["you're", "you are"], ["we're", "we are"], ["they're", "they are"], ["who're", "who are"], ["what're", "what are"],
];
// Olmoshlar: 'll → will, 've → have (bitta ma’no); 's → is/has, 'd → would/had (ikki ma’no).
const PRON = "i|you|he|she|it|we|they|that|there|who|what|where|here|how";
const S_PRON = "he|she|it|that|there|what|where|who|how|here";
const AMBIG = [
  { re: new RegExp("\\b(" + S_PRON + ")'s\\b", "g"), alts: ["is", "has"] },
  { re: new RegExp("\\b(" + PRON + ")'d\\b", "g"), alts: ["would", "had"] },
];

function baseNormalize(s) {
  let t = String(s ?? "").toLowerCase().replace(/[‘’`´ʼʻ]/g, "'");
  t = t.replace(/[.,!?;:"“”()]/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  for (const [a, b] of CONTRACTIONS) t = t.replace(new RegExp("\\b" + a + "(?![\\w'])", "g"), b);
  t = t.replace(new RegExp("\\b(" + PRON + ")'ll\\b", "g"), "$1 will");
  t = t.replace(new RegExp("\\b(" + PRON + ")'ve\\b", "g"), "$1 have");
  t = t.replace(/\bcan not\b/g, "cannot");
  return t;
}

/** Javobni solishtirish uchun bir xil shaklga keltiradi ('s → is, 'd → would — asosiy ma’no). */
export function normalize(s) {
  let t = baseNormalize(s);
  for (const { re, alts } of AMBIG) t = t.replace(re, "$1 " + alts[0]);
  return t.replace(/\s+/g, " ").trim();
}

// O‘tgan zamon sifatdoshi (V3) va Present Perfect bilan keladigan so‘zlar: «'s/'d» dan keyin kelsa — has/had.
const IRREG_V3 = "been|gone|done|seen|eaten|written|left|made|had|taken|given|got|gotten|bought|brought|thought|told|said|found|known|met|lost|sent|spent|won|read|heard|kept|slept|felt|paid|built|forgotten|broken|chosen|driven|flown|grown|run|swum|sung|drunk|begun|become|come|put|cut|hit|let|set|shut|understood|stood|taught|caught|fallen|risen|shown|spoken|stolen|worn|woken";
const PERF_ADV = "just|already|never|ever|always|recently|not been|not got|not seen|not done";
// -ed bilan tugaydigan, lekin odatda sifat bo‘lib «is» bilan keladigan so‘zlar.
const ED_ADJ = new Set(["tired", "married", "bored", "interested", "worried", "excited", "surprised", "scared", "pleased", "closed", "retired", "injured", "located", "allowed", "supposed", "used", "confused", "annoyed", "disappointed", "frightened", "embarrassed", "relaxed", "crowded", "talented", "satisfied", "amazed", "shocked", "stressed", "named", "called", "based", "finished", "prepared", "dressed", "engaged", "divorced", "qualified", "experienced", "organised", "organized", "required", "needed", "involved", "related", "connected", "delayed", "cancelled", "canceled", "booked", "parked", "broken", "lost", "late"]);

function perfLike(word, next) {
  if (!word) return false;
  if (new RegExp("^(" + IRREG_V3 + ")$").test(word)) return true;
  if (new RegExp("^(" + PERF_ADV + ")$").test(word) || new RegExp("^(" + PERF_ADV + ")$").test(word + " " + (next || ""))) return true;
  return /ed$/.test(word) && !ED_ADJ.has(word);
}

/** Kalit javobidagi qisqartmani kontekst bo‘yicha BITTA ma’noga ochadi (yolg‘on «to‘g‘ri» bo‘lmasligi uchun). */
function normalizeKey(s) {
  const words = baseNormalize(s).split(" ");
  const out = [];
  for (let i = 0; i < words.length; i++) {
    const m = words[i].match(/^(\w+)'(s|d)$/);
    const w1 = words[i + 1], w2 = words[i + 2];
    if (m && m[2] === "s" && new RegExp("^(" + S_PRON + ")$").test(m[1])) out.push(m[1], perfLike(w1, w2) ? "has" : "is");
    else if (m && m[2] === "d" && new RegExp("^(" + PRON + ")$").test(m[1])) out.push(m[1], w1 === "better" || perfLike(w1, w2) ? "had" : "would");
    else out.push(words[i]);
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * O‘quvchi javobidagi ikki ma’noli qisqartmalarning barcha o‘qilishlari: «she's been» → «she is been» va «she has been».
 * Kombinatsiyalar soni cheklangan.
 */
export function normalizeAll(s) {
  let outs = [baseNormalize(s)];
  for (const { re, alts } of AMBIG) {
    const next = [];
    for (const t of outs) {
      const parts = t.split(re); // [matn, olmosh, matn, olmosh, ...]
      if (parts.length === 1) { next.push(t); continue; }
      let acc = [parts[0]];
      for (let i = 1; i < parts.length; i += 2) {
        const tail = parts[i + 1] ?? "";
        acc = acc.flatMap((a) => alts.map((w) => a + parts[i] + " " + w + tail)).slice(0, 16);
      }
      next.push(...acc);
    }
    outs = next.slice(0, 32);
  }
  return [...new Set(outs.map((t) => t.replace(/\s+/g, " ").trim()))];
}

/** O‘quvchi javobi kalit javobga mosmi (qisqartmalar ikkala tomonda hisobga olinadi). */
export function sameText(key, user) {
  const k = normalizeKey(key);
  return normalizeAll(user).includes(k);
}

export function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Yozma javobdagi imlo/uslub eslatmasi (javobni noto‘g‘ri qilmaydi). */
export function styleNote(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  const notes = [];
  if (/^[a-z]/.test(t)) notes.push("Gap bosh harf bilan boshlanadi.");
  if (/\bi\b/.test(t) && !/\bI\b/.test(t)) notes.push("«I» doim bosh harf bilan yoziladi.");
  if (t.split(/\s+/).length > 2 && !/[.!?]$/.test(t)) notes.push("Gap oxirida nuqta yoki so‘roq belgisi qo‘yiladi.");
  return notes.length ? notes.join(" ") : null;
}

export function acceptedList(ex) {
  if (ex.type === "order" || ex.type === "translate" || ex.type === "correct" || ex.type === "fill") return ex.answers || [];
  return [];
}

/**
 * Javobni tekshiradi.
 * choice/listen: resp = asl variant indeksi; fill/translate/correct: matn;
 * order: so‘zlar massivi; match: { wrong: son }.
 */
export function checkAnswer(ex, resp) {
  switch (ex.type) {
    case "choice":
    case "listen":
      return { correct: resp === ex.answer, near: false };
    case "match":
      return { correct: !!resp && resp.wrong === 0, near: false, wrong: resp ? resp.wrong : 0 };
    case "recall": // faol eslash kartochkasi: resp = { grade: 0..3 } (0 eslanmadi, 1 qiyin, 2 esladim, 3 oson)
      return { correct: !!resp && resp.grade >= 2, near: false, grade: resp ? resp.grade : 0 };
    case "order": {
      const u = Array.isArray(resp) ? resp.join(" ") : resp;
      const ok = (ex.answers || []).some((a) => sameText(a, u));
      return { correct: ok, near: false };
    }
    default: {
      const raw = String(resp ?? "");
      const u = normalize(raw);
      if (!u) return { correct: false, near: false, empty: true };
      const list = (ex.answers || []).map(normalize);
      if ((ex.answers || []).some((a) => sameText(a, raw))) return { correct: true, near: false, style: styleNote(raw) };
      const near = list.some((a) => u.length > 2 && lev(a, u) <= 2);
      return { correct: false, near };
    }
  }
}

/** To‘g‘ri javob matni (ko‘rsatish uchun). */
export function expectedText(ex) {
  switch (ex.type) {
    case "choice":
    case "listen": return ex.options[ex.answer];
    case "match": return ex.pairs.map((p) => p[0] + " = " + p[1]).join("; ");
    case "recall": return ex.back;
    default: return (ex.answers || [""])[0];
  }
}

/** choice/listen uchun variantlarni aralashtiradi, asl indeksni saqlaydi. */
export function shuffledOptions(ex, rng = Math.random) {
  return shuffle(ex.options.map((text, orig) => ({ text, orig })), rng);
}

/* ---------- Takrorlash uchun dinamik mashqlar ---------- */

export function makeVocabRecEx(v, pool, rng = Math.random) {
  // Noto‘g‘ri variantlar o‘zaro va to‘g‘ri javob bilan bir xil matnli bo‘lmasligi kerak (masalan, home va house — ikkalasi «uy»).
  const seen = new Set([v.uz]);
  const others = [];
  for (const p of shuffle(pool.filter((q) => q.id !== v.id), rng)) {
    if (seen.has(p.uz)) continue;
    seen.add(p.uz); others.push(p);
    if (others.length === 3) break;
  }
  const options = [v.uz, ...others.map((o) => o.uz)];
  const order = shuffle(options.map((t, i) => i), rng);
  const opts = order.map((i) => options[i]);
  return {
    id: "vrec:" + v.id, type: "choice", skill: "vocabulary", concept: "vocab:" + v.id, phase: "review",
    prompt: v.en, speak: v.en, promptKind: "word", options: opts, answer: opts.indexOf(v.uz),
    why: `«${v.en}» — «${v.uz}». Misol: ${v.ex ? v.ex.en + " — " + v.ex.uz : ""}`,
  };
}

export function makeVocabProdEx(v) {
  const answers = [v.en, ...(v.alt || [])];
  return {
    id: "vprod:" + v.id, type: "translate", skill: "vocabulary", concept: "vocab:" + v.id, phase: "review",
    prompt: v.uz, answers, why: `«${v.uz}» inglizchada «${v.en}». Misol: ${v.ex ? v.ex.en + " — " + v.ex.uz : ""}`,
  };
}

/** Misol gapdan tinglab tushunish mashqi. */
export function makeListenEx(v, pool, rng = Math.random) {
  const withEx = pool.filter((p) => p.ex && p.ex.en && p.id !== v.id);
  const seen = new Set([v.ex.uz]);
  const others = [];
  for (const p of shuffle(withEx, rng)) {
    if (seen.has(p.ex.uz)) continue;
    seen.add(p.ex.uz); others.push(p.ex.uz);
    if (others.length === 3) break;
  }
  const options = [v.ex.uz, ...others];
  const opts = shuffle(options, rng);
  return {
    id: "vlis:" + v.id, type: "listen", skill: "listening", concept: "listen:" + v.id, phase: "review",
    say: v.ex.en, ask: "Eshitgan gapingiz ma’nosi qaysi?", options: opts, answer: opts.indexOf(v.ex.uz),
    why: `Gap: «${v.ex.en}» — «${v.ex.uz}».`,
  };
}

/** Faol eslash kartochkasi: inglizcha so‘z ko‘rsatiladi, foydalanuvchi ma’nosini eslaydi, so‘ng javobni ochib o‘zini baholaydi. */
export function makeVocabRecallEx(v, mnemonic = null) {
  return {
    id: "vrecall:" + v.id, type: "recall", skill: "vocabulary", concept: "vocab:" + v.id, phase: "review",
    front: v.en, speak: v.en, back: v.uz, example: v.ex ? { en: v.ex.en, uz: v.ex.uz } : null, mnemonic: mnemonic || null,
    why: `«${v.en}» — «${v.uz}».${v.ex ? " Misol: " + v.ex.en + " — " + v.ex.uz : ""}`,
  };
}
