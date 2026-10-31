// ui.js — kichik DOM yordamchilari
import { speak, ttsAvailable } from "./speech.js";
import { state } from "./store.js";
import { getMnemonic, saveMnemonic, removeMnemonic, MNEMONIC_PROMPTS, MNEMONIC_NOTE, listPalaces, createPalace, addSpot } from "./memory.js";

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "value") el.value = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const THEMES = [["system", "Tizim"], ["light", "Yorug‘"], ["dark", "Tungi"]];

/** Rejimni qo‘llaydi: "system" — qurilma sozlamasi; "light" / "dark" — foydalanuvchi tanlovi. */
export function applyTheme(theme) {
  const t = theme === "light" || theme === "dark" ? theme : "system";
  const root = document.documentElement;
  if (t === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", t);
  try { localStorage.setItem("ingliz-tili-theme", t); } catch { /* ruxsat yo‘q: faqat tez ochilish uchun nusxa edi */ }
  const dark = t === "dark" || (t === "system" && typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches);
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute("content", dark ? "#0F172A" : "#F6F8FC");
  return t;
}

/** Pastki menyudagi tugmaga qizil nuqta (yangilik bor) qo‘yadi yoki olib tashlaydi. */
export function setNavDot(tab, on) {
  const b = document.querySelector(`#nav button[data-tab="${tab}"]`);
  if (!b) return;
  const old = b.querySelector(".dot");
  if (on && !old) b.append(h("i", { class: "dot", "aria-hidden": "true" }));
  else if (!on && old) old.remove();
}

export function toast(msg, ms = 2600) {
  const t = h("div", { class: "toast", role: "status" }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
}

export function confirmDialog({ title, text, ok = "Ha", cancel = "Bekor qilish", danger = false }) {
  return new Promise((resolve) => {
    const close = (v) => { wrap.remove(); resolve(v); };
    const wrap = h("div", { class: "overlay" },
      h("div", { class: "dialog", role: "dialog", "aria-modal": "true" },
        h("h3", null, title), h("p", null, text),
        h("div", { class: "row" },
          h("button", { class: "btn ghost", onClick: () => close(false) }, cancel),
          h("button", { class: "btn" + (danger ? " danger" : ""), onClick: () => close(true) }, ok))));
    document.body.append(wrap);
  });
}

/** Inglizcha gap + eshitish tugmasi. Gap serif shriftda, o‘zbekcha matndan farqlanadi. */
export function en(text, { speakBtn = true, cls = "" } = {}) {
  return h("span", { class: "en " + cls }, text,
    speakBtn && ttsAvailable() ? h("button", { class: "spk", "aria-label": "Eshitish", type: "button", onClick: (e) => { e.stopPropagation(); speak(text.replace(/\n/g, " "), { rate: state.settings.ttsRate }); } }, "▶") : null);
}

export function frame(content, { title = "", label = "", progress = null, onBack } = {}) {
  return h("div", { class: "frame" },
    h("header", { class: "bar" },
      h("button", { class: "iconbtn", "aria-label": "Orqaga", type: "button", onClick: onBack || (() => history.back()) }, "←"),
      h("div", { class: "bar-title" }, title),
      h("div", { class: "bar-label" }, label)),
    progress != null ? h("div", { class: "progress", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(progress * 100) }, h("i", { style: `width:${Math.round(progress * 100)}%` })) : null,
    content);
}

export function fmtDate(ts) { return new Date(ts).toLocaleDateString("uz-UZ", { day: "numeric", month: "short" }); }
export function pct(x) { return x == null ? "—" : Math.round(x * 100) + "%"; }

/** So‘z uchun mnemonika bloki: ko‘rsatish, yordamchi savollar bilan yaratish, tahrirlash, o‘chirish. */
export function mnemonicBox(v) {
  const box = h("div", { class: "mnemo" });
  const draw = () => {
    const m = getMnemonic(v.id);
    box.replaceChildren(m
      ? h("div", { class: "mnemo-saved" }, h("div", { class: "small muted" }, "Mening mnemonikam"), h("div", null, m.text), h("div", { class: "small muted" }, MNEMONIC_NOTE),
        h("div", { class: "row" }, h("button", { class: "btn ghost small", type: "button", onClick: () => edit(m) }, "Tahrirlash"),
          h("button", { class: "btn ghost small", type: "button", onClick: async () => { await removeMnemonic(v.id); draw(); } }, "O‘chirish")))
      : h("button", { class: "btn ghost small", type: "button", onClick: () => edit(null) }, "Mnemonika qo‘shish"));
  };
  const edit = (m) => {
    const parts = {};
    const helpers = MNEMONIC_PROMPTS.map((p) => h("label", { class: "field" }, p.q, parts[p.key] = h("input", { type: "text", class: "inp", value: (m && m[p.key]) || "", maxlength: 200, "aria-label": p.q })));
    const finalText = h("textarea", { class: "inp", rows: 2, maxlength: 400, "aria-label": "Mnemonika matni", placeholder: "Mening mnemonikam…" }, (m && m.text) || "");
    box.replaceChildren(h("div", { class: "card" }, h("strong", null, `«${v.en}» uchun mnemonika`), h("p", { class: "small muted" }, "Yordamchi savollarga javob bering (ixtiyoriy), so‘ng o‘z mnemonikangizni yozing."), ...helpers,
      h("label", { class: "field" }, "Mnemonika:", finalText), h("p", { class: "small muted" }, MNEMONIC_NOTE),
      h("div", { class: "row" },
        h("button", { class: "btn small", type: "button", onClick: async () => {
          const vals = Object.fromEntries(Object.entries(parts).map(([k, el]) => [k, el.value]));
          const text = finalText.value.trim() || Object.values(vals).map((x) => x.trim()).filter(Boolean).join(" · ");
          const r = await saveMnemonic(v.id, text, vals);
          if (!r.ok) { toast(r.error); return; }
          draw();
        } }, "Saqlash"),
        h("button", { class: "btn ghost small", type: "button", onClick: draw }, "Bekor qilish"))));
  };
  draw();
  return box;
}

/** So‘zni xotira saroyidagi nuqtaga joylash. */
export function palaceButton(v) {
  const box = h("div", { class: "mnemo" });
  const idle = () => box.replaceChildren(h("button", { class: "btn ghost small", type: "button", onClick: open }, "Xotira saroyiga joylash"));
  const open = () => {
    const palaces = listPalaces();
    const sel = h("select", { "aria-label": "Joy" }, palaces.map((p) => h("option", { value: p.id }, p.name)), h("option", { value: "" }, "+ Yangi joy"));
    const newName = h("input", { type: "text", class: "inp", placeholder: "Yangi joy nomi (masalan: Mening xonam)", maxlength: 60, "aria-label": "Yangi joy nomi" });
    const label = h("input", { type: "text", class: "inp", placeholder: "Joy ichidagi nuqta (masalan: Eshik)", maxlength: 60, "aria-label": "Nuqta nomi" });
    const m = getMnemonic(v.id);
    const assoc = h("textarea", { class: "inp", rows: 2, maxlength: 300, "aria-label": "Tasviriy assotsiatsiya", placeholder: "Shu nuqtada so‘zni qanday tasavvur qilasiz?" }, m ? m.text : "");
    const sync = () => { newName.hidden = sel.value !== ""; };
    sel.addEventListener("change", sync); if (!palaces.length) sel.value = ""; sync();
    box.replaceChildren(h("div", { class: "card" }, h("strong", null, `«${v.en}» ni joylash`), h("label", { class: "field" }, "Joy: ", sel), newName, label, h("label", { class: "field" }, "Assotsiatsiya:", assoc),
      h("div", { class: "row" },
        h("button", { class: "btn small", type: "button", onClick: async () => {
          let pid = sel.value;
          if (!pid) { const made = await createPalace(newName.value); if (!made.ok) { toast(made.error); return; } pid = made.rec.id; }
          const r = await addSpot(pid, { label: label.value, en: v.en, uz: v.uz, example: v.ex ? v.ex.en : "", assoc: assoc.value, vocabId: v.id });
          if (!r.ok) { toast(r.error); return; }
          toast("Xotira saroyiga joylandi"); idle();
        } }, "Joylash"),
        h("button", { class: "btn ghost small", type: "button", onClick: idle }, "Bekor qilish"))));
  };
  idle();
  return box;
}
