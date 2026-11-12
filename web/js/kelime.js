/* ÖğretmeniM 0.25 — Kelime Defterim.
   Veli istediği kadar defter açar (İngilizce, Almanca, Maths, Science…), kelimeleri uygulamadan ya da Veli Paneli'nden ekler.
   Her defter Mini Oyunlar penceresinde sanal bir "ders" olarak açılır (kod: kd-<defter id>); oyunlar kelime başına kayıt tutar:
   beceri = "kd.<defter id>", kelime = <kelime id>, bicim = oyun türü (anlam, kelime, esles, yazim, artikel).
   Arın'a sayı gösterilmez: yalnız çubuk ve "öğrendim" işaretleri. Veli şifresi girili iken oynananlar kaydedilmez (cekirdek.js). */
"use strict";

const kd = { defterler: [], kelimeler: [], kutu: {}, yuklendi: false, grup: {}, kart: { sira: [], i: 0, acik: false } };
const KD_DIL = { en: "İngilizce", de: "Almanca", fr: "Fransızca", tr: "Türkçe", diger: "Diğer" };
const KD_SES_DIL = { en: "en-GB", de: "de-DE", fr: "fr-FR", tr: "tr-TR" };
const kdKod = d => "kd-" + d.id.slice(0, 12);
const kdYazi = w => (w.artikel ? w.artikel + " " : "") + w.kelime;
const kdEmoji = w => w.emoji || "📝";
const kdDefter = id => kd.defterler.find(d => d.id === id);

async function kdYukle() {
  try {
    const [def, kel, oz] = await Promise.all([api("GET", "k/kelime_defterleri"), api("GET", "k/kelimeler"), api("GET", "kelime")]);
    kd.defterler = def.sort((a, b) => (a.sira || 0) - (b.sira || 0) || String(a.olusturma).localeCompare(String(b.olusturma)));
    const acik = new Set(kd.defterler.map(d => d.id));
    kd.kelimeler = kel.filter(k => acik.has(k.defter_id));
    kd.kutu = oz.kutu || {};
    kd.zor = new Set(oz.zor || []);
  } catch (_) { return; }
  for (const d of kd.defterler) {
    const kod = kdKod(d);
    DERS_RENK[kod] = d.renk || "#6366F1";
    DERSLER[kod] = { kod, ad: d.ad, simge: d.simge || "📘", anaDers: "kelime", kelimeDefteri: d, uniteler: [] };
  }
  kd.yuklendi = true;
  kdPanelCiz();
}

const kdDefterKelimeleri = (d, grup) => kd.kelimeler.filter(k => k.defter_id === d.id && (!grup || k.grup === grup));
const kdOgrendi = w => (kd.kutu[w.id] || 0) >= 4;
function kdOran(liste) { return liste.length ? liste.filter(kdOgrendi).length / liste.length : 0; }
function kdEtiket(o, gorulen) {
  return o >= 0.85 ? ["Ustasın 🌟", "iyi"] : o >= 0.4 ? ["İlerliyorsun 💪", "orta"] : gorulen ? ["Başladın 🌱", "az"] : ["Yeni", "yok"];
}
const kdGruplar = d => [...new Set(kdDefterKelimeleri(d).map(k => k.grup || ""))].filter(Boolean);

/* ---------- Ana Sayfa paneli ---------- */
function kdPanelCiz() {
  const kap = $("#kelime-kartlari");
  if (!kap || !kd.yuklendi) return;
  const veliMi = typeof veliAktif === "function" && veliAktif();
  $("#kelime-panel").hidden = !kd.defterler.length && !veliMi;
  kap.innerHTML = kd.defterler.map(d => {
    const ks = kdDefterKelimeleri(d), o = kdOran(ks), [et, sinif] = kdEtiket(o, ks.some(k => kd.kutu[k.id] != null));
    return `<button class="kd-kart" data-kd="${d.id}" style="--renk:${d.renk || "#6366F1"}">
      <span class="kd-simge">${esc(d.simge || "📘")}</span>
      <span class="kd-yazi"><b>${esc(d.ad)}</b><small>${ks.length} kelime · ${KD_DIL[d.dil] || ""}</small></span>
      <span class="yk-durum ${sinif}"><span class="muf-cubuk"><i style="width:${Math.round(o * 100)}%"></i></span><em>${et}</em></span>
    </button>`;
  }).join("") + (veliMi ? `<button class="kd-kart kd-yeni" data-kd-yeni><span class="kd-simge">➕</span><span class="kd-yazi"><b>Yeni defter</b><small>İstediğin kadar defter açabilirsin</small></span></button>` : "");
}

