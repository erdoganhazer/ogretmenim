/* ÖğretmeniM — Faz 4: Defterler (Ders › Ünite › Konu › Notlar) */
"use strict";

const defter = { ders: null, unite: null, konu: null, arama: "", acikDersler: new Set(), acikUniteler: new Set(), duzenlenen: null, sinif: null };
const defterSinifi = () => defter.sinif ?? aktifSinif();

/* ---------- Veri yardımcıları ---------- */
const siraliAktif = (koleksiyon, suzgec) => durum.veri.koleksiyonlar[koleksiyon]
  .filter(k => !k.silindi && suzgec(k)).sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0) || a.olusturma.localeCompare(b.olusturma));
const dersUniteleri = dersId => siraliAktif("uniteler", u => u.ders_id === dersId);
const uniteKonulari = uniteId => siraliAktif("konular", k => k.unite_id === uniteId);
const konuNotlari = konuId => siraliAktif("notlar", n => n.konu_id === konuId);
const bul = (koleksiyon, id) => durum.veri.koleksiyonlar[koleksiyon].find(k => k.id === id && !k.silindi);
const sonrakiSira = liste => liste.reduce((m, k) => Math.max(m, k.sira ?? 0), -1) + 1;

/* ---------- Ad sorma penceresi ---------- */
function adSor(baslik, varsayilan = "") {
  return new Promise(coz => {
    const p = $("#ad-pencere");
    $("#ad-baslik").textContent = baslik;
    const kutu = $("#ad-kutu");
    kutu.value = varsayilan;
    const bitir = deger => { p.close(); $("#ad-form").onsubmit = null; $("#ad-vazgec").onclick = null; p.oncancel = null; coz(deger); };
    $("#ad-form").onsubmit = e => { e.preventDefault(); const d = kutu.value.trim(); if (d) bitir(d); };
    $("#ad-vazgec").onclick = () => bitir(null);
    p.oncancel = e => { e.preventDefault(); bitir(null); };
    p.showModal();
    kutu.focus(); kutu.select();
  });
}

/* ---------- Basit metin biçimi: **kalın**, "- " ile madde, boş satırla paragraf ---------- */
function notMetni(metin) {
  const satirlar = esc(metin || "").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").split("\n");
  let html = "", liste = false;
  for (const satir of satirlar) {
    const madde = satir.match(/^\s*[-•*]\s+(.*)$/);
    if (madde) { if (!liste) { html += "<ul>"; liste = true; } html += `<li>${madde[1]}</li>`; continue; }
    if (liste) { html += "</ul>"; liste = false; }
    html += satir.trim() ? `<p>${satir}</p>` : "";
  }
  return html + (liste ? "</ul>" : "");
}

