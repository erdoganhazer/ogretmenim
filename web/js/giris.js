/* ÖğretmeniM web — giriş ekranı, öğrenci seçimi, oturum menüsü ve yönetici hesap ekranı.
   Eski veli şifresi (PIN) yerine rol hesaptan gelir: veli/yönetici veli işlemlerini, öğrenci kendi işlerini yapar. */
"use strict";

window.OTURUM = { veli: false, ad: null };
let girisKisi = null, girisEsitleyici = null;

/* Eski veli şifresi akışının yerine: yetki oturumdan gelir */
veliAktif = () => Boolean(window.OTURUM && OTURUM.veli);
veliGerekli = async () => { if (veliAktif()) return true; bildir("Bu işlemi yalnız veli yapabilir", true); return false; };
veliCikis = () => {};
veliGostergesiCiz = () => {
  document.body.classList.toggle("veli-modu", veliAktif());
  document.body.classList.toggle("rol-ogrenci", !veliAktif());
  const t = veliAktif() ? "Dersler" : "Derslerim";
  if ($("#sk-dersler")) $("#sk-dersler").textContent = t;
  if ($("#dersler-baslik")) $("#dersler-baslik").textContent = t;
  if ($("#ders-geri-yazi")) $("#ders-geri-yazi").textContent = t;
  if (typeof kdPanelCiz === "function") kdPanelCiz();
};

const ROL_ADI = { ogrenci: "Öğrenci", veli: "Veli", yonetici: "Yönetici" };

function girisHata(m) { $("#giris-hata").textContent = m || ""; }
function girisEkrani(adim) {                          // "form" | "secim" | "yukleniyor" | null (uygulama)
  $("#giris-ekrani").hidden = !adim;
  $("#giris-form").hidden = adim !== "form";
  $("#giris-secim").hidden = adim !== "secim";
  $("#giris-yukleniyor").hidden = adim !== "yukleniyor";
}

async function girisBaslat(uygulamayiBaslat) {
  if (typeof FB === "undefined" || typeof FIREBASE_AYAR === "undefined") {   // geliştirme: Firebase yoksa tarayıcı deposuyla
    girisEkrani(null); window.OTURUM = { veli: true, ad: "Deneme" }; veliGostergesiCiz(); return uygulamayiBaslat();
  }
  girisEkrani("yukleniyor");
  let ilkKurulum = false;
  try {
    const u = await Bulut.oturumuBekle();
    if (u) girisKisi = await Bulut.kimim();
  } catch (e) { girisHata(e.message); }
  if (!girisKisi) {
    ilkKurulum = !(await Bulut.kurulumVarMi());
    girisFormuHazirla(ilkKurulum);
    girisEkrani("form");
    girisKisi = await new Promise(coz => {
      $("#giris-form").onsubmit = async e => {
        e.preventDefault(); girisHata("");
        const kullanici = $("#giris-kullanici").value, sifre = $("#giris-sifre").value;
        $("#giris-dugme").disabled = true;
        try {
          if (ilkKurulum) {
            if (sifre.length < 6) throw new Error("Şifre en az 6 karakter olmalı");
            if (sifre !== $("#giris-sifre2").value) throw new Error("İki şifre aynı değil");
            coz(await Bulut.ilkKurulum({ ad: $("#giris-adsoyad").value, kullanici, sifre }));
          } else coz(await Bulut.girisYap(kullanici, sifre));
        } catch (h) { girisHata(h.message); }
        finally { $("#giris-dugme").disabled = false; }
      };
    });
  }
  await ogrenciSecVeBaslat(uygulamayiBaslat);
}

function girisFormuHazirla(ilk) {
  $("#giris-not").textContent = ilk ? "İlk kurulum: yönetici hesabını oluştur. Bu hesapla öğrenci ve veli hesaplarını açacaksın."
    : "Kullanıcı adın ve şifrenle gir.";
  $("#giris-ad-alan").hidden = !ilk;
  $("#giris-sifre2-alan").hidden = !ilk;
  $("#giris-dugme").textContent = ilk ? "Yönetici hesabını oluştur" : "Giriş";
  $("#giris-sifre").autocomplete = ilk ? "new-password" : "current-password";
}

