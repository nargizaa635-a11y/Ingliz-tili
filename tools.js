// tools.js — yordamchi bo‘limlar: xotira saroyi, fikrlar xaritasi, kitobxonlik va fikrlash, zaif tomonlar,
// aralash test, «kecha o‘rganganlarim», Feynman yozuvlari, faol eslash. Hammasi kurs ma’lumotlari bilan bog‘langan.
import { h, toast, confirmDialog, en, fmtDate, pct } from "./ui.js";
import { register, go, render } from "./nav.js";
import { state } from "./store.js";
import { content, lessonOrder, buildReviewItem, CATEGORIES } from "./learn.js";
import * as M from "./memory.js";
import { weakTopics, unclearNotes, weeklyStats, resolveMixed, resolveRecall, yesterdayInfo, resolveYesterday, resolveConceptDrill, courseGroups, conceptLabel } from "./coach.js";
import { CURRICULUM } from "./curriculum.js";
import { runItems, feynmanForm } from "./player.js";

const page = (...kids) => h("div", { class: "page" }, ...kids);
const row = (...kids) => h("div", { class: "row" }, ...kids);
const btn = (label, onClick, cls = "") => h("button", { class: "btn " + cls, type: "button", onClick }, label);
const lessonTitle = (id) => (content.lessons.get(id) || {}).title || id;
const back = () => history.back();

/* ---------- Umumiy forma oynasi (xato bo‘lsa qiymatlar saqlanib qayta ochiladi) ---------- */
function formDialog({ title, fields, ok = "Saqlash", intro }) {
  return new Promise((resolve) => {
    const els = {};
    const close = (v) => { wrap.remove(); resolve(v); };
    const body = fields.map((f) => {
      let el;
      if (f.type === "textarea") el = h("textarea", { class: "inp", rows: f.rows || 3, maxlength: f.max, placeholder: f.placeholder || "", "aria-label": f.label }, f.value || "");
      else if (f.type === "select") el = h("select", { "aria-label": f.label }, f.options.map(([v, t]) => h("option", { value: v, selected: v === f.value }, t)));
      else el = h("input", { type: "text", class: "inp", maxlength: f.max, placeholder: f.placeholder || "", value: f.value || "", "aria-label": f.label });
      els[f.key] = el;
      return h("label", { class: "field" }, f.label, el);
    });
    const wrap = h("div", { class: "overlay" }, h("div", { class: "dialog scroll-dialog", role: "dialog", "aria-modal": "true" }, h("h3", null, title), intro ? h("p", { class: "small muted" }, intro) : null, ...body,
      h("div", { class: "row" }, btn("Bekor qilish", () => close(null), "ghost"), btn(ok, () => close(Object.fromEntries(Object.entries(els).map(([k, e]) => [k, e.value])))))));
    document.body.append(wrap);
    const first = wrap.querySelector("input,textarea"); if (first) first.focus();
  });
}
async function formFlow(cfg, action) {
  let values = null;
  for (;;) {
    values = await formDialog({ ...cfg, fields: cfg.fields.map((f) => ({ ...f, value: values ? values[f.key] : f.value })) });
    if (!values) return null;
    const r = await action(values);
    if (r && r.ok === false) { toast(r.error); continue; }
    return r || true;
  }
}
const confirmDelete = (title, text) => confirmDialog({ title, text, ok: "O‘chirish", danger: true });

/* =========================== XOTIRA SAROYI =========================== */
const spotFields = (s = {}) => [
  { key: "label", label: "Joy nuqtasi (masalan: Eshik)", max: 60, value: s.label },
  { key: "en", label: "Inglizcha so‘z", max: 80, value: s.en },
  { key: "uz", label: "O‘zbekcha tarjima", max: 120, value: s.uz },
  { key: "example", label: "Qisqa misol (inglizcha)", max: 200, value: s.example },
  { key: "assoc", label: "Tasviriy assotsiatsiya", type: "textarea", max: 300, value: s.assoc, placeholder: "Shu nuqtada so‘zni qanday tasavvur qilasiz?" },
];

