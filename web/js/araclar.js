/* ÖğretmeniM — araçlar (bağlantı düğmeleri, cevap kontrol). Hesap makinesi 24.09.2026 veli isteğiyle kaldırıldı. */
"use strict";

function aktifBaglantilar() {
  return durum.veri.koleksiyonlar.baglantilar.filter(b => !b.silindi).sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
}

/* ---------- Ana ekran: Araçlarım ---------- */
function araclariCiz() {
  const kap = $("#araclar");
  if (!kap || !durum.veri) return;
  const a = durum.veri.ayarlar;
  let html = "";
  if (a.cevap_kontrol) html += `<button class="arac" data-arac="kontrol"><span class="arac-ikon">✅</span>Cevap Kontrol</button>`;
  html += aktifBaglantilar().map(b => `<button class="arac" data-baglanti="${b.id}" title="${esc(b.adres)}">
      <span class="arac-ikon">${esc(b.simge || "🔗")}</span>${esc(b.ad)}</button>`).join("");
  if (veliAktif()) html += `<button class="arac arac-ekle" data-arac="ekle"><span class="arac-ikon">＋</span>Bağlantı ekle</button>`;
  kap.innerHTML = html;
}

async function aracTiklandi(e) {
  const d = e.target.closest(".arac");
  if (!d) return;
  if (d.dataset.baglanti) {
    try { await api("POST", `baglanti/${d.dataset.baglanti}/ac`); bildir("Tarayıcıda açılıyor…"); }
    catch (hata) { bildir(hata.message, true); }
    return;
  }
  if (d.dataset.arac === "kontrol") cevapKontrolAc();
  if (d.dataset.arac === "ekle") {
    await sayfaAc("ayarlar");
    if ($("#sayfa-ayarlar").classList.contains("aktif")) $("#arac-ayarlari").scrollIntoView({ behavior: "smooth" });
  }
}

/* ---------- Cevap kontrol: hesap makinesi gibi, yalnız fareyle kullanılabilir ---------- */
const ck = { dogru: 0, deneme: 0, alan: "islem", deger: { islem: "", cevap: "", kalan: "" }, bitti: false };
const CK_TUSLARI = [
  ["7", "7"], ["8", "8"], ["9", "9"], ["÷", "÷"], ["⌫", "sil"],
  ["4", "4"], ["5", "5"], ["6", "6"], ["×", "×"], ["(", "("],
  ["1", "1"], ["2", "2"], ["3", "3"], ["−", "−"], [")", ")"],
  ["0", "0"], [",", ","], ["kesir", "/"], ["+", "+"], ["%", "%"],
];
const CK_ISLEM_TUSLARI = new Set(["÷", "×", "+", "(", ")", "%"]);

// İşlem türü: istatistik ve "en çok zorlandığı yer" önerileri için
function islemTuru(islem) {
  const s = String(islem);
  if (kalanliBolmeMi(s)) return "kalanlı bölme";
  if (/%/.test(s)) return "yüzde";
  if (/[()]/.test(s)) return "işlem önceliği";
  if (/\d\s*\/\s*\d/.test(s)) return "kesirler";
  if (/,/.test(s)) return "ondalık sayılar";
  const ops = new Set((s.replace(/^\s*[−-]/, "").match(/[+−\-×x*÷:]/g) || []).map(o => ({ "-": "−", x: "×", "*": "×", ":": "÷" }[o] || o)));
  if (ops.size > 1) return "işlem önceliği";
  return { "+": "toplama", "−": "çıkarma", "×": "çarpma", "÷": "bölme" }[[...ops][0]] || "diğer";
}

function cevapKontrolAc() {
  const tuslar = $("#ck-tuslar");
  if (!tuslar.children.length) {
    tuslar.innerHTML = CK_TUSLARI.map(([yazi, deger]) =>
      `<button type="button" data-ck="${deger}" class="${/[0-9,]/.test(deger) ? "rakam" : deger === "sil" ? "sil-tus" : "islem"}">${yazi}</button>`).join("") +
      `<button type="button" data-ck="temizle" class="genis2 temizle">Temizle</button>
       <button type="button" data-ck="ileri" class="genis2 ileri" id="ck-ileri">Cevaba geç →</button>
       <button type="button" data-ck="kontrol" class="genis1 esittir">✓</button>`;
  }
  ck.deger = { islem: "", cevap: "", kalan: "" };
  ck.alan = "islem"; ck.bitti = false;
  ckCiz();
  $("#ck-pencere").showModal();
}

function ckKalanli() { try { return Boolean(kalanliBolmeMi(ck.deger.islem)); } catch (_) { return false; } }

