/* ÖğretmeniM — Dört İşlem Atölyesi (0.14)
   İlkokulda öğretildiği gibi alt alta toplama (elde), çıkarma (onluk bozma), çarpma (elde, ikinci satırı kaydırma)
   ve Türk usulü bölme (bölünen | bölen, bölüm bölenin altında; kaç kere var → çarp → çıkar → indir).
   Arın eldeyi, onluk bozmayı (rakamı çizme, bir eksiğini yazma, oluşan sayıyı yazma), kaydırmayı ve basamak indirmeyi
   kendisi yapar. Her adım ayrı beceri olarak kaydedilir; veli Gelişim ekranında hangi adımda zorlandığını görür.
   Bölüm 1: işlem modeli (ekrandan bağımsız, node ile de test edilir) · Bölüm 2: ekranlar */
"use strict";

/* ====================================================================================================
   Bölüm 1 — İŞLEM MODELİ
   Izgara: satırlar × sütunlar. Hücre: {id, r, c, rol, goster, beklenen, kabul[], giris, kucuk, cizilebilir, cizilecek}
   Adım: {tip: hesap|secim|yaz|yeryaz|yer|ciz, soru, hucreler[], beklenen, secenekler[], adaylar[], kod, etiket, ipucu, aciklama, odak[], rehberli}
   ==================================================================================================== */
const DI_BASAMAK = ["Birler", "Onlar", "Yüzler", "Binler", "On binler", "Yüz binler"];
const diBas = k => DI_BASAMAK[k] || (k + 1) + ". basamak";
const diBasK = k => diBas(k).toLocaleLowerCase("tr");
const diRakamlar = n => String(n).split("").reverse().map(Number);              // birler başta
const diRs = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
// Sayıdan sonra gelen ek, sayının okunuşunun son kelimesine göre: 12'nin, 40'tan, 6'ya, 100'ü …
const DI_EK = {   //        in     den     e     i
  "sıfır": ["ın", "dan", "a", "ı"], "bir": ["in", "den", "e", "i"], "iki": ["nin", "den", "ye", "yi"], "üç": ["ün", "ten", "e", "ü"],
  "dört": ["ün", "ten", "e", "ü"], "beş": ["in", "ten", "e", "i"], "altı": ["nın", "dan", "ya", "yı"], "yedi": ["nin", "den", "ye", "yi"],
  "sekiz": ["in", "den", "e", "i"], "dokuz": ["un", "dan", "a", "u"], "on": ["un", "dan", "a", "u"], "yirmi": ["nin", "den", "ye", "yi"],
  "otuz": ["un", "dan", "a", "u"], "kırk": ["ın", "tan", "a", "ı"], "elli": ["nin", "den", "ye", "yi"], "altmış": ["ın", "tan", "a", "ı"],
  "yetmiş": ["in", "ten", "e", "i"], "seksen": ["in", "den", "e", "i"], "doksan": ["ın", "dan", "a", "ı"], "yüz": ["ün", "den", "e", "ü"], "bin": ["in", "den", "e", "i"],
};
function diSonKelime(n) {
  n = Math.abs(n);
  if (n === 0) return "sıfır";
  if (n % 1000 === 0) return "bin";
  if (n % 100 === 0) return "yüz";
  if (n % 10 === 0) return ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"][(n % 100) / 10];
  return ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"][n % 10];
}
function diEk(n, tur) { return n + "'" + DI_EK[diSonKelime(n)][{ in: 0, den: 1, e: 2, i: 3 }[tur]]; }

// Veli Gelişim ekranında görünen adım becerileri
const DI_BECERI = {
  "toplama.olgu": "Toplama: basamak toplamı",
  "toplama.elde_ekle": "Toplama: eldeyi sonraki basamağa ekleme",
  "toplama.yaz": "Toplama: sonucun birlerini basamağa yazma",
  "toplama.elde": "Toplama: eldeyi yazma (yeri ve değeri)",
  "toplama.son": "Toplama: son basamakta toplamın tamamını yazma",
  "cikarma.karar": "Çıkarma: onluk bozma gerektiğini fark etme",
  "cikarma.ciz": "Çıkarma: onluk bozarken rakamı çizme",
  "cikarma.azalt": "Çıkarma: bozulan rakamın bir eksiğini yazma",
  "cikarma.sifir": "Çıkarma: sıfırlı sayılarda zincirleme bozma",
  "cikarma.ekle": "Çıkarma: alınan onluğu ekleyip yeni sayıyı yazma",
  "cikarma.fark": "Çıkarma: basamak farkı",
  "cikarma.indir": "Çıkarma: çıkanı olmayan basamağı aynen yazma",
  "carpma.olgu": "Çarpma: çarpım olgusu",
  "carpma.elde_ekle": "Çarpma: eldeyi çarpıma ekleme",
  "carpma.yaz": "Çarpma: sonucun birlerini basamağa yazma",
  "carpma.elde": "Çarpma: eldeyi yazma (yeri ve değeri)",
  "carpma.son": "Çarpma: son basamakta çarpımın tamamını yazma",
  "carpma.kaydir": "Çarpma: ikinci satırı bir basamak kaydırma",
  "carpma.topla": "Çarpma: iki satırı toplama",
  "carpma.topla_elde": "Çarpma: iki satırı toplarken elde",
  "bolme.tahmin": "Bölme: bölümün basamak sayısını tahmin etme",
  "bolme.ilk": "Bölme: ilk bölüneni seçme",
  "bolme.kac": "Bölme: kaç kere var? (bölümü bulma)",
  "bolme.sifir": "Bölme: bölüme 0 yazma",
  "bolme.carp": "Bölme: bölüm basamağı × bölen",
  "bolme.cikar": "Bölme: alt alta çıkarma",
  "bolme.indir": "Bölme: sıradaki basamağı indirme",
  "bolme.kalan": "Bölme: kalanı bulma",
};

function Izgara(sutun) { this.W = sutun; this.satirlar = []; this.h = {}; }
Izgara.prototype.satir = function (tur, sinif = "") { this.satirlar.push({ tur, sinif }); return this.satirlar.length - 1; };
Izgara.prototype.koy = function (r, c, ozellik) {
  const id = r + "_" + c;
  this.h[id] = Object.assign({ id, r, c, rol: "bos", goster: "", beklenen: null, kabul: null, giris: "", cizili: false }, ozellik);
  return id;
};
Izgara.prototype.al = function (r, c) { return this.h[r + "_" + c]; };

/* ---------- Seviyeler ve soru üreteçleri ---------- */
function diEldeSayisi(sayilar) {
  const L = Math.max(...sayilar.map(n => String(n).length));
  let elde = 0, say = 0;
  for (let k = 0; k < L; k++) {
    const t = sayilar.reduce((s, n) => s + (diRakamlar(n)[k] || 0), 0) + elde;
    elde = Math.floor(t / 10);
    if (elde && k < L - 1) say++;
  }
  return say;
}
function diBozmaSayisi(a, b) {
  const da = diRakamlar(a), db = diRakamlar(b);
  let borc = 0, say = 0;
  for (let k = 0; k < da.length; k++) { const x = da[k] - borc, y = db[k] || 0; if (x < y) { say++; borc = 1; } else borc = 0; }
  return say;
}
function diDene(f, kosul) { for (let i = 0; i < 3000; i++) { const x = f(); if (kosul(x)) return x; } return null; }

