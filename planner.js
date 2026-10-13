// planner.js — «Bugun nima o‘rganay?» rejasi. Faqat saqlangan haqiqiy ma’lumotlardan foydalanadi.
import { dueCards } from "./srs.js";

export const TIME_CHOICES = [10, 20, 30, 45, 60, 90, 120, 180];
export const SKILL_NAMES = {
  grammar: "Grammatika", vocabulary: "Lug‘at", listening: "Tinglash", reading: "O‘qish",
  speaking: "Gapirish", writing: "Yozish",
};
const REVIEW_MIN = { vocab: 0.4, error: 0.9, other: 0.5 };

/** Ko‘nikmalar bo‘yicha oxirgi urinishlardan statistika. Diagnostika va audiosiz urinishlar hisobga olinmaydi. */
export function skillStats(attempts, last = 40) {
  const out = {};
  for (const a of attempts) {
    if (a.phase === "diagnostic" || a.noAudio || !a.skill) continue;
    (out[a.skill] ||= []).push(a);
  }
  const res = {};
  for (const [skill, list] of Object.entries(out)) {
    const recent = list.slice(-last);
    const graded = recent.filter((a) => a.selfRating == null);
    const right = graded.filter((a) => a.correct && !a.hint).length;
    res[skill] = { total: list.length, recent: graded.length, accuracy: graded.length ? right / graded.length : null, practiced: list.length };
  }
  return res;
}

export function weakestSkill(stats, minAttempts = 5) {
  let best = null;
  for (const [skill, s] of Object.entries(stats)) {
    if (s.accuracy == null || s.recent < minAttempts) continue;
    if (!best || s.accuracy < best.accuracy) best = { skill, accuracy: s.accuracy };
  }
  return best;
}

/** Keyingi o‘rganiladigan dars: avval boshlangan, so‘ng tartib bo‘yicha birinchi tugallanmagan. */
export function nextLessons(order, status, max = 1) {
  const done = (id) => status[id] && status[id].status === "completed";
  const inprog = order.filter((l) => l.implemented && status[l.id] && status[l.id].status === "inprogress");
  const fresh = order.filter((l) => l.implemented && !done(l.id) && !(status[l.id] && status[l.id].status === "inprogress"));
  const ready = fresh.filter((l) => (l.prereq || []).every(done));
  return [...inprog, ...ready].slice(0, max);
}

/**
 * ctx: { minutes, now, cards[], lessonOrder[{id,title,minutes,implemented,prereq}], status{id:{status}},
 *        attempts[], diagnosticDone:boolean, drillPool:{skill:count} }
 */
