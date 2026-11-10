/* ÖğretmeniM — ödevin plan bilgileri (0.17): kaynaklar, sayfa ayrıştırma, haftalık liste girişi.
   sayfaCoz / birimler / parcaMetni, planlayici.py'deki karşılıklarıyla aynı sonucu verir (araclar testinde karşılaştırılır). */
"use strict";

/* ODEVPLAN_ORTAK_BAS — bu bölüm Veli Paneli'ne de gömülür (veli/derle.py); yalnız tarihStr ve strTarih'e dayanır */
const ADET_DESENI = /(\d+)\s+(soru|etkinlik|test|kitap|sayfa|yaprak|metin|çalışma kağıdı|çalışma kâğıdı|çalışma|okuma|ünite)(?![a-zçğıöşü])/g;
function trKucuk(m) { return String(m || "").replace(/I/g, "ı").replace(/İ/g, "i").toLowerCase(); }

function sayfaCoz(metin) {
  let m = trKucuk(metin);
  const adet = {};
  m = m.replace(ADET_DESENI, (_, n, ad) => { ad = ad.startsWith("çalışma") ? "çalışma kâğıdı" : ad; adet[ad] = (adet[ad] || 0) + Number(n); return " "; });
  m = m.replace(/\(?\s*\d+\s*dahil\s*\)?/g, " ");
  const sayfalar = new Set();
  m = m.replace(/(\d+)\s*(?:-|–|—|ile)\s*(\d+)/g, (_, a, b) => {
    a = Number(a); b = Number(b); if (a > b) [a, b] = [b, a];
    if (b - a <= 300) for (let i = a; i <= b; i++) sayfalar.add(i);
    return " ";
  });
  for (const s of m.match(/\d+/g) || []) if (Number(s) > 0 && Number(s) < 2000) sayfalar.add(Number(s));
  const sonuc = { sayfalar: [...sayfalar].sort((a, b) => a - b).slice(0, 400), adet };
  if (!sonuc.sayfalar.length) {
    for (const ad of ["sayfa", "kitap", "çalışma kâğıdı", "test", "yaprak", "metin", "okuma", "ünite"])
      if (adet[ad]) { sonuc.birim_adi = ad; sonuc.birim_sayisi = Math.min(adet[ad], 60); break; }
  }
  return sonuc;
}

function birimler(kaynaklar) {
  const liste = [];
  (kaynaklar || []).forEach((k, i) => {
    const c = sayfaCoz(k.sayfa);
    if (c.sayfalar.length) c.sayfalar.forEach(s => liste.push({ k: i, tur: "sayfa", no: s }));
    else if (c.birim_sayisi) for (let n = 0; n < c.birim_sayisi; n++) liste.push({ k: i, tur: "adet", no: n + 1, ad: c.birim_adi });
    else liste.push({ k: i, tur: "tum" });
  });
  return liste.length ? liste : [{ k: -1, tur: "tum" }];
}

function araliklarYaz(sayilar) {
  const p = []; let bas = null, onceki = null;
  for (const s of sayilar) {
    if (bas === null) bas = onceki = s;
    else if (s === onceki + 1) onceki = s;
    else { p.push([bas, onceki]); bas = onceki = s; }
  }
  if (bas !== null) p.push([bas, onceki]);
  return p.map(([a, b]) => a === b ? String(a) : `${a}–${b}`).join(", ");
}

