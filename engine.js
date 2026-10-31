// engine.js — mashq javoblarini tekshirish (sof mantiq, DOM yo‘q)

const CONTRACTIONS = [
  ["i'm", "i am"], ["you're", "you are"], ["he's", "he is"], ["she's", "she is"],
  ["it's", "it is"], ["we're", "we are"], ["they're", "they are"], ["that's", "that is"],
  ["there's", "there is"], ["what's", "what is"], ["where's", "where is"], ["who's", "who is"],
  ["how's", "how is"], ["let's", "let us"], ["isn't", "is not"], ["aren't", "are not"],
  ["wasn't", "was not"], ["weren't", "were not"], ["don't", "do not"], ["doesn't", "does not"],
  ["didn't", "did not"], ["can't", "cannot"], ["won't", "will not"], ["haven't", "have not"],
  ["hasn't", "has not"], ["i've", "i have"], ["i'll", "i will"], ["i'd", "i would"],
];

/** Javobni solishtirish uchun bir xil shaklga keltiradi. */
export function normalize(s) {
  let t = String(s ?? "").toLowerCase().replace(/[‘’`´ʼʻ]/g, "'");
  t = t.replace(/[.,!?;:"“”()]/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  for (const [a, b] of CONTRACTIONS) t = t.replace(new RegExp("\\b" + a.replace("'", "'") + "\\b", "g"), b);
  t = t.replace(/\bcan not\b/g, "cannot");
  return t.replace(/\s+/g, " ").trim();
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
      const u = normalize(Array.isArray(resp) ? resp.join(" ") : resp);
      const ok = (ex.answers || []).some((a) => normalize(a) === u);
      return { correct: ok, near: false };
    }
    default: {
      const raw = String(resp ?? "");
      const u = normalize(raw);
      if (!u) return { correct: false, near: false, empty: true };
      const list = (ex.answers || []).map(normalize);
      if (list.includes(u)) return { correct: true, near: false, style: styleNote(raw) };
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
