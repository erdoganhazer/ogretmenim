/* ÖğretmeniM — Mini Oyunlar: Ders → Ünite (MEB kitap sırası) → Hatırla kartları + etkinlikler (0.12)
   İçerik: web/js/oyun/icerik/<ders>.js dosyalarındaki dersTanimla({...}) çağrıları (şema: icerik/SEMA.md).
   Kayıt: her cevap /api/alistirma'ya {oyun: ders, beceri: "<ders>.<etkinlik>", beceri_adi, konu: "<no>. <ünite>", etkinlik} olarak gider. */
"use strict";

const DERS_SIRASI = ["matematik", "turkce", "sosyal", "ingilizce", "almanca", "fen", "din", "bilisim"];
const DERS_RENK = { matematik: "#6366F1", turkce: "#F59E0B", sosyal: "#EF4444", ingilizce: "#8B5CF6",
  almanca: "#0EA5E9", fen: "#10B981", din: "#0D9488", bilisim: "#64748B" };
const DERSLER = {};
function dersTanimla(d) { DERSLER[d.kod] = d; }
function siraliDersler() { return DERS_SIRASI.filter(k => DERSLER[k]).map(k => DERSLER[k]); }

const TUR_ADI = { sikli: "Bilgi yarışması", dogruyanlis: "Doğru mu, yanlış mı?", eslestir: "Eşleştirme", siniflandir: "Kutulara ayır",
  sirala: "Sıraya diz", kelime: "Kelime eşleştirme", yazim: "Harflerle yaz", oyun: "Oyun", acik: "Yazılı gibi cevapla" };
const muf = { ders: null, unite: null, gecmis: { sorular: {} }, ekran: null };

function sonUniteOku(ders) { try { return +localStorage.getItem("ogretmenim.sonUnite." + ders) || 0; } catch (_) { return 0; } }
function sonUniteYaz(ders, no) { try { localStorage.setItem("ogretmenim.sonUnite." + ders, no); } catch (_) { /* önemli değil */ } }

/* ---------- Soru anahtarları ve ilerleme ---------- */
function etkinlikAnahtarlari(e) {
  const k = x => `${e.id}|${x}`;
  switch (e.tur) {
    case "sikli": return e.sorular.map(q => k(soruKimligi(q)));
    case "dogruyanlis": return e.ifadeler.map(q => k(soruKimligi(q)));
    case "siniflandir": return e.kartlar.map(c => k(c.m));
    case "eslestir": return e.ciftler.map(c => k(c.sol));
    case "sirala": return e.diziler.map(q => k(q.s));
    case "kelime": case "yazim": return e.kelimeler.map(w => k(w.en));
    case "acik": return e.sorular.map(q => k(soruKimligi(q)));
    default: return [];
  }
}
function ogrenilmeOrani(anahtarlar) {
  if (!anahtarlar.length) return null;
  const s = muf.gecmis.sorular;
  return anahtarlar.filter(a => s[a] && s[a].son.length && s[a].son[s[a].son.length - 1][0]).length / anahtarlar.length;
}
const cubukHtml = oran => oran == null ? "" : `<span class="muf-cubuk" title="Öğrendiklerin"><i style="width:${Math.round(oran * 100)}%"></i></span>`;

/* ---------- Ana ekran paneli: ders kutucukları ---------- */
function miniOyunlarCiz() {
  const kap = $("#oyun-dersleri");
  if (!kap) return;
  kap.innerHTML = siraliDersler().map(d => `
    <button class="oyun-ders-kutu" data-muf-ders="${d.kod}" style="--renk:${DERS_RENK[d.kod]}">
      <span class="odk-simge">${d.simge}</span><b>${esc(d.ad)}</b><small>${d.uniteler.length} ünite</small></button>`).join("");
  $("#oyun-kartlari").innerHTML = "";
}

