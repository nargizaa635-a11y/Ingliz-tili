// test-logic.mjs — mantiq testlari. Ishga tushirish:  node test-logic.mjs
import assert from "node:assert/strict";
import { normalize, checkAnswer, lev, makeVocabRecEx, makeVocabProdEx, shuffle, styleNote, expectedText } from "./engine.js";
import { newCard, reviewCard, dueCards, isMastered, INTERVALS_DAYS, DAY, MAX_STAGE } from "./srs.js";
import { buildPlan, nextLessons, skillStats, weakestSkill, TIME_CHOICES } from "./planner.js";
import { buildBackup, validateBackup } from "./backup.js";
import { initStore, state, exportState, replaceAll, resetAll, putLesson, saveSettings } from "./store.js";
import { loadContent, content, recordResult, ensureVocabCards, dueCardList, buildReviewItem, lessonOrder, lessonMastery, drillPool, resolveDrill, resolveCheck, resolveListen, progressByLevel, statusMap } from "./learn.js";
import { DIAGNOSTIC } from "./diagnostic.js";
import { allLessonSlots, CONTENT_FILES } from "./curriculum.js";
import { makeListenEx } from "./engine.js";
import fs from "node:fs";
import * as M from "./memory.js";
import * as C from "./coach.js";
import * as pomo from "./pomodoro.js";
import { GRADES, EASE_MIN, EASE_MAX } from "./srs.js";
import { makeVocabRecallEx } from "./engine.js";
import { putCard, putError } from "./store.js";
import * as FL from "./finallogic.js";
import * as LG from "./lugatlogic.js";
import { VD, norm as vdNorm } from "./vocabdata.js";

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
  assert.equal(content.lessons.size, 42, "42 ta tayyor dars kutilgan (butun A1 kursi)");
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
  assert.deepEqual(order.filter((o) => o.implemented).map((o) => o.id), ["a1-u01-l01", "a1-u01-l02", "a1-u01-l03", "a1-u01-l04", "a1-u02-l01", "a1-u02-l02", "a1-u02-l03", "a1-u02-l04", "a1-u03-l01", "a1-u03-l02", "a1-u03-l03", "a1-u03-l04", "a1-u04-l01", "a1-u04-l02", "a1-u04-l03", "a1-u05-l01", "a1-u05-l02", "a1-u05-l03", "a1-u05-l04", "a1-u06-l01", "a1-u06-l02", "a1-u06-l03", "a1-u07-l01", "a1-u07-l02", "a1-u07-l03", "a1-u08-l01", "a1-u08-l02", "a1-u09-l01", "a1-u09-l02", "a1-u09-l03", "a1-u09-l04", "a1-u10-l01", "a1-u10-l02", "a1-u10-l03", "a1-u11-l01", "a1-u11-l02", "a1-u11-l03", "a1-u12-l01", "a1-u12-l02", "a1-u12-l03", "a1-u12-l04", "a1-u12-l05"]);
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
test("kontent: 5-dars (I am, you are) yosh, yashash joyi va kasb mavzularini qamrab oladi", () => {
  const l = content.lessons.get("a1-u02-l01");
  assert.equal(l.title, "I am, you are"); assert.deepEqual(l.prereq, ["a1-u01-l04"]);
  const all = JSON.stringify(l);
  for (const need of ["How old are you?", "I am twenty years old.", "Where do you live?", "I live in Tashkent.", "I’m", "you’re"]) assert.ok(all.includes(need), "5-darsda yo‘q: " + need);
  for (const id of ["i", "you", "old", "year", "live", "in", "student", "teacher", "doctor", "driver"]) assert.ok(l.vocab.some((v) => v.id === id), "lug‘at yo‘q: " + id);
  assert.ok(l.exercises.filter((e) => e.concept === "am-are").length >= 3, "am/are bo‘yicha kamida 3 mashq");
  assert.ok(l.exercises.some((e) => e.concept === "age") && l.exercises.some((e) => e.concept === "live-answer"));
  assert.ok(l.reading.en.includes("How old are you?") && l.reading.en.includes("Where do you live?"), "o‘qish dialogi yosh va yashash joyini o‘z ichiga olishi kerak");
});
test("kontent: 6-dars (He is, she is, it is) oila so‘zlari, his/her va dars doirasidan chiqmaydi", () => {
  const l = content.lessons.get("a1-u02-l02");
  assert.equal(l.title, "He is, she is, it is"); assert.deepEqual(l.prereq, ["a1-u02-l01"]);
  for (const id of ["family", "mother", "father", "brother", "sister", "grandmother", "grandfather", "friend", "this", "his", "her"]) assert.ok(l.vocab.some((v) => v.id === id), "lug‘at yo‘q: " + id);
  const all = JSON.stringify(l);
  for (const need of ["This is my mother.", "He is my father.", "She is my sister.", "His name is", "Her name is"]) assert.ok(all.includes(need), "6-darsda yo‘q: " + need);
  assert.ok(l.exercises.filter((e) => e.concept === "his-her").length >= 3, "his/her bo‘yicha mashqlar");
  // «have» fe’li kursda keyinroq (a1-u04-l02): mashqlarda ishlatilmaydi
  const exText = JSON.stringify(l.exercises).toLowerCase();
  assert.ok(!/\bi have\b|\bhe has\b|\bshe has\b/.test(exText), "mashqlarda hali o‘tilmagan «have/has» ishlatilgan");
});
test("kontent: xatoli gap mashqlarida xato variant javob sifatida qabul qilinmaydi; tasodifiy javob rad etiladi", () => {
  for (const l of content.lessons.values()) for (const ex of l.exercises) {
    if (ex.type === "correct") assert.equal(checkAnswer(ex, ex.wrong).correct, false, ex.id + ": xato gap javob sifatida qabul qilinmoqda");
    if (["fill", "translate", "correct"].includes(ex.type)) assert.equal(checkAnswer(ex, "zzz qqq").correct, false, ex.id);
  }
});
test("kontent: har bir mashq turi uchun izoh (why) va to‘g‘ri javob matni mavjud", () => {
  for (const l of content.lessons.values()) for (const ex of l.exercises) {
    assert.ok(typeof ex.why === "string" && ex.why.length >= 10, ex.id + " izohi qisqa/yo‘q");
    assert.ok(expectedText(ex) && expectedText(ex).length > 0, ex.id + " to‘g‘ri javob matni yo‘q");
  }
});

/* ===================== 10 TEXNIKA: yangi tekshiruvlar ===================== */
const rngSeed = (seed) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const done = (id) => putLesson({ id, status: "completed", step: 0, results: {}, bestCheck: 1, completedAt: Date.now() });

