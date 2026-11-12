/* ÖğretmeniM — Mini Oyunlar çekirdeği (0.11)
   Ana ekrandaki ders düğmeleri + oyun kartları, oyun penceresi, ses, soru seçimi, cevap kaydı,
   ortak motorlar: şıklı soru, sınıflandırma (sürükle ya da tıkla), eşleştirme tahtası.
   İstatistik yalnız kaydedilir; Arın'a sayı/istatistik gösterilmez (tur sonu cümlesi hariç). */
"use strict";

const OYUNLAR = [];
function oyunTanimla(o) { OYUNLAR.push(o); }

const DOGRU_SOZLER = ["Harika!", "Süper!", "Çok iyi!", "Aferin!", "Tam isabet!", "Bravo!", "Mükemmel!", "İşte bu!"];
const YANLIS_SOZLER = ["Olsun, şimdi öğrendin!", "Yaklaştın!", "Bir dahakine olacak!", "Hata yapmak öğrenmenin parçası."];
const SONU_SOZLER = [
  [0.9, ["Muhteşem bir tur! Beynin ateş gibi çalışıyor! 🔥", "Neredeyse hepsini bildin, harikasın! 🌟"]],
  [0.7, ["Çok iyi gidiyorsun! Biraz daha pratikle tam ustalaşacaksın. 💪", "Güzel tur! Zorlandığın sorular bir dahakine daha kolay gelecek. 🚀"]],
  [0.4, ["Güzel çalıştın! Tekrar ettikçe daha kolay gelecek. 🌱", "İyi deneme! Her tur seni biraz daha güçlendiriyor. 💡"]],
  [0, ["Bu konu biraz zor, ama sen öğreniyorsun! Bir tur daha dene. 🌈", "Zor sorular beyni güçlendirir. Devam edersen başaracaksın! 💪"]],
];
const rastgele = dizi => dizi[Math.floor(Math.random() * dizi.length)];
function karistir(dizi) {
  const d = dizi.slice();
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

/* ---------- Ses (WebAudio ile kısa tonlar; dosya yok) ---------- */
const oyunSes = { acik: true, ctx: null };
try { oyunSes.acik = localStorage.getItem("ogretmenim.oyunSes") !== "0"; } catch (_) { /* varsayılan açık */ }
function sesCal(tur) {
  if (!oyunSes.acik) return;
  try {
    oyunSes.ctx = oyunSes.ctx || new AudioContext();
    const c = oyunSes.ctx, t0 = c.currentTime;
    const notalar = { dogru: [[660, 0], [880, .09]], yanlis: [[220, 0], [180, .12]], kutla: [[523, 0], [659, .1], [784, .2], [1047, .3]], tik: [[1200, 0]] }[tur] || [];
    for (const [f, t] of notalar) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = tur === "yanlis" ? "triangle" : "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + t);
      g.gain.exponentialRampToValueAtTime(tur === "tik" ? 0.05 : 0.18, t0 + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + (tur === "tik" ? 0.06 : 0.22));
      o.connect(g).connect(c.destination);
      o.start(t0 + t); o.stop(t0 + t + 0.25);
    }
  } catch (_) { /* ses yoksa sessiz devam */ }
}

/* ---------- Pencere durumu (panel ve gezinme: mufredat.js) ---------- */
const miniOyun = { ctx: null };

function oyunIlerleme(i, n) {
  const c = $("#oyun-ilerleme");
  c.hidden = !n;
  if (n) c.firstElementChild.style.width = Math.round(100 * Math.min(i, n) / n) + "%";
}

function oyunCevapKaydet(o, k, ctx) {
  const et = ctx.etiket || {};
  const kayit = { arac: "oyun:" + o.id, oyun: o.id, ders: o.ders, tur: k.beceri, beceri: k.beceri, beceri_adi: k.beceri_adi,
    konu: et.konu || k.konu || o.konu || "", etkinlik: k.etkinlik || et.etkinlik || "",
    soru: k.soru, cevap: k.cevap == null ? "" : String(k.cevap), dogru: !!k.dogru, sure: k.sure, bicim: k.bicim || "" };
  // Geçmişi yerel olarak da güncelle (aynı oturumdaki seçimler için)
  const s = ctx.gecmis.sorular[k.soru] = ctx.gecmis.sorular[k.soru] || { d: 0, y: 0, son: [] };
  s.d++; s.y += k.dogru ? 0 : 1; s.son = s.son.concat([[k.dogru ? 1 : 0, k.bicim || ""]]).slice(-6);
  // 0.24: veli şifresi girilmişken oynanan her şey denemedir; istatistiğe yazılmaz
  if (typeof veliAktif === "function" && veliAktif()) return;
  if (k.yazi) kayit.yazi = String(k.yazi).slice(0, 600);
  if (k.kelime) kayit.kelime = k.kelime;                 // 0.25: Kelime Defterim (kelime başına istatistik)
  if (k.eksik != null) { kayit.eksik = String(k.eksik).slice(0, 40); kayit.bicim = "acik"; }
  api("POST", "alistirma", kayit).catch(() => {});       // web: tarayıcıdaki motora (eskiden /api/alistirma)
}