/* ---------- Defter ekranı ---------- */
function kdDefterEkrani(dd) {
  const d = kdDefter(dd.kelimeDefteri.id) || dd.kelimeDefteri;
  muf.ekran = "ders"; muf.unite = null;
  mufBaslik([d.ad]);
  oyunIlerleme(0, 0);
  const grup = kd.grup[d.id] || "";
  const hepsi = kdDefterKelimeleri(d), havuz = kdDefterKelimeleri(d, grup), gruplar = kdGruplar(d);
  const yazilabilir = havuz.filter(kdYazilabilir), artikelli = havuz.filter(k => k.artikel);
  const veliMi = veliAktif();
  const az = havuz.length < 4;
  const mod = (kod, simge, ad, alt, kosul = true) => `<button class="muf-etkinlik${kod === "karisik" ? " karisik" : kod === "kart" ? " hatirla" : ""}" data-kd-mod="${kod}" ${kosul ? "" : "disabled"}>
      <span class="me-simge">${simge}</span><b>${ad}</b><small>${alt}</small></button>`;
  $("#oyun-alan").innerHTML = `<div class="muf-ust kd-ust"><h3>${esc(d.simge || "📘")} ${esc(d.ad)}</h3>
      <p>${esc(d.aciklama || "")}${d.aciklama ? " · " : ""}${KD_DIL[d.dil] || ""} · ${hepsi.length} kelime</p>
      <div class="kd-oran">${cubukHtml(kdOran(hepsi))}</div></div>
    ${gruplar.length > 1 ? `<h4 class="kd-baslik">Konular <small>Önce konu konu çalış, en sonda hepsinden sınav ol.</small></h4>
      <div class="kd-konular">${gruplar.map(g => {
        const ks = kdDefterKelimeleri(d, g), o = kdOran(ks);
        return `<button class="kd-konu${g === grup ? " secili" : ""}" data-kd-grup="${esc(g)}"><b>${esc(g)}${o >= 0.85 ? " ✓" : ""}</b><small>${ks.length} kelime</small>${cubukHtml(o)}</button>`;
      }).join("")}
        <button class="kd-konu sinav" data-kd-mod="sinav" ${hepsi.length >= 4 ? "" : "disabled"}><b>🏁 Hepsinden sınav</b><small>Bütün konulardan karışık ${Math.min(20, hepsi.length)} soru</small>${cubukHtml(kdOran(hepsi))}</button></div>
      <h4 class="kd-baslik">${grup ? `📌 ${esc(grup)} <button class="kd-grup" data-kd-grup="">Bütün konular</button>` : "Bütün konular"}</h4>` : ""}
    ${!hepsi.length ? `<div class="kd-bos">Bu defterde henüz kelime yok.${veliMi ? " Aşağıdan ekleyebilirsin." : " Velin kelime ekleyince burada oyunlar açılacak."}</div>` : ""}
    <div class="muf-etkinlikler">
      ${mod("kart", "📖", "Kelime Kartları", "Kelimeye bak, çevir, anlamını gör", havuz.length > 0)}
      ${mod("anlam", "🎯", "Anlamını Bul", "Kelimenin anlamını seç", !az)}
      ${mod("kelime", "🔎", "Kelimeyi Bul", "Anlamı verilen kelimeyi seç", !az)}
      ${mod("esles", "🧩", "Eşleştir", "Kelimeyi anlamıyla eşleştir", !az)}
      ${yazilabilir.length >= 3 ? mod("yazim", "✍️", "Harflerle Yaz", "Kelimeyi harf harf yaz") : ""}
      ${artikelli.length >= 4 ? mod("artikel", "🎩", "der · die · das", "Doğru artikeli seç") : ""}
      ${mod("karisik", "🔀", "Karışık", "Her türden 10 soru", !az)}
      ${mod("liste", "📋", "Kelime Listem", "Bütün kelimeler ve öğrendiklerin", hepsi.length > 0 || veliMi)}
    </div>
    ${az && havuz.length ? `<p class="kd-not">Oyunlar için bu grupta en az 4 kelime olmalı.</p>` : ""}
    ${veliMi ? `<div class="kd-veli"><b>🔒 Veli</b>
      <button class="dugme" data-kd-islem="ekle">➕ Kelime ekle</button>
      <button class="dugme" data-kd-islem="toplu">📥 Toplu ekle</button>
      <button class="dugme" data-kd-islem="defter">⚙️ Defteri düzenle</button></div>` : ""}`;
  const al = $("#oyun-alan");
  al.querySelectorAll("[data-kd-grup]").forEach(b => b.addEventListener("click", () => { kd.grup[d.id] = b.dataset.kdGrup; sesCal("tik"); kdDefterEkrani(dd); }));
  al.querySelectorAll("[data-kd-mod]").forEach(b => b.addEventListener("click", () => { sesCal("tik"); kdModBaslat(d, b.dataset.kdMod); }));
  al.querySelectorAll("[data-kd-islem]").forEach(b => b.addEventListener("click", () => {
    const i = b.dataset.kdIslem;
    if (i === "ekle") kdKelimeFormu(d, null);
    else if (i === "toplu") kdTopluFormu(d);
    else kdDefterFormu(d);
  }));
}
const kdDersi = d => DERSLER[kdKod(d)];
function kdGeriDon(d) { mufOyunuDurdur(); mufGecmisYenile().then(() => kdDefterEkrani(kdDersi(d))); }
const kdYazilabilir = w => /^[\p{L}]{2,12}$/u.test(w.kelime);

