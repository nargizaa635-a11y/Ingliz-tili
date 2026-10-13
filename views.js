// views.js — asosiy ekranlar: Bugun, Kurs, Takror, Gapirish, Yana (taraqqiyot, so‘zlar, xatolar, sozlamalar, haqida).
import { h, toast, confirmDialog, en, frame, fmtDate, pct } from "./ui.js";
import { register, go, render } from "./nav.js";
import { state, getMeta, setMeta, delMeta, saveSettings, exportState, replaceAll, resetAll } from "./store.js";
import { content, statusMap, lessonMastery, dueCardList, validCards, planContext, progressByLevel, studyDays, backupWarning, speakingTasks, completedLessonIds } from "./learn.js";
import { buildPlan, TIME_CHOICES, SKILL_NAMES, skillStats, nextLessons } from "./planner.js";
import { upcomingCounts, INTERVALS_DAYS } from "./srs.js";
import { CURRICULUM, LEVELS } from "./curriculum.js";
import { buildBackup, validateBackup, backupFileName } from "./backup.js";
import { speak, ttsAvailable, canRecord } from "./speech.js";
import { lessonOrder } from "./learn.js";

const page = (...kids) => h("div", { class: "page" }, ...kids);
const row = (...kids) => h("div", { class: "row" }, ...kids);
const btn = (label, onClick, cls = "") => h("button", { class: "btn " + cls, type: "button", onClick }, label);
const lessonTitle = (id) => { const s = lessonOrder().find((l) => l.id === id); return s ? s.title : id; };

/* =========================== BUGUN =========================== */
register("home", () => {
  const due = dueCardList().length;
  const openErrors = [...state.errors.values()].filter((e) => !e.mastered).length;
  const done = completedLessonIds().length;
  const sess = getMeta("session");
  const inprog = [...state.lessons.values()].find((l) => l.status === "inprogress" && content.lessons.has(l.id));
  const diag = getMeta("diagnostic");
  const warn = backupWarning();
  const chooser = h("div", { class: "card", hidden: true });

  const custom = h("input", { type: "number", class: "inp", min: 5, max: 600, inputmode: "numeric", placeholder: "Boshqa (daqiqa)", "aria-label": "Boshqa daqiqa" });
  chooser.append(h("h3", null, "Bugun qancha vaqtingiz bor?"),
    h("div", { class: "chips" }, TIME_CHOICES.map((m) => h("button", { class: "chip", type: "button", onClick: () => go("plan", { minutes: m }) }, m >= 60 && m % 60 === 0 ? `${m / 60} soat` : `${m} daqiqa`))),
    row(custom, btn("OK", () => { const v = Math.round(Number(custom.value)); if (!(v >= 5 && v <= 600)) { toast("5 dan 600 gacha daqiqa kiriting"); return; } go("plan", { minutes: v }); })));

  return page(
    h("h1", null, "Bugun nimani o‘rganamiz?"),
    state.storageMode !== "indexeddb" ? h("div", { class: "card warn" }, "Brauzer ma’lumotni doimiy saqlay olmayapti. Sahifani yopsangiz, taraqqiyot yo‘qoladi. Chrome’da oddiy (inkognito emas) oynadan oching.") : null,
    warn ? h("div", { class: "card warn" }, warn, " ", h("button", { class: "linkbtn", type: "button", onClick: () => go("settings") }, "Zaxira olish")) : null,
    sess && sess.plan && sess.idx < sess.plan.items.length ? h("div", { class: "card" }, h("h3", null, "Boshlangan reja bor"), h("p", { class: "muted" }, `${sess.idx + 1}/${sess.plan.items.length}: ${sess.plan.items[sess.idx].label}`),
      row(btn("Davom etish", () => go("session", { plan: sess.plan, start: sess.idx })), btn("Bekor qilish", async () => { await delMeta("session"); render(); }, "ghost"))) : null,
    inprog ? h("div", { class: "card" }, h("h3", null, "Boshlangan dars"), h("p", null, content.lessons.get(inprog.id).title), btn("Davom etish", () => go("lesson", { lessonId: inprog.id }))) : null,
    btn("Bugun nima o‘rganay?", () => { chooser.hidden = !chooser.hidden; }, "wide big"),
    chooser,
    h("div", { class: "stats" },
      h("button", { class: "stat", type: "button", onClick: () => go("review") }, h("b", null, due), h("span", null, "takrorlash kutmoqda")),
      h("button", { class: "stat", type: "button", onClick: () => go("errors") }, h("b", null, openErrors), h("span", null, "ochiq xato")),
      h("button", { class: "stat", type: "button", onClick: () => go("course") }, h("b", null, done), h("span", null, "dars tugallandi"))),
    !diag && !done ? h("div", { class: "card" }, h("h3", null, "Qisqa boshlang‘ich test"), h("p", { class: "muted" }, "8 savol, taxminan 3 daqiqa. Qayerdan boshlashni tavsiya qiladi."), btn("Testni boshlash", () => go("diagnostic"), "ghost")) : null,
    content.loadErrors.length ? h("div", { class: "card bad" }, "Kontent yuklashda xato: " + content.loadErrors.join("; ")) : null);
}, { tab: "home" });