function oyunKapat() {
  if (miniOyun.ctx) miniOyun.ctx.kapandi = true;
  miniOyun.ctx = null;
  $("#oyun-pencere").close();
}
function oyunCik(ctx) { (ctx && ctx.cik) ? ctx.cik() : oyunKapat(); }

/* ---------- Soru seçimi: zorlanılan sorular daha sık ---------- */
function soruAgirligi(ctx, anahtar) {
  const s = ctx.gecmis.sorular[anahtar];
  if (!s) return 1.6;                                  // hiç görülmemiş: biraz öncelikli
  let w = 1 + 4 * (s.y + 0.2) / (s.d + 1);
  if (s.son.length && !s.son[s.son.length - 1][0]) w += 2;   // son denemesi yanlış
  if (s.son.length >= 3 && s.son.slice(-3).every(x => x[0])) w *= 0.5;   // oturmuş
  return w;
}
function agirlikliSec(ctx, havuz, n, anahtar = x => x.anahtar) {
  const kalan = havuz.map(x => ({ x, w: soruAgirligi(ctx, anahtar(x)) }));
  const secilen = [];
  while (secilen.length < n && kalan.length) {
    let r = Math.random() * kalan.reduce((t, k) => t + k.w, 0);
    let i = 0;
    for (; i < kalan.length - 1; i++) { r -= kalan[i].w; if (r <= 0) break; }
    secilen.push(kalan.splice(i, 1)[0].x);
  }
  return secilen;
}

/* ---------- Seçim menüsü (seviye / ünite) ---------- */
function oyunMenusu(ctx, { baslik, aciklama, secenekler, sec }) {
  ctx.alan.innerHTML = `<div class="oyun-menu">
    <h3>${baslik}</h3>${aciklama ? `<p>${aciklama}</p>` : ""}
    <div class="oyun-menu-izgara">${secenekler.map((s, i) => `
      <button class="oyun-menu-secenek" data-i="${i}">
        <span class="oms-simge">${s.simge || ""}</span><b>${esc(s.ad)}</b>${s.alt ? `<small>${esc(s.alt)}</small>` : ""}
        ${s.ilerleme != null ? `<span class="oms-cubuk" title="Ustalık"><i style="width:${Math.round(s.ilerleme * 100)}%"></i></span>` : ""}
      </button>`).join("")}</div></div>`;
  oyunIlerleme(0, 0);
  ctx.alan.querySelectorAll("[data-i]").forEach(b => b.addEventListener("click", () => { sesCal("tik"); sec(secenekler[+b.dataset.i]); }));
}

/* ---------- Tur yürütücüsü ----------
   sorular: [{anahtar, beceri, beceri_adi, konu, ...}], goster(kap, soru, cevapla)
   cevapla(dogru, {cevap, dogruCevap, aciklama}) — yanlışlar turun sonunda bir kez daha sorulur. */