register("palace", (p) => {
  if (p.id && state.palaces.has(p.id)) return palaceDetail(state.palaces.get(p.id));
  const name = h("input", { type: "text", class: "inp", maxlength: 60, placeholder: "Joy nomi (masalan: Mening xonam)", "aria-label": "Joy nomi" });
  const list = M.listPalaces();
  return page(h("h1", null, "Xotira saroyi"),
    h("div", { class: "card" }, h("p", null, "Tanish joyni (uy, xona) tanlang. Uning nuqtalariga (eshik, divan, deraza…) bittadan inglizcha so‘z va u bilan bog‘liq tasvirni joylang. Keyin xayolan shu nuqtalar bo‘ylab yurib, so‘zlarni eslang."),
      h("p", { class: "small muted" }, "Saroy nuqtalari takrorlash jadvaliga qo‘shiladi va faol eslash orqali tekshiriladi.")),
    !list.length ? h("div", { class: "card" }, "Hali joy yo‘q. Quyida birinchisini yarating.") : null,
    ...list.map((pl) => h("div", { class: "card" }, h("div", { class: "row between" }, h("strong", null, pl.name), h("span", { class: "small muted" }, `${pl.spots.length} ta nuqta`)),
      row(btn("Ochish", () => go("palace", { id: pl.id }), "small"), pl.spots.length ? btn("Xayolan yurish", () => go("palacerun", { id: pl.id }), "ghost small") : null))),
    h("div", { class: "card" }, h("h3", null, "Yangi joy"), name, btn("Yaratish", async () => { const r = await M.createPalace(name.value); if (!r.ok) { toast(r.error); return; } go("palace", { id: r.rec.id }); }, "wide")));
}, { tab: "more" });

function palaceDetail(pl) {
  const refresh = () => render();
  const spotCard = (s, i) => h("div", { class: "card" },
    h("div", { class: "row between" }, h("strong", null, `${i + 1}. ${s.label}`), h("span", { class: "small muted" }, s.uz || "")),
    h("div", null, en(s.en, { cls: "big-en" })),
    s.example ? h("div", { class: "small" }, en(s.example)) : null,
    s.assoc ? h("div", { class: "small muted" }, "Assotsiatsiya: " + s.assoc) : null,
    s.vocabId && content.vocab.has(s.vocabId) ? h("div", { class: "small muted" }, "Darsdagi so‘z: " + lessonTitle(content.vocab.get(s.vocabId).lessonId)) : null,
    row(
      btn("Tahrirlash", async () => { if (await formFlow({ title: "Nuqtani tahrirlash", fields: spotFields(s) }, (v) => M.updateSpot(pl.id, s.id, v))) refresh(); }, "ghost small"),
      btn("↑", async () => { await M.moveSpot(pl.id, s.id, -1); refresh(); }, "ghost small"), btn("↓", async () => { await M.moveSpot(pl.id, s.id, 1); refresh(); }, "ghost small"),
      btn("O‘chirish", async () => { if (await confirmDelete("Nuqtani o‘chirasizmi?", `«${s.label}» va uning takrorlash kartasi o‘chadi.`)) { await M.deleteSpot(pl.id, s.id); refresh(); } }, "ghost small")));
  return page(h("button", { class: "linkbtn", type: "button", onClick: () => go("palace", {}, { replace: true }) }, "← Barcha joylar"), h("h1", null, pl.name),
    pl.spots.length ? row(btn("Xayolan yurish mashqi", () => go("palacerun", { id: pl.id }), "big")) : h("div", { class: "card" }, "Hali nuqta yo‘q. Birinchi nuqtani qo‘shing."),
    ...pl.spots.map(spotCard),
    btn("+ Nuqta qo‘shish", async () => { if (await formFlow({ title: "Yangi nuqta", fields: spotFields() }, (v) => M.addSpot(pl.id, v))) refresh(); }, "wide"),
    row(btn("Joy nomini o‘zgartirish", async () => { if (await formFlow({ title: "Joy nomi", fields: [{ key: "name", label: "Nom", max: 60, value: pl.name }] }, (v) => M.renamePalace(pl.id, v.name))) refresh(); }, "ghost small"),
      btn("Joyni o‘chirish", async () => { if (await confirmDelete("Joyni o‘chirasizmi?", `«${pl.name}» va uning ${pl.spots.length} ta nuqtasi o‘chadi.`)) { await M.deletePalace(pl.id); go("palace", {}, { replace: true }); } }, "ghost small")));
}

