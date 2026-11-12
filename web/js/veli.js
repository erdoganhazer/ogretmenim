/* ÖğretmeniM — veli şifresi, veli oturumu, işlem günlüğü
   Korumalı bir işlem motordan "veli_gerekli" dönerse api() şifre penceresini açar ve işlemi bir kez yeniler. */
"use strict";

const veli = { anahtar: "", sure: 900000, pinVar: false, ben: null };

// 0.13: veli modu son dokunuştan itibaren "sure" kadar açık kalır (arka plan istekleri süreyi uzatmaz)
function veliBitis() { return sonEtkinlik + veli.sure; }
function veliAktif() { return Boolean(veli.anahtar) && Date.now() < veliBitis(); }

function veliOturumuKaydet(sonuc) {
  veli.anahtar = sonuc.anahtar;
  if (sonuc.ben) veli.ben = sonuc.ben;
  veli.sure = (sonuc.sure || 900) * 1000;
  sonEtkinlik = Date.now();
  veli.pinVar = true;
  veliGostergesiCiz();
}

function veliCikis() {
  if (veli.anahtar) fetch("/api/veli/cikis", { method: "POST", headers: { "X-Veli-Anahtar": veli.anahtar } }).catch(() => {});
  veli.anahtar = "";
  veliGostergesiCiz();
  document.dispatchEvent(new Event("veli-kilitlendi"));
}

function veliGostergesiCiz() {
  document.body.classList.toggle("veli-modu", veliAktif());
  if (typeof kdPanelCiz === "function") kdPanelCiz();
  const g = $("#veli-gosterge");
  if (!g) return;
  if (!veliAktif()) { g.hidden = true; return; }
  const dk = Math.max(1, Math.ceil((veliBitis() - Date.now()) / 60000));
  g.hidden = false;
  $("#veli-kalan").textContent = `${veli.ben ? veli.ben.ad + " · " : ""}${dk} dk`;
}

// Şifre penceresi: şifre yoksa oluşturma, varsa giriş. Başarılıysa true döner.
let veliBekleyen = null;
async function veliGerekli(sebep = "Bu işlem için veli şifresi gerekli.") {
  if (veliAktif()) return true;
  if (veliBekleyen) return veliBekleyen;
  try {
    const d = await fetch("/api/veli/durum").then(r => r.json());
    veli.pinVar = d.pin_var;
  } catch (_) { /* motor yoksa yine de pencereyi göster */ }

  veliBekleyen = new Promise(coz => {
    const pencere = $("#veli-pencere");
    const olustur = !veli.pinVar;
    $("#veli-baslik").textContent = olustur ? "Veli şifresi oluştur" : "Veli girişi";
    $("#veli-aciklama").textContent = olustur
      ? "Ders programı, ders listesi ve ayarlar bu şifreyle korunacak. 4-8 haneli bir sayı seç ve Arın'la paylaşma."
      : sebep;
    $("#veli-pin2-alan").hidden = !olustur;
    $("#veli-ad-alan").hidden = !olustur;
    $("#veli-hata").textContent = "";
    const pin1 = $("#veli-pin1"), pin2 = $("#veli-pin2");
    pin1.value = ""; pin2.value = "";

    const bitir = sonuc => {
      pencere.close();
      $("#veli-form").onsubmit = null;
      $("#veli-vazgec").onclick = null;
      pencere.oncancel = null;
      veliBekleyen = null;
      coz(sonuc);
    };
    $("#veli-vazgec").onclick = () => bitir(false);
    pencere.oncancel = e => { e.preventDefault(); bitir(false); };
    $("#veli-form").onsubmit = async e => {
      e.preventDefault();
      const pin = pin1.value.trim();
      if (!/^\d{4,8}$/.test(pin)) { $("#veli-hata").textContent = "Şifre 4-8 haneli bir sayı olmalı."; return; }
      if (olustur && pin !== pin2.value.trim()) { $("#veli-hata").textContent = "İki şifre aynı değil."; return; }
      try {
        const yanit = await fetch("/api/veli/" + (olustur ? "olustur" : "giris"), {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(olustur ? { pin, ad: $("#veli-ad").value.trim() || "Veli" } : { pin }),
        });
        const sonuc = await yanit.json();
        if (!yanit.ok) { $("#veli-hata").textContent = sonuc.hata || "Giriş yapılamadı."; pin1.select(); return; }
        veliOturumuKaydet(sonuc);
        if (olustur) bildir("Veli şifresi oluşturuldu 🔒");
        bitir(true);
      } catch (_) { $("#veli-hata").textContent = "Motora ulaşılamadı."; }
    };
    pencere.showModal();
    pin1.focus();
  });
  return veliBekleyen;
}