/* ---------- Pencere ve gezinme ---------- */
function mufBaslik(yol) {
  const d = DERSLER[muf.ders];
  $("#oyun-baslik").innerHTML = `<span>${d.simge}</span> ${yol.map(esc).join(" › ")}`;
  $("#oyun-geri-tus").hidden = muf.ekran === "ders";
}
function mufOyunuDurdur() { if (miniOyun.ctx) miniOyun.ctx.kapandi = true; miniOyun.ctx = null; }

async function mufPencereAc(dersKod) {
  const d = DERSLER[dersKod];
  if (!d) return;
  mufOyunuDurdur();
  muf.ders = dersKod;
  $("#oyun-pencere").style.setProperty("--renk", DERS_RENK[dersKod]);
  $("#oyun-ses").textContent = oyunSes.acik ? "🔊" : "🔇";
  $("#oyun-alan").innerHTML = `<div class="oyun-yukleniyor">Hazırlanıyor…</div>`;
  oyunIlerleme(0, 0);
  if (!$("#oyun-pencere").open) $("#oyun-pencere").showModal();
  await mufGecmisYenile();
  dersEkrani();
}
async function mufGecmisYenile() {
  try { muf.gecmis = await api("GET", `oyun/${muf.ders}/gecmis`); } catch (_) { muf.gecmis = { sorular: {} }; }
}
function mufGeri() {
  mufOyunuDurdur();
  if (muf.ekran === "atolye-oyun") return diGecmisYenile().then(() => diIslemEkrani(di.islem));
  if (muf.ekran === "atolye-islem") return atolyeEkrani();
  if (muf.ekran === "atolye") return dersEkrani();
  if (muf.ekran === "unite" || !muf.unite) dersEkrani();
  else uniteEkrani(muf.unite);
}

function dersEkrani() {
  const d = DERSLER[muf.ders];
  if (d.yazili && typeof yaziliDersEkrani === "function") return yaziliDersEkrani(d);
  if (d.kelimeDefteri && typeof kdDefterEkrani === "function") return kdDefterEkrani(d);
  muf.ekran = "ders"; muf.unite = null;
  mufBaslik([d.ad]);
  oyunIlerleme(0, 0);
  const son = sonUniteOku(d.kod);
  $("#oyun-alan").innerHTML = `<div class="muf-ust"><h3>Hangi üniteyi çalışmak istersin?</h3><p>Üniteler ders kitabındaki sırayla.</p></div>
    ${d.kod === "matematik" && typeof atolyeKartiHtml === "function" ? `<div class="muf-uniteler atolye-ust">${atolyeKartiHtml()}</div>` : ""}
    <div class="muf-uniteler">${d.uniteler.map(u => `
      <button class="muf-unite${u.no === son ? " son" : ""}" data-muf-unite="${u.no}">
        <span class="mu-no">${u.no}</span>
        <span class="mu-simge">${u.simge}</span>
        <span class="mu-yazi"><b>${esc(u.ad)}</b>${u.kisa ? `<small>${esc(u.kisa)}</small>` : ""}
          ${u.no === son ? `<em>Son çalıştığın ünite</em>` : ""}</span>
        ${cubukHtml(ogrenilmeOrani(u.etkinlikler.flatMap(etkinlikAnahtarlari)))}
      </button>`).join("")}</div>`;
}

