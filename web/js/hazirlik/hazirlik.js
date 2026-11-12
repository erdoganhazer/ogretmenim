/* ÖğretmeniM 0.24 — Yazılılara hazırlık. (0.30: çıktılar "grup" alanına göre başlıklara ayrılır.)
   İçerik: /hazirlik/yazili1.json (araclar/hazirlik/*.py kaynaklarından derlenir: araclar/hazirlik_derle.py).
   Her yazılı Mini Oyunlar motoruna sanal bir "ders" olarak eklenir (kod: y1-<ders>); öğrenme çıktıları ünite gibi görünür.
   Kayıt: beceri = "y1.<çıktı kodu>", ders = asıl ders (fen, sosyal…), konu = "<n>. <çıktı adı>".
   Arın'a yalnız renkli çubuk ve "hazırım" görünür; yüzdeler veliye gider. Veli şifresi girili iken oynananlar kaydedilmez. */
"use strict";

const hz = { yazililar: [], gecmis: {}, yuklendi: false };
const HZ_RENK = { fen: "#10B981", sosyal: "#EF4444", turkce: "#F59E0B", din: "#0D9488", matematik: "#6366F1", ingilizce: "#9B59B6", almanca: "#E0457B" };

async function hazirlikYukle() {
  try {
    // İçerik paketi: yazılı hazırlık yalnız bu paketin atandığı öğrencide görünür (Hesaplar › öğrenci › içerik)
    const r = await fetch("hazirlik/yazili1.json");
    if (!r.ok) return;
    const veri = await r.json();
    const atanan = ((durum.veri && durum.veri.icerik) || {}).paketler || [];
    hz.yazililar = atanan.includes(veri.paket) ? (veri.yazililar || []) : [];
  } catch (_) { return; }
  for (const y of hz.yazililar) {
    const kod = "y1-" + y.ders;
    DERS_RENK[kod] = HZ_RENK[y.ders] || "#6366F1";
    DERSLER[kod] = {
      kod, ad: `${y.ad} — ${y.yazili}`, simge: y.simge, anaDers: y.ders, yazili: y,
      uniteler: y.ciktilar.map((c, i) => ({
        no: i + 1, kod: c.kod, ad: c.ad, simge: c.simge, kisa: c.kod, soru: c.soru, ozet: c.hap, grup: c.grup || "",
        etkinlikler: c.etkinlikler.map(e => ({ ...e, _bkod: `y1.${c.kod}`, beceri: `${c.kod} ${c.ad}`.slice(0, 80) })),
      })),
    };
  }
  yaziliTarihleriniEsle();
  hz.yuklendi = true;
  await yaziliGecmisYenile();
  yaziliPanelCiz();
}
/* 0.25.1: Velinin Zaman Çizelgesi'ne girdiği yazılı tarihi esastır (içerikteki tarih yalnız varsayılan).
   Aynı dersin ±21 gün içindeki (tarih yoksa ilk yaklaşan) yazılı sınavı alınır. */
const HZ_DERS_ANAHTAR = { fen: "fen", sosyal: "sosyal", turkce: "türkçe", din: "din", matematik: "matematik", ingilizce: "ingilizce" };
const HZ_DERS_TAM = new Set(["ingilizce"]);     // "İngilizce Kur" ile karışmasın
function yaziliTarihleriniEsle() {
  let sinavlar = [];
  try { sinavlar = aktifEtkinlikler().filter(e => e.tur === "sinav" && e.tarih && (!e.sinav_turu || e.sinav_turu === "yazili")); } catch (_) { return; }
  const gun = t => new Date(t + "T12:00").getTime() / 864e5;
  const bugun = new Date().toISOString().slice(0, 10);
  for (const y of hz.yazililar) {
    if (!y.icerikTarihi && y.icerikTarihi !== "") y.icerikTarihi = y.tarih || "";
    const anahtar = HZ_DERS_ANAHTAR[y.ders] || y.ders;
    const adaylar = sinavlar.filter(e => { const ad = dersAdiBul(e.ders_id).toLocaleLowerCase("tr"); return HZ_DERS_TAM.has(y.ders) ? ad === anahtar : ad.startsWith(anahtar); });
    let sec = null;
    if (y.icerikTarihi) sec = adaylar.filter(e => Math.abs(gun(e.tarih) - gun(y.icerikTarihi)) <= 21).sort((a, b) => Math.abs(gun(a.tarih) - gun(y.icerikTarihi)) - Math.abs(gun(b.tarih) - gun(y.icerikTarihi)))[0];
    else sec = adaylar.filter(e => e.tarih >= bugun).sort((a, b) => a.tarih.localeCompare(b.tarih))[0];
    y.tarih = sec ? sec.tarih : y.icerikTarihi;
  }
}
async function yaziliGecmisYenile() {
  await Promise.all(hz.yazililar.map(async y => {
    try { hz.gecmis[y.ders] = await api("GET", `oyun/y1-${y.ders}/gecmis`); } catch (_) { hz.gecmis[y.ders] = { sorular: {} }; }
  }));
}

