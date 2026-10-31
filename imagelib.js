// imagelib.js — so‘z rasmlari: bir uslubdagi oddiy SVG, mavzu bo‘yicha bo‘lingan fayllarda, kerak bo‘lganda yuklanadi.
//
// Nega bunday: telefondan yuzlab alohida fayl yuklash qiyin, bitta ulkan fayl esa yuklanmay qolishi mumkin.
// Shuning uchun rasmlar 3 ta kichik faylda (images-1.js, images-2.js, images-3.js) qisqa «chizma yozuvi» ko‘rinishida saqlanadi
// va shu yerda bir xil uslubda SVG ga aylantiriladi. Hamma rasm bitta palitradan chiziladi, shuning uchun uslub bir xil.
// Rasm topilmasa yoki buzuq bo‘lsa, ilova buzilmaydi: emoji yoki harfli kartochka ko‘rsatiladi.
//
// Chizma yozuvi (operatsiyalar «;» bilan ajratiladi, argumentlar bo‘shliq bilan; oxirgi argument — rang kaliti):
//   bg K            fon rangi (majburiy, birinchi)         g CX RX     yer soyasi (ixtiyoriy joy/kenglik)   ng  soyasiz
//   r X Y W H C [R] to‘rtburchak                            c CX CY R C  aylana                               e CX CY RX RY C  ellips
//   p X,Y X,Y … C   ko‘pburchak                             d YO‘L C     to‘ldirilgan yo‘l (probelsiz)       l YO‘L C [QALINLIK]  chiziq
// Koordinatalar 0–100. Yo‘l yozuvida bo‘shliq o‘rniga vergul ishlatiladi: M10,10C20,20,30,30,40,40Z

const BG = { r: ["#FDE8E4", "#F4C9C2"], b: ["#E3EEFB", "#C3D6F0"], a: ["#FFF1D6", "#F1DBA9"], g: ["#E4F6EE", "#BFE3D3"], p: ["#EDE9FB", "#D3CCF2"],
  n: ["#F6EDE3", "#E6D3BC"], k: ["#FCE8F1", "#F1C9DC"], s: ["#EEF0F4", "#D5D9E2"], t: ["#DFF3F1", "#BDE3DF"], y: ["#FFF8D6", "#F0E3A8"] };
const PAL = { R: "#E5484D", r: "#F58A8D", E: "#B63A44", O: "#E8803A", o: "#F5B66B", A: "#F2A93B", a: "#FBD58A", Y: "#F7D154", y: "#FCEBA6",
  G: "#4CAF6A", g: "#A8DBB5", H: "#2E8F5A", T: "#3DAE8C", t: "#BFE3D3", B: "#4F7FD1", b: "#8FB4E8", L: "#DCE7F7", N: "#35539A",
  P: "#8B7BEA", p: "#C9C2F5", K: "#E58AB0", k: "#F7C5D9", M: "#7A4A2B", m: "#C58B52", n: "#D9A066", u: "#EBC48E",
  D: "#3B4256", S: "#9AA3B5", s: "#D9DEE8", W: "#FFFFFF", w: "#F4F5FF", F: "#F2C9A0", f: "#E0A97A" };

export const SHARD_FILES = { 1: "images-1.js", 2: "images-2.js", 3: "images-3.js" };

/* ----- INDEKS (avtomatik yaratiladi: har bir fayldagi rasm kalitlari). Testlar fayllar bilan mosligini tekshiradi. ----- */
// INDEX-BOSHI
const INDEX = {
  1: "apple orange banana grape lemon melon watermelon carrot cucumber pepper garlic tomato potato " +
    "onion bread rice meat chicken fish soup salad water glass juice fruit plov coffee tea milk egg " +
    "sugar salt butter cheese sandwich pizza burger noodles cake biscuit chocolate ice-cream honey " +
    "jam yogurt oil flour nut soda green-tea black-tea bottle vegetables sausage",
  2: "book pen bag table chair door window key cup watch notebook pencil bed lamp sofa computer " +
    "picture flower clock shelf carpet curtain fridge spoon fork knife plate bowl pot pillow blanket " +
    "towel soap toothbrush mirror tv wardrobe stairs shower stove oven sink mobile-phone battery " +
    "charger headphones camera photo video message email wifi mouse keyboard printer laptop map " +
    "ticket shirt jacket coat hat shoes gloves helmet safety-vest dictionary board page lock tape " +
    "scanner barcode label pallet rack forklift trolley conveyor-belt box file cash card receipt menu " +
    "shopping-bag umbrella light app internet",
  3: "house room kitchen bathroom garden balcony school village river bridge park cinema shop bank " +
    "hospital pharmacy library museum supermarket hotel station mosque theatre restaurant plane gym " +
    "stadium factory office post-office police-station bus-stop road square traffic-light crossroads " +
    "bus train taxi car metro truck van motorbike ship boat bike warehouse courier ambulance fuel " +
    "engine city university doctor nurse teacher student engineer worker chef farmer policeman seller " +
    "tourist singer artist baby boy girl man woman child grandmother grandfather driver dog cat tree " +
    "sunny cloudy rainy snowy windy",
};
// INDEX-OXIRI

/** Boshqa so‘zlar uchun bir xil rasm (masalan, beef → meat). */
export const ALIAS = { beef: "meat", lamb: "meat", dessert: "cake", smartphone: "mobile-phone", flat: "house", home: "house" };

export const IMAGE_KEYS = new Map();
for (const [shard, list] of Object.entries(INDEX)) for (const k of list.split(/\s+/).filter(Boolean)) IMAGE_KEYS.set(k, Number(shard));