async function ogrenciSecVeBaslat(uygulamayiBaslat) {
  const k = girisKisi, veli = k.rol !== "ogrenci";
  let oid = k.id;
  if (veli) {
    const liste = k.ogrenciler || [];
    const kayitli = (() => { try { return localStorage.getItem("ogretmenim-ogrenci"); } catch (_) { return null; } })();
    const istenen = new URLSearchParams(location.search).get("ogrenci");     // bildirimden açıldıysa o öğrenci
    if (istenen && liste.includes(istenen)) oid = istenen;
    else if (liste.length === 1) oid = liste[0];
    else if (kayitli && liste.includes(kayitli) && !girisBaslat.secimIste) oid = kayitli;
    else oid = await ogrenciSec(liste);
    if (!oid) return;
    try { localStorage.setItem("ogretmenim-ogrenci", oid); } catch (_) { /* özel pencere */ }
  }
  girisEkrani("yukleniyor");
  window.OTURUM = { veli, ad: k.ad, rol: k.rol, kisi: k.id, veliKayit: veli ? { id: k.id, ad: k.ad } : null, ogrenci: oid };
  try {
    let yazili = { yazililar: [] };
    try { yazili = await (await fetch("hazirlik/yazili1.json")).json(); } catch (_) { /* içerik yok */ }
    girisEsitleyici = new Bulut.Esitleyici(oid, OTURUM, { yazili, surum: "web" });
    await girisEsitleyici.yukle();
  } catch (e) {
    girisEkrani("form"); girisHata("Veri açılamadı: " + e.message); return;
  }
  Depo.bulutaBagla(girisEsitleyici);
  girisEsitleyici.dinleyen = () => { if (typeof herSeyiYenile === "function") { yenidenYukle(); } };
  OTURUM.ogrenciAdi = veli ? await Bulut.ogrenciAdi(oid) : k.ad;
  if (typeof mesajKisileriniBaslat === "function") mesajKisileriniBaslat();   // kişiler + veliler arası sohbet rozetleri
  if (typeof gelenBaslat === "function") gelenBaslat();                       // 🔔 bildirim zili
  oturumMenusuKur();
  veliGostergesiCiz();
  girisEkrani(null);
  if (!girisBaslat.basladi) { girisBaslat.basladi = true; await uygulamayiBaslat(); }
  else yenidenYukle();
}
let yenidenBekliyor = false;
async function yenidenYukle() {
  if (yenidenBekliyor) return;
  yenidenBekliyor = true;
  try {
    durum.veri = await api("GET", "veri");
    herSeyiYenile();
    if (typeof planYukle === "function") await planYukle();
  } catch (e) { console.error(e); } finally { yenidenBekliyor = false; }
}

async function ogrenciSec(liste) {
  girisEkrani("secim");
  $("#giris-hesaplar").hidden = girisKisi.rol !== "yonetici";
  $("#giris-hesaplar").onclick = () => hesaplarAc();
  $("#giris-cikis").onclick = cikisYap;
  const kap = $("#giris-ogrenciler");
  if (!liste.length) {
    kap.innerHTML = `<p class="giris-not">Sana atanmış öğrenci yok.${girisKisi.rol === "yonetici" ? " Hesapları yönet bölümünden bir öğrenci hesabı aç." : " Yöneticiye sor."}</p>`;
  } else {
    kap.innerHTML = "";
    for (const oid of liste) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "dugme giris-ogrenci"; b.dataset.oid = oid; b.textContent = "…";
      kap.appendChild(b);
      Bulut.ogrenciAdi(oid).then(ad => { b.textContent = "🎒 " + ad; });
    }
  }
  return new Promise(coz => { kap.onclick = e => { const b = e.target.closest("[data-oid]"); if (b) coz(b.dataset.oid); }; });
}

async function cikisYap() {
  if (girisEsitleyici) girisEsitleyici.kapat();
  try { localStorage.removeItem("ogretmenim-ogrenci"); } catch (_) { /* yok */ }
  await Bulut.cikisYap();
  location.reload();
}

