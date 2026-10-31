// changelog.js — «Yangiliklar» bo‘limi uchun ro‘yxat. Har yangilanishda ENG TEPAGA yangi yozuv qo‘shing
// va VERSION raqamini oshiring (shu ro‘yxatning birinchi elementi bilan bir xil bo‘lsin).
// add — nimalar qo‘shildi, chg — nimalar o‘zgardi, rem — nimalar olib tashlandi yoki kamaydi.
// Fayl o‘zgarganda sw.js dagi CACHE raqamini ham oshirishni unutmang.

export const CHANGELOG = [
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
