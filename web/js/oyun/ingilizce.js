/* ÖğretmeniM — İngilizce oyunları (0.11: Word Match, Spelling Bee)
   Kelimeler 5. sınıf ünitelerine göre gruplanır (Maarif 2024 İngilizce programı temaları). */
"use strict";

// Ünite → [emoji, English, Türkçe]
const ING_UNITELER = [
  { kod: "school", ad: "School & Classroom", simge: "🏫", kelimeler: [
    ["✏️", "pencil", "kurşun kalem"], ["📖", "book", "kitap"], ["📏", "ruler", "cetvel"], ["✂️", "scissors", "makas"],
    ["🎒", "bag", "çanta"], ["📓", "notebook", "defter"], ["💻", "computer", "bilgisayar"], ["🪑", "chair", "sandalye"],
    ["🖍️", "crayon", "pastel boya"], ["🗺️", "map", "harita"], ["🕐", "clock", "saat"], ["👩‍🏫", "teacher", "öğretmen"]] },
  { kod: "subjects", ad: "School Subjects", simge: "📚", kelimeler: [
    ["➗", "maths", "matematik"], ["🔬", "science", "fen bilimleri"], ["🎵", "music", "müzik"], ["🎨", "art", "görsel sanatlar"],
    ["🧭", "geography", "coğrafya"], ["⚽", "sport", "spor"], ["💾", "computing", "bilişim"], ["📜", "history", "tarih"]] },
  { kod: "family", ad: "Family", simge: "👨‍👩‍👦", kelimeler: [
    ["👩", "mother", "anne"], ["👨", "father", "baba"], ["👶", "baby", "bebek"], ["👵", "grandmother", "büyükanne"],
    ["👴", "grandfather", "büyükbaba"], ["👦", "brother", "erkek kardeş"], ["👧", "sister", "kız kardeş"], ["🧒", "cousin", "kuzen"]] },
  { kod: "food", ad: "Food & Drinks", simge: "🍎", kelimeler: [
    ["🍎", "apple", "elma"], ["🍌", "banana", "muz"], ["🍞", "bread", "ekmek"], ["🥛", "milk", "süt"], ["🥚", "egg", "yumurta"],
    ["🧀", "cheese", "peynir"], ["🍊", "orange", "portakal"], ["🍰", "cake", "pasta"], ["💧", "water", "su"], ["🍅", "tomato", "domates"],
    ["🍯", "honey", "bal"], ["🫒", "olive", "zeytin"]] },
  { kod: "clothes", ad: "Clothes", simge: "👕", kelimeler: [
    ["👕", "shirt", "gömlek / tişört"], ["👗", "dress", "elbise"], ["👟", "shoes", "ayakkabı"], ["🧢", "cap", "şapka (kasket)"],
    ["🧥", "coat", "mont / palto"], ["🧦", "socks", "çorap"], ["👖", "jeans", "kot pantolon"], ["🧣", "scarf", "atkı"], ["🧤", "gloves", "eldiven"]] },
  { kod: "city", ad: "Neighbourhood & City", simge: "🏙️", kelimeler: [
    ["🏥", "hospital", "hastane"], ["🏫", "school", "okul"], ["🏦", "bank", "banka"], ["🏛️", "museum", "müze"], ["🏞️", "park", "park"],
    ["🛒", "market", "market"], ["🚏", "bus stop", "otobüs durağı"], ["🍽️", "restaurant", "restoran"], ["🕌", "mosque", "cami"],
    ["🚉", "station", "istasyon"], ["🏟️", "stadium", "stadyum"], ["💊", "pharmacy", "eczane"]] },
  { kod: "nature", ad: "Nature & Animals", simge: "🌳", kelimeler: [
    ["🐱", "cat", "kedi"], ["🐶", "dog", "köpek"], ["🐦", "bird", "kuş"], ["🐟", "fish", "balık"], ["🐴", "horse", "at"],
    ["🐄", "cow", "inek"], ["🐰", "rabbit", "tavşan"], ["🐝", "bee", "arı"], ["🌳", "tree", "ağaç"], ["🌸", "flower", "çiçek"],
    ["⛰️", "mountain", "dağ"], ["🌧️", "rain", "yağmur"], ["❄️", "snow", "kar"], ["☀️", "sun", "güneş"]] },
  { kod: "universe", ad: "Universe & Future", simge: "🚀", kelimeler: [
    ["🌙", "moon", "ay"], ["⭐", "star", "yıldız"], ["🪐", "planet", "gezegen"], ["🚀", "rocket", "roket"], ["🌍", "Earth", "Dünya"],
    ["🧑‍🚀", "astronaut", "astronot"], ["🤖", "robot", "robot"], ["🛰️", "satellite", "uydu"], ["☄️", "comet", "kuyruklu yıldız"]] },
];