export function buildPlan(ctx) {
  const { minutes, now = Date.now() } = ctx;
  const cards = ctx.cards || [];
  const status = ctx.status || {};
  const completedCount = Object.values(status).filter((s) => s.status === "completed").length;
  const hasHistory = completedCount > 0 || cards.length > 0 || (ctx.attempts || []).some((a) => a.phase !== "diagnostic");
  const items = [];
  const reasons = [];
  let left = minutes;
  const add = (it) => { items.push(it); left -= it.minutes; };

  // 1) Tarix yo‘q: diagnostika + kirish darsi
  if (!hasHistory) {
    if (!ctx.diagnosticDone) {
      add({ type: "diagnostic", minutes: 5, label: "Qisqa boshlang‘ich test", why: "Hali tarixingiz yo‘q — avval darajangizni taxminan bilib olamiz." });
    }
    const first = nextLessons(ctx.lessonOrder, status, 1)[0];
    if (first && left >= Math.min(first.minutes, 15) * 0.9) {
      add({ type: "lesson", lessonId: first.id, minutes: first.minutes, label: `Dars: ${first.title}`, why: "Kursning birinchi darsi." });
    } else if (first) {
      reasons.push("Vaqt dars uchun yetarli emas — dars keyingi safar.");
    }
    return finish(items, reasons, minutes);
  }

  // 2) Avval dars uchun vaqt ajratamiz (reja vaqtdan oshib ketmasligi uchun)
  const lessonCount = minutes >= 90 ? 2 : minutes >= 20 ? 1 : 0;
  const picks = [];
  let reserve = 0;
  if (lessonCount) {
    for (const l of nextLessons(ctx.lessonOrder, status, lessonCount)) {
      if (minutes - reserve - l.minutes >= 2) { picks.push(l); reserve += l.minutes; }
      else reasons.push("Dars uchun vaqt yetmadi.");
    }
  }

  // 3) Muddati kelgan takrorlashlar (byudjetning ~40%, dars joyini bosmaydi)
  const due = dueCards(cards, now);
  if (due.length) {
    const cap = Math.max(1.5, Math.min(minutes * 0.4, minutes - reserve));
    let used = 0; const ids = [];
    for (const c of due) {
      const m = c.kind === "error" ? REVIEW_MIN.error : c.kind === "vocab-rec" || c.kind === "vocab-prod" ? REVIEW_MIN.vocab : REVIEW_MIN.other;
      if (used + m > cap && ids.length) break;
      used += m; ids.push(c.id);
    }
    const errs = ids.filter((id) => id.startsWith("e:")).length;
    add({ type: "review", cardIds: ids, minutes: Math.max(1, Math.round(used)), label: `Takrorlash: ${ids.length} ta`, why: errs ? `Muddati kelgan kartalar, shu jumladan ${errs} ta xato.` : "Muddati kelgan kartalar." });
  } else {
    reasons.push("Hozir muddati kelgan takrorlash yo‘q.");
  }

  // 3b) Yangi dars(lar)
  for (const l of picks) {
    const resume = status[l.id] && status[l.id].status === "inprogress";
    add({ type: "lesson", lessonId: l.id, minutes: l.minutes, label: `${resume ? "Davom: " : "Dars: "}${l.title}`, why: resume ? "Boshlangan darsni tugatamiz." : "Kursdagi keyingi dars." });
  }

  // 4) Eng zaif ko‘nikma bo‘yicha maqsadli mashq
  const weak = weakestSkill(skillStats(ctx.attempts || []));
  const pool = ctx.drillPool || {};
  if (weak && (pool[weak.skill] || 0) >= 3 && left >= 3) {
    const n = minutes >= 45 ? 8 : 5;
    add({ type: "drill", skill: weak.skill, count: n, minutes: 3, label: `Maqsadli mashq: ${SKILL_NAMES[weak.skill] || weak.skill}`, why: `Oxirgi urinishlarda eng past natija shu ko‘nikmada (${Math.round(weak.accuracy * 100)}%).` });
  }

  // 5) Gapirish
  if (minutes >= 20 && left >= 4) {
    add({ type: "speak", count: 1, minutes: 4, label: "Gapirish mashqi", why: "Asosiy maqsad — gapirish. Har kuni oz bo‘lsa ham." });
    if (minutes >= 90 && left >= 8) add({ type: "speak", count: 1, minutes: 4, label: "Yana bir gapirish mashqi", why: "Ko‘proq vaqt bor — gapirishga ko‘proq e’tibor." });
  } else if (minutes < 20 && left >= 2) {
    add({ type: "speak", count: 1, minutes: 2, mini: true, label: "Qisqa gapirish: bitta gap", why: "Qisqa kunda ham gapirishni qoldirmaymiz." });
  }

  // 6) Tinglash
  if (minutes >= 30 && left >= 3 && (pool.listening || 0) >= 1) {
    add({ type: "listen", count: 5, minutes: 3, label: "Tinglab tushunish", why: "Tinglash ko‘nikmasi uchun." });
  }

  // 7) Yakuniy qisqa tekshiruv
  if (minutes >= 45 && left >= 4 && completedCount > 0) {
    add({ type: "check", count: 6, minutes: 4, label: "Yakuniy qisqa tekshiruv", why: "O‘tgan darslardan yordamsiz tekshiruv." });
  }

  // 8) Uzoq sessiyada tanaffus
  if (minutes >= 120) {
    const total = items.reduce((s, i) => s + i.minutes, 0);
    if (total >= 40) items.splice(Math.min(items.length, 2), 0, { type: "break", minutes: 5, label: "Tanaffus (5 daqiqa)", why: "Uzoq o‘qishda dam olish xotirani yaxshilaydi." });
  }

  if (!items.length) reasons.push("Hozircha qiladigan amalga oshirilgan dars yoki takrorlash yo‘q.");
  return finish(items, reasons, minutes);
}

function finish(items, reasons, minutes) {
  const total = items.reduce((s, i) => s + i.minutes, 0);
  return { minutes, items, totalMinutes: total, reasons };
}
