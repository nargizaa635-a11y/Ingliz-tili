// recognize.js — brauzerning ovozni tanish funksiyasi (Web Speech API, SpeechRecognition). Bepul, kalit kerak emas.
// Tartib: 1) qurilmaning o‘zida (til paketi o‘rnatilgan bo‘lsa, internetsiz, ovoz telefondan chiqmaydi);
//         2) aks holda brauzer xizmati orqali (Chrome’da Google serveri, INTERNET KERAK).
// Hech biri ishlamasa, ilova buzilmaydi: ovoz yozib, o‘zini baholash usuli qoladi.

const LANG = "en-US";

function Ctor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/** Brauzerda ovozni tanish umuman bormi. */
export function recognitionSupported() { return !!Ctor(); }

/**
 * Qurilmadagi (oflayn) tanish holati: "available" | "downloadable" | "downloading" | "unavailable" | "unsupported".
 * Eski brauzerlarda bu imkoniyat yo‘q — "unsupported".
 */
export async function localStatus() {
  const C = Ctor();
  if (!C || typeof C.available !== "function") return "unsupported";
  try { return await C.available({ langs: [LANG], processLocally: true }); }
  catch { return "unavailable"; }
}

/** Inglizcha til paketini yuklab olishni so‘raydi (tugma bosilganda chaqirilishi kerak). true — o‘rnatildi. */
export async function installLocal() {
  const C = Ctor();
  if (!C || typeof C.install !== "function") return false;
  try { return !!(await C.install({ langs: [LANG], processLocally: true })); }
  catch { return false; }
}

const ERR = {
  "no-speech": "Ovoz eshitilmadi. Telefonni yaqinroq tutib, qayta urining.",
  "audio-capture": "Mikrofon topilmadi yoki band.",
  "not-allowed": "Mikrofonga ruxsat berilmadi. Brauzer sozlamalarida bu sayt uchun mikrofonni yoqing.",
  "service-not-allowed": "Bu qurilmada ovozni tanish xizmati o‘chirilgan.",
  "network": "Ovozni tanish uchun internet kerak. Internetni yoqing yoki ovoz yozib, o‘zingizni baholang.",
  "language-not-supported": "Inglizcha til paketi o‘rnatilmagan.",
  "aborted": "Tekshirish to‘xtatildi.",
};
export function recognitionErrorMessage(code) { return ERR[code] || "Ovozni tanib bo‘lmadi (" + code + ")."; }

/**
 * Bitta gapni tinglaydi. Qaytaradi: { alternatives: [{ text, confidence }], local: boolean }.
 * Xato bo‘lsa { error: kod, message } bilan reject qiladi. onInterim(text) — gapirayotganda oraliq matn.
 * Natija .stop() bilan erta tugatilishi mumkin: qaytgan obyektda { done: Promise, stop(), abort() }.
 */
export function listenOnce({ onInterim, preferLocal = true } = {}) {
  const C = Ctor();
  if (!C) return { done: Promise.reject({ error: "unsupported", message: "Bu brauzerda ovozni tanish yo‘q." }), stop() {}, abort() {} };
  let rec = null;
  let aborted = false;
  const run = (local) => new Promise((resolve, reject) => {
    rec = new C();
    rec.lang = LANG;
    rec.interimResults = true;
    rec.maxAlternatives = 5;
    rec.continuous = false;
    if (local) { try { rec.processLocally = true; } catch { local = false; } }
    let final = null, settled = false;
    rec.onresult = (e) => {
      const res = e.results[e.results.length - 1];
      if (res.isFinal) final = [...res].map((a) => ({ text: a.transcript.trim(), confidence: a.confidence || 0 }));
      else if (onInterim) onInterim(res[0].transcript);
    };
    rec.onerror = (e) => { if (!settled) { settled = true; reject({ error: e.error, message: recognitionErrorMessage(e.error) }); } };
    rec.onend = () => {
      if (settled) return;
      settled = true;
      if (final && final.some((a) => a.text)) resolve({ alternatives: final, local });
      else reject({ error: "no-speech", message: recognitionErrorMessage("no-speech") });
    };
    try { rec.start(); } catch (err) { settled = true; reject({ error: "start", message: "Tinglashni boshlab bo‘lmadi: " + ((err && err.message) || err) }); }
  });
  const done = (async () => {
    const local = preferLocal && (await localStatus()) === "available";
    if (aborted) throw { error: "aborted", message: recognitionErrorMessage("aborted") };
    if (!local) return run(false);
    try { return await run(true); }
    catch (e) {
      // Qurilmadagi tanish ishlamasa (paket yo‘q yoki xizmat o‘chiq) — bir marta internet orqali urinib ko‘riladi.
      if (e && (e.error === "language-not-supported" || e.error === "service-not-allowed") && !aborted) return run(false);
      throw e;
    }
  })();
  return { done, stop() { try { rec && rec.stop(); } catch { /* ignore */ } }, abort() { aborted = true; try { rec && rec.abort(); } catch { /* ignore */ } } };
}
