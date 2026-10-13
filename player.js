// player.js — mashq ekrani, dars o‘ynatgich, takrorlash va rejadagi sessiya.
import { h, frame, en, toast } from "./ui.js";
import { screen, register, go } from "./nav.js";
import { state, putLesson, addWriting, setMeta, delMeta, getMeta } from "./store.js";
import { content, lessonRecord, recordResult, ensureVocabCards, buildReviewItem, resolveDrill, resolveCheck, resolveListen, speakingTasks, shadowTasks, lessonMastery } from "./learn.js";
import { checkAnswer, expectedText, shuffledOptions, shuffle } from "./engine.js";
import { DIAGNOSTIC, diagnosticAdvice } from "./diagnostic.js";
import { speak, stopSpeaking, ttsAvailable, canRecord, startRecording, micErrorMessage } from "./speech.js";

const rate = () => state.settings.ttsRate;
const continueBtn = (label, onClick, cls = "") => h("button", { class: "btn wide " + cls, type: "button", onClick }, label);

/* =====================================================================
   BITTA MASHQ
   ===================================================================== */
export function askExercise(ex, o) {
  return new Promise((resolve) => {
    window.__currentEx = ex; // faqat avtomatik sinash uchun
    const independent = o.phase === "check" || o.phase === "diagnostic" || o.mode === "test";
    let hintShown = false, noAudio = false, response = null, checked = false;
    let optBtns = null, optList = null, inputEl = null;
    const body = h("div", { class: "ex" });
    const hintBox = h("div", { class: "hint", hidden: true });
    const fb = h("div", { class: "feedback", "aria-live": "polite", hidden: true });
    const checkBtn = h("button", { class: "btn wide", type: "button", disabled: true }, "Tekshirish");
    let hintBtn = null;
    const hasHint = !independent && !!(ex.hint || ex.uz);

    const setResponse = (r, ready) => { response = r; checkBtn.disabled = !ready; };
    const promptEl = (txt) => h("p", { class: "prompt" }, txt);

    /* --- turlar bo‘yicha interfeys --- */
    if (ex.type === "choice" || ex.type === "listen") {
      const opts = shuffledOptions(ex);
      if (ex.type === "listen") {
        const play = (r) => {
          if (!ttsAvailable()) return;
          speak(ex.say, { rate: r });
        };
        if (ttsAvailable()) {
          body.append(h("div", { class: "listen" },
            h("button", { class: "btn big", type: "button", onClick: () => play(rate()) }, "▶ Tinglash"),
            h("button", { class: "btn ghost", type: "button", onClick: () => play(rate() * 0.6) }, "Sekin")),
            h("p", { class: "muted small" }, "Ovoz chiqmasa: telefoningizda inglizcha matn-nutq (Google Text-to-speech) o‘rnatilganini tekshiring."));
        } else {
          noAudio = true;
          body.append(h("div", { class: "card warn" }, "Bu qurilmada ovoz yo‘q — matn ko‘rsatildi. Bu urinish tinglash statistikasiga kirmaydi."), h("p", { class: "en big-en" }, ex.say));
        }
        body.append(promptEl(ex.ask));
      } else {
        body.append(h("p", { class: "prompt pre" }, ex.promptKind === "word" ? en(ex.prompt, { cls: "big-en" }) : ex.prompt));
        if (ex.promptKind === "word") body.append(h("p", { class: "muted small" }, "Ma’nosini toping."));
      }
      const list = h("div", { class: "opts", role: "radiogroup" });
      const btns = opts.map((op) => h("button", {
        class: "opt", type: "button", role: "radio", "aria-checked": "false",
        onClick: () => { if (checked) return; btns.forEach((b) => { b.classList.remove("sel"); b.setAttribute("aria-checked", "false"); }); btn(op); },
      }, op.text));
      function btn(op) { const b = btns[opts.indexOf(op)]; b.classList.add("sel"); b.setAttribute("aria-checked", "true"); setResponse(op.orig, true); }
      list.append(...btns); body.append(list);
      optBtns = btns; optList = opts;
    } else if (ex.type === "fill" || ex.type === "translate" || ex.type === "correct") {
      if (ex.type === "fill") {
        if (ex.context) body.append(h("p", { class: "muted" }, ex.context));
        const parts = ex.text.split("___");
        body.append(h("p", { class: "prompt en-line" }, parts[0], h("span", { class: "blank" }, "＿＿＿"), parts[1] || ""));
      } else if (ex.type === "translate") {
        body.append(h("p", { class: "muted small" }, ex.id.startsWith("vprod:") ? "Inglizchasini yozing:" : "Inglizchaga tarjima qiling:"), promptEl(ex.prompt));
      } else {
        if (ex.context) body.append(h("p", { class: "muted" }, ex.context));
        body.append(h("p", { class: "muted small" }, "Xatoni toping va to‘g‘ri yozing:"), h("p", { class: "wrong en" }, ex.wrong));
      }
      const input = h("input", { type: "text", class: "inp en", lang: "en", autocapitalize: "off", autocomplete: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: "done", "aria-label": "Javobingiz", value: ex.type === "correct" ? ex.wrong : "" });
      input.addEventListener("input", () => setResponse(input.value, input.value.trim().length > 0));
      input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !checkBtn.disabled) { e.preventDefault(); checkBtn.click(); } });
      body.append(input);
      inputEl = input;
      if (ex.type === "correct") setResponse(input.value, true);
    } else if (ex.type === "order") {
      body.append(h("p", { class: "muted small" }, "So‘zlarni to‘g‘ri tartibda joylang:"), promptEl(ex.uz));
      const chips = shuffle(ex.words.map((w, i) => ({ w, i })));
      const chosen = [];
      const bank = h("div", { class: "chips bank" });
      const line = h("div", { class: "chips line", "aria-label": "Sizning gapingiz" });
      const redraw = () => {
        bank.replaceChildren(...chips.filter((c) => !chosen.includes(c)).map((c) => h("button", { class: "chip en", type: "button", onClick: () => { if (checked) return; chosen.push(c); redraw(); } }, c.w)));
        line.replaceChildren(...chosen.map((c) => h("button", { class: "chip en on", type: "button", onClick: () => { if (checked) return; chosen.splice(chosen.indexOf(c), 1); redraw(); } }, c.w)));
        setResponse(chosen.map((c) => c.w), chosen.length === chips.length);
      };
      body.append(line, bank); redraw();
    } else if (ex.type === "match") {
      body.append(promptEl(ex.prompt), h("p", { class: "muted small" }, "Avval inglizcha so‘zni, keyin uning tarjimasini bosing."));
      let wrong = 0, selL = null, solved = 0;
      const left = ex.pairs.map((p, i) => ({ t: p[0], i }));
      const right = shuffle(ex.pairs.map((p, i) => ({ t: p[1], i })));
      const mk = (item, side) => {
        const b = h("button", { class: "opt " + (side === "L" ? "en" : ""), type: "button" }, item.t);
        b.onclick = () => {
          if (checked || b.disabled) return;
          if (side === "L") { left.forEach((x) => x.b.classList.remove("sel")); selL = item; b.classList.add("sel"); return; }
          if (!selL) { toast("Avval inglizcha so‘zni tanlang"); return; }
          if (selL.i === item.i) {
            selL.b.classList.remove("sel"); selL.b.classList.add("ok"); selL.b.disabled = true; b.classList.add("ok"); b.disabled = true; selL = null; solved++;
            if (solved === ex.pairs.length) { setResponse({ wrong }, true); checkBtn.click(); }
          } else { wrong++; b.classList.add("no"); setTimeout(() => b.classList.remove("no"), 500); }
        };
        item.b = b; return b;
      };
      body.append(h("div", { class: "match" }, h("div", null, ...left.map((x) => mk(x, "L"))), h("div", null, ...right.map((x) => mk(x, "R")))));
      checkBtn.hidden = true;
    }

    /* --- yordam (faqat o‘rgatuvchi rejimda) --- */
    if (hasHint) {
      hintBtn = h("button", { class: "btn ghost", type: "button", onClick: () => {
        hintShown = true; hintBtn.hidden = true; hintBox.hidden = false;
        hintBox.replaceChildren(h("strong", null, "Yordam: "), ex.hint || "", ex.uz ? h("div", null, "Tarjima: ", ex.uz) : null);
      } }, "Yordam");
    }

    /* --- tekshirish --- */
    checkBtn.addEventListener("click", () => {
      if (checked || response == null) return;
      checked = true; stopSpeaking();
      const r = checkAnswer(ex, response);
      if (r.empty) { checked = false; return; }
      checkBtn.hidden = true; if (hintBtn) hintBtn.hidden = true;
      if (optBtns) optBtns.forEach((b, i) => { b.disabled = true; const op = optList[i]; if (op.orig === ex.answer) b.classList.add("ok"); else if (b.classList.contains("sel")) b.classList.add("no"); });
      if (inputEl) inputEl.readOnly = true;
      fb.hidden = false; fb.className = "feedback " + (r.correct ? "good" : "bad");
      const lines = [h("strong", null, r.correct ? (hintShown ? "To‘g‘ri (yordam bilan)" : "To‘g‘ri!") : "Noto‘g‘ri")];
      if (!r.correct) {
        if (r.near) lines.push(h("div", { class: "small" }, "Javobingiz to‘g‘riga juda yaqin: imlo yoki -s / -ed kabi qo‘shimchani tekshiring."));
        lines.push(h("div", null, "To‘g‘ri javob: ", h("span", { class: "en" }, expectedText(ex))));
        if ((ex.type === "translate" || ex.type === "correct" || ex.type === "fill") && ex.answers.length > 1) lines.push(h("div", { class: "small muted" }, "Boshqa to‘g‘ri variantlar: " + ex.answers.slice(1).join(" / ")));
      } else if (r.style) lines.push(h("div", { class: "small" }, "Imlo eslatmasi (javob to‘g‘ri hisoblandi): " + r.style));
      if (ex.why) lines.push(h("div", { class: "why" }, ex.why));
      fb.replaceChildren(...lines);
      const next = continueBtn(o.last ? "Tugatish" : "Davom etish", () => {
        resolve({ correct: r.correct, hint: hintShown, userAnswer: typeof response === "object" ? JSON.stringify(response) : response, near: !!r.near, noAudio });
      });
      actions.replaceChildren(next); next.focus();
    });

    const actions = h("div", { class: "actions" }, checkBtn, hintBtn);
    const root = h("div", { class: "ex-wrap" }, body, hintBox, fb, actions);
    screen(frame(root, { title: o.title || "", label: `${o.index + 1}/${o.total}`, progress: o.index / o.total }));
  });
}