function uniteEkrani(u) {
  const d = DERSLER[muf.ders];
  muf.ekran = "unite"; muf.unite = u;
  sonUniteYaz(d.kod, u.no);
  mufBaslik([d.ad, `${u.no}. ${u.ad}`]);
  oyunIlerleme(0, 0);
  const karisikVar = u.etkinlikler.filter(e => ["sikli", "dogruyanlis", "siniflandir"].includes(e.tur)).length >= 2;
  const yaziliUst = d.yazili ? `<p class="muf-yazili-not">📝 Yazılıda bu konudan <b>${u.soru} soru</b> var${u.kod ? ` · <small>${esc(u.kod)}</small>` : ""}</p>` : "";
  $("#oyun-alan").innerHTML = `<div class="muf-ust"><h3>${u.simge} ${esc(u.ad)}</h3>${d.yazili ? yaziliUst : u.kisa ? `<p>${esc(u.kisa)}</p>` : ""}</div>
    <div class="muf-etkinlikler">
      <button class="muf-etkinlik hatirla" data-muf-hatirla><span class="me-simge">📖</span><b>${d.yazili ? "Hap bilgi" : "Hatırla"}</b><small>${u.ozet.length} kısa bilgi kartı</small></button>
      ${u.etkinlikler.map(e => `
        <button class="muf-etkinlik" data-muf-etkinlik="${e.id}"><span class="me-simge">${e.simge}</span><b>${esc(e.ad)}</b>
          <small>${TUR_ADI[e.tur]}</small>${cubukHtml(ogrenilmeOrani(etkinlikAnahtarlari(e)))}</button>`).join("")}
      ${karisikVar ? `<button class="muf-etkinlik karisik" data-muf-karisik><span class="me-simge">🔀</span><b>Karışık Tekrar</b><small>Ünitenin her yerinden 10 soru</small></button>` : ""}
    </div>`;
}

/* ---------- Hatırla kartları ---------- */
// 0.24: kart düz metin ya da {b: başlık, m: metin (**koyu**), c: çizim kodu}
function soruAnahtari(s) {        // 0.24: metinli sorularda anahtar = "SORU:" sonrası (kayıt 200 karakterle kesilir)
  const i = (s || "").lastIndexOf("SORU:");
  return i >= 0 ? s.slice(i + 5).trim() : s;
}
function soruKimligi(x) {          // aynı metinli, farklı çizimli sorular ayrı tutulur
  return soruAnahtari(x.s) + (x.c ? ` [${x.c}]` : "");
}
function zenginMetin(s) {
  return esc(s || "").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
}
function hapKartiHtml(k) {
  if (typeof k === "string") return `<p>${esc(k)}</p>`;
  const metin = esc(k.m || "").replace(/\*\*(.+?)\*\*/g, "<b class=\"hap-terim\">$1</b>").replace(/\n/g, "<br>");
  return `${k.b ? `<h4 class="hap-baslik">${esc(k.b)}</h4>` : ""}${k.c && typeof cizim === "function" ? `<div class="hap-cizim">${cizim(k.c)}</div>` : ""}<p>${metin}</p>`;
}
function hatirlaEkrani(u, i = 0) {
  const d = DERSLER[muf.ders];
  muf.ekran = "hatirla";
  mufBaslik([d.ad, `${u.no}. ${u.ad}`, "Hatırla"]);
  oyunIlerleme(i + 1, u.ozet.length);
  const son = i === u.ozet.length - 1;
  $("#oyun-alan").innerHTML = `<div class="hatirla">
      <div class="hatirla-kart"><span class="hk-no">${i + 1} / ${u.ozet.length}</span>${hapKartiHtml(u.ozet[i])}</div>
      <div class="hatirla-dugmeler">
        <button class="dugme" data-h="geri" ${i ? "" : "disabled"}>◀ Önceki</button>
        ${son ? `<button class="dugme ana" data-h="bitti">Etkinliklere geç ▶</button>` : `<button class="dugme ana" data-h="ileri">Sonraki ▶</button>`}
      </div></div>`;
  const al = $("#oyun-alan");
  al.querySelector("[data-h=geri]").addEventListener("click", () => hatirlaEkrani(u, i - 1));
  const ileri = al.querySelector("[data-h=ileri]");
  if (ileri) ileri.addEventListener("click", () => { sesCal("tik"); hatirlaEkrani(u, i + 1); });
  const bitti = al.querySelector("[data-h=bitti]");
  if (bitti) bitti.addEventListener("click", () => uniteEkrani(u));
}