test("srs: eslanmadi / qiyin / esladim / oson baholari va moslashuvchan interval", () => {
  const t0 = 1_000_000_000_000;
  assert.deepEqual(GRADES, ["again", "hard", "good", "easy"]);
  const base = { ...newCard("a", "vocab-rec", {}, t0), stage: 3 };
  const good = reviewCard(base, true, { grade: "good" }, t0), easy = reviewCard(base, true, { grade: "easy" }, t0);
  const hard = reviewCard(base, true, { grade: "hard" }, t0), again = reviewCard(base, true, { grade: "again" }, t0);
  assert.equal(good.stage, 4); assert.equal(easy.stage, 5); assert.equal(hard.stage, 3); assert.equal(again.stage, 1);
  assert.ok(easy.due - t0 > good.due - t0, "oson eslansa interval uzayadi");
  assert.ok(hard.due - t0 < INTERVALS_DAYS[3] * DAY, "qiyin bo‘lsa interval qisqaradi");
  assert.equal(again.due, t0 + 10 * 60000); assert.equal(again.lapses, 1);
  assert.ok(good.ease > 1 && easy.ease > good.ease && hard.ease < 1 && again.ease < hard.ease, "ease: " + [good.ease, easy.ease, hard.ease, again.ease]);
  // chegaralar
  let c = base; for (let i = 0; i < 40; i++) c = reviewCard(c, true, { grade: "easy" }, t0);
  assert.ok(c.ease <= EASE_MAX); c = base; for (let i = 0; i < 40; i++) c = reviewCard(c, true, { grade: "again" }, t0);
  assert.ok(c.ease >= EASE_MIN);
  // dastlabki 2 muvaffaqiyatda interval aynan jadval bo‘yicha (moslashuv keyin boshlanadi)
  const n0 = newCard("b", "x", {}, t0);
  assert.equal(reviewCard(n0, true, { grade: "easy" }, t0).ease, undefined);
  assert.equal(reviewCard(reviewCard(n0, true, {}, t0), true, {}, t0).due, t0 + 3 * DAY);
});
test("engine: faol eslash kartochkasi — baho 2 va undan yuqori to‘g‘ri hisoblanadi", () => {
  const ex = makeVocabRecallEx({ id: "w", en: "water", uz: "suv", ex: { en: "I like water.", uz: "Men suvni yoqtiraman." } }, "suv = suv");
  assert.equal(ex.type, "recall"); assert.equal(expectedText(ex), "suv");
  assert.equal(checkAnswer(ex, { grade: 0 }).correct, false); assert.equal(checkAnswer(ex, { grade: 1 }).correct, false);
  assert.equal(checkAnswer(ex, { grade: 2 }).correct, true); assert.equal(checkAnswer(ex, { grade: 3 }).correct, true);
});
test("backup: yangi jadvallar zaxiraga kiradi, eski (jadvalsiz) zaxira ham yuklanadi, noto‘g‘risi rad etiladi", () => {
  const old = buildBackup({ settings: {}, cards: [], errors: [], lessons: [], attempts: [], writings: [], meta: {} });
  const v0 = validateBackup(JSON.parse(JSON.stringify(old))); assert.equal(v0.ok, true); assert.deepEqual(v0.clean.palaces, []);
  const full = buildBackup({ settings: { reviewStyle: "recall" }, cards: [], errors: [], lessons: [], attempts: [], writings: [], meta: {},
    palaces: [{ id: "p", spots: [] }], mindmaps: [{ id: "m", nodes: [] }], reading: [{ id: "b", notes: [] }], feynman: [{ id: "f" }], mnemonics: [{ id: "x" }], sessions: [{ id: "s" }] });
  const v1 = validateBackup(JSON.parse(JSON.stringify(full)));
  assert.equal(v1.ok, true); assert.equal(v1.summary.palaces, 1); assert.equal(v1.clean.settings.reviewStyle, "recall");
  assert.equal(validateBackup({ ...full, data: { ...full.data, palaces: [{ id: "p" }] } }).ok, false);
  assert.equal(validateBackup({ ...full, data: { ...full.data, mindmaps: "x" } }).ok, false);
});
test("memory: mnemonika saqlanadi, yangilanadi, o‘chiriladi; bo‘sh matn rad etiladi", async () => {
  await resetAll();
  assert.equal((await M.saveMnemonic("water", "   ")).ok, false);
  const r = await M.saveMnemonic("water", "«voter» deb o‘qiyman — suv", { sound: "voter" }, 1000);
  assert.equal(r.ok, true); assert.equal(M.getMnemonic("water").createdAt, 1000);
  await M.saveMnemonic("water", "yangi", {}, 2000); assert.equal(M.getMnemonic("water").createdAt, 1000); assert.equal(M.getMnemonic("water").updatedAt, 2000);
  assert.equal(await M.removeMnemonic("water"), true); assert.equal(M.getMnemonic("water"), null);
});
test("memory: xotira saroyi — yaratish, takroriy nomni rad etish, nuqta qo‘shish/tahrirlash/siljitish/o‘chirish va SRS kartalari", async () => {
  await resetAll();
  assert.equal((await M.createPalace("  ")).ok, false);
  const p = (await M.createPalace("Mening xonam")).rec;
  assert.equal((await M.createPalace("mening xonam")).ok, false, "katta-kichik harfga qaramay takror");
  const a = (await M.addSpot(p.id, { label: "Eshik", en: "door", uz: "eshik", example: "Open the door.", assoc: "eshik — dor" })).spot;
  assert.equal((await M.addSpot(p.id, { label: "Eshik", en: "window" })).ok, false, "takroriy nuqta nomi");
  assert.equal((await M.addSpot(p.id, { label: "Deraza", en: "DOOR" })).ok, false, "takroriy so‘z");
  assert.equal((await M.addSpot(p.id, { label: "", en: "x" })).ok, false);
  const b = (await M.addSpot(p.id, { label: "Divan", en: "sofa", uz: "divan" })).spot;
  assert.ok(state.cards.get(M.spotCardId(p.id, a.id)) && state.cards.get(M.spotCardId(p.id, a.id)).kind === "palace");
  assert.equal(await M.moveSpot(p.id, b.id, -1), true); assert.deepEqual(state.palaces.get(p.id).spots.map((s) => s.en), ["sofa", "door"]);
  assert.equal(await M.moveSpot(p.id, b.id, -1), false, "yuqoridan chiqib ketmaydi");
  assert.equal((await M.updateSpot(p.id, a.id, { uz: "eshik (kirish)" })).ok, true); assert.equal(state.palaces.get(p.id).spots[1].uz, "eshik (kirish)");
  assert.equal((await M.updateSpot(p.id, a.id, { en: "sofa" })).ok, false);
  assert.equal(await M.deleteSpot(p.id, a.id), true); assert.equal(state.cards.has(M.spotCardId(p.id, a.id)), false);
  assert.equal(await M.deletePalace(p.id), true); assert.equal(state.palaces.size, 0); assert.equal([...state.cards.values()].filter((c) => c.kind === "palace").length, 0);
});
test("memory: fikrlar xaritasi — tugun qo‘shish, tahrirlash, takrorni rad etish, ildizni himoyalash, ichki tugunlar bilan o‘chirish", async () => {
  await resetAll();
  const m = (await M.createMap("Present Simple")).rec;
  assert.equal((await M.createMap("present simple")).ok, false);
  const a = (await M.addNode(m.id, "root", "Darak gap")).node, b = (await M.addNode(m.id, "root", "Savol")).node;
  const c = (await M.addNode(m.id, a.id, "I like tea", { lessonId: "a1-u01-l01" })).node;
  assert.equal((await M.addNode(m.id, "root", "darak gap")).ok, false); assert.equal((await M.addNode(m.id, "yo‘q", "x")).ok, false); assert.equal((await M.addNode(m.id, "root", " ")).ok, false);
  assert.equal((await M.editNode(m.id, c.id, { text: "I like coffee", note: "misol" })).ok, true);
  assert.equal(state.mindmaps.get(m.id).nodes.find((n) => n.id === c.id).lessonId, "a1-u01-l01", "tahrirda bog‘lanish saqlanadi");
  assert.equal((await M.editNode(m.id, b.id, { text: "Darak gap" })).ok, false);
  assert.equal(await M.deleteNode(m.id, "root"), 0, "ildiz o‘chirilmaydi");
  assert.equal(await M.deleteNode(m.id, a.id), 2, "tugun + ichki tugun"); assert.equal(state.mindmaps.get(m.id).nodes.length, 2);
  assert.equal((await M.editNode(m.id, "root", { text: "Present Simple (A1)" })).ok, true); assert.equal(state.mindmaps.get(m.id).name, "Present Simple (A1)");
  assert.equal(await M.deleteMap(m.id), true);
});
test("memory: kursdan xarita — yangi xarita yaratiladi, mavjud xarita o‘zgarmaydi", async () => {
  await resetAll();
  const mine = (await M.createMap("Mening xaritam")).rec; await M.addNode(mine.id, "root", "Tugun");
  const before = JSON.stringify(state.mindmaps.get(mine.id));
  const r = await M.createMapFromCourse("Kurs xaritasi", [{ unit: "a1-u01", lessons: [{ id: "a1-u01-l01", title: "Salomlashish", concepts: ["Kun vaqtiga qarab salom"] }] }]);
  assert.equal(r.ok, true); assert.equal(r.rec.nodes.length, 4); assert.equal(r.rec.nodes.find((n) => n.text === "Salomlashish").lessonId, "a1-u01-l01");
  assert.equal(JSON.stringify(state.mindmaps.get(mine.id)), before);
});
test("memory: kitobxonlik — kitob, yozuv, savol kartasi, tanqidiy savollar, takroriy yozuvni rad etish, o‘chirish", async () => {
  await resetAll();
  assert.equal((await M.addBook(" ")).ok, false);
  const b = (await M.addBook("Atomic Habits", "J. Clear")).rec;
  assert.equal((await M.addBook("atomic habits")).ok, false);
  const idea = (await M.addNote(b.id, { kind: "idea", text: "Kichik odat katta natija beradi", why: "Tajribamdan", evidence: "66 kun tadqiqoti", counter: "Hamma uchun emas" })).note;
  assert.equal((await M.addNote(b.id, { kind: "idea", text: "kichik odat katta natija beradi" })).ok, false);
  assert.equal((await M.addNote(b.id, { kind: "question", text: "Odat nima?" })).ok, false, "savolga javob kerak");
  const q = (await M.addNote(b.id, { kind: "question", text: "Odat qanday shakllanadi?", answer: "Takrorlash orqali" })).note;
  assert.equal(state.cards.get(M.noteCardId(b.id, q.id)).kind, "note"); assert.equal(state.cards.has(M.noteCardId(b.id, idea.id)), false, "faqat savollar takrorlanadi");
  assert.equal((await M.updateNote(b.id, idea.id, { text: "Yangilangan fikr" })).ok, true);
  assert.equal(await M.deleteNote(b.id, q.id), true); assert.equal(state.cards.has(M.noteCardId(b.id, q.id)), false);
  assert.equal(await M.deleteBook(b.id), true); assert.equal(state.readings.size, 0);
});
test("memory: Feynman yozuvi — bo‘sh rad etiladi, saqlanadi, qayta tahrirlanganda createdAt saqlanadi", async () => {
  await resetAll();
  const id = M.lessonNoteId("a1-u01-l01");
  assert.equal((await M.saveFeynman({ id, kind: "lesson", lessonId: "a1-u01-l01" }, { learned: " ", how: "" })).ok, false);
  const r = await M.saveFeynman({ id, kind: "lesson", lessonId: "a1-u01-l01" }, { learned: "Salom aytishni", unclear: "Good night" }, 100);
  assert.equal(r.ok, true); assert.equal(M.getFeynman(id).answers.unclear, "Good night");
  await M.saveFeynman({ id, kind: "lesson", lessonId: "a1-u01-l01" }, { learned: "Yangilandi" }, 200);
  assert.equal(M.getFeynman(id).createdAt, 100); assert.equal(M.getFeynman(id).updatedAt, 200);
  assert.match(M.dateKey(new Date(2026, 9, 5, 12).getTime()), /^2026-10-05$/);
});
test("learn: SRS baholari kartaga ta’sir qiladi; saroy va kitob kartalari takrorlashga tushadi; faol eslash uslubi", async () => {
  await resetAll();
  const lesson = content.lessons.get("a1-u01-l01"); ensureVocabCards(lesson);
  const t0 = Date.now(), ex = { id: "vrecall:hello", skill: "vocabulary", concept: "vocab:hello", type: "recall" };
  recordResult({ ex, correct: true, phase: "review", cardId: "v:hello:rec", grade: 3 }, t0);   // oson → 2 bosqich
  assert.equal(state.cards.get("v:hello:rec").stage, 2);
  recordResult({ ex, correct: false, phase: "review", cardId: "v:hi:rec", grade: 0 }, t0);     // eslanmadi
  assert.equal(state.cards.get("v:hi:rec").lapses, 1);
  recordResult({ ex, correct: true, phase: "review", cardId: "v:bye:rec", grade: 1 }, t0);     // qiyin: bosqich o‘zgarmaydi
  assert.equal(state.cards.get("v:bye:rec").stage, 0);
  assert.equal(state.errors.size, 0, "faol eslash kartochkasi alohida xato yozuvi yaratmaydi");
  assert.equal(state.attempts.at(-1).etype, "recall"); assert.equal(state.attempts.at(-1).grade, "hard");
  // uslub: 2-bosqichdan boshlab faol eslash (aralash), «choice» bo‘lsa doim variant tanlash
  assert.equal(buildReviewItem(state.cards.get("v:hello:rec")).ex.type, "recall");
  assert.equal(buildReviewItem(state.cards.get("v:bye:rec")).ex.type, "choice");
  await saveSettings({ reviewStyle: "choice" }); assert.equal(buildReviewItem(state.cards.get("v:hello:rec")).ex.type, "choice");
  await saveSettings({ reviewStyle: "recall" }); assert.equal(buildReviewItem(state.cards.get("v:bye:rec")).ex.type, "recall");
  await saveSettings({ reviewStyle: "mixed" });
  await M.saveMnemonic("hello", "salom = «hello» — «xelou»");
  assert.equal(buildReviewItem(state.cards.get("v:hello:rec")).ex.mnemonic, "salom = «hello» — «xelou»", "mnemonika karta orqasida ko‘rinadi");
  // saroy va kitob kartalari
  const p = (await M.createPalace("Xona")).rec; const sp = (await M.addSpot(p.id, { label: "Eshik", en: "door", uz: "eshik", assoc: "dor" })).spot;
  const b = (await M.addBook("Kitob")).rec; const n = (await M.addNote(b.id, { kind: "question", text: "Savol?", answer: "Javob" })).note;
  const pc = state.cards.get(M.spotCardId(p.id, sp.id)), nc = state.cards.get(M.noteCardId(b.id, n.id));
  assert.ok(dueCardList(Date.now() + 2 * 3600000).some((c) => c.id === pc.id) && dueCardList(Date.now() + 2 * 3600000).some((c) => c.id === nc.id));
  const pi = buildReviewItem(pc), ni = buildReviewItem(nc);
  assert.equal(pi.ex.type, "recall"); assert.match(pi.ex.back, /door/); assert.equal(pi.ex.mnemonic, "dor");
  assert.equal(ni.ex.back, "Javob");
  await M.deleteSpot(p.id, sp.id); assert.equal(dueCardList(Date.now() + 2 * 3600000).some((c) => c.id === pc.id), false, "o‘chirilgan nuqta kartasi ko‘rinmaydi");
});
test("learn: xato kategoriyasi, takroriy xato, keyingi to‘g‘ri javob natijani yangilaydi", async () => {
  await resetAll();
  const e1 = content.exercises.get("u01l01-p04"), e2 = content.exercises.get("u01l01-p06"), e3 = content.exercises.get("u01l01-p09");
  recordResult({ ex: e1, correct: false, phase: "practice", userAnswer: "x" });              // fill → grammatika
  recordResult({ ex: e2, correct: false, phase: "practice", userAnswer: "x", near: true });  // translate + yaqin → imlo
  recordResult({ ex: e3, correct: false, phase: "practice", userAnswer: "x" });              // listen → tinglash
  assert.equal(state.errors.get(e1.id).category, "grammar"); assert.equal(state.errors.get(e2.id).category, "spelling"); assert.equal(state.errors.get(e3.id).category, "listening");
  recordResult({ ex: e1, correct: false, phase: "mixed", userAnswer: "y" });
  assert.equal(state.errors.get(e1.id).count, 2);
  assert.equal(state.errors.get(e1.id).fixedCount, 0);
  recordResult({ ex: e1, correct: true, phase: "mixed" });
  assert.equal(state.errors.get(e1.id).fixedCount, 1); assert.ok(state.errors.get(e1.id).lastFixedAt);
});
test("coach: zaif tomonlar — takroriy va ochiq xatolar oldinda, o‘zlashtirilganlar ro‘yxatdan chiqadi; Feynman «tushunmadim» yig‘iladi", async () => {
  await resetAll();
  for (const id of ["u01l01-p04", "u01l01-p07"]) recordResult({ ex: content.exercises.get(id), correct: false, phase: "practice", lessonId: "a1-u01-l01", userAnswer: "x" });
  recordResult({ ex: content.exercises.get("u01l01-p04"), correct: false, phase: "practice", lessonId: "a1-u01-l01", userAnswer: "x" }); // takror
  recordResult({ ex: content.exercises.get("u01l02-p02"), correct: false, phase: "practice", lessonId: "a1-u01-l02", userAnswer: "x" });
  const w = C.weakTopics();
  assert.equal(w[0].concept, "greetings-time", "takroriy xatoli mavzu birinchi"); assert.equal(w[0].lessonId, "a1-u01-l01");
  assert.ok(w[0].label && w[0].categoryName); assert.ok(w.length >= 2);
  const first = state.errors.get("u01l01-p04"); putError({ ...first, mastered: true, masteredAt: Date.now() });
  const w2 = C.weakTopics(); assert.ok(w2.every((t) => t.concept !== "greetings-time" || t.openCount === 1));
  await M.saveFeynman({ id: M.lessonNoteId("a1-u01-l01"), kind: "lesson", lessonId: "a1-u01-l01" }, { learned: "x", unclear: "Good night qachon?" });
  assert.equal(C.unclearNotes()[0].text, "Good night qachon?");
  assert.equal(C.conceptLabel("am-are"), "am / are (I am, you are)"); assert.equal(C.conceptLabel("vocab:hello"), "So‘z: hello");
  assert.ok(C.resolveConceptDrill("greetings-time", 4).every((i) => i.ex.concept === "greetings-time"));
});
test("coach: aralash test faqat tugallangan darslardan, mavzular aralashgan, qiyinlik natijaga moslashadi", async () => {
  await resetAll();
  assert.equal(C.resolveMixed(8).items.length, 0, "tugallangan dars yo‘q — bo‘sh");
  await done("a1-u01-l01");
  const only1 = C.resolveMixed(10, rngSeed(1)).items;
  assert.ok(only1.length > 0 && only1.every((i) => i.ex.lessonId === "a1-u01-l01"), "boshqa darslardan savol bo‘lmasligi kerak");
  await done("a1-u01-l02");
  const mixed = C.resolveMixed(12, rngSeed(7)).items;
  const lessons = new Set(mixed.map((i) => i.ex.lessonId)); assert.equal(lessons.size, 2, "ikkala darsdan aralash");
  assert.equal(new Set(mixed.map((i) => i.ex.id)).size, mixed.length, "takroriy savol yo‘q");
  let adjacent = 0; for (let i = 1; i < mixed.length; i++) if (mixed[i].ex.concept === mixed[i - 1].ex.concept) adjacent++;
  assert.ok(adjacent <= 1, "ketma-ket bir xil mavzu: " + adjacent);
  // qiyinlik moslashuvi
  const prodShare = (res) => res.items.filter((i) => ["translate", "fill", "order", "correct"].includes(i.ex.type)).length / res.items.length;
  const mk = (ok) => { state.attempts.length = 0; for (let i = 0; i < 20; i++) state.attempts.push({ ts: Date.now(), phase: "practice", skill: "grammar", correct: ok || i % 4 === 0 ? ok || true : false, hint: false, etype: "choice" }); };
  mk(true); const hard = C.resolveMixed(10, rngSeed(3)); assert.equal(hard.level, "harder");
  state.attempts.length = 0; for (let i = 0; i < 20; i++) state.attempts.push({ ts: Date.now(), phase: "practice", skill: "grammar", correct: i < 8, hint: false, etype: "choice" });
  const easy = C.resolveMixed(10, rngSeed(3)); assert.equal(easy.level, "easier");
  let h = 0, e = 0; for (let s = 1; s <= 30; s++) { state.attempts.length = 0; for (let i = 0; i < 20; i++) state.attempts.push({ ts: 1, phase: "practice", skill: "grammar", correct: true, etype: "choice" }); h += prodShare(C.resolveMixed(10, rngSeed(s)));
    state.attempts.length = 0; for (let i = 0; i < 20; i++) state.attempts.push({ ts: 1, phase: "practice", skill: "grammar", correct: i < 8, etype: "choice" }); e += prodShare(C.resolveMixed(10, rngSeed(s))); }
  assert.ok(h > e, `qiyin rejimda yozma mashqlar ko‘proq bo‘lishi kerak (${h.toFixed(1)} > ${e.toFixed(1)})`);
});
test("coach: haftalik natija va «kecha o‘rganganlarim» haqiqiy ma’lumotdan hisoblanadi", async () => {
  await resetAll();
  const now = new Date(2026, 9, 14, 15, 0).getTime(), DAYMS = 86400000;
  const lesson = content.lessons.get("a1-u01-l01"); ensureVocabCards(lesson, now - DAYMS);              // kecha yaratilgan kartalar
  await putLesson({ id: lesson.id, status: "completed", step: 0, results: {}, bestCheck: 1, completedAt: now - DAYMS });
  for (let i = 0; i < 6; i++) recordResult({ ex: content.exercises.get("u01l01-p01"), correct: i < 4, phase: "practice", lessonId: lesson.id, userAnswer: "x" }, now - DAYMS + i * 60000);
  recordResult({ ex: content.exercises.get("u01l01-p02"), correct: true, phase: "practice", lessonId: lesson.id }, now - 10 * DAYMS);   // haftadan oldin: kirmaydi
  const w = C.weeklyStats(now);
  assert.equal(w.attempts, 6); assert.ok(Math.abs(w.accuracy - 4 / 6) < 1e-9); assert.equal(w.daysStudied, 1); assert.equal(w.newWords, 12); assert.equal(w.lessonsCompleted, 1);
  assert.equal(w.days.length, 7); assert.equal(w.errorsMade, 2); assert.ok(w.activeMinutes >= 1);
  const y = C.yesterdayInfo(now);
  assert.equal(y.isYesterday, true); assert.equal(y.vocabIds.length, 12); assert.deepEqual(y.lessons, [lesson.id]); assert.ok(y.errorIds.includes("u01l01-p01"));
  const items = C.resolveYesterday(y, now + 2 * 3600000, rngSeed(1));
  assert.ok(items.length >= 8 && items.every((i) => i.phase === "yesterday")); assert.ok(items.some((i) => i.ex.type === "recall"));
  assert.equal(C.yesterdayInfo(now + 3 * DAYMS).isYesterday, false, "kecha ma’lumot yo‘q — oxirgi faol kunga qaytadi");
  assert.ok(C.yesterdayInfo(now + 3 * DAYMS).vocabIds.length > 0);
  assert.equal(C.yesterdayInfo(now + 12 * DAYMS).vocabIds.length, 0, "7 kundan oldingisi ko‘rsatilmaydi");
});
test("coach: bosh sahifa vazifalari haqiqiy holatga qarab bajarilgan/bajarilmagan bo‘ladi", async () => {
  await resetAll();
  const now = Date.now();
  let d = C.dailyTasks(now);
  assert.ok(d.tasks.some((t) => t.id === "lesson" && !t.done), "dars bor va bajarilmagan"); assert.ok(!d.tasks.some((t) => t.id === "recall"), "so‘z yo‘q — faol eslash vazifasi yo‘q");
  assert.equal(d.doneCount, d.tasks.filter((t) => t.done).length);
  const lesson = content.lessons.get("a1-u01-l01"); ensureVocabCards(lesson);
  await putLesson({ id: lesson.id, status: "completed", step: 0, results: {}, bestCheck: 1, completedAt: now });
  d = C.dailyTasks(now); const byId = Object.fromEntries(d.tasks.map((t) => [t.id, t]));
  assert.equal(byId.lesson.done, true, "bugun tugagan dars"); assert.ok(byId.recall && !byId.recall.done); assert.equal(byId.review.done, true, "muddati kelgan karta yo‘q");
  for (let i = 0; i < 5; i++) recordResult({ ex: makeVocabRecallEx(content.vocab.get("hello")), correct: true, phase: "recall", grade: 2 }, now);
  assert.equal(C.dailyTasks(now).tasks.find((t) => t.id === "recall").done, true);
  assert.equal(byId.memory.label, "Mnemonika yozing"); await M.saveMnemonic("hello", "x");
  assert.equal(C.dailyTasks(now).tasks.find((t) => t.id === "memory").done, true);
  const p = (await M.createPalace("Xona")).rec; await M.addSpot(p.id, { label: "Eshik", en: "door" });
  assert.equal(C.dailyTasks(now).tasks.find((t) => t.id === "memory").label, "Xotira saroyi mashqi");
  const r = C.resolveRecall(5, now + 2 * 3600000, rngSeed(2)); assert.equal(r.length, 5); assert.ok(r.every((i) => i.ex.type === "recall" && i.phase === "recall"));
});

