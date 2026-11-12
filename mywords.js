// mywords.js — «Mening so‘zlarim»: Lug‘atdan tanlangan so‘zlarni o‘rganish, mashq qilish va yozma tekshirish.
// Saqlash: IndexedDB «meta» jadvali (kalitlar: myWords, myTest, myResults, myWrong) — sevimlilar (lugatFav) va dars so‘zlaridan alohida.
// SRS: faqat MAVJUD so‘z kartalariga gradeVocab orqali yoziladi; yangi karta yaratilmaydi (mywordslogic.applyToSrs).
import { h, toast, confirmDialog, frame } from "./ui.js";
import { register, go, screen } from "./nav.js";
import { state, getMeta, setMeta, delMeta } from "./store.js";
import { content, gradeVocab } from "./learn.js";
import { speak, ttsAvailable } from "./speech.js";
import { askExercise } from "./player.js";
import { recordResult } from "./learn.js";
import { buildEntries, cardStatus, whenText } from "./lugatlogic.js";
import * as MW from "./mywordslogic.js";

const memoryMode = () => state.storageMode === "memory";
const say = (t, rate) => speak(String(t).replace(/\n/g, " "), { rate: rate || state.settings.ttsRate });

/* ---------- umumiy yordamchilar ---------- */
let entCache = null;
function entries() {
  if (!entCache || entCache.size !== content.vocab.size) {
    const list = buildEntries(content.vocab);
    entCache = { size: content.vocab.size, list, byId: new Map(list.map((e) => [e.id, e])), sib: MW.buildSiblingIndex([...content.vocab.values()]) };
  }
  return entCache;
}
const validIds = () => new Set(content.vocab.keys());

export function getMyWords() { return MW.parseWords(getMeta(MW.KEYS.words, []), validIds()); }

let q = Promise.resolve();
/** Saqlashni navbatga qo‘yadi (ketma-ket tez bosishlarda biri ikkinchisini ustidan yozib yubormasligi uchun). Muvaffaqiyatsiz bo‘lsa oldingi holat qaytariladi. */
function writeWords(compute) {
  q = q.then(async () => {
    const prev = getMeta(MW.KEYS.words, []);
    const out = compute(MW.parseWords(prev, validIds()));
    if (!out.changed) return { ...out, ok: true, persisted: true };
    let res = null;
    try { res = await setMeta(MW.KEYS.words, out.list); } catch { res = null; }
    const persisted = res !== null && res !== undefined;
    if (!persisted && !memoryMode()) { try { await setMeta(MW.KEYS.words, prev); } catch { /* xotiradagini qaytarishga urinish */ } return { ...out, ok: false, persisted: false }; }
    return { ...out, ok: true, persisted };
  });
  return q;
}
/** ids ni «Mening so‘zlarim» ga qo‘shadi → { added, existing, invalid, ok, persisted } */
export function addMyWords(ids) {
  return writeWords((cur) => { const r = MW.addWords(cur, ids, validIds()); return { ...r, changed: r.added > 0 }; });
}
export function removeMyWords(ids) {
  return writeWords((cur) => { const list = MW.removeWords(cur, ids); return { list, added: 0, existing: 0, invalid: 0, changed: list.length !== cur.length }; });
}
/** Mini-karta va ＋ tugmalari uchun matn. */
export const countText = (n) => (n ? `${n} ta tanlangan so‘z` : "Hali so‘z tanlanmagan");

const btn = (label, onClick, cls = "") => h("button", { type: "button", class: "btn " + cls, onClick }, label);
const stat = (n, label, cls = "") => h("div", { class: "mw-stat " + cls }, h("b", null, String(n)), h("span", null, label));

