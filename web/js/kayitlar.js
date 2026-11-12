/* ÖğretmeniM — Faz 2: ödev, sınav, etüt/ek ders ve etkinlik kayıtları + zaman çizelgesi */
"use strict";

const KAYIT_TURLERI = {
  odev:     { ad: "Ödev",    koleksiyon: "odevler" },
  sinav:    { ad: "Sınav",   koleksiyon: "etkinlikler" },
  etut:     { ad: "Etüt / Ek ders", kisa: "Etüt", koleksiyon: "etkinlikler" },
  etkinlik: { ad: "Etkinlik", koleksiyon: "etkinlikler" },
};
const SINAV_TURLERI = { yazili: "Yazılı", performans: "Performans", proje: "Proje", quiz: "Quiz" };

/* ---------- Tarih yardımcıları ---------- */
function tarihStr(t) {
  return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
}
function strTarih(s) { const [y, a, g] = s.split("-").map(Number); return new Date(y, a - 1, g); }
function tarihYaz(s) { const t = strTarih(s); return `${t.getDate()} ${AYLAR[t.getMonth()]} ${GUNLER[t.getDay()]}`; }

/* ---------- Kayıt listeleri ---------- */
function aktifOdevler() { return durum.veri.koleksiyonlar.odevler.filter(k => !k.silindi); }
function aktifEtkinlikler() { return durum.veri.koleksiyonlar.etkinlikler.filter(k => !k.silindi); }
function kayitTuru(k) { return k.tur || "odev"; }
function kayitBul(koleksiyon, id) { return durum.veri.koleksiyonlar[koleksiyon].find(k => k.id === id); }

function kayitBasligi(k) {
  const ders = dersBul(k.ders_id);
  if (kayitTuru(k) === "sinav") {
    const tur = SINAV_TURLERI[k.sinav_turu] || "Sınav";
    return (ders ? ders.ad + " " : "") + (tur === "Yazılı" ? "Sınavı" : tur);
  }
  return k.baslik || (ders ? ders.ad : KAYIT_TURLERI[kayitTuru(k)].ad);
}

/* ---------- Zaman çizelgesi ----------
   24.09.2026: kartta ilk göze çarpan DERS ADI (büyük, ders renginde). Ödev metni ve tür bilgisi altta, sakin.
   Tür (Ödev/Sınav/Etüt/Etkinlik) küçük etiketle kartın içinde; kimin girdiği kartta değil, kayıt açılınca görünür. */
