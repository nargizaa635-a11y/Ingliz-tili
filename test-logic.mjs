// test-logic.mjs — mantiq testlari. Ishga tushirish:  node test-logic.mjs
import assert from "node:assert/strict";
import { normalize, checkAnswer, lev, makeVocabRecEx, makeVocabProdEx, shuffle, styleNote } from "./engine.js";
import { newCard, reviewCard, dueCards, isMastered, INTERVALS_DAYS, DAY, MAX_STAGE } from "./srs.js";
import { buildPlan, nextLessons, skillStats, weakestSkill, TIME_CHOICES } from "./planner.js";
import { buildBackup, validateBackup } from "./backup.js";
import { initStore, state, exportState, replaceAll, resetAll, putLesson, saveSettings } from "./store.js";
import { loadContent, content, recordResult, ensureVocabCards, dueCardList, buildReviewItem, lessonOrder, lessonMastery, drillPool, resolveDrill, resolveCheck, resolveListen, progressByLevel, statusMap } from "./learn.js";
import { DIAGNOSTIC } from "./diagnostic.js";
import { allLessonSlots, CONTENT_FILES } from "./curriculum.js";
import { makeListenEx } from "./engine.js";
import fs from "node:fs";

let passed = 0, failed = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

/* ---------- engine ---------- */
test("normalize: qisqartmalar va tinish belgilari", () => {
  assert.equal(normalize("I’m fine, thank you."), "i am fine thank you");
  assert.equal(normalize("  What’s   your name? "), "what is your name");
  assert.equal(normalize("I can’t"), "i cannot");
  assert.equal(normalize("I can not"), "i cannot");
});
test("checkAnswer: yozma javoblar va muqobillar", () => {
  const ex = { type: "translate", answers: ["I am fine, thank you", "Fine, thanks"] };
  assert.equal(checkAnswer(ex, "i'm fine thank you!").correct, true);
  assert.equal(checkAnswer(ex, "Fine, thanks.").correct, true);
  assert.equal(checkAnswer(ex, "I fine thank you").correct, false);
  assert.equal(checkAnswer(ex, "").empty, true);
});
test("checkAnswer: yaqin javob 'near' deb belgilanadi, lekin to‘g‘ri hisoblanmaydi", () => {
  const ex = { type: "fill", answers: ["evening"] };
  const r = checkAnswer(ex, "evenin");
  assert.equal(r.correct, false); assert.equal(r.near, true);
});
test("checkAnswer: choice, order, match", () => {
  assert.equal(checkAnswer({ type: "choice", answer: 2 }, 2).correct, true);
  assert.equal(checkAnswer({ type: "choice", answer: 2 }, 1).correct, false);
  assert.equal(checkAnswer({ type: "order", answers: ["Nice to meet you"] }, ["Nice", "to", "meet", "you"]).correct, true);
  assert.equal(checkAnswer({ type: "order", answers: ["Nice to meet you"] }, ["to", "Nice", "meet", "you"]).correct, false);
  assert.equal(checkAnswer({ type: "match" }, { wrong: 0 }).correct, true);
  assert.equal(checkAnswer({ type: "match" }, { wrong: 2 }).correct, false);
});
test("styleNote: bosh harf va nuqta eslatmasi", () => {
  assert.ok(styleNote("my name is ali"));
  assert.equal(styleNote("My name is Ali."), null);
});
test("lev va shuffle", () => {
  assert.equal(lev("kitten", "sitting"), 3);
  const a = [1, 2, 3, 4, 5];
  assert.deepEqual(shuffle(a).sort(), a);
});
test("makeVocabRecEx: to‘g‘ri javob variantlar ichida va takrorlanmaydi", () => {
  const pool = [1, 2, 3, 4, 5].map((i) => ({ id: "w" + i, en: "w" + i, uz: "u" + i, ex: { en: "x", uz: "y" } }));
  for (let k = 0; k < 20; k++) {
    const ex = makeVocabRecEx(pool[0], pool);
    assert.equal(ex.options[ex.answer], "u1");
    assert.equal(new Set(ex.options).size, ex.options.length);
  }
  assert.equal(makeVocabProdEx(pool[0]).answers[0], "w1");
});