function ckCiz() {
  const kalanli = ckKalanli();
  if (!kalanli && ck.alan === "kalan") ck.alan = "cevap";
  $("#ck-kalan-alan").hidden = !kalanli;
  $("#ck-cevap-etiket").textContent = kalanli ? "Bölüm" : "Cevabın";
  for (const alan of ["islem", "cevap", "kalan"]) {
    $(`#ck-${alan}`).textContent = ck.deger[alan] || (alan === "islem" ? "İşlemi tuşlarla yaz" : "");
    $(`#ck-${alan}`).classList.toggle("bos-yazi", !ck.deger[alan]);
    $(`.ck-satir[data-alan="${alan}"]`).classList.toggle("aktif", ck.alan === alan);
  }
  // İşlem tuşları yalnız işlem satırında anlamlı
  $$("#ck-tuslar [data-ck]").forEach(t => { if (CK_ISLEM_TUSLARI.has(t.dataset.ck)) t.disabled = ck.alan !== "islem"; });
  const ileri = $("#ck-ileri");
  ileri.textContent = ck.bitti ? "Yeni işlem ↻" : ck.alan === "islem" ? "Cevaba geç →" : ck.alan === "cevap" && kalanli ? "Kalana geç →" : "↑ İşleme dön";
  ckSayacCiz();
}

function ckTus(tus) {
  if (tus === "temizle") { ck.deger = { islem: "", cevap: "", kalan: "" }; ck.alan = "islem"; ck.bitti = false; ckSonucTemizle(); return ckCiz(); }
  if (tus === "ileri") {
    if (ck.bitti) return ckTus("temizle");
    const kalanli = ckKalanli();
    ck.alan = ck.alan === "islem" ? "cevap" : ck.alan === "cevap" && kalanli ? "kalan" : "islem";
    return ckCiz();
  }
  if (tus === "kontrol") return ckKontrolEt();
  if (ck.bitti) { ck.bitti = false; ckSonucTemizle(); }
  const alan = ck.alan;
  if (tus === "sil") { ck.deger[alan] = ck.deger[alan].trimEnd().slice(0, -1).trimEnd(); ckSonucTemizle(); return ckCiz(); }
  if (alan === "kalan" && !/[0-9]/.test(tus)) return;
  if (alan === "cevap" && !/[0-9,\/−]/.test(tus)) return;
  const ekle = /[÷×+−]/.test(tus) && alan === "islem" ? ` ${tus} ` : tus;
  if (ck.deger[alan].length < (alan === "islem" ? 60 : 20)) ck.deger[alan] = (ck.deger[alan] + ekle).replace(/\s+/g, " ").trimStart();
  ckSonucTemizle();
  ckCiz();
}

function ckSonucTemizle() { $("#ck-sonuc").className = "ck-sonuc"; $("#ck-sonuc").textContent = ""; }
function ckSayacCiz() { $("#ck-sayac").textContent = ck.deneme ? `Bu oturumda ${ck.deneme} denemede ${ck.dogru} doğru` : ""; }

function ckKontrolEt() {
  const sonucKutu = $("#ck-sonuc");
  const { islem, cevap, kalan } = ck.deger;
  if (!islem.trim()) { ck.alan = "islem"; ckCiz(); sonucKutu.className = "ck-sonuc uyari"; sonucKutu.innerHTML = "<b>Önce işlemi yaz</b>"; return; }
  if (!cevap.trim()) { ck.alan = "cevap"; ckCiz(); sonucKutu.className = "ck-sonuc uyari"; sonucKutu.innerHTML = "<b>Şimdi senin bulduğun cevabı yaz</b>"; return; }
  try {
    const r = cevapKontrol(islem.replace(/−/g, "-"), cevap.replace(/−/g, "-"), kalan);
    ck.deneme++;
    if (r.dogru) ck.dogru++;
    ck.bitti = r.dogru;
    sonucKutu.className = "ck-sonuc " + (r.dogru ? "dogru" : "yanlis");
    sonucKutu.innerHTML = r.dogru
      ? `<b>Tebrikler! 🎉</b>${r.not ? `<small>${esc(r.not)}</small>` : ""}`
      : `<b>Tekrar denemelisin 💪</b><small>Adım adım bir kez daha dene, yapabilirsin!</small>`;
    ckCiz();
    // Veli istatistiği (Arın görmez)
    api("POST", "alistirma", { arac: "cevap_kontrol", tur: islemTuru(islem), soru: islem, cevap: cevap + (kalan ? " k" + kalan : ""), dogru: r.dogru }).catch(() => {});
  } catch (hata) {
    sonucKutu.className = "ck-sonuc uyari";
    sonucKutu.innerHTML = `<b>${esc(hata.message)}</b>`;
  }
}