register("plan", (p) => {
  const plan = buildPlan(planContext(p.minutes));
  return page(h("h1", null, `${p.minutes} daqiqalik reja`),
    plan.items.length ? h("p", { class: "muted" }, `Taxminan ${plan.totalMinutes} daqiqa. Reja saqlangan ma’lumotlaringizdan tuzildi.`) : null,
    ...plan.items.map((it, i) => h("div", { class: "card plan" }, h("div", { class: "row between" }, h("strong", null, `${i + 1}. ${it.label}`), h("span", { class: "muted small" }, `~${it.minutes} daq`)), h("p", { class: "small muted" }, it.why))),
    !plan.items.length ? h("div", { class: "card" }, "Hozircha qiladigan narsa yo‘q.", ...plan.reasons.map((r) => h("p", { class: "small muted" }, r))) : plan.reasons.length ? h("p", { class: "small muted" }, plan.reasons.join(" ")) : null,
    plan.items.length ? btn("Boshlash", () => go("session", { plan, start: 0 }), "wide big") : null,
    btn("Vaqtni o‘zgartirish", () => history.back(), "ghost wide"));
}, { tab: "home" });

/* =========================== KURS =========================== */
register("course", (p) => {
  const level = p.level || "A1";
  const lv = CURRICULUM.find((x) => x.level === level);
  const pr = progressByLevel().find((x) => x.level === level);
  const st = statusMap();
  const done = (id) => st[id] && st[id].status === "completed";
  return page(h("h1", null, "Kurs xaritasi"),
    h("div", { class: "chips" }, LEVELS.map((l) => h("button", { class: "chip" + (l === level ? " on" : ""), type: "button", onClick: () => go("course", { level: l }, { replace: true }) }, l))),
    h("div", { class: "card" }, h("strong", null, `${level} — ${lv.name}`),
      h("p", { class: "small muted" }, pr.planned ? `${pr.planned} ta rejalashtirilgan dars, shundan ${pr.implemented} tasi tayyor. Tugatilgan: ${pr.completed}. O‘zlashtirilgan: ${pr.mastered}.` : `${lv.units.length} ta bo‘lim rejalashtirilgan. Dars matnlari hali yaratilmagan.`)),
    ...lv.units.map((u) => h("div", { class: "card unit" },
      h("h3", null, u.title), h("p", { class: "small muted" }, u.goal),
      u.lessons ? u.lessons.map((l) => {
        const impl = content.lessons.has(l.id);
        const rec = state.lessons.get(l.id);
        const pre = impl ? content.lessons.get(l.id).prereq.filter((x) => !done(x)) : [];
        const m = lessonMastery(l.id);
        let tag = "Tez orada", action = null;
        if (impl) {
          if (pre.length) { tag = "Avval: " + lessonTitle(pre[0]); }
          else {
            tag = !rec || rec.status === "new" ? "Yangi" : rec.status === "inprogress" ? "Jarayonda" : m.mastered ? "O‘zlashtirildi" : "Tugallandi" + (rec.bestCheck != null ? ` (${pct(rec.bestCheck)})` : "");
            action = btn(!rec || rec.status === "new" ? "Boshlash" : rec.status === "inprogress" ? "Davom" : "Qayta ko‘rish", () => go("lesson", { lessonId: l.id }), rec && rec.status === "completed" ? "ghost small" : "small");
          }
        }
        return h("div", { class: "lesson-row" + (impl ? "" : " dim") }, h("div", null, h("div", null, l.title), h("div", { class: "small muted" }, tag)), action);
      }) : h("p", { class: "small muted" }, "Dars matni hali yaratilmagan.")))
    , lv.finalAssessment ? h("div", { class: "card dim" }, h("strong", null, "Yakuniy baholash"), h("p", { class: "small muted" }, lv.finalAssessment + ": hali yaratilmagan.")) : null);
}, { tab: "course" });

