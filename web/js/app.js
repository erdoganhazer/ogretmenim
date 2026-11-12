/* ÖğretmeniM arayüzü — genel yapı, ana ekran, ayarlar */
"use strict";

const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz",
               "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const AVATAR = '<svg viewBox="0 0 24 24" fill="#A9B7C8" aria-hidden="true"><circle cx="12" cy="8" r="4.2"/><path d="M3.5 21c.6-4.4 4-7 8.5-7s7.9 2.6 8.5 7z"/></svg>';

const durum = { veri: null };
const $ = (s, k = document) => k.querySelector(s);
const $$ = (s, k = document) => Array.from(k.querySelectorAll(s));

/* ---------- Motor ile konuşma ---------- */
/* Web: istekler sunucuya değil tarayıcıdaki motora gider (js/motor/). Oturum (rol) giriş katmanından gelir. */
async function api(yontem, yol, govde) {
  const oturum = window.OTURUM || { veli: false };
  const izle = yontem !== "GET" && !oturum.veli && typeof odevBittiOnce === "function";   // öğrenci ödev bitirdi mi?
  const once = izle ? await odevBittiOnce() : null;
  const { durum, govde: sonuc } = await Depo.istek(yontem, yol, govde, oturum);
  if (durum === 401 && sonuc.kod === "veli_gerekli") throw new Error("Bu işlemi yalnız veli yapabilir");
  if (durum >= 400) throw new Error(sonuc.hata || "Bir sorun oluştu");
  if (izle) odevBittiSonra(once);
  return sonuc;
}

function bildir(mesaj, hata = false) {
  const b = $("#bildirim");
  b.textContent = mesaj;
  b.classList.toggle("hata", hata);
  b.hidden = false;
  clearTimeout(bildir.zaman);
  bildir.zaman = setTimeout(() => (b.hidden = true), 3200);
}

/* ---------- Sekmeler ---------- */
async function sayfaAc(ad) {
  if (ad !== "program") programDuzenlemeKapat();
  if (ad !== "dersler") dersDuzenlemeKapat();
  if (ad === "defterler") ad = "cep";                     // web: Konu Defteri kalktı
  if (["ozet", "rapor"].includes(ad) && !veliAktif()) ad = "ana";
  const navAd = { program: veliAktif() ? "dersler" : "ana", ders: "dersler" }[ad] || ad;
  $$("#sekmeler button").forEach(b => b.classList.toggle("aktif", b.dataset.sayfa === navAd));
  document.body.classList.toggle("cizelgesiz", !["ana", "plan", "ozet"].includes(ad));   // Zaman Çizelgesi Bugün'de ve veli özetinde
  if (ad === "ogren" && typeof ogrenCiz === "function") ogrenCiz();
  $$(".sayfa").forEach(s => s.classList.toggle("aktif", s.id === "sayfa-" + ad));
  $(".sayfalar").scrollTop = 0;
  window.scrollTo(0, 0);                                   // telefonda sayfanın kendisi kayar
  if (ad === "ayarlar") { if (typeof surumDenetle === "function") surumDenetle(); veliAyarlariniCiz(); if (typeof ogrenciBildirimCiz === "function") ogrenciBildirimCiz(); }
  if (ad === "cep") cepCiz();
  if (ad === "program") programSayfasiCiz();
  if (ad === "dersler") derslerSayfasiCiz();
  if (ad === "ozet") veliOzetCiz();
  if (ad === "ders") dersSayfasiCiz();
  if (ad === "rapor") raporSayfasiCiz();
  if (ad === "plan") planYukle();
  document.body.classList.toggle("plan-acik", ad === "plan");   // 0.18: Planım'da sağdaki Zaman Çizelgesi gizlenir
}

/* ---------- Tarih yardımcıları ---------- */
function gunBasi(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d; }
function gunEkle(t, n) { const d = new Date(t); d.setDate(d.getDate() + n); return d; }

function selamlama(saat) {
  if (saat >= 5 && saat < 12) return "Günaydın";
  if (saat >= 12 && saat < 18) return "İyi günler";
  if (saat >= 18 && saat < 23) return "İyi akşamlar";
  return "İyi geceler";
}

/* ---------- Ana ekran ---------- */
function fotoKoy(kutu, yol) {
  if (yol) {
    kutu.style.backgroundImage = `url("${yol}")`;
    kutu.innerHTML = "";
  } else {
    kutu.style.backgroundImage = "";
    kutu.innerHTML = AVATAR;
  }
}

function anaEkraniCiz() {
  const p = durum.veri.profil;
  const simdi = new Date();
  const ad = p.ogrenci_adi.trim();

  $("#selam").textContent = selamlama(simdi.getHours()) + (ad ? "," : "!");
  $("#ana-ad").textContent = ad ? `${ad} ${p.ogrenci_soyadi}`.trim() : "";
  $("#ana-okul").innerHTML = "";
  if (p.okul) $("#ana-okul").append(p.okul);
  if (p.sube) {
    const s = document.createElement("span");
    s.className = "sube";
    s.textContent = p.sube;
    $("#ana-okul").append(s);
  }
  fotoKoy($("#ana-foto"), p.ogrenci_foto);
  $("#ilk-kurulum").hidden = Boolean(ad);

  $("#tarih-gun").textContent = simdi.getDate();
  $("#tarih-ay").textContent = `${AYLAR[simdi.getMonth()]} · ${GUNLER[simdi.getDay()]}`;
}

function saatiCiz() {
  const s = new Date();
  $("#saat").textContent = String(s.getHours()).padStart(2, "0") + ":" + String(s.getMinutes()).padStart(2, "0");
}

