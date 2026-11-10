/* ÖğretmeniM — Matematik oyunları (0.11: Çarpım Kahramanı) */
"use strict";

const CARPIM_SEVIYELER = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const carpimEki = n => ({ 6: "'lar", 9: "'lar", 10: "'lar" })[n] || "'ler";
const carpimSeviyeAdi = n => n === 0 ? "Karışık" : n + carpimEki(n);

function carpimOlgulari(n) {
  const seviyeler = n === 0 ? CARPIM_SEVIYELER : [n];
  const liste = [];
  for (const a of seviyeler) for (let b = 1; b <= 10; b++) {
    liste.push({ a, b, anahtar: `${a}×${b}`, beceri: `mat.carpim.${a}`, beceri_adi: `Çarpım tablosu: ${carpimSeviyeAdi(a)}`, konu: "İşlemlerle Cebirsel Düşünme" });
  }
  return liste;
}

// Bir olgu "oturdu" sayılır: son 3 denemenin hepsi doğru ve en az biri yazarak
function carpimOturdu(ctx, anahtar) {
  const s = ctx.gecmis.sorular[anahtar];
  if (!s || s.son.length < 3) return false;
  const son3 = s.son.slice(-3);
  return son3.every(x => x[0]) && son3.some(x => x[1] === "yaz");
}
function carpimBicimi(ctx, anahtar) {
  const s = ctx.gecmis.sorular[anahtar];
  return s && s.son.length >= 2 && s.son.slice(-2).every(x => x[0]) ? "yaz" : "sik";
}
function carpimUstalik(ctx, n) {
  const ol = carpimOlgulari(n);
  return ol.filter(o => carpimOturdu(ctx, o.anahtar)).length / ol.length;
}

function carpimCeldiriciler(a, b) {
  const c = a * b, aday = new Set();
  [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, c + 1, c - 1, c + 10, c - 10, a + b, c + a, c - b]
    .forEach(x => { if (x > 0 && x !== c) aday.add(x); });
  const ters = +String(c).split("").reverse().join("");      // 56 → 65 karışıklığı
  if (c >= 10 && ters !== c) aday.add(ters);
  return karistir([...aday]).slice(0, 3);
}

function carpimAciklama(a, b) {
  const adimlar = Array.from({ length: b }, (_, i) => a * (i + 1));
  return `Ritmik sayma: ${adimlar.join(", ")}`;
}

/* Ekrandaki tuş takımı (yalnız fare) */
function tusTakimi(kap, { enFazla = 3, onay }) {
  let deger = "";
  kap.innerHTML = `<div class="tt-ekran" aria-live="polite"><span class="tt-deger"></span><span class="tt-imlec"></span></div>
    <div class="tt-tuslar">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map(r => `<button class="tt" data-t="${r}">${r}</button>`).join("")}
      <button class="tt sil" data-t="sil" title="Sil">⌫</button><button class="tt" data-t="0">0</button>
      <button class="tt tamam" data-t="ok" title="Tamam">✓</button></div>`;
  const ekran = kap.querySelector(".tt-deger");
  const guncelle = () => { ekran.textContent = deger; kap.querySelector(".tt.tamam").disabled = !deger; };
  kap.querySelector(".tt-tuslar").addEventListener("click", e => {
    const b = e.target.closest(".tt");
    if (!b || b.disabled) return;
    sesCal("tik");
    const t = b.dataset.t;
    if (t === "sil") deger = deger.slice(0, -1);
    else if (t === "ok") { kap.querySelectorAll(".tt").forEach(x => x.disabled = true); return onay(deger); }
    else if (deger.length < enFazla) deger = (deger === "0" ? "" : deger) + t;
    guncelle();
  });
  guncelle();
}

oyunTanimla({
  id: "carpim", ders: "matematik", ad: "Çarpım Kahramanı", simge: "🦸", kisa: "2'lerden 10'lara çarpım",
  konu: "İşlemlerle Cebirsel Düşünme",
  baslat(ctx) {
    let seri = 0;
    const menu = () => oyunMenusu(ctx, {
      baslik: "🦸 Hangi seviyede oynamak istersin?",
      aciklama: "Önce şıklardan seçersin. Bir çarpımı iyice öğrenince onu tuşlarla yazarak cevaplarsın.",
      secenekler: [...CARPIM_SEVIYELER.map(n => ({ ad: carpimSeviyeAdi(n), simge: "✖️", deger: n, ilerleme: carpimUstalik(ctx, n) })),
        { ad: "Karışık", simge: "🎲", alt: "Hepsinden", deger: 0, ilerleme: carpimUstalik(ctx, 0) }],
      sec: s => oyna(s.deger),
    });
    const oyna = async n => {
      const sorular = agirlikliSec(ctx, carpimOlgulari(n), 10);
      const sonuc = await turOyna(ctx, sorular, (kap, s, cevapla) => {
        const bicim = carpimBicimi(ctx, s.anahtar);
        kap.innerHTML = `<div class="carpim-ust"><span class="carpim-seviye">${carpimSeviyeAdi(n)}</span>
            ${seri >= 3 ? `<span class="carpim-seri">🔥 ${seri} üst üste!</span>` : ""}</div>
          <div class="carpim-soru">${s.a} × ${s.b} = <span class="carpim-bos">?</span></div>
          <div class="carpim-cevap"></div>`;
        const alan = kap.querySelector(".carpim-cevap");
        const sonucla = verilen => {
          const dogru = +verilen === s.a * s.b;
          seri = dogru ? seri + 1 : 0;
          kap.querySelector(".carpim-bos").textContent = verilen;
          kap.querySelector(".carpim-bos").classList.add(dogru ? "dogru" : "yanlis");
          cevapla(dogru, { cevap: verilen, dogruCevap: s.a * s.b, aciklama: carpimAciklama(s.a, s.b), bicim });
        };
        if (bicim === "yaz") {
          alan.innerHTML = `<div class="carpim-yaz-not">✍️ Bunu artık biliyorsun, yazarak cevapla!</div><div class="tt-kap"></div>`;
          tusTakimi(alan.querySelector(".tt-kap"), { onay: sonucla });
        } else {
          const secenekler = karistir([s.a * s.b, ...carpimCeldiriciler(s.a, s.b)]);
          alan.innerHTML = `<div class="sik-izgara sutun-4">${secenekler.map(x => `<button class="sik buyuk" data-sik="${x}">${x}</button>`).join("")}</div>`;
          alan.querySelectorAll(".sik").forEach(b => b.addEventListener("click", () => {
            alan.querySelectorAll(".sik").forEach(x => { x.disabled = true; if (+x.dataset.sik === s.a * s.b) x.classList.add("dogru"); });
            if (+b.dataset.sik !== s.a * s.b) b.classList.add("yanlis");
            sonucla(b.dataset.sik);
          }));
        }
      });
      const ustalik = carpimUstalik(ctx, n);
      turSonu(ctx, sonuc, {
        tekrar: () => oyna(n), menu,
        not: ustalik >= 1 ? `🏆 ${carpimSeviyeAdi(n)} tamamen senin! Bir sonraki seviyeyi denemeye ne dersin?`
          : `${carpimSeviyeAdi(n)} ustalığın: <span class="oms-cubuk genis"><i style="width:${Math.round(ustalik * 100)}%"></i></span>`,
      });
    };
    menu();
  },
});