/* ---------- Gizli veli girişi: Ayarlar > Hakkında'daki logoya 3 saniye basılı tut ---------- */
function gizliGirisKur() {
  const logo = $("#gizli-giris");
  let zaman = null;
  const birak = () => { clearTimeout(zaman); zaman = null; logo.classList.remove("basiliyor"); };
  logo.addEventListener("pointerdown", e => {
    e.preventDefault();
    logo.classList.add("basiliyor");
    zaman = setTimeout(async () => {
      birak();
      if (await veliGerekli("Veli girişi")) { veliAyarlariniCiz(); bildir("Veli modu açık 🔓"); }
    }, 3000);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach(t => logo.addEventListener(t, birak));
  logo.addEventListener("contextmenu", e => e.preventDefault());
}

function veliAyarlariniCiz() {
  if (!veliAktif()) return;
  formuDoldur(); aracAyarlariCiz(); sinifAyariCiz(); kelimeYonetimCiz(); bildirimCiz(); sinifTasimaCiz();
  mesajRozetiCiz();
  araclariCiz();
  if ($("#sayfa-program").classList.contains("aktif")) programSayfasiCiz();
  if ($("#sayfa-dersler").classList.contains("aktif")) derslerSayfasiCiz();
}

/* ---------- Ayarlar: görünüm (yazı boyutu, bu bilgisayarda saklanır) ---------- */
const YAZI_OLCEK = { normal: 1, buyuk: 1.12, cok: 1.25 };
function yaziBoyutuUygula(boyut) {
  document.body.style.zoom = YAZI_OLCEK[boyut] || 1;
  $$("#yazi-boyutu [data-boyut]").forEach(b => b.classList.toggle("aktif", b.dataset.boyut === boyut));
  try { localStorage.setItem("ogretmenim-yazi", boyut); } catch (_) { /* depolama yoksa önemsiz */ }
}
function gorunumKur() {
  let kayitli = "normal";
  try { kayitli = localStorage.getItem("ogretmenim-yazi") || "normal"; } catch (_) { /* yok */ }
  yaziBoyutuUygula(kayitli);
  $("#yazi-boyutu").addEventListener("click", e => { const b = e.target.closest("[data-boyut]"); if (b) yaziBoyutuUygula(b.dataset.boyut); });
}

/* ---------- Veli: sınıf düzeyi ---------- */
function sinifAyariCiz() {
  const s = durum.veri.ayarlar.aktif_sinif || 5;
  $("#sinif-bilgi").innerHTML = `Şu an <b>${s}. sınıf</b>. Yeni öğretim yılı başlayınca "Yeni sınıfa geç"e bas: dersler ${s + 1}. sınıfa kopyalanır,
    ${s}. sınıfın defterleri ve sınav sonuçları arşivde okunabilir kalır, ders programı boşaltılır (ders saatleri kalır).`;
  $("#sinif-gec").textContent = `${s + 1}. sınıfa geç`;
}
async function sinifGec() {
  const s = durum.veri.ayarlar.aktif_sinif || 5;
  if (!confirm(`${s + 1}. sınıfa geçilsin mi?\n\nBu yılın defterleri ve sonuçları arşive geçer, ders programı boşaltılır.`)) return;
  try {
    await api("POST", "sinif/gec");
    durum.veri = await api("GET", "veri");
    herSeyiYenile(); sinifAyariCiz();
    bildir(`${s + 1}. sınıfa geçildi. Yeni ders programını girmeyi unutma.`);
  } catch (hata) { bildir(hata.message, true); }
}

/* ---------- Veliler (her velinin adı ve şifresi) ---------- */
async function velileriCiz() {
  try {
    const liste = await api("GET", "veli/liste");
    $("#veli-listesi").innerHTML = liste.map(v => {
      const ben = veli.ben && veli.ben.id === v.id;
      const durumYazi = v.panel_eslesme ? "Veli Paneli eşleşti ✓" : ben ? "Veli Paneli eşleşmedi" : "Veli Paneli eşleşmedi (kendi girişiyle eşleştirmeli)";
      return `<div class="veli-satir">
      <span class="veli-ad">${esc(v.ad)}${ben ? " <small>(sen)</small>" : ""}</span>
      <span class="eslesme-durum ${v.panel_eslesme ? "iyi" : "kotu"}">${durumYazi}</span>
      ${ben ? `<button class="dugme kucuk" data-veli-eslestir>${v.panel_eslesme ? "Yeniden eşleştir" : "Veli Paneli'ni eşleştir"}</button>
               <button class="dugme kucuk" data-veli-ad>Adımı değiştir</button>`
            : `<button class="dugme kucuk sil" data-veli-sil="${esc(v.id)}" data-ad="${esc(v.ad)}">Çıkar</button>`}
    </div>`; }).join("");
  } catch (hata) { $("#veli-listesi").innerHTML = `<div class="gun-bos">${esc(hata.message)}</div>`; }
}
async function veliEkle(e) {
  e.preventDefault();
  const ad = $("#yeni-veli-ad").value.trim(), pin = $("#yeni-veli-pin").value.trim();
  if (!ad) return bildir("Velinin adını yaz", true);
  if (!/^\d{4,8}$/.test(pin)) return bildir("Şifre 4-8 haneli bir sayı olmalı", true);
  if (pin !== $("#yeni-veli-pin2").value.trim()) return bildir("İki şifre aynı değil", true);
  try {
    await api("POST", "veli/ekle", { ad, pin });
    $("#veli-ekle-form").reset(); $("#veli-ekle-form").hidden = true;
    bildir(`${ad} eklendi. Kendi şifresiyle giriş yapabilir.`);
    velileriCiz();
  } catch (hata) { bildir(hata.message, true); }
}
async function veliListesiTik(e) {
  const sil = e.target.closest("[data-veli-sil]"), adB = e.target.closest("[data-veli-ad]"), es = e.target.closest("[data-veli-eslestir]");
  try {
    if (es) {
      const sonuc = await api("POST", "veli/eslestir");
      $("#eslesme-kod").textContent = sonuc.kod;
      $("#eslesme-bilgi").textContent = sonuc.paylasim
        ? "Kod birkaç saniye içinde paylaşım klasörüne hazırlanır. Eşleşince bu listede “Veli Paneli eşleşti ✓” yazar."
        : "Paylaşım klasörü şu an bağlı değil. Bağlanınca kod panele iletilir; bu süre içinde eşleştirebilirsin.";
      $("#eslesme-pencere").showModal();
    }
    if (sil && confirm(`${sil.dataset.ad} veli listesinden çıkarılsın mı?`)) { await api("POST", "veli/sil", { id: sil.dataset.veliSil }); velileriCiz(); }
    if (adB) {
      const yeni = await adSor("Adın", veli.ben ? veli.ben.ad : "");
      if (yeni) { veli.ben = await api("PUT", "veli/ad", { ad: yeni }); veliGostergesiCiz(); velileriCiz(); }
    }
  } catch (hata) { bildir(hata.message, true); }
}

/* ---------- Ayarlar: şifre değiştir ---------- */
async function pinDegistir(e) {
  e.preventDefault();
  const eski = $("#eski-pin").value.trim(), yeni = $("#yeni-pin1").value.trim(), tekrar = $("#yeni-pin2").value.trim();
  if (!eski) return bildir("Şu anki şifreni yaz", true);
  if (!/^\d{4,8}$/.test(yeni)) return bildir("Yeni şifre 4-8 haneli bir sayı olmalı", true);
  if (yeni !== tekrar) return bildir("İki şifre aynı değil", true);
  try {
    veliOturumuKaydet(await api("POST", "veli/olustur", { pin: yeni, eski_pin: eski }));
    $("#eski-pin").value = $("#yeni-pin1").value = $("#yeni-pin2").value = "";
    bildir("Veli şifresi değiştirildi");
  } catch (hata) { bildir(hata.message, true); }
}

/* ---------- Ayarlar: işlem günlüğü ---------- */
const KAYNAK_ADLARI = { ogrenci: "Arın", veli: "Veli", sistem: "Sistem" };
async function gunlukCiz() {
  const kap = $("#gunluk-liste");
  if (!kap) return;
  const filtre = $("#gunluk-filtre").value;
  try {
    const kayitlar = await api("GET", "gunluk");
    const ogrenciAdi = (durum.veri.profil.ogrenci_adi || "Öğrenci").trim();
    const liste = kayitlar.filter(k => !filtre || k.kaynak === filtre || (filtre === "uyari" && k.tur === "uyari"));
    if (!liste.length) { kap.innerHTML = `<div class="gun-bos">Kayıt yok.</div>`; return; }
    let sonGun = "";
    kap.innerHTML = liste.map(k => {
      const t = new Date(k.zaman);
      const gun = `${t.getDate()} ${AYLAR[t.getMonth()]} ${GUNLER[t.getDay()]}`;
      const baslik = gun !== sonGun ? `<div class="gunluk-gun">${gun}</div>` : "";
      sonGun = gun;
      const kim = k.kaynak === "ogrenci" ? ogrenciAdi : k.kaynak === "veli" ? (k.kim || "Veli") : (KAYNAK_ADLARI[k.kaynak] || k.kaynak);
      return baslik + `<div class="gunluk-satir tur-${esc(k.tur)}">
        <span class="gunluk-saat">${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}</span>
        <span class="gunluk-kim k-${esc(k.kaynak)}">${esc(kim)}</span>
        <span class="gunluk-metin">${esc(k.metin)}</span></div>`;
    }).join("");
  } catch (hata) {
    kap.innerHTML = `<div class="gun-bos">${esc(hata.message)}</div>`;
  }
}

/* ---------- Ayarlar: veli bilgisayarı bağlantısı (eşitleme) ---------- */
async function esitlemeCiz() {
  const kap = $("#esitleme-durumu");
  if (!kap) return;
  try {
    const e = await api("GET", "esitleme");
    const son = e.son_basari ? new Date(e.son_basari) : null;
    kap.innerHTML = `
      <div class="esit-satir"><span>Paylaşım klasörü</span><b class="${e.paylasim ? "iyi" : "kotu"}">${e.paylasim ? "Bağlı ✓" : "Bağlı değil"}</b></div>
      <div class="esit-satir"><span>Son eşitleme</span><b>${son ? `${String(son.getHours()).padStart(2, "0")}:${String(son.getMinutes()).padStart(2, "0")}` : "—"}</b></div>
      <div class="esit-satir"><span>Veli Paneli eşleşmesi</span><b class="${e.eslesmeyen.length ? "kotu" : "iyi"}">${e.eslesmeyen.length ? "Eşleşmedi: " + esc(e.eslesmeyen.join(", ")) : "Tüm veliler eşleşti ✓"}</b></div>
      <div class="esit-satir"><span>Veli Paneli'nden alınan / reddedilen</span><b>${e.islenen} / ${e.reddedilen}</b></div>
      ${e.son_hata ? `<div class="esit-satir"><span>Son sorun</span><b class="kotu">${esc(e.son_hata)}</b></div>` : ""}
      <div class="esit-satir"><span>Windows bilgisayarının adı</span><b>${esc(e.bilgisayar || "—")}</b></div>
      ${e.kesif ? `<div class="esit-satir"><span>Kendiliğinden bulma</span><b class="${/Yeniden bağlanıldı/.test(e.kesif) ? "iyi" : "kotu"}">${esc(e.kesif)}</b></div>` : ""}
      ${e.paylasim ? "" : `<p class="panel-not">Uygulama Windows bilgisayarını adıyla 5 dakikada bir kendisi arar. Beklemek istemezsen aşağıdaki
        <b>Bilgisayarımı bul ve bağlan</b> düğmesine bas.</p>`}`;
    $("#paylasim-adresi").value = e.adres || "";
    baglantiUyarisi(e);
    guncellemeCiz(e.guncelleme);
  } catch (hata) { kap.innerHTML = `<div class="gun-bos">${esc(hata.message)}</div>`; }
}

async function paylasimAdresiKaydet(e) {
  const adres = e.target.value.trim();
  if (adres && !/^smb:\/\/[^/]+\/.+/i.test(adres)) return bildir("Adres smb://192.168.1.9/OgretmeniM gibi olmalı", true);
  try { durum.veri.ayarlar = await api("PUT", "ayarlar", { paylasim_adresi: adres }); bildir("Paylaşım adresi kaydedildi"); }
  catch (hata) { bildir(hata.message, true); }
}

/* ---------- Canlı yenileme: veli bilgisayarından gelen değişiklikler ekrana düşsün ---------- */
let sonSayac = null;
async function degisimYokla() {
  try {
    const { sayac, surum } = await fetch("/api/sayac").then(r => r.json());
    if (surumDegistiMi(surum)) return;
    if (sonSayac !== null && sayac !== sonSayac) {
      const mesgul = $$("dialog").some(p => p.open && p.id !== "mesaj-pencere") || (typeof defter !== "undefined" && defter.duzenlenen) ||
                     (typeof programDuzenleme !== "undefined" && programDuzenleme) || (typeof dersDuzenleme !== "undefined" && dersDuzenleme);
      if (mesgul) return;                 // kullanıcı bir şey düzenliyorken ekranı bozma; sonra yenilenir
      durum.veri = await api("GET", "veri");
      herSeyiYenile();
      if ($("#mesaj-pencere").open) { mesajlariCiz(); okunduIsaretle(); }
      if ($("#sayfa-program").classList.contains("aktif")) programSayfasiCiz();
      if ($("#sayfa-plan").classList.contains("aktif")) planYukle();
    }
    sonSayac = sayac;
  } catch (_) { /* motor geçici olarak yoksa sessiz geç */ }
}

function veliOlaylariniKur() {                      // web: yetki oturumdan; eski PIN, eşitleme ve veli listesi kalktı
  gorunumKur();
  $("#sinif-gec").addEventListener("click", sinifGec);
}
