// store.js — barcha o‘quv ma’lumotlari telefonda (IndexedDB) saqlanadi.
// IndexedDB ishlamasa, xotirada ishlaydi va foydalanuvchiga ogohlantirish ko‘rsatiladi.

const DB_NAME = "ingliz-tili";
const DB_VERSION = 1;
const KEYED = { cards: "id", errors: "id", lessons: "id", meta: "key" };
const AUTO = ["attempts", "writings"];

export const DEFAULT_SETTINGS = { uzSupport: "full", mode: "tutor", masteryStage: 4, passScore: 0.8, ttsRate: 0.9 };

export const state = {
  ready: false, storageMode: "memory", storageError: null, persistent: false, saveError: null,
  cards: new Map(), errors: new Map(), lessons: new Map(),
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
  state.attempts = d.attempts || [];
  state.writings = d.writings || [];
  state.meta = d.meta || {};
  state.settings = { ...DEFAULT_SETTINGS, ...(d.settings || {}) };
}

export async function initStore() {
  try { db = await openDB(); state.storageMode = "indexeddb"; }
  catch (e) { db = null; state.storageMode = "memory"; state.storageError = String((e && e.message) || e); }
  if (db) {
    const names = ["cards", "errors", "lessons", "attempts", "writings", "meta"];
    const [cards, errors, lessons, attempts, writings, metaRows] = await Promise.all(names.map((n) => run(n, "readonly", (s) => s.getAll())));
    const meta = {};
    for (const row of metaRows || []) meta[row.key] = row.value;
    const settings = meta.settings; delete meta.settings;
    loadFromObject({ cards, errors, lessons, attempts, writings, meta, settings });
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
  };
}

function clearStore(name) { return persist(name, (s) => s.clear()); }

/** Barcha ma’lumotni almashtiradi (import yoki tozalash). */
export async function replaceAll(data) {
  const clean = {
    settings: data.settings || {}, cards: data.cards || [], errors: data.errors || [], lessons: data.lessons || [],
    attempts: (data.attempts || []).map(({ seq, ...r }) => r), writings: (data.writings || []).map(({ seq, ...r }) => r),
    meta: data.meta || {},
  };
  if (db) {
    for (const n of ["cards", "errors", "lessons", "attempts", "writings", "meta"]) await clearStore(n);
    for (const c of clean.cards) await persist("cards", (s) => s.put(c));
    for (const c of clean.errors) await persist("errors", (s) => s.put(c));
    for (const c of clean.lessons) await persist("lessons", (s) => s.put(c));
    for (const a of clean.attempts) await persist("attempts", (s) => s.add({ ...a }));
    for (const w of clean.writings) await persist("writings", (s) => s.add({ ...w }));
    for (const [key, value] of Object.entries(clean.meta)) await persist("meta", (s) => s.put({ key, value }));
    await persist("meta", (s) => s.put({ key: "settings", value: { ...DEFAULT_SETTINGS, ...clean.settings } }));
  }
  loadFromObject(clean);
}

export function resetAll() { return replaceAll({}); }