/* ---------- Oyun ortak ---------- */
function kdCtx(d, ad) {
  const ctx = miniOyun.ctx = {
    oyun: { id: kdKod(d), ders: "kelime" }, alan: $("#oyun-alan"), gecmis: muf.gecmis, kapandi: false,
    etiket: { konu: "", etkinlik: ad }, ilerleme: oyunIlerleme, ses: sesCal,
    cik: () => kdGeriDon(d), cikYazi: "☰ Deftere dön",
  };
  ctx.kaydet = k => {
    oyunCevapKaydet(ctx.oyun, k, ctx);
    if (k.kelime && !veliAktif()) kd.kutu[k.kelime] = k.dogru ? Math.min(5, (kd.kutu[k.kelime] || 0) + 1) : 1;
  };
  return ctx;
}
function kdAgirlik(w) {
  const k = kd.kutu[w.id];
  const temel = k == null ? 2.5 : [2.5, 3, 2, 1.2, 0.6, 0.3][k];
  return kd.zor && kd.zor.has(w.id) ? temel * 2 + 1 : temel;      // takıldığı kelime: öğrenmiş görünse de sık gelir
}
function kdSec(havuz, n) {
  const kalan = havuz.map(x => ({ x, w: kdAgirlik(x) })), sec = [];
  while (sec.length < n && kalan.length) {
    let r = Math.random() * kalan.reduce((t, k) => t + k.w, 0), i = 0;
    for (; i < kalan.length - 1; i++) { r -= kalan[i].w; if (r <= 0) break; }
    sec.push(kalan.splice(i, 1)[0].x);
  }
  return sec;
}
function kdCeldirici(w, havuz, alan, n = 3) {
  const dogru = alan(w), gorulen = new Set([dogru.toLocaleLowerCase()]);
  const aday = karistir(havuz.filter(x => x.id !== w.id)).sort((a, b) => (b.grup === w.grup) - (a.grup === w.grup));
  const sonuc = [];
  for (const x of aday) {
    const v = alan(x);
    if (!gorulen.has(v.toLocaleLowerCase())) { gorulen.add(v.toLocaleLowerCase()); sonuc.push(v); }
    if (sonuc.length >= n) break;
  }
  return sonuc;
}
function kdSesVar(dil) {
  try { return speechSynthesis.getVoices().some(v => v.lang && v.lang.toLowerCase().startsWith(dil.slice(0, 2).toLowerCase())); } catch (_) { return false; }
}
function kdOkuDugmesi(w, d) {
  if (!("speechSynthesis" in window) || !KD_SES_DIL[d.dil] || !kdSesVar(KD_SES_DIL[d.dil])) return "";
  return `<button class="kd-oku" type="button" data-kd-oku="${esc(kdYazi(w))}" data-dil="${KD_SES_DIL[d.dil]}" title="Dinle">🔊</button>`;
}
function kdOku(metin, dil) {
  try {
    const ses = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith(dil.slice(0, 2).toLowerCase()));
    const u = new SpeechSynthesisUtterance(metin);
    u.lang = dil; if (ses) u.voice = ses; u.rate = 0.85;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (_) { /* ses yok */ }
}
function kdAciklama(w) {
  return `${kdEmoji(w)} <b>${esc(kdYazi(w))}</b> = ${esc(w.anlam)}${w.ornek ? `<br><i>${esc(w.ornek)}</i>` : ""}`;
}
function kdSoru(d, w, bicim, etkinlik) {
  return { anahtar: `${w.id}|${bicim}`, kelime: w.id, bicim, beceri: "kd." + d.id, beceri_adi: ("Kelime: " + d.ad).slice(0, 80),
    konu: w.grup || d.ad, etkinlik };
}
function kdAnlamSorusu(d, w, havuz) {
  return { ...kdSoru(d, w, "anlam", "Anlamını Bul"), _g: gosterSikli, ust: "Bu kelimenin anlamı ne?",
    soruHtml: `<span class="kd-soru"><span class="kd-soru-emoji">${esc(kdEmoji(w))}</span><span class="kd-soru-kelime">${esc(kdYazi(w))}</span>${kdOkuDugmesi(w, d)}</span>`,
    secenekler: [w.anlam, ...kdCeldirici(w, havuz, x => x.anlam)], dogru: w.anlam, aciklama: kdAciklama(w) };
}
function kdKelimeSorusu(d, w, havuz) {
  return { ...kdSoru(d, w, "kelime", "Kelimeyi Bul"), _g: gosterSikli, ust: `${KD_DIL[d.dil] && d.dil !== "tr" ? KD_DIL[d.dil] + "si" : "Kelimesi"} hangisi?`,
    soruHtml: `<span class="kd-soru"><span class="kd-soru-emoji">${esc(kdEmoji(w))}</span><span class="kd-soru-kelime tr">${esc(w.anlam)}</span></span>`,
    secenekler: [kdYazi(w), ...kdCeldirici(w, havuz, kdYazi)], dogru: kdYazi(w), aciklama: kdAciklama(w) };
}
function kdArtikelSorusu(d, w) {
  return { ...kdSoru(d, w, "artikel", "der · die · das"), _g: gosterSikli, ust: "Doğru artikeli seç.", karistirma: true, sutun: 3,
    soruHtml: `<span class="kd-soru"><span class="kd-soru-emoji">${esc(kdEmoji(w))}</span><span class="kd-soru-kelime">___ ${esc(w.kelime)}</span></span><small class="kd-soru-alt">${esc(w.anlam)}</small>`,
    secenekler: ["der", "die", "das"], dogru: w.artikel, aciklama: kdAciklama(w) };
}
function kdYazimSorusu(d, w) {
  return { ...kdSoru(d, w, "yazim", "Harflerle Yaz"), en: w.kelime, e: kdEmoji(w), tr: w.anlam, almanca: d.dil === "de",
    yonerge: `“${w.anlam}” anlamına gelen ${KD_DIL[d.dil] && d.dil !== "tr" ? KD_DIL[d.dil].toLocaleLowerCase("tr") + " " : ""}kelimeyi harflerle yaz.` };
}