/* ---------- srs ---------- */
test("srs: to‘g‘ri javob bosqichni oshiradi, interval kengayadi", () => {
  const t0 = 1_000_000_000_000;
  let c = newCard("a", "vocab-rec", {}, t0);
  c = reviewCard(c, true, {}, t0); assert.equal(c.stage, 1); assert.equal(c.due, t0 + 1 * DAY);
  c = reviewCard(c, true, {}, t0); assert.equal(c.stage, 2); assert.equal(c.due, t0 + 3 * DAY);
  for (let i = 0; i < 20; i++) c = reviewCard(c, true, {}, t0);
  assert.equal(c.stage, MAX_STAGE);
});
test("srs: xato bosqichni pasaytiradi va 10 daqiqadan keyin qaytaradi", () => {
  const t0 = 1_000_000_000_000;
  let c = { ...newCard("a", "x", {}, t0), stage: 4 };
  c = reviewCard(c, false, {}, t0);
  assert.equal(c.stage, 2); assert.equal(c.lapses, 1); assert.equal(c.due, t0 + 10 * 60000);
});
test("srs: yordam bilan to‘g‘ri javob bosqichni oshirmaydi", () => {
  const t0 = 1_000_000_000_000;
  const c0 = { ...newCard("a", "x", {}, t0), stage: 2 };
  const c = reviewCard(c0, true, { hint: true }, t0);
  assert.equal(c.stage, 2);
});
test("srs: dueCards muddati kelganlarni, xatolarni oldinga qo‘yadi", () => {
  const now = 1_000_000_000_000;
  const a = { ...newCard("a", "vocab-rec", {}, now), due: now - DAY };
  const b = { ...newCard("e:1", "error", {}, now), due: now - DAY };
  const c = { ...newCard("c", "vocab-rec", {}, now), due: now + DAY };
  const d = dueCards([a, c, b], now);
  assert.deepEqual(d.map((x) => x.id), ["e:1", "a"]);
  assert.equal(isMastered({ stage: 4 }, 4), true); assert.equal(isMastered({ stage: 3 }, 4), false);
});

/* ---------- backup ---------- */
test("backup: to‘g‘ri zaxira tasdiqlanadi, buzilgani rad etiladi", () => {
  const b = buildBackup({ settings: { mode: "test" }, cards: [], errors: [], lessons: [], attempts: [], writings: [], meta: {} });
  const v = validateBackup(JSON.parse(JSON.stringify(b)));
  assert.equal(v.ok, true); assert.equal(v.clean.settings.mode, "test");
  assert.equal(validateBackup({}).ok, false);
  assert.equal(validateBackup({ ...b, version: 99 }).ok, false);
  assert.equal(validateBackup({ ...b, data: { ...b.data, cards: [{ id: 5 }] } }).ok, false);
  assert.equal(validateBackup({ ...b, data: { ...b.data, attempts: "x" } }).ok, false);
  assert.equal(validateBackup(null).ok, false);
});
test("backup: noto‘g‘ri sozlamalar tozalanadi", () => {
  const b = buildBackup({ settings: { mode: "hack", masteryStage: 999, passScore: 0.1 }, cards: [], errors: [], lessons: [], attempts: [], writings: [], meta: {} });
  const v = validateBackup(b);
  assert.equal(v.ok, true);
  assert.equal(v.clean.settings.mode, undefined); assert.equal(v.clean.settings.masteryStage, 7); assert.equal(v.clean.settings.passScore, 0.5);
});

