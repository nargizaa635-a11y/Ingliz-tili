// test-v05.mjs — v0.5.0 testlari: qisqartmalar, A2 yakuniy test, gapirishni avtomatik tekshirish. Ishga tushirish:  node test-v05.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkAnswer, normalize, normalizeAll, sameText, expectedText } from "./engine.js";
import { initStore, state, resetAll, putLesson } from "./store.js";
import { loadContent, content, recordResult } from "./learn.js";
import * as FL from "./finallogic.js";
import { CURRICULUM } from "./curriculum.js";
import { scoreSpeech, speechTokens, speechFeedback } from "./pronounce.js";
import * as RC from "./recognize.js";

let passed = 0, failed = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const tr = (answers) => ({ type: "translate", answers });

await initStore();
await loadContent();
const EX = [...content.exercises.values()];

/* ===================== Qisqartmalar ===================== */
test("qisqartmalar: 'll, 've, modal inkorlar ikkala yo‘nalishda qabul qilinadi", () => {
  const pairs = [
    ["She will go to work tomorrow.", "She’ll go to work tomorrow."],
    ["They will not pay today.", "They won’t pay today."],
    ["I don’t think he will come", "I don't think he'll come"],
    ["We have finished", "We’ve finished"],
    ["You should not work late", "You shouldn’t work late"],
    ["You must not smoke here", "You mustn’t smoke here"],
    ["I could not sleep", "I couldn’t sleep"],
    ["I would like a coffee", "I’d like a coffee"],
  ];
  for (const [a, b] of pairs) {
    assert.equal(checkAnswer(tr([a]), b).correct, true, a + " ⇐ " + b);
    assert.equal(checkAnswer(tr([b]), a).correct, true, b + " ⇐ " + a);
  }
});
test("qisqartmalar: 's — is yoki has, 'd — would yoki had (kontekst bo‘yicha)", () => {
  assert.equal(checkAnswer(tr(["He has just left the warehouse."]), "He’s just left the warehouse.").correct, true);
  assert.equal(checkAnswer(tr(["She has been to Italy three times."]), "She's been to Italy three times.").correct, true);
  assert.equal(checkAnswer(tr(["He’s my father."]), "He is my father.").correct, true);
  assert.equal(checkAnswer(tr(["You’d better go"]), "You had better go").correct, true);
});
test("qisqartmalar: noto‘g‘ri gap kalitdagi qisqartma orqali «to‘g‘ri» bo‘lib qolmaydi", () => {
  assert.equal(checkAnswer(tr(["He’s my father."]), "He has my father.").correct, false);
  assert.equal(checkAnswer(tr(["He’s tired."]), "He has tired.").correct, false);
  assert.equal(checkAnswer(tr(["She’s been to Italy."]), "She is been to Italy.").correct, false);
  assert.equal(checkAnswer(tr(["Ali’s book is here"]), "Ali is book is here").correct, false);
});
test("qisqartmalar: eski xatti-harakat saqlangan (normalize, egalik 's, near)", () => {
  assert.equal(normalize("What’s your name?"), "what is your name");
  assert.equal(normalize("I can not"), "i cannot");
  assert.ok(normalizeAll("It’s been cold").includes("it has been cold"));
  assert.equal(sameText("Ali’s book", "Ali's book"), true);
  const r = checkAnswer({ type: "fill", answers: ["evening"] }, "evenin");
  assert.equal(r.correct, false); assert.equal(r.near, true);
});
test("kontent: har bir kalit javob o‘zi qabul qilinadi, «xatoni tuzating» dagi xato gap esa qabul qilinmaydi", () => {
  for (const e of EX) {
    if (["translate", "correct", "fill"].includes(e.type)) for (const a of e.answers) assert.equal(checkAnswer(e, a).correct, true, e.id + ": " + a);
    if (e.type === "order") for (const a of e.answers) assert.equal(checkAnswer(e, a.split(" ")).correct, true, e.id);
    if (e.type === "correct") assert.equal(checkAnswer(e, e.wrong).correct, false, e.id + " xato gap qabul qilindi: " + e.wrong);
  }
});
test("kontent: tekshiruvda topilgan 4 ta mashq tuzatilgan", () => {
  const g = (id) => content.exercises.get(id);
  assert.ok(!g("u07l01-p04").options.includes("Is a sofa there?"));
  assert.ok(!g("a2u01l03-p01").options.includes("I was walking home when it was starting to rain."));
  assert.deepEqual(g("u09l02-p05").answers, ["some"]);
  assert.ok(/qaytarib olmoqchiman/.test(g("a2u08l04-p08").uz));
});