const DI_ISLEMLER = {
  toplama: {
    ad: "Toplama", simge: "➕", renk: "#22C55E", terim: "toplanan · toplam",
    seviyeler: [
      { ad: "2 basamaklı, eldesiz", ornek: "34 + 25", uret: () => diDene(() => [diRs(10, 89), diRs(10, 89)], ([a, b]) => a + b < 100 && diEldeSayisi([a, b]) === 0) },
      { ad: "2 basamaklı, eldeli", ornek: "47 + 38", uret: () => diDene(() => [diRs(11, 89), diRs(11, 89)], ([a, b]) => a + b < 100 && diEldeSayisi([a, b]) === 1) },
      { ad: "3 basamaklı, bir elde", ornek: "356 + 218", uret: () => diDene(() => [diRs(100, 899), diRs(100, 899)], ([a, b]) => a + b < 1000 && diEldeSayisi([a, b]) === 1) },
      { ad: "3 basamaklı, iki elde", ornek: "368 + 275", uret: () => diDene(() => [diRs(100, 899), diRs(100, 899)], ([a, b]) => a + b < 1000 && diEldeSayisi([a, b]) === 2) },
      { ad: "4 basamaklı", ornek: "4587 + 2769", uret: () => diDene(() => [diRs(1000, 8999), diRs(1000, 8999)], ([a, b]) => a + b < 10000 && diEldeSayisi([a, b]) >= 2) },
      { ad: "Üç sayıyı toplama", ornek: "248 + 136 + 57", uret: () => diDene(() => [diRs(100, 499), diRs(100, 399), diRs(10, 299)], s => diEldeSayisi(s) >= 1 && s.reduce((x, y) => x + y) < 1000) },
    ],
  },
  cikarma: {
    ad: "Çıkarma", simge: "➖", renk: "#F59E0B", terim: "eksilen · çıkan · fark",
    seviyeler: [
      { ad: "2 basamaklı, bozmasız", ornek: "58 − 23", uret: () => diDene(() => [diRs(20, 99), diRs(10, 89)], ([a, b]) => a > b && diBozmaSayisi(a, b) === 0) },
      { ad: "2 basamaklı, onluk bozmalı", ornek: "52 − 27", uret: () => diDene(() => [diRs(21, 99), diRs(10, 89)], ([a, b]) => a > b && diBozmaSayisi(a, b) === 1 && a - b >= 5) },
      { ad: "3 basamaklı, bir bozma", ornek: "642 − 318", uret: () => diDene(() => [diRs(200, 999), diRs(100, 899)], ([a, b]) => a > b + 50 && diBozmaSayisi(a, b) === 1 && diRakamlar(a).every(x => x > 0)) },
      { ad: "3 basamaklı, iki bozma", ornek: "523 − 267", uret: () => diDene(() => [diRs(300, 999), diRs(100, 899)], ([a, b]) => a > b + 50 && diBozmaSayisi(a, b) === 2 && diRakamlar(a).every(x => x > 0)) },
      { ad: "Sıfırlı sayılar", ornek: "400 − 178", uret: () => diDene(() => [diRs(2, 9) * 100 + (Math.random() < 0.5 ? 0 : diRs(1, 9)), diRs(100, 899)], ([a, b]) => a > b + 20 && diRakamlar(a)[1] === 0 && diRakamlar(a)[0] < diRakamlar(b)[0]) },
      { ad: "4 basamaklı", ornek: "5032 − 1786", uret: () => diDene(() => [diRs(2000, 9999), diRs(1000, 8999)], ([a, b]) => a > b + 100 && diBozmaSayisi(a, b) >= 2) },
    ],
  },
  carpma: {
    ad: "Çarpma", simge: "✖", renk: "#6366F1", terim: "çarpan · çarpım",
    seviyeler: [
      { ad: "2 basamaklı × 1 basamaklı, eldesiz", ornek: "32 × 3", uret: () => diDene(() => [diRs(11, 44), diRs(2, 4)], ([a, m]) => diRakamlar(a).every(x => x * m < 10)) },
      { ad: "2 basamaklı × 1 basamaklı, eldeli", ornek: "47 × 6", uret: () => diDene(() => [diRs(12, 98), diRs(3, 9)], ([a, m]) => diRakamlar(a)[0] * m >= 10) },
      { ad: "3 basamaklı × 1 basamaklı", ornek: "368 × 7", uret: () => diDene(() => [diRs(102, 989), diRs(3, 9)], ([a, m]) => diRakamlar(a)[0] * m >= 10 && diRakamlar(a)[1] > 0) },
      { ad: "2 basamaklı × 2 basamaklı", ornek: "43 × 26", uret: () => diDene(() => [diRs(12, 98), diRs(12, 98)], ([a, b]) => diRakamlar(b).every(x => x > 1) && diRakamlar(a)[0] * diRakamlar(b)[0] >= 10) },
      { ad: "3 basamaklı × 2 basamaklı", ornek: "254 × 37", uret: () => diDene(() => [diRs(102, 989), diRs(12, 89)], ([a, b]) => diRakamlar(b).every(x => x > 1) && diRakamlar(a)[1] > 0) },
      { ad: "Ortasında sıfır olan sayılar", ornek: "305 × 24", uret: () => diDene(() => [diRs(1, 9) * 100 + diRs(1, 9), diRs(12, 89)], ([a, b]) => diRakamlar(b).every(x => x > 1) && diRakamlar(a)[0] * diRakamlar(b)[0] >= 10) },
    ],
  },
  bolme: {
    ad: "Bölme", simge: "➗", renk: "#EF4444", terim: "bölünen · bölen · bölüm · kalan",
    seviyeler: [
      { ad: "2 basamaklı ÷ 1 basamaklı, kalansız", ornek: "84 ÷ 4", uret: () => diDene(() => { const d = diRs(2, 9), q = diRs(3, 45); return [q * d, d]; }, ([a, d]) => a >= 10 && a < 100 && !String(Math.floor(a / d)).slice(1).includes("0")) },
      { ad: "2 basamaklı ÷ 1 basamaklı, kalanlı", ornek: "79 ÷ 3", uret: () => diDene(() => [diRs(20, 99), diRs(2, 9)], ([a, d]) => a % d > 0 && Math.floor(a / d) >= 2 && !String(Math.floor(a / d)).slice(1).includes("0")) },
      { ad: "3 basamaklı ÷ 1 basamaklı", ornek: "745 ÷ 5", uret: () => diDene(() => [diRs(100, 999), diRs(2, 9)], ([a, d]) => !String(Math.floor(a / d)).includes("0")) },
      { ad: "Bölümde 0 olanlar", ornek: "612 ÷ 6", uret: () => diDene(() => [diRs(100, 999), diRs(2, 9)], ([a, d]) => String(Math.floor(a / d)).slice(1).includes("0")) },
      { ad: "3 basamaklı ÷ 2 basamaklı", ornek: "845 ÷ 23", uret: () => diDene(() => [diRs(120, 999), diRs(11, 49)], ([a, d]) => Math.floor(a / d) >= 3) },
      { ad: "4 basamaklı ÷ 2 basamaklı", ornek: "4768 ÷ 32", uret: () => diDene(() => [diRs(1000, 9999), diRs(11, 59)], ([a, d]) => Math.floor(a / d) >= 20) },
    ],
  },
};
const DI_SIRA = ["toplama", "cikarma", "carpma", "bolme"];

/* ---------- Ortak: sütunlu toplama (toplama işlemi ve çarpmadaki iki satırın toplanması) ---------- */
function diSutunToplama(iz, adimlar, o) {
  // o: {sayilar: [[rakamlar birler başta, boş basamak undefined]], sayiSatirlari: [r…], eldeSatir, sonucSatir, kod: {olgu, elde_ekle, yaz, elde, son}}
  const col = k => iz.W - 1 - k;
  const L = Math.max(...o.sayilar.map(d => d.length));
  const toplam = o.sayilar.reduce((s, d) => s + d.reduce((t, x, k) => t + (x || 0) * Math.pow(10, k), 0), 0);
  const tr = diRakamlar(toplam);
  const eldeHucreleri = [];
  for (let k = 1; k < L; k++) eldeHucreleri.push(iz.koy(o.eldeSatir, col(k), { rol: "elde", kucuk: true, beklenen: "", kabul: ["", "0"], bosKod: o.kod.elde }));
  const sonucHucre = k => iz.al(o.sonucSatir, col(k)) || iz.h[iz.koy(o.sonucSatir, col(k), { rol: "sonuc", beklenen: "" })];
  let elde = 0;
  for (let k = 0; k < L; k++) {
    const rak = o.sayilar.map(d => d[k]).filter(x => x !== undefined);
    const t = rak.reduce((s, x) => s + x, 0) + elde;
    const ifade = rak.join(" + ") + (elde ? ` + ${elde} (elde)` : "");
    const odak = o.sayiSatirlari.map(r => r + "_" + col(k)).filter(id => iz.h[id] && iz.h[id].rol === "sabit");
    if (elde) odak.push(o.eldeSatir + "_" + col(k));
    const kod = elde ? o.kod.elde_ekle : o.kod.olgu;
    const son = k === L - 1;
    if (t >= 10 && !son) {
      adimlar.push({ tip: "hesap", rehberli: true, soru: `<b>${diBas(k)} basamağı:</b> ${ifade} = ?`, beklenen: String(t), kod, odak,
        etiket: `${diBasK(k)} basamağı ${ifade}`, ipucu: elde ? "Eldeyi de eklemeyi unutma." : "Rakamları tek tek topla.", aciklama: `${ifade} = <b>${t}</b>` });
      const s = sonucHucre(k); s.beklenen = String(t % 10); s.kabul = null;
      adimlar.push({ tip: "yaz", soru: `${t} buldun. Sonuç satırına ${diBasK(k)} basamağına ne yazarız?`, hucreler: [s.id], beklenen: String(t % 10), kod: o.kod.yaz, odak,
        etiket: `${diBasK(k)} basamağına ${t % 10} yazma`, ipucu: `${t} sayısının birler basamağındaki rakamı yaz.`,
        aciklama: `${t} = ${Math.floor(t / 10)} onluk ${t % 10} birlik. Bu basamağa <b>${t % 10}</b> yazılır, ${Math.floor(t / 10)} elde olarak sola geçer.` });
      const e = iz.al(o.eldeSatir, col(k + 1)); e.beklenen = String(Math.floor(t / 10)); e.kabul = null;
      adimlar.push({ tip: "yeryaz", soru: `Kalan ${Math.floor(t / 10)} elde. <b>Eldeyi hangi kutuya yazarız?</b> Kutuya tıkla, sonra yaz.`, hucreler: [e.id], adaylar: eldeHucreleri,
        beklenen: String(Math.floor(t / 10)), kod: o.kod.elde, odak, etiket: `${diBasK(k)} basamağından ${diBasK(k + 1)} basamağına elde`,
        ipucu: "Elde, bir soldaki basamağın üstüne yazılır.", aciklama: `${t} içindeki ${Math.floor(t / 10)} onluk bir sonraki basamağa geçer: ${diBasK(k + 1)} basamağının üstüne <b>${Math.floor(t / 10)}</b> yazılır.` });
      elde = Math.floor(t / 10);
    } else if (son && t >= 10) {
      const hucreler = [];
      for (let j = String(t).length - 1; j >= 0; j--) { const s = sonucHucre(k + j); s.beklenen = String(t)[String(t).length - 1 - j]; s.kabul = null; hucreler.push(s.id); }
      adimlar.push({ tip: "yaz", soru: `<b>${diBas(k)} basamağı (en soldaki):</b> ${ifade} = ? Bu son basamak; toplamın <b>tamamını</b> yaz.`, hucreler, beklenen: String(t),
        kod: o.kod.son, odak, etiket: `son basamak ${ifade} = ${t}`, ipucu: "Son basamakta elde yazılmaz, sayının tamamı sonuca yazılır.",
        aciklama: `${ifade} = ${t}. En soldaki basamakta çıkan sayının tamamı yazılır: <b>${t}</b>.` });
      elde = 0;
    } else {
      const s = sonucHucre(k); s.beklenen = String(t); s.kabul = null;
      adimlar.push({ tip: "yaz", soru: `<b>${diBas(k)} basamağı:</b> ${ifade} = ? Sonucu yaz.`, hucreler: [s.id], beklenen: String(t), kod, odak,
        etiket: `${diBasK(k)} basamağı ${ifade}`, ipucu: elde ? "Eldeyi de eklemeyi unutma." : "Rakamları topla.", aciklama: `${ifade} = <b>${t}</b>` });
      elde = 0;
    }
  }
  return { toplam, tr };
}

