// test-new.mjs — yangi imkoniyatlar testlari (so‘zlar, rasmlar, kartochkalar, dizayn, oflayn). Ishga tushirish:  node test-new.mjs
// Eski testlar test-logic.mjs da. Ikkalasi:  npm test
import assert from "node:assert/strict";
import fs from "node:fs";
import { initStore, state, resetAll, replaceAll, exportState, DEFAULT_SETTINGS } from "./store.js";
import { loadContent, content, gradeVocab, ensureVocabCards, dueCardList, buildReviewItem, lessonVocabPool } from "./learn.js";
import { CATEGORIES, CAT_SHORT, LEVELS_V, parseExtra, slug, vdata, catOf, levelOf } from "./vocabdata.js";
import { EXTRA_VOCAB_FILES, CONTENT_FILES } from "./curriculum.js";
import * as IL from "./imagelib.js";
import * as CL from "./cardslogic.js";
import * as LG from "./lugatlogic.js";
import { buildBackup, validateBackup } from "./backup.js";
import { CHANGELOG, VERSION, hasUnseen } from "./changelog.js";
import { newCard, reviewCard, DAY } from "./srs.js";

let passed = 0, failed = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const read = (f) => fs.readFileSync(new URL("./" + f, import.meta.url), "utf8");

await initStore();
await loadContent();
const ALL = [...content.vocab.values()];
const EXT = ALL.filter((v) => v.ext);
const LESSON = ALL.filter((v) => !v.ext);

