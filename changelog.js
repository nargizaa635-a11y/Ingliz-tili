// changelog.js — «Yangiliklar» bo‘limi uchun ro‘yxat. Har yangilanishda ENG TEPAGA yangi yozuv qo‘shing
// va VERSION raqamini oshiring (shu ro‘yxatning birinchi elementi bilan bir xil bo‘lsin).
// add — nimalar qo‘shildi, chg — nimalar o‘zgardi, rem — nimalar olib tashlandi yoki kamaydi.
// Fayl o‘zgarganda sw.js dagi CACHE raqamini ham oshirishni unutmang.

export const CHANGELOG = [
  {
    version: "0.4.0", date: "2026-11-03", title: "A2 kursi to‘liq: 10 birlik, 38 dars",
    add: [
      "A2 2–10 birliklar — 33 yangi dars: Kelasi zamon (will, going to, Present Continuous reja), Taqqoslash, Miqdor, Modal fe’llar, Present Perfect asoslari, Sayohat, Ish va sog‘liq, Hikoya qilish, Xabar va qisqa matnlar.",
      "Har darsda tushuntirish, 8 ta yangi so‘z, o‘qish, 24 ta mashq, tinglash, gapirish va yozish.",
      "Lug‘atga A2 darslaridan 264 ta yangi so‘z (IPA bilan) qo‘shildi; so‘zlar mavzu va daraja bo‘yicha filtrlanadi.",
    ],
    chg: [
      "Jami so‘zlar soni 1224 ga yetdi; lug‘atdagi A2 so‘zlari darajasi darsning raqamidan aniqlanadi.",
    ],
    rem: [],
  },
  {
    version: "0.3.0", date: "2026-11-01", title: "A2 kursi boshlandi: Past Continuous, while/when, used to",
    add: [
      "A2 1-birlik «O‘tgan zamon chuqurroq» — 5 yangi dars: Past Continuous (darak, inkor, savol), while va when, voqealar ketma-ketligi (first, then, after that…), used to.",
      "Har darsda tushuntirish, 8 ta yangi so‘z, o‘qish, mashqlar, tinglash, gapirish, yozish va yordamsiz tekshiruv.",
      "Lug‘atga A2 darslaridan 40 ta yangi so‘z (IPA bilan) qo‘shildi.",
    ],
    chg: [
      "O‘quv xaritasida keyingi birliklar maqsadi yangilandi: Present Continuous (reja), must/mustn’t, Past Perfect, Zero conditional, Passive shakllari.",
    ],
    rem: [],
  },
  {
    version: "0.2.1", date: "2026-10-31", title: "Kartochkalardagi noto‘g‘ri belgilar tuzatildi",
    add: [],
    chg: [
      "Ma’nosiga mos kelmaydigan emojilar (masalan «want» uchun) olib tashlandi: bunday so‘zlarda harfli kartochka chiqadi va ular rasm kartochkalariga kirmaydi.",
    ],
    rem: [],
  },
  {
    version: "0.2.0", date: "2026-10-31", title: "Yangi dizayn, kartochkalar va katta lug‘at",
    add: [
      "«So‘z kartochkalari»: rasm → inglizcha yoki rasm → o‘zbekcha. Javob o‘zingiz ochmaguncha yashirin, baholash mavjud takrorlash tizimiga yoziladi.",
      "Lug‘at: yangi so‘zlar qo‘shildi, har so‘zda daraja (A1/A2) va mavzu bor, daraja va mavzu bo‘yicha saralash mumkin.",
      "So‘zlar uchun bir xil uslubdagi rasmlar (internetsiz ishlaydi). Rasmi yo‘q so‘zlarda harfli kartochka chiqadi.",
      "Yorug‘ / tungi / tizim rejimini tanlash (Sozlamalar → Ko‘rinish).",
      "«Yangiliklar» bo‘limi va ilova yangilanganda xabar.",
      "Bugun sahifasida «Davom etish» kartasi va Lug‘at / Kartochkalarga tezkor kirish.",
    ],
    chg: [
      "Ranglar, masofalar va tugma o‘lchamlari yagona dizayn tizimiga o‘tkazildi; asosiy tugmalar kamida 44 px.",
      "Sozlamalar mantiqiy guruhlarga ajratildi.",
      "Oflayn kesh endi yangi versiyani to‘liq yuklab bo‘lmasa, eski ishlaydigan versiyani saqlab qoladi.",
    ],
    rem: [],
  },
];

export const VERSION = CHANGELOG[0].version;

/** Ko‘rilmagan yangilik bormi? seen — oxirgi ko‘rilgan versiya (yoki null). */
export function hasUnseen(seen) { return seen !== VERSION; }