/* ---------- Toplama ---------- */
function diToplamaKur(sayilar) {
  const toplam = sayilar.reduce((a, b) => a + b, 0);
  const W = Math.max(String(toplam).length, ...sayilar.map(n => String(n).length)) + 1;
  const iz = new Izgara(W), adimlar = [];
  const E = iz.satir("kucuk", "elde-satir");
  const satirlar = sayilar.map((n, i) => {
    const r = iz.satir("buyuk");
    diRakamlar(n).forEach((x, k) => iz.koy(r, W - 1 - k, { rol: "sabit", goster: String(x) }));
    if (i === sayilar.length - 1) iz.koy(r, 0, { rol: "isaret", goster: "+" });
    return r;
  });
  iz.satir("cizgi"); const S = iz.satir("buyuk", "sonuc-satir");
  for (let c = 1; c < W; c++) if (!iz.al(S, c)) iz.koy(S, c, { rol: "sonuc", beklenen: "", kabul: ["", "0"] });
  diSutunToplama(iz, adimlar, { sayilar: sayilar.map(diRakamlar), sayiSatirlari: satirlar, eldeSatir: E, sonucSatir: S,
    kod: { olgu: "toplama.olgu", elde_ekle: "toplama.elde_ekle", yaz: "toplama.yaz", elde: "toplama.elde", son: "toplama.son" } });
  return { tur: "toplama", ifade: sayilar.join(" + "), sonuc: toplam, iz, adimlar };
}

/* ---------- Çıkarma (onluk bozma: rakam çizilir, bir eksiği üstüne yazılır; bozulan basamağın üstüne yeni sayı) ---------- */
function diCikarmaKur(a, b) {
  const da = diRakamlar(a), db = diRakamlar(b), La = da.length;
  const W = La + 1, col = k => W - 1 - k;
  const iz = new Izgara(W), adimlar = [];
  const U = iz.satir("kucuk", "ust-satir"), A = iz.satir("buyuk"), B = iz.satir("buyuk");
  iz.satir("cizgi"); const S = iz.satir("buyuk", "sonuc-satir");
  const ustHucreleri = da.map((x, k) => iz.koy(U, col(k), { rol: "ust", kucuk: true, beklenen: "", kabul: [""], uzun: 2, bosKod: "cikarma.azalt" }));
  da.forEach((x, k) => iz.koy(A, col(k), { rol: "sabit", goster: String(x), cizilebilir: true, cizilecek: false }));
  db.forEach((x, k) => iz.koy(B, col(k), { rol: "sabit", goster: String(x) }));
  iz.koy(B, 0, { rol: "isaret", goster: "−" });
  const fark = a - b, fr = diRakamlar(fark);
  da.forEach((x, k) => iz.koy(S, col(k), { rol: "sonuc", beklenen: k < fr.length ? String(fr[k]) : "", kabul: k < fr.length ? null : ["", "0"] }));
  const cur = da.slice(), ustYazili = {};
  for (let k = 0; k < La; k++) {
    const bk = db[k], odak = [A + "_" + col(k), ...(bk !== undefined ? [B + "_" + col(k)] : [])];
    if (bk === undefined) {
      if (k < fr.length) adimlar.push({ tip: "yaz", soru: `<b>${diBas(k)} basamağında</b> çıkan sayının rakamı yok. Bu basamaktaki ${diEk(cur[k], "i")} sonuca aynen yaz.`,
        hucreler: [iz.al(S, col(k)).id], beklenen: String(cur[k]), kod: "cikarma.indir", odak, etiket: `${diBasK(k)} basamağını aynen yazma`,
        ipucu: "Altında çıkarılacak rakam yok; üstteki rakam (bozulduysa üstüne yazdığın) aynen iner.", aciklama: `Bu basamakta ${cur[k]} − 0 = <b>${cur[k]}</b>.` });
      continue;
    }
    const gerek = cur[k] < bk;
    adimlar.push({ tip: "secim", rehberli: true, soru: `<b>${diBas(k)} basamağı:</b> ${diEk(cur[k], "den")} ${bk} çıkar mı?`, secenekler: ["Çıkar", "Çıkmaz, onluk bozarız"],
      beklenen: gerek ? "Çıkmaz, onluk bozarız" : "Çıkar", kod: "cikarma.karar", odak, etiket: `${diBasK(k)} basamağında ${cur[k]} − ${bk}: bozma kararı`,
      ipucu: "Üstteki rakam alttakinden küçükse çıkmaz.", aciklama: gerek ? `${cur[k]}, ${diEk(bk, "den")} küçük; <b>çıkmaz</b>. Soldaki basamaktan bir onluk alırız (onluk bozarız).` : `${cur[k]} ≥ ${bk}; <b>çıkar</b>, bozmaya gerek yok.` });
    if (gerek) {
      let j = k + 1; while (cur[j] === 0) j++;
      for (let m = j; m > k; m--) {
        const h = iz.al(A, col(m)); h.cizilecek = true;
        const yeni = m === j ? cur[m] - 1 : 9;
        const sifir = m !== j;
        adimlar.push({ tip: "ciz", soru: sifir
          ? `${diBas(m)} basamağında 0 var; ondan doğrudan alamayız. Soldan aldığımız onluk önce buraya gelir. <b>Bu basamaktaki rakamı çiz</b> (üstüne tıkla).`
          : `Soldaki basamaktan bir onluk alacağız. <b>Onluk verecek rakamı çiz</b> (üstüne tıkla).`,
          hucreler: [h.id], kod: sifir ? "cikarma.sifir" : "cikarma.ciz", odak: [A + "_" + col(k)], etiket: `${diBasK(m)} basamağındaki ${diEk(cur[m], "i")} çizme`,
          ipucu: sifir ? "Sıfır da bozulur: soldan gelen onluğu alır, bir tanesini sağa verir." : "Bozacağın rakam, çıkaramadığın basamağın hemen solundaki (0 değilse).",
          aciklama: sifir ? `Buradaki 0, soldan aldığı 1 onluğu 10'a çevirir ve birini sağa verir.` : `${diBas(m)} basamağındaki ${cur[m]} çizilir; ondan bir onluk alınır.` });
        const u = iz.al(U, col(m)); u.beklenen = String(yeni); u.kabul = null;
        adimlar.push({ tip: "yaz", soru: sifir ? `Bu 0, 10 oldu ve birini sağa verdi. <b>Üstüne kaç yazarız?</b>` : `Çizdiğin ${diEk(cur[m], "in")} <b>bir eksiğini</b> üstüne yaz.`,
          hucreler: [u.id], beklenen: String(yeni), kod: sifir ? "cikarma.sifir" : "cikarma.azalt", odak: [h.id], etiket: `${diBasK(m)} basamağı ${cur[m]} → ${yeni}`,
          ipucu: sifir ? "10'dan 1 verince kaç kalır?" : "Bir onluk verdi; bir azalır.", aciklama: sifir ? `10 − 1 = <b>9</b>` : `${cur[m]} − 1 = <b>${yeni}</b>` });
        cur[m] = yeni; ustYazili[m] = true;
      }
      const eski = cur[k]; cur[k] += 10;
      const u = iz.al(U, col(k)); u.beklenen = String(cur[k]); u.kabul = null;
      adimlar.push({ tip: "yaz", soru: `Aldığın onluk ${diBasK(k)} basamağına 10 olarak geldi. ${eski} ile birlikte kaç oldu? <b>Üstüne yaz.</b>`,
        hucreler: [u.id], beklenen: String(cur[k]), kod: "cikarma.ekle", odak: [A + "_" + col(k)], etiket: `${diBasK(k)} basamağı ${eski} + 10`,
        ipucu: `10 + ${eski} = ?`, aciklama: `1 onluk = 10 birlik. 10 + ${eski} = <b>${cur[k]}</b>. Bu sayı ${diEk(eski, "in")} üstüne yazılır.` });
      ustYazili[k] = true;
    }
    const f = cur[k] - bk;
    adimlar.push({ tip: "yaz", soru: `<b>${diBas(k)} basamağı:</b> ${cur[k]} − ${bk} = ? Sonucu yaz.`, hucreler: [iz.al(S, col(k)).id], beklenen: k < fr.length ? String(f) : "",
      kod: "cikarma.fark", odak, etiket: `${diBasK(k)} basamağı ${cur[k]} − ${bk}`, ipucu: gerek ? `Artık üstteki sayı ${cur[k]}.` : "Üstteki rakamdan alttakini çıkar.",
      aciklama: `${cur[k]} − ${bk} = <b>${f}</b>`, bosOlabilir: k >= fr.length });
  }
  // Sonucun başındaki sıfır yazılmaz: o adımı rehberlide göstermeyiz
  return { tur: "cikarma", adimlar: adimlar.filter(a => !a.bosOlabilir), ifade: `${a} − ${b}`, sonuc: fark, iz };
}