register("palacerun", (p) => {
  const pl = state.palaces.get(p.id);
  const items = pl ? pl.spots.map((s) => buildReviewItem(state.cards.get(M.spotCardId(pl.id, s.id)))).filter(Boolean).map((it) => ({ ...it, phase: "recall" })) : [];
  runItems(items, { title: pl ? `Saroy: ${pl.name}` : "Xotira saroyi", cta: "Tugatish" }).then(back);
}, { focus: true, tab: "more" });

/* =========================== FIKRLAR XARITASI =========================== */
register("mindmap", (p) => {
  if (p.id && state.mindmaps.has(p.id)) return mapDetail(state.mindmaps.get(p.id));
  const name = h("input", { type: "text", class: "inp", maxlength: 60, placeholder: "Markaziy mavzu (masalan: Present Simple)", "aria-label": "Markaziy mavzu" });
  const maps = M.listMaps();
  return page(h("h1", null, "Fikrlar xaritasi"),
    h("div", { class: "card" }, h("p", null, "Markaziy mavzu va unga bog‘langan kichik mavzularni yarating: grammatika qoidalari, so‘z guruhlari, kitobdan olingan fikrlar. Tugunni A1–B2 darsiga bog‘lash mumkin.")),
    !maps.length ? h("div", { class: "card" }, "Hali xarita yo‘q.") : null,
    ...maps.map((m) => h("div", { class: "card" }, h("div", { class: "row between" }, h("strong", null, m.name), h("span", { class: "small muted" }, `${m.nodes.length} tugun`)), btn("Ochish", () => go("mindmap", { id: m.id }), "small"))),
    h("div", { class: "card" }, h("h3", null, "Yangi xarita"), name, btn("Yaratish", async () => { const r = await M.createMap(name.value); if (!r.ok) { toast(r.error); return; } go("mindmap", { id: r.rec.id }); }, "wide")),
    h("div", { class: "card" }, h("h3", null, "Kursdan avtomatik xarita"), h("p", { class: "small muted" }, "Boshlagan darslaringizdan YANGI xarita tuziladi. Mavjud xaritalaringiz o‘zgarmaydi."),
      btn("Kurs xaritasini tuzish", async () => {
        const groups = courseGroups();
        if (!groups.length) { toast("Avval kamida bitta darsni boshlang"); return; }
        if (!(await confirmDialog({ title: "Yangi xarita tuzilsinmi?", text: `${groups.reduce((s, g) => s + g.lessons.length, 0)} ta darsdan yangi xarita yaratiladi. Mavjud xaritalar o‘zgarmaydi.`, ok: "Tuzish" }))) return;
        let nm = "Kurs xaritasi", k = 1; while (M.listMaps().some((m) => m.name.toLowerCase() === nm.toLowerCase())) nm = `Kurs xaritasi ${++k}`;
        const unitName = (id) => { for (const lv of CURRICULUM) { const u = lv.units.find((x) => x.id === id); if (u) return `${lv.level}: ${u.title}`; } return id; };
        const r = await M.createMapFromCourse(nm, groups.map((g) => ({ ...g, unit: unitName(g.unit) })));
        if (!r.ok) { toast(r.error); return; } go("mindmap", { id: r.rec.id });
      }, "ghost wide")));
}, { tab: "more" });