// 0.19.1: ödevde açıklama (öğretmenin notu, ek bilgi) varsa küçük "💬 Not" işareti
const notVar = k => Boolean(k && String(k.aciklama || "").trim());
function notIsareti(k) {
  const ilk = String(k.aciklama).trim().split("\n")[0];
  return `<span class="kayit-not" title="${esc(ilk.length > 90 ? ilk.slice(0, 90) + "…" : ilk)}">💬 Not</span>`;
}
function kayitKarti(k, secenek = {}) {
  const tur = kayitTuru(k);
  const ders = dersBul(k.ders_id);
  const bitti = tur === "odev" && k.bitti;
  let ustBaslik, metin;
  if (tur === "sinav") {
    ustBaslik = ders ? dersEtiketi(ders) : "Sınav";
    metin = "";                                   // 0.28: sınav açıklaması kartta değil, tıklayınca açılan pencerede
  } else {
    ustBaslik = ders ? dersEtiketi(ders) : (k.baslik || KAYIT_TURLERI[tur].ad);
    metin = ders ? (k.baslik || (tur === "odev" ? "Ödev" : "")) : "";
  }
  const etiket = [];
  if (tur === "sinav") etiket.push(`<span class="kayit-tur t-sinav">${esc(SINAV_TURLERI[k.sinav_turu] === "Yazılı" || !k.sinav_turu ? "Sınav" : SINAV_TURLERI[k.sinav_turu])}</span>`);
  else etiket.push(`<span class="kayit-tur t-${tur}">${esc(KAYIT_TURLERI[tur].kisa || KAYIT_TURLERI[tur].ad)}</span>`);
  if (k.bas) etiket.push(`<span class="kayit-saat">${esc(k.bas)}${k.bit ? "–" + esc(k.bit) : ""}</span>`);
  if (tur === "sinav" && typeof k.puan === "number") etiket.push(`<span class="kayit-puan ${notSinifi(k.puan)}">${k.puan}</span>`);
  if (tur === "odev" && k.sure && veliAktif()) etiket.push(`<span class="kayit-saat">~${k.sure} dk</span>`);   // 0.18: Arın süre görmez
  if (tur === "odev" && !k.bitti && (k.kaynaklar || []).length >= 2 && typeof plan !== "undefined" && plan.veri && plan.veri.ilerleme) {
    const bl = birimler(k.kaynaklar), il = plan.veri.ilerleme[k.id] || 0;
    const biten = k.kaynaklar.filter((_, i) => { const b = bl.filter(x => x.k === i).map(x => bl.indexOf(x)); return b.length && b.every(j => j < il); }).length;
    etiket.push(`<span class="kayit-kaynak${biten ? " yarim" : ""}" title="Biten kaynak / toplam kaynak">📚 ${biten}/${k.kaynaklar.length}</span>`);
  }
  if (tur !== "sinav" && notVar(k)) etiket.push(notIsareti(k));         // 0.19.1: açıklama girilmişse görünsün
  return `<div class="kayit t-${tur}${bitti ? " bitti" : ""}" data-koleksiyon="${KAYIT_TURLERI[tur].koleksiyon}" data-id="${esc(k.id)}"
      style="--renk:${esc(ders ? ders.renk : "var(--cizgi)")}">
    <div class="kayit-govde">
      <div class="kayit-ders-ad">${esc(ustBaslik)}</div>
      ${secenek.tarih ? `<div class="kayit-tarih">${esc(secenek.tarih)}</div>` : ""}
      ${metin || etiket.length ? `<div class="kayit-alt-satir">${etiket.join("")}${metin ? `<span class="kayit-baslik">${esc(metin)}</span>` : ""}</div>` : ""}
    </div>
    ${tur === "odev" ? `<button class="bitti-kutu" title="${bitti ? "Yapılmadı olarak işaretle" : "Yaptım"}">${bitti ? "✓" : ""}</button>` : ""}
  </div>`;
}

// Günün içindeki tamamlanan ödevler kapalı bir "Tamamlandı" satırında durur; açık olanlar yeniden çizimde açık kalır
const acikTamamlananlar = new Set();
function gunKartlari(tarih, kayitlar, bosYazi) {
  const bekleyen = kayitlar.filter(k => !(kayitTuru(k) === "odev" && k.bitti));
  const biten = kayitlar.filter(k => kayitTuru(k) === "odev" && k.bitti);
  let h = bekleyen.map(k => kayitKarti(k)).join("");
  if (!bekleyen.length && !biten.length) h = bosYazi;
  if (!bekleyen.length && biten.length) h = `<div class="gun-bos">Hepsi tamam 👏</div>`;
  // "Tamamlandı" satırı her zaman günün EN ALTINDA durur; açılınca biten ödevler bu satırın üstünde görünür
  if (biten.length) {
    const acik = acikTamamlananlar.has(tarih);
    h += `<div class="tamamlanan${acik ? " acik" : ""}" data-gun="${tarih}">
      <div class="tamamlanan-liste"${acik ? "" : " hidden"}>${biten.map(k => kayitKarti(k)).join("")}</div>
      <button type="button" class="tamamlanan-dugme" aria-expanded="${acik}"><span class="tamamlanan-isaret">✓</span>
        Tamamlandı <b>${biten.length}</b><span class="tamamlanan-ok">${acik ? "▾" : "▸"}</span></button></div>`;
  }
  return h;
}

function siralaGunIci(a, b) {
  const sa = a.bas || (kayitTuru(a) === "odev" ? "99" : "98"), sb = b.bas || (kayitTuru(b) === "odev" ? "99" : "98");
  return sa.localeCompare(sb);
}