/* ---------- Oyun bağlamı ---------- */
function mufCtx(u, etiket, oyunId, gecmis) {
  const ctx = miniOyun.ctx = {
    oyun: { id: oyunId || muf.ders, ders: (DERSLER[muf.ders] && DERSLER[muf.ders].anaDers) || muf.ders }, alan: $("#oyun-alan"), gecmis: gecmis || muf.gecmis, kapandi: false,
    etiket: { konu: `${u.no}. ${u.ad}`, ...etiket },
    ilerleme: oyunIlerleme, ses: sesCal,
    cik: () => { mufOyunuDurdur(); mufGecmisYenile().then(() => uniteEkrani(u)); },
    cikYazi: "☰ Üniteye dön",
  };
  ctx.kaydet = k => oyunCevapKaydet(ctx.oyun, k, ctx);
  return ctx;
}
const becerisi = e => ({ beceri: e._bkod || `${muf.ders}.${e.id}`, beceri_adi: e.beceri, etkinlik: e.ad });

/* ---------- Soru kurucular (tek soruluk biçimler) ---------- */
function soruKur(e, x, u) {
  const ortak = { ...becerisi(e), konu: `${u.no}. ${u.ad}` };
  if (e.tur === "sikli") {
    const secenekler = [x.d, ...x.y];
    return { ...ortak, _g: gosterSikli, anahtar: `${e.id}|${soruKimligi(x)}`, ust: e.yonerge ? esc(e.yonerge) : "", soruHtml: zenginMetin(x.s), gorsel: x.c && typeof cizim === "function" ? cizim(x.c) : "",
      secenekler, dogru: x.d, aciklama: esc(x.a), sutun: secenekler.some(s => String(s).length > 26) ? 1 : 2 };
  }
  if (e.tur === "dogruyanlis") {
    return { ...ortak, _g: gosterSikli, anahtar: `${e.id}|${soruKimligi(x)}`, ust: "Bu ifade doğru mu, yanlış mı?", soruHtml: zenginMetin(x.s), gorsel: x.c && typeof cizim === "function" ? cizim(x.c) : "",
      secenekler: ["Doğru", "Yanlış"], karistirma: true, dogru: x.d ? "Doğru" : "Yanlış", aciklama: esc(x.a), sutun: 2,
      sikHtml: s => s === "Doğru" ? "✅ Doğru" : "❌ Yanlış" };
  }
  if (e.tur === "siniflandir") {
    return { ...ortak, _g: gosterSiniflandir, anahtar: `${e.id}|${x.m}`, kart: { simge: x.simge || "", metin: x.m },
      kutular: e.kutular, dogru: x.k, aciklama: x.a ? esc(x.a) : "", yonerge: esc(e.yonerge || "Bu kart hangi kutuya gider?") };
  }
  if (e.tur === "acik" && typeof gosterAcik === "function") {
    return { ...ortak, _g: gosterAcik, anahtar: `${e.id}|${soruKimligi(x)}`, s: x.s, c: x.c, cevap: x.cevap, noktalar: x.noktalar };
  }
  if (e.tur === "sirala") {
    return { ...ortak, _g: gosterSirala, anahtar: `${e.id}|${x.s}`, s: x.s, o: x.o, aciklama: x.a ? esc(x.a) : "" };
  }
  return null;
}
function havuzKur(e, u) {
  const liste = { sikli: e.sorular, dogruyanlis: e.ifadeler, siniflandir: e.kartlar, sirala: e.diziler, acik: e.sorular }[e.tur] || [];
  return liste.map(x => soruKur(e, x, u));
}
const dagit = (kap, s, cevapla) => s._g(kap, s, cevapla);