async function kdModBaslat(d, mod) {
  mufOyunuDurdur();
  const havuz = kdDefterKelimeleri(d, kd.grup[d.id] || "");
  const tumu = kdDefterKelimeleri(d);
  if (mod === "kart") return kdKartlar(d, havuz);
  if (mod === "liste") return kdListe(d);
  const adlar = { anlam: "Anlamını Bul", kelime: "Kelimeyi Bul", esles: "Eşleştir", yazim: "Harflerle Yaz", artikel: "der · die · das", karisik: "Karışık", sinav: "Hepsinden Sınav" };
  muf.ekran = "oyun";
  mufBaslik([d.ad, adlar[mod]]);
  const ctx = kdCtx(d, adlar[mod]);
  ctx.yeniden = () => kdModBaslat(d, mod);
  const celdiriciHavuzu = havuz.length >= 6 ? havuz : tumu;
  let sonuc;
  if (mod === "esles") {
    const secilen = [], anlamlar = new Set(), kelimeler = new Set();
    for (const w of kdSec(havuz, havuz.length)) {
      const a = w.anlam.toLocaleLowerCase("tr"), k = kdYazi(w).toLocaleLowerCase();
      if (anlamlar.has(a) || kelimeler.has(k)) continue;
      anlamlar.add(a); kelimeler.add(k); secilen.push(w);
      if (secilen.length >= 10) break;
    }
    const ciftler = secilen.map(w => ({ ...kdSoru(d, w, "esles", "Eşleştir"), sol: kdYazi(w), sag: w.anlam,
      solHtml: `<span class="kd-es-emoji">${esc(kdEmoji(w))}</span> ${esc(kdYazi(w))}`, aciklama: kdAciklama(w),
      _yonerge: "Kelimeyi seç, sonra anlamına tıkla." }));
    sonuc = await eslestirmeTurlari(ctx, ciftler);
  } else {
    let sorular;
    if (mod === "anlam") sorular = kdSec(havuz, 10).map(w => kdAnlamSorusu(d, w, celdiriciHavuzu));
    else if (mod === "kelime") sorular = kdSec(havuz, 10).map(w => kdKelimeSorusu(d, w, celdiriciHavuzu));
    else if (mod === "artikel") sorular = kdSec(havuz.filter(w => w.artikel), 10).map(w => kdArtikelSorusu(d, w));
    else if (mod === "yazim") sorular = kdSec(havuz.filter(kdYazilabilir), 8).map(w => ({ ...kdYazimSorusu(d, w), _g: gosterYazim }));
    else if (mod === "sinav") {
      // Her konudan eşit pay; konu içinde az bilinen kelimeler öne
      const gruplar = kdGruplar(d), pay = Math.max(1, Math.ceil(20 / Math.max(1, gruplar.length)));
      let secilen = gruplar.length ? gruplar.flatMap(g => kdSec(tumu.filter(w => w.grup === g), pay)) : kdSec(tumu, 20);
      secilen = karistir(secilen).slice(0, 20);
      sorular = secilen.map((w, i) => {
        if (w.artikel && i % 4 === 1) return kdArtikelSorusu(d, w);
        if (kdYazilabilir(w) && i % 5 === 4) return { ...kdYazimSorusu(d, w), _g: gosterYazim };
        return (i % 2 ? kdKelimeSorusu : kdAnlamSorusu)(d, w, tumu);
      });
      const yanlis = {};
      const kaydet = ctx.kaydet;
      ctx.kaydet = k => { kaydet(k); if (!k.dogru) { const w = tumu.find(x => x.id === k.kelime); if (w) yanlis[w.grup || "Diğer"] = (yanlis[w.grup || "Diğer"] || new Set()).add(w.id); } };
      sonuc = await turOyna(ctx, sorular, dagit, { dogrudaAciklama: true, tekrarYok: true });
      if (sonuc && !ctx.kapandi) {
        const konular = Object.entries(yanlis).sort((a, b) => b[1].size - a[1].size);
        const not = konular.length ? `Bir daha çalışman gereken konular: ${konular.map(([g, s]) => `<b>${esc(g)}</b> (${s.size} kelime)`).join(", ")}. Konuya tıklayıp kartlarla tekrar et.`
          : "Bütün konuları biliyorsun. 🌟";
        turSonu(ctx, sonuc, { tekrar: () => kdModBaslat(d, mod), not });
      }
      return;
    }
    else sorular = kdSec(havuz, 10).map((w, i) => {
      const secenek = [kdAnlamSorusu, kdKelimeSorusu];
      if (w.artikel) secenek.push((dd, ww) => kdArtikelSorusu(dd, ww));
      if (kdYazilabilir(w) && i % 3 === 2) return { ...kdYazimSorusu(d, w), _g: gosterYazim };
      return secenek[Math.floor(Math.random() * secenek.length)](d, w, celdiriciHavuzu);
    });
    sonuc = await turOyna(ctx, sorular, dagit, { dogrudaAciklama: true });
  }
  if (sonuc && !ctx.kapandi) turSonu(ctx, sonuc, { tekrar: () => kdModBaslat(d, mod) });
}