/* ---------- planner ---------- */
const order = [
  { id: "L1", title: "Bir", minutes: 18, implemented: true, prereq: [] },
  { id: "L2", title: "Ikki", minutes: 20, implemented: true, prereq: ["L1"] },
  { id: "L3", title: "Uch", minutes: 15, implemented: false, prereq: ["L2"] },
];
test("planner: tarix yo‘q — diagnostika va birinchi dars", () => {
  const p = buildPlan({ minutes: 30, cards: [], lessonOrder: order, status: {}, attempts: [], diagnosticDone: false });
  assert.equal(p.items[0].type, "diagnostic"); assert.equal(p.items[1].type, "lesson"); assert.equal(p.items[1].lessonId, "L1");
});
test("planner: 10 daqiqada dars yo‘q, takrorlash va qisqa gapirish bor", () => {
  const now = Date.now();
  const cards = Array.from({ length: 30 }, (_, i) => ({ ...newCard("v:" + i + ":rec", "vocab-rec", {}, now), due: now - DAY }));
  const p = buildPlan({ minutes: 10, now, cards, lessonOrder: order, status: { L1: { status: "completed" } }, attempts: [{ ts: now, phase: "practice", skill: "grammar", correct: true }] });
  assert.ok(!p.items.some((i) => i.type === "lesson"));
  assert.equal(p.items[0].type, "review");
  assert.ok(p.items.some((i) => i.type === "speak"));
  assert.ok(p.totalMinutes <= 12, "reja " + p.totalMinutes);
});
test("planner: reja vaqtga mos va har xil vaqtda o‘zgaradi", () => {
  const now = Date.now();
  const cards = Array.from({ length: 80 }, (_, i) => ({ ...newCard("v:" + i + ":rec", "vocab-rec", {}, now), due: now - DAY }));
  const attempts = Array.from({ length: 20 }, (_, i) => ({ ts: now, phase: "practice", skill: i % 2 ? "grammar" : "vocabulary", correct: i % 4 !== 0, hint: false }));
  const base = { now, cards, lessonOrder: order, status: { L1: { status: "completed" } }, attempts, drillPool: { grammar: 10, vocabulary: 10, listening: 5 } };
  const sizes = {};
  for (const m of TIME_CHOICES) {
    const p = buildPlan({ ...base, minutes: m });
    sizes[m] = p.items.length;
    assert.ok(p.totalMinutes <= m + 1, `${m} daqiqaga ${p.totalMinutes} daqiqalik reja`);
  }
  assert.ok(sizes[120] > sizes[10], "uzoq vaqtda ko‘proq blok bo‘lishi kerak");
  assert.ok(buildPlan({ ...base, minutes: 120 }).items.some((i) => i.type === "break"));
  assert.ok(buildPlan({ ...base, minutes: 60 }).items.some((i) => i.type === "lesson" && i.lessonId === "L2"));
});
test("planner: boshlangan dars birinchi, zaif ko‘nikma aniqlanadi", () => {
  assert.equal(nextLessons(order, { L1: { status: "completed" }, L2: { status: "inprogress" } })[0].id, "L2");
  assert.equal(nextLessons(order, { L1: { status: "completed" }, L2: { status: "completed" } }).length, 0); // L3 amalga oshirilmagan
  const attempts = [];
  for (let i = 0; i < 10; i++) attempts.push({ ts: i, phase: "practice", skill: "grammar", correct: i < 3 });
  for (let i = 0; i < 10; i++) attempts.push({ ts: i, phase: "practice", skill: "vocabulary", correct: true });
  assert.equal(weakestSkill(skillStats(attempts)).skill, "grammar");
});
test("planner: diagnostika va audiosiz urinishlar statistikaga kirmaydi", () => {
  const st = skillStats([{ ts: 1, phase: "diagnostic", skill: "grammar", correct: false }, { ts: 2, phase: "practice", skill: "listening", correct: false, noAudio: true }]);
  assert.deepEqual(st, {});
});