/* ===================== A2 yakuniy test ===================== */
test("A2 yakuniy test: faqat A2 darslaridan tuziladi, A1 natijalaridan alohida saqlanadi", async () => {
  await resetAll();
  const a1 = [...content.lessons.values()].filter((l) => l.level === "A1").map((l) => l.id);
  const a2 = [...content.lessons.values()].filter((l) => l.level === "A2").map((l) => l.id);
  assert.ok(a2.length >= 30, "A2 darslari: " + a2.length);
  for (const id of a1.concat(a2)) await putLesson({ id, status: "completed", results: {} });
  const t2 = FL.buildFinalTest(Math.random, "A2");
  assert.equal(t2.level, "A2");
  assert.equal(t2.lessons, a2.length);
  assert.ok(t2.items.every((i) => content.lessons.get(i.lessonId).level === "A2"));
  assert.ok(t2.items.length >= a2.length && t2.items.length <= FL.FINAL_MAX_QUESTIONS);
  const ev = FL.evaluateFinal(t2.items.map((it, k) => ({ ex: it.ex, correct: k % 4 !== 0, hint: false })), Date.now(), "A2");
  assert.equal(ev.level, "A2");
  assert.equal(ev.byUnit[0].unit, "a2-u01");
  assert.ok(ev.byUnit.every((u) => u.unit.startsWith("a2-")), "bo‘limlar A2 nomlari bilan");
  await FL.recordFinal(ev);
  assert.equal(FL.lastFinal("A2").total, ev.total);
  assert.equal(FL.lastFinal("A1"), null, "A1 tarixi alohida");
  assert.ok("finalA2" in state.meta && !("finalA1" in state.meta));
  const rv = FL.resolveFinalReview(FL.lastFinal("A2"), 12);
  assert.ok(rv.length > 0 && rv.every((x) => content.lessons.get(x.lessonId).level === "A2"));
  const t1 = FL.buildFinalTest();
  assert.ok(t1.items.every((i) => content.lessons.get(i.lessonId).level === "A1"), "standart daraja A1 bo‘lib qoladi");
  await resetAll();
});
test("A2 yakuniy test: o‘quv xaritasida bor, ekranlar darajani marshrut orqali oladi", () => {
  const lv = CURRICULUM.find((x) => x.level === "A2");
  assert.ok(lv.finalAssessment && /A2/.test(lv.finalAssessment));
  assert.deepEqual(FL.FINAL_LEVELS, ["A1", "A2", "B1"]);
  const src = fs.readFileSync(new URL("./final.js", import.meta.url), "utf8");
  assert.ok(/go\("finalrun", \{ level \}\)/.test(src) && /lvOf\(p\)/.test(src));
});