/* ---------- Sol ağaç ---------- */
function agacCiz() {
  const kap = $("#defter-agac");
  if (!kap || !durum.veri) return;
  sinifSeciciDoldur($("#defter-sinif"), defterSinifi());
  kap.innerHTML = sinifDersleri(defterSinifi()).map(d => {
    const uniteler = dersUniteleri(d.id);
    const acik = defter.acikDersler.has(d.id);
    const konuSayisi = uniteler.reduce((t, u) => t + uniteKonulari(u.id).length, 0);
    let html = `<div class="agac-satir agac-ders${defter.ders === d.id && !defter.unite ? " secili" : ""}" data-ders="${d.id}" style="--renk:${esc(d.renk)}">
      <button class="agac-ok" data-ac-ders="${d.id}">${acik ? "▾" : "▸"}</button>
      <span class="agac-ad" title="${esc(d.ad)}">${esc(d.ad)}</span>${konuSayisi ? `<span class="agac-sayi">${konuSayisi}</span>` : ""}
      <button class="agac-dugme" data-islem="unite-ekle" data-id="${d.id}" title="Ünite ekle">＋</button></div>`;
    if (acik) {
      if (!uniteler.length) html += `<div class="agac-bos">Henüz ünite yok — ＋ ile ekle</div>`;
      for (const u of uniteler) {
        const uAcik = defter.acikUniteler.has(u.id);
        html += `<div class="agac-satir agac-unite${defter.unite === u.id && !defter.konu ? " secili" : ""}" data-unite="${u.id}">
          <button class="agac-ok" data-ac-unite="${u.id}">${uAcik ? "▾" : "▸"}</button>
          <span class="agac-ad" title="${esc(u.ad)}">${esc(u.ad)}</span>
          <button class="agac-dugme" data-islem="konu-ekle" data-id="${u.id}" title="Konu ekle">＋</button>
          <button class="agac-dugme" data-islem="unite-ad" data-id="${u.id}" title="Adını değiştir">✎</button>
          <button class="agac-dugme sil" data-islem="unite-sil" data-id="${u.id}" title="Üniteyi sil">✕</button></div>`;
        if (uAcik) {
          const konular = uniteKonulari(u.id);
          if (!konular.length) html += `<div class="agac-bos derin">Henüz konu yok — ＋ ile ekle</div>`;
          for (const k of konular) {
            const n = konuNotlari(k.id).length;
            html += `<div class="agac-satir agac-konu${defter.konu === k.id ? " secili" : ""}" data-konu="${k.id}">
              <span class="agac-ad" title="${esc(k.ad)}">${esc(k.ad)}</span>${n ? `<span class="agac-sayi">${n}</span>` : ""}
              <button class="agac-dugme" data-islem="konu-ad" data-id="${k.id}" title="Adını değiştir">✎</button>
              <button class="agac-dugme sil" data-islem="konu-sil" data-id="${k.id}" title="Konuyu sil">✕</button></div>`;
          }
        }
      }
    }
    return html;
  }).join("");
}

async function agacTiklandi(e) {
  const islem = e.target.closest("[data-islem]");
  if (islem) { e.stopPropagation(); return agacIslemi(islem.dataset.islem, islem.dataset.id); }
  const acD = e.target.closest("[data-ac-ders]"), acU = e.target.closest("[data-ac-unite]");
  if (acD) { const id = acD.dataset.acDers; defter.acikDersler.has(id) ? defter.acikDersler.delete(id) : defter.acikDersler.add(id); return agacCiz(); }
  if (acU) { const id = acU.dataset.acUnite; defter.acikUniteler.has(id) ? defter.acikUniteler.delete(id) : defter.acikUniteler.add(id); return agacCiz(); }
  const konu = e.target.closest("[data-konu]"), unite = e.target.closest("[data-unite]"), ders = e.target.closest("[data-ders]");
  if (konu) return konuSec(konu.dataset.konu);
  if (unite) { const u = bul("uniteler", unite.dataset.unite); defter.acikUniteler.add(u.id); return sec(u.ders_id, u.id, null); }
  if (ders) { defter.acikDersler.add(ders.dataset.ders); return sec(ders.dataset.ders, null, null); }
}

function sec(ders, unite, konu) {
  if (defter.duzenlenen) {
    editordenOku();
    const d = defter.duzenlenen;
    if ((d.baslik || d.metin || (d.fotolar || []).length) && !confirm("Kaydedilmemiş bir not var. Kaydetmeden çıkılsın mı?")) return;
  }
  Object.assign(defter, { ders, unite, konu, duzenlenen: null, arama: "" });
  $("#defter-arama").value = "";
  agacCiz();
  icerikCiz();
}
function konuSec(konuId) {
  const k = bul("konular", konuId), u = k && bul("uniteler", k.unite_id);
  if (!k || !u) return;
  defter.acikDersler.add(u.ders_id); defter.acikUniteler.add(u.id);
  sec(u.ders_id, u.id, k.id);
}

