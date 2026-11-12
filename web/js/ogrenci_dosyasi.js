/* ÖğretmeniM web — öğrenci dosyası: dışa / içe aktarım (Ayarlar › veli).
   Biçim: { bicim: "ogretmenim-ogrenci-dosyasi", surum: 1, ogrenci, veri } — tüm sınıfların verisi, notlar dahil.
   İçe aktarılabilenler: bu dosya (.json) ve eski yerel uygulamanın yedeği (.zip: veri.json, alistirmalar.jsonl,
   islem_gunlugu.jsonl, fotolar/). Önce deneme raporu gösterilir; onaylanınca mevcut veri yedek olarak indirilir,
   sonra birleştirilir (Motor.iceAktar). Konu Defteri notları ve fotoğraflar arşiv sayfası olarak indirilir. */
"use strict";

const DOSYA = { bekleyen: null, zip: null };

function dosyaIndir(ad, icerik, tur = "application/json") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([icerik], { type: tur }));
  a.download = ad; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
const dosyaAdiParcasi = s => String(s || "ogrenci").toLocaleLowerCase("tr").replace(/[çğıöşü]/g, h => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" }[h])).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function disaAktar(sessiz = false) {
  const m = await Depo.motorAl();
  const d = m.disaAktar();
  dosyaIndir(`ogretmenim-${dosyaAdiParcasi(d.ogrenci.ad)}-${Bulut.bugunStr ? Bulut.bugunStr() : tarihStr(new Date())}.json`, JSON.stringify(d));
  if (!sessiz) bildir("Öğrenci dosyası indirildi");
}

/* Fotoğrafı küçült: en uzun kenar 256 px, JPEG — profil fotoğrafı Firestore'da veri adresi olarak durur */
function resimKucult(kaynak, boyut = 256, kalite = 0.82) {
  return new Promise((coz, red) => {
    const img = new Image();
    img.onload = () => {
      const o = Math.min(1, boyut / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * o); c.height = Math.round(img.height * o);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      coz(c.toDataURL("image/jpeg", kalite));
    };
    img.onerror = () => red(new Error("Fotoğraf okunamadı"));
    img.src = typeof kaynak === "string" ? kaynak : URL.createObjectURL(kaynak);
  });
}

async function dosyaOku(dosya) {
  const bayt = new Uint8Array(await dosya.arrayBuffer());
  if (bayt[0] === 0x50 && bayt[1] === 0x4b) {                       // zip
    const z = fflate.unzipSync(bayt), metin = ad => (z[ad] ? fflate.strFromU8(z[ad]) : "");
    if (!z["veri.json"]) throw new Error("Bu zip bir ÖğretmeniM yedeği değil (veri.json yok)");
    const veri = JSON.parse(metin("veri.json"));
    const satirlar = ad => metin(ad).split("\n").filter(Boolean).map(s => { try { return JSON.parse(s); } catch (_) { return null; } }).filter(Boolean);
    veri.alistirmalar = satirlar("alistirmalar.jsonl");
    veri.gunluk = satirlar("islem_gunlugu.jsonl");
    delete veri.guvenlik; delete veri.esitleme;
    return { veri, zip: z, kaynak: "eski uygulamanın yedeği" };
  }
  const j = JSON.parse(new TextDecoder().decode(bayt));
  if (j.bicim === "ogretmenim-ogrenci-dosyasi") return { veri: j, zip: null, kaynak: `öğrenci dosyası (${j.ogrenci && j.ogrenci.ad || "?"}, ${String(j.olusturma || "").slice(0, 10)})` };
  if (j.koleksiyonlar) return { veri: j, zip: null, kaynak: "veri.json" };
  throw new Error("Dosya tanınmadı");
}

const KOL_AD = { dersler: "Dersler", kelime_defterleri: "Kelime defterleri", kelimeler: "Kelimeler", baglantilar: "Bağlantılar", odevler: "Ödevler",
  etkinlikler: "Sınav ve etkinlikler", mesajlar: "Mesajlar", cep_notlari: "Cep notları", ders_notlari: "Ders notları" };
