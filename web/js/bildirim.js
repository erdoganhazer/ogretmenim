/* ÖğretmeniM web — veli bildirimleri (bu cihaz).
   Her veli bildirim almak istediği cihazda bunu açar; cihaz kaydı ve tercihler kendi kişi kaydının altında durur
   (kisiler/{ben}/cihazlar, kisiler/{ben}/ayar/bildirim). Gönderimi GitHub'daki zamanlanmış iş yapar
   (.github/workflows/bildirim.yml → araclar/bildirim/gonder.mjs). */
"use strict";

const BILDIRIM_UYARILARI = [
  ["plan", "Günün planı bitmediyse ya da hiç çalışılmadıysa", true],
  ["yarin", "Yarın teslim edilecek ödeve başlanmadıysa", true],
  ["geciken", "Teslimi geçen ödev varsa", true],
  ["istek", "Öğrenci bir şey istediyse (mesaj)", true],
  ["not", "Sınavın notu girilmediyse", false],
  ["ozet", "Her akşam kısa gün özeti (her şey yolunda olsa da)", false],
];
const BILDIRIM_VARSAYILAN = { saat: "20:00", uyarilar: Object.fromEntries(BILDIRIM_UYARILARI.map(([k, , v]) => [k, v])) };

function cihazAdiTahmin() {
  const u = navigator.userAgent;
  if (/iPhone/.test(u)) return "iPhone";
  if (/iPad|Macintosh/.test(u) && navigator.maxTouchPoints > 1) return "iPad";
  if (/Android/.test(u)) return /Mobile/.test(u) ? "Android telefon" : "Android tablet";
  if (/Windows/.test(u)) return "Windows bilgisayar";
  if (/Linux/.test(u)) return "Linux bilgisayar";
  if (/Mac/.test(u)) return "Mac";
  return "Bu cihaz";
}
const iosMu = () => /iPhone|iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const yukluMu = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
async function tokenKimligi(token) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(b)].slice(0, 12).map(x => x.toString(16).padStart(2, "0")).join("");
}

