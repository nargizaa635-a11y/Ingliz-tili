// speech.js — inglizcha ovoz (brauzer TTS) va ovoz yozish (MediaRecorder). Hech narsa serverga yuborilmaydi.

export function ttsAvailable() {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

let voices = [];
function loadVoices() { try { voices = window.speechSynthesis.getVoices() || []; } catch { voices = []; } }

export function initTTS() {
  if (!ttsAvailable()) return;
  loadVoices();
  try { window.speechSynthesis.addEventListener("voiceschanged", loadVoices); } catch { /* ignore */ }
}

export function speak(text, { rate = 0.9 } = {}) {
  if (!ttsAvailable()) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    const v = voices.find((x) => /^en[-_]US/i.test(x.lang)) || voices.find((x) => /^en/i.test(x.lang));
    if (v) u.voice = v;
    u.rate = rate;
    window.speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}

export function stopSpeaking() { try { if (ttsAvailable()) window.speechSynthesis.cancel(); } catch { /* ignore */ } }

export function canRecord() {
  return typeof navigator !== "undefined" && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && typeof MediaRecorder !== "undefined";
}

/** Yozishni boshlaydi. { stop(): Promise<Blob>, cancel() } qaytaradi. Xatoda tashlaydi. */
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const done = new Promise((resolve) => {
    rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); resolve(new Blob(chunks, { type: rec.mimeType || "audio/webm" })); };
  });
  rec.start();
  return {
    stop() { if (rec.state !== "inactive") rec.stop(); return done; },
    cancel() { try { if (rec.state !== "inactive") rec.stop(); stream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ } },
  };
}

export function micErrorMessage(e) {
  const n = e && e.name;
  if (n === "NotAllowedError" || n === "SecurityError") return "Mikrofonga ruxsat berilmadi. Brauzer sozlamalarida bu sayt uchun mikrofonni yoqing va qayta urining.";
  if (n === "NotFoundError" || n === "OverconstrainedError") return "Mikrofon topilmadi.";
  if (n === "NotReadableError") return "Mikrofon boshqa ilova tomonidan band. Uni yoping va qayta urining.";
  return "Yozishni boshlab bo‘lmadi: " + ((e && e.message) || "noma’lum xato");
}
