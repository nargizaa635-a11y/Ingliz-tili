// final.js — A1 yakuniy test va zaif mavzularni qayta ishlash ekranlari. Mantiq: finallogic.js.
import { h, frame } from "./ui.js";
import { screen, register, go } from "./nav.js";
import { state } from "./store.js";
import { content, CATEGORIES, promptText } from "./learn.js";
import { expectedText } from "./engine.js";
import { runExercises } from "./player.js";
import { FINAL_MIN_LESSONS, finalLessonIds, totalLessons, buildFinalTest, evaluateFinal, recordFinal, lastFinal, resolveFinalReview } from "./finallogic.js";

const btn = (label, onClick, cls = "") => h("button", { class: "btn " + cls, type: "button", onClick }, label);
const percent = (a, b) => (b ? Math.round((a / b) * 100) : 0) + "%";
const passPct = () => Math.round(state.settings.passScore * 100) + "%";
const showDate = (ts) => { try { return new Date(ts).toLocaleDateString(); } catch { return ""; } };

function message(text) {
  return new Promise((resolve) => screen(frame(h("div", { class: "summary" }, h("p", null, text), btn("Davom etish", () => resolve(), "wide")), { title: "" })));
}

/* ---------- Kirish ekrani ---------- */
register("finaltest", () => {
  const done = finalLessonIds().length, all = totalLessons();
  const last = lastFinal();
  const ready = done >= FINAL_MIN_LESSONS;
  return h("div", { class: "page" },
    h("h1", null, "A1 yakuniy test"),
    h("div", { class: "card" },
      h("p", null, `Test A1 kursida tugatgan darslaringizdan tuziladi: har darsdan 1 ta savol (shu darsda ochiq xatongiz bo‘lsa, 2 ta). Yordam va tarjima yo‘q.`),
      h("p", { class: "small muted" }, `O‘tish uchun kamida ${passPct()} yordamsiz to‘g‘ri javob kerak. Xatolaringiz saqlanadi va takrorlash jadvaliga qo‘shiladi.`),
      done < all ? h("p", { class: "small" }, `Hozir ${all} ta darsdan ${done} tasi tugatilgan. Test faqat tugatilgan darslardan tuziladi: butun kursni tekshirish uchun hamma darsni tugating.`) : null,
      ready ? btn("Testni boshlash", () => go("finalrun"), "wide big") : h("p", { class: "small" }, `Testni boshlash uchun kamida ${FINAL_MIN_LESSONS} ta darsni tugating.`)),
    last ? h("div", { class: "card" },
      h("h3", null, "Oxirgi natija"),
      h("p", null, `${last.ok} / ${last.total} (${percent(last.ok, last.total)}) — ${last.passed ? "o‘tdingiz" : "o‘tmadingiz"}. ${showDate(last.ts)}`),
      last.weakLessons && last.weakLessons.length ? h("p", { class: "small muted" }, "Zaif darslar: " + last.weakLessons.slice(0, 5).map((w) => w.title).join(", ")) : h("p", { class: "small" }, "Zaif mavzu qolmadi."),
      last.weak && last.weak.length ? btn("Zaif mavzularni qayta ishlash", () => go("finalreview"), "wide") : null) : null);
}, { tab: "course" });

/* ---------- Test ---------- */
async function runFinal() {
  const t = buildFinalTest();
  if (t.lessons < FINAL_MIN_LESSONS || !t.items.length) { await message(`Testni boshlash uchun kamida ${FINAL_MIN_LESSONS} ta darsni tugating.`); return "close"; }
  const results = await runExercises(t.items, { title: "A1 yakuniy test", phase: "final" });
  const ev = evaluateFinal(results);
  await recordFinal(ev);
  return resultScreen(ev, results);
}