/* ---------- Hazırlık oranları (Arın'a yalnız çubuk/renk) ---------- */
function ciktiOrani(y, u) {
  const s = (hz.gecmis[y.ders] || { sorular: {} }).sorular;
  const anahtarlar = u.etkinlikler.flatMap(etkinlikAnahtarlari);
  if (!anahtarlar.length) return 0;
  return anahtarlar.filter(a => s[a] && s[a].son.length && s[a].son[s[a].son.length - 1][0]).length / anahtarlar.length;
}
function yaziliOrani(y) {
  if (typeof IC_PROFIL !== "undefined" && IC_PROFIL[y.ders]) return icOran(hz.gecmis[y.ders], y.ders);
  const d = DERSLER["y1-" + y.ders];
  const top = d.uniteler.reduce((t, u) => t + (u.soru || 1), 0);
  return d.uniteler.reduce((t, u) => t + (u.soru || 1) * ciktiOrani(y, u), 0) / top;
}
function kalanGun(tarih) {
  if (!tarih) return null;
  const [a, b, c] = tarih.split("-").map(Number);
  return Math.round((new Date(a, b - 1, c) - new Date(new Date().setHours(0, 0, 0, 0))) / 864e5);
}
function kalanYazi(g) {
  if (g == null) return "Tarihi açıklanmadı";
  if (g < 0) return "Yapıldı";
  if (g === 0) return "Bugün!";
  if (g === 1) return "Yarın!";
  return `${g} gün kaldı`;
}
function hazirlikEtiketi(o) {
  return o >= 0.85 ? ["Hazırsın 🌟", "iyi"] : o >= 0.6 ? ["Az kaldı 💪", "orta"] : o > 0 ? ["Çalışmaya devam 🌱", "az"] : ["Başlamadın", "yok"];
}
const tarihGoster = t => { if (!t) return ""; const [a, b, c] = t.split("-").map(Number); const d = new Date(a, b - 1, c); return `${c} ${AYLAR[b - 1]} ${GUNLER[d.getDay()]}`; };
function siraliYazililar() {
  return hz.yazililar.slice().sort((a, b) => {
    const ga = kalanGun(a.tarih), gb = kalanGun(b.tarih);
    const ka = ga == null ? 999 : ga < 0 ? 1000 + -ga : ga, kb = gb == null ? 999 : gb < 0 ? 1000 + -gb : gb;
    return ka - kb;
  });
}