function turOyna(ctx, sorular, goster, secenek = {}) {
  return new Promise(bitti => {
    const kuyruk = sorular.map(s => ({ s, tekrar: false }));
    let toplam = kuyruk.length, yapilan = 0, ilkDogru = 0;
    const sonraki = () => {
      if (ctx.kapandi) return;
      if (!kuyruk.length) return bitti({ dogru: ilkDogru, toplam: sorular.length });
      const { s, tekrar } = kuyruk.shift();
      ctx.ilerleme(yapilan, toplam);
      ctx.alan.innerHTML = `<div class="oyun-soru"></div><div class="oyun-geri" hidden></div>`;
      const kap = ctx.alan.querySelector(".oyun-soru"), geri = ctx.alan.querySelector(".oyun-geri");
      if (tekrar && !secenek.sessizTekrar) kap.insertAdjacentHTML("beforebegin", `<div class="oyun-tekrar-not">🔁 Bu soruyu bir daha deneyelim</div>`);
      const bas = performance.now();
      let cevaplandi = false;
      goster(kap, s, (dogru, bilgi = {}) => {
        if (cevaplandi || ctx.kapandi) return;
        cevaplandi = true;
        yapilan++;
        if (!bilgi.kayitli) ctx.kaydet({ beceri: s.beceri, beceri_adi: s.beceri_adi, konu: s.konu, etkinlik: s.etkinlik, soru: s.anahtar, cevap: bilgi.cevap,
          dogru, sure: (performance.now() - bas) / 1000, bicim: bilgi.bicim || s.bicim, yazi: bilgi.yazi, eksik: bilgi.eksikNokta, kelime: s.kelime });
        if (!tekrar && dogru) ilkDogru++;
        if (!dogru && !tekrar && secenek.tekrarYok !== true) {
          // sessiz tekrar: hemen sona değil, birkaç soru sonrasına karışık yerleşir (öğrenci "tekrar" olduğunu fark etmez)
          const yer = secenek.sessizTekrar ? Math.min(kuyruk.length, 2 + Math.floor(Math.random() * 3)) : kuyruk.length;
          kuyruk.splice(yer, 0, { s, tekrar: true }); toplam++;
        }
        ctx.ilerleme(yapilan, toplam);
        geri.hidden = false;
        if (dogru) {
          ctx.ses("dogru");
          geri.className = "oyun-geri iyi";
          geri.innerHTML = `<b>✅ ${rastgele(DOGRU_SOZLER)}</b>${bilgi.aciklama && secenek.dogrudaAciklama ? `<span>${bilgi.aciklama}</span>` : ""}`;
          setTimeout(sonraki, bilgi.aciklama && secenek.dogrudaAciklama ? 1800 : 850);
        } else {
          ctx.ses("yanlis");
          geri.className = "oyun-geri kotu";
          geri.innerHTML = `<div><b>${rastgele(YANLIS_SOZLER)}</b>
            ${bilgi.dogruCevap != null ? `<span>Doğrusu: <b class="dogru-cevap">${bilgi.dogruCevap}</b></span>` : ""}
            ${bilgi.aciklama ? `<span class="aciklama">${bilgi.aciklama}</span>` : ""}</div>
            <button class="dugme ana oyun-devam">Devam ▶</button>`;
          geri.querySelector(".oyun-devam").addEventListener("click", sonraki);
        }
      });
    };
    sonraki();
  });
}

/* ---------- Tur sonu ---------- */
function turSonu(ctx, { dogru, toplam }, { tekrar, menu, not } = {}) {
  if (ctx.kapandi) return;
  const oran = toplam ? dogru / toplam : 0;
  const cumle = rastgele(SONU_SOZLER.find(([e]) => oran >= e)[1]);
  ctx.ses(oran >= 0.7 ? "kutla" : "dogru");
  ctx.ilerleme(1, 1);
  ctx.alan.innerHTML = `<div class="oyun-son">
    <div class="oyun-son-simge">${oran >= 0.9 ? "🌟" : oran >= 0.7 ? "🎉" : "💪"}</div>
    <h3>${cumle}</h3>
    <p>Bu turda <b>${toplam}</b> sorudan <b>${dogru}</b> tanesini ilk denemede bildin.</p>
    ${not ? `<p class="oyun-son-not">${not}</p>` : ""}
    <div class="oyun-son-dugmeler">
      <button class="dugme ana" data-son="tekrar">🔁 Bir tur daha</button>
      ${menu ? `<button class="dugme" data-son="menu">☰ Seviye seç</button>` : ""}
      <button class="dugme" data-son="cik">${ctx.cikYazi || "🏠 Oyunlara dön"}</button>
    </div></div>`;
  if (oran >= 0.7) konfetiPatlat();
  ctx.alan.querySelector("[data-son=tekrar]").addEventListener("click", () => (tekrar || ctx.yeniden)());
  if (menu) ctx.alan.querySelector("[data-son=menu]").addEventListener("click", menu);
  ctx.alan.querySelector("[data-son=cik]").addEventListener("click", () => oyunCik(ctx));
}

function konfetiPatlat() {
  const kutu = document.createElement("div");
  kutu.className = "konfeti";
  kutu.innerHTML = Array.from({ length: 16 }, (_, i) =>
    `<span style="--x:${Math.round(Math.random() * 100)}vw;--g:${(Math.random() * .5).toFixed(2)}s">${["🎉", "⭐", "🌟", "✨"][i % 4]}</span>`).join("");
  document.body.append(kutu);
  setTimeout(() => kutu.remove(), 2600);
}