function parcaMetni(kaynaklar, bl, bas, bit) {
  kaynaklar = kaynaklar || [];
  const secilen = bl.slice(bas, bit), tumu = bas === 0 && bit >= bl.length, p = [];
  for (const k of [...new Set(secilen.map(b => b.k))].sort((a, b) => a - b)) {
    const ad = (kaynaklar[k] && kaynaklar[k].ad) || "";
    const bunlar = secilen.filter(b => b.k === k), tur = bunlar[0].tur;
    if (tur === "sayfa") p.push(`${ad} s. ${araliklarYaz(bunlar.map(b => b.no))}`.trim());
    else if (tur === "adet") {
      const toplam = bl.filter(b => b.k === k).length;
      p.push((bunlar.length === toplam ? `${ad} (${toplam} ${bunlar[0].ad})` : `${ad} ${araliklarYaz(bunlar.map(b => b.no))}. ${bunlar[0].ad}`).trim());
    } else {
      const ham = (kaynaklar[k] && kaynaklar[k].sayfa) || "";
      p.push((ad + (ham && tumu ? " — " + ham : "")).trim() || "Ödevin tamamı");
    }
  }
  return p.filter(Boolean).join(" · ") || "Ödevin tamamı";
}

function birimEtiketi(kaynaklar, b) {
  const ad = (kaynaklar[b.k] && kaynaklar[b.k].ad) || "";
  if (b.tur === "sayfa") return `${ad} s. ${b.no}`.trim();
  if (b.tur === "adet") return `${ad} ${b.no}. ${b.ad}`.trim();
  return ad || "Ödevin tamamı";
}

// Kısa özet: "14 sayfa · 29 soru · 2 etkinlik"
function sayfaOzeti(kaynaklar) {
  let sayfa = 0; const adet = {};
  for (const k of kaynaklar || []) {
    const c = sayfaCoz(k.sayfa);
    sayfa += c.sayfalar.length;
    for (const [a, n] of Object.entries(c.adet)) adet[a] = (adet[a] || 0) + n;
  }
  sayfa += adet.sayfa || 0;
  delete adet.sayfa;
  const p = sayfa ? [`${sayfa} sayfa`] : [];
  for (const [a, n] of Object.entries(adet)) p.push(`${n} ${a}`);
  return p.join(" · ");
}

/* ---------- Metinden tarih, süre, ders ---------- */
const AY_ADLARI = ["ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık"];
function metindenTarih(metin, referans = new Date()) {
  const m = trKucuk(metin).trim();
  let r = m.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (r) return m;
  r = m.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?$/);
  if (r) {
    const y = r[3] ? (r[3].length === 2 ? 2000 + Number(r[3]) : Number(r[3])) : referans.getFullYear();
    return tarihStr(new Date(y, Number(r[2]) - 1, Number(r[1])));
  }
  r = m.match(/^(\d{1,2})\s+([a-zçğıöşü]+)(?:\s+(\d{4}))?/);
  if (r) {
    const ay = AY_ADLARI.findIndex(a => r[2].startsWith(a.slice(0, 3)));
    if (ay >= 0) return tarihStr(new Date(r[3] ? Number(r[3]) : referans.getFullYear(), ay, Number(r[1])));
  }
  return "";
}
function metindenSure(metin) { const r = String(metin || "").match(/\d+/); return r ? Number(r[0]) : ""; }
// Açıklamadan "Cuma gününden sonra yapınız" → en erken tarih; "yayarak / sıkıştırmadan" → yay
const GUN_KOKLERI = ["pazar", "pazartesi", "salı", "çarşamba", "perşembe", "cuma", "cumartesi"];
function aciklamadanIpucu(aciklama, teslim) {
  const a = trKucuk(aciklama), ipucu = {};
  if (/yay(arak|ılarak|ın|)\b|sıkıştırma/.test(a)) ipucu.yay = true;
  const r = a.match(/(pazartesi|salı|çarşamba|perşembe|cumartesi|cuma|pazar)\s+(?:gününden|günden|dan|den)\s+sonra/);
  if (r && teslim) {
    const hedef = GUN_KOKLERI.indexOf(r[1]);
    let t = strTarih(teslim);
    for (let i = 0; i < 8; i++) { t = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1); if (t.getDay() === hedef) break; }
    ipucu.en_erken = tarihStr(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1));
  }
  return ipucu;
}
/* 0.20: kaynak adı açılır listeden seçilir (dersin kayıtlı kaynakları); "＋ Yeni kaynak yaz…" ile elle yazılır.
   Değerin asıl yeri yine .kaynak-ad kutusudur; liste yalnız onu doldurur. */