/* ===================== Asosiy sahifa ===================== */
function mainPage() {
  const ids = getMyWords();
  const { byId } = entries();
  const now = Date.now();
  const st = MW.computeStats(ids, { cards: state.cards, wrong: MW.parseWrong(getMeta(MW.KEYS.wrong, {}), validIds()), results: getMeta(MW.KEYS.results, []), masteryStage: state.settings.masteryStage || 4, now });
  const saved = MW.parseTest(getMeta(MW.KEYS.test, null), validIds());
  const page = h("div", { class: "page mywords" });
  page.append(h("div", { class: "lg-top" }, h("h1", null, "Mening so‘zlarim"), btn("Lug‘at", () => go("lugat"), "small")));

  if (!ids.length) {
    page.append(h("div", { class: "card mw-empty", role: "status" },
      h("h3", null, "Hali so‘z tanlanmagan"),
      h("p", { class: "muted" }, "Lug‘atdagi so‘z yonidagi ＋ tugmasini bosing yoki filtrlangan ro‘yxatni bir yo‘la qo‘shing."),
      btn("Lug‘atga o‘tish", () => go("lugat"), "wide")));
    return page;
  }

  page.append(h("div", { class: "mw-stats" },
    stat(st.total, "Jami so‘z"), stat(st.mastered, "O‘zlashtirilgan", "ok"), stat(st.due, "Takror kerak", st.due ? "due" : ""), stat(st.wrongCount, "Xato so‘z", st.wrongCount ? "bad" : "")));
  if (st.noCard) page.append(h("p", { class: "small muted" }, `${st.noCard} ta so‘z darsda hali ko‘rilmagan: ular uchun takrorlash kartasi yo‘q (yangi karta o‘z-o‘zidan yaratilmaydi).`));
  if (st.trend.last) {
    const l = st.trend.last, d = st.trend.delta;
    page.append(h("div", { class: "card mw-last" }, h("div", { class: "small muted" }, "Oxirgi sinov natijasi"),
      h("div", null, h("b", { class: "mw-pct" }, l.pct + "%"), ` — ${l.correct} to‘g‘ri, ${l.wrong} xato, ${l.skipped} o‘tkazilgan (${l.total} ta)`),
      d == null ? null : h("div", { class: "small " + (d > 0 ? "good-t" : d < 0 ? "bad-t" : "muted") }, d > 0 ? `↑ oldingi sinovdan ${d}% yaxshi` : d < 0 ? `↓ oldingi sinovdan ${-d}% past` : "Oldingi sinov bilan bir xil"),
      saved && saved.finishedAt ? btn("Natijalar jadvali", () => go("myresult"), "ghost small") : null));
  }

  if (saved && MW.isResumable(saved)) page.append(h("div", { class: "card mw-resume" }, h("b", null, "Tugallanmagan sinov bor"), h("p", { class: "small muted" }, `${MW.answeredCount(saved)} / ${saved.ids.length} so‘zga javob berilgan.`),
    h("div", { class: "row" }, btn("Davom ettirish", () => go("mytest", { resume: true })), btn("Bekor qilish", async () => { if (await confirmDialog({ title: "Sinovni bekor qilasizmi?", text: "Berilgan javoblar saqlanmaydi.", ok: "Bekor qilish", cancel: "Qolsin" })) { await delMeta(MW.KEYS.test); go("mywords", {}, { replace: true }); } }, "ghost"))));

  page.append(h("div", { class: "mw-actions" },
    btn("📖  O‘rganish", () => go("mylearn"), "big wide"),
    btn("✏️  Mashq qilish", () => go("mypractice", {}), "big wide ghost"),
    btn("✅  Bilimni tekshirish", async () => {
      if (saved && MW.isResumable(saved) && !(await confirmDialog({ title: "Yangi sinov boshlansinmi?", text: "Tugallanmagan sinov o‘chib ketadi.", ok: "Yangi sinov", cancel: "Qolsin" }))) return;
      go("mytest", { fresh: true });
    }, "big wide ghost")));
  if (st.wrongCount) page.append(btn(`Xato so‘zlarni mashq qilish (${st.wrongCount})`, () => go("mypractice", { only: "wrong" }), "wide ghost"));

  const list = h("div", { class: "mw-list", role: "list" });
  for (const id of ids) {
    const e = byId.get(id); if (!e) continue;
    const c = state.cards.get("v:" + id + ":rec");
    const s = c ? cardStatus(c, now, state.settings.masteryStage || 4) : null;
    const row = h("div", { class: "mw-row", role: "listitem" },
      h("div", { class: "mw-w" }, h("span", { class: "en" }, e.en), e.ipa ? h("span", { class: "lg-ipa" }, "/" + e.ipa + "/") : null, h("span", { class: "lg-uz" }, e.uz),
        h("span", { class: "small muted" }, s ? s.label + (s.isWaiting && c.due ? " · " + whenText(c.due, now) : "") : "Darsda hali ko‘rilmagan")),
      ttsAvailable() ? h("button", { type: "button", class: "lg-act", "aria-label": "Eshitish: " + e.en, onClick: () => say(e.en) }, "▶") : null,
      h("button", { type: "button", class: "lg-act mw-del", "aria-label": "Olib tashlash: " + e.en, onClick: async () => {
        const r = await removeMyWords([id]);
        if (!r.ok) { toast("Saqlab bo‘lmadi, so‘z olib tashlanmadi."); return; }
        go("mywords", {}, { replace: true });
      } }, "×"));
    list.append(row);
  }
  page.append(h("h2", { class: "mw-h2" }, `So‘zlar ro‘yxati (${ids.length})`), list,
    btn("Hammasini olib tashlash", async () => {
      if (!(await confirmDialog({ title: "Ro‘yxat tozalansinmi?", text: `${ids.length} ta so‘z «Mening so‘zlarim» dan olib tashlanadi. Lug‘at, sevimlilar va takrorlash kartalari o‘zgarmaydi.`, ok: "Tozalash", cancel: "Bekor qilish", danger: true }))) return;
      const r = await removeMyWords(ids);
      if (!r.ok) { toast("Saqlab bo‘lmadi."); return; }
      go("mywords", {}, { replace: true });
    }, "wide ghost"));
  return page;
}
register("mywords", mainPage, { tab: "lugat" });

