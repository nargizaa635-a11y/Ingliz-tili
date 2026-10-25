// store.js — barcha o‘quv ma’lumotlari telefonda (IndexedDB) saqlanadi.
// IndexedDB ishlamasa, xotirada ishlaydi va foydalanuvchiga ogohlantirish ko‘rsatiladi.

const DB_NAME = "ingliz-tili";
// 2-versiya: yangi jadvallar qo‘shildi (mnemonics, palaces, feynman, mindmaps, reading, sessions).
// Eski jadvallar va ma’lumotlar yangilashda saqlanib qoladi (faqat yetishmagan jadvallar yaratiladi).
const DB_VERSION = 2;
const KEYED = { cards: "id", errors: "id", lessons: "id", meta: "key", mnemonics: "id", palaces: "id", feynman: "id", mindmaps: "id", reading: "id", sessions: "id" };
// jadval nomi → state dagi kalit
const COLS = { mnemonics: "mnemonics", palaces: "palaces", feynman: "feynman", mindmaps: "mindmaps", reading: "readings", sessions: "sessions" };
const AUTO = ["attempts", "writings"];

export const DEFAULT_SETTINGS = { uzSupport: "full", mode: "tutor", masteryStage: 4, passScore: 0.8, ttsRate: 0.9, reviewStyle: "mixed" };

export const state = {
  ready: false, storageMode: "memory", storageError: null, persistent: false, saveError: null,
  cards: new Map(), errors: new Map(), lessons: new Map(),
  mnemonics: new Map(), palaces: new Map(), feynman: new Map(), mindmaps: new Map(), readings: new Map(), sessions: new Map(),
  attempts: [], writings: [], meta: {}, settings: { ...DEFAULT_SETTINGS },
};

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB mavjud emas"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      for (const [name, key] of Object.entries(KEYED)) if (!d.objectStoreNames.contains(name)) d.createObjectStore(name, { keyPath: key });
      for (const name of AUTO) if (!d.objectStoreNames.contains(name)) d.createObjectStore(name, { keyPath: "seq", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("Baza bloklangan"));
  });
}

function run(storeName, mode, fn) {
  if (!db) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const r = fn(t.objectStore(storeName));
    t.oncomplete = () => resolve(r ? r.result : null);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

function persist(storeName, fn) {
  return run(storeName, "readwrite", fn).catch((e) => { state.saveError = String((e && e.message) || e); return null; });
}

function loadFromObject(d) {
  state.cards = new Map((d.cards || []).map((c) => [c.id, c]));
  state.errors = new Map((d.errors || []).map((c) => [c.id, c]));
  state.lessons = new Map((d.lessons || []).map((c) => [c.id, c]));
  for (const [name, key] of Object.entries(COLS)) state[key] = new Map((d[name] || []).map((c) => [c.id, c]));
  state.attempts = d.attempts || [];
  state.writings = d.writings || [];
  state.meta = d.meta || {};
  state.settings = { ...DEFAULT_SETTINGS, ...(d.settings || {}) };
}

export async function initStore() {
  try { db = await openDB(); state.storageMode = "indexeddb"; }
  catch (e) { db = null; state.storageMode = "memory"; state.storageError = String((e && e.message) || e); }
  if (db) {
    const names = ["cards", "errors", "lessons", "attempts", "writings", "meta", ...Object.keys(COLS)];
    const rows = await Promise.all(names.map((n) => run(n, "readonly", (s) => s.getAll())));
    const d = {};
    names.forEach((n, i) => { d[n] = rows[i]; });
    const meta = {};
    for (const row of d.meta || []) meta[row.key] = row.value;
    const settings = meta.settings; delete meta.settings;
    loadFromObject({ ...d, meta, settings });
  }
  try { if (navigator.storage && navigator.storage.persist) state.persistent = await navigator.storage.persist(); } catch { /* ignore */ }
  state.ready = true;
}

export function putCard(c) { state.cards.set(c.id, c); return persist("cards", (s) => s.put(c)); }
export function putError(e) { state.errors.set(e.id, e); return persist("errors", (s) => s.put(e)); }
export function putLesson(l) { state.lessons.set(l.id, l); return persist("lessons", (s) => s.put(l)); }
export function addAttempt(a) {
  state.attempts.push(a);
  return persist("attempts", (s) => s.add(a)).then((k) => { if (k != null) a.seq = k; });
}
export function addWriting(w) {
  state.writings.push(w);
  return persist("writings", (s) => s.add(w)).then((k) => { if (k != null) w.seq = k; });
}
/** Yangi jadvallar uchun umumiy yozish/o‘chirish: name — jadval nomi (mnemonics, palaces, feynman, mindmaps, reading, sessions). */
export function putRec(name, rec) { state[COLS[name]].set(rec.id, rec); return persist(name, (s) => s.put(rec)); }
export function delRec(name, id) { state[COLS[name]].delete(id); return persist(name, (s) => s.delete(id)); }
export function delCard(id) { state.cards.delete(id); return persist("cards", (s) => s.delete(id)); }
export function getMeta(key, def = null) { return key in state.meta ? state.meta[key] : def; }
export function setMeta(key, value) {
  state.meta[key] = value;
  return persist("meta", (s) => s.put({ key, value }));
}
export function delMeta(key) {
  delete state.meta[key];
  return persist("meta", (s) => s.delete(key));
}
export function saveSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  return persist("meta", (s) => s.put({ key: "settings", value: state.settings }));
}

