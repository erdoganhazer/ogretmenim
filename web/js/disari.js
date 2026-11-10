/* ÖğretmeniM — Faz 5: ders notu çıktısı ve yedekleme */
"use strict";

/* ---------- Ders notu çıkar (Defterler) ---------- */
function disariPenceresiAc() {
  const secim = $("#disari-ders");
  const dersler = sinifDersleri(defterSinifi()).filter(d => dersUniteleri(d.id).some(u => uniteKonulari(u.id).length));
  if (!dersler.length) return bildir("Önce defterine konu ve not ekle", true);
  secim.innerHTML = dersler.map(d => `<option value="${d.id}">${esc(d.ad)}</option>`).join("");
  if (defter.ders && dersler.some(d => d.id === defter.ders)) secim.value = defter.ders;
  disariAgaciCiz();
  $("#disari-pencere").showModal();
}

function disariAgaciCiz() {
  const dersId = $("#disari-ders").value;
  $("#disari-agac").innerHTML = dersUniteleri(dersId).map(u => {
    const konular = uniteKonulari(u.id);
    if (!konular.length) return "";
    const seciliUnite = defter.unite === u.id;
    return `<div class="disari-unite">
      <label class="anahtar"><input type="checkbox" data-unite-sec="${u.id}"${!defter.unite || seciliUnite ? " checked" : ""}> <b>${esc(u.ad)}</b></label>
      ${konular.map(k => `<label class="anahtar disari-konu"><input type="checkbox" data-konu-sec="${k.id}" data-unite="${u.id}"
        ${!defter.unite || seciliUnite ? " checked" : ""}> ${esc(k.ad)} <small>(${konuNotlari(k.id).length} not)</small></label>`).join("")}
    </div>`;
  }).join("");
  disariSayac();
}

function disariSecilenler() { return $$("#disari-agac [data-konu-sec]:checked").map(k => k.dataset.konuSec); }
function disariSayac() { $("#disari-sayac").textContent = `${disariSecilenler().length} konu seçildi`; }

function disariAgacTiklandi(e) {
  const u = e.target.closest("[data-unite-sec]");
  if (u) $$(`#disari-agac [data-unite="${u.dataset.uniteSec}"]`).forEach(k => (k.checked = u.checked));
  disariSayac();
}

function disariAc(indir) {
  const idler = disariSecilenler();
  if (!idler.length) return bildir("En az bir konu seç", true);
  const adres = "/api/ders-notu?konular=" + encodeURIComponent(idler.join(","));
  if (indir) {
    const a = document.createElement("a");
    a.href = adres + "&indir=1";
    a.download = "";
    document.body.append(a); a.click(); a.remove();
    bildir("Ders notu İndirilenler klasörüne kaydediliyor");
  } else {
    window.open(adres, "_blank");
  }
}

/* ---------- Ayarlar: yedekleme (veli) ---------- */
function boyutYaz(b) { return b > 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }

async function yedekleriCiz() {
  const kap = $("#yedek-listesi");
  try {
    const { yedekler, klasor, paylasim } = await api("GET", "yedek/liste");
    $("#yedek-bilgi").innerHTML = `Yedekler <b>${esc(klasor)}</b> klasörüne kaydedilir. ` +
      (paylasim ? `Paylaşım bağlı: her yedeğin bir kopyası veli bilgisayarındaki <b>OgretmeniM-Paylasim\\yedekler</b> klasörüne de gider. ✅`
                : `<span class="uyari-yazi">Paylaşım şu an bağlı değil — yedek yalnız bu bilgisayarda tutulur.</span>`) +
      ` Haftada bir kendiliğinden yedek alınır; son 10 yedek saklanır.`;
    kap.innerHTML = yedekler.length ? yedekler.slice(0, 10).map(y => {
      const t = new Date(y.zaman);
      return `<div class="yedek-satir"><span>${t.getDate()} ${AYLAR[t.getMonth()]} ${t.getFullYear()} ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}</span>
        <span class="yedek-tur">${y.ad.includes("otomatik") ? "otomatik" : y.ad.includes("geri-yukleme") ? "geri yükleme öncesi" : "elle"}</span>
        <span class="yedek-boyut">${boyutYaz(y.boyut)}</span></div>`;
    }).join("") : `<div class="gun-bos">Henüz yedek yok.</div>`;
  } catch (hata) { kap.innerHTML = `<div class="gun-bos">${esc(hata.message)}</div>`; }
}

async function yedekAl() {
  const d = $("#yedek-al");
  d.disabled = true; d.textContent = "Yedek alınıyor…";
  try {
    const s = await api("POST", "yedek/al");
    bildir(`Yedek alındı (${boyutYaz(s.boyut)})${s.paylasima ? " — veli bilgisayarına da kopyalandı" : ""}`);
    yedekleriCiz();
  } catch (hata) { bildir(hata.message, true); }
  d.disabled = false; d.textContent = "💾 Şimdi yedek al";
}

async function yedektenYukle(e) {
  const dosya = e.target.files[0];
  e.target.value = "";
  if (!dosya) return;
  if (!confirm(`"${dosya.name}" yedeği geri yüklensin mi?\n\nŞu anki bütün veriler bu yedektekilerle değişecek. ` +
               "Değişmeden önce şu anki hâlin ayrıca yedeklenecek. Veli şifresi değişmez.")) return;
  try {
    await api("POST", "yedek/yukle", new Blob([await dosya.arrayBuffer()], { type: "application/zip" }));
    bildir("Yedek geri yüklendi, uygulama yenileniyor…");
    setTimeout(() => location.reload(), 900);
  } catch (hata) { bildir(hata.message, true); }
}

function disariOlaylariniKur() {
  $("#ders-notu-cikar").addEventListener("click", disariPenceresiAc);
  $("#disari-ders").addEventListener("change", disariAgaciCiz);
  $("#disari-agac").addEventListener("change", disariAgacTiklandi);
  $("#disari-onizle").addEventListener("click", () => disariAc(false));
  $("#disari-indir").addEventListener("click", () => disariAc(true));
  $("#disari-kapat").addEventListener("click", () => $("#disari-pencere").close());
  $("#yedek-al").addEventListener("click", yedekAl);
  $("#yedek-dosya").addEventListener("change", yedektenYukle);
}