async function agacIslemi(islem, id) {
  try {
    if (islem === "unite-ekle") {
      const ad = await adSor(`${bul("dersler", id).ad} — yeni ünite`, `${dersUniteleri(id).length + 1}. Ünite: `);
      if (!ad) return;
      const u = await api("POST", "k/uniteler", { ders_id: id, ad, sira: sonrakiSira(dersUniteleri(id)) });
      durum.veri.koleksiyonlar.uniteler.push(u);
      defter.acikDersler.add(id); defter.acikUniteler.add(u.id);
      return sec(id, u.id, null);
    }
    if (islem === "konu-ekle") {
      const ad = await adSor(`${bul("uniteler", id).ad} — yeni konu`);
      if (!ad) return;
      const k = await api("POST", "k/konular", { unite_id: id, ad, sira: sonrakiSira(uniteKonulari(id)) });
      durum.veri.koleksiyonlar.konular.push(k);
      return konuSec(k.id);
    }
    if (islem === "unite-ad" || islem === "konu-ad") {
      const kol = islem === "unite-ad" ? "uniteler" : "konular";
      const kayit = bul(kol, id);
      const ad = await adSor("Yeni ad", kayit.ad);
      if (!ad || ad === kayit.ad) return;
      Object.assign(kayit, await api("PUT", `k/${kol}/${id}`, { ad }));
      agacCiz(); icerikCiz();
      return;
    }
    if (islem === "unite-sil") {
      const u = bul("uniteler", id), konular = uniteKonulari(id);
      const notSayisi = konular.reduce((t, k) => t + konuNotlari(k.id).length, 0);
      if (!confirm(`"${u.ad}" silinsin mi?${konular.length ? `\nİçindeki ${konular.length} konu ve ${notSayisi} not da silinecek.` : ""}`)) return;
      for (const k of konular) await konuyuSil(k);
      await api("DELETE", "k/uniteler/" + id); u.silindi = true;
      if (defter.unite === id) sec(defter.ders, null, null); else agacCiz();
      return;
    }
    if (islem === "konu-sil") {
      const k = bul("konular", id), n = konuNotlari(id).length;
      if (!confirm(`"${k.ad}" konusu silinsin mi?${n ? `\nİçindeki ${n} not da silinecek.` : ""}`)) return;
      await konuyuSil(k);
      if (defter.konu === id) sec(defter.ders, defter.unite, null); else agacCiz();
    }
  } catch (hata) { bildir(hata.message, true); }
}

async function konuyuSil(k) {
  for (const n of konuNotlari(k.id)) { await api("DELETE", "k/notlar/" + n.id); n.silindi = true; }
  await api("DELETE", "k/konular/" + k.id); k.silindi = true;
}

/* ---------- Sağ taraf ---------- */
function yol(dersId, uniteId, konuId) {
  const parca = [];
  const d = bul("dersler", dersId), u = uniteId && bul("uniteler", uniteId), k = konuId && bul("konular", konuId);
  if (d) parca.push(`<button class="yol-parca" data-git-ders="${d.id}">${esc(d.ad)}</button>`);
  if (u) parca.push(`<button class="yol-parca" data-git-unite="${u.id}">${esc(u.ad)}</button>`);
  if (k) parca.push(`<span>${esc(k.ad)}</span>`);
  return `<div class="defter-yol">${parca.join(" › ")}</div>`;
}

function icerikCiz() {
  const kap = $("#defter-icerik");
  if (!kap || !durum.veri) return;
  if (defter.arama) return aramaCiz(kap);
  if (defter.konu) return konuCiz(kap);
  if (defter.unite) {
    const u = bul("uniteler", defter.unite), konular = uniteKonulari(u.id);
    kap.innerHTML = yol(defter.ders, u.id) + `<h2 class="defter-baslik">${esc(u.ad)}</h2>
      <div class="defter-kartlar">${konular.map(k => `<button class="defter-kart" data-konu-ac="${k.id}">
        <b>${esc(k.ad)}</b><small>${konuNotlari(k.id).length} not</small></button>`).join("")}
        <button class="defter-kart ekle" data-islem="konu-ekle" data-id="${u.id}">＋ Konu ekle</button></div>`;
    return;
  }
  if (defter.ders) {
    const d = bul("dersler", defter.ders), uniteler = dersUniteleri(d.id);
    kap.innerHTML = yol(d.id) + `<h2 class="defter-baslik" style="--renk:${esc(d.renk)}">${esc(d.ad)} defteri</h2>
      <div class="defter-kartlar">${uniteler.map(u => `<button class="defter-kart" data-unite-ac="${u.id}">
        <b>${esc(u.ad)}</b><small>${uniteKonulari(u.id).length} konu</small></button>`).join("")}
        <button class="defter-kart ekle" data-islem="unite-ekle" data-id="${d.id}">＋ Ünite ekle</button></div>`;
    return;
  }
  const toplamNot = durum.veri.koleksiyonlar.notlar.filter(n => !n.silindi).length;
  const son = siraliAktif("notlar", () => true).sort((a, b) => b.degisme.localeCompare(a.degisme)).slice(0, 5);
  kap.innerHTML = `<div class="panel bos-durum"><div class="bos-ikon">📚</div>Soldan bir ders seç, ünite ve konu ekleyerek defterini oluştur.
      <small>${toplamNot ? `Defterlerinde toplam ${toplamNot} not var.` : "Her konuya yazı ve fotoğraf ekleyebilirsin."}</small></div>
    ${son.length ? `<h3 class="defter-alt-baslik">Son eklenen notlar</h3><div class="defter-kartlar">${son.map(n => {
      const k = bul("konular", n.konu_id);
      return k ? `<button class="defter-kart" data-konu-ac="${k.id}"><b>${esc(k.ad)}</b><small>${esc(n.baslik || (n.metin || "").slice(0, 60) || "fotoğraflı not")}</small></button>` : "";
    }).join("")}</div>` : ""}`;
}

