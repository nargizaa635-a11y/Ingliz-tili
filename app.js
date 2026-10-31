// app.js — ilovani ishga tushiradi.
import { initStore, state, getMeta } from "./store.js";
import { loadContent, content } from "./learn.js";
import { initTTS } from "./speech.js";
import { go, startRouter } from "./nav.js";
import { applyTheme, setNavDot, h } from "./ui.js";
import { hasUnseen } from "./changelog.js";
import "./views.js";
import "./player.js";
import "./tools.js";
import "./cards.js";
import { startTicker } from "./pomodoro.js";

const TAB_TO_VIEW = { home: "home", course: "course", review: "review", speak: "speak", lugat: "lugat", more: "more" };

function showFatal(msg) {
  const m = document.getElementById("main");
  m.replaceChildren();
  const box = document.createElement("div");
  box.className = "card bad";
  box.textContent = "Ilovani ishga tushirib bo‘lmadi: " + msg;
  m.append(box);
}

/** Yangi versiya o‘rnatilganda (service worker almashganda) foydalanuvchiga xabar beradi. Birinchi o‘rnatishda chiqmaydi. */
function watchUpdates() {
  if (!("serviceWorker" in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || document.getElementById("update-bar")) return;
    document.body.append(h("div", { id: "update-bar", class: "update-bar", role: "status" },
      h("span", null, "Ilova yangilandi. Yangi versiyani ko‘rish uchun yangilang."),
      h("button", { type: "button", class: "btn", onClick: () => location.reload() }, "Yangilash")));
  });
}

async function boot() {
  try {
    await initStore();
    applyTheme(state.settings.theme);
    await loadContent();
    initTTS();
  } catch (e) {
    console.error(e);
    showFatal((e && e.message) || String(e));
    return;
  }
  if (typeof matchMedia === "function") {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if ((state.settings.theme || "system") === "system") applyTheme("system"); };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
  }
  for (const b of document.querySelectorAll("#nav button")) {
    b.addEventListener("click", () => go(TAB_TO_VIEW[b.dataset.tab], {}));
  }
  setNavDot("more", hasUnseen(getMeta("seenVersion", null)));
  watchUpdates();
  startRouter();
  startTicker();
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    navigator.serviceWorker.register("./sw.js").catch((e) => console.warn("Service worker ro‘yxatdan o‘tmadi:", e));
  }
  window.__app = { state, content }; // sinash uchun
}

window.addEventListener("error", (e) => console.error("Xato:", e.message));
window.addEventListener("unhandledrejection", (e) => console.error("Va’da xatosi:", e.reason));
boot();