test("pomodoro: soat tamg‘alari bo‘yicha — pauza/davom, tugash, uzoq yopiq turgandan keyin tiklash", () => {
  const P = pomo; const t0 = 1_800_000_000_000, MIN = 60000;
  let st = P.initialState({ focus: 25, rest: 5 });
  assert.equal(P.remainingMs(st, t0), 25 * MIN);
  st = P.startTimer(st, t0); assert.equal(P.remainingMs(st, t0 + 10 * MIN), 15 * MIN);
  st = P.pauseTimer(st, t0 + 10 * MIN);                                   // 10 daqiqa o‘tdi
  assert.equal(P.remainingMs(st, t0 + 99 * MIN), 15 * MIN, "pauzada vaqt o‘tmaydi");
  st = P.resumeTimer(st, t0 + 20 * MIN); assert.equal(P.remainingMs(st, t0 + 25 * MIN), 10 * MIN);
  assert.deepEqual(P.advance(st, t0 + 25 * MIN).events, [], "hali tugamagan");
  const r = P.advance(st, t0 + 35 * MIN);                                  // 10 + 15 daqiqa ishladi → tugadi
  assert.equal(r.events[0].type, "focusDone"); assert.equal(r.events[0].minutes, 25); assert.equal(r.state.phase, "break"); assert.equal(r.state.status, "running");
  assert.equal(r.events[0].id, "focus:" + t0);
  // sahifa yopilib, holat JSON ko‘rinishida saqlanib, keyin qayta ochilganda (soat bo‘yicha) tiklanadi
  const saved = JSON.parse(JSON.stringify(P.startTimer(P.initialState({ focus: 15, rest: 5 }), t0)));
  const back = P.advance(saved, t0 + 17 * MIN);
  assert.equal(back.events.length, 1); assert.equal(back.state.phase, "break"); assert.equal(P.remainingMs(back.state, t0 + 17 * MIN), 3 * MIN);
  const long = P.advance(saved, t0 + 60 * MIN);
  assert.deepEqual(long.events.map((e) => e.type), ["focusDone", "breakDone"]); assert.equal(long.state.status, "idle");
  assert.equal(P.advance(back.state, t0 + 21 * MIN).events[0].type, "breakDone");
  assert.equal(P.resetTimer(st).status, "idle");
  assert.deepEqual(P.normCfg({ focus: 9999, rest: -3 }), { focus: 180, rest: 1 }); assert.deepEqual(P.normCfg({ focus: "x" }), { focus: 25, rest: 5 });
  assert.ok(P.PRESETS.some((p) => p.focus === 25 && p.rest === 5) && P.PRESETS.some((p) => p.focus === 15 && p.rest === 5) && P.PRESETS.some((p) => p.focus === 45 && p.rest === 10));
});
test("pomodoro: seans bir marta yoziladi, statistika hisoblanadi, sozlama saqlanadi", async () => {
  await resetAll();
  const t0 = Date.now() - 3 * 3600000;
  await pomo.setConfig({ focus: 15, rest: 5 });
  await pomo.act("start", t0);
  assert.equal(pomo.timer().status, "running");
  const ev1 = await pomo.sync(t0 + 16 * 60000); const ev2 = await pomo.sync(t0 + 17 * 60000);
  assert.equal(ev1.length, 1); assert.equal(ev2.length, 0, "ikkinchi marta yozilmaydi");
  assert.equal([...state.sessions.values()].length, 1);
  const st = pomo.pomoStats(); assert.equal(st.todayCount, 1); assert.equal(st.todayMinutes, 15); assert.equal(st.totalMinutes, 15);
  assert.equal(state.meta.pomodoro.phase, "break", "holat IndexedDB (meta) ga saqlangan");
  await pomo.act("skip"); assert.equal(pomo.timer().phase, "focus"); assert.equal(pomo.timer().cfg.focus, 15);
  await pomo.ensureRunning(); assert.equal(pomo.timer().status, "running");
  await pomo.act("pause"); assert.equal(pomo.timer().status, "paused"); await pomo.act("resume"); assert.equal(pomo.timer().status, "running"); await pomo.act("reset"); assert.equal(pomo.timer().status, "idle");
});