const nodeFields = (n = {}) => [
  { key: "text", label: "Tugun matni", max: 120, value: n.text },
  { key: "lessonId", label: "Darsga bog‘lash (ixtiyoriy)", type: "select", value: n.lessonId || "", options: [["", "— bog‘lamaslik —"], ...lessonOrder().filter((o) => o.implemented).map((o) => [o.id, o.title])] },
  { key: "note", label: "Izoh (ixtiyoriy)", type: "textarea", max: 300, value: n.note },
];

function mapDetail(m) {
  const refresh = () => render();
  const tree = (node, depth) => {
    const kids = M.childrenOf(m, node.id);
    return h("div", { class: "tree-node" + (depth ? " child" : ""), }, h("div", { class: "tree-row" },
      h("strong", null, node.text), node.note ? h("span", { class: "small muted" }, " · " + node.note) : null,
      node.lessonId && content.lessons.has(node.lessonId) ? h("button", { class: "linkbtn", type: "button", onClick: () => go("lesson", { lessonId: node.lessonId }) }, "Darsga: " + lessonTitle(node.lessonId)) : null,
      row(
        btn("+", async () => { if (await formFlow({ title: `«${node.text}» ichiga tugun`, fields: nodeFields() }, (v) => M.addNode(m.id, node.id, v.text, { lessonId: v.lessonId, note: v.note }))) refresh(); }, "ghost small"),
        btn("Tahrir", async () => { if (await formFlow({ title: "Tugunni tahrirlash", fields: nodeFields(node) }, (v) => M.editNode(m.id, node.id, { text: v.text, lessonId: v.lessonId, note: v.note }))) refresh(); }, "ghost small"),
        node.id !== "root" ? btn("O‘chirish", async () => { const n = M.descendants(m, node.id).size; if (await confirmDelete("Tugunni o‘chirasizmi?", n > 1 ? `Bu tugun va uning ${n - 1} ta ichki tuguni o‘chadi.` : "Bu tugun o‘chadi.")) { await M.deleteNode(m.id, node.id); refresh(); } }, "ghost small") : null)),
    kids.length ? h("div", { class: "tree-kids" }, kids.map((k) => tree(k, depth + 1))) : null);
  };
  return page(h("button", { class: "linkbtn", type: "button", onClick: () => go("mindmap", {}, { replace: true }) }, "← Barcha xaritalar"), h("h1", null, m.name),
    h("p", { class: "small muted" }, `${m.nodes.length} tugun · ${fmtDate(m.updatedAt)} da yangilandi`), tree(m.nodes.find((n) => n.id === "root"), 0),
    btn("Xaritani o‘chirish", async () => { if (await confirmDelete("Xaritani o‘chirasizmi?", `«${m.name}» va uning ${m.nodes.length} ta tuguni o‘chadi.`)) { await M.deleteMap(m.id); go("mindmap", {}, { replace: true }); } }, "ghost small"));
}

/* =========================== KITOBXONLIK VA FIKRLASH =========================== */
const noteFieldsFor = (kind, n = {}) => [
  { key: "text", label: kind === "question" ? "Savol" : kind === "summary" ? "Bob xulosasi (o‘z so‘zlaringiz bilan)" : "Fikr yoki iqtibos (qisqa, o‘z so‘zlaringiz bilan)", type: "textarea", max: 600, value: n.text },
  ...(kind === "question" ? [{ key: "answer", label: "Javob", type: "textarea", max: 600, value: n.answer }] : []),
  ...(kind === "idea" ? M.CRITICAL_QUESTIONS.map((q) => ({ key: q.key, label: q.q + " (ixtiyoriy)", type: "textarea", rows: 2, max: 300, value: n[q.key] })) : []),
];

