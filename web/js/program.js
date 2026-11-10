/* ÖğretmeniM — Faz 1: dersler, ders saatleri, haftalık program, ana ekran özeti
   app.js'deki yardımcıları ($, $$, api, bildir, durum, GUNLER, AYLAR) çağrı anında kullanır. */
"use strict";

const OKUL_GUNLERI = [1, 2, 3, 4, 5];
const GUN_KISA = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const DERS_RENKLERI = ["#E5534B", "#3B82F6", "#22A06B", "#E8883A", "#9B59B6", "#14B8A6",
                       "#EC4899", "#CA8A04", "#84CC16", "#64748B", "#A78BFA", "#0EA5E9"];

function esc(metin) {
  return String(metin ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const ARA_ESIK = 10;   // dakika: bundan uzun boşluklar "ARA" olarak görünür (5–10 dk teneffüsler gösterilmez)
function dk(ss) { const [s, d] = ss.split(":").map(Number); return s * 60 + d; }
function saatYaz(dakika) {
  const s = Math.floor(dakika / 60), d = dakika % 60;
  return String(s).padStart(2, "0") + ":" + String(d).padStart(2, "0");
}

// "830", "08.30", "8:30" → "08:30"; geçersizse null (tarayıcının AM/PM gösteriminden bağımsız)
function saatDuzelt(deger) {
  const r = String(deger).replace(/\D/g, "");
  if (r.length < 3 || r.length > 4) return null;
  const s = Number(r.slice(0, r.length - 2)), d = Number(r.slice(-2));
  if (s > 23 || d > 59) return null;
  return String(s).padStart(2, "0") + ":" + String(d).padStart(2, "0");
}
function saatKutusuKur(kutu, degisince) {
  kutu.addEventListener("change", () => {
    const d = saatDuzelt(kutu.value);
    if (!d) { kutu.classList.add("hatali"); return bildir("Saati 08:30 biçiminde yaz", true); }
    kutu.classList.remove("hatali");
    kutu.value = d;
    if (degisince) degisince();
  });
}

/* ---------- Ders listesi ---------- */
/* Sınıf düzeyi: her ders bir sınıfa aittir; ekranlar varsayılan olarak etkin sınıfı gösterir */
function aktifSinif() { return durum.veri.ayarlar.aktif_sinif || 5; }
function sinifDersleri(sinif) {
  return durum.veri.koleksiyonlar.dersler
    .filter(d => !d.silindi && (d.sinif ?? aktifSinif()) === sinif)
    .sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
}
function aktifDersler() { return sinifDersleri(aktifSinif()); }
function sinifListesi() {
  return [...new Set(durum.veri.koleksiyonlar.dersler.filter(d => !d.silindi).map(d => d.sinif ?? aktifSinif()))].sort((a, b) => b - a);
}
// Birden çok sınıf varsa seçim kutusunu doldurur ve gösterir
function sinifSeciciDoldur(secim, secili) {
  const liste = sinifListesi();
  secim.hidden = liste.length < 2;
  secim.innerHTML = liste.map(s => `<option value="${s}"${s === secili ? " selected" : ""}>${s}. sınıf${s === aktifSinif() ? "" : " (arşiv)"}</option>`).join("");
}
function dersBul(id) {
  return durum.veri.koleksiyonlar.dersler.find(d => d.id === id && !d.silindi);
}
function dersEtiketi(ders) { return ders.kisa || ders.ad; }

/* ---------- Düzenleme kilidi: program yalnız veli şifresiyle değiştirilir ---------- */
let programDuzenleme = false;

async function programDuzenlemeDegistir() {
  if (!programDuzenleme && !(await veliGerekli("Ders programını değiştirmek için veli şifresini gir."))) return;
  programDuzenleme = !programDuzenleme;
  programSayfasiCiz();
  if (!programDuzenleme) bildir("Ders programı kilitlendi 🔒");
}
function programDuzenlemeKapat() {
  if (!programDuzenleme) return;
  programDuzenleme = false;
  if ($("#sayfa-program").classList.contains("aktif")) programSayfasiCiz();
}

/* ---------- Program kaydı (değişiklikten kısa süre sonra otomatik) ---------- */
let kayitZamanlayici = null;
function programKaydet() {
  $("#program-kayit").textContent = "Kaydediliyor…";
  clearTimeout(kayitZamanlayici);
  kayitZamanlayici = setTimeout(async () => {
    const p = durum.veri.ders_programi;
    try {
      // Nesneyi değiştirmeden yalnız zaman damgasını al (açık ekranlar aynı nesneye yazıyor)
      const sonuc = await api("PUT", "ders_programi", { saatler: p.saatler, hucreler: p.hucreler });
      p.degisme = sonuc.degisme;
      $("#program-kayit").textContent = "Kaydedildi ✓";
      programOzetCiz();
    } catch (hata) {
      $("#program-kayit").textContent = "";
      bildir(hata.message, true);
    }
  }, 400);
}

/* ---------- Haftalık ızgara ---------- */
function haftalikCiz() {
  const kap = $("#haftalik");
  const { saatler } = durum.veri.ders_programi;
  if (!saatler.length) {
    kap.innerHTML = `<div class="bos-durum"><div class="bos-ikon">⏰</div>Önce aşağıdan ders saatlerini gir.
      <small>"Hızlı doldur" ile tüm saatleri tek seferde oluşturabilirsin.</small></div>`;
    return;
  }
  const dersler = aktifDersler();
  const secenekler = `<option value="">—</option>` +
    dersler.map(d => `<option value="${d.id}">${esc(dersEtiketi(d))}</option>`).join("");

  let html = `<table class="haftalik"><thead><tr><th></th>` +
    OKUL_GUNLERI.map(g => `<th>${GUNLER[g]}</th>`).join("") + `</tr></thead><tbody>`;
  saatler.forEach((s, i) => {
    const onceki = saatler[i - 1];
    if (onceki && dk(s.bas) - dk(onceki.bit) > ARA_ESIK) {
      html += `<tr class="ara-satir"><th class="sira-hucre"><b>ARA</b><small>${onceki.bit}–${s.bas}</small></th>
        <td colspan="${OKUL_GUNLERI.length}"><span>ARA · ${dk(s.bas) - dk(onceki.bit)} dk</span></td></tr>`;
    }
    html += `<tr><th class="sira-hucre"><b>${i + 1}. ders</b><small>${s.bas}–${s.bit}</small></th>`;
    for (const g of OKUL_GUNLERI) {
      html += `<td><select class="ders-sec" data-anahtar="${g}-${i}"${programDuzenleme ? "" : " disabled"}>${secenekler}</select></td>`;
    }
    html += `</tr>`;
  });
  kap.innerHTML = html + `</tbody></table>`;

  $$(".ders-sec", kap).forEach(sec => {
    const deger = durum.veri.ders_programi.hucreler[sec.dataset.anahtar];
    sec.value = deger && dersBul(deger) ? deger : "";
    hucreRenklendir(sec);
    sec.addEventListener("change", () => {
      const hucreler = durum.veri.ders_programi.hucreler;
      if (sec.value) hucreler[sec.dataset.anahtar] = sec.value;
      else delete hucreler[sec.dataset.anahtar];
      hucreRenklendir(sec);
      programKaydet();
    });
  });
}

function hucreRenklendir(sec) {
  const ders = dersBul(sec.value);
  sec.style.setProperty("--renk", ders ? ders.renk : "transparent");
  sec.classList.toggle("dolu", Boolean(ders));
  sec.title = ders ? ders.ad : "";
}

/* ---------- Ders saatleri ---------- */
function saatListesiCiz() {
  const kap = $("#saat-listesi");
  const saatler = durum.veri.ders_programi.saatler;
  if (!saatler.length) {
    kap.innerHTML = `<div class="gun-bos">Henüz ders saati yok.</div>`;
    return;
  }
  kap.innerHTML = saatler.map((s, i) => `
    <div class="saat-satir" data-i="${i}">
      <span class="saat-no">${i + 1}.</span>
      <input class="s-bas saat-gir" value="${s.bas}" maxlength="5" inputmode="numeric" placeholder="08:30"${programDuzenleme ? "" : " disabled"}>
      <span>–</span>
      <input class="s-bit saat-gir" value="${s.bit}" maxlength="5" inputmode="numeric" placeholder="09:10"${programDuzenleme ? "" : " disabled"}>
      <button class="sil-dugme sadece-duzen" title="Bu saati sil">✕</button>
    </div>`).join("");

  $$(".saat-satir", kap).forEach(satir => {
    const i = Number(satir.dataset.i);
    const bas = $(".s-bas", satir), bit = $(".s-bit", satir);
    const degisti = () => {
      if (!saatDuzelt(bas.value) || !saatDuzelt(bit.value)) return;
      if (bit.value <= bas.value) return bildir(`${i + 1}. dersin bitişi başlangıcından sonra olmalı`, true);
      durum.veri.ders_programi.saatler[i] = { bas: bas.value, bit: bit.value };
      haftalikCiz();
      programKaydet();
    };
    saatKutusuKur(bas, degisti);
    saatKutusuKur(bit, degisti);
    $(".sil-dugme", satir).addEventListener("click", () => saatSil(i));
  });
}

function saatSil(i) {
  const p = durum.veri.ders_programi;
  const dolu = Object.keys(p.hucreler).filter(k => Number(k.split("-")[1]) === i).length;
  if (dolu && !confirm(`${i + 1}. derste ${dolu} gün için ders seçili. Bu saat silinirse onlar da silinir. Devam edilsin mi?`)) return;
  p.saatler.splice(i, 1);
  // Sonraki derslerin sıra numarasını bir yukarı kaydır
  const yeni = {};
  for (const [anahtar, id] of Object.entries(p.hucreler)) {
    const [g, s] = anahtar.split("-").map(Number);
    if (s < i) yeni[anahtar] = id;
    else if (s > i) yeni[`${g}-${s - 1}`] = id;
  }
  p.hucreler = yeni;
  programSayfasiCiz();
  programKaydet();
}

function saatEkle() {
  const saatler = durum.veri.ders_programi.saatler;
  if (saatler.length >= 14) return bildir("En çok 14 ders saati olabilir", true);
  let bas = 8 * 60 + 30, sure = 40;
  if (saatler.length) {
    const son = saatler[saatler.length - 1];
    sure = dk(son.bit) - dk(son.bas);
    bas = dk(son.bit) + 10;
  }
  if (bas + sure >= 24 * 60) return bildir("Gün sonuna gelindi, yeni saat eklenemiyor", true);
  saatler.push({ bas: saatYaz(bas), bit: saatYaz(bas + sure) });
  programSayfasiCiz();
  programKaydet();
}

function hizliDoldur() {
  const deger = id => Number($(id).value);
  const bas = saatDuzelt($("#h-bas").value);
  const sure = deger("#h-sure"), ten = deger("#h-ten"), sayi = deger("#h-sayi");
  const ogleSira = deger("#h-ogle-sira"), ogle = deger("#h-ogle");
  if (!bas || sure < 10 || sayi < 1 || sayi > 14) return bildir("Değerleri kontrol et", true);

  const saatler = [];
  let t = dk(bas);
  for (let i = 0; i < sayi; i++) {
    saatler.push({ bas: saatYaz(t), bit: saatYaz(t + sure) });
    t += sure + (ogleSira > 0 && i + 1 === ogleSira ? ogle : ten);
  }
  if (t - ten > 24 * 60) return bildir("Saatler gece yarısını geçiyor, değerleri kontrol et", true);

  const p = durum.veri.ders_programi;
  if (p.saatler.length && !confirm("Mevcut ders saatlerinin yerine bunlar yazılacak. Programdaki dersler aynı sırada kalır. Devam edilsin mi?")) return;
  p.saatler = saatler;
  for (const anahtar of Object.keys(p.hucreler)) {
    if (Number(anahtar.split("-")[1]) >= saatler.length) delete p.hucreler[anahtar];
  }
  $(".hizli").open = false;
  programSayfasiCiz();
  programKaydet();
}

/* ---------- Derslerim ---------- */
function dersListesiCiz() {
  const kap = $("#ders-listesi");
  const dersler = aktifDersler();
  if (!dersler.length) {
    kap.innerHTML = `<div class="gun-bos">Henüz ders yok. "＋ Ders ekle" ile ekle.</div>`;
    return;
  }
  kap.innerHTML = dersler.map(d => `
    <div class="ders-satir" data-id="${d.id}">
      <input type="color" class="d-renk" value="${esc(d.renk)}" title="Renk">
      <input class="d-ad" value="${esc(d.ad)}" maxlength="50" placeholder="Ders adı">
      <input class="d-kisa" value="${esc(d.kisa || "")}" maxlength="14" placeholder="Kısa ad">
      <button class="sil-dugme" title="Dersi sil">✕</button>
    </div>
    ${(d.kaynaklar || []).length ? `<div class="d-kaynaklar" data-id="${d.id}"><span class="d-kaynak-baslik">Kaynaklar:</span>${d.kaynaklar.map((a, i) =>
      `<span class="d-kaynak">${esc(a)}<button type="button" data-kaynak-sil="${i}" title="Bu kaynağı listeden kaldır">✕</button></span>`).join("")}</div>` : ""}`).join("");
  // 0.20: ödevlerde kullanılan kaynaklar derse kaydedilir; yanlış/eski olanlar buradan kaldırılır
  $$(".d-kaynaklar", kap).forEach(el => el.addEventListener("click", async e => {
    const b = e.target.closest("[data-kaynak-sil]");
    if (!b) return;
    const ders = dersBul(el.dataset.id);
    const ad = (ders.kaynaklar || [])[Number(b.dataset.kaynakSil)];
    try { Object.assign(ders, await api("POST", "ders_kaynak_sil", { ders_id: ders.id, ad })); dersListesiCiz(); bildir("Kaynak listeden kaldırıldı"); }
    catch (hata) { bildir(hata.message, true); }
  }));

  $$(".ders-satir", kap).forEach(satir => {
    const id = satir.dataset.id;
    const guncelle = async alanlar => {
      try {
        const yeni = await api("PUT", "k/dersler/" + id, alanlar);
        Object.assign(dersBul(id), yeni);
        haftalikCiz();
        herSeyiYenile();
      } catch (hata) { bildir(hata.message, true); }
    };
    $(".d-renk", satir).addEventListener("change", e => guncelle({ renk: e.target.value }));
    $(".d-ad", satir).addEventListener("change", e => {
      const ad = e.target.value.trim();
      if (!ad) { e.target.value = dersBul(id).ad; return bildir("Ders adı boş olamaz", true); }
      guncelle({ ad });
    });
    $(".d-kisa", satir).addEventListener("change", e => guncelle({ kisa: e.target.value.trim() }));
    $(".sil-dugme", satir).addEventListener("click", () => dersSil(id));
  });
}

async function dersEkle() {
  const dersler = aktifDersler();
  const renk = DERS_RENKLERI[dersler.length % DERS_RENKLERI.length];
  const sira = dersler.reduce((m, d) => Math.max(m, d.sira ?? 0), -1) + 1;
  try {
    const kayit = await api("POST", "k/dersler", { ad: "Yeni ders", kisa: "", renk, sira, sinif: aktifSinif() });
    durum.veri.koleksiyonlar.dersler.push(kayit);
    dersListesiCiz();
    const giris = $(`.ders-satir[data-id="${kayit.id}"] .d-ad`);
    giris.focus();
    giris.select();
  } catch (hata) { bildir(hata.message, true); }
}

async function dersSil(id) {
  const ders = dersBul(id);
  const p = durum.veri.ders_programi;
  const yerler = Object.keys(p.hucreler).filter(k => p.hucreler[k] === id);
  const soru = yerler.length
    ? `"${ders.ad}" programda ${yerler.length} yerde var. Silinirse o saatler boşalır. Silinsin mi?`
    : `"${ders.ad}" silinsin mi?`;
  if (!confirm(soru)) return;
  try {
    await api("DELETE", "k/dersler/" + id);
    ders.silindi = true;
    if (yerler.length) {
      yerler.forEach(k => delete p.hucreler[k]);
      programKaydet();
    }
    dersListesiCiz();
    herSeyiYenile();
  } catch (hata) { bildir(hata.message, true); }
}

function programSayfasiCiz() {
  $("#sayfa-program").classList.toggle("duzenleniyor", programDuzenleme);
  $("#program-duzenle").innerHTML = programDuzenleme ? "✓ Düzenlemeyi bitir" : "✎ Düzenle 🔒";
  $("#program-duzenle").classList.toggle("ana-dugme", programDuzenleme);
  $("#program-kayit").textContent = programDuzenleme ? "" : "Kilitli — değiştirmek için veli şifresi gerekir";
  haftalikCiz();
  saatListesiCiz();
}

/* ---------- Ana ekran: bugünün / yarının programı ---------- */
function gununDersleri(haftaGunu) {
  const { saatler, hucreler } = durum.veri.ders_programi;
  return saatler
    .map((s, i) => ({ ...s, sira: i, ders: dersBul(hucreler[`${haftaGunu}-${i}`]) }))
    .filter(x => x.ders);
}

// Günün satırları: ders saatleri + o güne girilmiş saatli sınav/etüt/etkinlikler.
// Bir etkinlik bir ders saatiyle çakışıyorsa o dersin yerine geçer; çakışmayanlar sıraya eklenir.
function gununSatirlari(tarih) {
  const dersler = gununDersleri(tarih.getDay());
  const etkinlikler = typeof gununEtkinlikleri === "function" ? gununEtkinlikleri(tarih) : [];
  const saatli = etkinlikler.filter(e => e.bas);
  const saatsiz = etkinlikler.filter(e => !e.bas);
  const satirlar = dersler.map(d => ({ bas: d.bas, bit: d.bit, sira: d.sira + 1, ders: d.ders }));
  const ekler = [];
  for (const e of saatli) {
    const eBas = dk(e.bas), eBit = e.bit ? dk(e.bit) : eBas + 1;
    let yerlesti = false;
    for (const satir of satirlar) {
      if (eBas < dk(satir.bit) && eBit > dk(satir.bas) && !satir.etkinlik) {
        satir.yerine = satir.ders;
        satir.etkinlik = e;
        yerlesti = true;
      }
    }
    if (!yerlesti) ekler.push({ bas: e.bas, bit: e.bit || e.bas, sira: "+", etkinlik: e });
  }
  const sirali = satirlar.concat(ekler).sort((a, b) => dk(a.bas) - dk(b.bas));
  // Dersler arasındaki uzun (ARA_ESIK'ten uzun) boşluklar "ARA" satırı olarak
  const tum = [];
  sirali.forEach((x, i) => {
    const onceki = sirali[i - 1];
    if (onceki && dk(x.bas) - dk(onceki.bit) > ARA_ESIK) tum.push({ bas: onceki.bit, bit: x.bas, ara: true });
    tum.push(x);
  });
  return { satirlar: tum, saatsiz, dersVar: dersler.length > 0 };
}

// Son ders (ya da son etkinlik) bitene kadar bugünü, sonra bir sonraki okul gününü gösterir
function gosterilecekGun(simdi) {
  const simdiDk = simdi.getHours() * 60 + simdi.getMinutes();
  for (let ofset = 0; ofset < 8; ofset++) {
    const tarih = gunEkle(gunBasi(simdi), ofset);
    const gun = gununSatirlari(tarih);
    if (!gun.dersVar) continue;
    if (ofset === 0 && simdiDk >= Math.max(...gun.satirlar.map(d => dk(d.bit)))) continue;
    return { tarih, ofset, ...gun };
  }
  return null;
}

function programOzetCiz() {
  const kap = $("#program-ozet");
  if (!kap || !durum.veri) return;
  const hedef = gosterilecekGun(new Date());
  if (!hedef) {
    $("#program-baslik").textContent = "Dersler";
    $("#program-rozet").textContent = "";
    kap.innerHTML = `<div class="bos-durum"><div class="bos-ikon">📚</div>Ders programı henüz girilmedi.
      <small><button class="baglanti" data-git="program">Ders Programı</button> sekmesinden girebilirsin.</small></div>`;
    return;
  }
  // 0.21.1 Okul Yolu: "Bugünün dersleri" — kısa liste, her ders bir kez (programdaki ilk geçiş sırasıyla).
  // O derse teslim edilecek ödev ya da sınav varsa adının yanında küçük işaret. Saat ve çanta işareti yok.
  const { tarih, ofset, satirlar, saatsiz } = hedef;
  const gunStr = tarihStr(tarih);
  $("#program-baslik").textContent = ofset === 0 ? "Bugünün dersleri" : ofset === 1 ? "Yarının dersleri" : `${GUNLER[tarih.getDay()]} dersleri`;
  $("#program-rozet").textContent = `${tarih.getDate()} ${AYLAR[tarih.getMonth()]}`;
  const teslimler = aktifOdevler().filter(o => !o.bitti && o.teslim === gunStr);
  const sinavlar = durum.veri.koleksiyonlar.etkinlikler.filter(e => !e.silindi && e.tur === "sinav" && e.tarih === gunStr);
  const dersler = [];
  for (const d of satirlar) if (d.ders && !dersler.some(x => x.id === d.ders.id)) dersler.push(d.ders);
  const isaret = id => (teslimler.some(o => o.ders_id === id) ? `<span class="oy-cip">📝 ödev teslim</span>` : "") +
                       (sinavlar.some(e => e.ders_id === id) ? `<span class="oy-cip sinav">🧪 sınav</span>` : "");
  const disari = [...teslimler.filter(o => !dersler.some(d => d.id === o.ders_id)).map(o => `📝 ${esc((dersBul(o.ders_id) || {}).ad || "Ödev")} ödevi teslim`),
                  ...sinavlar.filter(e => !dersler.some(d => d.id === e.ders_id)).map(e => `🧪 ${esc((dersBul(e.ders_id) || {}).ad || "")} sınavı`)];
  const ust = saatsiz.length ? `<div class="ozet-not">📌 ${saatsiz.map(e => esc(kayitBasligi(e))).join(", ")}</div>` : "";
  kap.innerHTML = ust + `<ul class="oy-dersler">${dersler.map(d => `<li style="--renk:${esc(d.renk)}"><span class="oy-ad">${esc(d.ad)}</span>${isaret(d.id)}</li>`).join("")}</ul>` +
    (disari.length ? `<div class="oy-ayrica">${disari.join(" · ")}</div>` : "");
}

function programOlaylariniKur() {
  $("#saat-ekle").addEventListener("click", saatEkle);
  $("#ders-ekle").addEventListener("click", dersEkle);
  $("#h-olustur").addEventListener("click", hizliDoldur);
  $("#program-duzenle").addEventListener("click", programDuzenlemeDegistir);
  saatKutusuKur($("#h-bas"));
}