function notKarti(n) {
  if (defter.duzenlenen && defter.duzenlenen.id === n.id) return notEditoru(defter.duzenlenen);
  const t = new Date(n.degisme);
  return `<article class="not-kart${n.onemli ? " onemli" : ""}" data-not="${n.id}">
    ${n.onemli ? `<div class="not-rozet-onemli">⭐ Önemli</div>` : ""}
    ${n.baslik ? `<h3>${esc(n.baslik)}</h3>` : ""}
    <div class="not-metin">${notMetni(n.metin)}</div>
    ${(n.fotolar || []).length ? `<div class="not-fotolar">${n.fotolar.map(f => `<img src="${esc(f)}" alt="" data-buyut="${esc(f)}" loading="lazy">`).join("")}</div>` : ""}
    <footer><span>${t.getDate()} ${AYLAR[t.getMonth()]} ${t.getFullYear()}</span>
      <button class="dugme kucuk" data-not-islem="duzenle" data-id="${n.id}">✎ Düzenle</button>
      <button class="dugme kucuk sil" data-not-islem="sil" data-id="${n.id}">Sil</button></footer>
  </article>`;
}

function notEditoru(d) {
  return `<article class="not-kart duzenleniyor" data-not="${d.id || "yeni"}">
    <input class="not-baslik-kutu" placeholder="Başlık (isteğe bağlı)" maxlength="120" value="${esc(d.baslik || "")}">
    <textarea class="not-metin-kutu" rows="7" placeholder="Notunu yaz… (**kalın** yazmak için iki yıldız, madde için satır başına - koy. Fotoğrafı buraya yapıştırabilirsin: Ctrl+V)">${esc(d.metin || "")}</textarea>
    <div class="not-fotolar duzen">${(d.fotolar || []).map((f, i) => `<span class="foto-kutu"><img src="${esc(f)}" alt=""><button data-foto-sil="${i}" title="Fotoğrafı çıkar">✕</button></span>`).join("")}</div>
    <footer>
      <label class="dugme kucuk">📷 Fotoğraf ekle<input type="file" accept="image/*" multiple hidden class="not-foto-sec"></label>
      <label class="anahtar kucuk-anahtar"><input type="checkbox" class="not-onemli"${d.onemli ? " checked" : ""}> ⭐ Önemli</label>
      <span class="bosluk"></span>
      <button class="dugme kucuk" data-not-islem="vazgec">Vazgeç</button>
      <button class="dugme kucuk ana-dugme" data-not-islem="kaydet">Kaydet</button>
    </footer>
  </article>`;
}