/* ===================== O‘rganish (kartochkalar) ===================== */
register("mylearn", () => {
  const { byId } = entries();
  const deck = MW.learnDeck(getMyWords(), content.vocab);
  const root = h("div", { class: "fc-root" });
  if (!deck.length) { root.append(frame(h("div", { class: "fc-wrap" }, h("div", { class: "card" }, "Hali so‘z tanlanmagan."), btn("Lug‘at", () => go("lugat"))), { title: "O‘rganish" })); return root; }
  let i = 0, flipped = false;
  const draw = () => {
    const e = byId.get(deck[i]);
    const body = h("div", { class: "fc-wrap" },
      h("div", { class: "fc-meta" }, h("span", null, `${i + 1} / ${deck.length}`), h("span", null, e.pos || "")),
      h("button", { type: "button", class: "fc-card mw-card", "aria-label": flipped ? "Inglizchasini ko‘rsatish" : "Tarjimasini ko‘rsatish", onClick: () => { flipped = !flipped; draw(); } },
        h("span", { class: "en big-en" }, flipped ? e.uz : e.en),
        !flipped && e.ipa ? h("span", { class: "lg-ipa" }, "/" + e.ipa + "/") : null,
        flipped && e.ex && e.ex.en ? h("span", { class: "mw-ex" }, h("span", { class: "en" }, e.ex.en), h("span", { class: "muted" }, e.ex.uz || "")) : null,
        h("span", { class: "small muted" }, flipped ? "Qaytish uchun bosing" : "Tarjimasini ko‘rish uchun bosing")),
      ttsAvailable() ? h("div", { class: "row" }, btn("▶ Eshitish", () => say(e.en), "small"), btn("🐢 Sekin", () => say(e.en, 0.55), "small ghost")) : null,
      h("div", { class: "row" },
        btn("← Oldingi", () => { i = Math.max(0, i - 1); flipped = false; draw(); }, "ghost"),
        i < deck.length - 1 ? btn("Keyingi →", () => { i++; flipped = false; draw(); }) : btn("Tugatish", () => go("mywords", {}, { replace: true }))));
    root.replaceChildren(frame(body, { title: "O‘rganish", progress: (i + 1) / deck.length }));
  };
  draw();
  return root;
}, { focus: true });

