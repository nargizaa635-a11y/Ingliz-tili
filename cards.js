// cards.js — «So‘z kartochkalari»: rasm → inglizcha yoki rasm → o‘zbekcha. Javob foydalanuvchi ochmaguncha yashirin.
// Baholash alohida algoritm emas: learn.js dagi gradeVocab orqali mavjud SRS (srs.js, «v:<so‘z>:rec» kartalari) ga yoziladi.
// Seans holati meta «fcSession» da saqlanadi (ilova yopilsa ham davom ettiriladi), tanlovlar — «fcPrefs» da.
import { h, toast, frame } from "./ui.js";
import { register, go } from "./nav.js";
import { state, getMeta, setMeta, delMeta } from "./store.js";
import { content, gradeVocab } from "./learn.js";
import { speak, ttsAvailable } from "./speech.js";
import { picInto } from "./imagelib.js";
import { CATEGORIES, CAT_SHORT, LEVELS_V } from "./vocabdata.js";
import { buildEntries, parseFavs, toggleFavorite } from "./lugatlogic.js";
import { MODES, SOURCES, GRADE_LABELS, COUNTS, DEFAULT_COUNT, promptFor, buildDeck, newSession, resumable, gradeInSession, clampIdx, sessionStats } from "./cardslogic.js";

let cache = null;
function entries() {
  if (!cache || cache.size !== content.vocab.size) { const list = buildEntries(content.vocab); cache = { size: content.vocab.size, list, byId: new Map(list.map((e) => [e.id, e])) }; }
  return cache;
}
const hasVisual = (e) => !!(e.img || e.icon);
const say = (text, rate) => speak(String(text).replace(/\n/g, " "), { rate: rate || state.settings.ttsRate });
const row = (...kids) => h("div", { class: "row" }, ...kids);
const btn = (label, onClick, cls = "") => h("button", { class: "btn " + cls, type: "button", onClick }, label);

function visualBox(e) {
  const box = h("div", { class: "pic", role: "img", "aria-label": "Rasm" });
  const fallback = (b) => {
    b.classList.add("fallback");
    b.replaceChildren(e.icon ? h("span", { class: "fc-emoji", "aria-hidden": "true" }, e.icon) : h("span", { class: "small muted" }, "Rasm yuklanmadi"));
  };
  if (e.img) picInto(box, e.slug, fallback); else fallback(box);
  return box;
}

const prefs = () => ({ mode: "en", source: "mix", level: "", cat: "", count: DEFAULT_COUNT, ...(getMeta("fcPrefs", null) || {}) });
const validIds = () => new Set(entries().list.map((e) => e.id));

function deckFor(o, extra = {}) {
  return buildDeck(entries().list, { cards: state.cards, favs: parseFavs(getMeta("lugatFav", [])), hasVisual, now: Date.now(), seed: Math.floor(Date.now() / 60000), source: o.source, level: o.level, cat: o.cat, count: o.count, ...extra });
}