/** So‘z kalitiga (slug) mos rasm kaliti yoki null. */
export function imageKeyOf(slugKey) {
  const k = ALIAS[slugKey] || slugKey;
  return IMAGE_KEYS.has(k) ? k : null;
}

const num = (s) => /^-?\d+(\.\d+)?$/.test(s);
const PATH_OK = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\-]+$/;

/** Chizma yozuvini SVG matniga aylantiradi. Xato bo‘lsa Error tashlaydi. */
export function renderSvgStrict(spec) {
  let bg = null, ground = [50, 26], noGround = false;
  const body = [];
  const col = (k) => { if (!PAL[k]) throw new Error("noma’lum rang: " + k); return PAL[k]; };
  for (const raw of String(spec).split(";")) {
    const st = raw.trim();
    if (!st) continue;
    const a = st.split(/\s+/);
    const op = a.shift();
    const need = (n) => { if (a.length < n) throw new Error(`«${op}» uchun argument yetmaydi`); };
    const nums = (arr) => arr.forEach((x) => { if (!num(x)) throw new Error("son emas: " + x); });
    if (op === "bg") { need(1); if (!BG[a[0]]) throw new Error("noma’lum fon: " + a[0]); bg = a[0]; }
    else if (op === "g") { need(2); nums(a.slice(0, 2)); ground = [Number(a[0]), Number(a[1])]; }
    else if (op === "ng") noGround = true;
    else if (op === "r") { need(5); nums(a.slice(0, 4)); if (a[5] != null) nums([a[5]]); body.push(`<rect x="${a[0]}" y="${a[1]}" width="${a[2]}" height="${a[3]}" rx="${a[5] || 0}" fill="${col(a[4])}"/>`); }
    else if (op === "c") { need(4); nums(a.slice(0, 3)); body.push(`<circle cx="${a[0]}" cy="${a[1]}" r="${a[2]}" fill="${col(a[3])}"/>`); }
    else if (op === "e") { need(5); nums(a.slice(0, 4)); body.push(`<ellipse cx="${a[0]}" cy="${a[1]}" rx="${a[2]}" ry="${a[3]}" fill="${col(a[4])}"/>`); }
    else if (op === "p") {
      need(4);
      const c = a.pop();
      for (const pt of a) { const xy = pt.split(","); if (xy.length !== 2) throw new Error("nuqta noto‘g‘ri: " + pt); nums(xy); }
      body.push(`<polygon points="${a.join(" ")}" fill="${col(c)}"/>`);
    }
    else if (op === "d") { need(2); if (!PATH_OK.test(a[0])) throw new Error("yo‘l belgilari noto‘g‘ri"); body.push(`<path d="${a[0]}" fill="${col(a[1])}"/>`); }
    else if (op === "l") { need(2); if (!PATH_OK.test(a[0])) throw new Error("yo‘l belgilari noto‘g‘ri"); if (a[2] != null) nums([a[2]]); body.push(`<path d="${a[0]}" fill="none" stroke="${col(a[1])}" stroke-width="${a[2] || 3}" stroke-linecap="round" stroke-linejoin="round"/>`); }
    else throw new Error("noma’lum amal: " + op);
  }
  if (!bg) throw new Error("fon (bg) ko‘rsatilmagan");
  const [fill, shadow] = BG[bg];
  const ground_ = noGround ? "" : `<ellipse cx="${ground[0]}" cy="88" rx="${ground[1]}" ry="4" fill="${shadow}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" focusable="false" aria-hidden="true"><rect width="100" height="100" rx="18" fill="${fill}"/>${ground_}${body.join("")}</svg>`;
}

/** Xato bo‘lsa null qaytaradi (ilova buzilmaydi). */
export function renderSvg(spec) { try { return renderSvgStrict(spec); } catch { return null; } }

/** Chizma yozuvini tekshiradi: muammolar ro‘yxati (bo‘sh bo‘lsa — yaxshi). */
export function validateSpec(spec) {
  const problems = [];
  if (typeof spec !== "string" || !spec.trim()) return ["bo‘sh chizma"];
  if (spec.length > 1600) problems.push("chizma juda uzun (" + spec.length + " belgi)");
  try { renderSvgStrict(spec); } catch (e) { problems.push(e.message); }
  return problems;
}

/* ----- Yuklash (kerak bo‘lganda, bir marta) ----- */
const shardCache = new Map();
export function loadShard(n, importer = (f) => import("./" + f)) {
  if (!SHARD_FILES[n]) return Promise.resolve(null);
  if (!shardCache.has(n)) {
    shardCache.set(n, importer(SHARD_FILES[n]).then((m) => m.default || {}).catch(() => { shardCache.delete(n); return null; }));
  }
  return shardCache.get(n);
}

/** Rasm kaliti bo‘yicha tayyor SVG matni yoki null (yuklanmasa, buzuq bo‘lsa). */
export async function svgFor(key, importer) {
  const k = imageKeyOf(key);
  if (!k) return null;
  const shard = await loadShard(IMAGE_KEYS.get(k), importer);
  const spec = shard && shard[k];
  return spec ? renderSvg(spec) : null;
}

/** DOM: kvadrat rasm qutisi. Darhol bo‘sh quti qaytadi, rasm yuklangach ichiga joylanadi; yuklanmasa fallback() chaqiriladi. */
export function picInto(box, key, fallback) {
  svgFor(key).then((svg) => {
    if (svg) { box.innerHTML = svg; box.classList.add("has-svg"); }
    else if (fallback) fallback(box);
  });
  return box;
}