/* ===================== Lug‘at ===================== */
test("lug‘at: hech qanday yuklash xatosi yo‘q va jami ~1000 ta so‘z bor", () => {
  assert.deepEqual(content.loadErrors, []);
  assert.ok(ALL.length >= 1000 && ALL.length <= 1100, "jami so‘z: " + ALL.length);
  assert.equal(LESSON.length, 463, "darsdagi so‘zlar o‘zgarmagan bo‘lishi kerak");
  assert.equal(LESSON.length + EXT.length, ALL.length);
});
test("lug‘at: takroriy ID va takroriy inglizcha so‘z yo‘q (darslar va qo‘shimcha ro‘yxatlar orasida ham)", () => {
  assert.equal(new Set(ALL.map((v) => v.id)).size, ALL.length, "takroriy ID");
  const slugs = ALL.map((v) => slug(v.en));
  assert.equal(new Set(slugs).size, slugs.length, "takroriy so‘z: " + slugs.filter((s, i) => slugs.indexOf(s) !== i).join(", "));
  for (const f of EXTRA_VOCAB_FILES) { /* fayldagi har bir qator o‘qiladi */ }
});
test("lug‘at: qo‘shimcha ro‘yxatlar fayllari xatosiz o‘qiladi, har qator 6 maydon, mavzu to‘g‘ri", async () => {
  for (const f of EXTRA_VOCAB_FILES) {
    const mod = (await import("./" + f)).default;
    assert.ok(["A1", "A2"].includes(mod.level), f + " darajasi");
    const { entries, problems } = parseExtra(mod);
    assert.deepEqual(problems, [], f);
    assert.ok(entries.length > 100, f + " juda kichik");
    assert.ok(fs.statSync(new URL("./" + f, import.meta.url)).size < 80000, f + " 80 KB dan katta: telefondan yuklashda uziladi");
  }
});
test("lug‘at: har bir yangi so‘zda ID, inglizcha, o‘zbekcha, IPA, so‘z turkumi, misol va tarjimasi, daraja, mavzu va rasm kaliti bor", () => {
  for (const v of EXT) {
    for (const k of ["id", "en", "uz", "ipa", "pos"]) assert.ok(typeof v[k] === "string" && v[k].trim(), `${v.id}: «${k}» bo‘sh`);
    assert.ok(v.ex && v.ex.en.trim() && v.ex.uz.trim(), v.id + " misol");
    assert.match(v.ex.en, /[.?!]$/, v.id + ": misol gap tinglash uchun tugallangan bo‘lishi kerak");
    assert.match(v.ex.uz, /[.?!]$/, v.id + ": tarjima tugallanmagan");
    assert.ok(LEVELS_V.includes(v.level), v.id + " daraja");
    assert.ok(CATEGORIES[v.cat], v.id + " mavzu");
    assert.ok(slug(v.en).length > 0, v.id + " rasm kaliti");
    assert.equal(vdata(v).ipa, v.ipa, v.id + " IPA");
    assert.ok(!/[0-9]/.test(v.ipa), v.id + " IPA da raqam");
  }
});
test("lug‘at: darsdagi so‘zlar ham daraja (A1) va mavzuga ega", () => {
  for (const v of LESSON) { assert.equal(levelOf(v), "A1"); assert.ok(CATEGORIES[catOf(v)], v.id + " mavzu: " + catOf(v)); }
});
test("lug‘at: 15 ta mavzuning hammasida yetarli so‘z bor; A1 va A2 ikkalasi mavjud; logistika va ish joyi ustuvor", () => {
  const E = LG.buildEntries(content.vocab);
  const cnt = {}; for (const e of E) cnt[e.cat] = (cnt[e.cat] || 0) + 1;
  assert.deepEqual(Object.keys(CATEGORIES).sort(), Object.keys(CAT_SHORT).sort());
  for (const k of Object.keys(CATEGORIES)) assert.ok((cnt[k] || 0) >= 20, `${k}: ${cnt[k] || 0} ta`);
  assert.ok(cnt.logi >= 60 && cnt.work >= 40 && cnt.prob >= 40, JSON.stringify(cnt));
  assert.ok(E.some((e) => e.level === "A1") && E.some((e) => e.level === "A2"));
  assert.equal(Object.values(cnt).reduce((a, b) => a + b, 0), E.length);
});
test("lug‘at: daraja va mavzu filtrlari, qidiruv yangi so‘zlarda ishlaydi", () => {
  const E = LG.buildEntries(content.vocab);
  const logi = LG.filterEntries(E, { cat: "logi" });
  assert.ok(logi.length >= 60 && logi.every((e) => e.cat === "logi"));
  const a2 = LG.filterEntries(E, { level: "A2" });
  assert.ok(a2.length > 100 && a2.every((e) => e.level === "A2"));
  const both = LG.filterEntries(E, { level: "A2", cat: "logi" });
  assert.ok(both.length > 0 && both.every((e) => e.level === "A2" && e.cat === "logi"));
  assert.ok(LG.filterEntries(E, { q: "warehouse" }).some((e) => e.en === "warehouse"));
  assert.ok(LG.filterEntries(E, { q: "ombor" }).some((e) => e.en === "warehouse"));
  assert.equal(LG.filterEntries(E, { q: "zzzqqq" }).length, 0);
  assert.equal(LG.filterEntries(E, {}).length, E.length);
});
test("lug‘at: variantlar uchun faqat darsdagi so‘zlar ishlatiladi; noto‘g‘ri variantlar bir-biridan farq qiladi", async () => {
  const { makeVocabRecEx, makeListenEx } = await import("./engine.js");
  assert.equal(lessonVocabPool().length, LESSON.length);
  for (const v of ALL) for (let k = 0; k < 3; k++) {
    const r = makeVocabRecEx(v, ALL);
    assert.equal(new Set(r.options).size, r.options.length, v.id + " variantlar takrori");
    assert.equal(r.options[r.answer], v.uz);
    const l = makeListenEx(v, ALL);
    assert.equal(new Set(l.options).size, l.options.length, v.id + " tinglash variantlari takrori");
  }
});

