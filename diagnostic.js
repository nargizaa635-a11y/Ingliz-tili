// diagnostic.js — qisqa boshlang‘ich test (8 savol). Natija faqat tavsiya beradi; xato yozuvlari yaratmaydi.
export const DIAGNOSTIC = [
  { id: "d01", type: "choice", skill: "vocabulary", prompt: "«Hello» nimani anglatadi?", options: ["Salom", "Xayr", "Rahmat", "Kechirasiz"], answer: 0, why: "Hello — salom." },
  { id: "d02", type: "choice", skill: "vocabulary", prompt: "Ertalab uchrashganda nima deyiladi?", options: ["Good morning", "Good night", "Goodbye", "Thank you"], answer: 0, why: "Ertalab — Good morning." },
  { id: "d03", type: "choice", skill: "grammar", prompt: "Qaysi gap to‘g‘ri?", options: ["My name is Ali.", "My name Ali.", "I name is Ali.", "Name my is Ali."], answer: 0, why: "My name is Ali." },
  { id: "d04", type: "choice", skill: "grammar", prompt: "I ___ from Uzbekistan.", options: ["am", "is", "are", "be"], answer: 0, why: "I bilan am ishlatiladi." },
  { id: "d05", type: "choice", skill: "grammar", prompt: "She ___ a teacher.", options: ["is", "am", "are", "have"], answer: 0, why: "She bilan is ishlatiladi." },
  { id: "d06", type: "choice", skill: "grammar", prompt: "There ___ two books on the table.", options: ["are", "is", "am", "be"], answer: 0, why: "Ko‘plik (two books) bilan are ishlatiladi." },
  { id: "d07", type: "choice", skill: "grammar", prompt: "He ___ tea every morning.", options: ["drinks", "drink", "drinking", "to drink"], answer: 0, why: "He bilan Present Simple’da fe’lga -s qo‘shiladi: drinks." },
  { id: "d08", type: "choice", skill: "grammar", prompt: "Yesterday I ___ to school.", options: ["went", "go", "goes", "going"], answer: 0, why: "Go fe’lining o‘tgan zamon shakli: went." },
];

export function diagnosticAdvice(score, total) {
  const r = total ? score / total : 0;
  if (r < 0.5) return "Boshidan boshlash yaxshi. 1-darsdan boshlang va har dars oxiridagi tekshiruvni yordamsiz bajaring.";
  if (r < 0.85) return "Asoslarni bilasiz, lekin bo‘shliqlar bor. 1-darsdan boshlang: boshlang‘ich darslar tez o‘tadi, takrorlash esa bo‘shliqlarni to‘ldiradi.";
  return "Natija yaxshi. Hozircha faqat A1 ning boshlang‘ich darslari tayyor, shuning uchun 1-darsdan boshlang. Keyingi bo‘limlar qo‘shilgach, yuqoriroq joydan boshlash mumkin bo‘ladi.";
}