/* ---------- Kelime kartları (öğrenme; kayıt tutulmaz) ---------- */
function kdKartlar(d, havuz) {
  muf.ekran = "kd-kart";
  mufBaslik([d.ad, "Kelime Kartları"]);
  kd.kart = { sira: havuz.slice().sort((a, b) => (kd.kutu[a.id] ?? -1) - (kd.kutu[b.id] ?? -1) || Math.random() - 0.5), i: 0, acik: false, d };
  kdKartCiz();
}
function kdKartCiz() {
  const { sira, i, acik, d } = kd.kart, w = sira[i];
  oyunIlerleme(i + 1, sira.length);
  $("#oyun-alan").innerHTML = `<div class="kd-kartlar">
      <div class="kd-buyuk-kart${acik ? " acik" : ""}" data-kd-cevir>
        <span class="kd-kart-no">${i + 1} / ${sira.length}${kdOgrendi(w) ? " · ✓ öğrendin" : ""}</span>
        <span class="kd-kart-emoji">${esc(kdEmoji(w))}</span>
        <span class="kd-kart-kelime">${esc(kdYazi(w))} ${kdOkuDugmesi(w, d)}</span>
        ${acik ? `<span class="kd-kart-anlam">${esc(w.anlam)}</span>${w.ornek ? `<span class="kd-kart-ornek">${esc(w.ornek)}</span>` : ""}`
          : `<span class="kd-kart-ipucu">Anlamını düşün, sonra karta tıkla</span>`}
      </div>
      <div class="hatirla-dugmeler">
        <button class="dugme" data-k="geri" ${i ? "" : "disabled"}>◀ Önceki</button>
        <button class="dugme" data-k="cevir">${acik ? "🙈 Kapat" : "👀 Çevir"}</button>
        ${i < sira.length - 1 ? `<button class="dugme ana" data-k="ileri">Sonraki ▶</button>` : `<button class="dugme ana" data-k="bitti">Oyunlara geç ▶</button>`}
      </div></div>`;
  const al = $("#oyun-alan");
  const cevir = () => { kd.kart.acik = !kd.kart.acik; sesCal("tik"); kdKartCiz(); };
  al.querySelector("[data-kd-cevir]").addEventListener("click", e => { if (!e.target.closest("[data-kd-oku]")) cevir(); });
  al.querySelector("[data-k=cevir]").addEventListener("click", cevir);
  al.querySelector("[data-k=geri]").addEventListener("click", () => { kd.kart.i--; kd.kart.acik = false; kdKartCiz(); });
  const ileri = al.querySelector("[data-k=ileri]");
  if (ileri) ileri.addEventListener("click", () => { kd.kart.i++; kd.kart.acik = false; sesCal("tik"); kdKartCiz(); });
  const bitti = al.querySelector("[data-k=bitti]");
  if (bitti) bitti.addEventListener("click", () => kdDefterEkrani(kdDersi(d)));
}