const KAYNAK_YENI = "__yeni__";
const KAYNAK_DUZENLE = "__duzenle__";      // 0.29: listeden kaynak silme
function kaynakGizliSuz(liste, gizli) {
  const g = new Set((gizli || []).map(a => String(a).toLocaleLowerCase("tr")));
  return g.size ? liste.filter(a => !g.has(a.toLocaleLowerCase("tr"))) : liste;
}
function kaynakDuzenleHtml(liste) {
  return `<div class="kaynak-duzenle"><div class="kd-ust"><b>Kayıtlı kaynaklar</b><small>Sildiğin kaynak açılır listeden kalkar; önceki ödevler değişmez.</small>
      <button type="button" class="baglanti" data-kaynak-duzenle-kapat>Kapat</button></div>
    <div class="kd-cipler">${liste.length ? liste.map(a => `<span class="kaynak-cip">${esc(a)}<button type="button" data-kaynak-kaldir="${esc(a)}" title="Listeden sil">🗑</button></span>`).join("")
      : "<small>Listede kaynak kalmadı.</small>"}</div></div>`;
}
function kaynakAdiHtml(ad) {
  return `<span class="kaynak-secim"><select class="kaynak-sec" aria-label="Kaynak" hidden></select><input class="kaynak-ad" maxlength="80" placeholder="Kaynak adı (ör. Atölyem Matematik)" value="${esc(ad || "")}"></span>`;
}
function kaynakListesiBirlestir(...listeler) {
  const s = [], g = new Set();
  for (const l of listeler) for (const a of l || []) { const k = String(a || "").trim(); if (k && !g.has(k.toLocaleLowerCase("tr"))) { g.add(k.toLocaleLowerCase("tr")); s.push(k); } }
  return s;
}
function kaynakSecimiDoldur(satir, liste) {
  const sec = satir.querySelector(".kaynak-sec"), inp = satir.querySelector(".kaynak-ad");
  if (!sec || !inp) return;
  const deger = inp.value.trim();
  if (!liste.length) { sec.hidden = true; inp.hidden = false; return; }
  const bulunan = liste.find(a => a.toLocaleLowerCase("tr") === deger.toLocaleLowerCase("tr"));
  sec.innerHTML = `<option value="">Kaynak seç…</option>` + liste.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join("") +
    `<option value="${KAYNAK_YENI}">＋ Yeni kaynak yaz…</option><option value="${KAYNAK_DUZENLE}">🗑 Listeden kaynak sil…</option>`;
  sec.hidden = false;
  if (bulunan) { sec.value = bulunan; inp.value = bulunan; inp.hidden = true; }
  else if (deger) { sec.value = KAYNAK_YENI; inp.hidden = false; }
  else { sec.value = ""; inp.hidden = true; }
}
function kaynakSecimDegisti(sec) {
  const inp = sec.closest(".kaynak-secim").querySelector(".kaynak-ad");
  if (sec.value === KAYNAK_YENI) { inp.value = ""; inp.hidden = false; inp.focus(); }
  else { inp.value = sec.value; inp.hidden = true; }
  inp.dispatchEvent(new Event("input", { bubbles: true }));
}
/* ODEVPLAN_ORTAK_BIT */

function dersEslestir(ad) {
  const a = trKucuk(ad).replace(/\s+/g, " ").trim();
  if (!a) return "";
  const liste = aktifDersler();
  const tam = liste.find(d => trKucuk(d.ad) === a || trKucuk(d.kisa || "") === a);
  if (tam) return tam.id;
  const bas = liste.find(d => trKucuk(d.ad).startsWith(a) || a.startsWith(trKucuk(d.ad)) || (d.kisa && a.startsWith(trKucuk(d.kisa))));
  return bas ? bas.id : "";
}

