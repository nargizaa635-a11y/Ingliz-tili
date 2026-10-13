// ui.js — kichik DOM yordamchilari
import { speak, ttsAvailable } from "./speech.js";
import { state } from "./store.js";

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