function cizelgeyiCiz() {
  const liste = $("#cizelge-liste");
  if (!durum.veri) return;
  const bugun = tarihStr(new Date());
  const odevler = aktifOdevler(), etkinlikler = aktifEtkinlikler();

  const gunlere = {};
  const ekle = (tarih, k) => (gunlere[tarih] = gunlere[tarih] || []).push(k);
  odevler.filter(o => o.teslim >= bugun).forEach(o => ekle(o.teslim, o));
  etkinlikler.filter(e => e.tarih >= bugun).forEach(e => ekle(e.tarih, e));

  const geciken = odevler.filter(o => !o.bitti && o.teslim < bugun).sort((a, b) => a.teslim.localeCompare(b.teslim));
  const sonucBekleyen = etkinlikler
    .filter(e => e.tur === "sinav" && e.tarih < bugun && typeof e.puan !== "number")
    .sort((a, b) => b.tarih.localeCompare(a.tarih));

  let html = "";
  if (geciken.length) {
    html += `<div class="gun-grup geciken"><div class="gun-baslik"><span>Geciken ödevler</span><span>${geciken.length}</span></div>
      ${geciken.map(o => kayitKarti(o, { tarih: "Teslim: " + tarihYaz(o.teslim) })).join("")}</div>`;
  }
  if (sonucBekleyen.length && veliAktif()) {          // not girişi velinin işi; öğrenci not görmez
    html += `<div class="gun-grup sonuc-bekleyen"><div class="gun-baslik"><span>Sonucu girilecek sınavlar</span><span>${sonucBekleyen.length}</span></div>
      ${sonucBekleyen.map(k => kayitKarti(k)).join("")}</div>`;
  }

  // 0.23.1: iki haftadan sonrası ve geçmiş kayıtlar düğmeyle açılır (hepsi görülüp düzenlenebilsin)
  const bugunT = gunBasi(new Date()), sinir = tarihStr(gunEkle(bugunT, 14));
  const gunGrubu = (t, kayitlar, etiket, bugunMu) => { const g = strTarih(t);
    return `<div class="gun-grup${bugunMu ? " bugun" : ""}"><div class="gun-baslik"><span>${etiket}</span><span>${g.getDate()} ${AYLAR[g.getMonth()]}</span></div>
      ${gunKartlari(t, kayitlar.sort(siralaGunIci), `<div class="gun-bos">Kayıt yok</div>`)}</div>`; };
  for (let i = 0; i <= 14; i++) {
    const t = tarihStr(gunEkle(bugunT, i)), kayitlar = gunlere[t] || [];
    if (i > 1 && !kayitlar.length) continue;
    html += gunGrubu(t, kayitlar, i === 0 ? "Bugün" : i === 1 ? "Yarın" : GUNLER[strTarih(t).getDay()], i === 0);
  }
  const ileri = Object.keys(gunlere).filter(t => t > sinir).sort();
  const ileriSay = ileri.reduce((n, t) => n + gunlere[t].length, 0);
  if (ileriSay) {
    html += `<button type="button" class="cizelge-ac" data-cizelge-ac="ileri">${cizelgeAcik.ileri ? "▾" : "▸"} İki haftadan sonrası <b>${ileriSay}</b> kayıt</button>`;
    if (cizelgeAcik.ileri) html += ileri.map(t => gunGrubu(t, gunlere[t], GUNLER[strTarih(t).getDay()])).join("");
  }
  const gecmis = {};
  const bekleyenIdler = new Set([...geciken, ...sonucBekleyen].map(k => k.id));
  odevler.filter(o => o.teslim < bugun && !bekleyenIdler.has(o.id)).forEach(o => (gecmis[o.teslim] = gecmis[o.teslim] || []).push(o));
  etkinlikler.filter(e => e.tarih < bugun && !bekleyenIdler.has(e.id)).forEach(e => (gecmis[e.tarih] = gecmis[e.tarih] || []).push(e));
  const gecmisGun = Object.keys(gecmis).sort().reverse();
  if (gecmisGun.length) {
    html += `<button type="button" class="cizelge-ac" data-cizelge-ac="gecmis">${cizelgeAcik.gecmis ? "▾" : "▸"} Geçmiş kayıtlar <b>${gecmisGun.reduce((n, t) => n + gecmis[t].length, 0)}</b></button>`;
    if (cizelgeAcik.gecmis) html += gecmisGun.map(t => gunGrubu(t, gecmis[t], GUNLER[strTarih(t).getDay()])).join("");
  }
  liste.innerHTML = html;
}