/* ---------- Ana Sayfa: Yazılılarım ---------- */
function yaziliPanelCiz() {
  const kap = $("#yazili-kartlari");
  if (!kap) return;
  if (!hz.yazililar.length) { $("#yazili-panel").hidden = true; return; }
  $("#yazili-panel").hidden = false;
  kap.innerHTML = siraliYazililar().map(y => {
    const g = kalanGun(y.tarih), o = yaziliOrani(y), [et, sinif] = hazirlikEtiketi(o);
    return `<button class="yazili-kart${g != null && g < 0 ? " gecti" : ""}${g != null && g >= 0 && g <= 3 ? " yakin" : ""}" data-yazili="${y.ders}" style="--renk:${HZ_RENK[y.ders]}">
      <span class="yk-simge">${y.simge}</span>
      <span class="yk-yazi"><b>${esc(y.ad)}</b><small>${y.tarih ? tarihGoster(y.tarih) : "Tarih belli değil"} · ${typeof IC_PROFIL !== "undefined" && IC_PROFIL[y.ders] ? IC_PROFIL[y.ders].sira.length : y.ciktilar.length} konu</small></span>
      <span class="yk-gun${g != null && g >= 0 && g <= 3 ? " acil" : g != null && g >= 0 && g <= 7 ? " hafta" : ""}">⏳ ${kalanYazi(g)}</span>
      <span class="yk-durum ${sinif}"><span class="muf-cubuk"><i style="width:${Math.round(o * 100)}%"></i></span><em>${et}</em></span>
    </button>`;
  }).join("");
}

/* ---------- Yazılının ekranı (Mini Oyunlar penceresinde) ---------- */
function yaziliDersEkrani(d) {
  const y = d.yazili;
  if (typeof IC_PROFIL !== "undefined" && IC_PROFIL[y.ders]) { hz.gecmis[y.ders] = muf.gecmis; return icAnaEkran(d); }   // 0.31/0.32: yönlendirmeli çalışma (İngilizce, Almanca)
  muf.ekran = "ders"; muf.unite = null;
  mufBaslik([d.ad]);
  oyunIlerleme(0, 0);
  hz.gecmis[y.ders] = muf.gecmis;
  const g = kalanGun(y.tarih), toplamSoru = y.ciktilar.reduce((t, c) => t + c.soru, 0);
  $("#oyun-alan").innerHTML = `<div class="muf-ust yazili-ust">
      <h3>${y.simge} ${esc(y.ad)} ${esc(y.yazili)}</h3>
      <p>${y.tarih ? `<b>${tarihGoster(y.tarih)}</b> · ${kalanYazi(g)} · ` : ""}${esc(y.bicim || "")}${toplamSoru ? ` · ${toplamSoru} soru` : ""}</p>
      ${y.not ? `<p class="yazili-not">${esc(y.not)}</p>` : ""}</div>
    <div class="yazili-dugmeler">
      <button class="muf-etkinlik karisik" data-hz="deneme"><span class="me-simge">🎯</span><b>Deneme sınavı</b><small>${toplamSoru || 10} soru, yazılıdaki dağılımla</small></button>
      <button class="muf-etkinlik" data-hz="karisik"><span class="me-simge">🔀</span><b>Karışık tekrar</b><small>Bütün konulardan 10 hızlı soru</small></button>
    </div>
    ${[...new Set(d.uniteler.map(u => u.grup || ""))].map(grup => `<h4 class="yazili-ara">${esc(grup || "Yazılıda çıkacak konular")}</h4>
    <div class="muf-uniteler">${d.uniteler.filter(u => (u.grup || "") === grup).map(u => {
      const o = ciktiOrani(y, u), [et, sinif] = hazirlikEtiketi(o);
      return `<button class="muf-unite yazili-cikti" data-muf-unite="${u.no}">
        <span class="mu-no">${u.no}</span><span class="mu-simge">${u.simge}</span>
        <span class="mu-yazi"><b>${esc(u.ad)}</b><small>${esc(u.kod)} · yazılıda ${u.soru} soru</small><em class="yk-durum ${sinif}">${et}</em></span>
        ${cubukHtml(o)}</button>`;
    }).join("")}</div>`).join("")}`;
  $("#oyun-alan").querySelectorAll("[data-hz]").forEach(b => b.addEventListener("click", () => {
    sesCal("tik");
    if (b.dataset.hz === "deneme") yaziliDeneme(d);
    else yaziliKarisik(d);
  }));
}

function yaziliCtx(d, ad) {
  const ctx = miniOyun.ctx = {
    oyun: { id: d.kod, ders: d.anaDers }, alan: $("#oyun-alan"), gecmis: muf.gecmis, kapandi: false,
    etiket: { konu: "", etkinlik: ad }, ilerleme: oyunIlerleme, ses: sesCal,
    cik: () => { mufOyunuDurdur(); mufGecmisYenile().then(() => yaziliDersEkrani(d)); }, cikYazi: "☰ Yazılıya dön",
  };
  ctx.kaydet = k => oyunCevapKaydet(ctx.oyun, k, ctx);
  return ctx;
}