register("reading", (p) => {
  if (p.id && state.readings.has(p.id)) return bookDetail(state.readings.get(p.id));
  const title = h("input", { type: "text", class: "inp", maxlength: 100, placeholder: "Kitob nomi", "aria-label": "Kitob nomi" });
  const author = h("input", { type: "text", class: "inp", maxlength: 80, placeholder: "Muallif (ixtiyoriy)", "aria-label": "Muallif" });
  const books = M.listBooks();
  return page(h("h1", null, "Kitobxonlik va fikrlash"),
    h("div", { class: "card" }, h("p", null, "O‘qigan kitoblaringizdan fikr, xulosa va savollarni O‘Z SO‘ZLARINGIZ bilan yozing, so‘ng eslash orqali tekshiring. Tanqidiy savollar fikringizni chuqurlashtiradi."),
      h("p", { class: "small muted" }, "Bu yordamchi bo‘lim: ingliz tili darslariga xalaqit bermaydi. Kitobning uzun matnini ko‘chirmang, qisqa o‘z xulosangizni yozing.")),
    !books.length ? h("div", { class: "card" }, "Hali kitob yo‘q.") : null,
    ...books.map((b) => h("div", { class: "card" }, h("div", { class: "row between" }, h("strong", null, b.title), h("span", { class: "small muted" }, `${b.notes.length} ta yozuv`)), b.author ? h("div", { class: "small muted" }, b.author) : null, btn("Ochish", () => go("reading", { id: b.id }), "small"))),
    h("div", { class: "card" }, h("h3", null, "Kitob qo‘shish"), title, author, btn("Qo‘shish", async () => { const r = await M.addBook(title.value, author.value); if (!r.ok) { toast(r.error); return; } go("reading", { id: r.rec.id }); }, "wide")));
}, { tab: "more" });

function bookDetail(b) {
  const refresh = () => render();
  const noteCard = (n) => h("div", { class: "card" }, h("div", { class: "small muted" }, `${M.NOTE_KINDS[n.kind]} · ${fmtDate(n.updatedAt)}`), h("p", null, n.text),
    n.kind === "question" ? h("p", { class: "small" }, h("strong", null, "Javob: "), n.answer) : null,
    n.kind === "idea" ? M.CRITICAL_QUESTIONS.filter((q) => n[q.key]).map((q) => h("p", { class: "small" }, h("strong", null, q.q + " "), n[q.key])) : null,
    row(btn("Tahrirlash", async () => { if (await formFlow({ title: "Yozuvni tahrirlash", fields: noteFieldsFor(n.kind, n) }, (v) => M.updateNote(b.id, n.id, v))) refresh(); }, "ghost small"),
      M.listMaps().length ? btn("Xaritaga ulash", async () => {
        const maps = M.listMaps();
        const v = await formDialog({ title: "Fikrlar xaritasiga ulash", fields: [{ key: "map", label: "Xarita", type: "select", value: maps[0].id, options: maps.map((m) => [m.id, m.name]) }], ok: "Ulash" });
        if (!v) return;
        const r = await M.addNode(v.map, "root", n.text.slice(0, 100), { note: `Kitob: ${b.title}` });
        toast(r.ok ? "Xaritaga qo‘shildi" : r.error);
      }, "ghost small") : null,
      btn("O‘chirish", async () => { if (await confirmDelete("Yozuvni o‘chirasizmi?", n.kind === "question" ? "Savolning takrorlash kartasi ham o‘chadi." : "Bu yozuv o‘chadi.")) { await M.deleteNote(b.id, n.id); refresh(); } }, "ghost small")));
  const add = (kind, label) => btn(label, async () => { if (await formFlow({ title: M.NOTE_KINDS[kind], fields: noteFieldsFor(kind) }, (v) => M.addNote(b.id, { ...v, kind }))) refresh(); }, "ghost small");
  const qCount = b.notes.filter((n) => n.kind === "question").length;
  return page(h("button", { class: "linkbtn", type: "button", onClick: () => go("reading", {}, { replace: true }) }, "← Barcha kitoblar"), h("h1", null, b.title), b.author ? h("p", { class: "muted" }, b.author) : null,
    row(add("idea", "+ Fikr / iqtibos"), add("summary", "+ Bob xulosasi"), add("question", "+ Savol")),
    qCount ? btn(`Savollarni eslash (${qCount} ta)`, () => go("bookrun", { id: b.id }), "wide") : null,
    !b.notes.length ? h("div", { class: "card" }, "Hali yozuv yo‘q.") : null, ...b.notes.map(noteCard),
    btn("Kitobni o‘chirish", async () => { if (await confirmDelete("Kitobni o‘chirasizmi?", `«${b.title}» va uning ${b.notes.length} ta yozuvi o‘chadi.`)) { await M.deleteBook(b.id); go("reading", {}, { replace: true }); } }, "ghost small"));
}