/* =========================== TAKRORLASH =========================== */
register("review", () => {
  const cards = validCards();
  const due = dueCardList();
  const up = upcomingCounts(cards);
  const errs = [...state.errors.values()].filter((e) => !e.mastered);
  const n = Math.min(due.length, 20);
  return page(h("h1", null, "Takrorlash"),
    h("div", { class: "card" }, h("h3", null, due.length ? `${due.length} ta karta kutmoqda` : "Hozir takrorlash yo‘q"),
      due.length ? h("p", { class: "muted small" }, "Avval yordamsiz eslashga urining. Muddati o‘tganlar va qiyin kartalar oldinda.") : h("p", { class: "muted small" }, cards.length ? "Keyingi kartalar muddati kelganda shu yerda paydo bo‘ladi." : "Birinchi darsni tugatsangiz, so‘zlar shu yerga qo‘shiladi."),
      due.length ? btn(`Takrorlashni boshlash (${n} ta)`, () => go("reviewrun", { cardIds: due.slice(0, n).map((c) => c.id) }), "wide big") : null),
    h("div", { class: "card" }, h("h3", null, "Jadval"), h("div", { class: "kv" }, [["Hozir", up.now], ["Bugun (keyinroq)", up.today], ["Ertaga", up.tomorrow], ["7 kun ichida", up.week], ["Keyinroq", up.later]].map(([k, v]) => h("div", null, h("span", null, k), h("b", null, v))))),
    h("div", { class: "card" }, h("h3", null, "Xatolar ustida ishlash"), h("p", { class: "small muted" }, errs.length ? `${errs.length} ta ochiq xato bor. Har biri boshqa gap ichida qayta so‘raladi.` : "Ochiq xato yo‘q."),
      row(errs.length ? btn("Hozir mashq qilish", () => go("drillrun", { errorIds: errs.slice(0, 10).map((e) => e.id) })) : null, btn("Xatolar tarixi", () => go("errors"), "ghost"))));
}, { tab: "review" });

register("errors", (p) => {
  const f = p.filter || "open";
  const all = [...state.errors.values()].sort((a, b) => b.lastAt - a.lastAt);
  const list = all.filter((e) => (f === "all" ? true : f === "open" ? !e.mastered : e.mastered));
  return page(h("h1", null, "Xatolar tarixi"),
    h("div", { class: "chips" }, [["open", "Ochiq"], ["mastered", "O‘zlashtirilgan"], ["all", "Hammasi"]].map(([k, t]) => h("button", { class: "chip" + (f === k ? " on" : ""), type: "button", onClick: () => go("errors", { filter: k }, { replace: true }) }, t))),
    !list.length ? h("div", { class: "card" }, "Bu bo‘limda xato yo‘q.") : null,
    ...list.map((e) => h("div", { class: "card" },
      h("div", { class: "row between" }, h("strong", { class: "en" }, e.prompt), h("span", { class: "small " + (e.mastered ? "good-t" : "bad-t") }, e.mastered ? "o‘zlashtirildi" : "ochiq")),
      h("p", { class: "small" }, "Sizning javobingiz: ", h("span", { class: "en" }, (e.history[e.history.length - 1] || {}).answer || "—")),
      h("p", { class: "small" }, "To‘g‘ri javob: ", h("span", { class: "en" }, e.correct)),
      e.why ? h("p", { class: "small muted" }, e.why) : null,
      h("p", { class: "small muted" }, `${e.count} marta xato · oxirgi: ${fmtDate(e.lastAt)}${e.count > 1 ? " · takrorlangan xato" : ""} · mavzu: ${e.concept}`))));
}, { tab: "more" });