/* ---------- Motor: sıraya diz ---------- */
function gosterSirala(kap, s, cevapla) {
  let karisik = karistir(s.o);
  for (let i = 0; i < 5 && karisik.every((x, j) => x === s.o[j]); i++) karisik = karistir(s.o);
  const kelimeli = s.o.every(x => !/\s/.test(x) && x.length <= 16);
  const secilen = [];
  const ciz = () => {
    kap.innerHTML = `<div class="soru-ust">Doğru sıraya göre tıkla.</div>
      <div class="soru-metin kucuk">${esc(s.s)}</div>
      <div class="sira-hedef${kelimeli ? " kelimeli" : ""}">${s.o.map((_, i) => `<span class="sira-yuva${secilen[i] != null ? " dolu" : ""}">
        <i>${i + 1}</i>${secilen[i] != null ? esc(karisik[secilen[i]]) : ""}</span>`).join("")}</div>
      <div class="sira-secenekler">${karisik.map((x, i) => `<button class="sira-oge" data-i="${i}" ${secilen.includes(i) ? "disabled" : ""}>${esc(x)}</button>`).join("")}</div>
      <div class="spell-alt"><button class="dugme" data-geri ${secilen.length ? "" : "disabled"}>⌫ Geri al</button>
        <button class="dugme ana" data-kontrol ${secilen.length === s.o.length ? "" : "disabled"}>Kontrol et ✓</button></div>`;
    kap.querySelectorAll(".sira-oge").forEach(b => b.addEventListener("click", () => { secilen.push(+b.dataset.i); sesCal("tik"); ciz(); }));
    kap.querySelector("[data-geri]").addEventListener("click", () => { secilen.pop(); ciz(); });
    kap.querySelector("[data-kontrol]").addEventListener("click", () => {
      const cevap = secilen.map(i => karisik[i]);
      const dogru = cevap.every((x, i) => x === s.o[i]);
      kap.querySelectorAll(".sira-yuva").forEach((y, i) => y.classList.add(cevap[i] === s.o[i] ? "dogru" : "yanlis"));
      kap.querySelectorAll("button").forEach(b => b.disabled = true);
      cevapla(dogru, { cevap: cevap.join(kelimeli ? " " : " → ").slice(0, 30),
        dogruCevap: esc(s.o.join(kelimeli ? " " : " → ")), aciklama: s.aciklama });
    });
  };
  ciz();
}

/* ---------- Motor: harflerle yaz (İngilizce/Almanca) ---------- */
function harfTaslariKur(kelime, almanca) {
  const harfler = kelime.toLocaleLowerCase(almanca ? "de" : "en").split("");
  const havuz = (almanca ? "abcdefghiklmnoprstuwzäöü" : "abcdefghiklmnoprstuwy").split("");
  const ekstra = [];
  while (ekstra.length < Math.min(3, Math.max(2, 10 - harfler.length))) {
    const h = havuz[Math.floor(Math.random() * havuz.length)];
    if (!harfler.includes(h) && !ekstra.includes(h)) ekstra.push(h);
  }
  return karistir([...harfler, ...ekstra]);
}
function gosterYazim(kap, s, cevapla) {
  const almanca = s.almanca != null ? s.almanca : muf.ders === "almanca";
  const hedef = s.en.toLocaleLowerCase(almanca ? "de" : "en");
  const taslar = harfTaslariKur(s.en, almanca).map((h, i) => ({ h, i, kullanildi: false }));
  const dizilen = [];
  const ciz = () => {
    kap.innerHTML = `<div class="soru-ust">${s.yonerge || `Resimdeki şeyin ${almanca ? "Almancasını" : "İngilizcesini"} harflerle yaz.`}</div>
      <div class="spell-resim"><span class="ing-emoji buyuk">${s.e}</span><small>${esc(s.tr)}</small></div>
      <div class="spell-kelime">${hedef.split("").map((_, i) => `<span class="spell-kutu${dizilen[i] != null ? " dolu" : ""}">${dizilen[i] != null ? taslar[dizilen[i]].h : ""}</span>`).join("")}</div>
      <div class="spell-taslar">${taslar.map(t => `<button class="spell-tas" data-t="${t.i}" ${t.kullanildi ? "disabled" : ""}>${t.h}</button>`).join("")}</div>
      <div class="spell-alt"><button class="dugme" data-geri ${dizilen.length ? "" : "disabled"}>⌫ Geri al</button>
        <button class="dugme ana" data-kontrol ${dizilen.length === hedef.length ? "" : "disabled"}>Kontrol et ✓</button></div>`;
    kap.querySelectorAll(".spell-tas").forEach(b => b.addEventListener("click", () => {
      if (dizilen.length >= hedef.length) return;
      const t = taslar[+b.dataset.t]; t.kullanildi = true; dizilen.push(t.i); sesCal("tik"); ciz();
    }));
    kap.querySelector("[data-geri]").addEventListener("click", () => { const son = dizilen.pop(); if (son != null) taslar[son].kullanildi = false; ciz(); });
    kap.querySelector("[data-kontrol]").addEventListener("click", () => {
      const yazilan = dizilen.map(i => taslar[i].h).join("");
      const dogru = yazilan === hedef;
      kap.querySelectorAll(".spell-kutu").forEach((k, i) => k.classList.add(yazilan[i] === hedef[i] ? "dogru" : "yanlis"));
      kap.querySelectorAll("button").forEach(b => b.disabled = true);
      cevapla(dogru, { cevap: yazilan, dogruCevap: esc(s.en), aciklama: `${s.e} <b>${esc(s.en)}</b> = ${esc(s.tr)}` });
    });
  };
  ciz();
}