function konuCiz(kap) {
  const k = bul("konular", defter.konu);
  if (!k) return sec(defter.ders, defter.unite, null);
  const notlar = konuNotlari(k.id);
  const yeni = defter.duzenlenen && !defter.duzenlenen.id ? notEditoru(defter.duzenlenen) : "";
  kap.innerHTML = yol(defter.ders, defter.unite, k.id) + `
    <div class="defter-ust"><h2 class="defter-baslik">${esc(k.ad)}</h2>
      <button class="dugme ana-dugme" data-not-islem="yeni"${defter.duzenlenen ? " disabled" : ""}>＋ Not ekle</button></div>
    <div class="not-listesi">${notlar.map(notKarti).join("")}${yeni}
      ${!notlar.length && !yeni ? `<div class="panel bos-durum">Bu konuda henüz not yok. Öğretmenin anlattıklarını, önemli kuralları ya da tahtanın fotoğrafını ekleyebilirsin.</div>` : ""}</div>`;
  const editor = $(".not-kart.duzenleniyor", kap);
  if (editor) editorKur(editor);
}

function editorKur(editor) {
  const metin = $(".not-metin-kutu", editor);
  metin.focus();
  metin.addEventListener("paste", async e => {
    const dosyalar = [...(e.clipboardData?.items || [])].filter(i => i.type.startsWith("image/")).map(i => i.getAsFile());
    if (!dosyalar.length) return;
    e.preventDefault();
    await fotolariYukle(dosyalar);
  });
  editor.addEventListener("dragover", e => e.preventDefault());
  editor.addEventListener("drop", async e => {
    const dosyalar = [...e.dataTransfer.files].filter(f => f.type.startsWith("image/"));
    if (!dosyalar.length) return;
    e.preventDefault();
    await fotolariYukle(dosyalar);
  });
  $(".not-foto-sec", editor).addEventListener("change", e => fotolariYukle([...e.target.files]));
}

function editordenOku() {
  const ed = $(".not-kart.duzenleniyor");
  if (!ed || !defter.duzenlenen) return;
  defter.duzenlenen.baslik = $(".not-baslik-kutu", ed).value;
  defter.duzenlenen.metin = $(".not-metin-kutu", ed).value;
  defter.duzenlenen.onemli = $(".not-onemli", ed).checked;
}

async function fotolariYukle(dosyalar) {
  editordenOku();
  for (const dosya of dosyalar) {
    if (dosya.size > 15 * 1024 * 1024) { bildir("Fotoğraf 15 MB'tan küçük olmalı", true); continue; }
    try {
      const { yol } = await api("POST", "foto", dosya);
      defter.duzenlenen.fotolar = [...(defter.duzenlenen.fotolar || []), yol];
    } catch (hata) { bildir(hata.message, true); }
  }
  icerikCiz();
}

async function notIslemi(islem, id) {
  if (islem === "yeni") { defter.duzenlenen = { baslik: "", metin: "", fotolar: [], onemli: false }; return icerikCiz(); }
  if (islem === "duzenle") {
    if (defter.duzenlenen) return bildir("Önce açık notu kaydet ya da vazgeç", true);
    const n = bul("notlar", id);
    defter.duzenlenen = { id: n.id, baslik: n.baslik || "", metin: n.metin || "", fotolar: [...(n.fotolar || [])], onemli: Boolean(n.onemli) };
    return icerikCiz();
  }
  if (islem === "vazgec") { defter.duzenlenen = null; return icerikCiz(); }
  if (islem === "kaydet") {
    editordenOku();
    const d = defter.duzenlenen;
    if (!d.baslik.trim() && !d.metin.trim() && !(d.fotolar || []).length) return bildir("Boş not kaydedilemez", true);
    const govde = { baslik: d.baslik.trim(), metin: d.metin.trim(), fotolar: d.fotolar || [], onemli: d.onemli };
    try {
      if (d.id) Object.assign(bul("notlar", d.id), await api("PUT", "k/notlar/" + d.id, govde));
      else durum.veri.koleksiyonlar.notlar.push(await api("POST", "k/notlar",
        { ...govde, konu_id: defter.konu, sira: sonrakiSira(konuNotlari(defter.konu)) }));
      defter.duzenlenen = null;
      bildir("Not kaydedildi");
      agacCiz(); icerikCiz();
    } catch (hata) { bildir(hata.message, true); }
    return;
  }
  if (islem === "sil") {
    if (!confirm("Bu not silinsin mi?")) return;
    try { await api("DELETE", "k/notlar/" + id); bul("notlar", id).silindi = true; agacCiz(); icerikCiz(); }
    catch (hata) { bildir(hata.message, true); }
  }
}