test("sw.js: kesh versiyasi oshirilgan, ro‘yxatdagi fayllar mavjud va kontent fayllari kiritilgan", () => {
  const sw = fs.readFileSync(new URL("./sw.js", import.meta.url), "utf8");
  const ver = Number((sw.match(/const CACHE = "ingliz-tili-v(\d+)"/) || [])[1]);
  assert.ok(ver >= 3, "kesh versiyasi v" + ver + " (5–6-darslar uchun v3 kerak)");
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
  const pr = progressByLevel(); assert.equal(pr[0].planned, 42); assert.equal(pr[0].completed, 1); assert.equal(pr[0].implemented, 42);
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

/* ---------- A1 yakuniy test va zaif mavzularni qayta ishlash ---------- */
test("yakuniy test: tugatilgan darslardan tuziladi, har darsdan bittadan, ketma-ket bir dars kelmaydi", async () => {
  await resetAll(); await loadContent();
  assert.equal(FL.buildFinalTest().items.length, 0, "hech dars tugatilmagan bo‘lsa, savol yo‘q");
  const ids = [...content.lessons.keys()];
  for (const id of ids) await putLesson({ id, status: "completed", results: {} });
  const t = FL.buildFinalTest();
  assert.equal(t.lessons, ids.length);
  assert.equal(t.items.length, ids.length);
  assert.equal(new Set(t.items.map((i) => i.lessonId)).size, ids.length);
  assert.ok(t.items.every((i) => i.ex.type !== "match" && i.phase === "final"));
  for (let i = 1; i < t.items.length; i++) assert.notEqual(t.items[i].lessonId, t.items[i - 1].lessonId);
  await resetAll();
});
test("yakuniy test: natija bo‘limlar va ko‘nikmalar bo‘yicha hisoblanadi, yordam bilan javob sanalmaydi, natija saqlanadi", async () => {
  await resetAll(); await loadContent();
  const ids = [...content.lessons.keys()];
  for (const id of ids) await putLesson({ id, status: "completed", results: {} });
  const t = FL.buildFinalTest();
  const results = t.items.map((it, k) => ({ ex: it.ex, correct: k % 3 !== 0, hint: false }));
  const ev = FL.evaluateFinal(results);
  assert.equal(ev.total, t.items.length);
  assert.equal(ev.ok, results.filter((r) => r.correct).length);
  assert.equal(ev.byUnit.reduce((s, u) => s + u.total, 0), ev.total);
  assert.equal(ev.byUnit[0].unit, "a1-u01");
  assert.equal(ev.passed, false);
  assert.equal(FL.evaluateFinal(t.items.map((it) => ({ ex: it.ex, correct: true, hint: false }))).passed, true);
  assert.equal(FL.evaluateFinal([{ ex: t.items[0].ex, correct: true, hint: true }]).ok, 0);
  await FL.recordFinal(ev);
  assert.equal(FL.lastFinal().total, ev.total);
  assert.equal(FL.finalHistory().length, 1);
  await resetAll();
});
test("yakuniy test: zaif mavzularni qayta ishlash boshqa savollarni beradi va javoblari tekshiriladi", async () => {
  await resetAll(); await loadContent();
  const ids = [...content.lessons.keys()];
  for (const id of ids) await putLesson({ id, status: "completed", results: {} });
  const t = FL.buildFinalTest();
  const results = t.items.map((it, k) => ({ ex: it.ex, correct: k % 3 !== 0, hint: false }));
  const ev = FL.evaluateFinal(results);
  await FL.recordFinal(ev);
  const rv = FL.resolveFinalReview(FL.lastFinal(), 12);
  assert.equal(rv.length, 12);
  assert.ok(rv.every((x) => x.phase === "drill" && x.ex.type !== "match"));
  assert.equal(FL.resolveFinalReview({ weak: [] }).length, 0);
  assert.equal(FL.resolveFinalReview(null).length, 0);
  for (const it of FL.buildFinalTest().items.concat(rv)) {
    const ex = it.ex;
    if (ex.type === "choice" || ex.type === "listen") assert.equal(checkAnswer(ex, ex.answer).correct, true, ex.id);
    else if (ex.type === "order") assert.equal(checkAnswer(ex, ex.answers[0].split(" ")).correct, true, ex.id);
    else assert.equal(checkAnswer(ex, ex.answers[0]).correct, true, ex.id);
  }
  await resetAll();
});
test("yakuniy test: kamida 5 ta dars tugatilmagan bo‘lsa, test boshlanmaydi", async () => {
  await resetAll(); await loadContent();
  const ids = [...content.lessons.keys()].slice(0, 4);
  for (const id of ids) await putLesson({ id, status: "completed", results: {} });
  assert.ok(FL.buildFinalTest().lessons < FL.FINAL_MIN_LESSONS);
  await resetAll();
});


/* ---------- Lug‘at ---------- */
test("Lug‘at: har bir so‘zda IPA bor, ortiqcha/yetishmayotgan yozuv yo‘q, rasm belgilari takrorlanmaydi", () => {
  const ids = [...content.vocab.values()];
  assert.ok(ids.length > 0);
  const missing = ids.filter((v) => !VD.has(vdNorm(v.en))).map((v) => v.en);
  assert.deepEqual(missing, [], "vocabdata.js da yo‘q so‘zlar");
  assert.deepEqual(ids.filter((v) => !VD.get(vdNorm(v.en)).ipa).map((v) => v.en), []);
  const seen = new Map();
  for (const [k, d] of VD) { if (!d.icon) continue; const key = d.icon.replace(/\ufe0f/g, ""); assert.ok(!seen.has(key), `rasm belgisi takrorlandi: ${k} va ${seen.get(key)}`); seen.set(key, k); }
});
test("Lug‘at: buildEntries takrorsiz va A–Z tartibda", () => {
  const E = LG.buildEntries(content.vocab);
  assert.equal(E.length, content.vocab.size);
  assert.equal(new Set(E.map((e) => e.id)).size, E.length);
  for (let i = 1; i < E.length; i++) assert.ok(E[i - 1].nEn <= E[i].nEn);
});
test("Lug‘at: qidiruv inglizcha va o‘zbekcha, qisman, katta-kichik harf va apostrofga befarq, hamma so‘zlar bo‘yicha", () => {
  const E = LG.buildEntries(content.vocab);
  const find = (q, o = {}) => LG.filterEntries(E, { q, ...o }).map((e) => e.en);
  assert.equal(find("apple")[0], "apple");
  assert.ok(find("OLMA").includes("apple"));
  assert.ok(find("tog'a").includes("uncle") && find("tog‘a").includes("uncle") && find("toga").includes("uncle"));
  assert.ok(find("qo‘shni").includes("neighbour"));
  assert.ok(find("can't").length >= 1);
  assert.ok(find("yarim tun").includes("midnight"));
  assert.deepEqual(find("zzzxq"), []);
  assert.equal(find("").length, E.length);
  assert.ok(find("morn").includes("morning"));
  // har bir so‘z o‘zining inglizcha va o‘zbekcha matni bo‘yicha topiladi
  for (const e of E) { assert.ok(LG.filterEntries(E, { q: e.en }).some((x) => x.id === e.id), "EN: " + e.en); assert.ok(LG.filterEntries(E, { q: e.uz }).some((x) => x.id === e.id), "UZ: " + e.uz); }
  // aniq moslik birinchi
  assert.equal(find("go")[0], "go");
});
test("Lug‘at holati: yangi karta uchun reps === 0, stage === 0; muddati 1 soatdan keyin; «Yangi», «Takror» emas", () => {
  const now = 1_700_000_000_000;
  const c = newCard("v:apple:rec", "vocab-rec", { ref: "apple", lessonId: "x" }, now);
  assert.equal(c.reps, 0); assert.equal(c.stage, 0); assert.equal(c.lapses, 0);
  assert.ok(c.due > now, "yangi karta darrov muddati kelmaydi");
  const st = LG.cardStatus(c, now);
  assert.equal(st.kind, "new"); assert.equal(st.isNew, true); assert.equal(st.isDue, false);
  assert.equal(dueCards([c], now).length, 0, "srs.js ham uni navbatga qo‘ymaydi");
  // birinchi takror muddati kelgach u takrorlash navbatida va «Takror» bo‘ladi (takrorlash sahifasi bilan mos)
  const later = c.due + 1;
  assert.equal(LG.cardStatus(c, later).kind, "due"); assert.equal(LG.cardStatus(c, later).isNew, false);
  assert.equal(dueCards([c], later).length, 1);
});
test("Lug‘at holati: xato javobdan keyin stage === 0 bo‘lib, reps > 0 qolgan karta «Yangi» emas", () => {
  const t0 = 1_700_000_000_000;
  let c = newCard("v:book:rec", "vocab-rec", { ref: "book" }, t0);
  c = reviewCard(c, true, {}, t0);            // stage 1, reps 1
  assert.equal(c.stage, 1);
  c = reviewCard(c, false, {}, t0 + 1000);    // xato: stage max(0, 1-2) = 0
  assert.equal(c.stage, 0); assert.ok(c.reps > 0); assert.ok(c.lapses > 0);
  const now = t0 + 2000;
  const st = LG.cardStatus(c, now);
  assert.notEqual(st.kind, "new"); assert.equal(st.isNew, false);
  assert.equal(st.kind, "waiting", "10 daqiqalik qayta urinish muddati hali kelmagan"); assert.equal(st.lapsed, true);
  const after = t0 + 1000 + 11 * 60000;
  assert.equal(LG.cardStatus(c, after).kind, "due"); assert.equal(LG.cardStatus(c, after).isNew, false);
});
test("Lug‘at holati: muddati kelmagan karta «Takror» emas, muddati kelgan «Takror»; chegarada srs.js bilan bir xil", () => {
  const now = 1_700_000_000_000;
  const base = { ...newCard("v:x:rec", "vocab-rec", { ref: "x" }, now), reps: 3, stage: 2 };
  assert.equal(LG.cardStatus({ ...base, due: now + DAY }, now).kind, "waiting");
  assert.equal(LG.cardStatus({ ...base, due: now + DAY }, now).isDue, false);
  assert.equal(LG.cardStatus({ ...base, due: now - 1 }, now).kind, "due");
  assert.equal(LG.cardStatus({ ...base, due: now }, now).kind, "due");
  assert.equal(dueCards([{ ...base, due: now }], now).length, 1);
  assert.equal(LG.cardStatus({ ...base, due: now + 5, stage: 4 }, now, 4).label, "O‘zlashtirilgan");
  assert.equal(LG.cardStatus({ ...base, due: now + 5, stage: 2 }, now, 4).label, "O‘rganilmoqda");
  assert.equal(LG.cardStatus(undefined, now).kind, "none");
  assert.equal(LG.cardStatus({ ...base, due: "x" }, now).kind, "waiting", "buzilgan muddat ilovani to‘xtatmaydi");
});
test("Lug‘at holati: holatlar o‘zaro zid emas; «Takror» to‘plami srs.js dueCards bilan aynan bir xil; hisoblagichlar mos", () => {
  const now = 1_700_000_000_000;
  const cards = [];
  let k = 0;
  const add = (o) => cards.push({ ...newCard("v:w" + k++ + ":rec", "vocab-rec", { ref: "w" + k }, now), ...o });
  add({});                                                  // yangi
  add({ due: now - 5 });                                    // yangi, birinchi takror muddati kelgan
  add({ reps: 2, stage: 0, lapses: 1, due: now + 600000 }); // xatodan keyin kutmoqda
  add({ reps: 2, stage: 0, lapses: 1, due: now - 1 });      // xatodan keyin muddati kelgan
  add({ reps: 4, stage: 3, due: now + 3 * DAY });
  add({ reps: 6, stage: 5, due: now - DAY });
  add({ reps: 6, stage: 6, due: now + 30 * DAY });
  const sts = cards.map((c) => LG.cardStatus(c, now, 4));
  for (const s of sts) assert.equal([s.isNew, s.isDue, s.isWaiting].filter(Boolean).length, 1, "aynan bitta holat: " + s.kind);
  const due = new Set(cards.filter((c, i) => sts[i].isDue).map((c) => c.id));
  assert.deepEqual([...due].sort(), dueCards(cards, now).map((c) => c.id).sort());
  const counts = { new: sts.filter((s) => s.isNew).length, due: sts.filter((s) => s.isDue).length, waiting: sts.filter((s) => s.isWaiting).length };
  assert.deepEqual(counts, { new: 1, due: 3, waiting: 3 });
  assert.equal(counts.new + counts.due + counts.waiting, cards.length);
  // filtr va hisoblagich bir xil mezonda
  const E = [...cards.keys()].map((i) => ({ id: "w" + i, nEn: "w" + i, nUz: "", letter: "W" }));
  const statusOf = (e) => sts[Number(e.id.slice(1))];
  assert.equal(LG.filterEntries(E, { filter: "new", statusOf }).length, counts.new);
  assert.equal(LG.filterEntries(E, { filter: "due", statusOf }).length, counts.due);
  const nf = LG.filterEntries(E, { filter: "new", statusOf }).map((e) => e.id), df = LG.filterEntries(E, { filter: "due", statusOf }).map((e) => e.id);
  assert.equal(nf.filter((x) => df.includes(x)).length, 0, "«Yangi» va «Takror» kesishmaydi");
  assert.deepEqual(LG.filterEntries(E, { filter: "fav", favs: new Set(["w1"]) }).map((e) => e.id), ["w1"]);
  assert.ok(LG.filterEntries(LG.buildEntries(content.vocab), { letter: "Z" }).every((e) => e.letter === "Z"));
});
test("Lug‘at: whenText muddatni o‘zbekcha ko‘rsatadi", () => {
  const n = 1_000_000;
  assert.equal(LG.whenText(n - 1, n), "hozir");
  assert.equal(LG.whenText(n + 10 * 60000, n), "10 daqiqadan keyin");
  assert.equal(LG.whenText(n + 3 * 3600000, n), "3 soatdan keyin");
  assert.equal(LG.whenText(n + 3 * DAY, n), "3 kundan keyin");
});
test("Lug‘at: «Shu so‘zni takrorlash» uzatadigan karta id si dars kartasi id si bilan mos, runReview kutadigan parametr tuzilishi", () => {
  const lesson = [...content.lessons.values()][0];
  const v = lesson.vocab[0];
  const before = new Set(state.cards.keys());
  ensureVocabCards(lesson);
  const cardId = "v:" + v.id + ":rec";
  assert.ok(state.cards.has(cardId), "ensureVocabCards aynan shu id ni yaratadi");
  const card = state.cards.get(cardId);
  assert.equal(card.kind, "vocab-rec"); assert.equal(card.ref, v.id);
  const item = buildReviewItem(card);
  assert.ok(item && item.cardId === cardId && item.ex, "buildReviewItem shu kartadan mashq quradi (runReview shu id lar ro‘yxatini oladi: {cardIds:[id]})");
  for (const id of [...state.cards.keys()]) if (!before.has(id)) state.cards.delete(id);
});
test("Lug‘at: sevimlini almashtirish — muvaffaqiyatli saqlanganda holat o‘zgaradi", async () => {
  const saved = [];
  const save = async (arr) => { saved.push(arr); return "lugatFav"; }; // IndexedDB put kalitni qaytaradi
  let r = await LG.toggleFavorite(new Set(), "apple", save);
  assert.deepEqual([r.ok, r.on, r.persisted, [...r.favs]], [true, true, true, ["apple"]]);
  r = await LG.toggleFavorite(r.favs, "apple", save);
  assert.deepEqual([r.ok, r.on, [...r.favs]], [true, false, []]);
  assert.deepEqual(saved, [["apple"], []]);
});
test("Lug‘at: saqlash muvaffaqiyatsiz bo‘lsa (store.persist null qaytaradi) yulduzcha holati o‘zgarmaydi va oldingi ro‘yxat qaytariladi", async () => {
  const calls = [];
  const fail = async (arr) => { calls.push(arr); return null; };
  const before = new Set(["a"]);
  let r = await LG.toggleFavorite(before, "b", fail);
  assert.equal(r.ok, false); assert.equal(r.on, false); assert.deepEqual([...r.favs], ["a"]);
  assert.deepEqual(calls, [["a", "b"], ["a"]], "avval yangi ro‘yxat, so‘ng xotirani qaytarish");
  assert.deepEqual([...before], ["a"], "kirish to‘plami o‘zgarmaydi");
  r = await LG.toggleFavorite(before, "a", async () => { throw new Error("quota"); }); // olib tashlash ham o‘zgarmaydi
  assert.equal(r.ok, false); assert.equal(r.on, true); assert.deepEqual([...r.favs], ["a"]);
});
test("Lug‘at: IndexedDB yo‘q (xotira rejimi) — sevimli seans davomida ishlaydi, lekin saqlanmagani bildiriladi", async () => {
  const r = await LG.toggleFavorite(new Set(), "x", async () => null, { memoryMode: true });
  assert.deepEqual([r.ok, r.on, r.persisted], [true, true, false]);
});
test("Lug‘at: haqiqiy store.setMeta bilan sevimli (xotira rejimida null qaytadi, xato bilan adashmaydi)", async () => {
  const { setMeta, getMeta } = await import("./store.js");
  const mem = state.storageMode === "memory";
  const r = await LG.toggleFavorite(new Set(), "hello", (arr) => setMeta("lugatFav", arr), { memoryMode: mem });
  assert.equal(r.ok, true); assert.deepEqual(getMeta("lugatFav"), ["hello"]);
  if (mem) assert.equal(r.persisted, false);
});
test("Lug‘at: zaxira eksporti va tiklashda lugatFav saqlanadi, boshqa meta kalitlari buzilmaydi", async () => {
  const { setMeta, getMeta } = await import("./store.js");
  const snapshot = JSON.parse(JSON.stringify(exportState()));
  try {
    await setMeta("lugatFav", ["apple", "bus"]);
    await setMeta("boshqaKalit", { n: 1 });
    const b = JSON.parse(JSON.stringify(buildBackup(exportState())));
    assert.deepEqual(b.data.meta.lugatFav, ["apple", "bus"], "eksportda bor");
    const v = validateBackup(b);
    assert.equal(v.ok, true, (v.problems || []).join(" "));
    assert.deepEqual(v.clean.meta.lugatFav, ["apple", "bus"], "tekshiruvdan keyin ham bor");
    await setMeta("lugatFav", ["other"]);       // tiklashdan oldin boshqacha holat
    await replaceAll(v.clean);
    assert.deepEqual(getMeta("lugatFav"), ["apple", "bus"], "tiklashdan keyin qaytdi");
    assert.deepEqual(getMeta("boshqaKalit"), { n: 1 });
    // lugatFav yo‘q eski zaxira sevimlilarni bo‘sh holatga qaytaradi (tiklash butun ma’lumotni almashtiradi)
    const old = JSON.parse(JSON.stringify(b)); delete old.data.meta.lugatFav;
    await replaceAll(validateBackup(old).clean);
    assert.equal(getMeta("lugatFav"), null);
    // buzilgan qiymat o‘qishda ilovani to‘xtatmaydi
    await setMeta("lugatFav", "buzilgan");
    assert.equal(LG.parseFavs(getMeta("lugatFav")).size, 0);
  } finally { await replaceAll(snapshot); }
});
test("Lug‘at: sevimlilar buzilgan ma’lumotda ham xavfsiz o‘qiladi", () => {
  assert.equal(LG.parseFavs(null).size, 0);
  assert.equal(LG.parseFavs("abc").size, 0);
  assert.deepEqual([...LG.parseFavs(["a", 5, null, "b"])], ["a", "b"]);
});
test("Lug‘at: sevimlilar meta jadvalida saqlanadi va zaxiraga kiradi", async () => {
  const { setMeta, getMeta } = await import("./store.js");
  await setMeta("lugatFav", ["x1", "x2"]);
  assert.deepEqual(getMeta("lugatFav"), ["x1", "x2"]);
  assert.deepEqual(exportState().meta.lugatFav, ["x1", "x2"]);
});

for (const [name, fn] of tests) {
  try { await fn(); passed++; console.log("  ✓", name); }
  catch (e) { failed++; console.log("  ✗", name, "\n     ", e.message.split("\n")[0]); }
}
console.log(`\n${passed} o‘tdi, ${failed} xato`);
process.exit(failed ? 1 : 0);
