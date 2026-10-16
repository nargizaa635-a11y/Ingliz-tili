// srs.js — oddiy, tushunarli takrorlash jadvali (Leitner uslubida)

export const DAY = 86400000;
export const INTERVALS_DAYS = [0, 1, 3, 7, 14, 30, 60, 120];
export const MAX_STAGE = INTERVALS_DAYS.length - 1;
export const RETRY_MIN = 10;      // xato qilsa: 10 daqiqadan keyin qayta
export const FIRST_REVIEW_MIN = 60; // yangi karta: 1 soatdan keyin

export function newCard(id, kind, extra = {}, now = Date.now()) {
  return { id, kind, stage: 0, reps: 0, lapses: 0, due: now + FIRST_REVIEW_MIN * 60000, last: null, created: now, ...extra };
}

export const GRADES = ["again", "hard", "good", "easy"]; // eslanmadi, qiyin, esladim, oson
export const EASE_MIN = 0.7, EASE_MAX = 1.6;
const clampEase = (e) => Math.min(EASE_MAX, Math.max(EASE_MIN, Math.round(e * 100) / 100));

/**
 * Natijaga qarab yangi karta holatini qaytaradi (eskisini o‘zgartirmaydi).
 * opts.grade: "again" | "hard" | "good" | "easy" (ixtiyoriy). Berilmasa correct/hint dan olinadi.
 * Moslashuv: karta 2 marta muvaffaqiyatli eslangach (stage >= 2) «ease» koeffitsiyenti o‘zgara boshlaydi:
 * oson eslansa interval uzayadi, xato/qiyin bo‘lsa qisqaradi.
 */
export function reviewCard(card, correct, opts = {}, now = Date.now()) {
  let grade = opts.grade;
  if (!GRADES.includes(grade)) grade = !correct ? "again" : opts.hint ? "hint" : "good";
  const c = { ...card, reps: card.reps + 1, last: now };
  const ease0 = card.ease == null ? 1 : card.ease;
  const proven = card.stage >= 2;
  if (grade === "again") {
    c.lapses = card.lapses + 1;
    c.stage = Math.max(0, card.stage - 2);
    c.due = now + RETRY_MIN * 60000;
    if (proven) c.ease = clampEase(ease0 - 0.15);
  } else if (grade === "hint") {
    // Yordam bilan to‘g‘ri: bosqich o‘zgarmaydi, tezroq qaytadi
    c.due = now + Math.max(1, INTERVALS_DAYS[card.stage] / 2) * DAY;
  } else if (grade === "hard") {
    // Qiyin: bosqich o‘zgarmaydi, interval qisqaroq
    const base = INTERVALS_DAYS[card.stage] * ease0;
    c.due = base > 0 ? now + Math.max(0.5, base * 0.6) * DAY : now + 30 * 60000;
    if (proven) c.ease = clampEase(ease0 - 0.1);
  } else {
    c.stage = Math.min(card.stage + (grade === "easy" ? 2 : 1), MAX_STAGE);
    let ease = ease0;
    if (proven) ease = clampEase(ease0 + (grade === "easy" ? 0.1 : 0.05));
    if (ease !== 1 || card.ease != null) c.ease = ease;
    c.due = now + INTERVALS_DAYS[c.stage] * ease * DAY;
  }
  return c;
}

export function isMastered(card, masteryStage = 4) {
  return !!card && card.stage >= masteryStage;
}

/** Muddati kelgan kartalar, eng muhimlari oldinda. */
export function dueCards(cards, now = Date.now()) {
  const priority = (c) => (now - c.due) / DAY + c.lapses * 0.5 + (c.kind === "error" ? 1 : 0) - c.stage * 0.1;
  return cards.filter((c) => c.due <= now).sort((a, b) => priority(b) - priority(a));
}

/** Keyingi kunlarga taqsimot (ko‘rsatish uchun). */
export function upcomingCounts(cards, now = Date.now()) {
  const out = { now: 0, today: 0, tomorrow: 0, week: 0, later: 0 };
  const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
  const t0 = endToday.getTime();
  for (const c of cards) {
    if (c.due <= now) out.now++;
    else if (c.due <= t0) out.today++;
    else if (c.due <= t0 + DAY) out.tomorrow++;
    else if (c.due <= t0 + 7 * DAY) out.week++;
    else out.later++;
  }
  return out;
}