/* ---------- Arama ---------- */
function kucult(s) { return String(s || "").toLocaleLowerCase("tr-TR"); }
function aramaCiz(kap) {
  const q = kucult(defter.arama);
  const sonuclar = [];
  for (const u of siraliAktif("uniteler", () => true)) if (kucult(u.ad).includes(q)) sonuclar.push({ tur: "Ünite", ad: u.ad, unite: u });
  for (const k of siraliAktif("konular", () => true)) if (kucult(k.ad).includes(q)) sonuclar.push({ tur: "Konu", ad: k.ad, konu: k });
  for (const n of siraliAktif("notlar", () => true)) {
    const metin = `${n.baslik || ""} ${n.metin || ""}`;
    const i = kucult(metin).indexOf(q);
    if (i >= 0) sonuclar.push({ tur: "Not", ad: n.baslik || "Not", parca: metin.slice(Math.max(0, i - 30), i + 60), konu: bul("konular", n.konu_id) });
  }
  kap.innerHTML = `<h2 class="defter-baslik">"${esc(defter.arama)}" için ${sonuclar.length} sonuç</h2>
    <div class="arama-sonuclari">${sonuclar.slice(0, 100).map(s => {
      const hedef = s.konu ? `data-konu-ac="${s.konu.id}"` : `data-unite-ac="${s.unite.id}"`;
      const yer = s.konu ? (() => { const u = bul("uniteler", s.konu.unite_id); const d = u && bul("dersler", u.ders_id); return [d && d.ad, u && u.ad, s.tur === "Not" ? s.konu.ad : ""].filter(Boolean).join(" › "); })()
                         : (bul("dersler", s.unite.ders_id) || {}).ad;
      return `<button class="arama-sonuc" ${hedef}><span class="kayit-tur">${s.tur}</span> <b>${esc(s.ad)}</b>
        <small>${esc(yer || "")}</small>${s.parca ? `<span class="arama-parca">…${esc(s.parca)}…</span>` : ""}</button>`;
    }).join("")}</div>`;
}

function defterSayfasiCiz() { agacCiz(); icerikCiz(); }

function defterOlaylariniKur() {
  $("#defter-agac").addEventListener("click", agacTiklandi);
  $("#defter-icerik").addEventListener("click", e => {
    const islem = e.target.closest("[data-islem]");
    if (islem) return agacIslemi(islem.dataset.islem, islem.dataset.id);
    const notIs = e.target.closest("[data-not-islem]");
    if (notIs) return notIslemi(notIs.dataset.notIslem, notIs.dataset.id);
    const fotoSil = e.target.closest("[data-foto-sil]");
    if (fotoSil) { editordenOku(); defter.duzenlenen.fotolar.splice(Number(fotoSil.dataset.fotoSil), 1); return icerikCiz(); }
    const buyut = e.target.closest("[data-buyut]");
    if (buyut) { $("#foto-buyuk").src = buyut.dataset.buyut; return $("#foto-pencere").showModal(); }
    const konu = e.target.closest("[data-konu-ac]");
    if (konu) return konuSec(konu.dataset.konuAc);
    const unite = e.target.closest("[data-unite-ac]"), gitU = e.target.closest("[data-git-unite]");
    if (unite || gitU) { const u = bul("uniteler", (unite || gitU).dataset.uniteAc || gitU.dataset.gitUnite); defter.acikUniteler.add(u.id); return sec(u.ders_id, u.id, null); }
    const gitD = e.target.closest("[data-git-ders]");
    if (gitD) return sec(gitD.dataset.gitDers, null, null);
  });
  $("#defter-arama").addEventListener("input", e => {
    defter.arama = e.target.value.trim();
    if (defter.arama.length === 1) return;     // tek harfle arama yapma
    icerikCiz();
  });
  $("#foto-pencere").addEventListener("click", () => $("#foto-pencere").close());
  $("#defter-sinif").addEventListener("change", e => { defter.sinif = Number(e.target.value); sec(null, null, null); });
}
