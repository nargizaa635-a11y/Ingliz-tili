# Ingliz tili — shaxsiy o‘rgatuvchi (v0.1 poydevor)

Android telefonda ishlaydigan, to‘liq **bepul** ingliz tili ilovasi (A1 → B2 rejasi). Faqat HTML, CSS va JavaScript. Hisob ham, server ham, pullik xizmat ham kerak emas. O‘quv natijalari **faqat telefoningizda** (IndexedDB) saqlanadi.

> Holat: poydevor tayyor. A1 kursining 42 darsidan **4 tasi** yozilgan: 1-bo‘lim «Tanishuv» to‘liq (Salomlashish, O‘zim haqimda, Alifbo/imlo/talaffuz, Raqamlar 0–20 va telefon raqami). Qolgan 38 ta dars bosqichma-bosqich qo‘shiladi. To‘liq xarita: `ROADMAP.md`. Ilovadagi «Yana → Ilova haqida» sahifasida nima ishlashi va nima hali yo‘qligi ochiq yozilgan.

## 1. GitHub Pages’ga joylash (telefondan)

1. Chrome’da **github.com** ga kiring va hisobingizga kiring. Tugmalar ko‘rinmasa, Chrome menyusidan **«Desktop site»** (kompyuter versiyasi) ni yoqing.
2. **New repository** → nomi, masalan `ingliz-tili` → **Public** → **Create repository**.
3. Zip faylni telefondagi **Files** ilovasida oching (uzoq bosing → **Extract**). Ichidagi **hamma fayllar** (papka emas, fayllar) bitta joyda turadi.
4. Repozitoriyda **Add file → Upload files** → **choose your files** → Files ilovasida barcha fayllarni belgilang (25 ta fayl) → **Commit changes**.
   - Fayllar papkasiz, to‘g‘ridan-to‘g‘ri repozitoriyning asosiga yuklanishi kerak (`index.html` asosda turishi shart).
5. **Settings → Pages** → *Build and deployment* → **Deploy from a branch** → Branch: **main**, papka: **/(root)** → **Save**.
6. 1–2 daqiqadan keyin manzil chiqadi: `https://FOYDALANUVCHI.github.io/ingliz-tili/`. Shu manzilni Chrome’da oching.
7. Chrome menyusi (⋮) → **Add to Home screen / Install app**: ilova oddiy ilova kabi ochiladi va internetsiz ham ishlaydi (birinchi ochishdan keyin).

## 2. Yangilash (yangi dars qo‘shilganda)

1. Yangi/yangilangan fayllarni xuddi shu usulda **Upload files** orqali yuklang (bir xil nomli fayl almashtiriladi).
2. **`sw.js` faylini ham yuklang va unda kesh nomidagi raqamni oshiring (hozir `ingliz-tili-v2`, keyingi yangilashda `v3`…)** (GitHub’da faylni oching → qalam belgisi → o‘zgartiring → Commit). Aks holda telefon eski nusxani ko‘rsatib turadi.
3. Yangi darsni `curriculum.js` dagi `CONTENT_FILES` ro‘yxatiga va `sw.js` dagi `FILES` ro‘yxatiga qo‘shish kerak (men bergan har bir bosqichda buni aniq yozaman).
4. Ilovani ikki marta yangilang/yoping-oching: yangi versiya ikkinchi ochishda ko‘rinadi.

## 3. Ma’lumotlaringiz xavfsizligi

- Ma’lumot faqat shu telefondagi brauzerda turadi. Brauzer ma’lumotlarini tozalasangiz, ilovani o‘chirsangiz yoki boshqa telefonga o‘tsangiz, **yo‘qoladi**.
- **Yana → Sozlamalar → Zaxirani yuklab olish** orqali hafta sayin zaxira oling. Faylni Google Drive’ga yoki Telegram’ning «Saved Messages» ga yuboring.
- Tiklash: **Zaxiradan tiklash** → faylni tanlang. Yaroqsiz fayl rad etiladi.
- Ovoz yozuvlari saqlanmaydi va hech qayerga yuborilmaydi.

## 4. Fayllar (hammasi bitta papkada, papkasiz)

| Fayl | Vazifasi |
|---|---|
| `index.html`, `style.css`, `app.js` | Sahifa, ko‘rinish, ishga tushirish |
| `nav.js`, `ui.js`, `views.js`, `player.js` | Ekranlar, darslar, mashqlar |
| `engine.js` | Javoblarni tekshirish (qisqartmalar, muqobil javoblar) |
| `srs.js` | Takrorlash jadvali |
| `planner.js` | «Bugun nima o‘rganay?» rejasi |
| `learn.js` | Natijalar, xatolar, o‘zlashtirish mantiqi |
| `store.js`, `backup.js` | Saqlash (IndexedDB) va zaxira |
| `speech.js` | Inglizcha ovoz (brauzer) va ovoz yozish |
| `curriculum.js`, `diagnostic.js`, `content-a1-u01.js` | O‘quv xaritasi, boshlang‘ich test, darslar matni |
| `manifest.webmanifest`, `sw.js`, `icon-*.png` | O‘rnatish va oflayn ishlash |
| `test-logic.mjs`, `package.json`, `ROADMAP.md` | Mantiq testlari va o‘quv xaritasi |

Papkalar ishlatilmagan, chunki telefondan papka yuklash qiyin.

## 5. Nimalar tekshirilgan

Mantiq testlari (`node test-logic.mjs`, 32 ta) va haqiqiy brauzerda (Chromium, 360px telefon ekrani) avtomatik oqim testlari o‘tgan: dars oqimi, davom ettirish, tekshiruv, xatolar, takrorlash, reja, eksport/import, ovoz yozish (sinov mikrofoni), oflayn rejim. **Haqiqiy Android telefoningizda** esa ovoz sifati, mikrofon va o‘rnatishni o‘zingiz sinab, menga xabar bering.

## 6. Ma’lum cheklovlar

- Talaffuzni dastur baholamaydi: ishonchli bepul usul yo‘q. Siz o‘zingizni yozib, namuna bilan solishtirasiz.
- Inglizcha ovoz telefoningizdagi Google matn-nutq (Text-to-speech) ga bog‘liq. Ovoz chiqmasa, uni Google Play’dan o‘rnating/yangilang.
- Erkin yozuvni dastur tekshirmaydi; siz ro‘yxat bo‘yicha o‘zingizni tekshirasiz.
- Jonli AI suhbat hozircha yo‘q (keyingi bosqich; pullik xizmat va xavfsiz server kerak bo‘ladi).
