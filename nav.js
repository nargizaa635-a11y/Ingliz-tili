// nav.js — oddiy ekranlar boshqaruvchisi (Android «Orqaga» tugmasi bilan ishlaydi).
const views = {};
let current = { name: "home", params: {} };

export function register(name, fn, opts = {}) { views[name] = { fn, ...opts }; }
export function currentView() { return current; }

export function go(name, params = {}, { replace = false } = {}) {
  current = { name, params };
  if (replace) history.replaceState(current, ""); else history.pushState(current, "");
  render();
}

export function back() {
  if (history.length > 1) history.back(); else go("home", {}, { replace: true });
}

export function screen(el) {
  const m = document.getElementById("main");
  m.replaceChildren(el);
  window.scrollTo(0, 0);
}

export function render() {
  const v = views[current.name] || views.home;
  document.body.classList.toggle("focus", !!v.focus);
  for (const b of document.querySelectorAll("#nav button")) b.classList.toggle("on", b.dataset.tab === (v.tab || ""));
  const m = document.getElementById("main");
  m.replaceChildren();
  window.scrollTo(0, 0);
  try {
    const out = v.fn(current.params || {});
    if (out && out.then) out.then((el) => { if (el && el.nodeType && current.name === (views[current.name] ? current.name : "home")) screen(el); }).catch(showError);
    else if (out && out.nodeType) m.append(out);
  } catch (e) { showError(e); }
}

function showError(e) {
  console.error(e);
  const m = document.getElementById("main");
  const box = document.createElement("div");
  box.className = "card bad";
  box.textContent = "Xatolik yuz berdi: " + ((e && e.message) || e) + ". Bosh sahifaga qayting.";
  const btn = document.createElement("button");
  btn.className = "btn"; btn.textContent = "Bosh sahifa"; btn.onclick = () => go("home", {}, { replace: true });
  m.replaceChildren(box, btn);
}

export function startRouter() {
  window.addEventListener("popstate", (e) => {
    const s = e.state;
    current = s && views[s.name] ? s : { name: "home", params: {} };
    render();
  });
  const s = history.state;
  current = s && views[s.name] && !views[s.name].focus ? s : { name: "home", params: {} };
  history.replaceState(current, "");
  render();
}