/* ---------- Çarpma (elde üste; onlar basamağıyla çarpımda satır bir basamak sola kayar, boş yer + işareti) ---------- */
function diCarpmaKur(a, b) {
  const da = diRakamlar(a), db = diRakamlar(b), La = da.length, Lb = db.length;
  const P = a * b, W = String(P).length + 1, col = k => W - 1 - k;
  const iz = new Izgara(W), adimlar = [];
  const E = [];
  if (Lb === 2) E[1] = iz.satir("kucuk", "elde-satir ikinci");
  E[0] = iz.satir("kucuk", "elde-satir");
  const A = iz.satir("buyuk"), B = iz.satir("buyuk");
  da.forEach((x, k) => iz.koy(A, col(k), { rol: "sabit", goster: String(x) }));
  db.forEach((x, k) => iz.koy(B, col(k), { rol: "sabit", goster: String(x) }));
  iz.koy(B, 0, { rol: "isaret", goster: "×" });
  iz.satir("cizgi");
  let T = null;
  if (Lb === 2) T = iz.satir("kucuk", "elde-satir toplam");
  const Ps = [iz.satir("buyuk", Lb === 1 ? "sonuc-satir" : "")];
  if (Lb === 2) { Ps[1] = iz.satir("buyuk"); iz.koy(Ps[1], 0, { rol: "isaret", goster: "+" }); }
  const kismi = db.map(m => a * m);
  // Kısmi çarpım hücreleri
  kismi.forEach((p, m) => {
    const pr = diRakamlar(p);
    for (let k = 0; k < W - 1; k++) {
      if (m === 1 && k === 0) { iz.koy(Ps[1], col(0), { rol: "sonuc", beklenen: "", kabul: ["", "0"], bosKod: "carpma.kaydir", kaydirma: true }); continue; }
      const ki = k - m;
      if (col(k) < 1) continue;
      if (m === 1 && col(k) === 0) continue;
      iz.koy(Ps[m], col(k), { rol: "sonuc", beklenen: ki >= 0 && ki < pr.length ? String(pr[ki]) : "", kabul: ki >= 0 && ki < pr.length ? null : ["", "0"] });
    }
  });
  const eldeAdaylari = [];
  for (let m = 0; m < Lb; m++) for (let k = 1; k < La; k++) eldeAdaylari.push(iz.koy(E[m], col(k), { rol: "elde", kucuk: true, beklenen: "", kabul: ["", "0"], bosKod: "carpma.elde" }));
  for (let m = 0; m < Lb; m++) {
    const dm = db[m], r = Ps[m];
    if (m === 1) {
      adimlar.push({ tip: "yer", soru: `Şimdi <b>onlar basamağındaki ${dm}</b> ile çarpacağız. Çıkan ilk rakamı <b>hangi kutuya</b> yazarız? Alttaki satırda doğru kutuya tıkla.`,
        hucreler: [iz.al(r, col(1)).id], adaylar: [iz.al(r, col(0)).id, iz.al(r, col(1)).id, iz.al(r, col(2)) ? iz.al(r, col(2)).id : null].filter(Boolean),
        kod: "carpma.kaydir", odak: [B + "_" + col(1)], etiket: "ikinci satırı bir basamak kaydırma",
        ipucu: `${dm} aslında ${dm * 10}; bu yüzden birler basamağı boş kalır.`,
        aciklama: `Onlar basamağındaki ${dm}, ${dm} onluktur (${dm * 10}). Bu yüzden ikinci satır bir basamak sola kayar; birler yeri <b>boş</b> kalır.` });
    }
    let elde = 0;
    for (let k = 0; k < La; k++) {
      const v = da[k] * dm + elde;
      const ifade = `${da[k]} × ${dm}` + (elde ? ` + ${elde} (elde)` : "");
      const odak = [A + "_" + col(k), B + "_" + col(m), ...(elde ? [E[m] + "_" + col(k)] : [])];
      const kod = elde ? "carpma.elde_ekle" : "carpma.olgu", son = k === La - 1, hedef = k + m;
      if (v >= 10 && !son) {
        adimlar.push({ tip: "hesap", rehberli: true, soru: `${ifade} = ?`, beklenen: String(v), kod, odak, etiket: `${ifade}`,
          ipucu: elde ? "Önce çarp, sonra eldeyi ekle." : "Çarpım tablosunu düşün.", aciklama: `${ifade} = <b>${v}</b>` });
        adimlar.push({ tip: "yaz", soru: `${v} buldun. Satıra ne yazarız?`, hucreler: [iz.al(r, col(hedef)).id], beklenen: String(v % 10), kod: "carpma.yaz", odak,
          etiket: `${diEk(v, "in")} birlerini yazma`, ipucu: `${v} sayısının birler basamağındaki rakamı yaz.`, aciklama: `${v} → buraya <b>${v % 10}</b>, ${Math.floor(v / 10)} elde.` });
        const e = iz.al(E[m], col(k + 1)); e.beklenen = String(Math.floor(v / 10)); e.kabul = null;
        adimlar.push({ tip: "yeryaz", soru: `${Math.floor(v / 10)} elde. <b>Eldeyi hangi kutuya yazarız?</b>${Lb === 2 ? (m === 0 ? " (alttaki elde satırı birler çarpımı için)" : " (üstteki elde satırı onlar çarpımı için)") : ""}`,
          hucreler: [e.id], adaylar: eldeAdaylari, beklenen: String(Math.floor(v / 10)), kod: "carpma.elde", odak,
          etiket: `${da[k]} × ${dm} eldesi`, ipucu: "Elde, sıradaki çarpılacak rakamın üstüne yazılır.",
          aciklama: `Elde, sıradaki rakamın (${da[k + 1]}) üstüne yazılır; onu çarpınca eklenir.` });
        elde = Math.floor(v / 10);
      } else if (son && v >= 10) {
        const hucreler = [];
        for (let j = String(v).length - 1; j >= 0; j--) hucreler.push(iz.al(r, col(hedef + j)).id);
        adimlar.push({ tip: "yaz", soru: `${ifade} = ? Bu son rakam; çıkan sayının <b>tamamını</b> yaz.`, hucreler, beklenen: String(v), kod: "carpma.son", odak,
          etiket: `son rakam ${ifade}`, ipucu: "Son rakamda elde yazılmaz, sayının tamamı yazılır.", aciklama: `${ifade} = <b>${v}</b>; tamamı yazılır.` });
        elde = 0;
      } else {
        adimlar.push({ tip: "yaz", soru: `${ifade} = ? Satıra yaz.`, hucreler: [iz.al(r, col(hedef)).id], beklenen: String(v), kod, odak, etiket: ifade,
          ipucu: elde ? "Eldeyi eklemeyi unutma." : "Çarpım tablosunu düşün.", aciklama: `${ifade} = <b>${v}</b>` });
        elde = 0;
      }
    }
  }
  if (Lb === 2) {
    iz.satir("cizgi"); const S = iz.satir("buyuk", "sonuc-satir");
    for (let c = 1; c < W; c++) iz.koy(S, c, { rol: "sonuc", beklenen: "", kabul: ["", "0"] });
    const s0 = diRakamlar(kismi[0]), s1 = [undefined, ...diRakamlar(kismi[1])];
    adimlar.push({ tip: "bilgi", rehberli: true, soru: "İki satırı da yazdın. Şimdi bu iki satırı <b>alt alta topluyoruz</b>." });
    diSutunToplama(iz, adimlar, { sayilar: [s0, s1], sayiSatirlari: Ps, eldeSatir: T, sonucSatir: S,
      kod: { olgu: "carpma.topla", elde_ekle: "carpma.topla", yaz: "carpma.topla", elde: "carpma.topla_elde", son: "carpma.topla" } });
  }
  return { tur: "carpma", ifade: `${a} × ${b}`, sonuc: P, iz, adimlar };
}