register("bookrun", (p) => {
  const b = state.readings.get(p.id);
  const items = b ? b.notes.filter((n) => n.kind === "question").map((n) => state.cards.get(M.noteCardId(b.id, n.id))).filter(Boolean).map((c) => buildReviewItem(c)).filter(Boolean).map((it) => ({ ...it, phase: "recall" })) : [];
  runItems(items, { title: b ? `Eslash: ${b.title}` : "Eslash", cta: "Tugatish" }).then(back);
}, { focus: true, tab: "more" });

/* =========================== ZAIF TOMONLAR VA HAFTALIK NATIJALAR =========================== */
register("weak", () => {
  const topics = weakTopics();
  const w = weeklyStats();
  const unclear = unclearNotes();
  const max = Math.max(1, ...w.days.map((d) => d.attempts));
  const cats = {};
  for (const t of topics) cats[t.category] = (cats[t.category] || 0) + t.openCount;
  return page(h("h1", null, "Mening zaif tomonlarim"),
    h("p", { class: "muted" }, "Xato — o‘rganish jarayonining tabiiy qismi. Bu yerda qaysi mavzularni yana mashq qilish foydali ekani ko‘rsatiladi."),
    !topics.length ? h("div", { class: "card" }, "Hozir ochiq zaif mavzu yo‘q. Mashq qilganingizda xatolar shu yerda paydo bo‘ladi va to‘g‘ri javoblar bilan tuzaladi.") : null,
    Object.keys(cats).length ? h("div", { class: "card" }, h("h3", null, "Kategoriyalar bo‘yicha ochiq xatolar"), h("div", { class: "kv" }, Object.entries(cats).map(([k, v]) => h("div", null, h("span", null, CATEGORIES[k] || k), h("b", null, v))))) : null,
    ...topics.slice(0, 8).map((t) => h("div", { class: "card" },
      h("div", { class: "row between" }, h("strong", null, t.label), h("span", { class: "small muted" }, t.categoryName)),
      h("p", { class: "small" }, `${t.openCount} ta ochiq savol${t.repeated ? ` · ${t.repeated} tasi takror` : ""}${t.fixedCount ? ` · to‘g‘ri tuzatilgan: ${t.fixedCount} marta` : ""}`),
      row(btn("Mashq qilish", () => go("conceptrun", { concept: t.concept }), "small"), t.lessonId && content.lessons.has(t.lessonId) ? btn("Darsga qaytish", () => go("lesson", { lessonId: t.lessonId }), "ghost small") : null))),
    unclear.length ? h("div", { class: "card" }, h("h3", null, "Tushunmagan joylarim (Feynman)"), ...unclear.slice(0, 5).map((u) => h("div", { class: "miss" }, h("div", null, u.text), u.lessonId && content.lessons.has(u.lessonId) ? h("button", { class: "linkbtn", type: "button", onClick: () => go("lesson", { lessonId: u.lessonId }) }, "Darsga: " + lessonTitle(u.lessonId)) : null))) : null,
    h("div", { class: "card" }, h("h3", null, "Haftalik natijalar"),
      h("div", { class: "bars", role: "img", "aria-label": "Oxirgi 7 kunlik urinishlar" }, w.days.map((d) => h("i", { title: `${fmtDate(d.date)}: ${d.attempts}`, style: `height:${Math.max(3, Math.round((d.attempts / max) * 60))}px` }))),
      h("div", { class: "kv" }, [["Mashq qilingan kunlar", `${w.daysStudied} / 7`], ["Urinishlar", w.attempts], ["Yordamsiz to‘g‘ri", pct(w.accuracy)], ["Yangi so‘zlar", w.newWords], ["Tugallangan darslar", w.lessonsCompleted], ["Faol eslash", w.recalls],
        ["Tuzatilgan xatolar", w.errorsFixed], ["Taxminiy faol vaqt", `${w.activeMinutes} daq`], ["Pomodoro", `${w.pomodoroCount} ta, ${w.pomodoroMinutes} daq`]].map(([k, v]) => h("div", null, h("span", null, k), h("b", null, v)))),
      h("p", { class: "small muted" }, "Taraqqiyot faqat ketma-ket kunlar bilan emas, o‘zlashtirilgan so‘zlar va tuzatilgan xatolar bilan ham o‘lchanadi. Kun o‘tkazib yuborsangiz, hech narsa yo‘qolmaydi.")));
}, { tab: "more" });