/* =========================== GAPIRISH =========================== */
register("speak", () => {
  const tasks = speakingTasks();
  const attemptsFor = (id) => state.attempts.filter((a) => a.exId === id).length;
  return page(h("h1", null, "Gapirish"),
    h("div", { class: "card" }, h("p", null, "Asosiy maqsad — gapirish. Namuna gapni tinglang, o‘zingizni yozing, tinglab ko‘ring va o‘zingizni baholang."),
      h("p", { class: "small muted" }, "Dastur talaffuzingizni avtomatik baholamaydi: bunga ishonchli usul hozircha yo‘q. Yozuv saqlanmaydi va hech qayerga yuborilmaydi."),
      !canRecord() ? h("p", { class: "small bad-t" }, "Bu brauzerda ovoz yozish ishlamaydi. Mashqni baland ovozda aytib bajaring.") : null),
    tasks.length ? h("div", null, h("h3", null, "Darslardagi mashqlar"), ...tasks.map((t) => h("div", { class: "card" }, h("div", { class: "small muted" }, t.lessonTitle), h("p", null, t.uz), h("div", { class: "row between" }, h("span", { class: "small muted" }, `${attemptsFor(t.id)} marta bajarilgan`), btn("Boshlash", () => go("speakrun", { taskId: t.id }), "small")))),
      btn("Gapni takrorlash (5 ta)", () => go("speakrun", { shadow: true }), "ghost wide"))
      : h("div", { class: "card" }, "Gapirish mashqlari birinchi darsni boshlaganingizdan keyin ochiladi.", btn("Kursga o‘tish", () => go("course"), "ghost")));
}, { tab: "speak" });

/* =========================== YANA =========================== */
register("more", () => page(h("h1", null, "Yana"),
  ...[["Taraqqiyot", "progress", "Ko‘nikmalar, tarix, keyingi qadam"], ["So‘zlarim", "vocab", "O‘rganilgan so‘zlar va eslab qolish darajasi"], ["Xatolar tarixi", "errors", "Takrorlanayotgan xatolar"], ["Sozlamalar va zaxira", "settings", "O‘zbekcha yordam, rejim, eksport/import"], ["Ilova haqida", "about", "Nima ishlaydi, nima hali yo‘q"]]
    .map(([t, v, d]) => h("button", { class: "menu", type: "button", onClick: () => go(v) }, h("strong", null, t), h("span", { class: "small muted" }, d)))), { tab: "more" });

register("progress", () => {
  const stats = skillStats(state.attempts);
  const lv = progressByLevel();
  const days = studyDays(14);
  const max = Math.max(1, ...days.map((d) => d.attempts));
  const next = nextLessons(lessonOrder(), statusMap(), 1)[0];
  const due = dueCardList().length;
  const recent = [...state.errors.values()].sort((a, b) => b.lastAt - a.lastAt).slice(0, 5);
  const skillRows = Object.keys(SKILL_NAMES).map((k) => {
    const s = stats[k];
    if (!s) return h("div", { class: "kv-row" }, h("span", null, SKILL_NAMES[k]), h("span", { class: "muted small" }, "hali mashq qilinmagan"));
    const sr = state.attempts.filter((a) => a.skill === k && a.selfRating != null);
    const avg = sr.length ? (sr.reduce((x, a) => x + a.selfRating, 0) / sr.length).toFixed(1) : null;
    return h("div", { class: "kv-row" }, h("span", null, SKILL_NAMES[k]), h("span", { class: "small" }, s.accuracy != null ? `${pct(s.accuracy)} yordamsiz to‘g‘ri (oxirgi ${s.recent} ta)` : `${s.total} marta mashq qilindi${avg ? `, o‘z bahongiz o‘rtacha ${avg}/3` : ""}`));
  });
  return page(h("h1", null, "Taraqqiyot"),
    h("div", { class: "card" }, h("h3", null, "Keyingi qadam"),
      h("p", null, due ? `${due} ta takrorlash kutmoqda.` : next ? `Keyingi dars: ${next.title}.` : "Hozircha tayyor dars tugagan. Yangi darslar keyingi bosqichda qo‘shiladi."),
      btn("Bugun nima o‘rganay?", () => go("home"), "ghost")),
    h("div", { class: "card" }, h("h3", null, "Darajalar"), h("p", { class: "small muted" }, "Foizlar tayyor darslar bo‘yicha emas, butun rejalashtirilgan kurs bo‘yicha hisoblanadi. Darslarni tugatish B2 ni bildirmaydi."),
      ...lv.map((x) => h("div", { class: "kv-row" }, h("span", null, x.level), h("span", { class: "small" }, x.planned ? `${x.completed}/${x.planned} dars tugallandi · ${x.mastered} o‘zlashtirildi · ${x.implemented} tayyor` : "darslar hali yaratilmagan")))),
    h("div", { class: "card" }, h("h3", null, "Ko‘nikmalar"), ...skillRows, h("p", { class: "small muted" }, "Talaffuz baholanmaydi. Gapirish va yozish — o‘z-o‘zini baholash.")),
    h("div", { class: "card" }, h("h3", null, "Oxirgi 14 kun"), h("div", { class: "bars", role: "img", "aria-label": "Kunlik urinishlar soni" }, days.slice().reverse().map((d) => h("i", { title: `${fmtDate(d.date)}: ${d.attempts}`, style: `height:${Math.max(3, Math.round((d.attempts / max) * 60))}px` }))),
      h("p", { class: "small muted" }, `${days.filter((d) => d.attempts).length} kun mashq qilindi. Kun o‘tkazib yuborsangiz ham tarixingiz o‘chmaydi.`)),
    recent.length ? h("div", { class: "card" }, h("h3", null, "Oxirgi xatolar"), ...recent.map((e) => h("p", { class: "small" }, h("span", { class: "en" }, e.prompt), " → ", h("span", { class: "en" }, e.correct)))) : null);
}, { tab: "more" });