function raporHtml(r, kuru) {
  const satir = Object.entries(r.koleksiyonlar).filter(([, x]) => x.dosyada).map(([k, x]) =>
    `<tr><td>${KOL_AD[k] || k}</td><td>${x.dosyada}</td><td>${x.eklenen}</td><td>${x.guncellenen}</td><td>${x.ayni}</td><td>${x.atlanan || ""}</td></tr>`).join("");
  const ars = r.arsiv.uniteler + r.arsiv.konular + r.arsiv.notlar;
  return `<div class="dosya-rapor">
    <b>${kuru ? "Aktarılırsa:" : "Aktarıldı ✓"}</b>
    <div class="tablo-kap"><table class="kd-p-tablo"><thead><tr><th></th><th>Dosyada</th><th>${kuru ? "Eklenecek" : "Eklendi"}</th><th>${kuru ? "Güncellenecek" : "Güncellendi"}</th><th>Zaten vardı</th><th>Atlanan</th></tr></thead><tbody>${satir}
      <tr><td>Çalışma kayıtları</td><td></td><td>${r.plan.calisma}</td><td></td><td></td><td></td></tr>
      <tr><td>Oyun ve alıştırma sonuçları</td><td>${r.alistirmalar.dosyada}</td><td>${r.alistirmalar.eklenen}</td><td></td><td>${r.alistirmalar.dosyada - r.alistirmalar.eklenen}</td><td></td></tr>
      <tr><td>İşlem günlüğü</td><td>${r.gunluk.dosyada}</td><td>${r.gunluk.eklenen}</td><td></td><td>${r.gunluk.dosyada - r.gunluk.eklenen}</td><td></td></tr>
    </tbody></table></div>
    ${r.program ? `<p class="panel-not">Ders programı dosyadan alınacak (buradaki boştu).</p>` : ""}
    ${ars ? `<p class="panel-not">Konu Defteri: ${r.arsiv.notlar} not (${r.arsiv.konular} konu) uygulamaya alınmaz; aşağıdaki "Arşivi indir" ile fotoğraflarıyla birlikte tek sayfa olarak saklanır.</p>` : ""}
    ${r.uyarilar.map(u => `<p class="panel-not uyari-not">${esc(u)}</p>`).join("")}
    ${kuru ? `<div class="form-alt"><button class="dugme" data-dosya="vazgec">Vazgeç</button><button class="dugme ana-dugme" data-dosya="aktar">Önce yedeği indir, sonra aktar</button></div>` : ""}
    ${ars || (DOSYA.zip && Object.keys(DOSYA.zip).some(k => k.startsWith("ekler/"))) ? `<div class="form-alt"><button class="dugme" data-dosya="arsiv">📦 Konu Defteri ve ekler arşivini indir</button></div>` : ""}
  </div>`;
}

async function iceAktarSec(e) {
  const dosya = e.target.files[0];
  e.target.value = "";
  if (!dosya) return;
  try {
    const { veri, zip, kaynak } = await dosyaOku(dosya);
    const m = await Depo.motorAl();
    const r = m.iceAktar(veri, { kuru: true });
    DOSYA.bekleyen = veri; DOSYA.zip = zip;
    $("#dosya-rapor").innerHTML = `<p class="panel-not">Dosya: <b>${esc(dosya.name)}</b> · ${esc(kaynak)}</p>` + raporHtml(r, true);
  } catch (h) { bildir("Dosya okunamadı: " + h.message, true); }
}