async function yaziliDeneme(d) {
  mufOyunuDurdur();
  muf.ekran = "oyun";
  mufBaslik([d.ad, "Deneme sınavı"]);
  const ctx = yaziliCtx(d, "Deneme sınavı");
  ctx.yeniden = () => yaziliDeneme(d);
  const acikOnce = /açık uçlu/i.test(d.yazili.bicim || "");
  let secilen = [];
  for (const u of d.uniteler) {
    const havuz = u.etkinlikler.filter(e => ["sikli", "dogruyanlis", "acik", "sirala", "siniflandir"].includes(e.tur)).flatMap(e => havuzKur(e, u)).filter(Boolean);
    const acik = havuz.filter(s => s._g === gosterAcik), diger = havuz.filter(s => s._g !== gosterAcik);
    const n = Math.max(1, u.soru || 1);
    let al = [];
    if (acikOnce && acik.length) al = agirlikliSec(ctx, acik, Math.min(n, acik.length));
    al = al.concat(agirlikliSec(ctx, diger, n - al.length));
    secilen = secilen.concat(al);
  }
  const sonuc = await turOyna(ctx, secilen, dagit, { tekrarYok: true, dogrudaAciklama: true });
  if (sonuc && !ctx.kapandi) turSonu(ctx, sonuc, { tekrar: () => yaziliDeneme(d), not: "Deneme sınavında yanlışlar tekrar sorulmaz. Zorlandığın konuyu listeden açıp hap bilgileri gözden geçir." });
}
async function yaziliKarisik(d) {
  mufOyunuDurdur();
  muf.ekran = "oyun";
  mufBaslik([d.ad, "Karışık tekrar"]);
  const ctx = yaziliCtx(d, "Karışık Tekrar");
  ctx.yeniden = () => yaziliKarisik(d);
  const havuz = d.uniteler.flatMap(u => u.etkinlikler.filter(e => ["sikli", "dogruyanlis", "siniflandir"].includes(e.tur)).flatMap(e => havuzKur(e, u))).filter(Boolean);
  const sonuc = await turOyna(ctx, agirlikliSec(ctx, havuz, 10), dagit, { dogrudaAciklama: true });
  if (sonuc && !ctx.kapandi) turSonu(ctx, sonuc, { tekrar: () => yaziliKarisik(d) });
}

