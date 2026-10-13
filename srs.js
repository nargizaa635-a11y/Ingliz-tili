// srs.js — oddiy, tushunarli takrorlash jadvali (Leitner uslubida)

export const DAY = 86400000;
export const INTERVALS_DAYS = [0, 1, 3, 7, 14, 30, 60, 120];
export const MAX_STAGE = INTERVALS_DAYS.length - 1;
export const RETRY_MIN = 10;      // xato qilsa: 10 daqiqadan keyin qayta
export const FIRST_REVIEW_MIN = 60; // yangi karta: 1 soatdan keyin

export function newCard(id, kind, extra = {}, now = Date.now()) {
  return { id, kind, stage: 0, reps: 0, lapses: 0, due: now + FIRST_REVIEW_MIN * 60000, last: null, created: now, ...extra };
}

/** Natijaga qarab yangi karta holatini qaytaradi (eskisini o‘zgartirmaydi). */
export function reviewCard(card, correct, opts = {}, now = Date.now()) {
  const c = { ...card, reps: card.reps + 1, last: now };
  if (correct && !opts.hint) {
    c.stage = Math.min(card.stage + 1, MAX_STAGE);
    c.due = now + INTERVALS_DAYS[c.stage] * DAY;
  } else if (correct && opts.hint) {
    // Yordam bilan to‘g‘ri: bosqich o‘zgarmaydi, tezroq qaytadi
    c.due = now + Math.max(1, INTERVALS_DAYS[card.stage] / 2) * DAY;
  } else {
    c.lapses = card.lapses + 1;
    c.stage = Math.max(0, card.stage - 2);
    c.due = now + RETRY_MIN * 60000;
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