/* ===================== Rasmlar ===================== */
const shardSrc = (n) => read(`images-${n}.js`);
const shardKeys = async (n) => Object.keys((await import(`./images-${n}.js`)).default);
test("rasmlar: INDEX fayllardagi kalitlar bilan aynan bir xil (qo‘lda unutilgan yoki ortiqcha kalit yo‘q)", async () => {
  for (const n of Object.keys(IL.SHARD_FILES)) {
    const keys = await shardKeys(n);
    const idx = [...IL.IMAGE_KEYS].filter(([, s]) => s === Number(n)).map(([k]) => k);
    assert.deepEqual(idx.sort(), keys.slice().sort(), `images-${n}.js va INDEX farq qiladi`);
  }
  const all = []; for (const n of Object.keys(IL.SHARD_FILES)) all.push(...await shardKeys(n));
  assert.equal(new Set(all).size, all.length, "bir rasm kaliti ikki faylda");
  assert.equal(IL.IMAGE_KEYS.size, all.length);
});
test("rasmlar: faylda bir kalit ikki marta yozilmagan (JS buni jim yutib yuboradi)", () => {
  for (const n of Object.keys(IL.SHARD_FILES)) {
    const keys = [...shardSrc(n).matchAll(/^\s{2}("?)([a-z0-9-]+)\1:\s*"/gm)].map((m) => m[2]);
    assert.ok(keys.length > 20, `images-${n}.js kalitlari topilmadi`);
    assert.equal(new Set(keys).size, keys.length, `images-${n}.js da takroriy kalit`);
  }
});
test("rasmlar: har bir chizma xatosiz SVG ga aylanadi, hajmi me’yorda, fayl 80 KB dan kichik", async () => {
  let total = 0;
  for (const n of Object.keys(IL.SHARD_FILES)) {
    const shard = (await import(`./images-${n}.js`)).default;
    assert.ok(Buffer.byteLength(shardSrc(n)) < 80000, `images-${n}.js juda katta`);
    for (const [k, spec] of Object.entries(shard)) {
      assert.deepEqual(IL.validateSpec(spec), [], k);
      const svg = IL.renderSvgStrict(spec);
      assert.ok(svg.startsWith("<svg ") && svg.endsWith("</svg>"), k);
      assert.ok(!/<script|onload|onerror|javascript:/i.test(svg), k + " xavfli belgi");
      assert.ok(svg.length < 3500, `${k}: ${svg.length} bayt`);
      assert.equal((svg.match(/</g) || []).length, (svg.match(/>/g) || []).length, k + " teglar muvozanati");
      total++;
    }
  }
  assert.ok(total >= 200, "rasmlar soni: " + total);
});
test("rasmlar: har bir rasm kaliti haqiqiy so‘zga tegishli (yetim rasm yo‘q), taxalluslar mavjud rasmga olib boradi", () => {
  const slugs = new Set(ALL.map((v) => slug(v.en)));
  const targets = new Set(Object.values(IL.ALIAS));
  for (const k of IL.IMAGE_KEYS.keys()) assert.ok(slugs.has(k) || targets.has(k), "so‘zi yo‘q rasm: " + k);
  for (const [a, t] of Object.entries(IL.ALIAS)) { assert.ok(IL.IMAGE_KEYS.has(t), `${a} → ${t}: rasm yo‘q`); assert.ok(slugs.has(a), `${a}: bunday so‘z yo‘q`); }
});
test("rasmlar: so‘zlarning rasmi bor/yo‘qligi hisoblanadi (hisobot uchun) va yetarli qismi qamrab olingan", () => {
  const E = LG.buildEntries(content.vocab);
  const withSvg = E.filter((e) => e.img).length;
  const emojiOnly = E.filter((e) => !e.img && e.icon).length;
  assert.ok(withSvg >= 200, "SVG rasmli so‘zlar: " + withSvg);
  assert.ok(withSvg + emojiOnly >= 450, "rasm yoki belgisi bor so‘zlar: " + (withSvg + emojiOnly));
  console.log(`      (SVG rasmli: ${withSvg}, faqat emoji: ${emojiOnly}, rasmsiz: ${E.length - withSvg - emojiOnly}, jami: ${E.length})`);
});
test("rasmlar: buzuq chizma yoki yuklanmagan fayl ilovani buzmaydi (null qaytadi), yuklash xatosi keshlanmaydi", async () => {
  assert.equal(IL.renderSvg("bg zz; c 1 2 3 R"), null);
  assert.equal(IL.renderSvg("c 50 50 10 R"), null, "fonsiz chizma");
  assert.equal(IL.renderSvg("bg r; c 50 50 10 ZZ"), null, "noma’lum rang");
  assert.equal(IL.renderSvg("bg r; d M0,0<script> R"), null, "yo‘lda yaroqsiz belgi");
  assert.equal(await IL.svgFor("shu-nomli-rasm-yoq"), null);
  assert.equal(await IL.svgFor("apple", () => Promise.reject(new Error("tarmoq yo‘q"))), null);
  assert.ok(await IL.svgFor("apple"), "xato keshlanib qolgan: keyingi urinish ishlashi kerak");
  const svg = await IL.svgFor("apple");
  assert.ok(svg.includes("<svg"));
  assert.equal(await IL.svgFor("beef"), await IL.svgFor("meat"), "taxallus");
});

/* ===================== Kartochkalar ===================== */
const entries = () => LG.buildEntries(content.vocab);
const hasVisual = (e) => !!(e.img || e.icon);
const deck = (o) => CL.buildDeck(entries(), { cards: state.cards, hasVisual, now: Date.now(), seed: 7, ...o });

test("kartochkalar: savol matnida javob yo‘q; ikki rejim bor", () => {
  assert.deepEqual(Object.keys(CL.MODES).sort(), ["en", "uz"]);
  assert.equal(CL.promptFor("en"), "Inglizchasini toping");
  assert.equal(CL.promptFor("uz"), "Ma’nosini toping");
});
test("kartochkalar: seans faqat rasmli so‘zlardan tuziladi, rasmsizlar soni aytiladi", async () => {
  await resetAll();
  const d = deck({ source: "all", count: 100000 });
  const byId = new Map(entries().map((e) => [e.id, e]));
  assert.ok(d.ids.length > 400 && d.ids.length === d.available && d.ids.every((id) => hasVisual(byId.get(id))));
  assert.ok(d.skipped > 0 && d.skipped + d.available === d.total);
  assert.equal(new Set(d.ids).size, d.ids.length);
});
test("kartochkalar: daraja, mavzu va soni bo‘yicha tanlash; bir xil seed — bir xil tartib", async () => {
  await resetAll();
  const byId = new Map(entries().map((e) => [e.id, e]));
  const d = deck({ source: "all", level: "A2", cat: "logi", count: 12 });
  assert.ok(d.ids.length > 0 && d.ids.length <= 12);
  assert.ok(d.ids.every((id) => byId.get(id).level === "A2" && byId.get(id).cat === "logi"));
  assert.deepEqual(deck({ source: "all", count: 15 }).ids, deck({ source: "all", count: 15 }).ids);
  assert.notDeepEqual(deck({ source: "all", count: 15, seed: 1 }).ids, deck({ source: "all", count: 15, seed: 2 }).ids);
  assert.equal(deck({ source: "mix", count: 20 }).ids.length, 20);
});
test("kartochkalar: «Takror» faqat muddati kelganlar, «Yangi» — kartasiz so‘zlar, «Sevimli» va «Qiyin» to‘g‘ri saralanadi", async () => {
  await resetAll();
  const now = 1_800_000_000_000;
  const ids = deck({ source: "all", count: 6, now }).ids;
  const [a, b, c, d1] = ids;
  state.cards.set(`v:${a}:rec`, { ...newCard(`v:${a}:rec`, "vocab-rec", { ref: a }, now - 5 * DAY), reps: 2, stage: 2, due: now - DAY }); // muddati o‘tgan
  state.cards.set(`v:${b}:rec`, { ...newCard(`v:${b}:rec`, "vocab-rec", { ref: b }, now - DAY), reps: 1, stage: 1, due: now + 3 * DAY }); // hali erta, qiyin emas? stage 1 va reps>0 → qiyin
  state.cards.set(`v:${c}:rec`, { ...newCard(`v:${c}:rec`, "vocab-rec", { ref: c }, now - DAY), reps: 3, stage: 4, lapses: 0, due: now + 20 * DAY });
  const due = deck({ source: "due", count: 50, now }).ids;
  assert.deepEqual(due, [a]);
  const nw = deck({ source: "new", count: 100000, now }).ids;
  assert.ok(!nw.includes(a) && !nw.includes(b) && !nw.includes(c) && nw.includes(d1));
  const hard = deck({ source: "hard", count: 50, now }).ids;
  assert.ok(hard.includes(b) && !hard.includes(c));
  const fav = CL.buildDeck(entries(), { cards: state.cards, hasVisual, now, favs: new Set([c, d1]), source: "fav", count: 10 }).ids;
  assert.deepEqual(fav.sort(), [c, d1].sort());
  const mix = deck({ source: "mix", count: 10, now }).ids;
  assert.equal(mix[0], a, "aralashda avval takrorlanadigan so‘z");
  assert.ok(!mix.includes(c), "muddati kelmagan o‘zlashtirilgan so‘z aralashga kirmaydi");
  assert.deepEqual(deck({ onlyIds: [d1, "yoq-id"], count: 5, now }).ids, [d1], "aniq ro‘yxat; mavjud bo‘lmagani tushib qoladi");
});
test("kartochkalar: seans holati — har so‘z bir marta baholanadi, natija to‘g‘ri hisoblanadi, tiklash yaroqliligi tekshiriladi", () => {
  const ids = ["a", "b", "c", "d", "e"];
  const s = CL.newSession({ ids, mode: "uz", source: "all" });
  assert.equal(s.mode, "uz"); assert.equal(CL.newSession({ ids, mode: "xx" }).mode, "en");
  assert.equal(CL.gradeInSession(s, "a", "good"), true);
  assert.equal(CL.gradeInSession(s, "a", "again"), false, "ikkinchi baho SRS ni ikki marta o‘zgartirmasligi kerak");
  assert.equal(CL.gradeInSession(s, "zzz", "good"), false);
  assert.equal(CL.gradeInSession(s, "b", "juda-yaxshi"), false);
  CL.gradeInSession(s, "b", "easy"); CL.gradeInSession(s, "c", "hard"); CL.gradeInSession(s, "d", "again");
  const st = CL.sessionStats(s);
  assert.deepEqual([st.total, st.graded, st.good, st.easy, st.hard, st.again, st.skipped], [5, 4, 1, 1, 1, 1, 1]);
  assert.equal(st.recalledPct, 50);
  assert.deepEqual(st.hardIds.sort(), ["c", "d"]);
  const valid = new Set(ids);
  assert.equal(CL.resumable(JSON.parse(JSON.stringify(s)), valid), true, "saqlangan seans JSON orqali tiklanadi");
  assert.equal(CL.resumable({ ...s, ids: ["a", "yoq"] }, valid), false);
  assert.equal(CL.resumable({ ...s, idx: 5 }, valid), false);
  assert.equal(CL.resumable(null, valid), false);
  assert.equal(CL.resumable({ ...s, v: 2 }, valid), false);
  assert.equal(CL.clampIdx(s, -3), 0); assert.equal(CL.clampIdx(s, 99), 4);
});
test("kartochkalar + SRS: baho darsdagi so‘zlar bilan bir xil «v:<so‘z>:rec» kartasiga yoziladi (alohida algoritm yo‘q)", async () => {
  await resetAll();
  const now = 1_800_000_000_000;
  const w = EXT.find((v) => LG.buildEntries(new Map([[v.id, v]]))[0].img) || EXT[0];
  const id = "v:" + w.id + ":rec";
  assert.equal(state.cards.has(id), false);
  const c1 = gradeVocab(w.id, "good", now);
  assert.equal(c1.kind, "vocab-rec"); assert.equal(c1.ref, w.id); assert.equal(c1.lessonId, null);
  const expected = reviewCard(newCard(id, "vocab-rec", { ref: w.id, lessonId: null }, now), true, { grade: "good" }, now);
  assert.equal(c1.stage, expected.stage); assert.equal(c1.due, expected.due); assert.equal(c1.reps, 1);
  assert.equal(state.cards.get(id), c1);
  const c2 = gradeVocab(w.id, "again", now + 1000);
  assert.equal(c2.lapses, 1); assert.equal(c2.stage, 0); assert.equal(c2.due, now + 1000 + 10 * 60000, "xato: 10 daqiqadan keyin qayta");
  const c3 = gradeVocab(w.id, "easy", now + 2000);
  assert.ok(c3.stage >= 2 && c3.due > now + DAY, "oson: interval uzayadi");
  assert.ok(state.cards.has("v:" + w.id + ":prod"), "2-bosqichdan «yozib berish» kartasi ochiladi (darsdagi so‘zlar kabi)");
});
test("kartochkalar + SRS: noto‘g‘ri so‘z yoki baho kartani yaratmaydi; mavjud darsdagi karta shu yerdan yangilanadi", async () => {
  await resetAll();
  const before = state.cards.size;
  assert.equal(gradeVocab("yoq-id", "good"), null);
  assert.equal(gradeVocab(EXT[0].id, "a’lo"), null);
  assert.equal(state.cards.size, before);
  const lessonWord = LESSON[0];
  ensureVocabCards({ vocab: [lessonWord], id: lessonWord.lessonId });
  const old = state.cards.get("v:" + lessonWord.id + ":rec");
  const upd = gradeVocab(lessonWord.id, "good", Date.now());
  assert.equal(upd.reps, old.reps + 1); assert.equal(upd.lessonId, lessonWord.lessonId);
});
test("kartochkalar + SRS: baholangan so‘z takrorlash navbatiga tushadi va takrorlash mashqi yasaladi; zaxirada saqlanadi", async () => {
  await resetAll();
  const w = EXT[3];
  gradeVocab(w.id, "again", Date.now() - 20 * 60000); // 20 daqiqa oldin xato: muddati o‘tgan
  const due = dueCardList();
  assert.ok(due.some((c) => c.ref === w.id), "navbatda yo‘q");
  const item = buildReviewItem(state.cards.get("v:" + w.id + ":rec"));
  assert.ok(item && item.ex && item.cardId === "v:" + w.id + ":rec");
  assert.equal(item.ex.options[item.ex.answer], w.uz); assert.equal(new Set(item.ex.options).size, 4);
  const b = validateBackup(JSON.parse(JSON.stringify(buildBackup(exportState()))));
  assert.ok(b.ok, (b.problems || []).join());
  await resetAll();
  const r = await replaceAll(b.clean);
  assert.equal(r.ok, true);
  assert.ok(state.cards.has("v:" + w.id + ":rec"), "tiklashdan keyin karta saqlanadi");
});

/* ===================== Sozlamalar, zaxira, yangiliklar ===================== */
test("sozlamalar: yorug‘/tungi rejim standarti «tizim»; to‘g‘ri qiymatlar zaxiradan tiklanadi, noto‘g‘risi tashlanadi, eski zaxira buzilmaydi", async () => {
  assert.equal(DEFAULT_SETTINGS.theme, "system");
  const mk = (s) => validateBackup(buildBackup({ settings: s, cards: [], errors: [], lessons: [], attempts: [], writings: [], meta: {} }));
  assert.equal(mk({ theme: "dark" }).clean.settings.theme, "dark");
  assert.equal(mk({ theme: "light" }).clean.settings.theme, "light");
  assert.equal(mk({ theme: "neon" }).clean.settings.theme, undefined);
  assert.equal(mk({ courseOrder: "sequential" }).clean.settings.courseOrder, "sequential");
  assert.equal(mk({ courseOrder: "x" }).clean.settings.courseOrder, undefined);
  const old = mk({ uzSupport: "full" });
  assert.ok(old.ok);
  await resetAll();
  await replaceAll(old.clean);
  assert.equal(state.settings.theme, "system", "eski zaxirada rejim yo‘q: standart qo‘llanadi");
  await replaceAll(mk({ theme: "dark" }).clean);
  assert.equal(state.settings.theme, "dark");
  assert.equal(exportState().settings.theme, "dark");
});
test("yangiliklar: versiya ro‘yxatning birinchi yozuvi bilan bir xil, yozuvlar to‘liq va takrorlanmaydi", () => {
  assert.equal(VERSION, CHANGELOG[0].version);
  assert.equal(new Set(CHANGELOG.map((c) => c.version)).size, CHANGELOG.length);
  for (const c of CHANGELOG) {
    assert.match(c.version, /^\d+\.\d+\.\d+$/); assert.match(c.date, /^\d{4}-\d{2}-\d{2}$/); assert.ok(c.title);
    assert.ok((c.add || []).length + (c.chg || []).length + (c.rem || []).length > 0, c.version + " bo‘sh");
  }
  assert.equal(hasUnseen(null), true); assert.equal(hasUnseen("0.0.1"), true); assert.equal(hasUnseen(VERSION), false);
});

/* ===================== Dizayn va oflayn (fayllar bo‘yicha) ===================== */
const css = read("style.css");
test("dizayn: ranglar CSS o‘zgaruvchilarida, yorug‘ va tungi rejim to‘liq (talab qilingan qiymatlar)", () => {
  for (const c of ["#F6F8FC", "#FFFFFF", "#172033", "#667085", "#465FFF", "#EEF1FF", "#16865C", "#B7791F", "#D92D20", "#E4E7EC"]) assert.ok(css.toUpperCase().includes(c), "yorug‘ rejimda yo‘q: " + c);
  for (const c of ["#0F172A", "#182338", "#F1F5F9", "#A6B2C5", "#8190FF", "#253252", "#4DD6A0", "#303D52"]) assert.ok(css.toUpperCase().includes(c), "tungi rejimda yo‘q: " + c);
  assert.ok(/prefers-color-scheme:\s*dark/.test(css));
  assert.ok(/\[data-theme=["']?dark["']?\]/.test(css) && /\[data-theme=["']?light["']?\]/.test(css), "qo‘lda tanlangan rejim");
  assert.ok(/prefers-reduced-motion/.test(css), "«harakatni kamaytirish»");
});
test("dizayn: komponentlarda qo‘lda yozilgan rang yo‘q — hamma rang o‘zgaruvchi orqali (faqat rejim bloklarida hex)", () => {
  // Rejim bloklari: :root{...}, @media(prefers-color-scheme){:root{...}}, :root[data-theme=...]{...}
  const stripped = css.replace(/:root[^{]*\{[^}]*\}/g, "").replace(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*\}/g, "");
  const hex = stripped.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  const allowed = new Set(["#000", "#000000"]); // faqat soya (rgba) uchun ruxsat
  const bad = hex.filter((h) => !allowed.has(h.toLowerCase()));
  assert.deepEqual(bad, [], "rejim bloklaridan tashqarida qo‘lda yozilgan rang: " + bad.join(", "));
});
test("dizayn: pastki menyu matni kamida 12 px, tugmalar kamida 44 px (o‘zgaruvchilarda), 16 px burchak", () => {
  const nav = css.match(/#nav button\s*\{[^}]*\}/)[0];
  const fs_ = nav.match(/font-size:\s*([\d.]+)(rem|px)/);
  assert.ok(fs_ && (fs_[2] === "rem" ? parseFloat(fs_[1]) * 16 : parseFloat(fs_[1])) >= 12, "menyu shrifti: " + (fs_ && fs_[0]));
  assert.match(css, /--tap:\s*44px/); assert.match(css, /--btn-h:\s*(4[4-9]|5\d)px/); assert.match(css, /--r-card:\s*16px/);
  assert.match(css, /--pad:\s*16px/); assert.match(css, /--gap:\s*12px/);
});
test("oflayn: sw.js ro‘yxati to‘liq (barcha modullar, kontent, rasm va so‘z fayllari), kesh versiyasi oshirilgan, o‘rnatish atomik", () => {
  const sw = read("sw.js");
  const list = sw.match(/const FILES = \[([\s\S]*?)\];/)[1];
  const files = [...list.matchAll(/"\.\/([^"]*)"/g)].map((m) => m[1]).filter(Boolean);
  for (const f of files) assert.ok(fs.existsSync(new URL("./" + f, import.meta.url)), "sw.js dagi fayl yo‘q: " + f);
  const mods = fs.readdirSync(new URL("./", import.meta.url)).filter((f) => f.endsWith(".js") && f !== "sw.js");
  for (const f of mods) assert.ok(files.includes(f), "oflayn ro‘yxatda yo‘q: " + f);
  for (const f of [...CONTENT_FILES, ...EXTRA_VOCAB_FILES, ...Object.values(IL.SHARD_FILES)]) assert.ok(files.includes(f), "sw.js da yo‘q: " + f);
  assert.equal(new Set(files).size, files.length, "ro‘yxatda takror");
  assert.ok(Number(sw.match(/ingliz-tili-v(\d+)/)[1]) >= 15, "kesh versiyasi oshirilmagan");
  assert.ok(/failed\.length[\s\S]*throw/.test(sw), "to‘liq yuklanmasa o‘rnatish bekor bo‘lishi kerak");
  assert.ok(/caches\.delete\(CACHE\)/.test(sw));
  assert.ok(files.includes("index.html") && files.includes("style.css") && files.includes("manifest.webmanifest"));
});
test("oflayn: kontent fayllari 80 KB dan kichik (telefondan yuklashda uzilmasligi uchun)", () => {
  for (const f of fs.readdirSync(new URL("./", import.meta.url)).filter((f) => /^(content|vocab|images)-.*\.js$/.test(f))) {
    assert.ok(fs.statSync(new URL("./" + f, import.meta.url)).size < 80000, f);
  }
});
test("ilova: index.html da 6 ta pastki menyu tugmasi, app.js import qilgan hamma modul mavjud", () => {
  const html = read("index.html");
  assert.equal((html.match(/<button type="button" data-tab=/g) || []).length, 6);
  for (const m of read("app.js").matchAll(/from "\.\/([^"]+)"|import "\.\/([^"]+)"/g)) assert.ok(fs.existsSync(new URL("./" + (m[1] || m[2]), import.meta.url)), "app.js import: " + (m[1] || m[2]));
  for (const f of ["cards.js", "views.js", "lugat.js"]) for (const m of read(f).matchAll(/from "\.\/([^"]+)"|import "\.\/([^"]+)"/g)) assert.ok(fs.existsSync(new URL("./" + (m[1] || m[2]), import.meta.url)), f + " import: " + (m[1] || m[2]));
});

for (const [name, fn] of tests) {
  try { await fn(); passed++; console.log("  ✓", name); }
  catch (e) { failed++; console.log("  ✗", name, "\n     ", String(e.message).split("\n")[0]); }
}
console.log(`\n${passed} o‘tdi, ${failed} xato`);
process.exit(failed ? 1 : 0);