/** Mashqlar ketma-ketligi. items: [{ex, phase, cardId, via, lessonId}] */
export async function runExercises(items, o) {
  const results = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const phase = it.phase || o.phase || "practice";
    const res = await askExercise(it.ex, { mode: phase === "practice" ? state.settings.mode : "test", phase, index: i, total: items.length, title: o.title, last: i === items.length - 1 });
    recordResult({ ex: it.ex, correct: res.correct, hint: res.hint, phase, lessonId: it.lessonId || o.lessonId || it.ex.lessonId || null, cardId: it.cardId || null, userAnswer: res.userAnswer, via: it.via || null, noAudio: res.noAudio });
    results.push({ ...res, ex: it.ex });
  }
  return results;
}

function summaryScreen({ title, results, cta, extra = [], retry }) {
  return new Promise((resolve) => {
    const good = results.filter((r) => r.correct && !r.hint).length;
    const wrong = results.filter((r) => !r.correct);
    const root = h("div", { class: "summary" },
      h("h2", null, title),
      h("p", { class: "score" }, `${good} / ${results.length}`, h("span", { class: "muted small" }, " yordamsiz to‘g‘ri")),
      ...extra,
      wrong.length ? h("div", { class: "card" }, h("h3", null, "Xatolar"), ...wrong.map((r) => h("div", { class: "miss" }, h("div", { class: "en" }, expectedText(r.ex)), r.ex.why ? h("div", { class: "small muted" }, r.ex.why) : null)),
        h("p", { class: "small" }, "Bu xatolar saqlandi va takrorlash jadvaliga qo‘shildi.")) : h("p", null, "Xato yo‘q. Ajoyib!"),
      retry ? continueBtn(retry.label, () => resolve("retry"), "ghost") : null,
      continueBtn(cta || "Davom etish", () => resolve("done")));
    screen(frame(root, { title }));
  });
}