register("conceptrun", (p) => {
  runItems(resolveConceptDrill(p.concept, 6), { title: conceptLabel(p.concept), cta: "Tugatish" }).then(back);
}, { focus: true, tab: "more" });

/* =========================== ARALASH TEST (INTERLEAVING) =========================== */
register("mixed", () => {
  const r = resolveMixed(10);
  const lv = { harder: "qiyinroq (yozma mashqlar ko‘proq)", easier: "yengilroq (tanish turdagi mashqlar ko‘proq)", balanced: "muvozanatli" }[r.level];
  return page(h("h1", null, "Aralash test"),
    h("div", { class: "card" }, h("p", null, "Turli mavzu va ko‘nikmalar aralashtirib beriladi: bu bilimni haqiqiy vaziyatda qo‘llashni o‘rgatadi. Faqat TUGALLANGAN darslardagi mavzular ishlatiladi."),
      r.items.length ? h("p", { class: "small muted" }, `${r.items.length} ta savol, ${r.topics} ta mavzu. Qiyinlik: ${lv}. Xato qilsangiz, mavzuga qaytish havolasi chiqadi.`) : h("p", { class: "small muted" }, "Hozircha tugallangan dars yo‘q. Avval kamida bitta darsni tugating.")),
    r.items.length ? btn("Boshlash", () => go("mixedrun"), "wide big") : btn("Kursga o‘tish", () => go("course"), "ghost wide"));
}, { tab: "more" });
register("mixedrun", () => { runItems(resolveMixed(10).items, { title: "Aralash test", cta: "Tugatish" }).then(back); }, { focus: true, tab: "more" });

/* =========================== FAOL ESLASH =========================== */
register("recallrun", () => { runItems(resolveRecall(5), { title: "Faol eslash", cta: "Tugatish" }).then(back); }, { focus: true, tab: "home" });

