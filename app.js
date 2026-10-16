// app.js — ilovani ishga tushiradi.
import { initStore, state } from "./store.js";
import { loadContent, content } from "./learn.js";
import { initTTS } from "./speech.js";
import { go, startRouter } from "./nav.js";
import "./views.js";
import "./player.js";
import "./tools.js";
import { startTicker } from "./pomodoro.js";

const TAB_TO_VIEW = { home: "home", course: "course", review: "review", speak: "speak", more: "more" };

function showFatal(msg) {
  const m = document.getElementById("main");
  m.replaceChildren();
  const box = document.createElement("div");
  box.className = "card bad";
  box.textContent = "Ilovani ishga tushirib bo‘lmadi: " + msg;
  m.append(box);
}

async function boot() {
  try {
    await initStore();
    await loadContent();
    initTTS();
  } catch (e) {
    console.error(e);
    showFatal((e && e.message) || String(e));
    return;
  }
  for (const b of document.querySelectorAll("#nav button")) {
    b.addEventListener("click", () => go(TAB_TO_VIEW[b.dataset.tab], {}));
  }
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