/* ===================== Mashq qilish ===================== */
register("mypractice", (p) => {
  const { byId, sib } = entries();
  let ids = getMyWords();
  if (p && p.only === "wrong") { const w = MW.parseWrong(getMeta(MW.KEYS.wrong, {}), validIds()); ids = ids.filter((id) => w[id]); }
  if (p && Array.isArray(p.ids)) { const set = new Set(ids); ids = p.ids.filter((id) => set.has(id)); }
  const root = h("div", { class: "fc-root" });
  if (!ids.length) { root.append(frame(h("div", { class: "fc-wrap" }, h("div", { class: "card" }, "Mashq uchun so‘z yo‘q."), btn("Orqaga", () => go("mywords", {}, { replace: true }))), { title: "Mashq" })); return root; }
  const items = MW.buildPractice({ ids, vocabMap: content.vocab, vocabAll: [...content.vocab.values()], sib, count: 15, seed: (Date.now() % 1e9) | 1 });
  (async () => {
    let good = 0; const missed = [];
    for (let k = 0; k < items.length; k++) {
      const ex = items[k];
      const res = await askExercise(ex, { mode: "test", phase: "practice", index: k, total: items.length, title: "Mashq", last: k === items.length - 1 });
      recordResult({ ex, correct: res.correct, hint: res.hint, phase: "practice", userAnswer: res.userAnswer, noAudio: res.noAudio, grade: res.grade ?? null, near: !!res.near });
      if (res.correct) good++; else for (const w of ex.wordIds || [ex.wordId]) if (!missed.includes(w)) missed.push(w);
    }
    const body = h("div", { class: "summary" }, h("h2", null, "Mashq tugadi"), h("p", { class: "score" }, `${good} / ${items.length}`),
      missed.length ? h("div", { class: "card" }, h("h3", null, "Qayta ko‘ring"), ...missed.map((id) => { const e = byId.get(id); return e ? h("div", { class: "miss" }, h("span", { class: "en" }, e.en), " — ", e.uz) : null; })) : h("p", null, "Xato yo‘q. Ajoyib!"),
      p && p.fromMain === false ? null : btn("Yana mashq qilish", () => go("mypractice", p || {}, { replace: true })),
      btn("Mening so‘zlarimga qaytish", () => go("mywords", {}, { replace: true }), "ghost wide"));
    screen(frame(body, { title: "Mashq" }));
  })();
  return root;
}, { focus: true });

/* ===================== Bilimni tekshirish (yozma) ===================== */
const saveTest = (s) => setMeta(MW.KEYS.test, s);

/** Tugagan sinovni bir marta qayd etadi: SRS (faqat mavjud kartalar), xato so‘zlar, natijalar tarixi. */
async function finishTest(s) {
  if (s.applied) return s;
  const now = Date.now();
  let wrong = MW.parseWrong(getMeta(MW.KEYS.wrong, {}), validIds());
  const graded = { again: 0, good: 0 };
  for (const id of s.ids) {
    const a = s.answers[id]; const r = a ? ({ c: "correct", w: "wrong", s: "skipped" })[a.r] : "skipped";
    wrong = MW.applyWrong(wrong, id, r, now);
    const out = MW.applyToSrs(id, r, { cards: state.cards, gradeFn: (wid, g, t) => gradeVocab(wid, g, t), now, masteryStage: state.settings.masteryStage || 4 });
    if (out.action === "graded") graded[out.grade]++;
  }
  const done = { ...s, applied: true, finishedAt: s.finishedAt || now, srs: graded };
  await setMeta(MW.KEYS.wrong, wrong);
  await setMeta(MW.KEYS.results, MW.pushResult(getMeta(MW.KEYS.results, []), done, now));
  await saveTest(done);
  return done;
}