/* ---------- Motor 1: şıklı soru ----------
   soru: {soruHtml, gorsel?, secenekler[], dogru, aciklama?, sutun?} */
function gosterSikli(kap, s, cevapla) {
  const secenekler = s.karistirma ? s.secenekler : karistir(s.secenekler);
  kap.innerHTML = `${s.ust ? `<div class="soru-ust">${s.ust}</div>` : ""}
    ${s.gorsel ? `<div class="soru-gorsel">${s.gorsel}</div>` : ""}
    <div class="soru-metin">${s.soruHtml}</div>
    <div class="sik-izgara${s.sutun ? " sutun-" + s.sutun : ""}">${secenekler.map(x =>
      `<button class="sik" data-sik="${esc(String(x))}">${s.sikHtml ? s.sikHtml(x) : esc(String(x))}</button>`).join("")}</div>`;
  kap.querySelectorAll(".sik").forEach(b => b.addEventListener("click", () => {
    const secilen = b.dataset.sik, dogru = secilen === String(s.dogru);
    kap.querySelectorAll(".sik").forEach(x => {
      x.disabled = true;
      if (x.dataset.sik === String(s.dogru)) x.classList.add("dogru");
    });
    if (!dogru) b.classList.add("yanlis");
    cevapla(dogru, { cevap: secilen, dogruCevap: esc(String(s.dogru)), aciklama: s.aciklama });
  }));
}

/* ---------- Motor 2: sınıflandırma (kartı kutuya sürükle ya da kutuya tıkla) ----------
   soru: {kart:{simge, metin}, kutular:[{kod, ad, simge}], dogru:kod, aciklama?, yonerge?} */
function gosterSiniflandir(kap, s, cevapla) {
  kap.innerHTML = `${s.yonerge ? `<div class="soru-ust">${s.yonerge}</div>` : ""}
    <div class="sinif-kart" draggable="true">${s.kart.simge ? `<span class="sinif-simge">${s.kart.simge}</span>` : ""}<span>${esc(s.kart.metin)}</span></div>
    <div class="sinif-kutular" style="--n:${s.kutular.length}">${s.kutular.map(k =>
      `<button class="sinif-kutu" data-kutu="${k.kod}" ${k.renk ? `style="--kutu:${k.renk}"` : ""}><span class="sinif-kutu-simge">${k.simge || ""}</span><b>${esc(k.ad)}</b></button>`).join("")}</div>
    <div class="sinif-ipucu">Kartı doğru kutuya sürükle ya da kutuya tıkla.</div>`;
  const kart = kap.querySelector(".sinif-kart");
  const sec = kod => {
    const dogru = kod === s.dogru;
    kap.querySelectorAll(".sinif-kutu").forEach(b => {
      b.disabled = true;
      if (b.dataset.kutu === s.dogru) b.classList.add("dogru");
      if (b.dataset.kutu === kod && !dogru) b.classList.add("yanlis");
    });
    kart.classList.add(dogru ? "gitti" : "sallan");
    kart.draggable = false;
    const ad = k => (s.kutular.find(x => x.kod === k) || {}).ad;
    cevapla(dogru, { cevap: ad(kod), dogruCevap: esc(ad(s.dogru)), aciklama: s.aciklama });
  };
  kart.addEventListener("dragstart", e => { e.dataTransfer.setData("text/plain", "kart"); kart.classList.add("tasiniyor"); });
  kart.addEventListener("dragend", () => kart.classList.remove("tasiniyor"));
  kap.querySelectorAll(".sinif-kutu").forEach(b => {
    b.addEventListener("click", () => sec(b.dataset.kutu));
    b.addEventListener("dragover", e => { e.preventDefault(); b.classList.add("uzerinde"); });
    b.addEventListener("dragleave", () => b.classList.remove("uzerinde"));
    b.addEventListener("drop", e => { e.preventDefault(); b.classList.remove("uzerinde"); if (!b.disabled) sec(b.dataset.kutu); });
  });
}

/* ---------- Motor 3: eşleştirme tahtası (soldan seç, sağdan eşini seç) ----------
   ciftler: [{anahtar, sol, sag, beceri, beceri_adi, konu, solHtml?, sagHtml?}]
   Her sol öğe için tek kayıt: ilk denemede doğru mu. Dönen söz: {dogru, toplam} */