/* ---------- Ayarlar: araçlar ve bağlantılar (veli) ---------- */
function aracAyarlariCiz() {
  const a = durum.veri.ayarlar;
  $("#ayar-kontrol").checked = a.cevap_kontrol;
  const kap = $("#baglanti-listesi");
  const liste = aktifBaglantilar();
  kap.innerHTML = liste.length ? liste.map(b => `
    <div class="baglanti-satir" data-id="${b.id}">
      <input class="b-simge" value="${esc(b.simge || "🔗")}" maxlength="4" title="Simge (emoji)">
      <input class="b-ad" value="${esc(b.ad)}" maxlength="30" placeholder="Düğme adı">
      <input class="b-adres" value="${esc(b.adres)}" maxlength="300" placeholder="https://…">
      <button class="sil-dugme" type="button" title="Bağlantıyı sil">✕</button>
    </div>`).join("") : `<div class="gun-bos">Henüz bağlantı yok.</div>`;

  $$(".baglanti-satir", kap).forEach(satir => {
    const id = satir.dataset.id;
    const kaydet = async alanlar => {
      try {
        const yeni = await api("PUT", "k/baglantilar/" + id, alanlar);
        Object.assign(durum.veri.koleksiyonlar.baglantilar.find(b => b.id === id), yeni);
        araclariCiz();
      } catch (hata) { bildir(hata.message, true); }
    };
    $(".b-simge", satir).addEventListener("change", e => kaydet({ simge: e.target.value.trim() || "🔗" }));
    $(".b-ad", satir).addEventListener("change", e => {
      if (!e.target.value.trim()) return bildir("Düğme adı boş olamaz", true);
      kaydet({ ad: e.target.value.trim() });
    });
    $(".b-adres", satir).addEventListener("change", e => {
      const adres = adresDuzelt(e.target.value);
      if (!adres) return bildir("Geçerli bir internet adresi yaz (örn. sozluk.gov.tr)", true);
      e.target.value = adres;
      kaydet({ adres });
    });
    $(".sil-dugme", satir).addEventListener("click", async () => {
      const b = durum.veri.koleksiyonlar.baglantilar.find(x => x.id === id);
      if (!confirm(`"${b.ad}" bağlantısı silinsin mi?`)) return;
      try { await api("DELETE", "k/baglantilar/" + id); b.silindi = true; aracAyarlariCiz(); araclariCiz(); }
      catch (hata) { bildir(hata.message, true); }
    });
  });
}

function adresDuzelt(metin) {
  let a = String(metin).trim();
  if (!a) return "";
  if (!/^https?:\/\//i.test(a)) a = "https://" + a;
  try { const u = new URL(a); return u.hostname.includes(".") ? u.href : ""; } catch (_) { return ""; }
}

async function baglantiEkle() {
  const liste = aktifBaglantilar();
  const sira = liste.reduce((m, b) => Math.max(m, b.sira ?? 0), -1) + 1;
  try {
    const kayit = await api("POST", "k/baglantilar", { ad: "Yeni bağlantı", adres: "https://", simge: "🔗", sira });
    durum.veri.koleksiyonlar.baglantilar.push(kayit);
    aracAyarlariCiz();
    araclariCiz();
    const giris = $(`.baglanti-satir[data-id="${kayit.id}"] .b-ad`);
    giris.focus(); giris.select();
  } catch (hata) { bildir(hata.message, true); }
}

async function aracAyariDegisti(alan, deger) {
  try {
    durum.veri.ayarlar = await api("PUT", "ayarlar", { [alan]: deger });
    araclariCiz();
  } catch (hata) { bildir(hata.message, true); aracAyarlariCiz(); }
}

function aracOlaylariniKur() {
  $("#araclar").addEventListener("click", aracTiklandi);
  // Cevap kontrol (fare; klavye de çalışır)
  $("#ck-tuslar").addEventListener("click", e => { const t = e.target.closest("[data-ck]"); if (t && !t.disabled) ckTus(t.dataset.ck); });
  $("#ck-ekran").addEventListener("click", e => { const s = e.target.closest(".ck-satir"); if (s && !s.hidden) { ck.alan = s.dataset.alan; ckCiz(); } });
  $("#ck-kapat").addEventListener("click", () => $("#ck-pencere").close());
  $("#ck-pencere").addEventListener("keydown", e => {
    const harita = { Enter: "kontrol", Backspace: "sil", Delete: "temizle", Tab: "ileri", "*": "×", x: "×", ":": "÷", "-": "−", ".": ",", "/": "/" };
    const tus = /^[0-9+(),%]$/.test(e.key) ? e.key : harita[e.key];
    if (tus) { e.preventDefault(); ckTus(tus); }
  });
  // Ayarlar
  $("#ayar-kontrol").addEventListener("change", e => aracAyariDegisti("cevap_kontrol", e.target.checked));
  $("#baglanti-ekle").addEventListener("click", baglantiEkle);
}