/* ---------- Bölme (Türk usulü: bölünen | bölen, bölüm bölenin altında) ---------- */
function diBolmeKur(a, d) {
  const s = String(a), n = s.length, q = Math.floor(a / d), kalan = a % d, qs = String(q);
  const L = n + 1, R = Math.max(String(d).length, qs.length) + 1, W = L + R;
  const iz = new Izgara(W), adimlar = [];
  const col = i => i + 1;                                   // bölünenin i. rakamı (soldan)
  const R0 = iz.satir("buyuk");
  for (let i = 0; i < n; i++) iz.koy(R0, col(i), { rol: "sabit", goster: s[i] });
  String(d).split("").forEach((x, i) => iz.koy(R0, L + i, { rol: "sabit", goster: x, solCizgi: i === 0, altCizgi: true }));
  for (let i = String(d).length; i < R; i++) iz.koy(R0, L + i, { rol: "bos", altCizgi: true });
  const R1 = iz.satir("buyuk");
  const bolumHucreleri = qs.split("").map((x, i) => iz.koy(R1, L + i, { rol: "sonuc", beklenen: x, solCizgi: i === 0, bolum: true }));
  for (let i = qs.length; i < R; i++) iz.koy(R1, L + i, { rol: "bos" });
  // ilk bölünen
  let e = 0, P = +s[0];
  while (P < d && e < n - 1) { e++; P = P * 10 + +s[e]; }
  const ilkOdak = []; for (let i = 0; i <= e; i++) ilkOdak.push(R0 + "_" + col(i));
  const kisa = s.slice(0, String(d).length);
  adimlar.push({ tip: "secim", rehberli: true, soru: `Önce bölünenin soldan kaç basamağını alırız? <b>İlk olarak hangi sayıyı ${diEk(d, "e")} böleriz?</b>`,
    secenekler: [...new Set([kisa, s.slice(0, String(d).length + 1)].filter(x => x.length <= n))], beklenen: String(P),
    kod: "bolme.ilk", odak: ilkOdak, etiket: `${a} ÷ ${d}: ilk bölünen ${P}`,
    ipucu: `Aldığın sayı ${diEk(d, "den")} küçük olmamalı.`,
    aciklama: +kisa < d ? `${kisa}, ${diEk(d, "den")} küçük; bir basamak daha alırız: <b>${P}</b>.` : `${kisa} içinde ${d} var; ilk bölünen <b>${P}</b>.` });
  adimlar.push({ tip: "secim", rehberli: true, soru: `İlk bölünen ${P}. Bölünende ondan sonra ${n - 1 - e} rakam daha var. <b>Bölüm kaç basamaklı olur?</b>`,
    secenekler: ["1", "2", "3", "4"].filter(x => +x <= n), beklenen: String(qs.length), kod: "bolme.tahmin", odak: ilkOdak, etiket: `${a} ÷ ${d}: bölüm ${qs.length} basamaklı`,
    ipucu: "İlk bölünen bölüme 1 rakam verir; sonra indirilen her rakam da bir rakam daha verir.",
    aciklama: `İlk bölünen 1 basamak verir, kalan ${n - 1 - e} rakamın her biri de 1 basamak: bölüm <b>${qs.length}</b> basamaklı.` });
  let satir = R0, bitis = e, qi = 0, cur = P, odakP = ilkOdak, ilkCarpim = true;
  for (;;) {
    const qd = Math.floor(cur / d);
    adimlar.push({ tip: "yaz", soru: `<b>${diEk(cur, "in")} içinde ${d} kaç kere var?</b> Bölüme yaz.`, hucreler: [bolumHucreleri[qi]], beklenen: String(qd),
      kod: qd === 0 ? "bolme.sifir" : "bolme.kac", odak: odakP, etiket: `${cur} içinde ${d} kaç kere`,
      ipucu: qd === 0 ? `${cur}, ${diEk(d, "den")} küçük. O zaman kaç kere var?` : `${d} × ? sayısı ${diEk(cur, "i")} geçmesin, en büyüğünü bul.`,
      aciklama: qd === 0 ? `${cur}, ${diEk(d, "den")} küçük: 0 kere var. Bölüme <b>0</b> yazılır, sıradaki basamak indirilir.`
        : `${d} × ${qd} = ${qd * d}, ${diEk(cur, "i")} geçmiyor; ${d} × ${qd + 1} = ${(qd + 1) * d} geçiyor. Bölüme <b>${qd}</b> yazılır.` });
    if (qd > 0) {
      const carp = qd * d, cs = String(carp);
      const Rp = ilkCarpim ? R1 : iz.satir("buyuk");
      ilkCarpim = false;
      const pHucre = cs.split("").map((x, i) => iz.koy(Rp, col(bitis - cs.length + 1 + i), { rol: "sonuc", beklenen: x }));
      iz.koy(Rp, col(bitis - cs.length + 1) - 1, { rol: "isaret", goster: "−" });
      adimlar.push({ tip: "yaz", soru: `${qd} × ${d} = ? Çarpımı ${diEk(cur, "in")} altına yaz.`, hucreler: pHucre, beklenen: cs, kod: "bolme.carp", odak: [bolumHucreleri[qi], ...odakP],
        etiket: `${qd} × ${d}`, ipucu: "Bölüme yazdığın rakamla böleni çarp.", aciklama: `${qd} × ${d} = <b>${carp}</b>` });
      const Rc = iz.satir("cizgi");
      const bas = Math.min(col(bitis - String(cur).length + 1), col(bitis - cs.length + 1));
      for (let c = bas; c <= col(bitis); c++) iz.koy(Rc, c, { rol: "cizgi" });
      const fark = cur - carp, fs = String(fark);
      const Rf = iz.satir("buyuk");
      const fHucre = fs.split("").map((x, i) => iz.koy(Rf, col(bitis - fs.length + 1 + i), { rol: "sonuc", beklenen: x }));
      adimlar.push({ tip: "yaz", soru: `${cur} − ${carp} = ? Farkı çizginin altına yaz.`, hucreler: fHucre, beklenen: fs, kod: "bolme.cikar", odak: pHucre,
        etiket: `${cur} − ${carp}`, ipucu: "Alt alta çıkar.", aciklama: `${cur} − ${carp} = <b>${fark}</b>` + (fark >= d ? " — dikkat: fark bölenden büyük olmamalı!" : "") });
      satir = Rf; cur = fark; odakP = fHucre;
    }
    if (bitis === n - 1) break;
    bitis++;
    const ind = iz.koy(satir, col(bitis), { rol: "sonuc", beklenen: s[bitis], indirilen: true });
    adimlar.push({ tip: "yaz", soru: `Sıradaki basamağı <b>indir</b>: bölünenin bir sonraki rakamını yanına yaz.`, hucreler: [ind], beklenen: s[bitis], kod: "bolme.indir",
      odak: [R0 + "_" + col(bitis)], etiket: `${s[bitis]} rakamını indirme`, ipucu: "Bölünende sırası gelen rakama bak.", aciklama: `Sıradaki rakam <b>${s[bitis]}</b> aşağı iner.` });
    cur = cur * 10 + +s[bitis]; qi++;
    odakP = [...odakP, ind];
  }
  adimlar.push({ tip: "hesap", rehberli: true, soru: `İşlem bitti. <b>Kalan kaç?</b>`, beklenen: String(kalan), kod: "bolme.kalan", odak: odakP, etiket: `${a} ÷ ${d}: kalan`,
    ipucu: "En alttaki sayı kalandır; bölenden küçük olmalı.", aciklama: `Kalan <b>${kalan}</b>. Sağlama: ${d} × ${q}${kalan ? " + " + kalan : ""} = ${a}` });
  return { tur: "bolme", ifade: `${a} ÷ ${d}`, sonuc: q, kalan, iz, adimlar };
}

function diIslemKur(tur, sayilar) {
  if (tur === "toplama") return diToplamaKur(sayilar);
  if (tur === "cikarma") return diCikarmaKur(sayilar[0], sayilar[1]);
  if (tur === "carpma") return diCarpmaKur(sayilar[0], sayilar[1]);
  return diBolmeKur(sayilar[0], sayilar[1]);
}

/* ---------- Serbest mod denetimi: hücreleri beklenenle karşılaştırır, hataları adımlara bağlar ---------- */
function diHucreDogru(h) {
  if (h.rol === "sabit") return !h.cizilecek || h.cizili;
  if (h.beklenen == null) return true;
  const g = (h.giris || "").trim();
  if (h.kabul) return h.kabul.includes(g) || g === h.beklenen;
  return g === h.beklenen;
}
function diDenetle(is) {
  const iz = is.iz, hatalar = [], adimSonuc = [];
  for (const a of is.adimlar) {
    if (!a.hucreler || a.tip === "bilgi") continue;
    let ok;
    if (a.tip === "ciz") ok = iz.h[a.hucreler[0]].cizili;
    else if (a.tip === "yer") ok = diHucreDogru(iz.h[Object.keys(iz.h).find(id => iz.h[id].kaydirma)]) && (iz.h[a.hucreler[0]].giris || "") !== "";
    else ok = a.hucreler.every(id => diHucreDogru(iz.h[id]));
    adimSonuc.push({ a, ok });
    if (!ok) hatalar.push({ kod: a.kod, aciklama: a.aciklama, etiket: a.etiket, hucreler: a.hucreler });
  }
  // Beklenmeyen yere yazılan elde / üst sayı, gereksiz çizme
  for (const h of Object.values(iz.h)) {
    const adimda = is.adimlar.some(a => a.hucreler && a.hucreler.includes(h.id));
    if (!adimda && (h.giris || "") !== "" && !diHucreDogru(h)) {
      const kod = h.bosKod || (is.tur === "cikarma" ? "cikarma.fark" : is.tur + ".yaz");
      hatalar.push({ kod, fazla: true, hucreler: [h.id], etiket: h.rol === "elde" ? "gereksiz elde" : "fazladan yazılan rakam",
        aciklama: h.rol === "elde" ? "Bu basamağa elde gelmiyor; buradaki rakamı sil." : h.kaydirma ? "İkinci satırda birler yeri boş kalır." : "Buraya bir şey yazılmaz." });
      adimSonuc.push({ a: { kod, etiket: h.rol === "elde" ? "gereksiz elde yazma" : "fazladan rakam" }, ok: false, fazla: true });
    }
    if (h.rol === "sabit" && h.cizili && !h.cizilecek && is.tur === "cikarma") {
      const aliciMi = (iz.al(h.r - 1, h.c) || {}).beklenen;
      if (!aliciMi) {
        hatalar.push({ kod: "cikarma.ciz", fazla: true, hucreler: [h.id], etiket: "gereksiz çizme", aciklama: "Bu rakam onluk vermedi; çizilmemeli." });
        adimSonuc.push({ a: { kod: "cikarma.ciz", etiket: "gereksiz çizme" }, ok: false, fazla: true });
      }
    }
  }
  return { hatalar, adimSonuc, tamam: !hatalar.length };
}
function diCozumuDoldur(is) {
  for (const h of Object.values(is.iz.h)) {
    if (h.rol === "sabit" && h.cizilecek) h.cizili = true;
    else if (h.rol === "sabit") h.cizili = false;
    else if (h.beklenen != null) h.giris = h.beklenen;
  }
}