/* =========================== SOZLASH EKRANI =========================== */
register("cards", () => {
  const o = prefs();
  const saved = getMeta("fcSession", null);
  const canResume = resumable(saved, validIds());
  const info = h("div", { class: "fc-count", role: "status", "aria-live": "polite" });
  const start = btn("Boshlash", () => {
    const d = deckFor(o);
    if (!d.ids.length) return;
    setMeta("fcPrefs", o);
    go("cardsrun", { ids: d.ids, mode: o.mode, source: o.source, level: o.level, cat: o.cat });
  }, "wide big");
  const chips = h("div"), levelSel = h("select", { "aria-label": "Daraja" }), catSel = h("select", { "aria-label": "Mavzu" });
  const sync = () => {
    const d = deckFor(o, { count: o.count });
    const all = deckFor(o, { count: 100000 });
    const msg = !all.available
      ? (o.source === "fav" ? "Sevimli so‘z yo‘q. Lug‘atda so‘z yonidagi ☆ ni bosing." : o.source === "due" ? "Hozir takrorlash kerak bo‘lgan kartochka yo‘q." : o.source === "hard" ? "Qiyin so‘z yo‘q: hali xato qilingan so‘z topilmadi." : o.source === "new" ? "Yangi so‘z qolmadi." : "Bu tanlovda rasmli so‘z topilmadi.")
      : `Seansda ${d.ids.length} ta kartochka (tanlovda jami ${all.available} ta rasmli so‘z).`;
    info.replaceChildren(msg, all.skipped ? h("div", { class: "small muted" }, `${all.skipped} ta so‘zning rasmi yo‘q, ular kartochkaga kiritilmaydi.`) : null);
    start.disabled = !d.ids.length;
    chips.replaceChildren(
      h("h3", null, "Rejim"), h("div", { class: "chips", role: "group", "aria-label": "Rejim" }, Object.entries(MODES).map(([k, label]) => h("button", { class: "chip" + (o.mode === k ? " on" : ""), type: "button", "aria-pressed": o.mode === k, onClick: () => { o.mode = k; sync(); } }, label))),
      h("h3", null, "Qaysi so‘zlar"), h("div", { class: "chips", role: "group", "aria-label": "So‘zlar manbai" }, Object.entries(SOURCES).map(([k, label]) => h("button", { class: "chip" + (o.source === k ? " on" : ""), type: "button", "aria-pressed": o.source === k, onClick: () => { o.source = k; sync(); } }, label))),
      h("h3", null, "Nechta kartochka"), h("div", { class: "chips", role: "group", "aria-label": "Soni" }, COUNTS.map((n) => h("button", { class: "chip" + (o.count === n ? " on" : ""), type: "button", "aria-pressed": o.count === n, onClick: () => { o.count = n; sync(); } }, String(n)))));
  };
  levelSel.append(h("option", { value: "" }, "Hamma daraja"), ...LEVELS_V.map((l) => h("option", { value: l, selected: o.level === l }, l)));
  catSel.append(h("option", { value: "" }, "Hamma mavzu"), ...Object.keys(CATEGORIES).map((k) => h("option", { value: k, selected: o.cat === k }, CAT_SHORT[k] || k)));
  levelSel.addEventListener("change", () => { o.level = levelSel.value; sync(); });
  catSel.addEventListener("change", () => { o.cat = catSel.value; sync(); });
  sync();
  return h("div", { class: "page fc-setup" },
    h("h1", null, "So‘z kartochkalari"),
    h("p", { class: "muted small" }, "Rasmga qarab so‘zni eslang, keyin javobni oching va o‘zingizni baholang. Baholash takrorlash jadvaliga yoziladi."),
    canResume ? h("div", { class: "card" }, h("h3", null, "Boshlangan seans bor"), h("p", { class: "small muted" }, `${saved.idx + 1}/${saved.ids.length} · ${MODES[saved.mode]}`),
      row(btn("Davom etish", () => go("cardsrun", { resume: true })), btn("Bekor qilish", async () => { await delMeta("fcSession"); go("cards", {}, { replace: true }); }, "ghost"))) : null,
    h("div", { class: "card" }, chips, h("div", { class: "lg-sel" }, levelSel, catSel), info, start),
    h("p", { class: "small muted" }, "Eslatma: kartochkaga faqat rasmli so‘zlar kiradi. Mavhum so‘zlar (masalan, because) Lug‘at va takrorlashda o‘rganiladi."));
}, { tab: "lugat" });