register("mytest", (p) => {
  const { byId, sib } = entries();
  let s = null;
  if (p && p.resume) { s = MW.parseTest(getMeta(MW.KEYS.test, null), validIds()); if (s && !MW.isResumable(s)) s = null; }
  else if (p && (p.fresh || Array.isArray(p.ids))) {
    const mine = new Set(getMyWords());
    const ids = (Array.isArray(p.ids) ? p.ids : [...mine]).filter((id) => mine.has(id));
    if (ids.length) s = MW.newTest({ ids, vocabMap: content.vocab, sib, seed: (Date.now() % 1e9) | 1, kind: p.kind || "all" });
  }
  const root = h("div", { class: "fc-root" });
  if (!s) { root.append(frame(h("div", { class: "fc-wrap" }, h("div", { class: "card" }, h("h3", null, "Sinov topilmadi"), h("p", { class: "small muted" }, "So‘z tanlanmagan yoki sinov eskirgan.")), btn("Orqaga", () => go("mywords", {}, { replace: true }))), { title: "Bilimni tekshirish" })); return root; }
  saveTest(s);

  const step = () => {
    const id = MW.currentId(s);
    if (!id) { finishTest(s).then((d) => { s = d; go("myresult", {}, { replace: true }); }); return; }
    const e = byId.get(id), dir = s.dirs[id];
    const input = h("input", { type: "text", class: "inp mw-in", autocomplete: "off", autocapitalize: "none", autocorrect: "off", spellcheck: "false", enterkeyhint: "done", "aria-label": dir === "uz" ? "Inglizcha javob" : "O‘zbekcha javob", placeholder: dir === "uz" ? "Inglizchasini yozing" : "O‘zbekchasini yozing" });
    let busy = false;
    const submit = async (skip) => {
      if (busy) return; busy = true;
      const r = MW.answerTest(s, id, skip ? "" : input.value, content.vocab.get(id), sib);
      if (r) { s = r.session; try { await saveTest(s); } catch { /* xotirada qoladi */ } }
      step();
    };
    input.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); submit(false); } });
    const body = h("div", { class: "fc-wrap" },
      h("div", { class: "fc-meta" }, h("span", null, `${MW.answeredCount(s) + 1} / ${s.ids.length}`), h("span", null, dir === "uz" ? "O‘zbekcha → inglizcha" : "Inglizcha → o‘zbekcha")),
      h("div", { class: "fc-card mw-q" },
        h("span", { class: "en big-en" }, dir === "uz" ? e.uz : e.en),
        e.pos ? h("span", { class: "small muted" }, e.pos) : null,
        dir === "en" && ttsAvailable() ? btn("▶", () => say(e.en), "small ghost") : null),
      input,
      h("div", { class: "row" }, btn("O‘tkazib yuborish", () => submit(true), "ghost"), btn("Tekshirish", () => submit(false))),
      h("p", { class: "small muted" }, "Javoblar sinov oxirida ko‘rsatiladi. Tugatmasdan chiqsangiz, sinov saqlanadi va keyin davom ettirish mumkin."));
    root.replaceChildren(frame(body, { title: "Bilimni tekshirish", progress: MW.answeredCount(s) / s.ids.length, onBack: () => go("mywords", {}, { replace: true }) }));
    setTimeout(() => { try { input.focus(); } catch { /* fokus bo‘lmasa ham ishlaydi */ } }, 30);
  };
  step();
  return root;
}, { focus: true });