/** Zaxira uchun hamma narsani oddiy obyektga aylantiradi. */
export function exportState() {
  return {
    settings: { ...state.settings },
    cards: [...state.cards.values()],
    errors: [...state.errors.values()],
    lessons: [...state.lessons.values()],
    attempts: state.attempts.map((a) => ({ ...a })),
    writings: state.writings.map((w) => ({ ...w })),
    meta: { ...state.meta },
    ...Object.fromEntries(Object.entries(COLS).map(([name, key]) => [name, [...state[key].values()]])),
  };
}

/**
 * Barcha ma’lumotni almashtiradi (zaxirani tiklash yoki tozalash).
 * IndexedDB’da hamma jadvalni tozalash va yangi yozuvlarni yozish BITTA tranzaksiyada bajariladi:
 * xato bo‘lsa yoki sahifa o‘rtada yopilsa, tranzaksiya bekor bo‘ladi va avvalgi ma’lumot to‘liq saqlanadi.
 * Ilovaning xotiradagi holati faqat tranzaksiya muvaffaqiyatli tugagandan keyin yangilanadi.
 * Natija: { ok: true, persisted } yoki { ok: false, error }. (persisted: false — doimiy saqlash yo‘q, xotira rejimi.)
 * Bu yerda xato «persist» ichida yutilmaydi: chaqiruvchi natijani tekshirishi kerak.
 */
export async function replaceAll(data) {
  let clean;
  try {
    const d = data && typeof data === "object" ? data : {};
    clean = {
      settings: d.settings || {}, cards: d.cards || [], errors: d.errors || [], lessons: d.lessons || [],
      attempts: (d.attempts || []).map(({ seq, ...r }) => ({ ...r })), writings: (d.writings || []).map(({ seq, ...r }) => ({ ...r })),
      meta: d.meta || {},
      ...Object.fromEntries(Object.keys(COLS).map((name) => [name, d[name] || []])),
    };
    for (const k of ["cards", "errors", "lessons", "attempts", "writings", ...Object.keys(COLS)]) if (!Array.isArray(clean[k])) throw new Error(`«${k}» ro‘yxat bo‘lishi kerak`);
  } catch (e) {
    return { ok: false, error: errText(e) };
  }
  const settings = { ...DEFAULT_SETTINGS, ...clean.settings };
  if (db) {
    const names = ["cards", "errors", "lessons", "attempts", "writings", "meta", ...Object.keys(COLS)];
    try {
      await new Promise((resolve, reject) => {
        let tx;
        try { tx = db.transaction(names, "readwrite"); } catch (e) { reject(e); return; }
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error || new Error("Tranzaksiya bekor qilindi"));
        try {
          for (const n of names) tx.objectStore(n).clear();
          for (const name of Object.keys(COLS)) for (const r of clean[name]) tx.objectStore(name).put(r);
          for (const c of clean.cards) tx.objectStore("cards").put(c);
          for (const c of clean.errors) tx.objectStore("errors").put(c);
          for (const c of clean.lessons) tx.objectStore("lessons").put(c);
          for (const a of clean.attempts) { const rq = tx.objectStore("attempts").add({ ...a }); rq.onsuccess = () => { a.seq = rq.result; }; }
          for (const w of clean.writings) { const rq = tx.objectStore("writings").add({ ...w }); rq.onsuccess = () => { w.seq = rq.result; }; }
          for (const [key, value] of Object.entries(clean.meta)) tx.objectStore("meta").put({ key, value });
          tx.objectStore("meta").put({ key: "settings", value: settings }); // oxirgi yozuv: «meta» ichidagi «settings» ustidan yozadi
        } catch (e) { try { tx.abort(); } catch { /* allaqachon tugagan */ } reject(e); }
      });
    } catch (e) {
      const error = errText(e);
      state.saveError = "Tiklash bajarilmadi: " + error;
      return { ok: false, error };
    }
  }
  loadFromObject({ ...clean, settings });
  return { ok: true, persisted: !!db };
}

function errText(e) { return String((e && (e.message || e.name)) || e || "noma’lum xato"); }

/** Hammasini o‘chiradi (replaceAll bilan bir xil xavfsizlik va natija: { ok, error }). */
export function resetAll() { return replaceAll({}); }
