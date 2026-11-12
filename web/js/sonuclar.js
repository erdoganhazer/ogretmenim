/* ÖğretmeniM — Faz 2B: sınav sonuçları, ders ve tür ortalamaları */
"use strict";

function notSinifi(puan) {
  if (puan >= 85) return "n-iyi";
  if (puan >= 70) return "n-orta";
  if (puan >= 50) return "n-zayif";
  return "n-dusuk";
}
function ortalama(sayilar) {
  return sayilar.length ? sayilar.reduce((a, b) => a + b, 0) / sayilar.length : null;
}
function ortYaz(o) { return o === null ? "–" : (Math.round(o * 10) / 10).toLocaleString("tr-TR"); }

// Ders bazında özet: yapılan/planlanan sınavlar, notlar, ortalama, tür ortalamaları
function sonuclariHesapla(sinif = null) {
  const bugun = tarihStr(new Date());
  const sinavlar = aktifEtkinlikler().filter(e => e.tur === "sinav");
  const derse = new Map();
  for (const s of sinavlar) {
    const ders = dersBul(s.ders_id);
    if (!ders || (sinif !== null && (ders.sinif ?? aktifSinif()) !== sinif)) continue;
    if (!derse.has(ders.id)) derse.set(ders.id, { ders, sinavlar: [] });
    derse.get(ders.id).sinavlar.push(s);
  }
  const liste = [];
  for (const kayit of derse.values()) {
    kayit.sinavlar.sort((a, b) => a.tarih.localeCompare(b.tarih));
    const notlu = kayit.sinavlar.filter(s => typeof s.puan === "number");
    kayit.notlar = notlu.map(s => s.puan);
    kayit.ortalama = ortalama(kayit.notlar);
    kayit.yapilan = kayit.sinavlar.filter(s => s.tarih <= bugun).length;
    kayit.planlanan = kayit.sinavlar.filter(s => s.tarih > bugun).length;
    kayit.turler = {};
    for (const [tur, ad] of Object.entries(SINAV_TURLERI)) {
      const n = notlu.filter(s => (s.sinav_turu || "yazili") === tur).map(s => s.puan);
      if (n.length) kayit.turler[ad] = { sayi: n.length, ortalama: ortalama(n) };
    }
    liste.push(kayit);
  }
  liste.sort((a, b) => (a.ders.sira ?? 0) - (b.ders.sira ?? 0));
  const notluDersler = liste.filter(k => k.ortalama !== null);
  return {
    liste,
    genel: ortalama(notluDersler.map(k => k.ortalama)),
    notSayisi: liste.reduce((t, k) => t + k.notlar.length, 0),
  };
}

/* ---------- Ana ekran: Sınav Takvimi (en yakın sınav üstte) ---------- */
function kalanGunYazisi(gun) {
  if (gun <= 0) return { yazi: "Bugün", sinif: "k-bugun" };
  if (gun === 1) return { yazi: "Yarın", sinif: "k-yarin" };
  if (gun <= 3) return { yazi: `${gun} gün`, sinif: "k-yakin" };
  return { yazi: `${gun} gün`, sinif: "" };
}

function sinavTakvimiCiz() {
  const kap = $("#sinav-takvimi");
  if (!kap || !durum.veri) return;
  const simdi = new Date();
  const bugun = tarihStr(simdi);
  const simdiSaat = saatYaz(simdi.getHours() * 60 + simdi.getMinutes());
  const yaklasan = aktifEtkinlikler()
    .filter(e => e.tur === "sinav" && (e.tarih > bugun || (e.tarih === bugun && (!e.bit || e.bit > simdiSaat))))
    .sort((a, b) => (a.tarih + (a.bas || "99")).localeCompare(b.tarih + (b.bas || "99")));
  if (!yaklasan.length) {
    kap.innerHTML = `<div class="bos-durum kucuk-bos">🎉 Yaklaşan sınav yok.
      <small>Yeni sınavı zaman çizelgesindeki "＋ Ekle" ile girebilirsin.</small></div>`;
    return;
  }
  const bugunT = gunBasi(simdi);
  kap.innerHTML = `<div class="takvim-liste">${yaklasan.slice(0, 5).map(s => {
    const ders = dersBul(s.ders_id);
    const t = strTarih(s.tarih);
    const kalan = kalanGunYazisi(Math.round((t - bugunT) / 86400000));
    return `<div class="takvim-satir" data-id="${s.id}" style="--renk:${esc(ders ? ders.renk : "var(--cizgi)")}">
      <span class="takvim-kalan ${kalan.sinif}">${kalan.yazi}</span>
      <span class="takvim-govde">
        <span class="takvim-ders">${esc(ders ? ders.ad : "Sınav")} <small>${SINAV_TURLERI[s.sinav_turu] || ""}</small></span>
        <span class="takvim-alt">${t.getDate()} ${AYLAR[t.getMonth()]} ${GUNLER[t.getDay()]}${s.bas ? " · " + s.bas : ""}</span>
      </span></div>`;
  }).join("")}</div>${yaklasan.length > 5 ? `<small class="panel-not">+${yaklasan.length - 5} sınav daha</small>` : ""}`;
}