/* ---------- Etkinlik başlatma ---------- */
async function eslestirmeTurlari(ctx, ciftler) {
  const n = ciftler.length, t1 = n <= 5 ? n : Math.ceil(n / 2);
  const tahtalar = n <= 5 ? [ciftler] : [ciftler.slice(0, t1), ciftler.slice(t1)];
  let dogru = 0, toplam = 0, bas = 0;
  for (const [i, t] of tahtalar.entries()) {
    if (ctx.kapandi) return null;
    const r = await eslestirmeOyna(ctx, t, { yonerge: (tahtalar.length > 1 ? `${i + 1}/${tahtalar.length} — ` : "") + (t[0]._yonerge || "Soldakini seç, sonra sağdaki eşine tıkla."),
      ilerlemeBas: bas, ilerlemeToplam: n });
    bas += t.length; dogru += r.dogru; toplam += r.toplam;
  }
  return { dogru, toplam };
}

async function etkinlikBaslat(u, e) {
  mufOyunuDurdur();
  const d = DERSLER[muf.ders];
  muf.ekran = "oyun";
  mufBaslik([d.ad, `${u.no}. ${u.ad}`, e.ad]);
  const etiket = { etkinlik: e.ad };
  if (e.tur === "oyun") {
    const o = OYUNLAR.find(x => x.id === e.oyun);
    if (!o) return uniteEkrani(u);
    let gecmis = { sorular: {} };
    try { gecmis = await api("GET", `oyun/${o.id}/gecmis`); } catch (_) { /* yok */ }
    const ctx = mufCtx(u, etiket, o.id, gecmis);
    ctx.secenek = { isaretler: e.isaretler, cumleler: e.cumleler };
    ctx.yeniden = () => etkinlikBaslat(u, e);
    ctx.alan.innerHTML = "";
    return o.baslat(ctx);
  }
  const ctx = mufCtx(u, etiket);
  ctx.yeniden = () => etkinlikBaslat(u, e);
  const tekrar = () => etkinlikBaslat(u, e);
  let sonuc;
  if (e.tur === "eslestir" || e.tur === "kelime") {
    const ortak = { ...becerisi(e), konu: `${u.no}. ${u.ad}` };
    let ciftler;
    if (e.tur === "eslestir") {
      ciftler = agirlikliSec(ctx, e.ciftler.map(c => ({ ...ortak, anahtar: `${e.id}|${c.sol}`, sol: c.sol, sag: c.sag,
        aciklama: c.a ? esc(c.a) : "", _yonerge: e.yonerge ? esc(e.yonerge) : "" })), 10);
    } else {
      const secilen = agirlikliSec(ctx, e.kelimeler.map(w => ({ ...w, anahtar: `${e.id}|${w.en}` })), Math.min(10, e.kelimeler.length));
      ciftler = secilen.map((w, i) => {
        const resim = i < Math.ceil(secilen.length / 2);
        return { ...ortak, anahtar: w.anahtar, sol: resim ? w.e : w.tr, sag: w.en,
          solHtml: resim ? `<span class="ing-emoji">${w.e}</span>` : esc(w.tr), aciklama: `${w.e} <b>${esc(w.en)}</b> = ${esc(w.tr)}`,
          _yonerge: resim ? "🖼️ Resmi seç, sonra kelimeye tıkla." : "🇹🇷 Türkçesini seç, sonra kelimeye tıkla." };
      });
    }
    sonuc = await eslestirmeTurlari(ctx, ciftler);
  } else if (e.tur === "acik") {
    sonuc = await turOyna(ctx, agirlikliSec(ctx, havuzKur(e, u), 3), dagit, { tekrarYok: true, dogrudaAciklama: true });
  } else if (e.tur === "yazim") {
    const havuz = e.kelimeler.map(w => ({ ...w, ...becerisi(e), konu: `${u.no}. ${u.ad}`, anahtar: `${e.id}|${w.en}` }));
    sonuc = await turOyna(ctx, agirlikliSec(ctx, havuz, 8), gosterYazim);
  } else {
    const n = e.tur === "sirala" ? 5 : 10;
    sonuc = await turOyna(ctx, agirlikliSec(ctx, havuzKur(e, u), n), dagit, { dogrudaAciklama: e.tur !== "sirala" });
  }
  if (sonuc && !ctx.kapandi) turSonu(ctx, sonuc, { tekrar });
}