function ingKelimeleri(unite) {
  const uniteler = unite ? [unite] : ING_UNITELER;
  return uniteler.flatMap(u => u.kelimeler.map(([emoji, en, tr]) => ({ emoji, en, tr, unite: u })));
}
function ingMenu(ctx, baslik, aciklama, oyna) {
  oyunMenusu(ctx, {
    baslik, aciklama,
    secenekler: [...ING_UNITELER.map(u => ({ ad: u.ad, simge: u.simge, deger: u })), { ad: "Mixed", simge: "🎲", alt: "Hepsinden karışık", deger: null }],
    sec: s => oyna(s.deger),
  });
}

/* ---------- E1 Word Match ---------- */
oyunTanimla({
  id: "word-match", ders: "ingilizce", ad: "Word Match", simge: "🧩", kisa: "Resim ↔ kelime eşleştir",
  konu: "Kelime bilgisi",
  baslat(ctx) {
    const menu = () => ingMenu(ctx, "🧩 Which unit?", "Önce resimleri, sonra Türkçelerini İngilizce kelimelerle eşleştir.", oyna);
    const oyna = async unite => {
      const kelimeler = ingKelimeleri(unite);
      const cift = (k, tur) => ({
        anahtar: `${k.en} (${tur})`, sol: tur === "resim" ? k.emoji : k.tr, sag: k.en,
        solHtml: tur === "resim" ? `<span class="ing-emoji">${k.emoji}</span>` : esc(k.tr),
        beceri: "ing.kelime." + k.unite.kod, beceri_adi: "Kelimeler: " + k.unite.ad, konu: k.unite.ad,
        aciklama: `${k.emoji} <b>${esc(k.en)}</b> = ${esc(k.tr)}`,
      });
      const secilen = agirlikliSec(ctx, kelimeler, Math.min(10, kelimeler.length), k => `${k.en} (resim)`);
      const t1 = secilen.slice(0, 5).map(k => cift(k, "resim"));
      const t2 = secilen.slice(5, 10).map(k => cift(k, "türkçe"));
      let dogru = 0, toplam = 0;
      for (const [i, t] of [t1, t2].entries()) {
        if (!t.length || ctx.kapandi) continue;
        const r = await eslestirmeOyna(ctx, t, {
          yonerge: i === 0 ? "🖼️ Resmi seç, sonra İngilizcesine tıkla." : "🇹🇷 Türkçe kelimeyi seç, sonra İngilizcesine tıkla.",
          ilerlemeBas: i * 5, ilerlemeToplam: t1.length + t2.length,
        });
        dogru += r.dogru; toplam += r.toplam;
      }
      if (!ctx.kapandi) turSonu(ctx, { dogru, toplam }, { tekrar: () => oyna(unite), menu, not: "🇬🇧 Great job! Every new word opens a new door." });
    };
    menu();
  },
});