/* =========================== SEANS =========================== */
register("cardsrun", (p) => {
  const { byId } = entries();
  let s = null;
  if (p.resume) { const saved = getMeta("fcSession", null); if (resumable(saved, validIds())) s = saved; }
  else if (Array.isArray(p.ids)) {
    const ids = p.ids.filter((id) => byId.has(id) && hasVisual(byId.get(id)));
    if (ids.length) s = newSession({ ids, mode: p.mode, source: p.source, level: p.level, cat: p.cat });
  }
  const root = h("div", { class: "fc-root" });
  if (!s) {
    root.append(frame(h("div", { class: "fc-wrap" }, h("div", { class: "card" }, h("h3", null, "Kartochka topilmadi"), h("p", { class: "small muted" }, "Bu so‘zlar uchun rasm yo‘q yoki seans eskirgan."), btn("Orqaga", () => history.back()))), { title: "So‘z kartochkalari" }));
    return root;
  }
  let revealed = false, favs = parseFavs(getMeta("lugatFav", []));
  const save = () => setMeta("fcSession", s);
  save();

  const finish = () => {
    const st = sessionStats(s);
    delMeta("fcSession");
    const res = (label, n) => h("div", null, h("b", null, n), h("span", null, label));
    root.replaceChildren(frame(h("div", { class: "fc-wrap" }, h("div", { class: "card fc-done" },
      h("h2", null, "Seans tugadi"),
      st.graded ? h("div", { class: "score" }, `${st.recalledPct}%`) : null,
      h("p", { class: "muted" }, st.graded ? "so‘z «esladim» yoki «oson» deb baholandi" : "Birorta so‘z baholanmadi."),
      h("div", { class: "fc-res" }, res("Eslanmadi", st.again), res("Qiyin", st.hard), res("Esladim", st.good), res("Oson", st.easy)),
      st.skipped ? h("p", { class: "small muted" }, `${st.skipped} ta kartochka o‘tkazib yuborildi (baholanmadi, takrorlash jadvaliga tegilmadi).`) : null,
      st.hardIds.length ? btn(`Qiyin so‘zlarni takrorlash (${st.hardIds.length})`, () => { s = newSession({ ids: st.hardIds, mode: s.mode, source: "hard", level: s.level, cat: s.cat }); revealed = false; save(); paint(); }, "wide") : null,
      btn("Yangi seans", () => history.back(), "ghost wide"),
      btn("Tugatish", () => go("lugat", {}, { replace: true }), "ghost wide"))), { title: "So‘z kartochkalari" }));
  };

  const goTo = (i) => { s.idx = clampIdx(s, i); revealed = false; save(); paint(); };
  const next = () => { if (s.idx >= s.ids.length - 1) { finish(); return; } goTo(s.idx + 1); };

  function paint() {
    const id = s.ids[s.idx];
    const e = byId.get(id);
    const graded = s.results[id];
    const open = revealed || !!graded;
    const n = s.ids.length;
    const done = Object.keys(s.results).length;
    const star = h("button", { type: "button", class: "lg-act lg-fav" + (favs.has(id) ? " on" : ""), "aria-pressed": favs.has(id), "aria-label": favs.has(id) ? "Sevimlilardan olib tashlash" : "Sevimlilarga qo‘shish", onClick: async () => {
      star.disabled = true;
      const r = await toggleFavorite(favs, id, (arr) => setMeta("lugatFav", arr), { memoryMode: state.storageMode === "memory" });
      favs = r.favs; if (!r.ok) toast("Sevimlini saqlab bo‘lmadi.");
      star.disabled = false; star.classList.toggle("on", favs.has(id)); star.setAttribute("aria-pressed", favs.has(id)); star.textContent = favs.has(id) ? "★" : "☆";
    } }, favs.has(id) ? "★" : "☆");

    const answer = open ? h("div", { class: "fc-ans", "aria-live": "polite" },
      h("div", { class: "fc-en" }, e.en),
      e.ipa ? h("div", { class: "fc-ipa" }, "/" + e.ipa + "/") : null,
      h("div", { class: "fc-uz" }, e.uz),
      ttsAvailable() ? row(btn("▶ Eshitish", () => say(e.en), "ghost small"), btn("🐢 Sekin", () => say(e.en, 0.55), "ghost small")) : null,
      e.ex && e.ex.en ? h("div", { class: "fc-ex" }, h("div", { class: "en" }, e.ex.en), h("div", { class: "muted" }, e.ex.uz || "")) : null) : null;

    let actions;
    if (!open) actions = btn("Javobni ko‘rsatish", () => { revealed = true; paint(); }, "wide big");
    else if (!graded) actions = h("div", { class: "fc-rate", role: "group", "aria-label": "Baholash" },
      Object.entries(GRADE_LABELS).map(([g, label]) => h("button", { type: "button", class: "btn " + g, onClick: () => {
        if (!gradeInSession(s, id, g)) return;
        gradeVocab(id, g);
        save(); next();
      } }, label)));
    else actions = h("p", { class: "small muted", style: "text-align:center" }, `Baholandi: ${GRADE_LABELS[graded]}`);

    root.replaceChildren(frame(h("div", { class: "fc-wrap" },
      h("div", { class: "fc-meta" }, h("span", null, `${e.level} · ${CAT_SHORT[e.cat] || ""}`), star),
      h("div", { class: "fc-card" }, visualBox(e), h("p", { class: "fc-prompt" }, promptFor(s.mode)), answer),
      actions,
      h("div", { class: "fc-nav" },
        btn("← Oldingi", () => goTo(s.idx - 1), "ghost"),
        btn(s.idx >= n - 1 ? "Yakunlash" : "Keyingi →", next, "ghost"))),
      { title: "So‘z kartochkalari", label: `${s.idx + 1}/${n}`, progress: done / n }));
    const prev = root.querySelector(".fc-nav .btn");
    if (prev) prev.disabled = s.idx === 0;
  }
  paint();
  return root;
}, { focus: true, tab: "lugat" });