async function bildirimCiz() {
  const kap = $("#bildirim-ic");
  if (!kap || !veliAktif() || typeof Bulut === "undefined" || !OTURUM.kisi) return;
  const vapid = typeof FIREBASE_VAPID !== "undefined" ? FIREBASE_VAPID : "";
  if (!vapid) { kap.innerHTML = `<p class="panel-not">Bildirim kurulumu tamamlanmadı (Firebase'de Web Push anahtarı bekleniyor).</p>`; return; }
  let ayar = BILDIRIM_VARSAYILAN, cihazlar = [];
  try { ayar = Object.assign({}, BILDIRIM_VARSAYILAN, await Bulut.bildirimAyarOku(OTURUM.kisi) || {}); cihazlar = await Bulut.cihazlar(OTURUM.kisi); } catch (_) { /* çevrimdışı */ }
  ayar.uyarilar = Object.assign({}, BILDIRIM_VARSAYILAN.uyarilar, ayar.uyarilar || {});
  const izin = "Notification" in window ? Notification.permission : "yok";
  const buCihaz = localStorage.getItem("ogretmenim-cihaz") || "";
  const bu = cihazlar.find(c => c.id === buCihaz);
  const iosUyari = iosMu() && !yukluMu();
  const saatler = ["16:00", "17:00", "18:00", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"];
  kap.innerHTML = `
    <div class="bl-bu">
      ${iosUyari ? `<p class="panel-not uyari-not">iPhone/iPad'de bildirim için önce uygulamayı yükle: Safari'de Paylaş › <b>Ana Ekrana Ekle</b>, sonra uygulamayı ana ekrandan aç.</p>` : ""}
      ${izin === "denied" ? `<p class="panel-not uyari-not">Bu tarayıcıda bildirimler engellenmiş. Tarayıcının site ayarlarından izin ver.</p>` : ""}
      <div class="bl-satir"><b>Bu cihaz</b> <span>${bu && bu.aktif ? "🔔 Bildirim açık" : "🔕 Kapalı"}</span>
        ${bu && bu.aktif ? `<button class="dugme kucuk" data-bl="kapat">Kapat</button>` : `<button class="dugme ana-dugme kucuk" data-bl="ac" ${iosUyari || izin === "denied" ? "disabled" : ""}>Bu cihaza bildirim gönder</button>`}
        ${bu && bu.aktif ? `<button class="dugme kucuk" data-bl="dene">Deneme</button>` : ""}</div>
    </div>
    ${cihazlar.length ? `<div class="bl-cihazlar"><small>Kayıtlı cihazların:</small>${cihazlar.map(c => `<span class="bl-cihaz ${c.aktif ? "acik" : ""}">${c.aktif ? "🔔" : "🔕"} ${esc(c.ad || "cihaz")}${c.id === buCihaz ? " (bu)" : ""}
      ${c.id !== buCihaz ? `<button class="baglanti" data-bl-cihaz="${esc(c.id)}" data-aktif="${c.aktif ? 1 : 0}">${c.aktif ? "kapat" : "aç"}</button>` : ""}</span>`).join("")}</div>` : ""}
    <form class="bl-ayar" id="bl-ayar">
      <label>Hatırlatma saati <select name="saat">${saatler.map(s => `<option ${s === ayar.saat ? "selected" : ""}>${s}</option>`).join("")}</select></label>
      <fieldset><legend>Hangi durumlarda?</legend>${BILDIRIM_UYARILARI.map(([k, ad]) => `<label class="anahtar"><input type="checkbox" name="${k}" ${ayar.uyarilar[k] ? "checked" : ""}> <span>${ad}</span></label>`).join("")}</fieldset>
      <p class="panel-not">"Haberim var" dediğin uyarı o gün tekrar gelmez; öbür velinin de listesinden düşer. Bildirim seçtiğin saatten sonraki ilk denetimde gelir (en çok yarım saat gecikebilir).</p>
      <button class="dugme ana-dugme">Kaydet</button>
    </form>`;
}

async function bildirimAc() {
  try {
    if ((await Notification.requestPermission()) !== "granted") return bildir("Bildirim izni verilmedi", true);
    const token = await Bulut.bildirimTokeni(FIREBASE_VAPID);
    const cid = await tokenKimligi(token);
    const ad = prompt("Bu cihazın adı:", cihazAdiTahmin()) || cihazAdiTahmin();
    await Bulut.cihazYaz(OTURUM.kisi, cid, { token, ad, aktif: true, platform: navigator.platform || "", eklenme: new Date().toISOString() });
    localStorage.setItem("ogretmenim-cihaz", cid);
    const mevcut = await Bulut.bildirimAyarOku(OTURUM.kisi);
    if (!mevcut) await Bulut.bildirimAyarYaz(OTURUM.kisi, BILDIRIM_VARSAYILAN);
    bildir("Bu cihaza bildirim gelecek 🔔");
  } catch (h) { bildir("Açılamadı: " + h.message, true); }
  bildirimCiz(); ogrenciBildirimCiz();
}

/* Öğrenci: yalnız bu cihaza mesaj bildirimi (tercih ve saat yok; mesaj gelince gider) */
async function ogrenciBildirimCiz() {
  const kap = $("#ogr-bildirim-ic");
  if (!kap || veliAktif() || typeof Bulut === "undefined" || !OTURUM.kisi) return;
  if (typeof FIREBASE_VAPID === "undefined" || !FIREBASE_VAPID) { kap.innerHTML = `<p class="panel-not">Bildirim bu sürümde kurulu değil.</p>`; return; }
  let cihazlar = [];
  try { cihazlar = await Bulut.cihazlar(OTURUM.kisi); } catch (_) { /* çevrimdışı */ }
  const bu = cihazlar.find(c => c.id === localStorage.getItem("ogretmenim-cihaz"));
  const izin = "Notification" in window ? Notification.permission : "yok", iosUyari = iosMu() && !yukluMu();
  kap.innerHTML = `${iosUyari ? `<p class="panel-not uyari-not">iPhone/iPad'de önce uygulamayı ana ekrana ekle, sonra oradan aç.</p>` : ""}
    ${izin === "denied" ? `<p class="panel-not uyari-not">Bu tarayıcıda bildirimler engellenmiş.</p>` : ""}
    <div class="bl-satir"><b>Bu cihaz</b> <span>${bu && bu.aktif ? "🔔 Açık" : "🔕 Kapalı"}</span>
      ${bu && bu.aktif ? `<button class="dugme kucuk" data-obl="kapat">Kapat</button>` : `<button class="dugme ana-dugme kucuk" data-obl="ac" ${iosUyari || izin === "denied" ? "disabled" : ""}>Bildirimleri aç</button>`}</div>`;
}

/* Bildirimdeki "Haberim var" (?haberim=…) ya da açık penceredeki tıklama */
async function bildirimHaberim(anahtarlar, ogrenci) {
  if (!anahtarlar || !veliAktif()) return;
  for (const a of String(anahtarlar).split(",").filter(Boolean)) { try { await Bulut.haberimVar(ogrenci || OTURUM.ogrenci, a); } catch (_) { /* sonra */ } }
  bildir("Tamam, bugün bir daha hatırlatılmayacak");
  if (typeof veliOzetCiz === "function") veliOzetCiz();
}

/* Mesaj bildirimine dokunulunca: "mesaj" → aile sohbeti, "konusma:<a_b>" → o veliyle özel sohbet */
function bildirimdenAc(ac) {
  if (typeof mesajPenceresiAc !== "function") return;
  if (ac === "mesaj") return mesajPenceresiAc("aile");
  if (ac.startsWith("konusma:")) {
    const ben = typeof girisKisi !== "undefined" && girisKisi;
    const diger = ben ? ac.slice(8).split("_").find(x => x !== ben.id) : "";
    return mesajPenceresiAc(diger || "aile");
  }
}
function bildirimOlaylariniKur() {
  const ok = $("#ogr-bildirim-ic");
  if (ok) ok.addEventListener("click", async e => {
    const b = e.target.closest("[data-obl]");
    if (!b) return;
    if (b.dataset.obl === "ac") return bildirimAc();
    try { await Bulut.cihazYaz(OTURUM.kisi, localStorage.getItem("ogretmenim-cihaz"), { aktif: false }); } catch (h) { bildir(h.message, true); }
    ogrenciBildirimCiz();
  });
  const kap = $("#bildirim-ic");
  if (kap) {
    kap.addEventListener("click", async e => {
      const b = e.target.closest("[data-bl]");
      if (b) {
        const ne = b.dataset.bl;
        if (ne === "ac") return bildirimAc();
        if (ne === "kapat") { await Bulut.cihazYaz(OTURUM.kisi, localStorage.getItem("ogretmenim-cihaz"), { aktif: false }); return bildirimCiz(); }
        if (ne === "dene") {
          const k = await navigator.serviceWorker.ready;
          return k.showNotification("ÖğretmeniM", { body: "Bildirimler bu cihazda çalışıyor 👍", icon: "img/uygulama-192.png", badge: "img/bildirim-rozet.png" });
        }
      }
      const c = e.target.closest("[data-bl-cihaz]");
      if (c) { await Bulut.cihazYaz(OTURUM.kisi, c.dataset.blCihaz, { aktif: c.dataset.aktif !== "1" }); bildirimCiz(); }
    });
    kap.addEventListener("submit", async e => {
      e.preventDefault();
      const f = e.target, uyarilar = {};
      for (const [k] of BILDIRIM_UYARILARI) uyarilar[k] = f.elements[k].checked;
      try { await Bulut.bildirimAyarYaz(OTURUM.kisi, { saat: f.elements.saat.value, uyarilar }); bildir("Bildirim tercihleri kaydedildi"); }
      catch (h) { bildir(h.message, true); }
    });
  }
  const q = new URLSearchParams(location.search);
  if (q.get("ac")) { const ac = q.get("ac"); history.replaceState(null, "", location.pathname + location.hash); setTimeout(() => bildirimdenAc(ac), 1500); }
  if (q.get("haberim")) { bildirimHaberim(q.get("haberim"), q.get("ogrenci")); history.replaceState(null, "", location.pathname + location.hash); }
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener("message", e => {
    const v = e.data || {};
    if (v.tur !== "bildirim") return;
    if (v.eylem === "haberim") bildirimHaberim(v.anahtarlar, v.ogrenci);
    else if (v.ac) bildirimdenAc(v.ac);
    else if (veliAktif()) sayfaAc("ozet");
  });
}