function resultScreen(ev, results) {
  return new Promise((resolve) => {
    const wrong = results.filter((r) => !(r.correct && !r.hint));
    const root = h("div", { class: "summary" },
      h("h2", null, ev.passed ? "A1 yakuniy testidan o‘tdingiz" : "A1 yakuniy test: yana mashq kerak"),
      h("p", { class: "score" }, `${ev.ok} / ${ev.total}`, h("span", { class: "muted small" }, ` (${percent(ev.ok, ev.total)}) yordamsiz to‘g‘ri`)),
      h("p", null, ev.passed ? "Ajoyib natija. Quyida kuchsiz joylar bo‘lsa, ularni ham mustahkamlab oling." : `O‘tish uchun ${passPct()} kerak. Zaif mavzularni qayta ishlab, testni yana topshiring.`),
      h("div", { class: "card" }, h("h3", null, "Bo‘limlar bo‘yicha"),
        ...ev.byUnit.map((u) => h("div", { class: "row between" }, h("span", { class: "small" }, u.title), h("span", { class: "small" }, `${u.ok}/${u.total} (${percent(u.ok, u.total)})`)))),
      h("div", { class: "card" }, h("h3", null, "Ko‘nikmalar bo‘yicha"),
        ...Object.entries(ev.bySkill).map(([k, s]) => h("div", { class: "row between" }, h("span", { class: "small" }, CATEGORIES[k] || k), h("span", { class: "small" }, `${s.ok}/${s.total} (${percent(s.ok, s.total)})`)))),
      ev.weakLessons.length ? h("div", { class: "card" }, h("h3", null, "Qaytish kerak bo‘lgan darslar"),
        ...ev.weakLessons.map((w) => h("div", { class: "row between" }, h("span", { class: "small" }, `${w.title} — ${w.wrong} ta xato`), btn("Darsga qaytish", () => resolve({ lesson: w.lessonId }), "ghost small")))) : h("p", null, "Xato yo‘q. Ajoyib!"),
      wrong.length ? h("div", { class: "card" }, h("h3", null, "Xatolar"),
        ...wrong.slice(0, 10).map((r) => h("div", { class: "miss" }, h("div", { class: "small muted" }, promptText(r.ex)), h("div", { class: "en" }, expectedText(r.ex)))),
        wrong.length > 10 ? h("p", { class: "small muted" }, `Yana ${wrong.length - 10} ta xato «Xatolar tarixi»da.`) : null,
        h("p", { class: "small" }, "Bu xatolar saqlandi va takrorlash jadvaliga qo‘shildi.")) : null,
      ev.weak.length ? btn("Zaif mavzularni qayta ishlash", () => resolve("review"), "wide big") : null,
      btn("Testni qayta topshirish", () => resolve("retry"), "wide ghost"),
      btn("Yopish", () => resolve("close"), "wide ghost"));
    screen(frame(root, { title: "Test natijasi" }));
  });
}

function after(choice) {
  if (choice === "review") go("finalreview", {}, { replace: true });
  else if (choice === "retry") go("finalrun", {}, { replace: true });
  else if (choice && choice.lesson) go("lesson", { lessonId: choice.lesson }, { replace: true });
  else history.back();
}

register("finalrun", () => { runFinal().then(after); }, { focus: true, tab: "course" });

/* ---------- Zaif mavzularni qayta ishlash ---------- */
async function runFinalReview() {
  const last = lastFinal();
  const items = last ? resolveFinalReview(last, 12) : [];
  if (!items.length) { await message("Qayta ishlash uchun zaif mavzu yo‘q. Avval yakuniy testni topshiring."); return "close"; }
  const results = await runExercises(items, { title: "Zaif mavzularni qayta ishlash", phase: "drill" });
  const good = results.filter((r) => r.correct && !r.hint).length;
  const wrong = results.filter((r) => !r.correct);
  return new Promise((resolve) => {
    const root = h("div", { class: "summary" },
      h("h2", null, "Qayta ishlash tugadi"),
      h("p", { class: "score" }, `${good} / ${results.length}`, h("span", { class: "muted small" }, " yordamsiz to‘g‘ri")),
      wrong.length
        ? h("div", { class: "card" }, h("h3", null, "Hali qiyin mavzular"), ...wrong.map((r) => h("div", { class: "miss" }, h("div", { class: "en" }, expectedText(r.ex)), r.ex.why ? h("div", { class: "small muted" }, r.ex.why) : null)),
          h("p", { class: "small" }, "Bu xatolar takrorlash jadvalida qoladi. Kerak bo‘lsa, shu mavzu darsiga qayting."))
        : h("p", null, "Zaif mavzularning hammasi yaxshi chiqdi. Endi testni qayta topshirib ko‘ring."),
      btn("Yakuniy testni qayta topshirish", () => resolve("retry"), "wide big"),
      btn("Yopish", () => resolve("close"), "wide ghost"));
    screen(frame(root, { title: "Qayta ishlash" }));
  });
}

register("finalreview", () => { runFinalReview().then(after); }, { focus: true, tab: "course" });