/* ---------- kontent yaxlitligi ---------- */
test("kontent: barcha darslar va mashqlar to‘g‘ri tuzilgan", async () => {
  await loadContent();
  assert.deepEqual(content.loadErrors, []);
  assert.equal(content.lessons.size, 4, "A1 1-bo‘lim: 4 ta dars kutilgan");
  const ids = new Set();
  for (const l of content.lessons.values()) {
    assert.ok(l.objectives.length >= 3, l.id + " maqsadlar");
    assert.ok(l.explain.length >= 2 && l.vocab.length >= 8, l.id + " tushuntirish/lug‘at");
    assert.ok(l.speaking.length >= 1 && l.writing && l.writing.model && l.reading, l.id + " gapirish/yozish/o‘qish");
    const check = l.exercises.filter((e) => e.phase === "check"), practice = l.exercises.filter((e) => e.phase === "practice");
    assert.ok(check.length >= 5 && practice.length >= 8, l.id + " mashqlar soni");
    const types = new Set(l.exercises.map((e) => e.type));
    for (const t of ["choice", "fill", "translate", "order", "correct", "match", "listen"]) assert.ok(types.has(t), l.id + " turi " + t);
    for (const ex of l.exercises) {
      assert.ok(!ids.has(ex.id), "takroriy id " + ex.id); ids.add(ex.id);
      assert.ok(ex.why && ex.concept && ex.skill, ex.id + " why/concept/skill");
      if (ex.type === "choice" || ex.type === "listen") { assert.ok(ex.options.length >= 3 && ex.options[ex.answer] !== undefined, ex.id); assert.equal(new Set(ex.options).size, ex.options.length, ex.id + " variantlar takrori"); }
      if (ex.type === "fill") { assert.ok(ex.text.includes("___") && ex.answers.length, ex.id); assert.equal(checkAnswer(ex, ex.answers[0]).correct, true); }
      if (ex.type === "translate" || ex.type === "correct") { assert.ok(ex.answers.length, ex.id); for (const a of ex.answers) assert.equal(checkAnswer(ex, a).correct, true, ex.id); }
      if (ex.type === "order") { assert.equal(checkAnswer(ex, ex.words.slice()).correct || ex.answers.some((a) => normalize(a).split(" ").sort().join() === ex.words.map(normalize).sort().join()), true, ex.id + " so‘zlar javobga mos emas"); }
      if (ex.type === "match") assert.ok(ex.pairs.length >= 3, ex.id);
      if (ex.type === "listen") assert.ok(ex.say, ex.id);
    }
    const vids = l.vocab.map((v) => v.id); assert.equal(new Set(vids).size, vids.length);
    for (const v of l.vocab) assert.ok(v.en && v.uz && v.ex && v.ex.en && v.ex.uz, l.id + " lug‘at " + v.id);
    for (const p of l.prereq) assert.ok(content.lessons.has(p) || p, p);
  }
  assert.equal(DIAGNOSTIC.length, 8);
  for (const d of DIAGNOSTIC) assert.ok(d.options[d.answer], d.id);
});