/* =====================================================================
   TAKRORLASH, MASHQ TO‘PLAMLARI, DIAGNOSTIKA
   ===================================================================== */
export async function runReview(cardIds, { cta, title = "Takrorlash" } = {}) {
  const items = cardIds.map((id) => state.cards.get(id)).filter(Boolean).map((c) => buildReviewItem(c)).filter(Boolean);
  if (!items.length) { await emptyScreen("Takrorlash uchun kartalar topilmadi."); return; }
  const results = await runExercises(items, { title, phase: "review" });
  await summaryScreen({ title: "Takrorlash tugadi", results, cta });
}

export async function runItems(items, { title, cta }) {
  if (!items.length) { await emptyScreen("Bu mashq uchun hozircha material yo‘q."); return; }
  const results = await runExercises(items, { title });
  await summaryScreen({ title: title + " tugadi", results, cta });
}

function emptyScreen(text) {
  return new Promise((resolve) => screen(frame(h("div", { class: "summary" }, h("p", null, text), continueBtn("Davom etish", () => resolve()), ), { title: "" })));
}

export async function runDiagnostic({ cta } = {}) {
  const items = DIAGNOSTIC.map((ex) => ({ ex, phase: "diagnostic" }));
  const results = await runExercises(items, { title: "Boshlang‘ich test", phase: "diagnostic" });
  const score = results.filter((r) => r.correct).length;
  await setMeta("diagnostic", { ts: Date.now(), score, total: results.length });
  await summaryScreen({ title: "Test natijasi", results, cta, extra: [h("p", null, diagnosticAdvice(score, results.length)), h("p", { class: "small muted" }, "Bu test faqat taxminiy tavsiya beradi. Xatolar takrorlash jadvaliga qo‘shilmaydi.")] });
}