/* ---------- Ödev formu: kaynak satırları ---------- */
function gecmisKaynaklar(dersId) {
  const say = new Map();
  for (const o of aktifOdevler()) for (const k of o.kaynaklar || [])
    if (k.ad && (!dersId || o.ders_id === dersId)) say.set(k.ad, (say.get(k.ad) || 0) + 1);
  return [...say.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
}
function odevPlanAlanlariHtml(k) {
  const kaynaklar = (k.kaynaklar && k.kaynaklar.length) ? k.kaynaklar : [{ ad: "", sayfa: "" }];
  return `<div class="genis kaynak-alani">
      <span class="ek-baslik">Kaynaklar <small>(kitap adı ve sayfa/soru; birden çok olabilir)</small></span>
      <div id="kaynak-satirlari">${kaynaklar.map(kaynakSatiriHtml).join("")}</div>
      <button type="button" class="dugme kucuk" id="kaynak-ekle">＋ Kaynak ekle</button>
    </div>
    <label>Tahmini süre (dk)<input type="number" name="sure" min="1" max="600" step="1" placeholder="Örn. 30" value="${k.sure || ""}"></label>
    <label>Ödev türü<input name="odev_turu" maxlength="80" placeholder="Konu pekiştirme" value="${esc(k.odev_turu || "")}"></label>
    <label>Öğretmenin kontrol şekli<input name="kontrol" maxlength="80" placeholder="Ders içi kontrol" value="${esc(k.kontrol || "")}"></label>
    <label>En erken başlama <small>(isteğe bağlı)</small><input type="date" name="en_erken" value="${k.en_erken || ""}"></label>
    <input type="checkbox" name="yay" hidden${k.yay ? " checked" : ""}>`;      // 0.20: yayma kararını planlayıcı verir
}
function kaynakSatiriHtml(k) {
  return `<div class="kaynak-satir">
    ${kaynakAdiHtml(k.ad)}
    <input class="kaynak-sayfa" maxlength="120" placeholder="Sayfa / soru (ör. 27-32, 16 soru)" value="${esc(k.sayfa || "")}">
    <button type="button" class="kaynak-sil" title="Kaynağı çıkar">✕</button>
    <small class="kaynak-onizleme"></small></div>`;
}
function kaynakAlaniKur(form) {
  const kap = $("#kaynak-satirlari", form);
  if (!kap) return;
  const dersId = () => form.elements.ders_id && form.elements.ders_id.value;
  const liste = () => { const id = dersId(); const d = dersBul(id) || {}; return id ? kaynakGizliSuz(kaynakListesiBirlestir(d.kaynaklar, gecmisKaynaklar(id)), d.kaynak_gizli) : []; };
  const oneriDoldur = () => { const l = liste(); $$(".kaynak-satir", kap).forEach(s => kaynakSecimiDoldur(s, l)); };
  const duzenleCiz = () => { const k = $(".kaynak-duzenle", form); if (k) k.outerHTML = kaynakDuzenleHtml(liste()); };
  kap.addEventListener("change", e => {
    if (!e.target.classList.contains("kaynak-sec")) return;
    if (e.target.value === KAYNAK_DUZENLE) {                 // 0.29: kayıtlı kaynakları sil
      kaynakSecimiDoldur(e.target.closest(".kaynak-satir"), liste());
      if (!$(".kaynak-duzenle", form)) kap.insertAdjacentHTML("afterend", kaynakDuzenleHtml(liste()));
      return;
    }
    kaynakSecimDegisti(e.target);
  });
  form.addEventListener("click", async e => {
    if (e.target.closest("[data-kaynak-duzenle-kapat]")) { const k = $(".kaynak-duzenle", form); if (k) k.remove(); return; }
    const b = e.target.closest("[data-kaynak-kaldir]");
    if (!b) return;
    if (typeof veliAktif === "function" && !veliAktif()) return bildir("Kaynak silmek için veli şifresi gerekir (Ayarlar).", true);
    try {
      const ders = dersBul(dersId());
      Object.assign(ders, await api("POST", "ders_kaynak_sil", { ders_id: dersId(), ad: b.dataset.kaynakKaldir }));
      bildir(`“${b.dataset.kaynakKaldir}” listeden silindi`);
      duzenleCiz(); oneriDoldur();
    } catch (h) { bildir(h.message, true); }
  });
  const onizle = satir => { const s = sayfaOzeti([{ sayfa: $(".kaynak-sayfa", satir).value }]); $(".kaynak-onizleme", satir).textContent = s ? "→ " + s : ""; };
  $$(".kaynak-satir", kap).forEach(onizle);
  oneriDoldur();
  if (form.elements.ders_id) form.elements.ders_id.addEventListener("change", oneriDoldur);
  kap.addEventListener("input", e => { const s = e.target.closest(".kaynak-satir"); if (s) onizle(s); });
  kap.addEventListener("click", e => {
    const sil = e.target.closest(".kaynak-sil");
    if (!sil || sil.disabled) return;
    if ($$(".kaynak-satir", kap).length > 1) sil.closest(".kaynak-satir").remove();
    else { $$("input", sil.closest(".kaynak-satir")).forEach(i => (i.value = "")); kaynakSecimiDoldur(sil.closest(".kaynak-satir"), liste()); }
  });
  $("#kaynak-ekle", form).addEventListener("click", () => {
    if ($$(".kaynak-satir", kap).length >= 6) return bildir("En çok 6 kaynak", true);
    kap.insertAdjacentHTML("beforeend", kaynakSatiriHtml({}));
    const yeni = $(".kaynak-satir:last-child", kap);
    kaynakSecimiDoldur(yeni, liste());
    (yeni.querySelector(".kaynak-sec:not([hidden])") || yeni.querySelector(".kaynak-ad")).focus();
  });
}
function kaynaklariOku(form) {
  return $$(".kaynak-satir", form).map(s => ({ ad: $(".kaynak-ad", s).value.trim(), sayfa: $(".kaynak-sayfa", s).value.trim() }))
    .filter(k => k.ad || k.sayfa);
}
function odevPlanAlanlariniOku(form) {
  const sure = form.elements.sure.value.trim();
  if (sure && (isNaN(Number(sure)) || Number(sure) < 1 || Number(sure) > 600)) throw new Error("Süre 1–600 dakika arasında olmalı");
  return { kaynaklar: kaynaklariOku(form), sure: sure ? Math.round(Number(sure)) : null, odev_turu: form.elements.odev_turu.value.trim(),
           kontrol: form.elements.kontrol.value.trim(), en_erken: form.elements.en_erken.value, yay: form.elements.yay.checked };
}

/* ---------- Haftalık liste (tablo) ---------- */
const LISTE_SUTUNLAR = [
  ["ders", "Ders"], ["kaynak", "Kaynak"], ["sayfa", "Sayfa / soru"], ["tur", "Ödev türü"], ["sure", "Süre (dk)"],
  ["kontrol", "Kontrol şekli"], ["teslim", "Teslim"], ["aciklama", "Açıklama"], ["en_erken", "En erken"], ["yay", "Yay"],
];
function listeSatiriHtml(v = {}) {
  return `<tr class="liste-satir">
    <td><select data-a="ders">${dersSecenekleri(v.ders || "", "—")}</select></td>
    <td><input data-a="kaynak" value="${esc(v.kaynak || "")}" placeholder="Kitap / Kitap 2"></td>
    <td><input data-a="sayfa" value="${esc(v.sayfa || "")}" placeholder="27-32 / 15-22"><small class="liste-onizleme"></small></td>
    <td><input data-a="tur" value="${esc(v.tur || "")}" placeholder="Konu pekiştirme"></td>
    <td><input data-a="sure" type="number" min="1" max="600" value="${v.sure || ""}" class="dar"></td>
    <td><input data-a="kontrol" value="${esc(v.kontrol || "")}" placeholder="Ders içi kontrol"></td>
    <td><input data-a="teslim" type="date" value="${v.teslim || ""}"></td>
    <td><textarea data-a="aciklama" rows="1">${esc(v.aciklama || "")}</textarea></td>
    <td><input data-a="en_erken" type="date" value="${v.en_erken || ""}"></td>
    <td class="orta" hidden><input data-a="yay" type="checkbox"${v.yay ? " checked" : ""}></td>
    <td><button type="button" class="kaynak-sil" data-satir-sil title="Satırı sil">✕</button></td></tr>`;
}
function listeAc() {
  $("#liste-tablo").innerHTML = `<tr>${LISTE_SUTUNLAR.filter(([a]) => a !== "yay").map(([, b]) => `<th>${b}</th>`).join("")}<th></th></tr>` +
    Array.from({ length: 8 }, () => listeSatiriHtml()).join("");
  $("#liste-bilgi").textContent = "";
  $("#liste-pencere").showModal();
  $("#liste-tablo select").focus();
}
function listeSatiriOnizle(tr) {
  const v = listeSatiriOku(tr);
  const n = v.kaynaklar.length, oz = sayfaOzeti(v.kaynaklar);
  const uyar = n > 1 && v.sayfaParca !== n ? " ⚠ kaynak sayısı ile sayfa grubu uymuyor" : "";
  $(".liste-onizleme", tr).textContent = (oz ? oz : "") + (n > 1 ? ` · ${n} kaynak` : "") + uyar;
}
function listeSatiriOku(tr) {
  const al = a => { const e = $(`[data-a="${a}"]`, tr); return e.type === "checkbox" ? e.checked : e.value.trim(); };
  const adlar = al("kaynak").split("/").map(x => x.trim()).filter(Boolean);
  const sayfalar = al("sayfa").split("/").map(x => x.trim());
  let kaynaklar;
  if (adlar.length > 1 && sayfalar.length === adlar.length) kaynaklar = adlar.map((ad, i) => ({ ad, sayfa: sayfalar[i] }));
  else if (adlar.length > 1) kaynaklar = adlar.map((ad, i) => ({ ad, sayfa: i === 0 ? al("sayfa") : "" }));
  else kaynaklar = (adlar[0] || al("sayfa")) ? [{ ad: adlar[0] || "", sayfa: al("sayfa") }] : [];
  return { ders_id: al("ders"), kaynaklar, sayfaParca: sayfalar.filter(Boolean).length, odev_turu: al("tur"), sure: al("sure"),
           kontrol: al("kontrol"), teslim: al("teslim"), aciklama: al("aciklama"), en_erken: al("en_erken"), yay: al("yay") };
}
// Tablo yapıştırma: sekmeyle ayrılmış satırlar (Excel, Word, PDF tablosu). İlk satır başlıksa sütunlar adına göre eşlenir.
function listeYapistir(e) {
  const metin = (e.clipboardData || window.clipboardData).getData("text");
  if (!metin.includes("\t") && !metin.includes("\n")) return;
  e.preventDefault();
  let satirlar = metin.replace(/\r/g, "").split("\n").filter(s => s.trim()).map(s => s.split("\t"));
  let sira = ["ders", "kaynak", "sayfa", "tur", "sure", "kontrol", "teslim", "aciklama"];
  const bas = satirlar[0].map(trKucuk);
  if (bas.some(h => h.includes("ders")) && bas.some(h => h.includes("teslim"))) {
    sira = bas.map(h => h.includes("ders") ? "ders" : h.includes("kaynak") ? "kaynak" : h.includes("sayfa") || h.includes("soru") ? "sayfa" :
      h.includes("tür") || h.includes("tur") ? "tur" : h.includes("süre") || h.includes("dk") ? "sure" : h.includes("kontrol") ? "kontrol" :
      h.includes("teslim") ? "teslim" : h.includes("açıklama") || h.includes("aciklama") ? "aciklama" : "");
    satirlar = satirlar.slice(1);
  }
  const tablo = $("#liste-tablo");
  let bos = $$(".liste-satir", tablo).filter(tr => !listeSatiriOku(tr).ders_id && !listeSatiriOku(tr).kaynaklar.length);
  let okunan = 0;
  for (const s of satirlar) {
    const v = {};
    sira.forEach((a, i) => { if (a) v[a] = (s[i] || "").replace(/\s+/g, " ").trim(); });
    if (!v.ders && !v.kaynak) continue;
    const kayit = { ders: dersEslestir(v.ders), kaynak: v.kaynak, sayfa: v.sayfa, tur: v.tur, sure: metindenSure(v.sure),
                    kontrol: v.kontrol, teslim: metindenTarih(v.teslim || ""), aciklama: v.aciklama };
    Object.assign(kayit, aciklamadanIpucu(v.aciklama, kayit.teslim));
    const tr = bos.shift();
    if (tr) tr.outerHTML = listeSatiriHtml(kayit); else tablo.insertAdjacentHTML("beforeend", listeSatiriHtml(kayit));
    okunan++;
  }
  $$(".liste-satir", tablo).forEach(listeSatiriOnizle);
  $("#liste-bilgi").textContent = `${okunan} satır yapıştırıldı. Ders ve tarihleri kontrol et.`;
}
async function listeKaydet(e) {
  e.preventDefault();
  const satirlar = $$("#liste-tablo .liste-satir").map(tr => ({ tr, v: listeSatiriOku(tr) }))
    .filter(x => x.v.ders_id || x.v.kaynaklar.length || x.v.aciklama);
  if (!satirlar.length) return bildir("Listeye en az bir ödev yaz", true);
  for (const { tr, v } of satirlar) {
    tr.classList.remove("hatali");
    if (!v.ders_id || !v.teslim) { tr.classList.add("hatali"); return bildir("Her satırda ders ve teslim tarihi olmalı", true); }
  }
  let kaydedilen = 0;
  try {
    for (const { tr, v } of satirlar) {
      const govde = { ders_id: v.ders_id, teslim: v.teslim, baslik: "", aciklama: v.aciklama, kaynaklar: v.kaynaklar,
                      sure: v.sure ? Number(v.sure) : null, odev_turu: v.odev_turu, kontrol: v.kontrol, en_erken: v.en_erken, yay: v.yay, bitti: false, ekler: [] };
      if (!govde.kaynaklar.length) govde.baslik = (v.odev_turu || v.aciklama || "Ödev").slice(0, 120);
      durum.veri.koleksiyonlar.odevler.push(await api("POST", "k/odevler", govde));
      tr.remove();
      kaydedilen++;
    }
    $("#liste-pencere").close();
    bildir(`${kaydedilen} ödev kaydedildi; plan yenilendi`);
    herSeyiYenile();
    planYukle();
  } catch (hata) { bildir(`${kaydedilen} ödev kaydedildi; sonra hata: ${hata.message}`, true); herSeyiYenile(); }
}
function listeOlaylariniKur() {
  $("#liste-ac").addEventListener("click", listeAc);
  $("#liste-vazgec").addEventListener("click", () => $("#liste-pencere").close());
  $("#liste-satir-ekle").addEventListener("click", () => $("#liste-tablo").insertAdjacentHTML("beforeend", listeSatiriHtml()));
  $("#liste-form").addEventListener("submit", listeKaydet);
  const tablo = $("#liste-tablo");
  tablo.addEventListener("paste", listeYapistir);
  tablo.addEventListener("input", e => { const tr = e.target.closest(".liste-satir"); if (tr) listeSatiriOnizle(tr); });
  tablo.addEventListener("change", e => {
    const tr = e.target.closest(".liste-satir");
    if (!tr || !["aciklama", "teslim"].includes(e.target.dataset.a)) return;
    const v = listeSatiriOku(tr), ip = aciklamadanIpucu(v.aciklama, v.teslim);
    if (ip.yay) $('[data-a="yay"]', tr).checked = true;
    if (ip.en_erken && !v.en_erken) $('[data-a="en_erken"]', tr).value = ip.en_erken;
  });
  tablo.addEventListener("click", e => { const s = e.target.closest("[data-satir-sil]"); if (s) s.closest("tr").remove(); });
}