test("kontent: dars ID lari curriculum.js bilan mos, ketma-ketlik va oldingi dars bog‘liqligi saqlangan", () => {
  const slots = allLessonSlots(), order = lessonOrder(), ids = slots.map((s) => s.id);
  let gap = false;
  for (const o of order) { if (!o.implemented) gap = true; else assert.equal(gap, false, o.id + ": tayyor dars tayyor bo‘lmagan darsdan keyin turibdi"); }
  assert.deepEqual(order.filter((o) => o.implemented).map((o) => o.id), ["a1-u01-l01", "a1-u01-l02", "a1-u01-l03", "a1-u01-l04"]);
  for (const l of content.lessons.values()) {
    const i = ids.indexOf(l.id);
    assert.ok(i >= 0, l.id + " curriculum.js da yo‘q");
    assert.equal(slots[i].title, l.title, l.id + " nomi curriculum.js bilan mos emas");
    assert.equal(slots[i].level, l.level); assert.equal(slots[i].unit, l.unit);
    assert.deepEqual(l.prereq, i === 0 ? [] : [ids[i - 1]], l.id + " oldingi darsga bog‘liqligi");
    for (const p of l.prereq) assert.ok(content.lessons.has(p), p + " tayyor emas");
  }
});
test("kontent: mashq va lug‘at ID lari butun kurs bo‘yicha noyob; misol gaplar takrorlanmaydi", () => {
  const exIds = [], vIds = [], uz = [], enn = [];
  for (const l of content.lessons.values()) {
    l.exercises.forEach((e) => exIds.push(e.id));
    l.vocab.forEach((v) => { vIds.push(v.id); uz.push(v.ex.uz); enn.push(v.ex.en); });
  }
  assert.equal(new Set(exIds).size, exIds.length, "takroriy mashq ID");
  assert.equal(new Set(vIds).size, vIds.length, "takroriy lug‘at ID (darslar o‘rtasida)");
  assert.equal(content.vocab.size, vIds.length);
  assert.equal(new Set(enn).size, enn.length, "misol gaplar (inglizcha) takrorlangan");
  assert.equal(new Set(uz).size, uz.length, "misol tarjimalari takrorlangan: tinglash mashqida bir xil variantlar chiqadi");
});
test("kontent: har bir darsda yetarli mashq, tekshiruv va to‘rt ko‘nikma bor", () => {
  for (const l of content.lessons.values()) {
    const p = l.exercises.filter((e) => e.phase === "practice"), c = l.exercises.filter((e) => e.phase === "check");
    assert.ok(p.length >= 8, l.id + " mashqlar: " + p.length); assert.ok(c.length >= 5, l.id + " tekshiruv: " + c.length);
    assert.ok(l.exercises.every((e) => ["practice", "check"].includes(e.phase)), l.id + " noto‘g‘ri phase");
    assert.ok(new Set(l.exercises.map((e) => e.type)).size >= 5, l.id + " mashq turlari");
    const skills = new Set(l.exercises.map((e) => e.skill));
    for (const k of ["listening", "reading", "grammar", "vocabulary"]) assert.ok(skills.has(k), l.id + " ko‘nikma yo‘q: " + k);
    assert.ok(l.exercises.filter((e) => e.skill === "reading").length >= 2, l.id + " o‘qish savollari");
    assert.ok(l.speaking.length >= 2 && l.speaking.every((s) => s.id && s.uz && s.model), l.id + " gapirish");
    assert.ok(l.reading.en && l.reading.uz && l.writing.uz && l.writing.model && l.writing.checklist.length >= 3, l.id + " o‘qish/yozish");
    assert.ok(c.every((e) => e.type !== "match"), l.id + ": tekshiruvda «match» yo‘q bo‘lishi kerak (yordamsiz, alohida savol)");
  }
});
test("kontent: 3-dars 26 ta harfni to‘liq va takrorlanmasdan qamrab oladi", () => {
  const l = content.lessons.get("a1-u01-l03");
  const rows = l.explain.flatMap((s) => s.blocks).filter((b) => b.type === "table" && b.head[0] === "Harf").flatMap((b) => b.rows);
  const letters = rows.map((r) => r[0]);
  assert.equal(letters.length, 26); assert.equal(new Set(letters).size, 26);
  assert.deepEqual([...letters].sort(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""));
  for (const need of ["How do you spell your name?", "Please repeat that.", "Please speak slowly."]) {
    const all = JSON.stringify(l.explain) + JSON.stringify(l.vocab) + JSON.stringify(l.exercises);
    assert.ok(all.includes(need), "darsda yo‘q: " + need);
  }
});
test("kontent: 4-dars 0–20 hamma raqamlarni qamrab oladi va telefon raqami dialogi bor", () => {
  const l = content.lessons.get("a1-u01-l04");
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
  words.forEach((w, i) => { const v = l.vocab.find((x) => x.id === w); assert.ok(v, "lug‘atda yo‘q: " + w); assert.ok(v.uz.startsWith(i + " ("), w + " tarjimasi"); });
  const rows = l.explain.flatMap((s) => s.blocks).filter((b) => b.type === "table" && b.head[0] === "Raqam").flatMap((b) => b.rows);
  assert.deepEqual(rows.map((r) => r[0]), words.map((_, i) => String(i)));
  assert.deepEqual(rows.map((r) => r[1]), words);
  const all = JSON.stringify(l);
  assert.ok(all.includes("What’s your phone number?") && all.includes("Sorry? Please repeat that.") && all.includes("Please speak slowly."));
  assert.ok(l.reading.en.includes("Sorry?"), "eshitmaslik dialogi o‘qish matnida");
});
test("kontent: har bir lug‘atdan takrorlash mashqlari to‘g‘ri yasaladi (tanish, yozib berish, tinglash)", () => {
  const pool = [...content.vocab.values()];
  for (const v of pool) {
    for (let k = 0; k < 5; k++) {
      const r = makeVocabRecEx(v, pool);
      assert.equal(r.options.length, 4, v.id); assert.equal(r.options[r.answer], v.uz, v.id); assert.equal(new Set(r.options).size, 4, v.id + " variant takrori");
      const li = makeListenEx(v, pool);
      assert.equal(li.options[li.answer], v.ex.uz, v.id); assert.equal(new Set(li.options).size, li.options.length, v.id + " tinglash variantlari takrorlangan");
    }
    const pr = makeVocabProdEx(v);
    assert.equal(checkAnswer(pr, v.en).correct, true, v.id);
  }
});
test("sw.js: kesh versiyasi oshirilgan, ro‘yxatdagi fayllar mavjud va kontent fayllari kiritilgan", () => {
  const sw = fs.readFileSync(new URL("./sw.js", import.meta.url), "utf8");
  const ver = Number((sw.match(/const CACHE = "ingliz-tili-v(\d+)"/) || [])[1]);
  assert.ok(ver >= 2, "kesh versiyasi v" + ver);
  const files = [...sw.matchAll(/"\.\/([^"]+)"/g)].map((m) => m[1]).filter((f) => f !== "");
  for (const f of files) assert.ok(fs.existsSync(new URL("./" + f, import.meta.url)), "sw.js dagi fayl yo‘q: " + f);
  for (const f of CONTENT_FILES) assert.ok(files.includes(f), "sw.js da yo‘q: " + f);
});