// Adımın değerini hücrelere dağıtır: tek hücreli adımda (ör. onluk bozmada "12") değerin tamamı o kutuya yazılır
function diHucrelereYaz(iz, hucreler, deger) {
  if (hucreler.length === 1) { iz.h[hucreler[0]].giris = deger; return; }
  const n = hucreler.length, s = String(deger).slice(-n).padStart(n, " ");
  hucreler.forEach((id, i) => { iz.h[id].giris = s[i].trim(); });
}
function diAdimUzunlugu(iz, a) { return a.hucreler.length === 1 ? (iz.h[a.hucreler[0]].uzun || 1) : a.hucreler.length; }

/* ====================================================================================================
   Bölüm 2 — EKRANLAR
   ==================================================================================================== */
const di = { gecmis: { sorular: {} }, mod: {}, oyun: null };
const DI_TUR_UZUNLUGU = 5;
function diModOku(islem) { try { return localStorage.getItem("ogretmenim.di.mod." + islem) || ""; } catch (_) { return ""; } }
function diModYaz(islem, m) { try { localStorage.setItem("ogretmenim.di.mod." + islem, m); } catch (_) { /* önemli değil */ } }

function diSeviyeDurumu(islem, sev) {
  const on = `di|${islem}|${sev}|`;
  const kayitlar = Object.entries(di.gecmis.sorular || {}).filter(([k]) => k.startsWith(on)).map(([, v]) => v);
  const deneme = kayitlar.reduce((t, v) => t + v.d, 0);
  const hatasiz = kayitlar.reduce((t, v) => t + v.son.filter(x => x[0]).length, 0);
  return { deneme, hatasiz, ilerleme: Math.min(1, hatasiz / 8) };
}
function diOnerilen(islem) {
  const S = DI_ISLEMLER[islem].seviyeler;
  for (let i = 0; i < S.length; i++) if (diSeviyeDurumu(islem, i + 1).ilerleme < 1) return i + 1;
  return S.length;
}

function atolyeKartiHtml() {
  return `<button class="muf-unite atolye-kart" data-atolye>
    <span class="mu-no">🧮</span>
    <span class="mu-yazi"><b>Dört İşlem Atölyesi</b><small>İlkokulda öğrendiğin gibi alt alta: elde, onluk bozma, çarpma, bölme</small></span></button>`;
}
async function diGecmisYenile() { try { di.gecmis = await api("GET", "oyun/dortislem/gecmis"); } catch (_) { di.gecmis = { sorular: {} }; } }

async function atolyeEkrani() {
  mufOyunuDurdur();
  muf.ekran = "atolye";
  mufBaslik(["Matematik", "Dört İşlem Atölyesi"]);
  oyunIlerleme(0, 0);
  await diGecmisYenile();
  if (muf.ekran !== "atolye") return;
  $("#oyun-alan").innerHTML = `<div class="muf-ust"><h3>🧮 Dört İşlem Atölyesi</h3><p>Hangi işlemi çalışmak istersin? Eldeyi, onluk bozmayı, kaydırmayı sen yazarsın.</p></div>
    <div class="di-islemler">${DI_SIRA.map(k => { const I = DI_ISLEMLER[k], o = diOnerilen(k); return `
      <button class="di-islem-kart" data-di-islem="${k}" style="--renk:${I.renk}">
        <span class="di-islem-simge">${I.simge}</span><b>${I.ad}</b><small>${I.terim}</small>
        <em>Önerilen: ${o}. seviye · ${esc(I.seviyeler[o - 1].ad)}</em></button>`; }).join("")}</div>`;
}

function diIslemEkrani(islem) {
  mufOyunuDurdur();
  const I = DI_ISLEMLER[islem];
  muf.ekran = "atolye-islem"; di.islem = islem;
  mufBaslik(["Matematik", "Dört İşlem Atölyesi", I.ad]);
  oyunIlerleme(0, 0);
  const oneri = diOnerilen(islem);
  const mod = diModOku(islem) || "rehberli";
  $("#oyun-alan").innerHTML = `<div class="muf-ust"><h3>${I.simge} ${I.ad}</h3><p>Seviyeyi seç. Hepsi açık; önerilen seviye işaretli.</p></div>
    <div class="di-mod" role="radiogroup" aria-label="Çalışma şekli">
      <button class="${mod === "rehberli" ? "aktif" : ""}" data-di-mod="rehberli" role="radio" aria-checked="${mod === "rehberli"}"><b>🧭 Birlikte yapalım</b><small>Adım adım sorarım</small></button>
      <button class="${mod === "serbest" ? "aktif" : ""}" data-di-mod="serbest" role="radio" aria-checked="${mod === "serbest"}"><b>✍️ Kendin yap</b><small>Sen yazarsın, sonunda kontrol ederiz</small></button>
    </div>
    <div class="di-seviyeler">${I.seviyeler.map((s, i) => { const d = diSeviyeDurumu(islem, i + 1); return `
      <button class="di-seviye${i + 1 === oneri ? " onerilen" : ""}" data-di-seviye="${i + 1}">
        <span class="di-sev-no">${i + 1}</span><span class="di-sev-yazi"><b>${esc(s.ad)}</b><small>Örnek: ${esc(s.ornek)}</small>
        ${i + 1 === oneri ? `<em>Önerilen</em>` : ""}</span>
        ${d.deneme ? `<span class="muf-cubuk" title="Hatasız yaptıkların"><i style="width:${Math.round(d.ilerleme * 100)}%"></i></span>` : ""}</button>`; }).join("")}</div>`;
}

async function diTurBaslat(islem, sev, mod) {
  mufOyunuDurdur();
  const I = DI_ISLEMLER[islem];
  muf.ekran = "atolye-oyun";
  mufBaslik(["Matematik", "Dört İşlem", `${I.ad} · ${sev}. seviye`]);
  const ctx = miniOyun.ctx = {
    oyun: { id: "dortislem", ders: "matematik" }, alan: $("#oyun-alan"), gecmis: di.gecmis, kapandi: false,
    etiket: { konu: `Dört İşlem · ${I.ad}`, etkinlik: "Dört İşlem Atölyesi" }, ilerleme: oyunIlerleme, ses: sesCal,
    cik: () => { mufOyunuDurdur(); diGecmisYenile().then(() => diIslemEkrani(islem)); }, cikYazi: "☰ Seviyelere dön",
    yeniden: () => diTurBaslat(islem, sev, mod),
  };
  ctx.kaydet = k => oyunCevapKaydet(ctx.oyun, k, ctx);
  const goruldu = new Set();
  let hatasiz = 0;
  for (let i = 0; i < DI_TUR_UZUNLUGU; i++) {
    let sayilar;
    for (let t = 0; t < 20; t++) { sayilar = I.seviyeler[sev - 1].uret(); if (sayilar && !goruldu.has(sayilar.join())) break; }
    goruldu.add(sayilar.join());
    ctx.ilerleme(i, DI_TUR_UZUNLUGU);
    const is = diIslemKur(islem, sayilar);
    is.sev = sev; is.no = i + 1;
    const sonuc = await diIslemOyna(ctx, is, mod);
    if (ctx.kapandi) return;
    if (sonuc.hatasiz) hatasiz++;
  }
  turSonu(ctx, { dogru: hatasiz, toplam: DI_TUR_UZUNLUGU }, {
    tekrar: () => diTurBaslat(islem, sev, mod), menu: () => { diGecmisYenile().then(() => diIslemEkrani(islem)); },
    not: `${DI_TUR_UZUNLUGU} işlemin <b>${hatasiz}</b> tanesini hiç yardım almadan bitirdin.` + (mod === "rehberli" && hatasiz >= 4 ? " Sıradaki turda <b>✍️ Kendin yap</b>'ı dene!" : ""),
  });
}

/* ---------- Izgara çizimi ---------- */
function diIzgaraHtml(is, o) {
  const iz = is.iz;
  const buyukSay = iz.satirlar.filter(s => s.tur === "buyuk").length, kucukSay = iz.satirlar.filter(s => s.tur === "kucuk").length;
  const boy = Math.max(38, Math.min(58, Math.floor((470 - kucukSay * 28) / Math.max(1, buyukSay))));
  const genislik = Math.max(38, Math.min(boy, Math.floor(560 / iz.W)));
  let h = `<div class="di-izgara tur-${is.tur}" style="--di-h:${boy}px;--di-w:${genislik}px;--di-sutun:${iz.W}">`;
  iz.satirlar.forEach((s, r) => {
    h += `<div class="di-satir ${s.tur} ${s.sinif}">`;
    for (let c = 0; c < iz.W; c++) {
      const x = iz.al(r, c);
      if (!x) { h += `<span class="di-h r-bos"></span>`; continue; }
      const sinif = ["di-h", "r-" + x.rol, x.kucuk ? "kucuk" : "", x.cizili ? "cizili" : "", x.solCizgi ? "sol-cizgi" : "", x.altCizgi ? "alt-cizgi" : "",
        x.bolum ? "bolum" : "", o.aktif && o.aktif.includes(x.id) ? "aktif" : "", o.aday && o.aday.includes(x.id) ? "aday" : "",
        o.odak && o.odak.includes(x.id) ? "odak" : "", o.yanlis && o.yanlis.includes(x.id) ? "yanlis" : "", o.dogru && o.dogru.includes(x.id) ? "dogru" : "",
        o.secili === x.id ? "secili" : "", o.tikla && o.tikla(x) ? "tiklanir" : ""].filter(Boolean).join(" ");
      const yazi = x.rol === "sabit" || x.rol === "isaret" ? x.goster : x.rol === "cizgi" || x.rol === "bos" ? "" : (x.giris || "");
      h += `<span class="${sinif}" data-h="${x.id}">${esc(yazi)}</span>`;
    }
    h += `</div>`;
  });
  return h + `</div>`;
}