const cizelgeAcik = { ileri: false, gecmis: false };
function cizelgeOlaylari() {
  $("#cizelge-liste").addEventListener("click", async e => {
    const ac = e.target.closest("[data-cizelge-ac]");
    if (ac) { cizelgeAcik[ac.dataset.cizelgeAc] = !cizelgeAcik[ac.dataset.cizelgeAc]; cizelgeyiCiz(); return; }
    const td = e.target.closest(".tamamlanan-dugme");
    if (td) {
      const kap = td.closest(".tamamlanan"), gun = kap.dataset.gun;
      acikTamamlananlar.has(gun) ? acikTamamlananlar.delete(gun) : acikTamamlananlar.add(gun);
      cizelgeyiCiz();
      return;
    }
    const kart = e.target.closest(".kayit");
    if (!kart) return;
    const k = kayitBul(kart.dataset.koleksiyon, kart.dataset.id);
    if (!k) return;
    if (e.target.closest(".bitti-kutu")) {
      // 0.20: birden çok sayfalı/sorulu ödevde "hepsini mi, ne kadarını?" sorulur; plan buna göre yenilenir
      if (!k.bitti && typeof kaynakKontrolSor === "function" && plan && plan.veri && (k.kaynaklar || []).length >= 2) {
        kaynakKontrolSor(k.id, { varsayilanYer: "ev" });          // 0.27: her kaynak ayrı ayrı sorulur
        return;
      }
      if (!k.bitti && typeof zatenYaptimSor === "function" && plan && plan.veri && birimler(k.kaynaklar || []).length > 1) {
        zatenYaptimSor(k.id, "ev");
        return;
      }
      try {
        const yeni = await api("PUT", "k/odevler/" + k.id, { bitti: !k.bitti, bitti_zaman: !k.bitti ? new Date().toISOString() : "" });
        Object.assign(k, yeni);
        if (k.bitti) motivasyonKutla();
        herSeyiYenile();
        if (typeof planYukle === "function") planYukle();      // 0.17: ödev bitince plan yenilenir
      } catch (hata) { bildir(hata.message, true); }
      return;
    }
    pencereAc(kayitTuru(k), k);
  });
  $("#kayit-ekle").addEventListener("click", () => pencereAc("odev"));
}

/* ---------- Ekle / düzenle penceresi ---------- */
let acikKayit = null, acikTur = "odev", acikEkler = [];

function dersSecenekleri(secili, bosEtiket) {
  return `<option value="">${bosEtiket}</option>` +
    aktifDersler().map(d => `<option value="${d.id}"${d.id === secili ? " selected" : ""}>${esc(d.ad)}</option>`).join("");
}

function pencereAc(tur, kayit = null) {
  acikKayit = kayit;
  acikTur = tur;
  acikEkler = [...((kayit && kayit.ekler) || [])];
  const pencere = $("#kayit-pencere");
  $("#pencere-baslik").textContent = kayit ? "Kaydı düzenle" : "Yeni kayıt";
  $$("#tur-sekmeleri button").forEach(b => {
    b.classList.toggle("aktif", b.dataset.tur === tur);
    b.disabled = Boolean(kayit) && b.dataset.tur !== tur;   // var olan kaydın türü değişmez
  });
  // 0.13: velinin girdiği kaydı Arın yalnız görür (değiştirme/silme veli modunda)
  const saltOkunur = Boolean(kayit) && kayit.kaynak === "veli" && !veliAktif();
  $("#kayit-sil").hidden = !kayit || saltOkunur;
  $("#kayit-form").classList.toggle("salt-okunur", saltOkunur);
  $("#kayit-kaydet").hidden = saltOkunur;
  $("#kayit-vazgec").textContent = saltOkunur ? "Kapat" : "Vazgeç";
  formuCiz();
  if (kayit) {
    const kim = kayit.kaynak === "veli" ? "Velin" : (durum.veri.profil.ogrenci_adi || "Arın");
    $("#kayit-alanlar").insertAdjacentHTML("afterbegin", `<p class="genis kayit-giren">Giren: <b>${esc(kim)}</b>${kayit.olusturma ? " · " + new Date(kayit.olusturma).toLocaleDateString("tr-TR", { day: "numeric", month: "long" }) : ""}</p>`);
  }
  if (saltOkunur) {
    $$("#kayit-alanlar input, #kayit-alanlar select, #kayit-alanlar textarea, #kayit-alanlar .ek-ekle, #kayit-alanlar .ek-kaldir").forEach(e => { e.disabled = true; if (e.classList.contains("ek-ekle") || e.classList.contains("ek-kaldir")) e.hidden = true; });
    $(".kayit-giren").insertAdjacentHTML("afterend", `<p class="genis kayit-salt-okunur">Bir şey değişmesi gerekiyorsa veline söyle.</p>`);
  }
  if (!pencere.open) pencere.showModal();
}