/* =====================================================================
   GAPIRISH (ovoz yozish)
   ===================================================================== */
function recorderWidget(onRecorded) {
  const box = h("div", { class: "rec" });
  let session = null, url = null, timer = null, secs = 0;
  const cleanup = () => { if (url) { URL.revokeObjectURL(url); url = null; } };
  const draw = (mode, msg) => {
    clearInterval(timer);
    if (!canRecord()) {
      box.replaceChildren(h("div", { class: "card warn" }, "Bu brauzerda ovoz yozish qo‘llab-quvvatlanmaydi. Alternativa: gapni baland ovozda ayting, so‘ng namuna bilan solishtiring va o‘zingizni baholang."));
      onRecorded(true); return;
    }
    if (mode === "idle") box.replaceChildren(
      h("button", { class: "btn big", type: "button", onClick: start }, "● Yozishni boshlash"),
      h("p", { class: "muted small" }, "Yozuv faqat shu ekranda, telefoningizda qoladi: saqlanmaydi va hech qayerga yuborilmaydi."), msg ? h("p", { class: "err" }, msg) : null);
    if (mode === "rec") {
      const t = h("span", null, "0:00");
      timer = setInterval(() => { secs++; t.textContent = Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0"); }, 1000);
      box.replaceChildren(h("p", { class: "recdot" }, "● Yozilmoqda ", t), h("button", { class: "btn danger big", type: "button", onClick: stop }, "■ To‘xtatish"));
    }
    if (mode === "done") box.replaceChildren(
      h("audio", { controls: true, src: url, "aria-label": "Sizning yozuvingiz" }),
      h("div", { class: "row" },
        h("button", { class: "btn ghost", type: "button", onClick: () => { cleanup(); onRecorded(false); draw("idle"); } }, "O‘chirish"),
        h("button", { class: "btn ghost", type: "button", onClick: () => { cleanup(); onRecorded(false); start(); } }, "Qayta yozish")));
  };
  async function start() {
    secs = 0;
    try { session = await startRecording(); draw("rec"); }
    catch (e) { draw("idle", micErrorMessage(e)); }
  }
  async function stop() {
    try { const blob = await session.stop(); url = URL.createObjectURL(blob); draw("done"); onRecorded(true); }
    catch (e) { draw("idle", micErrorMessage(e)); }
  }
  draw("idle");
  return box;
}

export function speakTask(task, { cta = "Tugatish", title = "Gapirish" } = {}) {
  return new Promise((resolve) => {
    let hasRec = false, rating = null;
    const rateBox = h("div", { class: "rate", hidden: true },
      h("p", null, "O‘zingizni baholang (talaffuzni dastur baholamaydi):"),
      h("div", { class: "row" }, ...[[1, "Qiynaldim"], [2, "O‘rtacha"], [3, "Yaxshi"]].map(([v, t]) => h("button", { class: "btn ghost", type: "button", onClick: () => { rating = v; finish(); } }, t))));
    const rec = recorderWidget((ok) => { hasRec = ok; rateBox.hidden = !ok; });
    function finish() {
      const ex = { id: task.id, skill: "speaking", concept: "speaking:" + task.id };
      recordResult({ ex, correct: true, phase: "practice", lessonId: task.lessonId || null, selfRating: rating });
      resolve(rating);
    }
    const root = h("div", { class: "ex-wrap" },
      h("p", { class: "prompt" }, task.uz),
      task.starter ? h("p", { class: "muted" }, "Boshlash: ", h("span", { class: "en" }, task.starter)) : null,
      h("div", { class: "card" }, h("div", { class: "small muted" }, "Namuna"), h("p", { class: "en big-en" }, en(task.model))),
      rec, rateBox,
      h("div", { class: "actions" }, h("button", { class: "btn ghost wide", type: "button", onClick: () => resolve(null) }, "O‘tkazib yuborish")));
    screen(frame(root, { title }));
  });
}

register("speakrun", (p) => {
  const pick = () => (p.shadow ? shadowTasks().slice(0, 5) : speakingTasks().filter((t) => t.id === p.taskId));
  (async () => {
    const tasks = pick();
    for (let i = 0; i < tasks.length; i++) await speakTask(tasks[i], { title: p.shadow ? `Takrorlash ${i + 1}/${tasks.length}` : "Gapirish" });
    history.back();
  })();
}, { focus: true, tab: "speak" });

/* =====================================================================
   DARS O‘YNATGICH
   ===================================================================== */
function renderBlock(b) {
  const uz = state.settings.uzSupport;
  if (b.type === "text") {
    if (uz === "low") return h("details", { class: "card" }, h("summary", null, "Tushuntirish (o‘zbekcha)"), h("p", null, b.uz));
    return h("p", { class: "para" }, b.uz);
  }
  if (b.type === "examples") return h("div", { class: "examples" }, b.items.map((it) => {
    const tr = h("div", { class: "uz", hidden: uz === "low" }, it.uz);
    return h("div", { class: "ex-item" }, h("div", null, en(it.en)), tr, uz === "low" ? h("button", { class: "linkbtn", type: "button", onClick: (e) => { tr.hidden = !tr.hidden; e.target.textContent = tr.hidden ? "Tarjima" : "Yashirish"; } }, "Tarjima") : null);
  }));
  if (b.type === "tip") return h("div", { class: "card tip" }, h("strong", null, "Eslab qoling: "), b.uz);
  if (b.type === "mistake") return h("div", { class: "card mistake" }, h("div", { class: "no" }, "✗ ", h("span", { class: "en" }, b.wrong)), h("div", { class: "yes" }, "✓ ", h("span", { class: "en" }, b.right)), h("p", { class: "small" }, b.uz));
  if (b.type === "table") return h("div", { class: "scroll" }, h("table", null, h("thead", null, h("tr", null, b.head.map((x) => h("th", null, x)))), h("tbody", null, b.rows.map((r) => h("tr", null, r.map((c, i) => h("td", { class: i < 2 ? "en" : "" }, c)))))));
  return null;
}

function stepScreen(title, label, progress, nodes, cta, onNext) {
  const root = h("div", { class: "ex-wrap" }, ...nodes, h("div", { class: "actions" }, continueBtn(cta || "Davom etish", onNext)));
  screen(frame(root, { title, label, progress }));
}

const wait = (build) => new Promise((resolve) => build(resolve));

function buildSteps(l) {
  const s = [{ k: "intro" }];
  l.explain.forEach((_, i) => s.push({ k: "explain", i }));
  s.push({ k: "vocab" }, { k: "reading" });
  l.exercises.filter((e) => e.phase === "practice").forEach((e) => s.push({ k: "ex", id: e.id }));
  s.push({ k: "speak" }, { k: "write" }, { k: "check" }, { k: "summary" });
  return s;
}

export async function playLesson(lessonId, { cta = "Darsni tugatish" } = {}) {
  const lesson = content.lessons.get(lessonId);
  if (!lesson) { toast("Dars topilmadi"); return; }
  let rec = lessonRecord(lessonId);
  const completedBefore = rec.status === "completed";
  if (rec.status === "new") { rec = { ...rec, status: "inprogress", startedAt: Date.now() }; await putLesson(rec); }
  const steps = buildSteps(lesson);
  const total = steps.length;
  let i = completedBefore ? 0 : Math.min(rec.step || 0, total - 1);
  const save = (patch) => { rec = { ...rec, ...patch }; return putLesson(rec); };
  const practice = lesson.exercises.filter((e) => e.phase === "practice");
  const checkEx = lesson.exercises.filter((e) => e.phase === "check");
  const prog = () => i / (total - 1);

  while (i < total) {
    const s = steps[i];
    const label = `${i + 1}/${total}`;
    if (s.k === "intro") {
      await wait((next) => stepScreen(lesson.title, label, prog(), [
        h("h2", null, lesson.title),
        h("p", { class: "muted" }, `Taxminan ${lesson.minutes} daqiqa. Istalgan joyda to‘xtashingiz mumkin: joyingiz saqlanadi.`),
        h("div", { class: "card" }, h("h3", null, "Bu darsda o‘rganasiz"), h("ul", null, lesson.objectives.map((o) => h("li", null, o)))),
        lesson.prereq.length ? h("p", { class: "small muted" }, "Oldindan kerak: " + lesson.prereq.map((p) => (content.lessons.get(p) || { title: p }).title).join(", ")) : null,
        completedBefore ? h("p", { class: "small" }, "Bu dars tugatilgan. Takror o‘qish natijani o‘zgartirmaydi.") : null,
      ], "Boshlash", next));
    } else if (s.k === "explain") {
      const sec = lesson.explain[s.i];
      await wait((next) => stepScreen(lesson.title, label, prog(), [h("h2", null, sec.title), ...sec.blocks.map(renderBlock)], null, next));
    } else if (s.k === "vocab") {
      await wait((next) => stepScreen(lesson.title, label, prog(), [
        h("h2", null, "Yangi so‘zlar"),
        h("p", { class: "muted small" }, "Har bir so‘zni eshiting va misolni o‘qing. Ular takrorlash jadvaliga qo‘shiladi."),
        ...lesson.vocab.map((v) => h("div", { class: "card vocab" },
          h("div", { class: "row between" }, en(v.en, { cls: "big-en" }), h("span", { class: "muted small" }, v.pos)),
          h("div", null, v.uz), h("div", { class: "small" }, en(v.ex.en)), h("div", { class: "small muted" }, v.ex.uz))),
      ], null, () => { ensureVocabCards(lesson); next(); }));
    } else if (s.k === "reading") {
      const r = lesson.reading;
      await wait((next) => {
        const tr = h("div", { class: "card pre", hidden: state.settings.uzSupport === "low" }, r.uz);
        stepScreen(lesson.title, label, prog(), [
          h("h2", null, "O‘qish: " + r.title),
          h("div", { class: "card" }, h("p", { class: "en pre" }, r.en), ttsAvailable() ? h("button", { class: "btn ghost", type: "button", onClick: () => speak(r.en.replace(/\n/g, " "), { rate: rate() }) }, "▶ Hammasini tinglash") : null),
          h("button", { class: "linkbtn", type: "button", onClick: () => { tr.hidden = !tr.hidden; } }, "Tarjimani ko‘rsatish / yashirish"), tr,
          h("p", { class: "muted small" }, "Keyingi mashqlarda shu matn haqida savollar bor."),
        ], null, next);
      });
    } else if (s.k === "ex") {
      const idx = practice.findIndex((e) => e.id === s.id);
      const ex = content.exercises.get(s.id);
      const res = await askExercise(ex, { mode: state.settings.mode, phase: "practice", index: idx, total: practice.length, title: lesson.title + ": mashq", last: idx === practice.length - 1 });
      recordResult({ ex, correct: res.correct, hint: res.hint, phase: "practice", lessonId, userAnswer: res.userAnswer, noAudio: res.noAudio });
      await save({ results: { ...rec.results, [ex.id]: { correct: res.correct, hint: res.hint } } });
    } else if (s.k === "speak") {
      const task = lesson.speaking[0];
      if (task) await speakTask({ ...task, lessonId }, { title: lesson.title + ": gapirish" });
    } else if (s.k === "write") {
      await wait((next) => {
        const ta = h("textarea", { class: "inp en", rows: 5, lang: "en", autocapitalize: "sentences", spellcheck: "false", "aria-label": "Yozuvingiz", placeholder: "Shu yerga inglizcha yozing…" });
        const model = h("div", { class: "card", hidden: true }, h("div", { class: "small muted" }, "Namuna"), h("p", { class: "en pre" }, lesson.writing.model));
        const boxes = lesson.writing.checklist.map((t) => h("label", { class: "check" }, h("input", { type: "checkbox" }), " ", t));
        const root = h("div", { class: "ex-wrap" },
          h("h2", null, "Yozish"), h("p", null, lesson.writing.uz), ta,
          h("button", { class: "linkbtn", type: "button", onClick: () => { model.hidden = !model.hidden; } }, "Namunani ko‘rsatish / yashirish"), model,
          h("div", { class: "card" }, h("h3", null, "O‘zingizni tekshiring"), h("p", { class: "small muted" }, "Dastur erkin yozuvni avtomatik baholamaydi. Quyidagi bandlarni o‘zingiz tekshiring."), ...boxes),
          h("div", { class: "actions" },
            continueBtn("Saqlash va davom etish", async () => {
              const text = ta.value.trim();
              if (!text) { toast("Avval biror narsa yozing yoki o‘tkazib yuboring"); return; }
              const marks = boxes.map((b) => b.querySelector("input").checked);
              await addWriting({ ts: Date.now(), lessonId, text, checklist: marks });
              recordResult({ ex: { id: lessonId + ":writing", skill: "writing", concept: "writing:" + lessonId }, correct: true, phase: "practice", lessonId, selfRating: marks.filter(Boolean).length });
              next();
            }),
            h("button", { class: "btn ghost wide", type: "button", onClick: next }, "O‘tkazib yuborish")));
        screen(frame(root, { title: lesson.title + ": yozish", label, progress: prog() }));
      });
    } else if (s.k === "check") {
      await wait((next) => stepScreen(lesson.title, label, prog(), [
        h("h2", null, "O‘zlashtirish tekshiruvi"),
        h("p", null, `${checkEx.length} ta savol. Bu yerda yordam va tarjima yo‘q: faqat o‘zingiz bilganingiz.`),
        h("p", { class: "small muted" }, `O‘tish uchun kamida ${Math.round(state.settings.passScore * 100)}% yordamsiz to‘g‘ri javob kerak.`),
      ], "Boshlash", next));
      const results = await runExercises(checkEx.map((e) => ({ ex: content.exercises.get(e.id), phase: "check", lessonId })), { title: lesson.title + ": tekshiruv", phase: "check", lessonId });
      const score = results.filter((r) => r.correct).length / results.length;
      const passed = score >= state.settings.passScore;
      const newBest = Math.max(rec.bestCheck || 0, score);
      await save({ bestCheck: newBest, lastCheck: score, checkAttempts: (rec.checkAttempts || 0) + 1, lastResults: results.map((r) => ({ id: r.ex.id, correct: r.correct })),
        status: passed || completedBefore || rec.status === "completed" ? "completed" : "inprogress", completedAt: passed && !rec.completedAt ? Date.now() : rec.completedAt || null });
      ensureVocabCards(lesson);
    } else if (s.k === "summary") {
      const lr = rec.lastResults || [];
      const score = rec.lastCheck ?? 0;
      const passed = score >= state.settings.passScore;
      const weak = [...new Set(lr.filter((r) => !r.correct).map((r) => (content.exercises.get(r.id) || {}).concept))].filter(Boolean);
      const m = lessonMastery(lessonId);
      const choice = await summaryScreen({
        title: passed ? "Dars tugallandi" : "Tekshiruvdan o‘tmadingiz",
        results: lr.map((r) => ({ correct: r.correct, hint: false, ex: content.exercises.get(r.id) })).filter((r) => r.ex),
        cta, retry: passed ? null : { label: "Tekshiruvni qayta bajarish" },
        extra: [
          h("p", null, passed ? "Siz tekshiruvdan o‘tdingiz." : `Natija: ${Math.round(score * 100)}%. O‘tish uchun ${Math.round(state.settings.passScore * 100)}% kerak. Qayta urinib ko‘ring yoki darsni qayta o‘qing.`),
          h("p", { class: "small muted" }, `«Tugallandi» — dars va tekshiruvdan o‘tdingiz. «O‘zlashtirildi» — keyingi kunlardagi takrorlashlarda ham eslab qolsangiz. Hozir: ${m.mastered ? "o‘zlashtirildi" : `o‘zlashtirish jarayonida (lug‘at ${m.vocabMastered}/${m.vocabTotal}, ochiq xato ${m.openErrors})`}.`),
          weak.length ? h("p", { class: "small" }, "Zaif mavzular: " + weak.join(", ")) : null,
        ],
      });
      if (choice === "retry") { i = steps.findIndex((x) => x.k === "check"); continue; }
    }
    i++;
    if (i < total && (rec.status !== "completed" || !completedBefore)) await save({ step: i });
  }
  if (!completedBefore) await save({ step: rec.status === "completed" ? 0 : steps.findIndex((x) => x.k === "check") });
}

register("lesson", (p) => { playLesson(p.lessonId).then(() => history.back()); }, { focus: true, tab: "course" });

/* =====================================================================
   SESSIYA (bugungi reja)
   ===================================================================== */
export async function runSession(plan, startIdx = 0) {
  for (let idx = startIdx; idx < plan.items.length; idx++) {
    const it = plan.items[idx];
    const last = idx === plan.items.length - 1;
    const cta = last ? "Rejani tugatish" : "Keyingisi: " + plan.items[idx + 1].label;
    await setMeta("session", { plan, idx, ts: Date.now() });
    if (it.type === "diagnostic") await runDiagnostic({ cta });
    else if (it.type === "review") await runReview(it.cardIds, { cta });
    else if (it.type === "lesson") await playLesson(it.lessonId, { cta });
    else if (it.type === "drill") await runItems(resolveDrill(it).map((x) => ({ ...x })), { title: it.label, cta });
    else if (it.type === "listen") await runItems(resolveListen(it.count), { title: "Tinglab tushunish", cta });
    else if (it.type === "check") await runItems(resolveCheck(it.count), { title: "Yakuniy tekshiruv", cta });
    else if (it.type === "speak") {
      const pool = speakingTasks();
      const tasks = pool.length ? shuffle(pool) : shadowTasks();
      const t = tasks[0];
      if (t) await speakTask(t, { cta });
      else await emptyScreen("Gapirish mashqi uchun avval birinchi darsni boshlang.");
    } else if (it.type === "break") {
      await wait((next) => screen(frame(h("div", { class: "summary" }, h("h2", null, "Tanaffus"), h("p", null, "5 daqiqa dam oling: suv iching, ko‘zingizni ekrandan uzing."), continueBtn("Davom etish", next)), { title: "Tanaffus" })));
    }
  }
  await delMeta("session");
  await wait((next) => screen(frame(h("div", { class: "summary" }, h("h2", null, "Bugungi reja tugadi"), h("p", null, "Ajoyib ish! Ertaga takrorlashlar sizni kutadi."), continueBtn("Bosh sahifa", next)), { title: "" })));
}

register("session", (p) => { runSession(p.plan, p.start || 0).then(() => go("home", {}, { replace: true })); }, { focus: true, tab: "home" });
register("diagnostic", () => { runDiagnostic({ cta: "Bosh sahifa" }).then(() => history.back()); }, { focus: true, tab: "home" });
register("reviewrun", (p) => { runReview(p.cardIds).then(() => history.back()); }, { focus: true, tab: "review" });
register("drillrun", (p) => {
  const items = (p.errorIds || []).map(buildErrorItem).filter(Boolean);
  runItems(items, { title: "Xatolar ustida ishlash" }).then(() => history.back());
}, { focus: true, tab: "review" });

function buildErrorItem(errId) {
  const card = state.cards.get("e:" + errId);
  return card ? buildReviewItem(card) : null;
}