/* ---------- E2 Spelling Bee ---------- */
const ING_HARFLER = "abcdefghijklmnoprstuwy";
function harfTaslari(kelime) {
  const harfler = kelime.toLowerCase().replace(/[^a-z]/g, "").split("");
  const ekstra = [];
  while (ekstra.length < Math.min(3, Math.max(2, 9 - harfler.length))) {
    const h = ING_HARFLER[Math.floor(Math.random() * ING_HARFLER.length)];
    if (!harfler.includes(h) && !ekstra.includes(h)) ekstra.push(h);
  }
  return karistir([...harfler, ...ekstra]);
}

oyunTanimla({
  id: "spelling-bee", ders: "ingilizce", ad: "Spelling Bee", simge: "🐝", kisa: "Harfleri sırayla dizerek yaz",
  konu: "Kelimelerin yazılışı",
  baslat(ctx) {
    const menu = () => ingMenu(ctx, "🐝 Which unit?", "Resmi görülen kelimeyi harf taşlarına sırayla tıklayarak yaz.", oyna);
    const oyna = async unite => {
      const havuz = ingKelimeleri(unite).filter(k => /^[a-z]{3,9}$/i.test(k.en)).map(k => ({
        ...k, anahtar: k.en, beceri: "ing.yazim." + k.unite.kod, beceri_adi: "Yazılış: " + k.unite.ad, konu: k.unite.ad,
      }));
      const sonuc = await turOyna(ctx, agirlikliSec(ctx, havuz, 8), (kap, s, cevapla) => {
        const hedef = s.en.toLowerCase();
        const taslar = harfTaslari(hedef).map((h, i) => ({ h, i, kullanildi: false }));
        const dizilen = [];      // taş indeksleri
        const ciz = () => {
          kap.innerHTML = `<div class="soru-ust">Resimdeki şeyin İngilizcesini yaz.</div>
            <div class="spell-resim"><span class="ing-emoji buyuk">${s.emoji}</span><small>${esc(s.tr)}</small></div>
            <div class="spell-kelime">${hedef.split("").map((_, i) => `<span class="spell-kutu${dizilen[i] != null ? " dolu" : ""}">${dizilen[i] != null ? taslar[dizilen[i]].h : ""}</span>`).join("")}</div>
            <div class="spell-taslar">${taslar.map(t => `<button class="spell-tas" data-t="${t.i}" ${t.kullanildi ? "disabled" : ""}>${t.h}</button>`).join("")}</div>
            <div class="spell-alt"><button class="dugme" data-geri ${dizilen.length ? "" : "disabled"}>⌫ Geri al</button>
              <button class="dugme ana" data-kontrol ${dizilen.length === hedef.length ? "" : "disabled"}>Kontrol et ✓</button></div>`;
          kap.querySelectorAll(".spell-tas").forEach(b => b.addEventListener("click", () => {
            if (dizilen.length >= hedef.length) return;
            const t = taslar[+b.dataset.t];
            t.kullanildi = true; dizilen.push(t.i); sesCal("tik"); ciz();
          }));
          kap.querySelector("[data-geri]").addEventListener("click", () => {
            const son = dizilen.pop();
            if (son != null) taslar[son].kullanildi = false;
            ciz();
          });
          kap.querySelector("[data-kontrol]").addEventListener("click", () => {
            const yazilan = dizilen.map(i => taslar[i].h).join("");
            const dogru = yazilan === hedef;
            kap.querySelectorAll(".spell-kutu").forEach((k, i) => k.classList.add(yazilan[i] === hedef[i] ? "dogru" : "yanlis"));
            kap.querySelectorAll("button").forEach(b => b.disabled = true);
            cevapla(dogru, { cevap: yazilan, dogruCevap: esc(s.en), aciklama: `${s.emoji} <b>${esc(s.en)}</b> = ${esc(s.tr)}` });
          });
        };
        ciz();
      });
      turSonu(ctx, sonuc, { tekrar: () => oyna(unite), menu, not: "🐝 Buzz! Kelimeleri yazdıkça aklında daha iyi kalıyor." });
    };
    menu();
  },
});