register("vocab", () => {
  const recs = [...state.cards.values()].filter((c) => c.kind === "vocab-rec" && content.vocab.has(c.ref));
  const stage = state.settings.masteryStage;
  return page(h("h1", null, "So‘zlarim"),
    h("p", { class: "muted small" }, "Faqat o‘rgangan darslaringiz so‘zlari. «Taniydi» — ingliz so‘zdan ma’noni tanlash; «Yoza oladi» — o‘zbekchadan inglizchasini yozish."),
    !recs.length ? h("div", { class: "card" }, "Hali so‘z yo‘q. Darsdagi «Yangi so‘zlar» bosqichidan keyin shu yerda paydo bo‘ladi.") : null,
    ...recs.map((c) => { const v = content.vocab.get(c.ref); const pc = state.cards.get("v:" + v.id + ":prod");
      return h("div", { class: "card vocab" }, h("div", { class: "row between" }, en(v.en, { cls: "big-en" }), h("span", { class: "small " + (c.stage >= stage ? "good-t" : "muted") }, c.stage >= stage ? "o‘zlashtirildi" : "o‘rganilmoqda")),
        h("div", null, v.uz), h("div", { class: "small muted" }, `Taniydi: ${c.stage}/${stage} · Yoza oladi: ${pc ? `${pc.stage}/${stage}` : "hali emas"}`)); }));
}, { tab: "more" });