/* ---------- Dersler sayfası: her dersin kartı + notlar ---------- */
let dersDuzenleme = false;
let dersSinifi = null;

async function dersDuzenlemeDegistir() {
  if (!dersDuzenleme && !(await veliGerekli("Ders listesini değiştirmek için veli şifresini gir."))) return;
  dersDuzenleme = !dersDuzenleme;
  derslerSayfasiCiz();
}
function dersDuzenlemeKapat() {
  if (!dersDuzenleme) return;
  dersDuzenleme = false;
  if ($("#sayfa-dersler").classList.contains("aktif")) derslerSayfasiCiz();
}

function derslerSayfasiCiz() {
  const kap = $("#ders-kartlari");
  if (!kap || !durum.veri) return;
  $("#ders-duzen").hidden = !dersDuzenleme;
  $("#ders-duzenle").innerHTML = dersDuzenleme ? "✓ Düzenlemeyi bitir" : "✎ Dersleri düzenle 🔒";
  $("#ders-duzenle").classList.toggle("ana-dugme", dersDuzenleme);
  if (dersDuzenleme) dersListesiCiz();

  const sinif = dersSinifi ?? aktifSinif();
  sinifSeciciDoldur($("#ders-sinif"), sinif);
  $("#ders-duzenle").hidden = sinif !== aktifSinif();
  const sonuc = sonuclariHesapla(sinif);
  const liste = sonuc.liste, genel = sonuc.genel, notSayisi = sonuc.notSayisi;
  const sonucMap = new Map(liste.map(k => [k.ders.id, k]));
  const { hucreler } = durum.veri.ders_programi;
  const bugun = tarihStr(new Date());

  $("#genel-ortalama").innerHTML = `<div class="genel-ort buyuk">
      <span class="genel-sayi ${genel === null ? "" : notSinifi(genel)}">${ortYaz(genel)}</span>
      <span class="genel-yazi">Genel ortalama${sinif !== aktifSinif() ? ` · ${sinif}. sınıf` : ""}<small>${genel === null ? "Henüz sonuç girilmedi" : `${liste.filter(k => k.ortalama !== null).length} ders · ${notSayisi} not · derslerin ortalamalarının ortalaması`}</small></span></div>`;

  // Önce notu/sınavı olan dersler, sonra diğerleri (ders sırasıyla)
  const dersler = sinifDersleri(sinif).slice().sort((a, b) => (sonucMap.has(b.id) - sonucMap.has(a.id)) || ((a.sira ?? 0) - (b.sira ?? 0)));
  const veli = veliAktif();
  kap.innerHTML = dersler.map(d => {
    const k = sonucMap.get(d.id);
    if (!veli) {                                          // öğrenci: son not ve ortalama; ders sayfasına götüren kart
      const sonrakiO = k && k.sinavlar.find(s => s.tarih >= bugun);
      const sayi = (durum.veri.koleksiyonlar.ders_notlari || []).filter(n => !n.silindi && n.ders_id === d.id).length;
      const son = k && k.sinavlar.filter(s => typeof s.puan === "number").sort((a, b) => b.tarih.localeCompare(a.tarih))[0];
      return `<button type="button" class="panel sonuc-kart ders-kart-ogr" data-ders-ac="${d.id}" style="--renk:${esc(d.renk)}">
        <span class="sonuc-baslik"><span class="sonuc-ders">${esc(d.ad)}</span><span class="ders-ok">›</span></span>
        ${son ? `<span class="ders-notlar"><span>Son not <b class="not-rozet ${notSinifi(son.puan)}">${son.puan}</b></span>
          <span>Ortalama <b class="ders-ort ${notSinifi(k.ortalama)}">${ortYaz(k.ortalama)}</b></span></span>`
          : `<span class="sonuc-bilgi">Henüz not yok</span>`}
        ${sayi ? `<span class="sonuc-bilgi">📝 ${sayi} notum</span>` : ""}
        ${sonrakiO ? `<span class="sonraki-sinav">📅 Sıradaki sınav: ${strTarih(sonrakiO.tarih).getDate()} ${AYLAR[strTarih(sonrakiO.tarih).getMonth()]} ${GUNLER[strTarih(sonrakiO.tarih).getDay()]}</span>` : ""}
      </button>`;
    }
    const saat = Object.values(hucreler).filter(v => v === d.id).length;
    const sonraki = k && k.sinavlar.find(s => s.tarih >= bugun);
    let tablo = `<div class="gun-bos">Henüz sınav yok.</div>`;
    if (k) {
      tablo = `<table class="sonuc-tablo">${k.sinavlar.map(s => `
        <tr class="sonuc-satir" data-id="${s.id}">
          <td>${strTarih(s.tarih).getDate()} ${AYLAR[strTarih(s.tarih).getMonth()]}</td>
          <td>${SINAV_TURLERI[s.sinav_turu] || "Yazılı"}</td>
          <td class="sag">${typeof s.puan === "number"
            ? `<span class="not-rozet ${notSinifi(s.puan)}">${s.puan}</span>`
            : `<span class="not-bekle">${s.tarih > bugun ? "yaklaşıyor" : s.tarih === bugun ? "bugün" : "sonuç girilmedi"}</span>`}</td>
        </tr>`).join("")}</table>`;
    }
    return `<div class="panel sonuc-kart" style="--renk:${esc(d.renk)}">
      <div class="sonuc-baslik">
        <button type="button" class="sonuc-ders baglanti-gibi" data-ders-ac="${d.id}" title="Ders sayfası">${esc(d.ad)} ›</button>
        <span class="sonuc-ort ${k && k.ortalama !== null ? notSinifi(k.ortalama) : "bos-ort"}">${ortYaz(k ? k.ortalama : null)}</span>
      </div>
      <div class="sonuc-bilgi">${saat ? `Haftada ${saat} saat` : "Programda yok"}${k ? ` · ${k.yapilan} sınav yapıldı` : ""}
        ${k ? Object.entries(k.turler).map(([ad, t]) => `<span class="tur-ort">${ad}: ${ortYaz(t.ortalama)}</span>`).join("") : ""}</div>
      ${sonraki ? `<div class="sonraki-sinav">📅 Sıradaki sınav: ${strTarih(sonraki.tarih).getDate()} ${AYLAR[strTarih(sonraki.tarih).getMonth()]} ${GUNLER[strTarih(sonraki.tarih).getDay()]}</div>` : ""}
      ${tablo}
    </div>`;
  }).join("");
}

function sonucOlaylariniKur() {
  $("#not-ekle").addEventListener("click", () => pencereAc("sinav"));
  $("#ders-duzenle").addEventListener("click", dersDuzenlemeDegistir);
  $("#ders-sinif").addEventListener("change", e => { dersSinifi = Number(e.target.value); dersDuzenlemeKapat(); derslerSayfasiCiz(); });
  $("#ders-kartlari").addEventListener("click", e => {
    const ac = e.target.closest("[data-ders-ac]");
    if (ac) return dersSayfasiAc(ac.dataset.dersAc);
    const satir = veliAktif() && e.target.closest(".sonuc-satir");
    if (!satir) return;
    const k = kayitBul("etkinlikler", satir.dataset.id);
    if (k) pencereAc("sinav", k);
  });
  $("#sinav-takvimi").addEventListener("click", e => {
    const satir = e.target.closest(".takvim-satir");
    const k = satir && kayitBul("etkinlikler", satir.dataset.id);
    if (k) pencereAc("sinav", k);
  });
}