function formuCiz() {
  const k = acikKayit || {};
  const bugun = tarihStr(new Date());
  const yarin = tarihStr(gunEkle(new Date(), 1));
  const alan = (etiket, ic, genis = false) => `<label class="${genis ? "genis" : ""}">${etiket}${ic}</label>`;
  let html = "";

  if (acikTur === "odev") {
    html += alan("Ders", `<select name="ders_id" required>${dersSecenekleri(k.ders_id, "Ders seç")}</select>`);
    html += alan("Teslim tarihi", `<input type="date" name="teslim" required value="${k.teslim || yarin}">`);
    html += odevPlanAlanlariHtml(k);
    html += alan("Kısa başlık <small>(boşsa kaynaktan yazılır)</small>", `<input name="baslik" maxlength="120" placeholder="Örn. Kitap s. 45-47" value="${esc(k.baslik || "")}">`, true);
    html += alan("Açıklama", `<textarea name="aciklama" rows="3" maxlength="1000">${esc(k.aciklama || "")}</textarea>`, true);
  }

  if (acikTur === "sinav") {
    html += alan("Ders", `<select name="ders_id" required>${dersSecenekleri(k.ders_id, "Ders seç")}</select>`);
    html += alan("Sınav türü", `<select name="sinav_turu">${Object.entries(SINAV_TURLERI).map(([a, v]) =>
      `<option value="${a}"${(k.sinav_turu || "yazili") === a ? " selected" : ""}>${v}</option>`).join("")}</select>`);
    html += alan("Tarih", `<input type="date" name="tarih" required value="${k.tarih || bugun}">`);
    html += alan("Hangi ders saatinde?", `<select name="sira"></select>`);
    html += `<div class="saat-ozel genis" hidden>${alan("Başlangıç", `<input name="bas" class="saat-gir" maxlength="5" placeholder="10:35" value="${k.bas || ""}">`)}
             ${alan("Bitiş", `<input name="bit" class="saat-gir" maxlength="5" placeholder="11:15" value="${k.bit || ""}">`)}</div>`;
    html += alan("Konular", `<textarea name="aciklama" rows="2" maxlength="1000" placeholder="Sınava girecek konular">${esc(k.aciklama || "")}</textarea>`, true);
    // 0.13: sınav notunu yalnız veli girer; Arın notu kayıtta ve Sonuçlar'da görür
    if (veliAktif()) html += `<label class="genis puan-alani">Sonuç (100 üzerinden) — açıklanınca gir
               <input type="number" name="puan" min="0" max="100" step="1" placeholder="—" value="${typeof k.puan === "number" ? k.puan : ""}"></label>`;
    else if (typeof k.puan === "number") html += `<p class="genis kayit-salt-okunur">Sınav notu: <b>${k.puan}</b></p>`;
  }

  if (acikTur === "etut" || acikTur === "etkinlik") {
    html += alan(acikTur === "etut" ? "Etüt / ders adı" : "Etkinlik", `<input name="baslik" required maxlength="120"
      placeholder="${acikTur === "etut" ? "Örn. Matematik etüdü" : "Örn. Müze gezisi"}" value="${esc(k.baslik || "")}">`, true);
    html += alan("Ders (isteğe bağlı)", `<select name="ders_id">${dersSecenekleri(k.ders_id, "—")}</select>`);
    html += alan("Tarih", `<input type="date" name="tarih" required value="${k.tarih || bugun}">`);
    html += alan("Başlangıç", `<input name="bas" class="saat-gir" maxlength="5" placeholder="16:30" value="${k.bas || ""}"${acikTur === "etut" ? " required" : ""}>`);
    html += alan("Bitiş", `<input name="bit" class="saat-gir" maxlength="5" placeholder="17:10" value="${k.bit || ""}">`);
    html += alan("Açıklama / yer", `<textarea name="aciklama" rows="2" maxlength="1000">${esc(k.aciklama || "")}</textarea>`, true);
  }

  const form = $("#kayit-form");
  $("#kayit-alanlar").innerHTML = html;
  $$(".saat-gir", form).forEach(kutu => saatKutusuKur(kutu));
  if (acikTur === "sinav") sinavSaatleriniKur(k);
  if (acikTur === "odev") kaynakAlaniKur(form);
}