function eslestirmeOyna(ctx, ciftler, { yonerge = "Soldakini seç, sonra sağdaki eşine tıkla.", ilerlemeBas = 0, ilerlemeToplam } = {}) {
  return new Promise(bitti => {
    const sag = karistir(ciftler);
    ctx.alan.innerHTML = `<div class="soru-ust">${yonerge}</div>
      <div class="eslestir">
        <div class="es-sutun">${ciftler.map((c, i) => `<button class="es-oge sol" data-i="${i}">${c.solHtml || esc(c.sol)}</button>`).join("")}</div>
        <div class="es-sutun">${sag.map(c => `<button class="es-oge sag" data-i="${ciftler.indexOf(c)}">${c.sagHtml || esc(c.sag)}</button>`).join("")}</div>
      </div><div class="oyun-geri" hidden></div>`;
    const geri = ctx.alan.querySelector(".oyun-geri");
    const durum = ciftler.map(() => ({ yanlis: false, bitti: false, bas: performance.now() }));
    let secili = null, biten = 0, dogruSay = 0;
    const toplamIlerleme = ilerlemeToplam || ciftler.length;
    ctx.ilerleme(ilerlemeBas, toplamIlerleme);
    const solSec = b => {
      ctx.alan.querySelectorAll(".es-oge.sol").forEach(x => x.classList.remove("secili"));
      secili = +b.dataset.i;
      b.classList.add("secili");
      ctx.ses("tik");
    };
    ctx.alan.querySelectorAll(".es-oge.sol").forEach(b => b.addEventListener("click", () => { if (!durum[+b.dataset.i].bitti) solSec(b); }));
    ctx.alan.querySelectorAll(".es-oge.sag").forEach(b => b.addEventListener("click", () => {
      if (ctx.kapandi || b.disabled) return;
      if (secili === null) { geri.hidden = false; geri.className = "oyun-geri"; geri.innerHTML = "Önce soldan bir kart seç 👈"; return; }
      const i = secili, c = ciftler[i], d = durum[i];
      const solB = ctx.alan.querySelector(`.es-oge.sol[data-i="${i}"]`);
      if (+b.dataset.i === i || ciftler[+b.dataset.i].sag === c.sag) {
        d.bitti = true; biten++;
        solB.classList.remove("secili"); solB.classList.add("tamam"); solB.disabled = true;
        b.classList.add("tamam"); b.disabled = true;
        ctx.ses("dogru");
        if (!d.yanlis) {
          dogruSay++;
          ctx.kaydet({ beceri: c.beceri, beceri_adi: c.beceri_adi, konu: c.konu, etkinlik: c.etkinlik, soru: c.anahtar, kelime: c.kelime, bicim: c.bicim, cevap: c.sag, dogru: true, sure: (performance.now() - d.bas) / 1000 });
        }
        geri.hidden = false; geri.className = "oyun-geri iyi"; geri.innerHTML = `<b>✅ ${rastgele(DOGRU_SOZLER)}</b>${c.aciklama ? `<span>${c.aciklama}</span>` : ""}`;
        secili = null;
        ctx.ilerleme(ilerlemeBas + biten, toplamIlerleme);
        if (biten === ciftler.length) setTimeout(() => bitti({ dogru: dogruSay, toplam: ciftler.length }), 900);
      } else {
        ctx.ses("yanlis");
        b.classList.add("sallan"); setTimeout(() => b.classList.remove("sallan"), 450);
        if (!d.yanlis) {
          d.yanlis = true;
          ctx.kaydet({ beceri: c.beceri, beceri_adi: c.beceri_adi, konu: c.konu, etkinlik: c.etkinlik, soru: c.anahtar, kelime: c.kelime, bicim: c.bicim, cevap: ciftler[+b.dataset.i].sag, dogru: false, sure: (performance.now() - d.bas) / 1000 });
        }
        geri.hidden = false; geri.className = "oyun-geri kotu"; geri.innerHTML = `<b>${rastgele(YANLIS_SOZLER)}</b> <span>Başka bir eş dene.</span>`;
      }
    }));
  });
}

/* ---------- Olaylar ---------- */
function miniOyunOlaylariniKur() {
  $("#oyun-kapat").addEventListener("click", oyunKapat);
  $("#oyun-pencere").addEventListener("cancel", () => { if (miniOyun.ctx) miniOyun.ctx.kapandi = true; miniOyun.ctx = null; });
  $("#oyun-ses").addEventListener("click", () => {
    oyunSes.acik = !oyunSes.acik;
    try { localStorage.setItem("ogretmenim.oyunSes", oyunSes.acik ? "1" : "0"); } catch (_) { /* önemli değil */ }
    $("#oyun-ses").textContent = oyunSes.acik ? "🔊" : "🔇";
  });
  mufredatOlaylariniKur();
}