/* ---------- Tek işlem: rehberli ya da serbest ---------- */
function diIslemOyna(ctx, is, mod) {
  return new Promise(bitti => {
    const I = DI_ISLEMLER[is.tur];
    const st = { i: 0, deneme: 0, girdi: "", yerTamam: false, secili: null, kontrol: 0, yanlis: [], dogru: [], hataVar: false, bitti: false, yardim: 0 };
    const adimlar = is.adimlar.filter(a => mod === "rehberli" || !a.rehberli);
    di.oyun = { is, st, adimlar, mod };             // test ve hata ayıklama için
    ctx.alan.innerHTML = `<div class="di-oyun">
      <div class="di-sol"><div class="di-ust"><span class="di-no">İşlem ${is.no} / ${DI_TUR_UZUNLUGU}</span><span class="di-ifade">${esc(is.ifade)}</span>
        <span class="di-mod-etiket">${mod === "rehberli" ? "🧭 Birlikte" : "✍️ Kendin"}</span></div><div class="di-izgara-kap"></div><div class="di-sol-not" aria-live="polite"></div></div>
      <div class="di-sag"><div class="di-yonerge" aria-live="polite"></div><div class="di-cevap"></div><div class="di-tuslar"></div><div class="di-alt"></div></div></div>`;
    const $k = s => ctx.alan.querySelector(s);
    const kayit = (a, dogru, cevap) => ctx.kaydet({ beceri: "matematik.di." + a.kod, beceri_adi: DI_BECERI[a.kod] || a.kod, konu: `Dört İşlem · ${I.ad}`,
      etkinlik: "Dört İşlem Atölyesi", soru: `dia|${is.ifade} · ${a.etiket}`, cevap, dogru, bicim: mod === "rehberli" ? "rehber" : "serbest" });
    const bitir = () => {
      if (st.bitti) return;
      st.bitti = true;
      const hatasiz = !st.hataVar;
      ctx.kaydet({ beceri: "matematik.di." + is.tur, beceri_adi: `${I.ad} (işlemin tamamı)`, konu: `Dört İşlem · ${I.ad}`, etkinlik: "Dört İşlem Atölyesi",
        soru: `di|${is.tur}|${is.sev}|${is.ifade} (işlemin tamamı)`, cevap: "", dogru: hatasiz, bicim: mod === "rehberli" ? "rehber" : "serbest" });
      ctx.ses(hatasiz ? "kutla" : "dogru");
      ciz({});
      $k(".di-yonerge").innerHTML = `<div class="di-bitti ${hatasiz ? "iyi" : ""}"><b>${hatasiz ? "✅ Hatasız bitirdin!" : "✔️ İşlem tamam."}</b>
        <span>${esc(is.ifade)} = <b>${is.sonuc}</b>${is.kalan ? `, kalan <b>${is.kalan}</b>` : ""}</span>
        ${hatasiz ? "" : `<span class="di-not">Takıldığın yerleri bir sonraki işlemde hatırla.</span>`}</div>`;
      $k(".di-cevap").innerHTML = ""; $k(".di-tuslar").innerHTML = "";
      $k(".di-alt").innerHTML = `<button class="dugme ana di-sonraki">${is.no < DI_TUR_UZUNLUGU ? "Sonraki işlem ▶" : "Turu bitir ▶"}</button>`;
      $k(".di-sonraki").addEventListener("click", () => { klavyeKapat(); bitti({ hatasiz }); });
      $k(".di-sonraki").focus();
    };

    /* --- ortak: ızgara ve tuş takımı --- */
    let izgaraSecenek = {};
    const ciz = o => { izgaraSecenek = o; $k(".di-izgara-kap").innerHTML = diIzgaraHtml(is, o); };
    const tuslarCiz = (onayYazi, onayGoster = true) => {
      $k(".di-tuslar").innerHTML = `<div class="di-tt">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map(r => `<button class="tt" data-t="${r}">${r}</button>`).join("")}
        <button class="tt sil" data-t="sil" title="Sil">⌫</button><button class="tt" data-t="0">0</button>
        ${onayGoster ? `<button class="tt tamam" data-t="ok" title="${onayYazi}">✓</button>` : `<span></span>`}</div>`;
    };
    $k(".di-tuslar").addEventListener("click", e => { const b = e.target.closest(".tt"); if (b && !b.disabled) { sesCal("tik"); tusa(b.dataset.t); } });
    const klavye = e => {
      if (ctx.kapandi || !document.body.contains(ctx.alan) || !$("#oyun-pencere").open) return klavyeKapat();
      if (/^[0-9]$/.test(e.key)) { tusa(e.key); e.preventDefault(); }
      else if (e.key === "Backspace") { tusa("sil"); e.preventDefault(); }
      else if (e.key === "Enter") { const s = $k(".di-sonraki") || $k(".di-devam"); if (s) s.click(); else tusa("ok"); e.preventDefault(); }
    };
    const klavyeKapat = () => document.removeEventListener("keydown", klavye);
    document.addEventListener("keydown", klavye);
    let tusa = () => {};

    /* ================= REHBERLİ ================= */
    if (mod === "rehberli") {
      const adim = () => adimlar[st.i];
      const goster = () => {
        const a = adim();
        if (!a) return bitir();
        st.girdi = "";
        const aktif = a.tip === "yaz" || (a.tip === "yeryaz" && st.yerTamam) ? a.hucreler : [];
        const aday = (a.tip === "yeryaz" && !st.yerTamam) || a.tip === "yer" ? a.adaylar : [];
        const tikla = a.tip === "ciz" ? (x => x.cizilebilir && !x.cizili) : null;
        ciz({ aktif, aday, odak: a.odak || [], tikla });
        $k(".di-yonerge").innerHTML = `<div class="di-adim-no">Adım ${st.i + 1} / ${adimlar.length}</div><p>${a.soru}</p><div class="di-ipucu"></div>`;
        $k(".di-cevap").innerHTML = ""; $k(".di-alt").innerHTML = ""; $k(".di-tuslar").innerHTML = "";
        if (a.tip === "bilgi") { $k(".di-alt").innerHTML = `<button class="dugme ana di-devam">Tamam ▶</button>`; $k(".di-devam").addEventListener("click", ileri); return; }
        if (a.tip === "secim") {
          $k(".di-cevap").innerHTML = `<div class="di-secenekler">${a.secenekler.map(s => `<button class="dugme di-secenek" data-s="${esc(s)}">${esc(s)}</button>`).join("")}</div>`;
          $k(".di-cevap").querySelectorAll(".di-secenek").forEach(b => b.addEventListener("click", () => kontrol(b.dataset.s, b)));
          return;
        }
        if (a.tip === "hesap") $k(".di-cevap").innerHTML = `<div class="di-kutu"><span class="di-kutu-deger"></span><span class="tt-imlec"></span></div>`;
        if (a.tip === "hesap" || a.tip === "yaz" || (a.tip === "yeryaz" && st.yerTamam)) tuslarCiz("Tamam");
        if (a.tip === "yeryaz" && st.yerTamam) $k(".di-yonerge p").innerHTML = `Doğru kutu! Şimdi eldeyi <b>yaz</b>.`;
      };
      const girdiGoster = () => {
        const a = adim(); if (!a) return;
        if (a.tip === "hesap") { $k(".di-kutu-deger").textContent = st.girdi; return; }
        if (a.tip === "yaz" || a.tip === "yeryaz") {
          diHucrelereYaz(is.iz, a.hucreler, st.girdi);
          ciz(izgaraSecenek);
        }
      };
      const yanlisVer = (cevap, dugme) => {
        if (st.gecis) return;
        const a = adim();
        st.deneme++; st.hataVar = true;
        ctx.ses("yanlis");
        if (dugme) dugme.classList.add("yanlis");
        if (st.deneme === 1) {
          kayit(a, false, cevap);
          $k(".di-ipucu").innerHTML = `<span class="di-hata">🤔 Bir daha düşün. ${esc(a.ipucu || "")}</span>`;
          if (a.tip === "yaz" || a.tip === "yeryaz") { st.girdi = ""; if (a.tip === "yaz" || st.yerTamam) a.hucreler.forEach(id => { is.iz.h[id].giris = ""; }); ciz(izgaraSecenek); }
          if (a.tip === "hesap") { st.girdi = ""; girdiGoster(); }
          return;
        }
        // İkinci yanlış: doğrusu gösterilir
        st.yardim++;
        uygula(a);
        ciz({ odak: a.odak || [], dogru: a.hucreler || [] });
        $k(".di-ipucu").innerHTML = `<span class="di-aciklama">💡 ${a.aciklama || ""}</span>`;
        $k(".di-cevap").innerHTML = a.tip === "hesap" || a.tip === "secim" ? `<div class="di-dogrusu">Doğrusu: <b>${esc(a.beklenen)}</b></div>` : "";
        $k(".di-tuslar").innerHTML = "";
        $k(".di-alt").innerHTML = `<button class="dugme ana di-devam">Anladım ▶</button>`;
        $k(".di-devam").addEventListener("click", ileri);
      };
      const uygula = a => {
        if (a.tip === "ciz") is.iz.h[a.hucreler[0]].cizili = true;
        else if (a.tip === "yaz" || a.tip === "yeryaz") diHucrelereYaz(is.iz, a.hucreler, a.beklenen);
      };
      const ileri = () => { st.i++; st.deneme = 0; st.yerTamam = false; st.gecis = false; goster(); };
      const dogruVer = a => {
        if (st.gecis) return;
        st.gecis = true;                               // geçiş sırasında ikinci tıklama sayılmaz
        if (st.deneme === 0) kayit(a, true, a.beklenen || "");
        uygula(a);
        ctx.ses("dogru");
        ciz({ odak: a.odak || [], dogru: a.hucreler || [] });
        $k(".di-ipucu").innerHTML = `<span class="di-iyi">✓ ${rastgele(["Doğru!", "Evet!", "Aferin!", "Tamam!", "Süper!"])}</span>`;
        $k(".di-tuslar").querySelectorAll(".tt").forEach(b => { b.disabled = true; });
        setTimeout(() => { if (!ctx.kapandi) ileri(); }, 650);
      };
      const kontrol = (cevap, dugme) => {
        if (st.gecis) return;
        const a = adim();
        if (String(cevap) === String(a.beklenen)) { if (dugme) dugme.classList.add("dogru"); dogruVer(a); }
        else yanlisVer(String(cevap), dugme);
      };
      tusa = t => {
        const a = adim();
        if (st.gecis || !a || !["hesap", "yaz", "yeryaz"].includes(a.tip) || (a.tip === "yeryaz" && !st.yerTamam)) return;
        if ($k(".di-devam")) return;
        const enFazla = a.tip === "hesap" ? 4 : diAdimUzunlugu(is.iz, a);
        if (t === "sil") st.girdi = st.girdi.slice(0, -1);
        else if (t === "ok") { if (st.girdi !== "") kontrol(st.girdi.replace(/^0+(?=\d)/, "")); return; }
        else if (st.girdi.length < enFazla) st.girdi += t;
        girdiGoster();
      };
      $k(".di-izgara-kap").addEventListener("click", e => {
        const x = e.target.closest("[data-h]"); if (!x) return;
        const a = adim(); if (st.gecis || !a || $k(".di-devam")) return;
        const h = is.iz.h[x.dataset.h];
        if (a.tip === "ciz") { if (!h.cizilebilir) return; if (h.id === a.hucreler[0]) dogruVer(a); else yanlisVer(`${h.goster} çizildi`); return; }
        if ((a.tip === "yeryaz" && !st.yerTamam) || a.tip === "yer") {
          if (!a.adaylar.includes(h.id)) return;
          if (h.id === a.hucreler[0]) {
            if (a.tip === "yer") return dogruVer(a);
            st.yerTamam = true; goster();
          } else yanlisVer("yanlış kutu");
        }
      });
      goster();
      return;
    }

    /* ================= SERBEST ================= */
    const girisHucreleri = Object.values(is.iz.h).filter(h => ["sonuc", "elde", "ust"].includes(h.rol));
    const serbestCiz = () => ciz({ secili: st.secili, yanlis: st.yanlis, dogru: st.dogru, tikla: x => ["sonuc", "elde", "ust"].includes(x.rol) || x.cizilebilir });
    const ipucuMetni = {
      toplama: "Birler basamağından başla. 10 ya da daha fazla çıkarsa birlerini yaz, eldeyi soldaki basamağın üstündeki küçük kutuya yaz.",
      cikarma: "Birlerden başla. Üstteki küçükse onluk boz: soldaki rakamın üstüne tıklayıp çiz, bir eksiğini üstündeki kutuya, oluşan yeni sayıyı bozduğun basamağın üstüne yaz.",
      carpma: "Önce alttaki sayının birler rakamıyla çarp; eldeleri küçük kutulara yaz. Onlarla çarparken satır bir basamak sola kayar.",
      bolme: "Kaç kere var → bölüme yaz → çarp → altına yaz → çıkar → sıradaki rakamı indir.",
    }[is.tur];
    $k(".di-yonerge").innerHTML = `<p><b>Kendin yap.</b> Bir kutuya tıkla, rakamı yaz.${is.tur === "cikarma" ? " Çizmek için rakamın üstüne tıkla." : ""}</p>
      <details class="di-nasil"><summary>Nasıl yapılır?</summary><p class="di-kucuk">${ipucuMetni}</p></details><div class="di-ipucu"></div>`;
    tuslarCiz("", false);
    $k(".di-alt").innerHTML = `<button class="dugme ana di-kontrol">✓ Kontrol et</button>`;
    const sol = h => girisHucreleri.filter(x => x.r === h.r && x.c < h.c).sort((a, b) => b.c - a.c)[0];
    tusa = t => {
      if (st.bitti || t === "ok") return t === "ok" && kontrolEt();
      const h = is.iz.h[st.secili]; if (!h) return;
      const uzun = h.uzun || (h.rol === "elde" ? 1 : 1);
      if (t === "sil") h.giris = (h.giris || "").slice(0, -1);
      else if ((h.giris || "").length < uzun) h.giris = (h.giris || "") + t;
      else h.giris = t;
      st.yanlis = st.yanlis.filter(id => id !== h.id);
      if (t !== "sil" && uzun === 1 && h.rol === "sonuc" && !h.bolum && is.tur !== "bolme") { const s = sol(h); if (s) st.secili = s.id; }
      serbestCiz();
    };
    $k(".di-izgara-kap").addEventListener("click", e => {
      const x = e.target.closest("[data-h]"); if (!x || st.bitti) return;
      const h = is.iz.h[x.dataset.h];
      if (h.cizilebilir) { h.cizili = !h.cizili; sesCal("tik"); st.yanlis = st.yanlis.filter(id => id !== h.id); return serbestCiz(); }
      if (["sonuc", "elde", "ust"].includes(h.rol)) { st.secili = h.id; serbestCiz(); }
    });
    const kontrolEt = () => {
      if (st.bitti) return;
      const d = diDenetle(is);
      st.kontrol++;
      if (st.kontrol === 1) {
        const yazildi = new Set();
        for (const s of d.adimSonuc) {
          const anahtar = s.a.kod + "|" + (s.a.etiket || "");
          if (yazildi.has(anahtar)) continue; yazildi.add(anahtar);
          kayit(s.a, s.ok, s.ok ? "" : "hatalı");
        }
        if (!d.tamam) st.hataVar = true;
      }
      if (d.tamam) { st.yanlis = []; $k(".di-sol-not").innerHTML = ""; return bitir(); }
      ctx.ses("yanlis");
      st.yanlis = [...new Set(d.hatalar.flatMap(h => h.hucreler || []))];
      serbestCiz();
      const ilk = d.hatalar.slice(0, 3);
      $k(".di-sol-not").innerHTML = `<div class="di-hatalar"><b>🔎 ${d.hatalar.length === 1 ? "Bir yerde hata var" : d.hatalar.length + " yerde hata var"}:</b>
        <ul>${ilk.map(h => `<li>${esc(DI_BECERI[h.kod] ? DI_BECERI[h.kod].split(": ")[1] : h.etiket)} — <i>${esc(h.etiket || "")}</i></li>`).join("")}</ul>
        <span class="di-kucuk">Kırmızı kutuları düzelt ve yeniden kontrol et.</span></div>`;
      $k(".di-alt").innerHTML = `<button class="dugme ana di-kontrol">✓ Yeniden kontrol et</button><button class="dugme di-goster">Doğrusunu göster</button>`;
      $k(".di-kontrol").addEventListener("click", kontrolEt);
      $k(".di-goster").addEventListener("click", () => {
        st.yardim++;
        diCozumuDoldur(is); st.yanlis = [];
        const acik = d.hatalar.slice(0, 3).map(h => `<li>${h.aciklama || ""}</li>`).join("");
        ciz({ dogru: d.hatalar.flatMap(h => h.hucreler || []) });
        st.bitti = false;
        $k(".di-sol-not").innerHTML = `<div class="di-hatalar di-cozum"><b>💡 Doğrusu yeşil kutularda.</b><ul>${acik}</ul></div>`;
        $k(".di-alt").innerHTML = `<button class="dugme ana di-devam">Anladım ▶</button>`;
        $k(".di-devam").addEventListener("click", () => { st.hataVar = true; $k(".di-sol-not").innerHTML = ""; bitir(); });
      });
    };
    $k(".di-kontrol").addEventListener("click", kontrolEt);
    const ilkHucre = girisHucreleri.filter(h => h.rol === "sonuc").sort((a, b) => (is.tur === "bolme" ? (a.bolum ? -1 : 1) : 0) || b.r - a.r || b.c - a.c)[0];
    st.secili = ilkHucre ? ilkHucre.id : null;
    serbestCiz();
  });
}

/* ---------- Olaylar ---------- */
function atolyeOlaylariniKur() {
  $("#oyun-alan").addEventListener("click", e => {
    if (muf.ders !== "matematik") return;
    if (e.target.closest("[data-atolye]")) { sesCal("tik"); return atolyeEkrani(); }
    const ik = e.target.closest("[data-di-islem]");
    if (ik && muf.ekran === "atolye") { sesCal("tik"); return diIslemEkrani(ik.dataset.diIslem); }
    const md = e.target.closest("[data-di-mod]");
    if (md && muf.ekran === "atolye-islem") {
      diModYaz(di.islem, md.dataset.diMod);
      $$("[data-di-mod]").forEach(b => { b.classList.toggle("aktif", b === md); b.setAttribute("aria-checked", b === md); });
      return;
    }
    const sv = e.target.closest("[data-di-seviye]");
    if (sv && muf.ekran === "atolye-islem") {
      sesCal("tik");
      const sev = +sv.dataset.diSeviye;
      let mod = diModOku(di.islem);
      if (!mod) { mod = diSeviyeDurumu(di.islem, sev).deneme ? "serbest" : "rehberli"; }
      return diTurBaslat(di.islem, sev, mod);
    }
  });
}