/* ---------- Tüm görünümleri yenile (kayıt değişince) ---------- */
function herSeyiYenile() {
  anaEkraniCiz();
  programOzetCiz();
  cizelgeyiCiz();
  sinavTakvimiCiz();
  araclariCiz();
  motivasyonCiz();
  mesajRozetiCiz();
  if (typeof hz !== "undefined" && hz.yuklendi) { yaziliTarihleriniEsle(); yaziliPanelCiz(); if (typeof provaListesiCiz === "function") provaListesiCiz(); }
  if (typeof anaSiradakiCiz === "function") anaSiradakiCiz();   // 0.25.1: yazılı tarihleri Zaman Çizelgesi'nden
  if ($("#sayfa-ozet").classList.contains("aktif")) veliOzetCiz();
  if ($("#sayfa-ders").classList.contains("aktif")) dersSayfasiCiz();
  if ($("#sayfa-dersler").classList.contains("aktif")) derslerSayfasiCiz();
  if ($("#sayfa-cep").classList.contains("aktif") && !cep.duzenlenen) cepCiz();
}

/* ---------- Ayarlar: profil ---------- */
const bekleyenFoto = {};

function formuDoldur() {
  const p = durum.veri.profil;
  const form = $("#profil-form");
  $$("input[name]", form).forEach(i => (i.value = p[i.name] || ""));
  for (const alan of ["ogrenci_foto", "veli_foto"]) {
    delete bekleyenFoto[alan];
    fotoKoy($("#onizleme-" + alan), p[alan]);
  }
  $("#kayit-durum").textContent = "";
}

function fotoSeciciKur() {
  $$(".foto-sec").forEach(etiket => {
    const alan = etiket.dataset.alan;
    $("input[type=file]", etiket).addEventListener("change", e => {
      const dosya = e.target.files[0];
      if (!dosya) return;
      if (dosya.size > 15 * 1024 * 1024) return bildir("Fotoğraf 15 MB'tan küçük olmalı", true);
      bekleyenFoto[alan] = dosya;
      fotoKoy($("#onizleme-" + alan), URL.createObjectURL(dosya));
    });
  });
}

async function profiliKaydet(e) {
  e.preventDefault();
  const form = e.target;
  const yeni = {};
  $$("input[name]", form).forEach(i => (yeni[i.name] = i.value.trim()));
  try {
    for (const [alan, dosya] of Object.entries(bekleyenFoto)) {
      yeni[alan] = await resimKucult(dosya);            // web: küçültülüp profilde saklanır (≈20 KB)
    }
    durum.veri.profil = await api("PUT", "profil", yeni);
    Object.keys(bekleyenFoto).forEach(k => delete bekleyenFoto[k]);
    anaEkraniCiz();
    $("#kayit-durum").textContent = "Kaydedildi ✓";
    bildir("Profil kaydedildi");
  } catch (hata) {
    bildir(hata.message, true);
  }
}

/* ---------- Başlangıç ---------- */
async function basla() {
  $$("#sekmeler button").forEach(b => b.addEventListener("click", () => sayfaAc(b.dataset.sayfa)));
  document.addEventListener("click", e => {
    const git = e.target.closest("[data-git]");
    if (git) sayfaAc(git.dataset.git);
  });
  $("#profil-form").addEventListener("submit", profiliKaydet);
  fotoSeciciKur();
  programOlaylariniKur();
  kayitOlaylariniKur();
  sonucOlaylariniKur();
  veliOlaylariniKur();
  aracOlaylariniKur();
  cepOlaylariniKur();
  motivasyonOlaylariniKur();
  mesajOlaylariniKur();
  if (typeof gelenOlaylariniKur === "function") gelenOlaylariniKur();
  miniOyunOlaylariniKur();
  gelisimOlaylariniKur();
  planOlaylariniKur();
  document.addEventListener("veli-kilitlendi", () => {
    programDuzenlemeKapat();
    dersDuzenlemeKapat();
    araclariCiz();
    if ($("#sayfa-program").classList.contains("aktif")) programSayfasiCiz();
    if ($("#sayfa-dersler").classList.contains("aktif")) derslerSayfasiCiz();
  });

  try {
    durum.veri = await api("GET", "veri");
    durum.surum = (await api("GET", "durum")).surum;
    $("#marka-surum").textContent = UYGULAMA_SURUMU.surum || "";
  } catch (hata) {
    bildir("Motora ulaşılamadı: " + hata.message, true);
    return;
  }
  saatiCiz();
  herSeyiYenile();
  await planYukle();
  calismaBildir();
  if (typeof zaman !== "undefined" && zaman) sayfaAc("plan");     // çalışırken kapanıp açıldıysa doğrudan Çalışma Masam
  raporOlaylariniKur();
  hazirlikOlaylariniKur();
  kelimeOlaylariniKur();
  ogrenOlaylariniKur();
  kelimeYonetimOlaylariniKur();
  dersSayfaOlaylariniKur();
  veliOzetOlaylariniKur();
  dosyaOlaylariniKur();
  bildirimOlaylariniKur();
  if (veliAktif()) sayfaAc("ozet");

  // Saat, selamlama, "Şimdi" dersi ve gün değişimi için düzenli yenile
  let sonGun = new Date().getDate();
  setInterval(() => {
    saatiCiz();
    anaEkraniCiz();
    programOzetCiz();
    if (new Date().getDate() !== sonGun) {
      sonGun = new Date().getDate();
      herSeyiYenile();
      planYukle();
    }
  }, 20000);
}

girisBaslat(basla);
