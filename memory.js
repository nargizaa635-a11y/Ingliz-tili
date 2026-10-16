// memory.js — xotira vositalari ma’lumotlari: mnemonika, xotira saroyi, fikrlar xaritasi, kitobxonlik, Feynman.
// Faqat ma’lumot qatlami (UI yo‘q). Hammasi store.js orqali IndexedDB ga yoziladi.
// Saroy nuqtalari va kitob savollari mavjud takrorlash tizimiga (srs.js kartalari) ulanadi.
import { state, putRec, delRec, putCard, delCard } from "./store.js";
import { newCard } from "./srs.js";

let counter = 0;
export function newId(prefix, now = Date.now()) {
  counter = (counter + 1) % 1e6;
  return `${prefix}${now.toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`;
}
const clean = (s, max) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const cleanLong = (s, max) => String(s ?? "").trim().slice(0, max);
const err = (error) => ({ ok: false, error });

/** Qurilma vaqt zonasi bo‘yicha sana kaliti: YYYY-MM-DD */
export function dateKey(now = Date.now()) {
  const d = new Date(now), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ===================== MNEMONIKA ===================== */
export const MNEMONIC_PROMPTS = [
  { key: "sound", q: "Bu so‘z tovushi bilan qaysi tanish so‘zga o‘xshaydi?" },
  { key: "image", q: "Uning ma’nosini ko‘z oldingizda qanday tasvir bilan ko‘rsatar edingiz?" },
  { key: "story", q: "Tovush va tasvirni bog‘lovchi qisqa hikoya yoki gap o‘ylab toping." },
];
export const MNEMONIC_NOTE = "Bu xayoliy assotsiatsiya, so‘zning kelib chiqishi (etimologiyasi) emas. Maqsad faqat eslab qolish.";

export const getMnemonic = (vocabId) => state.mnemonics.get(vocabId) || null;

export async function saveMnemonic(vocabId, text, parts = {}, now = Date.now()) {
  const t = cleanLong(text, 400);
  if (!vocabId) return err("So‘z topilmadi.");
  if (!t) return err("Mnemonika bo‘sh bo‘lmasin.");
  const prev = state.mnemonics.get(vocabId);
  const rec = { id: vocabId, text: t, sound: clean(parts.sound, 200), image: clean(parts.image, 200), story: clean(parts.story, 300), createdAt: prev ? prev.createdAt : now, updatedAt: now };
  await putRec("mnemonics", rec);
  return { ok: true, rec };
}
export async function removeMnemonic(vocabId) {
  if (!state.mnemonics.has(vocabId)) return false;
  await delRec("mnemonics", vocabId);
  return true;
}

/* ===================== XOTIRA SAROYI ===================== */
export const spotCardId = (palaceId, spotId) => `p:${palaceId}:${spotId}`;
export const listPalaces = () => [...state.palaces.values()].sort((a, b) => a.createdAt - b.createdAt);

export async function createPalace(name, now = Date.now()) {
  const n = clean(name, 60);
  if (!n) return err("Joy nomini yozing (masalan: «Mening xonam»).");
  if (listPalaces().some((p) => p.name.toLowerCase() === n.toLowerCase())) return err("Bunday nomli joy allaqachon bor.");
  if (state.palaces.size >= 30) return err("Joylar soni chegaraga yetdi (30).");
  const rec = { id: newId("pl_", now), name: n, createdAt: now, updatedAt: now, spots: [] };
  await putRec("palaces", rec);
  return { ok: true, rec };
}
export async function renamePalace(id, name, now = Date.now()) {
  const p = state.palaces.get(id);
  const n = clean(name, 60);
  if (!p) return err("Joy topilmadi.");
  if (!n) return err("Joy nomini yozing.");
  if (listPalaces().some((x) => x.id !== id && x.name.toLowerCase() === n.toLowerCase())) return err("Bunday nomli joy allaqachon bor.");
  await putRec("palaces", { ...p, name: n, updatedAt: now });
  return { ok: true };
}
export async function deletePalace(id) {
  const p = state.palaces.get(id);
  if (!p) return false;
  for (const s of p.spots) await delCard(spotCardId(id, s.id));
  await delRec("palaces", id);
  return true;
}

function spotFields(data) {
  return { label: clean(data.label, 60), en: clean(data.en, 80), uz: clean(data.uz, 120), example: clean(data.example, 200), assoc: cleanLong(data.assoc, 300), vocabId: data.vocabId || null };
}
function checkSpot(p, f, exceptId = null) {
  if (!f.label) return "Nuqta nomini yozing (masalan: «Eshik»).";
  if (!f.en) return "Inglizcha so‘zni yozing.";
  if (p.spots.some((s) => s.id !== exceptId && s.label.toLowerCase() === f.label.toLowerCase())) return "Bu saroyda shunday nomli nuqta bor.";
  if (p.spots.some((s) => s.id !== exceptId && s.en.toLowerCase() === f.en.toLowerCase())) return "Bu so‘z shu saroyda allaqachon joylangan.";
  return null;
}
export async function addSpot(palaceId, data, now = Date.now()) {
  const p = state.palaces.get(palaceId);
  if (!p) return err("Joy topilmadi.");
  const f = spotFields(data);
  const bad = checkSpot(p, f);
  if (bad) return err(bad);
  if (p.spots.length >= 40) return err("Bir saroyda 40 tadan ortiq nuqta bo‘lmasin.");
  const spot = { id: newId("sp_", now), ...f, createdAt: now };
  await putRec("palaces", { ...p, spots: [...p.spots, spot], updatedAt: now });
  await putCard(newCard(spotCardId(palaceId, spot.id), "palace", { ref: { palaceId, spotId: spot.id } }, now));
  return { ok: true, spot };
}
export async function updateSpot(palaceId, spotId, data, now = Date.now()) {
  const p = state.palaces.get(palaceId);
  const old = p && p.spots.find((s) => s.id === spotId);
  if (!old) return err("Nuqta topilmadi.");
  const f = spotFields({ ...old, ...data });
  const bad = checkSpot(p, f, spotId);
  if (bad) return err(bad);
  await putRec("palaces", { ...p, spots: p.spots.map((s) => (s.id === spotId ? { ...s, ...f } : s)), updatedAt: now });
  return { ok: true };
}
export async function deleteSpot(palaceId, spotId, now = Date.now()) {
  const p = state.palaces.get(palaceId);
  if (!p || !p.spots.some((s) => s.id === spotId)) return false;
  await putRec("palaces", { ...p, spots: p.spots.filter((s) => s.id !== spotId), updatedAt: now });
  await delCard(spotCardId(palaceId, spotId));
  return true;
}
/** Nuqtani yuqoriga (-1) yoki pastga (+1) siljitadi: yurish tartibi muhim. */
export async function moveSpot(palaceId, spotId, dir, now = Date.now()) {
  const p = state.palaces.get(palaceId);
  if (!p) return false;
  const i = p.spots.findIndex((s) => s.id === spotId), j = i + dir;
  if (i < 0 || j < 0 || j >= p.spots.length) return false;
  const spots = p.spots.slice();
  [spots[i], spots[j]] = [spots[j], spots[i]];
  await putRec("palaces", { ...p, spots, updatedAt: now });
  return true;
}

/* ===================== FIKRLAR XARITASI ===================== */
export const listMaps = () => [...state.mindmaps.values()].sort((a, b) => a.createdAt - b.createdAt);
export const childrenOf = (map, parentId) => map.nodes.filter((n) => n.parentId === parentId);
export function descendants(map, nodeId) {
  const out = new Set([nodeId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of map.nodes) if (n.parentId && out.has(n.parentId) && !out.has(n.id)) { out.add(n.id); grew = true; }
  }
  return out;
}

export async function createMap(name, now = Date.now()) {
  const n = clean(name, 60);
  if (!n) return err("Markaziy mavzuni yozing.");
  if (listMaps().some((m) => m.name.toLowerCase() === n.toLowerCase())) return err("Bunday nomli xarita allaqachon bor.");
  if (state.mindmaps.size >= 30) return err("Xaritalar soni chegaraga yetdi (30).");
  const rec = { id: newId("mm_", now), name: n, createdAt: now, updatedAt: now, nodes: [{ id: "root", parentId: null, text: n, lessonId: null, note: "" }] };
  await putRec("mindmaps", rec);
  return { ok: true, rec };
}
export async function deleteMap(id) {
  if (!state.mindmaps.has(id)) return false;
  await delRec("mindmaps", id);
  return true;
}
export async function addNode(mapId, parentId, text, extra = {}, now = Date.now()) {
  const m = state.mindmaps.get(mapId);
  if (!m) return err("Xarita topilmadi.");
  if (!m.nodes.some((n) => n.id === parentId)) return err("Ota tugun topilmadi.");
  const t = clean(text, 120);
  if (!t) return err("Tugun matnini yozing.");
  if (m.nodes.length >= 300) return err("Xaritada 300 tadan ortiq tugun bo‘lmasin.");
  if (m.nodes.some((n) => n.parentId === parentId && n.text.toLowerCase() === t.toLowerCase())) return err("Bu tugun ichida shunday nom allaqachon bor.");
  const node = { id: newId("nd_", now), parentId, text: t, lessonId: extra.lessonId || null, note: cleanLong(extra.note, 300) };
  await putRec("mindmaps", { ...m, nodes: [...m.nodes, node], updatedAt: now });
  return { ok: true, node };
}
export async function editNode(mapId, nodeId, patch, now = Date.now()) {
  const m = state.mindmaps.get(mapId);
  const node = m && m.nodes.find((n) => n.id === nodeId);
  if (!node) return err("Tugun topilmadi.");
  const t = patch.text === undefined ? node.text : clean(patch.text, 120);
  if (!t) return err("Tugun matni bo‘sh bo‘lmasin.");
  if (m.nodes.some((n) => n.id !== nodeId && n.parentId === node.parentId && n.text.toLowerCase() === t.toLowerCase())) return err("Bu darajada shunday nom allaqachon bor.");
  const upd = { ...node, text: t, lessonId: patch.lessonId === undefined ? node.lessonId : patch.lessonId || null, note: patch.note === undefined ? node.note : cleanLong(patch.note, 300) };
  const name = nodeId === "root" ? t : m.name;
  if (nodeId === "root" && listMaps().some((x) => x.id !== mapId && x.name.toLowerCase() === t.toLowerCase())) return err("Bunday nomli xarita allaqachon bor.");
  await putRec("mindmaps", { ...m, name, nodes: m.nodes.map((n) => (n.id === nodeId ? upd : n)), updatedAt: now });
  return { ok: true };
}
/** Tugunni va uning barcha ichki tugunlarini o‘chiradi (ildiz o‘chirilmaydi). */
export async function deleteNode(mapId, nodeId, now = Date.now()) {
  const m = state.mindmaps.get(mapId);
  if (!m || nodeId === "root" || !m.nodes.some((n) => n.id === nodeId)) return 0;
  const gone = descendants(m, nodeId);
  await putRec("mindmaps", { ...m, nodes: m.nodes.filter((n) => !gone.has(n.id)), updatedAt: now });
  return gone.size;
}
/**
 * Mavjud kurs ma’lumotidan YANGI xarita yaratadi (mavjud xaritalar o‘zgarmaydi).
 * groups: [{ unit, lessons: [{ id, title, concepts: [matn…] }] }]
 */
export async function createMapFromCourse(name, groups, now = Date.now()) {
  const made = await createMap(name, now);
  if (!made.ok) return made;
  const nodes = [made.rec.nodes[0]];
  const add = (parentId, text, lessonId = null) => {
    if (nodes.length >= 300) return null;
    const node = { id: newId("nd_", now), parentId, text: clean(text, 120), lessonId, note: "" };
    nodes.push(node);
    return node;
  };
  for (const g of groups) {
    const u = add("root", g.unit);
    for (const l of g.lessons) {
      const ln = u && add(u.id, l.title, l.id);
      for (const c of l.concepts || []) if (ln) add(ln.id, c);
    }
  }
  await putRec("mindmaps", { ...made.rec, nodes, updatedAt: now });
  return { ok: true, rec: state.mindmaps.get(made.rec.id) };
}

/* ===================== KITOBXONLIK VA FIKRLASH ===================== */
export const NOTE_KINDS = { idea: "Fikr / iqtibos", summary: "Bob xulosasi", question: "Savol" };
export const CRITICAL_QUESTIONS = [
  { key: "why", q: "Bu fikrga nima uchun ishonaman?" },
  { key: "evidence", q: "Qanday dalil bor?" },
  { key: "counter", q: "Qarshi fikr nima bo‘lishi mumkin?" },
];
export const noteCardId = (bookId, noteId) => `n:${bookId}:${noteId}`;
export const listBooks = () => [...state.readings.values()].sort((a, b) => a.createdAt - b.createdAt);

export async function addBook(title, author = "", now = Date.now()) {
  const t = clean(title, 100);
  if (!t) return err("Kitob nomini yozing.");
  if (listBooks().some((b) => b.title.toLowerCase() === t.toLowerCase())) return err("Bu kitob allaqachon qo‘shilgan.");
  if (state.readings.size >= 100) return err("Kitoblar soni chegaraga yetdi (100).");
  const rec = { id: newId("bk_", now), title: t, author: clean(author, 80), createdAt: now, updatedAt: now, notes: [] };
  await putRec("reading", rec);
  return { ok: true, rec };
}
export async function deleteBook(id) {
  const b = state.readings.get(id);
  if (!b) return false;
  for (const n of b.notes) await delCard(noteCardId(id, n.id));
  await delRec("reading", id);
  return true;
}
function noteFields(d) {
  return { kind: Object.keys(NOTE_KINDS).includes(d.kind) ? d.kind : "idea", text: cleanLong(d.text, 600), answer: cleanLong(d.answer, 600), why: cleanLong(d.why, 300), evidence: cleanLong(d.evidence, 300), counter: cleanLong(d.counter, 300) };
}
export async function addNote(bookId, data, now = Date.now()) {
  const b = state.readings.get(bookId);
  if (!b) return err("Kitob topilmadi.");
  const f = noteFields(data);
  if (!f.text) return err("Matnni o‘z so‘zlaringiz bilan yozing.");
  if (f.kind === "question" && !f.answer) return err("Savolga javob ham yozing: keyin eslash orqali tekshirasiz.");
  if (b.notes.some((n) => n.kind === f.kind && n.text.toLowerCase() === f.text.toLowerCase())) return err("Bunday yozuv allaqachon bor.");
  if (b.notes.length >= 200) return err("Bir kitobda 200 tadan ortiq yozuv bo‘lmasin.");
  const note = { id: newId("nt_", now), ...f, createdAt: now, updatedAt: now };
  await putRec("reading", { ...b, notes: [...b.notes, note], updatedAt: now });
  if (f.kind === "question") await putCard(newCard(noteCardId(bookId, note.id), "note", { ref: { bookId, noteId: note.id } }, now));
  return { ok: true, note };
}
export async function updateNote(bookId, noteId, patch, now = Date.now()) {
  const b = state.readings.get(bookId);
  const old = b && b.notes.find((n) => n.id === noteId);
  if (!old) return err("Yozuv topilmadi.");
  const f = noteFields({ ...old, ...patch, kind: old.kind });
  if (!f.text) return err("Matn bo‘sh bo‘lmasin.");
  if (f.kind === "question" && !f.answer) return err("Savolga javob ham yozing.");
  await putRec("reading", { ...b, notes: b.notes.map((n) => (n.id === noteId ? { ...n, ...f, updatedAt: now } : n)), updatedAt: now });
  return { ok: true };
}
export async function deleteNote(bookId, noteId, now = Date.now()) {
  const b = state.readings.get(bookId);
  if (!b || !b.notes.some((n) => n.id === noteId)) return false;
  await putRec("reading", { ...b, notes: b.notes.filter((n) => n.id !== noteId), updatedAt: now });
  await delCard(noteCardId(bookId, noteId));
  return true;
}

/* ===================== FEYNMAN USULI ===================== */
export const FEYNMAN_QUESTIONS = [
  { key: "learned", q: "Men nimani o‘rgandim?" },
  { key: "how", q: "Bu qanday ishlaydi?" },
  { key: "example", q: "Buni oddiy misol bilan tushuntira olamanmi?" },
  { key: "unclear", q: "Qaysi joyini hali tushunmadim?" },
];
export const lessonNoteId = (lessonId) => `fl:${lessonId}`;
export const dailyNoteId = (date) => `fd:${date}`;
export const getFeynman = (id) => state.feynman.get(id) || null;

/** meta: { id, kind: "lesson"|"daily", lessonId?, date? }; answers: { learned, how, example, unclear } */
export async function saveFeynman(meta, answers, now = Date.now()) {
  const a = {};
  for (const q of FEYNMAN_QUESTIONS) a[q.key] = cleanLong(answers && answers[q.key], 800);
  if (!Object.values(a).some(Boolean)) return err("Hech bo‘lmasa bitta savolga javob yozing.");
  const prev = state.feynman.get(meta.id);
  const rec = { id: meta.id, kind: meta.kind, lessonId: meta.lessonId || null, date: meta.date || null, answers: a, createdAt: prev ? prev.createdAt : now, updatedAt: now };
  await putRec("feynman", rec);
  return { ok: true, rec };
}
export async function deleteFeynman(id) {
  if (!state.feynman.has(id)) return false;
  await delRec("feynman", id);
  return true;
}