// Sınav: seçilen günün ders saatlerini listeler, o dersin ilk saatini önerir
function sinavSaatleriniKur(k) {
  const form = $("#kayit-form");
  const ders = form.elements.ders_id, tarih = form.elements.tarih, sira = form.elements.sira;
  const ozel = $(".saat-ozel", form), puan = $(".puan-alani", form);
  const kayitliSira = acikKayit ? (typeof k.sira === "number" ? String(k.sira) : (k.bas ? "ozel" : "")) : null;

  const doldur = (ilk) => {
    const gun = tarih.value ? strTarih(tarih.value).getDay() : -1;
    const { saatler, hucreler } = durum.veri.ders_programi;
    let html = `<option value="">Saat belirtme</option>`;
    let oneri = "";
    saatler.forEach((s, i) => {
      const d = dersBul(hucreler[`${gun}-${i}`]);
      if (d && d.id === ders.value && !oneri) oneri = String(i);
      html += `<option value="${i}">${i + 1}. ders ${s.bas}–${s.bit}${d ? " (" + esc(dersEtiketi(d)) + ")" : ""}</option>`;
    });
    html += `<option value="ozel">Başka saat…</option>`;
    const onceki = sira.value;
    sira.innerHTML = html;
    sira.value = ilk && kayitliSira !== null ? kayitliSira : (oneri || (onceki && onceki !== "" ? onceki : ""));
    ozel.hidden = sira.value !== "ozel";
    if (puan) puan.hidden = !tarih.value || tarih.value > tarihStr(new Date());
  };
  ders.addEventListener("change", () => doldur(false));
  tarih.addEventListener("change", () => doldur(false));
  sira.addEventListener("change", () => (ozel.hidden = sira.value !== "ozel"));
  doldur(true);
}

/* ---------- Ekler (PDF / fotoğraf) ---------- */
function ekSimgesi(ek) { return (ek.tur || "").includes("pdf") ? "📄" : "🖼️"; }
function ekListesiCiz() {
  const kap = $("#ek-listesi");
  if (!kap) return;
  kap.innerHTML = acikEkler.length ? acikEkler.map((ek, i) => `<span class="ek-cip">
      <button type="button" class="ek-ac" data-ek-ac="${esc(ek.dosya)}">${ekSimgesi(ek)} ${esc(ek.ad)}</button>
      <button type="button" class="ek-kaldir" data-ek-kaldir="${i}" title="Eki çıkar">✕</button></span>`).join("")
    : `<span class="gun-bos">Ek yok</span>`;
}
async function ekleriYukle(e) {
  for (const dosya of [...e.target.files]) {
    if (dosya.size > 25 * 1024 * 1024) { bildir(`${dosya.name}: 25 MB'tan büyük`, true); continue; }
    try {
      const yanit = await fetch("/api/ek", { method: "POST", body: dosya,
        headers: { "Content-Type": dosya.type || "application/octet-stream", "X-Dosya-Adi": encodeURIComponent(dosya.name) } });
      const sonuc = await yanit.json();
      if (!yanit.ok) throw new Error(sonuc.hata || "Yüklenemedi");
      acikEkler.push({ ad: sonuc.ad, dosya: sonuc.dosya, tur: sonuc.tur, ozet: sonuc.ozet });
    } catch (hata) { bildir(`${dosya.name}: ${hata.message}`, true); }
  }
  e.target.value = "";
  ekListesiCiz();
}
function ekAc(dosya) { window.open("/ek/" + encodeURIComponent(dosya), "_blank"); }

