// lugat.js — «Lug‘at» sahifasi: qidiruv, A–Z ro‘yxat, talaffuz, sevimlilar, yangi / takrorlanadigan so‘zlar.
// Sevimlilar mavjud IndexedDB ning «meta» jadvalida saqlanadi (kalit: lugatFav). Baza sxemasi o‘zgarmaydi, eski ma’lumotga tegilmaydi.
import { h, toast, confirmDialog, mnemonicBox, palaceButton } from "./ui.js";
import { register, go, currentView } from "./nav.js";
import { state, getMeta, setMeta } from "./store.js";
import { content } from "./learn.js";
import { speak, ttsAvailable } from "./speech.js";
import { buildEntries, filterEntries, cardStatus, normSearch, posClass, tileText, parseFavs, whenText, toggleFavorite } from "./lugatlogic.js";

const CHUNK = 80; // bir vaqtda chiziladigan qatorlar (qidiruv hamma so‘zlar bo‘yicha ishlaydi, faqat ko‘rsatish bosqichma-bosqich)
const FILTERS = [["all", "Hammasi"], ["fav", "★ Sevimli"], ["due", "Takror"], ["new", "Yangi"]];
const view = { q: "", filter: "all", letter: "" }; // sahifadan chiqib qaytganda saqlanadi

let entriesCache = null;
function getEntries() {
  if (!entriesCache || entriesCache.size !== content.vocab.size) entriesCache = { size: content.vocab.size, list: buildEntries(content.vocab) };
  return entriesCache.list;
}

let favs = new Set();
// Sevimlilar navbat bilan saqlanadi: ikki qatorni ketma-ket bosganda biri ikkinchisining o‘zgarishini ustidan yozib yubormasligi uchun.
let favQueue = Promise.resolve();
function queueToggle(id) {
  favQueue = favQueue.then(async () => {
    const r = await toggleFavorite(favs, id, (arr) => setMeta("lugatFav", arr), { memoryMode: state.storageMode === "memory" });
    favs = r.favs;
    return r;
  });
  return favQueue;
}

const say = (text, rate) => speak(String(text).replace(/\n/g, " "), { rate: rate || state.settings.ttsRate });

function hl(text, q) {
  const raw = String(q || "").trim().toLowerCase();
  if (!raw) return text;
  const i = text.toLowerCase().indexOf(raw);
  if (i < 0) return text;
  return [text.slice(0, i), h("mark", null, text.slice(i, i + raw.length)), text.slice(i + raw.length)];
}

function speakBtn(text, label, rate, cls = "") {
  if (!ttsAvailable()) return null;
  return h("button", { type: "button", class: "lg-act " + cls, "aria-label": label, onClick: (e) => { e.stopPropagation(); say(text, rate); } }, "▶");
}

function tile(e) {
  return h("span", { class: "lg-pic pos-" + posClass(e.pos) + (e.icon ? " has-icon" : ""), "aria-hidden": "true" }, e.icon || tileText(e.en));
}