async function iceAktarUygula() {
  if (!DOSYA.bekleyen) return;
  try {
    await disaAktar(true);                                          // geri dönüş için mevcut hali indir
    const m = await Depo.motorAl();
    m.oturum = { veli: true, ad: OTURUM.ad };
    const r = m.iceAktar(DOSYA.bekleyen);
    // Eski profil fotoğrafı zip'teyse küçültüp al
    const gp = (DOSYA.bekleyen.bicim ? DOSYA.bekleyen.veri : DOSYA.bekleyen).profil || {};
    for (const alan of ["ogrenci_foto", "veli_foto"]) {
      const yol = gp[alan], ad = yol && yol.startsWith("/foto/") && yol.slice(6);
      if (ad && DOSYA.zip && DOSYA.zip["fotolar/" + ad] && !m.veri.profil[alan]) {
        try { m.veri.profil[alan] = await resimKucult(URL.createObjectURL(new Blob([DOSYA.zip["fotolar/" + ad]]))); } catch (_) { /* atla */ }
      }
    }
    await Depo.kaydet();
    durum.veri = await api("GET", "veri");
    herSeyiYenile();
    $("#dosya-rapor").innerHTML = raporHtml(r, false);
    bildir("İçe aktarım bitti");
    if (!DOSYA.zip) DOSYA.bekleyen = null;
  } catch (h) { bildir("Aktarılamadı: " + h.message, true); }
}