/* ---------- Kelime listesi (veli: düzenle / sil) ---------- */
function kdListe(d) {
  muf.ekran = "kd-liste";
  mufBaslik([d.ad, "Kelime Listem"]);
  oyunIlerleme(0, 0);
  const veliMi = veliAktif();
  const ks = kdDefterKelimeleri(d);
  const gruplar = [...new Set(ks.map(k => k.grup || ""))];
  const durum = w => kdOgrendi(w) ? `<span class="kd-d iyi" title="Öğrendin">✓</span>` : kd.kutu[w.id] != null ? `<span class="kd-d orta" title="Çalışıyorsun">●</span>` : `<span class="kd-d" title="Yeni">○</span>`;
  $("#oyun-alan").innerHTML = `<div class="kd-liste">
    ${veliMi ? `<div class="kd-veli"><b>🔒 Veli</b><button class="dugme" data-kd-islem="ekle">➕ Kelime ekle</button><button class="dugme" data-kd-islem="toplu">📥 Toplu ekle</button></div>` : ""}
    <p class="kd-not">✓ öğrendin · ● çalışıyorsun · ○ yeni</p>
    ${gruplar.map(g => `<h4>${esc(g || "Diğer")}</h4><div class="kd-tablo">${ks.filter(k => (k.grup || "") === g).map(w => `<div class="kd-satir">
        ${durum(w)}<span class="kd-s-emoji">${esc(kdEmoji(w))}</span><b>${esc(kdYazi(w))}</b>${kdOkuDugmesi(w, d)}<span class="kd-s-anlam">${esc(w.anlam)}</span>
        ${veliMi ? `<span class="kd-s-islem"><button class="dugme kucuk" data-kd-duzenle="${w.id}" title="Düzenle">✏️</button><button class="dugme kucuk" data-kd-sil="${w.id}" title="Sil">🗑</button></span>` : ""}
      </div>`).join("")}</div>`).join("")}
    ${!ks.length ? `<div class="kd-bos">Henüz kelime yok.</div>` : ""}</div>`;
  const al = $("#oyun-alan");
  al.querySelectorAll("[data-kd-islem]").forEach(b => b.addEventListener("click", () => b.dataset.kdIslem === "ekle" ? kdKelimeFormu(d, null, true) : kdTopluFormu(d)));
  al.querySelectorAll("[data-kd-duzenle]").forEach(b => b.addEventListener("click", () => kdKelimeFormu(d, kd.kelimeler.find(k => k.id === b.dataset.kdDuzenle), true)));
  al.querySelectorAll("[data-kd-sil]").forEach(b => b.addEventListener("click", async () => {
    const w = kd.kelimeler.find(k => k.id === b.dataset.kdSil);
    if (!w || !confirm(`“${kdYazi(w)}” silinsin mi?`)) return;
    try { await api("DELETE", "k/kelimeler/" + w.id); await kdYukle(); kdListe(d); } catch (h) { bildir(h.message, true); }
  }));
}