/* ---------- Açık uçlu soru: yaz → örnek cevap → anahtar noktaları kendin işaretle ---------- */
function gosterAcik(kap, s, cevapla) {
  kap.innerHTML = `<div class="soru-ust">✍️ Yazılıdaki gibi cevapla. Sonra örnek cevapla karşılaştıracaksın.</div>
    ${s.c ? `<div class="soru-gorsel">${cizim(s.c)}</div>` : ""}
    <div class="soru-metin">${zenginMetin(s.s)}</div>
    <textarea class="acik-cevap" rows="4" placeholder="Cevabını buraya yaz…"></textarea>
    <div class="spell-alt"><button class="dugme" data-acik="bilmiyorum">🤔 Bilmiyorum, cevabı göster</button>
      <button class="dugme ana" data-acik="kontrol" disabled>Cevabımı kontrol et ✓</button></div>`;
  const ta = kap.querySelector(".acik-cevap"), kontrol = kap.querySelector("[data-acik=kontrol]");
  ta.addEventListener("input", () => { kontrol.disabled = ta.value.trim().length < 3; });
  setTimeout(() => ta.focus(), 50);
  const karsilastir = bilmiyor => {
    const yazi = ta.value.trim();
    kap.innerHTML = `<div class="soru-metin kucuk">${zenginMetin(s.s)}</div>
      ${yazi ? `<div class="acik-senin"><small>Senin cevabın</small><p>${esc(yazi)}</p></div>` : ""}
      <div class="acik-ornek"><small>Örnek cevap</small><p>${esc(s.cevap)}</p></div>
      <div class="acik-noktalar"><b>${bilmiyor ? "Bu noktaları öğren:" : "Cevabında hangileri var? İşaretle:"}</b>
        ${s.noktalar.map((n, i) => `<label class="acik-nokta"><input type="checkbox" data-n="${i}" ${bilmiyor ? "disabled" : ""}><span>${esc(n)}</span></label>`).join("")}</div>
      <div class="spell-alt"><button class="dugme ana" data-acik="kaydet">${bilmiyor ? "Anladım ▶" : "Kaydet ✓"}</button></div>`;
    kap.querySelector("[data-acik=kaydet]").addEventListener("click", () => {
      const isaret = s.noktalar.map((_, i) => !!(kap.querySelector(`[data-n="${i}"]`) || {}).checked);
      const n = isaret.filter(Boolean).length, oran = n / s.noktalar.length;
      kap.querySelectorAll("input,button").forEach(x => { x.disabled = true; });
      const eksik = isaret.map((v, i) => v ? null : i).filter(x => x != null);
      cevapla(oran >= 0.6, { cevap: `${n}/${s.noktalar.length}`, eksikNokta: eksik.join(","), yazi,
        aciklama: oran >= 0.99 ? "Bütün anahtar noktaları yazmışsın. 👏" : `Yazılıda tam puan için şunları da yaz: ${eksik.map(i => esc(s.noktalar[i])).join(" · ")}` });
    });
  };
  kontrol.addEventListener("click", () => karsilastir(false));
  kap.querySelector("[data-acik=bilmiyorum]").addEventListener("click", () => karsilastir(true));
}

/* ---------- Çalışma Masam: yaklaşan yazılı kartı ---------- */
function yaziliPlanCiz() {
  const kap = $("#pl-yazili");
  if (!kap) return;
  if (!hz.yuklendi) { kap.innerHTML = ""; return; }
  const yakin = siraliYazililar().filter(y => { const g = kalanGun(y.tarih); return g != null && g >= 0 && g <= 7; }).slice(0, 2);
  kap.innerHTML = yakin.map(y => {
    const d = DERSLER["y1-" + y.ders], g = kalanGun(y.tarih);
    const zayif = d.uniteler.slice().sort((a, b) => ciktiOrani(y, a) - ciktiOrani(y, b) || b.soru - a.soru)[0];
    const o = yaziliOrani(y);
    return `<div class="pl-yazili" style="--r:${HZ_RENK[y.ders]}"><span class="ply-simge">📝</span>
      <div class="ply-yazi"><b>${esc(y.ad)} yazılısı · ${kalanYazi(g)}</b>
        <span>${o >= 0.85 ? "Hazırsın! Kısa bir deneme sınavıyla tazele." : `Bugün şuna çalış: <b>${esc(zayif.ad)}</b>`}</span></div>
      <button class="pl-basla kucuk" data-hz-calis="${y.ders}" data-hz-unite="${o >= 0.85 ? 0 : zayif.no}">▶ Çalış</button></div>`;
  }).join("");
}

async function yaziliAc(ders, uniteNo) {
  if (!hz.yuklendi) return;
  await mufPencereAc("y1-" + ders);
  const d = DERSLER["y1-" + ders];
  if (uniteNo) uniteEkrani(d.uniteler.find(u => u.no === +uniteNo));
}

function hazirlikOlaylariniKur() {
  document.addEventListener("click", e => {
    const k = e.target.closest("[data-yazili]");
    if (k) { sesCal("tik"); return yaziliAc(k.dataset.yazili, 0); }
    const c = e.target.closest("[data-hz-calis]");
    if (c) { sesCal("tik"); return yaziliAc(c.dataset.hzCalis, +c.dataset.hzUnite); }
  });
  // Oyun penceresi kapanınca hazırlık çubukları güncellensin
  $("#oyun-pencere").addEventListener("close", () => { if (hz.yuklendi) yaziliGecmisYenile().then(() => { yaziliPanelCiz(); yaziliPlanCiz(); }); });
  hazirlikYukle().then(() => yaziliPlanCiz());
}