/* ===================== Natijalar sahifasi ===================== */
register("myresult", () => {
  const { byId } = entries();
  const s = MW.parseTest(getMeta(MW.KEYS.test, null), validIds());
  if (!s || !s.finishedAt) return h("div", { class: "page" }, h("div", { class: "card" }, "Tugagan sinov topilmadi."), btn("Orqaga", () => go("mywords", {}, { replace: true })));
  const sm = MW.summarize(s), rows = MW.resultRows(s, content.vocab);
  const sec = (key, title, cls) => {
    const part = rows.filter((r) => r.result === key);
    if (!part.length) return null;
    return h("section", { class: "mw-sec " + cls },
      h("h3", null, `${title} (${part.length})`),
      h("div", { class: "mw-tbl", role: "table" },
        h("div", { class: "mw-tr mw-th", role: "row" }, ...["№", "So‘z", "Javobingiz", "To‘g‘ri javob"].map((t) => h("span", { role: "columnheader" }, t))),
        ...part.map((r) => h("div", { class: "mw-tr", role: "row" },
          h("span", { role: "cell" }, String(r.n)),
          h("span", { role: "cell", class: "mw-c1" }, r.dir === "uz" ? r.uz : r.en),
          h("span", { role: "cell" }, key === "skipped" ? "—" : r.answer || "—"),
          h("span", { role: "cell", class: "mw-c3" }, r.expected,
            (() => { const n = r.result === "wrong" ? MW.gradeAnswer(content.vocab.get(r.id), r.dir, r.answer, entries().sib).note : ""; return n ? h("span", { class: "small muted mw-note" }, n) : null; })())))));
  };
  const retest = (which, kind) => async () => {
    const ids = MW.retestIds(s, which);
    if (!ids.length) return;
    go("mytest", { ids, kind });
  };
  const wrongN = sm.wrong, skipN = sm.skipped;
  const srs = s.srs || { again: 0, good: 0 };
  return h("div", { class: "page mw-result" },
    h("div", { class: "lg-top" }, h("h1", null, "Natija"), btn("Mening so‘zlarim", () => go("mywords", {}, { replace: true }), "small")),
    h("div", { class: "card mw-sum lvl-" + sm.level },
      h("div", { class: "score" }, sm.pct + "%"),
      h("p", { class: "mw-msg" }, sm.message),
      h("div", { class: "mw-stats" }, stat(sm.correct, "To‘g‘ri", "ok"), stat(sm.wrong, "Xato", sm.wrong ? "bad" : ""), stat(sm.skipped, "O‘tkazilgan", sm.skipped ? "due" : ""), stat(sm.total, "Jami")),
      h("p", { class: "small muted" }, srs.again || srs.good ? `Takrorlash jadvaliga yozildi: ${srs.good} ta yaxshi, ${srs.again} ta qayta takrorlanadi.` : "Takrorlash jadvali o‘zgarmadi (kartasi bor so‘zlar bo‘yicha o‘zgarish bo‘lmadi).")),
    h("div", { class: "mw-actions" },
      wrongN ? btn(`Xatolarni qayta ishlash (${wrongN})`, retest("wrong", "wrong"), "wide") : null,
      skipN ? btn(`O‘tkazilganlarni ishlash (${skipN})`, retest("skipped", "skipped"), "wide ghost") : null,
      btn("Hammasini qayta tekshirish", retest("all", "all"), "wide ghost"),
      wrongN ? btn("Xatolarni mashq qilish", () => go("mypractice", { ids: MW.retestIds(s, "wrong") }), "wide ghost") : null),
    sec("correct", "To‘g‘ri javoblar", "ok"), sec("wrong", "Xato javoblar", "bad"), sec("skipped", "O‘tkazilgan so‘zlar", "skip"));
}, { tab: "lugat" });