async function karisikBaslat(u) {
  mufOyunuDurdur();
  const d = DERSLER[muf.ders];
  muf.ekran = "oyun";
  mufBaslik([d.ad, `${u.no}. ${u.ad}`, "Karışık Tekrar"]);
  const ctx = mufCtx(u, { etkinlik: "Karışık Tekrar" });
  ctx.yeniden = () => karisikBaslat(u);
  const havuz = u.etkinlikler.filter(e => ["sikli", "dogruyanlis", "siniflandir"].includes(e.tur)).flatMap(e => havuzKur(e, u));
  const sonuc = await turOyna(ctx, agirlikliSec(ctx, havuz, 10), dagit, { dogrudaAciklama: true });
  if (sonuc && !ctx.kapandi) turSonu(ctx, sonuc, { tekrar: () => karisikBaslat(u) });
}

/* ---------- Olaylar ---------- */
function mufredatOlaylariniKur() {
  $("#oyun-dersleri").addEventListener("click", e => { const b = e.target.closest("[data-muf-ders]"); if (b) mufPencereAc(b.dataset.mufDers); });
  $("#oyun-alan").addEventListener("click", e => {
    if (!muf.ders) return;
    const d = DERSLER[muf.ders];
    const un = e.target.closest("[data-muf-unite]");
    if (un) { sesCal("tik"); return uniteEkrani(d.uniteler.find(u => u.no === +un.dataset.mufUnite)); }
    if (muf.ekran !== "unite") return;
    if (e.target.closest("[data-muf-hatirla]")) return hatirlaEkrani(muf.unite, 0);
    if (e.target.closest("[data-muf-karisik]")) return karisikBaslat(muf.unite);
    const et = e.target.closest("[data-muf-etkinlik]");
    if (et) { sesCal("tik"); etkinlikBaslat(muf.unite, muf.unite.etkinlikler.find(x => x.id === et.dataset.mufEtkinlik)); }
  });
  $("#oyun-geri-tus").addEventListener("click", mufGeri);
  if (typeof atolyeOlaylariniKur === "function") atolyeOlaylariniKur();
  miniOyunlarCiz();
}