/* ---------- saqlash va o‘quv oqimi (xotira rejimi) ---------- */
test("store: IndexedDB yo‘q muhitda xotira rejimida ishlaydi", async () => {
  await initStore();
  assert.equal(state.storageMode, "memory"); assert.equal(state.ready, true);
});
test("learn: xato yozuvi, takrorlash kartasi va qayta ko‘rib chiqish", async () => {
  await resetAll();
  const ex = content.exercises.get("u01l01-p04");
  const t0 = Date.now();
  recordResult({ ex, correct: false, phase: "practice", lessonId: "a1-u01-l01", userAnswer: "Good morning" }, t0);
  recordResult({ ex, correct: false, phase: "practice", lessonId: "a1-u01-l01", userAnswer: "Good day" }, t0 + 1000);
  const e = state.errors.get(ex.id);
  assert.equal(e.count, 2); assert.equal(e.mastered, false); assert.equal(e.history.length, 2);
  assert.ok(e.why && e.correct === "evening");
  const card = state.cards.get("e:" + ex.id);
  assert.ok(card && card.kind === "error");
  assert.ok(card.due > t0 && card.due < t0 + 3600000, "10 daqiqalik qayta urinish");
  // muddati kelganda ko‘rinadi
  assert.equal(dueCardList(t0 + 60000).some((c) => c.id === card.id), false);
  assert.equal(dueCardList(t0 + 20 * 60000).some((c) => c.id === card.id), true);
  const item = buildReviewItem(card, () => 0);
  assert.ok(item && item.ex.concept === ex.concept && item.ex.id !== ex.id, "boshqa kontekstdagi mashq tanlanishi kerak");
  assert.equal(item.via, "alt");
  // keyingi kunlarda to‘g‘ri javoblar xatoni o‘zlashtirilgan qiladi
  let now = t0 + 20 * 60000;
  for (let i = 0; i < 5; i++) { now += 70 * DAY; recordResult({ ex: item.ex, correct: true, phase: "review", cardId: card.id }, now); }
  assert.equal(state.errors.get(ex.id).mastered, true);
});
test("learn: lug‘at kartalari va ishlab chiqarish kartasi ikkinchi bosqichda ochiladi", async () => {
  await resetAll();
  const lesson = content.lessons.get("a1-u01-l01");
  ensureVocabCards(lesson);
  assert.equal([...state.cards.values()].filter((c) => c.kind === "vocab-rec").length, lesson.vocab.length);
  ensureVocabCards(lesson);
  assert.equal(state.cards.size, lesson.vocab.length, "takroriy karta yaratilmasligi kerak");
  const rec = state.cards.get("v:hello:rec");
  const item = buildReviewItem(rec);
  assert.equal(item.ex.options[item.ex.answer], "salom");
  let now = Date.now();
  recordResult({ ex: item.ex, correct: true, phase: "review", cardId: rec.id }, now);
  assert.equal(state.cards.has("v:hello:prod"), false);
  recordResult({ ex: item.ex, correct: true, phase: "review", cardId: rec.id }, now + DAY);
  assert.equal(state.cards.has("v:hello:prod"), true);
  assert.equal(state.errors.size, 0, "lug‘at kartalaridagi xato alohida xato yozuvi yaratmaydi");
});
test("learn: o‘zlashtirish bitta test bilan emas — kechikkan takrorlashlar talab qilinadi", async () => {
  await resetAll();
  const lesson = content.lessons.get("a1-u01-l01");
  putLesson({ id: lesson.id, status: "completed", step: 0, results: {}, bestCheck: 1, completedAt: Date.now() });
  ensureVocabCards(lesson);
  assert.equal(lessonMastery(lesson.id).mastered, false);
  let now = Date.now();
  for (let round = 0; round < 4; round++) {
    now += 40 * DAY;
    for (const v of lesson.vocab) { const c = state.cards.get("v:" + v.id + ":rec"); recordResult({ ex: { id: "vrec:" + v.id, skill: "vocabulary", concept: "x" }, correct: true, phase: "review", cardId: c.id }, now); }
  }
  assert.equal(lessonMastery(lesson.id).mastered, true);
});
test("learn: mashq to‘plamlari tugallangan darslardan olinadi", async () => {
  await resetAll();
  assert.equal(resolveCheck(5).length, 0);
  const lesson = content.lessons.get("a1-u01-l01");
  putLesson({ id: lesson.id, status: "completed", step: 0, results: {}, bestCheck: 1, completedAt: Date.now() });
  const pool = drillPool();
  assert.ok(pool.grammar >= 3 && pool.vocabulary >= 3 && pool.listening >= 3);
  assert.equal(resolveCheck(4).length, 4);
  assert.ok(resolveCheck(4).every((x) => x.ex.phase === "check"));
  const l = resolveListen(5); assert.equal(l.length, 5);
  for (const it of l) assert.equal(it.ex.options[it.ex.answer].length > 0, true);
  assert.ok(resolveDrill({ skill: "grammar", count: 4 }).length === 4);
  const pr = progressByLevel(); assert.equal(pr[0].planned, 42); assert.equal(pr[0].completed, 1); assert.equal(pr[0].implemented, 4);
  assert.equal(pr[1].planned, 0);
});
test("store: eksport/import aylanishi ma’lumotni saqlaydi", async () => {
  await resetAll();
  const ex = content.exercises.get("u01l01-p01");
  recordResult({ ex, correct: false, phase: "practice", userAnswer: "Good night" });
  await saveSettings({ mode: "test" });
  const b = JSON.parse(JSON.stringify(buildBackup(exportState())));
  const v = validateBackup(b); assert.equal(v.ok, true);
  await resetAll();
  assert.equal(state.attempts.length, 0); assert.equal(state.settings.mode, "tutor");
  await replaceAll(v.clean);
  assert.equal(state.attempts.length, 1); assert.equal(state.errors.size, 1); assert.equal(state.settings.mode, "test");
  await resetAll();
});

for (const [name, fn] of tests) {
  try { await fn(); passed++; console.log("  ✓", name); }
  catch (e) { failed++; console.log("  ✗", name, "\n     ", e.message.split("\n")[0]); }
}
console.log(`\n${passed} o‘tdi, ${failed} xato`);
process.exit(failed ? 1 : 0);