function lugatPage() {
  favs = parseFavs(getMeta("lugatFav", []));
  const entries = getEntries();
  const now = Date.now();
  const stage = state.settings.masteryStage || 4;
  const stMap = new Map();
  for (const e of entries) stMap.set(e.id, cardStatus(state.cards.get("v:" + e.id + ":rec"), now, stage));
  const statusOf = (e) => stMap.get(e.id) || {};

  let shown = CHUNK;
  let openRow = null;

  const info = h("p", { class: "muted small lg-info", "aria-live": "polite" });
  const list = h("div", { class: "lg-list", role: "list" });
  const more = h("button", { type: "button", class: "btn ghost wide lg-more", onClick: () => { shown += CHUNK; paint(false); } });
  const input = h("input", { type: "text", class: "inp lg-q", value: view.q, placeholder: "Qidirish: inglizcha yoki o‘zbekcha", autocomplete: "off", autocapitalize: "none", autocorrect: "off", spellcheck: "false", enterkeyhint: "search", "aria-label": "Lug‘atdan qidirish" });
  const clear = h("button", { type: "button", class: "lg-clear", "aria-label": "Qidiruvni tozalash", hidden: !view.q, onClick: () => { input.value = ""; onQuery(); input.focus(); } }, "×");
  const chips = h("div", { class: "chips lg-chips", role: "group", "aria-label": "Filtr" });
  const az = h("div", { class: "lg-az", role: "group", "aria-label": "Harf bo‘yicha" });

  const counts = () => {
    const c = { all: entries.length, fav: 0, due: 0, new: 0 };
    for (const e of entries) { if (favs.has(e.id)) c.fav++; const s = statusOf(e); if (s.isDue) c.due++; if (s.isNew) c.new++; }
    return c;
  };
  const paintChips = () => {
    const c = counts();
    chips.replaceChildren(...FILTERS.map(([k, label]) => h("button", { type: "button", class: "chip" + (view.filter === k ? " on" : ""), "aria-pressed": view.filter === k, onClick: () => { view.filter = k; paint(true); paintChips(); } }, `${label} ${c[k]}`)));
  };
  const letters = [...new Set(entries.map((e) => e.letter))].sort();
  const paintAz = () => {
    az.replaceChildren(h("button", { type: "button", class: "lg-l" + (!view.letter ? " on" : ""), "aria-pressed": !view.letter, onClick: () => { view.letter = ""; paint(true); paintAz(); } }, "A–Z"),
      ...letters.map((L) => h("button", { type: "button", class: "lg-l" + (view.letter === L ? " on" : ""), "aria-pressed": view.letter === L, onClick: () => { view.letter = view.letter === L ? "" : L; paint(true); paintAz(); } }, L)));
  };

  function detail(e, st) {
    const box = h("div", { class: "lg-det" });
    box.append(
      h("div", { class: "lg-big" }, h("span", { class: "en big-en" }, e.en), e.ipa ? h("span", { class: "lg-ipa" }, "/" + e.ipa + "/") : null),
      h("div", { class: "small muted" }, [e.pos, st.label].filter(Boolean).join(" · ")),
    );
    if (ttsAvailable()) box.append(h("div", { class: "row" },
      h("button", { type: "button", class: "btn small", onClick: () => say(e.en) }, "▶ Eshitish"),
      h("button", { type: "button", class: "btn ghost small", onClick: () => say(e.en, 0.55) }, "🐢 Sekin")));
    else box.append(h("p", { class: "small muted" }, "Bu qurilmada ovoz chiqarish mavjud emas."));
    if (e.ex && e.ex.en) box.append(h("div", { class: "lg-ex" },
      h("div", { class: "en" }, e.ex.en, speakBtn(e.ex.en, "Misolni eshitish", 0, "spk")),
      h("div", { class: "muted" }, e.ex.uz || "")));
    const cardId = "v:" + e.id + ":rec";
    const card = state.cards.get(cardId);
    if (card) {
      const early = !st.isDue;
      box.append(h("div", { class: "lg-rev" },
        early ? h("p", { class: "small muted" }, `Keyingi takror: ${whenText(card.due, Date.now())}. Muddatidan oldin takrorlash mumkin, lekin u jadvalni o‘zgartiradi.`) : null,
        h("div", { class: "row" }, h("button", { type: "button", class: "btn ghost small", onClick: async () => {
          const c = state.cards.get(cardId);
          if (!c) { toast("Bu so‘z uchun takrorlash kartasi topilmadi."); return; }
          const live = cardStatus(c, Date.now(), stage);
          if (!live.isDue) {
            const ok = await confirmDialog({
              title: "Muddatidan oldin takrorlaysizmi?",
              text: `«${e.en}» ning takror muddati hali kelmagan (${whenText(c.due, Date.now())}). Hozir takrorlasangiz: to‘g‘ri javob so‘zni keyingi bosqichga o‘tkazadi va keyingi muddat qayta hisoblanadi (jadval oldinga siljiydi); xato javob bosqichni pasaytiradi va so‘z 10 daqiqadan keyin qayta so‘raladi.`,
              ok: "Takrorlash", cancel: "Bekor qilish" });
            if (!ok) return;
          }
          go("reviewrun", { cardIds: [cardId] });
        } }, early ? "Muddatidan oldin takrorlash" : "Shu so‘zni takrorlash"))));
    }
    box.append(mnemonicBox(e), palaceButton(e));
    return box;
  }

  function row(e) {
    const st = statusOf(e);
    const mark = st.isNew ? ["Yangi", "new"] : st.isDue ? ["Takror", "due"] : null;
    const fav = favs.has(e.id);
    let det = null;
    const wrap = h("div", { class: "lg-row" + (mark ? " " + mark[1] : ""), role: "listitem", "data-id": e.id });
    const main = h("button", { type: "button", class: "lg-main", "aria-expanded": "false", onClick: () => {
      if (det) { det.remove(); det = null; main.setAttribute("aria-expanded", "false"); wrap.classList.remove("open"); openRow = null; return; }
      if (openRow && openRow !== wrap) openRow.querySelector(".lg-main").click();
      det = detail(e, st); wrap.append(det); main.setAttribute("aria-expanded", "true"); wrap.classList.add("open"); openRow = wrap;
    } },
      tile(e),
      h("span", { class: "lg-txt" },
        h("span", { class: "lg-en en" }, hl(e.en, view.q)), e.ipa ? h("span", { class: "lg-ipa" }, "/" + e.ipa + "/") : null,
        h("span", { class: "lg-uz" }, hl(e.uz, view.q))),
      mark ? h("span", { class: "lg-badge " + mark[1] }, mark[0]) : null);
    const star = h("button", { type: "button", class: "lg-act lg-fav" + (fav ? " on" : ""), "aria-pressed": fav, "aria-label": fav ? "Sevimlilardan olib tashlash" : "Sevimlilarga qo‘shish", onClick: async (ev) => {
      ev.stopPropagation();
      if (star.disabled) return;
      star.disabled = true; // saqlash tugaguncha yulduzcha o‘zgarmaydi
      try {
        const r = await queueToggle(e.id);
        if (!r.ok) toast("Sevimlini saqlab bo‘lmadi, yulduzcha o‘zgarmadi. Keyinroq qayta urinib ko‘ring.");
        else if (!r.persisted) toast("Xotira rejimi: sevimli faqat shu seans davomida saqlanadi.", 4200);
        const on = favs.has(e.id);
        star.classList.toggle("on", on); star.setAttribute("aria-pressed", on); star.textContent = on ? "★" : "☆";
        star.setAttribute("aria-label", on ? "Sevimlilardan olib tashlash" : "Sevimlilarga qo‘shish");
        paintChips();
      } finally { star.disabled = false; }
    } }, fav ? "★" : "☆");
    wrap.append(h("div", { class: "lg-line" }, main, speakBtn(e.en, "Eshitish: " + e.en), star));
    return wrap;
  }

  function paint(reset) {
    if (reset) { shown = CHUNK; openRow = null; }
    const res = filterEntries(entries, { q: view.q, filter: view.filter, letter: view.letter, favs, statusOf });
    const nq = normSearch(view.q);
    info.textContent = res.length ? `${res.length} ta so‘z` + (nq ? ` topildi («${view.q.trim()}»)` : "") : "";
    const frag = document.createDocumentFragment();
    if (!res.length) {
      let msg;
      if (nq) msg = `«${view.q.trim()}» topilmadi. Boshqacha yozib ko‘ring yoki inglizcha/o‘zbekcha so‘zning bir qismini kiriting.`;
      else if (view.filter === "fav") msg = "Hali sevimli so‘z yo‘q. So‘z yonidagi ☆ ni bosing.";
      else if (view.filter === "due") msg = "Hozir takrorlash kerak bo‘lgan so‘z yo‘q.";
      else if (view.filter === "new") msg = "Yangi so‘z yo‘q.";
      else msg = "Bu harfdan boshlanadigan so‘z yo‘q.";
      frag.append(h("div", { class: "card lg-empty", role: "status" }, msg));
    }
    let lastLetter = "";
    for (const e of res.slice(0, shown)) {
      if (!nq && e.letter !== lastLetter) { lastLetter = e.letter; frag.append(h("div", { class: "lg-letter", "aria-hidden": "true" }, e.letter)); }
      frag.append(row(e));
    }
    list.replaceChildren(frag);
    more.hidden = res.length <= shown;
    more.textContent = `Yana ko‘rsatish (${res.length - shown})`;
  }

  let timer = 0;
  function onQuery() {
    view.q = input.value;
    clear.hidden = !input.value;
    clearTimeout(timer);
    timer = setTimeout(() => paint(true), 60);
  }
  input.addEventListener("input", onQuery);
  input.addEventListener("keydown", (ev) => { if (ev.key === "Enter") input.blur(); });

  paintChips(); paintAz(); paint(true);
  return h("div", { class: "page lugat" },
    h("h1", null, "Lug‘at"),
    h("div", { class: "lg-search" }, input, clear),
    chips, az, info, list, more,
    h("p", { class: "muted small lg-note" }, "Rasmlar: qurilmangiz shriftidagi belgilar (emoji), ular internetsiz ham ishlaydi. Mavhum so‘zlar uchun harfli kartochka chiqadi. Ma’nolar va misollar darslardan olingan. «Yangi» — darsda ko‘rilgan, lekin hali takrorlanmagan so‘z; «Takror» — takrorlash muddati kelgan so‘z (faqat so‘z kartalari sanaladi)."));
}

register("lugat", lugatPage, { tab: "lugat" });

// Pastki menyudagi «Lug‘at» tugmasi: mavjud #nav ga ulanadi (ikkinchi panel yaratilmaydi).
if (typeof document !== "undefined") {
  const nav = document.getElementById("nav");
  if (nav && !nav.dataset.lugatBound) {
    nav.dataset.lugatBound = "1";
    nav.addEventListener("click", (e) => {
      const b = e.target && e.target.closest ? e.target.closest('button[data-tab="lugat"]') : null;
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      if (currentView().name === "lugat") window.scrollTo(0, 0); else go("lugat");
    }, true);
  }
}