/* ===================== B1 yakuniy test ===================== */
test("B1 yakuniy test: faqat B1 darslaridan tuziladi, har darsdan bitta savol, A1/A2 natijalaridan alohida saqlanadi", async () => {
  await resetAll();
  const by = (lv) => [...content.lessons.values()].filter((l) => l.level === lv).map((l) => l.id);
  const b1 = by("B1");
  assert.equal(b1.length, 40, "B1 darslari: " + b1.length);
  for (const id of by("A1").concat(by("A2"), b1)) await putLesson({ id, status: "completed", results: {} });
  const t = FL.buildFinalTest(Math.random, "B1");
  assert.equal(t.level, "B1");
  assert.equal(t.lessons, 40);
  assert.ok(t.items.every((i) => content.lessons.get(i.lessonId).level === "B1"), "faqat B1 savollari");
  assert.equal(new Set(t.items.map((i) => i.lessonId)).size, 40, "har darsdan kamida bittadan");
  assert.equal(t.items.length, 40, "xatosiz foydalanuvchida har darsdan aynan 1 ta");
  assert.ok(t.items.length <= FL.FINAL_MAX_QUESTIONS);
  assert.equal(new Set(t.items.map((i) => i.ex.id)).size, t.items.length, "savol takrorlanmaydi");
  for (const it of t.items) assert.ok(it.ex.type !== "match" && String(expectedText(it.ex) || "").length > 0, "javobi bor savol: " + it.ex.id);
  for (let i = 1; i < t.items.length; i++) assert.notEqual(t.items[i].lessonId, t.items[i - 1].lessonId, "ketma-ket bir dars kelmasin");
  // natija: 3 ta savoldan 1 tasi xato, yordam bilan to‘g‘ri javob sanalmaydi
  const ev = FL.evaluateFinal(t.items.map((it, k) => ({ ex: it.ex, correct: k % 3 !== 0, hint: k === 1 })), Date.now(), "B1");
  assert.equal(ev.level, "B1");
  assert.ok(ev.byUnit.length === 10 && ev.byUnit[0].unit === "b1-u01" && ev.byUnit[9].unit === "b1-u10", "10 ta B1 bo‘limi tartib bilan");
  assert.ok(ev.byUnit.every((u) => u.unit.startsWith("b1-") && /\S/.test(u.title)));
  assert.ok(ev.bySkill.grammar && ev.bySkill.vocabulary, "ko‘nikmalar bo‘yicha natija");
  assert.equal(ev.ok, t.items.filter((_, k) => k % 3 !== 0 && k !== 1).length);
  assert.ok(ev.weak.length > 0 && ev.weakLessons.length > 0);
  await FL.recordFinal(ev);
  assert.equal(FL.lastFinal("B1").total, 40);
  assert.equal(FL.lastFinal("A1"), null); assert.equal(FL.lastFinal("A2"), null);
  assert.ok("finalB1" in state.meta && !("finalA1" in state.meta) && !("finalA2" in state.meta), "natija finalB1 kalitida");
  // zaif mavzularni qayta ishlash — faqat B1 dan
  const rv = FL.resolveFinalReview(FL.lastFinal("B1"), 12);
  assert.ok(rv.length > 0 && rv.length <= 12 && rv.every((x) => content.lessons.get(x.lessonId).level === "B1"));
  // standart daraja o‘zgarmagan
  assert.ok(FL.buildFinalTest().items.every((i) => content.lessons.get(i.lessonId).level === "A1"));
  await resetAll();
});
test("B1 yakuniy test: boshlash uchun kamida 5 ta B1 dars kerak; standart daraja B1 → A2 → A1 tartibida tanlanadi", async () => {
  await resetAll();
  const by = (lv) => [...content.lessons.values()].filter((l) => l.level === lv).map((l) => l.id);
  assert.equal(FL.defaultFinalLevel(), "A1", "hech narsa tugatilmagan");
  for (const id of by("A1").slice(0, 5)) await putLesson({ id, status: "completed", results: {} });
  assert.equal(FL.defaultFinalLevel(), "A1");
  for (const id of by("A2").slice(0, 5)) await putLesson({ id, status: "completed", results: {} });
  assert.equal(FL.defaultFinalLevel(), "A2");
  for (const id of by("B1").slice(0, 4)) await putLesson({ id, status: "completed", results: {} });
  assert.equal(FL.defaultFinalLevel(), "A2", "B1 da 4 ta dars yetarli emas");
  assert.equal(FL.buildFinalTest(Math.random, "B1").lessons, 4);
  await putLesson({ id: by("B1")[4], status: "completed", results: {} });
  assert.equal(FL.defaultFinalLevel(), "B1");
  assert.equal(FL.buildFinalTest(Math.random, "B1").total, 5);
  await resetAll();
});
test("B1 yakuniy test: o‘quv xaritasida bor, «Yana» menyusi va bosh sahifa eng yuqori darajani tanlaydi", () => {
  const lv = CURRICULUM.find((x) => x.level === "B1");
  assert.ok(lv.finalAssessment && /B1/.test(lv.finalAssessment));
  assert.equal(CURRICULUM.find((x) => x.level === "B2").finalAssessment, undefined, "B2 testi hali yo‘q");
  const views = fs.readFileSync(new URL("./views.js", import.meta.url), "utf8");
  assert.ok(/defaultFinalLevel as finalLevelFor/.test(views));
  assert.equal((views.match(/finalLevelFor\(\)/g) || []).length, 2, "bosh sahifa va «Yana» menyusi");
});