/* =========================== KECHA O‘RGANGANLARIM (mustahkamlash) =========================== */
const SLEEP_TIPS = [
  "Uyqu o‘rganilgan narsani xotirada mustahkamlashga yordam beradi, lekin o‘zi yangi bilim bermaydi: avval o‘rganish va takrorlash kerak.",
  "Yotishdan oldin 5–10 daqiqa takrorlash, so‘ng yetarlicha uxlash foydali. Kechasi majburan o‘qish shart emas.",
  "Ertasi kuni avval o‘zingiz eslashga harakat qiling, keyin javobni tekshiring: bu eng yaxshi mustahkamlash.",
  "Charchagan bo‘lsangiz, dam oling. Bir kun o‘tkazib yuborsangiz ham taraqqiyotingiz saqlanadi.",
];
register("yesterday", () => {
  const info = yesterdayInfo();
  const total = info.vocabIds.length + info.errorIds.length;
  const hour = new Date().getHours();
  const dk = M.dateKey(), daily = M.getFeynman(M.dailyNoteId(dk));
  return page(h("h1", null, info.isYesterday ? "Kecha o‘rganganlarim" : "Oxirgi o‘rganganlarim"),
    info.dayStart ? h("div", { class: "card" }, h("p", null, `${fmtDate(info.dayStart)}: ${info.lessons.length} ta dars, ${info.vocabIds.length} ta yangi so‘z, ${info.errorIds.length} ta xato.`),
      h("p", { class: "small muted" }, "Avval o‘zingiz eslashga harakat qiling, keyin javobni oching: shunda xotira mustahkamroq bo‘ladi."),
      total ? btn("Eslashni boshlash", () => go("yesterdayrun"), "wide big") : null)
      : h("div", { class: "card" }, "Oxirgi 7 kunda yangi o‘rganilgan narsa topilmadi. Bugun yangi dars boshlang."),
    hour >= 17 ? h("div", { class: "card" }, h("h3", null, "Kun yakuni"), h("p", { class: "small" }, "Bugungi so‘zlardan 5 tasini qisqa takrorlab, keyin dam oling."), btn("5 ta so‘zni eslash", () => go("recallrun"), "ghost")) : null,
    h("div", { class: "card" }, h("h3", null, "Bugungi asosiy bilimlarim"), h("p", { class: "small muted" }, "Bugun nimalarni o‘rganganingizni o‘z so‘zlaringiz bilan yozing."),
      daily ? h("p", { class: "small" }, "Bugungi yozuv saqlangan. Uni tahrirlashingiz mumkin.") : null,
      btn(daily ? "Yozuvni tahrirlash" : "Yozish", () => go("dailynote"), "ghost")),
    h("div", { class: "card" }, h("h3", null, "Uyqu va mustahkamlash"), h("ul", { class: "small" }, SLEEP_TIPS.map((t) => h("li", null, t))),
      h("p", { class: "small muted" }, "Ilova uyquni kuzatmaydi va sog‘liq ma’lumotlarini so‘ramaydi.")));
}, { tab: "more" });
register("yesterdayrun", () => { runItems(resolveYesterday(yesterdayInfo()), { title: "Kecha o‘rganganlarim", cta: "Tugatish" }).then(back); }, { focus: true, tab: "more" });
register("dailynote", () => {
  const dk = M.dateKey();
  feynmanForm({ id: M.dailyNoteId(dk), kind: "daily", date: dk }, { heading: "Bugungi asosiy bilimlarim", title: "Bugungi bilimlarim", intro: "Xotirangizdan yozing: bugun nimani o‘rgandingiz? Avval eslashga harakat qiling.", skipLabel: "Bekor qilish" }).then(back);
}, { focus: true, tab: "more" });

/* =========================== FEYNMAN YOZUVLARI =========================== */
register("feynman", () => {
  const notes = [...state.feynman.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  return page(h("h1", null, "Feynman yozuvlarim"), h("p", { class: "muted" }, "O‘z so‘zlaringiz bilan yozilgan tushuntirishlar. Ularni qayta ochib tahrirlashingiz mumkin."),
    !notes.length ? h("div", { class: "card" }, "Hali yozuv yo‘q. Dars oxiridagi «O‘rganganimni tushuntiraman» qadamida yozasiz.") : null,
    ...notes.map((f) => h("div", { class: "card" }, h("div", { class: "row between" }, h("strong", null, f.kind === "lesson" ? lessonTitle(f.lessonId) : "Kunlik: " + f.date), h("span", { class: "small muted" }, fmtDate(f.updatedAt))),
      ...M.FEYNMAN_QUESTIONS.filter((q) => f.answers[q.key]).map((q) => h("p", { class: "small" }, h("strong", null, q.q + " "), f.answers[q.key])),
      row(btn("Tahrirlash", () => go("feynmanedit", { id: f.id }), "ghost small"), btn("O‘chirish", async () => { if (await confirmDelete("Yozuvni o‘chirasizmi?", "Bu tushuntirish o‘chadi.")) { await M.deleteFeynman(f.id); render(); } }, "ghost small")))));
}, { tab: "more" });
register("feynmanedit", (p) => {
  const f = state.feynman.get(p.id);
  if (!f) { back(); return; }
  feynmanForm({ id: f.id, kind: f.kind, lessonId: f.lessonId, date: f.date }, { title: "Tushuntirishni tahrirlash", skipLabel: "Bekor qilish" }).then(back);
}, { focus: true, tab: "more" });