/* Konu Defteri + ödev ekleri arşivi: tek HTML sayfası, fotoğraflar içine gömülü */
function arsivIndir() {
  const v = DOSYA.bekleyen && (DOSYA.bekleyen.bicim ? DOSYA.bekleyen.veri : DOSYA.bekleyen);
  if (!v) return;
  const K = v.koleksiyonlar, z = DOSYA.zip || {}, e = s => String(s == null ? "" : s).replace(/[&<>"]/g, h => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[h]));
  const gom = (b, ad) => {
    let s = ""; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
    return `<img src="data:image/${/\.png$/i.test(ad) ? "png" : /\.webp$/i.test(ad) ? "webp" : "jpeg"};base64,${btoa(s)}" alt="">`;
  };
  const resim = yol => { const ad = String(yol || "").replace(/^\/foto\//, ""), b = z["fotolar/" + ad]; return b ? gom(b, ad) : ""; };
  const dersAd = id => ((K.dersler || []).find(d => d.id === id) || {}).ad || "Ders";
  const canli = l => (l || []).filter(x => !x.silindi);
  let govde = "";
  for (const d of canli(K.dersler)) {
    const uniteler = canli(K.uniteler).filter(u => u.ders_id === d.id);
    if (!uniteler.length) continue;
    govde += `<h2>${e(d.ad)} <small>${e(d.sinif || "")}. sınıf</small></h2>`;
    for (const u of uniteler) {
      govde += `<h3>${e(u.ad)}</h3>`;
      for (const k of canli(K.konular).filter(k => k.unite_id === u.id)) {
        govde += `<h4>${e(k.ad)}</h4>`;
        for (const n of canli(K.notlar).filter(n => n.konu_id === k.id))
          govde += `<article><h5>${n.onemli ? "⭐ " : ""}${e(n.baslik || "")}</h5><p>${e(n.metin || "").replace(/\n/g, "<br>")}</p>${(n.fotolar || []).map(resim).join("")}<small>${e(String(n.olusturma || "").slice(0, 10))}</small></article>`;
      }
    }
  }
  const ekli = canli(K.odevler).filter(o => (o.ekler || []).length);
  if (ekli.length) {
    govde += `<h2>Ödev ekleri</h2>`;
    for (const o of ekli) govde += `<article><h5>${e(dersAd(o.ders_id))} — ${e(o.baslik || "")} <small>teslim ${e(o.teslim)}</small></h5>${o.ekler.map(x => {
      const b = z["ekler/" + x.dosya];
      if (b && (/^image\//.test(x.tur || "") || /\.(jpe?g|png|webp)$/i.test(x.dosya))) return `<p>📎 ${e(x.ad)}</p>` + gom(b, x.dosya);
      return `<p>📎 ${e(x.ad)}${b ? "" : " (dosya yedekte yok)"}</p>`;
    }).join("")}</article>`;
  }
  const ad = (v.profil || {}).ogrenci_adi || "Öğrenci";
  const html = `<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(ad)} — Konu Defteri arşivi</title>
<style>body{font:16px/1.55 system-ui,sans-serif;max-width:860px;margin:0 auto;padding:16px;color:#1b2333;background:#fbfaf7}h1{margin:.2em 0}h2{border-bottom:2px solid #f5b400;padding-bottom:4px;margin-top:2em}
h3{margin:1.4em 0 .4em;color:#2f4b7c}h4{margin:1em 0 .3em}article{background:#fff;border:1px solid #e3e0d6;border-radius:10px;padding:10px 14px;margin:8px 0}h5{margin:0 0 4px;font-size:15px}
img{max-width:100%;border-radius:8px;margin:6px 0;display:block}small{color:#6b7280}</style>
<h1>${e(ad)} — Konu Defteri arşivi</h1><p><small>Eski ÖğretmeniM uygulamasından, ${new Date().toLocaleDateString("tr-TR")} tarihinde çıkarıldı. Bu sayfa tek başına açılır; internete gerek yoktur.</small></p>${govde || "<p>Arşivlenecek not yok.</p>"}</html>`;
  dosyaIndir(`ogretmenim-${dosyaAdiParcasi(ad)}-konu-defteri-arsivi.html`, html, "text/html");
}

/* Sınıflar arası taşıma: bir dersi (sınavları, ödevleri, notlarıyla) başka sınıfa al */
function sinifTasimaCiz() {
  const kap = $("#sinif-tasima");
  if (!kap || !veliAktif()) return;
  const dersler = durum.veri.koleksiyonlar.dersler.filter(d => !d.silindi);
  const siniflar = [...new Set(dersler.map(d => d.sinif ?? aktifSinif()))].sort((a, b) => a - b);
  if (siniflar.length < 2 && !dersler.length) { kap.innerHTML = ""; return; }
  const secenek = s => Array.from({ length: 12 }, (_, i) => i + 1).map(n => `<option value="${n}" ${n === s ? "selected" : ""}>${n}. sınıf</option>`).join("");
  kap.innerHTML = `<details class="sinif-tasima"><summary>Dersleri sınıflar arasında taşı</summary>
    <p class="panel-not">Bir dersin sınıfını değiştirince o derse bağlı sınavlar, notlar, ödevler ve Notlarım da birlikte taşınır (ileri ya da geri).</p>
    ${siniflar.map(s => `<div class="st-sinif"><b>${s}. sınıf</b>${dersler.filter(d => (d.sinif ?? aktifSinif()) === s).map(d =>
      `<label class="st-ders"><span>${esc(d.ad)}</span><select data-st-ders="${d.id}">${secenek(s)}</select></label>`).join("")}</div>`).join("")}
  </details>`;
}

function dosyaOlaylariniKur() {
  const ice = $("#dosya-ice");
  if (!ice) return;
  ice.addEventListener("change", iceAktarSec);
  $("#dosya-disa").addEventListener("click", () => disaAktar());
  $("#dosya-rapor").addEventListener("click", e => {
    const b = e.target.closest("[data-dosya]");
    if (!b) return;
    if (b.dataset.dosya === "aktar") iceAktarUygula();
    else if (b.dataset.dosya === "arsiv") arsivIndir();
    else { DOSYA.bekleyen = null; DOSYA.zip = null; $("#dosya-rapor").innerHTML = ""; }
  });
  const st = $("#sinif-tasima");
  if (st) st.addEventListener("change", async e => {
    const s = e.target.closest("[data-st-ders]");
    if (!s) return;
    try { await api("PUT", "k/dersler/" + s.dataset.stDers, { sinif: Number(s.value) }); durum.veri = await api("GET", "veri"); herSeyiYenile(); sinifTasimaCiz(); bildir("Ders taşındı"); }
    catch (h) { bildir(h.message, true); }
  });
}