function oturumMenusuKur() {
  const k = girisKisi, veli = k.rol !== "ogrenci";
  $("#oturum-ad").textContent = (veli ? "👤 " : "🎒 ") + k.ad + (veli && OTURUM.ogrenciAdi ? " · " + OTURUM.ogrenciAdi : "");
  $("#oturum-kim").textContent = `${k.ad} (${ROL_ADI[k.rol]}) · kullanıcı adı: ${k.kullanici_adi}`;
  $("#oturum-ogrenci-degistir").hidden = !veli || (k.ogrenciler || []).length < 2;
  $("#oturum-hesaplar").hidden = k.rol !== "yonetici";
  $("#oturum-ad").onclick = () => { $("#oturum-menu").hidden = !$("#oturum-menu").hidden; };
  document.addEventListener("click", e => { if (!e.target.closest("#oturum-kutu")) $("#oturum-menu").hidden = true; });
  $("#oturum-cikis").onclick = cikisYap;
  $("#oturum-hesaplar").onclick = () => { $("#oturum-menu").hidden = true; hesaplarAc(); };
  $("#oturum-ogrenci-degistir").onclick = async () => {
    $("#oturum-menu").hidden = true;
    girisEsitleyici.kapat(); Depo.bulutaBagla(null);
    girisBaslat.secimIste = true;
    await ogrenciSecVeBaslat(() => {});
  };
  $("#oturum-sifre").onclick = async () => {
    $("#oturum-menu").hidden = true;
    const eski = prompt("Şu anki şifren:");
    if (!eski) return;
    const yeni = prompt("Yeni şifre (en az 6 karakter):");
    if (!yeni) return;
    try { await Bulut.sifremiDegistir(eski, yeni); bildir("Şifren değişti"); } catch (e) { bildir(e.message, true); }
  };
}
document.addEventListener("bulut-hata", e => bildir("Kaydedilemedi: " + e.detail, true));