/* ---------- Veli formları ---------- */
function kdFormIskelet(d, baslik, govde, geri) {
  muf.ekran = "kd-form";
  if (d && DERSLER[muf.ders]) mufBaslik([d.ad, baslik]);
  else { $("#oyun-baslik").innerHTML = `<span>📚</span> Kelime Defterim › ${esc(baslik)}`; $("#oyun-geri-tus").hidden = true; }
  oyunIlerleme(0, 0);
  $("#oyun-alan").innerHTML = `<form class="kd-form" autocomplete="off"><h3>${baslik}</h3>${govde}
    <div class="kd-form-dugmeler"><button type="button" class="dugme" data-kd-vazgec>Vazgeç</button><button type="submit" class="dugme ana">Kaydet</button></div></form>`;
  $("#oyun-alan").querySelector("[data-kd-vazgec]").addEventListener("click", geri);
  return $("#oyun-alan").querySelector(".kd-form");
}
function kdKelimeFormu(d, w, listeye) {
  const geri = () => listeye ? kdListe(d) : kdDefterEkrani(kdDersi(d));
  const gruplar = kdGruplar(d);
  const f = kdFormIskelet(d, w ? "Kelimeyi düzenle" : "Kelime ekle", `
    <div class="kd-form-izgara">
      ${d.dil === "de" ? `<label>Artikel<select name="artikel"><option value="">—</option>${["der", "die", "das"].map(a => `<option ${w && w.artikel === a ? "selected" : ""}>${a}</option>`).join("")}</select></label>` : ""}
      <label>Kelime<input name="kelime" required maxlength="60" value="${esc(w ? w.kelime : "")}"></label>
      <label>Anlamı (Türkçe)<input name="anlam" required maxlength="80" value="${esc(w ? w.anlam : "")}"></label>
      <label>Emoji / resim<input name="emoji" maxlength="8" value="${esc(w ? w.emoji || "" : "")}" placeholder="🍎"></label>
      <label>Grup<input name="grup" maxlength="40" list="kd-grup-listesi" value="${esc(w ? w.grup || "" : kd.sonGrup || kd.grup[d.id] || "")}"></label>
      <datalist id="kd-grup-listesi">${gruplar.map(g => `<option value="${esc(g)}">`).join("")}</datalist>
      <label class="genis">Örnek cümle (isteğe bağlı)<input name="ornek" maxlength="200" value="${esc(w ? w.ornek || "" : "")}"></label>
    </div>${w ? "" : `<label class="kd-tekrar"><input type="checkbox" name="devam" checked> Kaydedince yeni kelimeye geç</label>`}`, geri);
  f.elements.kelime.focus();
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const al = a => f.elements[a] ? f.elements[a].value.trim() : "";
    const kayit = { defter_id: d.id, kelime: al("kelime"), anlam: al("anlam"), emoji: al("emoji"), grup: al("grup"), ornek: al("ornek") };
    if (d.dil === "de") {
      kayit.artikel = al("artikel");
      const m = /^(der|die|das)\s+(.+)$/i.exec(kayit.kelime);
      if (m) { kayit.artikel = m[1].toLowerCase(); kayit.kelime = m[2]; }
    }
    try {
      if (w) await api("PUT", "k/kelimeler/" + w.id, kayit); else await api("POST", "k/kelimeler", kayit);
      await kdYukle();
      bildir(w ? "Kelime güncellendi" : `“${kayit.kelime}” eklendi`);
      kd.sonGrup = kayit.grup;
      if (!w && f.elements.devam && f.elements.devam.checked) kdKelimeFormu(d, null, listeye); else geri();
    } catch (h) { bildir(h.message, true); }
  });
}
function kdSatirlariCoz(metin, dil, grup) {
  return metin.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(s => {
    const p = s.split(/\s*(?:=|\t|;| - | – )\s*/);
    if (p.length < 2 || !p[0] || !p[1]) return null;
    const k = { kelime: p[0], anlam: p[1], grup: p[2] || grup, emoji: p[3] || "" };
    if (dil === "de") { const m = /^(der|die|das)\s+(.+)$/i.exec(k.kelime); if (m) { k.artikel = m[1].toLowerCase(); k.kelime = m[2]; } }
    return k;
  });
}
function kdTopluFormu(d) {
  const f = kdFormIskelet(d, "Toplu kelime ekle", `
    <p class="kd-not">Her satıra bir kelime yaz: <code>kelime = anlam</code>${d.dil === "de" ? " (isimlerde artikel başta: <code>der Tisch = masa</code>)" : ""}.
      İstersen sonuna grup ekle: <code>apple = elma = Fruits</code>. Excel'den iki sütun kopyalayıp yapıştırabilirsin. Defterde olan kelimenin anlamı güncellenir.</p>
    <label>Grup (satırda yazılmadıysa)<input name="grup" maxlength="40" list="kd-grup-listesi" value="${esc(kd.grup[d.id] || "")}"></label>
    <datalist id="kd-grup-listesi">${kdGruplar(d).map(g => `<option value="${esc(g)}">`).join("")}</datalist>
    <textarea name="metin" rows="12" placeholder="${d.dil === "de" ? "der Apfel = elma\ndie Banane = muz" : "apple = elma\nbanana = muz"}"></textarea>
    <p class="kd-onizleme"></p>`, () => kdDefterEkrani(kdDersi(d)));
  const onizle = () => {
    const satir = f.elements.metin.value.split(/\r?\n/).filter(s => s.trim()).length;
    const cozulen = kdSatirlariCoz(f.elements.metin.value, d.dil, f.elements.grup.value.trim());
    const hatali = cozulen.filter(x => !x).length;
    f.querySelector(".kd-onizleme").textContent = satir ? `${cozulen.length - hatali} kelime eklenecek${hatali ? ` · ${hatali} satır anlaşılamadı (“=” eksik olabilir)` : ""}` : "";
  };
  f.elements.metin.addEventListener("input", onizle); f.elements.grup.addEventListener("input", onizle);
  f.elements.metin.focus();
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const kelimeler = kdSatirlariCoz(f.elements.metin.value, d.dil, f.elements.grup.value.trim()).filter(Boolean);
    if (!kelimeler.length) return bildir("Eklenecek satır yok", true);
    try {
      const s = await api("POST", "kelime/toplu", { defter_id: d.id, kelimeler });
      await kdYukle();
      bildir(`${s.eklenen} kelime eklendi${s.guncellenen ? `, ${s.guncellenen} güncellendi` : ""}`);
      kdDefterEkrani(kdDersi(d));
    } catch (h) { bildir(h.message, true); }
  });
}
function kdDefterFormu(d) {
  const geri = () => d ? kdDefterEkrani(kdDersi(d)) : oyunKapat();
  const f = kdFormIskelet(d, d ? "Defteri düzenle" : "Yeni kelime defteri", `
    <div class="kd-form-izgara">
      <label>Defter adı<input name="ad" required maxlength="40" value="${esc(d ? d.ad : "")}" placeholder="Örn. Maths, Science, Fransızca"></label>
      <label>Dil<select name="dil">${Object.entries(KD_DIL).map(([k, v]) => `<option value="${k}" ${(d ? d.dil : "en") === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label>Simge<input name="simge" maxlength="8" value="${esc(d ? d.simge || "" : "📘")}"></label>
      <label>Renk<input name="renk" type="color" value="${d ? d.renk || "#6366F1" : "#6366F1"}"></label>
      <label class="genis">Açıklama<input name="aciklama" maxlength="160" value="${esc(d ? d.aciklama || "" : "")}" placeholder="Örn. Fen terimlerinin İngilizcesi"></label>
    </div>
    ${d ? `<p class="kd-sil-alan"><button type="button" class="dugme sil" data-kd-defter-sil>🗑 Defteri sil</button> <small>Kelimeler ve istatistikleri de görünmez olur.</small></p>` : ""}`, geri);
  f.elements.ad.focus();
  const sil = f.querySelector("[data-kd-defter-sil]");
  if (sil) sil.addEventListener("click", async () => {
    if (!confirm(`“${d.ad}” defteri silinsin mi?`)) return;
    try { await api("DELETE", "k/kelime_defterleri/" + d.id); await kdYukle(); bildir("Defter silindi"); oyunKapat(); } catch (h) { bildir(h.message, true); }
  });
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const al = a => f.elements[a].value.trim();
    const kayit = { ad: al("ad"), dil: al("dil"), simge: al("simge") || "📘", renk: al("renk"), aciklama: al("aciklama") };
    try {
      let yeni = d;
      if (d) await api("PUT", "k/kelime_defterleri/" + d.id, kayit);
      else yeni = await api("POST", "k/kelime_defterleri", { ...kayit, sira: kd.defterler.length });
      await kdYukle();
      bildir(d ? "Defter güncellendi" : "Defter açıldı");
      await mufPencereAc(kdKod(yeni));
    } catch (h) { bildir(h.message, true); }
  });
}
async function kdYeniDefter() {
  if (!veliAktif()) return;
  $("#oyun-pencere").style.setProperty("--renk", "#6366F1");
  if (!$("#oyun-pencere").open) $("#oyun-pencere").showModal();
  $("#oyun-geri-tus").hidden = true;
  kdDefterFormu(null);
}

function kelimeOlaylariniKur() {
  document.addEventListener("click", e => {
    const ok = e.target.closest("[data-kd-oku]");
    if (ok) { e.stopPropagation(); return kdOku(ok.dataset.kdOku, ok.dataset.dil); }
    const k = e.target.closest("[data-kd]");
    if (k && kd.yuklendi) { sesCal("tik"); const d = kdDefter(k.dataset.kd); if (d) mufPencereAc(kdKod(d)); return; }
    if (e.target.closest("[data-kd-yeni]")) { sesCal("tik"); kdYeniDefter(); }
  });
  $("#oyun-pencere").addEventListener("close", () => { if (kd.yuklendi) kdYukle(); });
  kdYukle();
}
