# Ingliz tili — shaxsiy PWA (A1–B2 maqsadi)

Android uchun birinchi navbatda mo‘ljallangan, bepul, internetsiz ishlaydigan ingliz tili ilovasi. Oddiy HTML/CSS/JS (ES modullar), freymvorksiz. Ma’lumot telefonda (IndexedDB «ingliz-tili», v2).

## Hozirgi holat (v0.4.0)
- **A1 kursi:** 42 dars (`content-a1-*.js`), tushuntirish, mashqlar, yozish, yakuniy test.
- **A2 kursi:** to‘liq yozilgan — 10 birlik, 38 dars (`content-a2-u01a.js` … `content-a2-u10.js`). Fayllar agentlar bilan yozilgan; tilshunoslik jihatidan tekshirish va telefonda sinash kerak.
- **Bugun** bosh sahifasi, **Kurs** (erkin/ketma-ket tartib), **Takror** (SRS), **Gapirish**, **Lug‘at**, **Yana** (Sozlamalar, Yangiliklar, Pomodoro, Xotira saroyi…).
- **Lug‘at:** 1224 so‘z (dars so‘zlari 767 + qo‘shimcha ro‘yxatlardan dars so‘zlariga takrorlanmaganlari), har birida IPA, misol, daraja (A1/A2), mavzu. Qidiruv, daraja/mavzu filtri, sevimlilar.
- **So‘z kartochkalari:** rasm → inglizcha / o‘zbekcha, javob yashirin, SRS ga yoziladi, oldingi/keyingi, filtrlar, qiyin so‘zlar, seansni davom ettirish.
- **Rasmlar:** o‘z SVG chizmalari (`images-1..3.js`, 228 chizma → 234 so‘z). 240 so‘zda emoji, 539 ta (mavhum so‘z) da harfli kartochka. Hammasi rasmli emas.
- **Dizayn:** CSS o‘zgaruvchilar, yorug‘/tungi/tizim rejimi (saqlanadi).
- **Yangiliklar:** `changelog.js` + yangilanish xabari.
- **Oflayn:** `sw.js` (kesh v18), o‘rnatish atomik — yangi versiya to‘liq yuklanmasa eskisi qoladi.

## Fayllar
| Fayl | Vazifa |
|---|---|
| index.html, style.css, app.js, nav.js, ui.js, views.js | qobiq, dizayn, marshrutlar, ekranlar |
| store.js, backup.js, srs.js, learn.js, engine.js | ma’lumot, zaxira, takrorlash, mashqlar |
| curriculum.js, content-a1-*.js, content-a2-*.js | kurs va darslar |
| vocab-a1.js, vocab-a2.js, vocabdata.js | qo‘shimcha lug‘at va tahlil |
| lugat.js, lugatlogic.js | Lug‘at ekrani |
| cards.js, cardslogic.js | So‘z kartochkalari |
| imagelib.js, images-1..3.js | SVG rasmlar |
| changelog.js | Yangiliklar |
| sw.js, manifest.webmanifest | oflayn va o‘rnatish |
| test-logic.mjs, test-new.mjs | avtomatik testlar |

## Testlar
`npm test` → 73 + 30 test. (Brauzer testlari Playwright bilan alohida o‘tkazilgan: 70 tekshiruv.)
Haqiqiy Android telefonda sinov — qo‘lda.

## Yangilash tartibi (telefondan)
1. O‘zgargan fayllarni GitHub → **Add file → Upload files** orqali yuklang (matn yopishtirmang).
2. Har bir kontent fayli ~80 KB dan kichik bo‘lsin.
3. Fayl qo‘shilsa/o‘zgarsa `sw.js` dagi `CACHE` raqamini oshiring va yangi faylni `FILES` ro‘yxatiga qo‘shing.
4. `changelog.js` ning tepasiga yangi yozuv qo‘shing va `VERSION` ni oshiring.
5. Xavfli o‘zgarishdan oldin Sozlamalar → Zaxira nusxa oling.