async function kayitKaydet(e) {
  e.preventDefault();
  const form = e.target;
  const al = ad => (form.elements[ad] ? form.elements[ad].value.trim() : "");
  const govde = { tur: acikTur };
  let koleksiyon = KAYIT_TURLERI[acikTur].koleksiyon;

  if (acikTur === "odev") {
    delete govde.tur;
    Object.assign(govde, { ders_id: al("ders_id"), teslim: al("teslim"), baslik: al("baslik"), aciklama: al("aciklama") });
    try { Object.assign(govde, odevPlanAlanlariniOku(form)); } catch (hata) { return bildir(hata.message, true); }
    if (!govde.baslik && !govde.kaynaklar.length) return bildir("Bir kaynak ya da kısa başlık yaz", true);
    if (!acikKayit) govde.bitti = false;
  } else {
    Object.assign(govde, { ders_id: al("ders_id"), tarih: al("tarih"), aciklama: al("aciklama"), baslik: al("baslik") });
    let bas = al("bas"), bit = al("bit");
    if (acikTur === "sinav") {
      govde.sinav_turu = al("sinav_turu");
      const sira = al("sira");
      govde.sira = null;
      if (sira !== "" && sira !== "ozel") {
        const s = durum.veri.ders_programi.saatler[Number(sira)];
        govde.sira = Number(sira); bas = s.bas; bit = s.bit;
      } else if (sira === "") { bas = ""; bit = ""; }
      const p = al("puan");
      if (form.elements.puan) govde.puan = p === "" ? null : Math.round(Number(p));
      if (govde.puan != null && (isNaN(govde.puan) || govde.puan < 0 || govde.puan > 100)) return bildir("Not 0 ile 100 arasında olmalı", true);
    }
    if (bas && !saatDuzelt(bas)) return bildir("Başlangıç saatini 16:30 biçiminde yaz", true);
    if (bit && !saatDuzelt(bit)) return bildir("Bitiş saatini 17:10 biçiminde yaz", true);
    govde.bas = bas ? saatDuzelt(bas) : "";
    govde.bit = bit ? saatDuzelt(bit) : "";
    if (govde.bas && govde.bit && govde.bit <= govde.bas) return bildir("Bitiş saati başlangıçtan sonra olmalı", true);
  }

  govde.ekler = acikEkler;
  try {
    if (acikKayit) {
      Object.assign(acikKayit, await api("PUT", `k/${koleksiyon}/${acikKayit.id}`, govde));
    } else {
      durum.veri.koleksiyonlar[koleksiyon].push(await api("POST", `k/${koleksiyon}`, govde));
    }
    $("#kayit-pencere").close();
    bildir("Kaydedildi");
    herSeyiYenile();
    if (typeof planYukle === "function") planYukle();
  } catch (hata) { bildir(hata.message, true); }
}

async function kayitSil() {
  if (!acikKayit || !confirm("Bu kayıt silinsin mi?")) return;
  const koleksiyon = KAYIT_TURLERI[acikTur].koleksiyon;
  try {
    await api("DELETE", `k/${koleksiyon}/${acikKayit.id}`);
    acikKayit.silindi = true;
    $("#kayit-pencere").close();
    herSeyiYenile();
    if (typeof planYukle === "function") planYukle();
  } catch (hata) { bildir(hata.message, true); }
}

function kayitOlaylariniKur() {
  cizelgeOlaylari();
  $("#kayit-form").addEventListener("submit", kayitKaydet);
  $("#kayit-sil").addEventListener("click", kayitSil);
  $("#kayit-vazgec").addEventListener("click", () => $("#kayit-pencere").close());
  $("#kayit-alanlar").addEventListener("click", e => {
    const ac = e.target.closest("[data-ek-ac]"), kaldir = e.target.closest("[data-ek-kaldir]");
    if (ac) ekAc(ac.dataset.ekAc);
    if (kaldir) { acikEkler.splice(Number(kaldir.dataset.ekKaldir), 1); ekListesiCiz(); }
  });
  $$("#tur-sekmeleri button").forEach(b => b.addEventListener("click", () => {
    if (b.disabled) return;
    acikTur = b.dataset.tur;
    $$("#tur-sekmeleri button").forEach(x => x.classList.toggle("aktif", x === b));
    formuCiz();
  }));
}

/* ---------- Program özetine yerleştirme ---------- */
// Seçilen günün saatli sınav/etüt/etkinliklerini döndürür
function gununEtkinlikleri(tarih) {
  const t = tarihStr(tarih);
  return aktifEtkinlikler().filter(e => e.tarih === t).sort(siralaGunIci);
}
