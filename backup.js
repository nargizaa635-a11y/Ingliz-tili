// backup.js — zaxira (eksport/import). Format versiyalangan va import oldidan tekshiriladi.

export const BACKUP_FORMAT = "ingliz-tili-backup";
export const BACKUP_VERSION = 1;

export function buildBackup(exported, now = Date.now()) {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date(now).toISOString(), data: exported };
}

export function backupFileName(now = Date.now()) {
  const d = new Date(now);
  const p = (n) => String(n).padStart(2, "0");
  return `ingliz-tili-zaxira-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
const num = (x) => typeof x === "number" && Number.isFinite(x);

/** Importdan oldin tekshiradi. { ok, problems[], clean, summary } qaytaradi. */
export function validateBackup(obj) {
  const problems = [];
  if (!isObj(obj)) return { ok: false, problems: ["Fayl JSON obyekt emas."] };
  if (obj.format !== BACKUP_FORMAT) problems.push("Bu ushbu ilovaning zaxira fayli emas.");
  if (obj.version !== BACKUP_VERSION) problems.push(`Zaxira versiyasi qo‘llab-quvvatlanmaydi (${obj.version}).`);
  const d = obj.data;
  if (!isObj(d)) problems.push("«data» bo‘limi yo‘q.");
  if (problems.length) return { ok: false, problems };

  const arr = (k) => (Array.isArray(d[k]) ? d[k] : (problems.push(`«${k}» ro‘yxat bo‘lishi kerak.`), []));
  const cards = arr("cards"), errors = arr("errors"), lessons = arr("lessons"), attempts = arr("attempts"), writings = arr("writings");
  cards.forEach((c, i) => { if (!isObj(c) || typeof c.id !== "string" || !num(c.stage) || !num(c.due)) problems.push(`Karta #${i + 1} noto‘g‘ri.`); });
  errors.forEach((c, i) => { if (!isObj(c) || typeof c.id !== "string") problems.push(`Xato yozuvi #${i + 1} noto‘g‘ri.`); });
  lessons.forEach((c, i) => { if (!isObj(c) || typeof c.id !== "string" || typeof c.status !== "string") problems.push(`Dars yozuvi #${i + 1} noto‘g‘ri.`); });
  attempts.forEach((c, i) => { if (!isObj(c) || !num(c.ts) || typeof c.correct !== "boolean") problems.push(`Urinish #${i + 1} noto‘g‘ri.`); });
  writings.forEach((c, i) => { if (!isObj(c) || !num(c.ts) || typeof c.text !== "string") problems.push(`Yozuv #${i + 1} noto‘g‘ri.`); });
  if (d.meta !== undefined && !isObj(d.meta)) problems.push("«meta» obyekt bo‘lishi kerak.");
  if (d.settings !== undefined && !isObj(d.settings)) problems.push("«settings» obyekt bo‘lishi kerak.");
  // Yangi jadvallar ixtiyoriy: eski zaxiralarda yo‘q bo‘lishi mumkin
  const extra = {};
  for (const name of ["mnemonics", "palaces", "feynman", "mindmaps", "reading", "sessions"]) {
    const list = d[name] === undefined ? [] : d[name];
    if (!Array.isArray(list)) { problems.push(`«${name}» ro‘yxat bo‘lishi kerak.`); continue; }
    list.forEach((r, i) => {
      if (!isObj(r) || typeof r.id !== "string") { problems.push(`${name} #${i + 1} noto‘g‘ri.`); return; }
      if (name === "palaces" && !Array.isArray(r.spots)) problems.push(`Xotira saroyi #${i + 1}: «spots» yo‘q.`);
      if (name === "mindmaps" && !Array.isArray(r.nodes)) problems.push(`Fikrlar xaritasi #${i + 1}: «nodes» yo‘q.`);
      if (name === "reading" && !Array.isArray(r.notes)) problems.push(`Kitob #${i + 1}: «notes» yo‘q.`);
    });
    extra[name] = list;
  }
  if (problems.length) return { ok: false, problems: problems.slice(0, 8) };

  const s = d.settings || {};
  const settings = {};
  if (["full", "balanced", "low"].includes(s.uzSupport)) settings.uzSupport = s.uzSupport;
  if (["tutor", "test"].includes(s.mode)) settings.mode = s.mode;
  if (num(s.masteryStage)) settings.masteryStage = Math.min(7, Math.max(2, Math.round(s.masteryStage)));
  if (num(s.passScore)) settings.passScore = Math.min(1, Math.max(0.5, s.passScore));
  if (num(s.ttsRate)) settings.ttsRate = Math.min(1.5, Math.max(0.5, s.ttsRate));
  if (["mixed", "choice", "recall"].includes(s.reviewStyle)) settings.reviewStyle = s.reviewStyle;

  const clean = { settings, cards, errors, lessons, attempts, writings, meta: d.meta || {}, ...extra };
  const summary = {
    exportedAt: obj.exportedAt || null, cards: cards.length, errors: errors.length,
    lessons: lessons.filter((l) => l.status === "completed").length, attempts: attempts.length, writings: writings.length,
    palaces: (extra.palaces || []).length, mindmaps: (extra.mindmaps || []).length, reading: (extra.reading || []).length,
    feynman: (extra.feynman || []).length, mnemonics: (extra.mnemonics || []).length, sessions: (extra.sessions || []).length,
  };
  return { ok: true, problems: [], clean, summary };
}
