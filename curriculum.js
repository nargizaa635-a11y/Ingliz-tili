// curriculum.js — A1–B2 o‘quv xaritasi. Dars matni «content-*.js» fayllarida; bu yerda faqat tuzilma.
// Xarita darslar HAQIQIY mavjudligini ko‘rsatmaydi: mavjudligi content fayllaridan aniqlanadi.

export const LEVELS = ["A1", "A2", "B1", "B2"];
export const CONTENT_FILES = ["content-a1-u01.js"];

const L = (id, title) => ({ id, title });

export const CURRICULUM = [
  {
    level: "A1", name: "Boshlang‘ich", units: [
      { id: "a1-u01", title: "Tanishuv", goal: "Salomlashish, o‘zini tanishtirish, alifbo, raqamlar.", lessons: [
        L("a1-u01-l01", "Salomlashish"), L("a1-u01-l02", "O‘zim haqimda"), L("a1-u01-l03", "Alifbo, imlo va talaffuz"), L("a1-u01-l04", "Raqamlar 0–20 va telefon raqami")] },
      { id: "a1-u02", title: "«To be» fe’li", goal: "am / is / are: darak, inkor, savol.", lessons: [
        L("a1-u02-l01", "I am, you are"), L("a1-u02-l02", "He is, she is, it is"), L("a1-u02-l03", "We are, they are"), L("a1-u02-l04", "To be: inkor va savol")] },
      { id: "a1-u03", title: "Narsalar va odamlar", goal: "Artikllar, ko‘rsatish olmoshlari, ko‘plik, egalik.", lessons: [
        L("a1-u03-l01", "A / an va the"), L("a1-u03-l02", "This, that, these, those"), L("a1-u03-l03", "Ko‘plik shakli"), L("a1-u03-l04", "My, your, his, her…")] },
      { id: "a1-u04", title: "Oila va tavsif", goal: "Oila a’zolari, have/has, sifatlar, ’s.", lessons: [
        L("a1-u04-l01", "Oila a’zolari"), L("a1-u04-l02", "Have / has"), L("a1-u04-l03", "Sifatlar va ’s")] },
      { id: "a1-u05", title: "Kundalik odatlar", goal: "Present Simple va tezlik ravishlari.", lessons: [
        L("a1-u05-l01", "Present Simple: darak"), L("a1-u05-l02", "Present Simple: inkor"), L("a1-u05-l03", "Present Simple: savollar"), L("a1-u05-l04", "Always, usually, never…")] },
      { id: "a1-u06", title: "Vaqt va sanalar", goal: "Katta raqamlar, kunlar, oylar, soat.", lessons: [
        L("a1-u06-l01", "20–1000 va narx"), L("a1-u06-l02", "Hafta kunlari, oylar, sana"), L("a1-u06-l03", "Soat necha?")] },
      { id: "a1-u07", title: "Uy va joylar", goal: "There is/are, predloglar, uy.", lessons: [
        L("a1-u07-l01", "There is / there are"), L("a1-u07-l02", "In, on, under, next to"), L("a1-u07-l03", "Uy va xonalar")] },
      { id: "a1-u08", title: "Qila olish", goal: "Can / can’t, iltimos va takliflar.", lessons: [
        L("a1-u08-l01", "Can / can’t"), L("a1-u08-l02", "Iltimos va takliflar")] },
      { id: "a1-u09", title: "Ovqat va xarid", goal: "Ovqat, some/any, buyurtma, narx.", lessons: [
        L("a1-u09-l01", "Ovqat va ichimliklar"), L("a1-u09-l02", "Some, any, sanaladigan va sanalmaydigan"), L("a1-u09-l03", "Restoranda buyurtma"), L("a1-u09-l04", "Do‘konda: How much / How many")] },
      { id: "a1-u10", title: "Shahar va yo‘l", goal: "Joylar, yo‘l so‘rash, transport.", lessons: [
        L("a1-u10-l01", "Shahar joylari"), L("a1-u10-l02", "Yo‘l so‘rash va ko‘rsatish"), L("a1-u10-l03", "Transport")] },
      { id: "a1-u11", title: "Hozir nima qilyapman", goal: "Present Continuous, ob-havo, kiyim.", lessons: [
        L("a1-u11-l01", "Present Continuous"), L("a1-u11-l02", "Present Simple va Continuous farqi"), L("a1-u11-l03", "Ob-havo va kiyim")] },
      { id: "a1-u12", title: "O‘tgan va kelasi", goal: "Was/were, Past Simple, going to.", lessons: [
        L("a1-u12-l01", "Was / were"), L("a1-u12-l02", "Past Simple: to‘g‘ri fe’llar"), L("a1-u12-l03", "Past Simple: noto‘g‘ri fe’llar"), L("a1-u12-l04", "Past Simple: inkor va savol"), L("a1-u12-l05", "Going to: rejalar")] },
    ],
    finalAssessment: "A1 yakuniy test va zaif mavzular bo‘yicha qayta ishlash",
  },
  {
    level: "A2", name: "Elementar", units: [
      { id: "a2-u01", title: "O‘tgan zamon chuqurroq", goal: "Past Simple takrori, Past Continuous." },
      { id: "a2-u02", title: "Kelasi zamon", goal: "will, going to, rejalar va va’dalar." },
      { id: "a2-u03", title: "Taqqoslash", goal: "Comparative va superlative sifatlar." },
      { id: "a2-u04", title: "Miqdor", goal: "Sanaladigan/sanalmaydigan, quantifiers." },
      { id: "a2-u05", title: "Modal fe’llar", goal: "should, must, have to, iltimos va maslahat." },
      { id: "a2-u06", title: "Present Perfect asoslari", goal: "Tajriba va yaqinda bo‘lgan voqealar." },
      { id: "a2-u07", title: "Sayohat va transport", goal: "Bilet, mehmonxona, yo‘l-yo‘riq." },
      { id: "a2-u08", title: "Ish, sog‘liq, muammolar", goal: "Kundalik muammolarni hal qilish." },
      { id: "a2-u09", title: "Voqealarni hikoya qilish", goal: "Tajriba va voqealarni bog‘lab aytish." },
      { id: "a2-u10", title: "Xabar va qisqa matnlar", goal: "Xat, xabar, qisqa paragraf; A2 yakuniy test." },
    ],
  },
  {
    level: "B1", name: "O‘rta", units: [
      { id: "b1-u01", title: "Zamonlarda ishonch", goal: "Asosiy zamonlarni erkin tanlash." },
      { id: "b1-u02", title: "Present Perfect va Past Simple", goal: "Ikkalasining farqi." },
      { id: "b1-u03", title: "Shart gaplar", goal: "First va second conditional." },
      { id: "b1-u04", title: "Majhul nisbat", goal: "Passive voice asoslari." },
      { id: "b1-u05", title: "Ko‘chirma gap", goal: "Reported speech asoslari." },
      { id: "b1-u06", title: "Aniqlovchi gaplar", goal: "Relative clauses." },
      { id: "b1-u07", title: "Phrasal verbs va collocations", goal: "Tabiiy birikmalar." },
      { id: "b1-u08", title: "Fikr va dalil", goal: "Fikr bildirish va asoslash." },
      { id: "b1-u09", title: "Hikoya va ish ingliz tili", goal: "Hikoya qilish, intervyu." },
      { id: "b1-u10", title: "Uzun matnlar", goal: "Uzoqroq tinglash, o‘qish, yozish; B1 yakuniy test." },
    ],
  },
  {
    level: "B2", name: "O‘rta-yuqori", units: [
      { id: "b2-u01", title: "Zamon va aspekt", goal: "Murakkab zamon tanlovi." },
      { id: "b2-u02", title: "Taxminiy vaziyatlar", goal: "Conditionals, hypothetical." },
      { id: "b2-u03", title: "Passive va reported speech", goal: "Murakkab shakllar." },
      { id: "b2-u04", title: "Murakkab gaplar", goal: "Discourse markers." },
      { id: "b2-u05", title: "Nozik ma’no farqlari", goal: "Lug‘at va collocations." },
      { id: "b2-u06", title: "Tabiiy iboralar", goal: "Suhbat iboralari." },
      { id: "b2-u07", title: "Uzun audio", goal: "Murakkab nutqni tushunish." },
      { id: "b2-u08", title: "Xulosa va mavhum mavzular", goal: "Matnni qisqacha bayon qilish." },
      { id: "b2-u09", title: "Esse va hisobot", goal: "Tuzilgan yozma ishlar." },
      { id: "b2-u10", title: "Rolli suhbat; B2 yakuniy test", goal: "Mustaqil, spontan muloqot." },
    ],
  },
];

export function allLessonSlots() {
  const out = [];
  for (const lv of CURRICULUM) for (const u of lv.units) for (const l of u.lessons || []) out.push({ ...l, level: lv.level, unit: u.id });
  return out;
}