/* ---------- Hesaplar (yönetici) ---------- */
let hesapListesi = [], hesapSecili = null;
async function hesaplarAc() {
  const p = $("#hesap-pencere");
  if (!p.open) p.showModal();
  $("#hesap-kapat").onclick = () => p.close();
  p.onclose = () => { if (!$("#giris-secim").hidden) location.reload(); };     // öğrenci seçim ekranındaysa yeni listeyle aç
  $("#hf-rol").onchange = hesapFormAlanlari;
  $("#hf-yeni").onclick = () => hesapFormu(null);
  $("#hesap-form").onsubmit = hesapKaydet;
  $("#hesap-liste").onclick = e => { const s = e.target.closest("[data-kisi]"); if (s) hesapFormu(hesapListesi.find(k => k.id === s.dataset.kisi)); };
  await hesapListesiCiz();
  hesapFormu(null);
}
async function hesapListesiCiz() {
  try { hesapListesi = await Bulut.hesaplar(girisKisi); } catch (e) { $("#hesap-liste").textContent = e.message; return; }
  hesapListesi.sort((a, b) => ["yonetici", "veli", "ogrenci"].indexOf(a.rol) - ["yonetici", "veli", "ogrenci"].indexOf(b.rol) || a.ad.localeCompare(b.ad, "tr"));
  const adi = id => (hesapListesi.find(k => k.id === id) || {}).ad || "?";
  $("#hesap-liste").innerHTML = hesapListesi.map(k => `
    <button type="button" class="hesap-satir${k.aktif ? "" : " kapali"}${hesapSecili && hesapSecili.id === k.id ? " secili" : ""}" data-kisi="${k.id}">
      <span class="hs-ad">${guvenliMetin(k.ad)}</span>
      <span class="hs-rol">${ROL_ADI[k.rol] || k.rol}${k.aktif ? "" : " · kapalı"}</span>
      <span class="hs-alt">@${guvenliMetin(k.kullanici_adi)}${k.rol !== "ogrenci" && (k.ogrenciler || []).length ? " · " + k.ogrenciler.map(adi).map(guvenliMetin).join(", ") : ""}</span>
    </button>`).join("");
}
function guvenliMetin(s) { const d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
function hesapFormAlanlari() {
  const rol = $("#hf-rol").value;
  $("#hf-ogrenciler-alan").hidden = rol === "ogrenci";
  const secili = new Set(hesapSecili ? hesapSecili.ogrenciler || [] : []);
  $("#hf-ogrenciler").innerHTML = hesapListesi.filter(k => k.rol === "ogrenci").map(k =>
    `<label><input type="checkbox" value="${k.id}"${secili.has(k.id) ? " checked" : ""}> ${guvenliMetin(k.ad)}</label>`).join("") || "<small>Henüz öğrenci yok</small>";
}
function hesapFormu(k) {
  hesapSecili = k;
  $("#hf-hata").textContent = "";
  $("#hesap-form-baslik").textContent = k ? k.ad : "Yeni hesap";
  $("#hf-ad").value = k ? k.ad : "";
  $("#hf-kullanici").value = k ? k.kullanici_adi : "";
  $("#hf-kullanici").disabled = !!k;
  $("#hf-rol").value = k ? k.rol : "ogrenci";
  $("#hf-rol").disabled = !!k && k.id === girisKisi.id;
  $("#hf-sifre").value = "";
  $("#hf-sifre").placeholder = k ? "Boş bırakırsan değişmez" : "En az 6 karakter";
  $("#hf-sifre").required = !k;
  $("#hf-aktif-alan").hidden = !k || k.id === girisKisi.id;
  $("#hf-aktif").checked = k ? !!k.aktif : true;
  $("#hf-yeni").hidden = !k;
  $("#hf-kaydet").textContent = k ? "Kaydet" : "Hesabı aç";
  hesapFormAlanlari();
  icerikAlaniCiz(k);
  $$("#hesap-liste .hesap-satir").forEach(s => s.classList.toggle("secili", !!k && s.dataset.kisi === k.id));
}
/* İçerik paketleri (yazılı hazırlık vb.) yalnız atandığı öğrencide görünür */
let paketKatalogu = null;
async function icerikAlaniCiz(k) {
  const alan = $("#hf-icerik-alan");
  alan.hidden = !k || k.rol !== "ogrenci";
  if (alan.hidden) return;
  try { paketKatalogu = paketKatalogu || (await (await fetch("hazirlik/paketler.json")).json()).paketler; } catch (_) { paketKatalogu = []; }
  let atanan = [];
  try { atanan = await Bulut.icerikGetir(k.id); } catch (_) { /* yok */ }
  $("#hf-icerik").innerHTML = paketKatalogu.map(p => `<label title="${guvenliMetin(p.aciklama || "")}"><input type="checkbox" value="${guvenliMetin(p.id)}"${atanan.includes(p.id) ? " checked" : ""}> ${guvenliMetin(p.ad)}</label>`).join("") || "<small>Paket yok</small>";
}
async function hesapKaydet(e) {
  e.preventDefault();
  const ad = $("#hf-ad").value.trim(), rol = $("#hf-rol").value, sifre = $("#hf-sifre").value;
  const ogrenciler = rol === "ogrenci" ? [] : $$("#hf-ogrenciler input:checked").map(i => i.value);
  $("#hf-hata").textContent = "";
  $("#hf-kaydet").disabled = true;
  try {
    if (sifre && sifre.length < 6) throw new Error("Şifre en az 6 karakter olmalı");
    if (!hesapSecili) {
      await Bulut.hesapAc(girisKisi, { ad, kullanici: $("#hf-kullanici").value, sifre, rol, ogrenciler });
      bildir(`${ad} hesabı açıldı. Kullanıcı adı: ${Bulut.kullaniciAdi($("#hf-kullanici").value)}`);
    } else {
      await Bulut.hesapGuncelle(hesapSecili.id, { ad, rol, ogrenciler, aktif: hesapSecili.id === girisKisi.id ? true : $("#hf-aktif").checked });
      if (sifre) await Bulut.sifreYenile(hesapSecili, sifre);
      if (hesapSecili.rol === "ogrenci" && !$("#hf-icerik-alan").hidden) await Bulut.icerikAta(hesapSecili.id, $$("#hf-icerik input:checked").map(i => i.value));
      bildir(`${ad} kaydedildi${sifre ? "; yeni şifre geçerli" : ""}`);
    }
    if (hesapSecili && hesapSecili.id === girisKisi.id || !hesapSecili) girisKisi = await Bulut.kimim();
    await hesapListesiCiz();
    hesapFormu(hesapSecili ? hesapListesi.find(k => k.id === hesapSecili.id) : null);
  } catch (h) { $("#hf-hata").textContent = h.message; }
  finally { $("#hf-kaydet").disabled = false; }
}
