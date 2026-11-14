# Ingliz tili — shaxsiy PWA (A1–B2 maqsadi)

Android uchun birinchi navbatda mo‘ljallangan, bepul, internetsiz ishlaydigan ingliz tili ilovasi. Oddiy HTML/CSS/JS (ES modullar), freymvorksiz. Ma’lumot telefonda (IndexedDB «ingliz-tili», v2).

## Hozirgi holat (v0.8.0)
- **A1 kursi:** 42 dars (`content-a1-*.js`), tushuntirish, mashqlar, yozish, yakuniy test.
- **A2 kursi:** to‘liq yozilgan — 10 birlik, 38 dars (`content-a2-u01a.js` … `content-a2-u10.js`). Fayllar agentlar bilan yozilgan; tilshunoslik jihatidan tekshirish va telefonda sinash kerak.
- **B1 kursi:** to‘liq yozilgan — 10 birlik, 40 dars (`content-b1-u01a.js` … `content-b1-u10b.js`). Jami 120 dars (A1 42 + A2 38 + B1 40). Tilshunoslik jihatidan tekshirish (tarjima, IPA) va telefonda sinash kerak.
- **Mening so‘zlarim:** Lug‘atdan tanlangan so‘zlar (`meta.myWords`, sevimlilardan alohida): O‘rganish, Mashq qilish, yozma Bilimni tekshirish, natijalar jadvali, xatolarni qayta ishlash. Natijalar faqat mavjud SRS kartalariga yoziladi (`mywords.js`, `mywordslogic.js`). Eski «So‘zlarim» bo‘limi «Dars so‘zlari» deb nomlandi.
- **Yakuniy testlar:** A1 va A2 uchun alohida (`finallogic.js`, `final.js`); natija tarixi har daraja uchun alohida saqlanadi.
- **Talaffuzni tekshirish:** Gapirish mashqlarida «Gapiring — tekshiraman» — Chrome nutqni tanish (Web Speech API) orqali gap namunaga solishtiriladi, foiz va tushib qolgan so‘zlar ko‘rsatiladi (`pronounce.js`, `recognize.js`). Odatda internet kerak; telefonda inglizcha paket yuklangan bo‘lsa, internetsiz ham ishlashi mumkin.
- **Qisqartmalar:** I'm / don't / won't / she'll / he's kabi qisqartmalar to‘liq shakl bilan teng qabul qilinadi ('s → is/has, 'd → would/had — kontekst bo‘yicha).
- **Bugun** bosh sahifasi, **Kurs** (erkin/ketma-ket tartib), **Takror** (SRS), **Gapirish**, **Lug‘at**, **Yana** (Sozlamalar, Yangiliklar, Pomodoro, Xotira saroyi…).
- **Lug‘at:** 1543 so‘z (dars so‘zlari 1087 + qo‘shimcha ro‘yxatlardan dars so‘zlariga takrorlanmaganlari), har birida IPA, misol, daraja (A1/A2/B1), mavzu. Qidiruv, daraja/mavzu filtri, sevimlilar.
- **So‘z kartochkalari:** rasm → inglizcha / o‘zbekcha, javob yashirin, SRS ga yoziladi, oldingi/keyingi, filtrlar, qiyin so‘zlar, seansni davom ettirish.
- **Rasmlar:** o‘z SVG chizmalari (`images-1..3.js`, 228 chizma → 234 so‘z). 240 so‘zda emoji, 539 ta (mavhum so‘z) da harfli kartochka. Hammasi rasmli emas.
- **Dizayn:** CSS o‘zgaruvchilar, yorug‘/tungi/tizim rejimi (saqlanadi).
- **Yangiliklar:** `changelog.js` + yangilanish xabari.
- **Oflayn:** `sw.js` (kesh v19), o‘rnatish atomik — yangi versiya to‘liq yuklanmasa eskisi qoladi.

## Fayllar
| Fayl | Vazifa |
|---|---|
| index.html, style.css, app.js, nav.js, ui.js, views.js | qobiq, dizayn, marshrutlar, ekranlar |
| store.js, backup.js, srs.js, learn.js, engine.js | ma’lumot, zaxira, takrorlash, mashqlar |
| curriculum.js, content-a1-*.js, content-a2-*.js, content-b1-*.js | kurs va darslar |
| vocab-a1.js, vocab-a2.js, vocabdata.js | qo‘shimcha lug‘at va tahlil |
| lugat.js, lugatlogic.js | Lug‘at ekrani |
| mywords.js, mywordslogic.js | Mening so‘zlarim |
| cards.js, cardslogic.js | So‘z kartochkalari |
| imagelib.js, images-1..3.js | SVG rasmlar |
| final.js, finallogic.js | A1/A2/B1 yakuniy testlar |
| pronounce.js, recognize.js | talaffuzni baholash va nutqni tanish |
| changelog.js | Yangiliklar |
| sw.js, manifest.webmanifest | oflayn va o‘rnatish |
| test-logic.mjs, test-new.mjs, test-v05.mjs | avtomatik testlar |
| .github/workflows/test.yml | GitHub Actions: testlar va fayl hajmi tekshiruvi |

## Testlar
`npm test` → 73 + 56 + 17 test. Har bir push va PR da GitHub Actions avtomatik ishga tushiradi (Actions bo‘limida yashil/qizil belgi); 80 KB dan katta fayl bo‘lsa xato beradi, 75 KB dan kattasiga ogohlantiradi. (Brauzer testlari Playwright bilan alohida o‘tkazilgan: 70 tekshiruv.)
Haqiqiy Android telefonda sinov — qo‘lda.

## Yangilash tartibi (telefondan)
1. O‘zgargan fayllarni GitHub → **Add file → Upload files** orqali yuklang (matn yopishtirmang).
2. Har bir kontent fayli ~80 KB dan kichik bo‘lsin.
3. Fayl qo‘shilsa/o‘zgarsa `sw.js` dagi `CACHE` raqamini oshiring va yangi faylni `FILES` ro‘yxatiga qo‘shing.
4. `changelog.js` ning tepasiga yangi yozuv qo‘shing va `VERSION` ni oshiring.
5. Xavfli o‘zgarishdan oldin Sozlamalar → Zaxira nusxa oling.