/* =========================== SOZLAMALAR =========================== */
function download(name, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = h("a", { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function importFile(file) {
  let obj;
  try { obj = JSON.parse(await file.text()); } catch { toast("Fayl o‘qilmadi: bu to‘g‘ri JSON emas."); return; }
  const v = validateBackup(obj);
  if (!v.ok) { await confirmDialog({ title: "Zaxira yaroqsiz", text: v.problems.join(" "), ok: "Yopish", cancel: "Bekor" }); return; }
  const s = v.summary;
  const okay = await confirmDialog({ title: "Zaxirani tiklaysizmi?", ok: "Tiklash", danger: true,
    text: `Zaxira sanasi: ${s.exportedAt ? fmtDate(Date.parse(s.exportedAt)) : "noma’lum"}. Ichida: ${s.lessons} tugallangan dars, ${s.attempts} urinish, ${s.cards} karta, ${s.errors} xato. Hozirgi ma’lumotlaringiz BUTUNLAY almashtiriladi.` });
  if (!okay) return;
  await replaceAll(v.clean);
  toast("Zaxira tiklandi"); render();
}

register("settings", () => {
  const S = state.settings;
  const set = async (patch) => { await saveSettings(patch); render(); };
  const choice = (key, items) => h("div", { class: "chips" }, items.map(([val, label]) => h("button", { class: "chip" + (S[key] === val ? " on" : ""), type: "button", "aria-pressed": S[key] === val, onClick: () => set({ [key]: val }) }, label)));
  const last = getMeta("lastExportAt");
  const file = h("input", { type: "file", accept: "application/json,.json", hidden: true, onChange: (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) importFile(f); } });
  return page(h("h1", null, "Sozlamalar"),
    h("div", { class: "card" }, h("h3", null, "O‘zbekcha yordam"), choice("uzSupport", [["full", "Ko‘proq"], ["balanced", "O‘rtacha"], ["low", "Kamroq"]]),
      h("p", { class: "small muted" }, "«Kamroq»da tarjimalar va tushuntirishlar yashirin turadi, bosganda ochiladi. Daraja o‘zgarganda til o‘zgarmaydi: buni siz tanlaysiz.")),
    h("div", { class: "card" }, h("h3", null, "Rejim"), choice("mode", [["tutor", "O‘rgatuvchi"], ["test", "Mustaqil test"]]),
      h("p", { class: "small muted" }, "O‘rgatuvchi: yordam va tarjima bor. Mustaqil test: yordamsiz, javobdan keyingina tushuntirish. Dars oxiridagi tekshiruv har doim yordamsiz.")),
    h("div", { class: "card" }, h("h3", null, "O‘zlashtirish"),
      h("label", { class: "field" }, "Tekshiruvdan o‘tish: ", h("select", { onChange: (e) => set({ passScore: Number(e.target.value) }) }, [0.6, 0.7, 0.8, 0.9, 1].map((v) => h("option", { value: v, selected: S.passScore === v }, Math.round(v * 100) + "%")))),
      h("label", { class: "field" }, "O‘zlashtirilgan karta bosqichi: ", h("select", { onChange: (e) => set({ masteryStage: Number(e.target.value) }) }, [2, 3, 4, 5, 6].map((v) => h("option", { value: v, selected: S.masteryStage === v }, `${v} (~${INTERVALS_DAYS[v]} kun oralig‘i)`)))),
      h("p", { class: "small muted" }, "Mavzu bitta test bilan emas, bir necha kunlik takrorlashlardan so‘ng «o‘zlashtirildi» bo‘ladi.")),
    h("div", { class: "card" }, h("h3", null, "Ovoz tezligi"),
      h("input", { type: "range", min: 0.5, max: 1.2, step: 0.1, value: S.ttsRate, "aria-label": "Ovoz tezligi", onChange: (e) => saveSettings({ ttsRate: Number(e.target.value) }) }),
      row(btn("Sinab ko‘rish", () => { if (!ttsAvailable() || !speak("Good morning. How are you?", { rate: state.settings.ttsRate })) toast("Bu qurilmada ovoz mavjud emas"); }, "ghost small"),
        h("span", { class: "small muted" }, ttsAvailable() ? "Ovoz brauzeringizdan olinadi" : "Bu brauzerda ovoz yo‘q"))),
    h("div", { class: "card" }, h("h3", null, "Zaxira nusxa"),
      h("p", { class: "small" }, "Ma’lumotlaringiz faqat shu telefonning brauzerida saqlanadi. Brauzer ma’lumotlarini tozalasangiz, ilovani o‘chirsangiz yoki boshqa qurilmaga o‘tsangiz, ular yo‘qoladi. Muntazam zaxira oling."),
      h("p", { class: "small muted" }, last ? `Oxirgi zaxira: ${fmtDate(last)}` : "Hali zaxira olinmagan."),
      row(btn("Zaxirani yuklab olish", async () => { download(backupFileName(), JSON.stringify(buildBackup(exportState()), null, 1)); await setMeta("lastExportAt", Date.now()); toast("Zaxira fayli yuklandi"); render(); }),
        btn("Zaxiradan tiklash", () => file.click(), "ghost")), file),
    h("div", { class: "card" }, h("h3", null, "Saqlash holati"),
      h("p", { class: "small" }, state.storageMode === "indexeddb" ? "Ma’lumot qurilmada (IndexedDB) saqlanmoqda." : "Doimiy saqlash ishlamayapti: ma’lumot faqat shu oynada turadi."),
      state.saveError ? h("p", { class: "small bad-t" }, "Oxirgi saqlash xatosi: " + state.saveError) : null,
      h("p", { class: "small muted" }, state.persistent ? "Brauzer ma’lumotni avtomatik o‘chirmaslikka rozi bo‘lgan." : "Brauzer joy kerak bo‘lsa ma’lumotni o‘chirib yuborishi mumkin.")),
    h("div", { class: "card" }, h("h3", null, "Hammasini o‘chirish"), h("p", { class: "small" }, "Taraqqiyot, xatolar, yozuvlar va sozlamalar o‘chadi. Avval zaxira oling."),
      btn("Hamma ma’lumotni o‘chirish", async () => {
        if (!(await confirmDialog({ title: "Hammasini o‘chirasizmi?", text: "Bu amalni qaytarib bo‘lmaydi.", ok: "Davom etish", danger: true }))) return;
        if (!(await confirmDialog({ title: "Aniq ishonchingiz komilmi?", text: "Barcha o‘quv tarixingiz butunlay o‘chadi.", ok: "Ha, o‘chirish", danger: true }))) return;
        await resetAll(); toast("Ma’lumotlar o‘chirildi"); render();
      }, "danger")));
}, { tab: "more" });

/* =========================== HAQIDA =========================== */
export const STATUS = {
  tested: [
    "Dars oqimi: tushuntirish, lug‘at, o‘qish, 11 ta mashq, yozish, yordamsiz tekshiruv (brauzerda sinalgan)",
    "Darsni o‘rtada to‘xtatib, qayta ochganda davom ettirish; tekshiruvdan o‘tmaslik va qayta urinish",
    "7 xil mashq turi, o‘rgatuvchi va mustaqil test rejimi, «kamroq o‘zbekcha» sozlamasi",
    "Xatolarni saqlash, takrorlash kartalari, boshqa gapda qayta so‘rash, yozib berish kartalari",
    "Bugungi reja (10 daqiqadan 3 soatgacha) va sessiyani davom ettirish",
    "Zaxira: eksport, import, yaroqsiz faylni rad etish, hammasini o‘chirish",
    "Ovoz yozish (sinov mikrofoni bilan), oflayn ochilish, 360px maket",
  ],
  untestedOnPhone: [
    "Haqiqiy Android telefonda: inglizcha ovoz (Google matn-nutq) mavjudligi va sifati",
    "Haqiqiy mikrofon va ruxsat so‘rovi; Chrome’da «Bosh ekranga qo‘shish»",
    "Uzoq muddatli foydalanish: haftalar davomida takrorlash jadvali",
  ],
  partial: [
    "A1 kursi: 42 darsdan faqat 1–2-darslar yozilgan (to‘liq sifatli)",
    "Tinglash: brauzer ovozi bilan; maxsus audio yozuvlar yo‘q",
    "Gapirish: o‘zingizni yozib, namuna bilan solishtirasiz va baholaysiz",
    "O‘zbekcha yordam miqdori qo‘lda sozlanadi (avtomatik moslashuv yo‘q)",
  ],
  missing: [
    "A1 ning 3–42-darslari, A1 yakuniy testi",
    "A2, B1, B2 darslari (faqat bo‘limlar rejasi bor)",
    "Talaffuzni avtomatik baholash (ishonchli bepul usul yo‘q)",
    "Jonli AI suhbat (keyingi bosqich, pullik xizmat va xavfsiz server talab qiladi)",
    "Erkin yozuvni avtomatik tekshirish",
  ],
};

register("about", () => page(h("h1", null, "Ilova haqida"),
  h("p", { class: "muted" }, "Shaxsiy ingliz tili ilovasi, v0.1 (poydevor). To‘liq bepul, ma’lumot telefoningizda."),
  ...[["Tayyor", STATUS.tested], ["Tayyor, lekin telefonda hali sinalmagan", STATUS.untestedOnPhone], ["Qisman", STATUS.partial], ["Hali yo‘q", STATUS.missing]].map(([t, list]) => h("div", { class: "card" }, h("h3", null, t), h("ul", null, list.map((x) => h("li", null, x)))))), { tab: "more" });