/* ===================== Gapirishni tekshirish ===================== */
test("gapirish: qisqartma, raqam, vaqt va tinish belgilari farqi xato hisoblanmaydi", () => {
  assert.equal(scoreSpeech("I’m fine, thank you. And you?", "I am fine thank you and you").score, 1);
  assert.equal(scoreSpeech("I have 3 brothers.", "I have three brothers").score, 1);
  assert.equal(scoreSpeech("She’s been to Italy three times.", "she has been to Italy 3 times").score, 1);
  assert.equal(scoreSpeech("He is my father.", "he's my father").score, 1);
  assert.equal(scoreSpeech("The warehouse opens at 8 a.m.", "the warehouse opens at 8 am").score, 1);
  assert.deepEqual(speechTokens("It’s 5 o’clock"), ["it", "'s", "five", "oclock"]);
});
test("gapirish: tushib qolgan yoki noto‘g‘ri so‘z belgilanadi, eng yaxshi variant tanlanadi", () => {
  const r = scoreSpeech("Good morning! How are you?", "good morning how you");
  assert.equal(r.total, 5); assert.equal(r.matched, 4); assert.equal(r.level, "ok");
  assert.deepEqual(r.words.filter((w) => !w.ok).map((w) => w.w), ["are"]);
  const best = scoreSpeech("I have three brothers.", [{ text: "I have tree brother" }, { text: "I have three brothers" }]);
  assert.equal(best.score, 1); assert.equal(best.heard, "I have three brothers");
  const none = scoreSpeech("What time is it?", "");
  assert.equal(none.score, 0); assert.equal(none.level, "low");
  assert.ok(/eshitilmadi/.test(speechFeedback(none)));
});
test("gapirish: barcha darsdagi namunalar o‘ziga 100% mos keladi (tokenlash barqaror)", () => {
  for (const l of content.lessons.values()) for (const s of l.speaking || []) {
    const r = scoreSpeech(s.model, s.model);
    assert.equal(r.score, 1, l.id + ": " + s.model);
  }
});
test("gapirish: brauzerda tanish yo‘q bo‘lsa (Node), ilova buzilmaydi", async () => {
  assert.equal(RC.recognitionSupported(), false);
  assert.equal(await RC.localStatus(), "unsupported");
  assert.equal(await RC.installLocal(), false);
  await assert.rejects(RC.listenOnce().done, (e) => e.error === "unsupported");
  assert.ok(/internet/.test(RC.recognitionErrorMessage("network")));
});
test("gapirish: avtomatik natija urinishga yoziladi, boshqa maydonlar o‘zgarmaydi", async () => {
  await resetAll();
  recordResult({ ex: { id: "u01l01-s1", skill: "speaking", concept: "speaking:x" }, correct: true, phase: "practice", selfRating: 3, asrScore: 0.8 });
  recordResult({ ex: { id: "u01l01-s2", skill: "speaking", concept: "speaking:y" }, correct: true, phase: "practice", selfRating: 2 });
  assert.equal(state.attempts[0].asrScore, 0.8);
  assert.equal(state.attempts[0].selfRating, 3);
  assert.ok(!("asrScore" in state.attempts[1]));
  await resetAll();
});

/* ===================== CI ===================== */
test("CI: GitHub Actions har yuklashda npm test ni ishga tushiradi", () => {
  const y = fs.readFileSync(new URL("./.github/workflows/test.yml", import.meta.url), "utf8");
  assert.ok(/on:[\s\S]*push/.test(y) && /pull_request/.test(y));
  assert.ok(/npm test/.test(y));
  const pkg = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), "utf8"));
  assert.ok(/test-v05\.mjs/.test(pkg.scripts.test));
});

for (const [name, fn] of tests) {
  try { await fn(); passed++; console.log("  ✓", name); }
  catch (e) { failed++; console.log("  ✗", name, "\n     ", String(e.message).split("\n")[0]); }
}
console.log(`\n${passed} o‘tdi, ${failed} xato`);
process.exit(failed ? 1 : 0);
