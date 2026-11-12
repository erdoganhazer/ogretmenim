/* ÖğretmeniM — Planım (0.18): "Şimdi" odaklı çalışma ekranı.
   Arın SÜRE GÖRMEZ: dakika, saat aralığı, geri sayım yok. Başla → Durdur (Bitti / Yarım kaldı / Ara veriyorum).
   Süre arkada ölçülür ve yalnız veliye gider. "Zaten yaptım" ile okulda / beklerken yapılanlar işlenir;
   plana rağmen başka bir ödev seçilebilir. Plan motorda hesaplanır ve her işlemden sonra yeniden istenir. */
"use strict";

const plan = { veri: null, balon: { anahtar: "", metin: "" }, anlik: null, gerekce: new Map(), acikBitenler: false,
               degerlendirmeCevap: null, soru: null, sekme: "hergun", surukle: null };
const ZAMAN_ANAHTARI = "ogretmenim-calisma";
const PLAN_GUN_KISA = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
// zaman: { gorev, durum: "calisiyor"|"ara", calisilan (ms, biten aralıklar), bas (ms, son başlama), oneri (bu aralıkta öneri yapıldı mı) }
let zaman = (() => { try { const z = JSON.parse(localStorage.getItem(ZAMAN_ANAHTARI) || "null"); return z && z.gorev ? z : null; } catch (_) { return null; } })();

async function planYukle() {
  try {
    plan.veri = await api("GET", "plan");
  } catch (hata) { return bildir("Plan alınamadı: " + hata.message, true); }
  if (zaman && !aktifOdevler().some(o => o.id === zaman.gorev.odev_id && !o.bitti)) { zaman = null; zamanKaydet(); }
  planCiz();
}

function gunuYaz(t) { const d = strTarih(t); return `${d.getDate()} ${AYLAR[d.getMonth()]} ${GUNLER[d.getDay()]}`; }
function gunAdi(t) { return GUNLER[strTarih(t).getDay()]; }
function dersAdiBul(id) { return (dersBul(id) || {}).ad || "Ders"; }
function bugunTarih() { return plan.veri ? plan.veri.bugun : tarihStr(new Date()); }
function gunFarkiP(t) { return Math.round((strTarih(t) - strTarih(bugunTarih())) / 864e5); }
function teslimEtiketi(t) {
  const f = gunFarkiP(t);
  if (f < 0) return { metin: "Teslimi geçti", acil: true };
  if (f === 0) return { metin: "Bugün teslim", acil: true };
  if (f === 1) return { metin: "Yarın teslim", acil: true };
  return { metin: `${gunAdi(t)} teslim`, acil: false };
}

// Aynı durum sürdükçe aynı cümle kalsın (her yenilemede değişmesin)
function sabitCumle(anahtar, durumAdi, veri) {
  if (!plan.gerekce.has(anahtar)) plan.gerekce.set(anahtar, rehber(durumAdi, veri));
  return plan.gerekce.get(anahtar);
}
function anlikSoyle(metin, sure = 15000) {
  plan.anlik = { metin };
  balonCiz();
  clearTimeout(anlikSoyle.z);
  anlikSoyle.z = setTimeout(() => { plan.anlik = null; balonCiz(); }, sure);
}

/* ---------- Durum ---------- */
function bugunBitenler() { return (plan.veri.bugun_yapilanlar || []).filter(c => c.durum === "bitti" || c.durum === "yarim"); }
function sabahMi() {
  if (zaman) return false;
  const g = plan.veri.gunler[0];
  if (!g || !g.okul_bitis || !(plan.veri.okul_onerisi || []).length) return false;
  const s = new Date(), [h, m] = g.okul_bitis.split(":").map(Number);
  return s.getHours() * 60 + s.getMinutes() < h * 60 + m;
}
function siradakiler() { return plan.veri.gunler[0].gorevler; }
function gorevBul(odevId) { return siradakiler().find(g => g.odev_id === odevId); }
function simdikiGorev() {
  if (zaman) return gorevBul(zaman.gorev.odev_id) || zaman.gorev;
  return siradakiler()[0] || null;
}

function balonCiz() {
  if (!plan.veri) return;
  const kalan = siradakiler(), yapildi = bugunBitenler().some(c => c.durum === "bitti");
  const ilk = kalan[0];
  const durumAdi = sabahMi() ? "okul_onerisi" : kalan.length === 0 ? (yapildi ? "gun_bitti" : "karsilama_bos")
    : plan.veri.gunler[0].asim >= 10 ? "karsilama_yogun" : kalan.length >= 3 ? "karsilama_cok" : "karsilama_az";
  const anahtar = `${bugunTarih()}|${durumAdi}|${ilk ? ilk.odev_id : ""}`;
  if (plan.balon.anahtar !== anahtar) plan.balon = { anahtar, metin: rehber(durumAdi, { sayi: kalan.length }) };
  $("#rehber-ana").textContent = plan.anlik ? plan.anlik.metin : plan.balon.metin;
  $("#rehber-balon").classList.toggle("anlik", Boolean(plan.anlik));
}

function ilerlemeCiz() {
  const biten = new Set(bugunBitenler().filter(c => c.durum === "bitti").map(c => c.odev_id)).size;
  const kalan = siradakiler().length, toplam = biten + kalan;
  $("#pl-ilerleme").innerHTML = toplam ? `${Array.from({ length: Math.min(toplam, 8) }, (_, i) =>
    `<i class="${i < biten ? "d" : i === biten ? "s" : ""}"></i>`).join("")}<span>${biten} / ${toplam} bitti</span>` : "";
}

/* ---------- Çizim ---------- */
function planCiz() {
  if (!plan.veri) return;
  balonCiz();
  ilerlemeCiz();
  const sabah = sabahMi();
  $("#pl-okul").innerHTML = sabah ? okulKarti() : "";
  $("#pl-simdi").innerHTML = sabah ? "" : simdiKarti();
  $("#pl-sonra").innerHTML = sonraListesi(sabah);
  degerlendirmeCiz();
  sagCiz();
  haftalikPlanCiz();
  if (typeof yaziliPlanCiz === "function") yaziliPlanCiz();
  if (typeof anaSiradakiCiz === "function") anaSiradakiCiz();
}

/* ---------- 0.21: Haftalık planım (sayfanın altında, günler yan yana) + Planı yenile ---------- */
function haftalikPlanCiz() {
  const kap = $("#pl-haftalik");
  if (!kap || !plan.veri) return;
  const gunler = plan.veri.gunler.slice(0, 7);
  const acik = aktifOdevler().filter(o => !o.bitti);
  const bitenler = bugunBitenler();
  const satirHtml = (ders_id, metin, sinif = "") => {
    const d = dersBul(ders_id) || { ad: "Ders", renk: "#888" };
    return `<li class="hp-is${sinif}" style="--r:${esc(d.renk)}"><b>${esc(d.ad.length > 16 && d.kisa ? d.kisa : d.ad)}</b><span>${esc(metin)}</span></li>`;
  };
  kap.innerHTML = `<div class="hp-ust"><h3>📅 Haftalık planım</h3>
      <span class="hp-saat"></span>
      <button class="dugme" data-pl="yenile" title="Ödevlerin son durumuna göre planı baştan yap">🔄 Planı yenile</button></div>
    <div class="hp-gunler">${gunler.map((g, i) => {
      const ad = i === 0 ? "Bugün" : i === 1 ? "Yarın" : g.gun;
      const teslim = acik.filter(o => o.teslim === g.tarih);
      const isler = g.gorevler.map(t => satirHtml(t.ders_id, t.parca + (t.parca_sayisi > 1 ? ` (${t.parca_no}/${t.parca_sayisi})` : "")));
      if (i === 0) bitenler.forEach(c => { const o = aktifOdevler().find(x => x.id === c.odev_id) || {}; isler.unshift(satirHtml(o.ders_id, c.durum === "bitti" ? "yaptın ✓" : "biraz yaptın ◐", " yapildi")); });
      return `<div class="hp-gun${i === 0 ? " bugun" : ""}${g.ozel ? " ozel" : ""}">
        <div class="hp-gun-ad"><b>${esc(ad)}</b><small>${strTarih(g.tarih).getDate()} ${AYLAR[strTarih(g.tarih).getMonth()]}</small></div>
        ${g.ozel && g.ozel.not ? `<div class="hp-ozel">★ ${esc(g.ozel.not)}</div>` : ""}
        <ul>${isler.join("") || `<li class="hp-bos">Serbest 🎈</li>`}</ul>
        ${teslim.length ? `<div class="hp-teslim">📦 Teslim: ${teslim.map(o => esc((dersBul(o.ders_id) || {}).kisa || dersAdiBul(o.ders_id))).join(", ")}</div>` : ""}
      </div>`;
    }).join("")}</div>`;
}
async function planiYenile() {
  try { durum.veri = await api("GET", "veri"); } catch (_) {}
  await planYukle();
  herSeyiYenile();
  anlikSoyle("Planı ödevlerin son durumuna göre yeniden yaptım.");
}

function simdiKarti() {
  const g = simdikiGorev();
  if (!g) {
    // 0.28: balondaki cümle burada tekrar yazılmaz
    return `<div class="pl-simdi bos"><div class="pl-etiket">BUGÜN</div><div class="pl-bos-yazi">Bugün için planlanmış iş yok 🎈</div>
      <div class="pl-bos-dugmeler"><button class="dugme" data-pl="baska">＋ Yine de bir ödev seç</button><button class="dugme" data-git="ogren">🎯 Yazılılara hazırlan</button></div></div>`;
  }
  const ders = dersBul(g.ders_id) || { ad: "Ders", renk: "#888" };
  const t = teslimEtiketi(g.teslim);
  if (zaman) {
    const ara = zaman.durum === "ara";
    return `<div class="pl-simdi calisiyor${ara ? " ara" : ""}" style="--r:${esc(ders.renk)}">
      <div class="pl-etiket">${ara ? "ARA VERDİN" : "ÇALIŞIYORSUN"}</div>
      <div class="pl-calisma"><div class="pl-nefes"><div>${ara ? "☕" : "📝"}<small>${ara ? "dinleniyorsun" : "odaktasın"}</small></div></div>
        <div><div class="pl-ders">${esc(ders.ad.length > 20 && ders.kisa ? ders.kisa : ders.ad)}</div><div class="pl-parca">${esc(g.parca)} ${notDugmesi(g.odev_id)}</div>
          <div class="pl-dugmeler">${ara
            ? `<button class="pl-basla" data-pl="devam">▶ Devam</button><button class="dugme" data-pl="dur-bitti">✓ Bitti</button><button class="dugme" data-pl="dur-yarim">◐ Yarım kaldı</button>`
            : `<button class="pl-dur" data-pl="durdur">■ Durdur</button><button class="dugme" data-pl="zor">😕 Zorlandım</button>`}</div></div></div></div>`;
  }
  const gk = `${g.odev_id}|${bugunTarih()}|${g.gerekce}|${g.parca_no}`;
  const neden = sabitCumle(gk, "g_" + g.gerekce, { gun: gunAdi(g.teslim), n: g.parca_no, m: g.parca_sayisi, parca: g.parca, ders: ders.ad });
  return `<div class="pl-simdi" style="--r:${esc(ders.renk)}"><div class="pl-etiket">ŞİMDİ</div>
    <div class="pl-ders">${esc(ders.ad.length > 20 && ders.kisa ? ders.kisa : ders.ad)}</div><div class="pl-parca">${esc(g.parca)}${g.parca_sayisi > 1 && !g.secim ? ` <span class="pl-parca-no">${g.parca_no}. parça</span>` : ""} ${notDugmesi(g.odev_id)}</div>
    <div class="pl-meta"><span class="pl-cip${t.acil ? " acil" : ""}">${t.metin}</span><span class="pl-neden">${esc(neden)}</span></div>
    <div class="pl-dugmeler"><button class="pl-basla" data-pl="basla">▶ Başla</button><button class="pl-ikinci" data-pl="zaten" data-odev="${g.odev_id}">✓ Zaten yaptım</button></div></div>`;
}

// 0.19.1: ödevin açıklaması varsa "💬 Not" düğmesi; basınca açıklama okunur
function notDugmesi(odevId) {
  const o = aktifOdevler().find(x => x.id === odevId);
  return notVar(o) ? `<button type="button" class="pl-not" data-pl="not" data-odev="${esc(odevId)}" title="Bu ödevin açıklaması var">💬 Not</button>` : "";
}
function notGoster(odevId) {
  const o = aktifOdevler().find(x => x.id === odevId);
  if (!notVar(o)) return;
  soruPenceresi({ baslik: `💬 ${dersAdiBul(o.ders_id)} — not`, tamam: "Tamam", bilgi: true, kaydet: async () => {},
    alanlar: `<div class="pl-not-metin">${esc(String(o.aciklama).trim()).replace(/\n/g, "<br>")}</div>` });
}

function satir(g, dugmeler) {
  const ders = dersBul(g.ders_id) || { ad: "Ders", renk: "#888" }, t = teslimEtiketi(g.teslim);
  return `<div class="pl-satir" style="--r:${esc(ders.renk)}" data-odev="${g.odev_id}"${dugmeler.surukle ? ' draggable="true"' : ""}>
    ${dugmeler.surukle ? `<span class="pl-tut" title="Sürükleyerek sırayı değiştir">⋮⋮</span>` : ""}<span class="pl-nokta"></span>
    <div class="pl-satir-ad"><b>${esc(ders.ad)}</b><span>${esc(g.parca)} ${notDugmesi(g.odev_id)}</span></div>
    <span class="pl-cip${t.acil ? " acil" : ""}">${t.metin}</span>
    ${dugmeler.simdi ? `<button class="dugme kucuk" data-pl="simdi" title="Plana rağmen şimdi bunu yap">▶ Şimdi yap</button>` : ""}
    <button class="dugme kucuk pl-yaptim" data-pl="zaten" data-odev="${g.odev_id}" title="Okulda ya da başka yerde yaptıysan">✓ Yaptım</button></div>`;
}

function sonraListesi(sabah) {
  const ayar = plan.veri.ayarlar, simdiki = simdikiGorev();
  const liste = sabah ? siradakiler() : siradakiler().filter(g => !simdiki || g.odev_id !== simdiki.odev_id);
  const surukle = !sabah && !zaman && (ayar.arin_sira || veliAktif()) && liste.length > 1;
  const soluk = zaman && zaman.durum === "calisiyor" ? " soluk" : "";
  let h = "";
  if (liste.length) h += `<div class="pl-baslik${soluk}">${sabah ? "Akşamki sıran" : "Sonra"}</div><div class="pl-liste${soluk}" id="pl-liste">${liste.map(g => satir(g, { surukle, simdi: !zaman || zaman.durum === "ara" })).join("")}</div>`;
  if (!zaman && simdikiGorev()) h += `<button class="dugme pl-baska" data-pl="baska">＋ Başka bir ödev seç</button>`;
  const bitenler = bugunBitenler();
  if (bitenler.length) h += `<div class="tamamlanan pl-bitenler${plan.acikBitenler ? " acik" : ""}">
      ${plan.acikBitenler ? `<div class="tamamlanan-liste">${bitenler.map(bitenSatiri).join("")}</div>` : ""}
      <button class="tamamlanan-dugme" data-pl="bitenler"><span class="tamamlanan-isaret">✓</span> Bugün yaptıkların <b>${bitenler.length}</b><span class="tamamlanan-ok">${plan.acikBitenler ? "▾" : "▸"}</span></button></div>`;
  return h;
}

function okulKarti() {
  return `<div class="pl-okul"><h3>🏫 Okulda boş kalırsan</h3><p>Kısa işler. Okulda ya da çıkışta beklerken yaparsan “✓ Yaptım” de; akşamın hafifler.</p>
    ${plan.veri.okul_onerisi.map(g => satir(g, {})).join("")}</div>`;
}

const YER_ADI = { okul: "okulda", bekleme: "beklerken", diger: "başka zamanda" };
function bitenSatiri(c) {
  const o = aktifOdevler().find(x => x.id === c.odev_id) || {};
  const bl = birimler(o.kaynaklar || []);
  const metin = c.birim_bit <= c.birim_bas ? "başlanamadı" : (o.kaynaklar || []).length ? parcaMetni(o.kaynaklar, bl, c.birim_bas, c.birim_bit) : (o.baslik || "Ödevin tamamı");
  return `<div class="biten-satir" style="--renk:${esc((dersBul(o.ders_id) || {}).renk || "#888")}">
    <span>${c.durum === "bitti" ? "✓" : "◐"} <b>${esc(dersAdiBul(o.ders_id))}</b> · ${esc(metin)}${YER_ADI[c.yer] ? ` <small>· ${YER_ADI[c.yer]}</small>` : ""}</span>
    <button class="baglanti" data-geri-al="${c.odev_id}">Geri al</button></div>`;
}

function degerlendirmeCiz() {
  const p = plan.veri, gun = p.gunler[0], kap = $("#plan-degerlendirme");
  const bilgi = (p.gun_bilgisi[bugunTarih()] || {}).degerlendirme;
  const yapildi = bugunBitenler().length > 0;
  const goster = !zaman && (bilgi || (yapildi && (!gun.gorevler.length || new Date().getHours() >= 20)));
  kap.hidden = !goster;
  if (!goster) return;
  if (bilgi) {
    const cevap = plan.degerlendirmeCevap || sabitCumle("deg|" + bugunTarih() + bilgi.deger, "degerlendirme_" + bilgi.deger, {});
    kap.innerHTML = `<div class="pl-deg-baslik">Bugün nasıldı?</div><p class="deg-cevap">${{ kolay: "😊 Kolaydı", iyi: "🙂 İyiydi", zor: "😓 Zordu" }[bilgi.deger]} — ${esc(cevap)}</p>`;
    return;
  }
  kap.innerHTML = `<div class="pl-deg-baslik">${esc(sabitCumle("degsoru|" + bugunTarih(), "degerlendirme_soru", {}))}</div>
    <div class="deg-dugmeler"><button class="dugme" data-deg="kolay">😊 Kolaydı</button><button class="dugme" data-deg="iyi">🙂 İyiydi</button><button class="dugme" data-deg="zor">😓 Zordu</button></div>
    <input id="deg-not" maxlength="300" placeholder="İstersen bir not yaz">`;
}

/* ---------- Sağ: Çanta / Her gün / Hafta (süre bilgisi yok) ---------- */
function sagCiz() {
  $$("#pl-sekmeler button").forEach(b => b.classList.toggle("aktif", b.dataset.sekme === plan.sekme));
  const ic = $("#pl-sekme-ic");
  if (plan.sekme === "hergun") ic.innerHTML = herGunHtml();
  else if (plan.sekme === "hafta") ic.innerHTML = haftaHtml();
  else ic.innerHTML = cantaHtml();
}
function herGunHtml() {
  const gun = plan.veri.gunler[0], yapildi = new Set((plan.veri.gun_bilgisi[bugunTarih()] || {}).sabit || []);
  if (!gun.sabitler.length) return `<p class="pl-soluk">Bugün için her gün yapılacak bir iş yok.</p>`;
  return `<p class="pl-ic-baslik">Her gün biraz, büyük fark:</p>` + gun.sabitler.map(s => `<label class="anahtar pl-oge" style="--r:var(--vurgu)">
    <input type="checkbox" data-sabit="${esc(s.id)}"${yapildi.has(s.id) ? " checked" : ""}><span>${esc(s.ad)}</span></label>`).join("");
}
function cantaIsaretleri(t) { try { return JSON.parse(localStorage.getItem("ogretmenim-canta-" + t) || "[]"); } catch (_) { return []; } }
function cantaHtml() {
  const c = plan.veri.canta;
  if (!c) return `<p class="pl-soluk">Yakında okul günü görünmüyor.</p>`;
  const isaret = new Set(cantaIsaretleri(c.tarih));
  const oge = (anahtar, metin, renk) => `<label class="anahtar pl-oge" style="--r:${esc(renk || "transparent")}"><input type="checkbox" data-canta="${esc(anahtar)}"${isaret.has(anahtar) ? " checked" : ""}><span>${metin}</span></label>`;
  const teslim = c.teslim.map(t => oge("t" + t.odev_id, `<b>${esc(dersAdiBul(t.ders_id))}</b>${t.kaynaklar.length ? " — " + esc(t.kaynaklar.join(", ")) : " ödevi"}`, (dersBul(t.ders_id) || {}).renk)).join("");
  const sinav = c.sinavlar.map(s => oge("s" + s.id, `🧪 <b>${esc(dersAdiBul(s.ders_id))}</b> sınavı`, (dersBul(s.ders_id) || {}).renk)).join("");
  const fark = gunFarkiP(c.tarih), ne = fark === 0 ? "Bugün" : fark === 1 ? "Yarın" : "";
  // 0.21 "Okul Yolu": çanta ve o günün ders programı tek yerde. Her ders saati sırayla (saat yazmadan: 1., 2. ders);
  // dersin ilk geçtiği satırda kitabını aldığını işaretler, o derse teslim/sınav varsa satırın altında görünür.
  const program = durum.veri.ders_programi || { saatler: [], hucreler: {} };
  const g = strTarih(c.tarih).getDay(), gorulen = new Set();
  const satirlar = (program.saatler || []).map((_, i) => (program.hucreler || {})[`${g}-${i}`]).map((id, i) => {
    if (!id) return "";
    const d = dersBul(id) || { ad: "Ders", renk: "#888" };
    const ilk = !gorulen.has(id); gorulen.add(id);
    const ekler = ilk ? [
      ...c.teslim.filter(t => t.ders_id === id).map(t => oge("t" + t.odev_id, `📝 Ödevini teslim et${t.kaynaklar.length ? " — " + esc(t.kaynaklar.join(", ")) : ""}`, d.renk)),
      ...c.sinavlar.filter(s => s.ders_id === id).map(s => oge("s" + s.id, "🧪 Sınav var", d.renk)),
    ].join("") : "";
    return `<div class="oy-satir${ilk ? "" : " tekrar"}" style="--r:${esc(d.renk)}"><span class="oy-no">${i + 1}</span>
      ${ilk ? oge("d" + id, `<b>${esc(d.ad)}</b>`, d.renk) : `<span class="oy-ayni">${esc(d.ad)} <small>(aynı kitap)</small></span>`}</div>${ekler ? `<div class="oy-ek">${ekler}</div>` : ""}`;
  }).join("");
  const disari = [...c.teslim.filter(t => !gorulen.has(t.ders_id)).map(t => oge("t" + t.odev_id, `📝 <b>${esc(dersAdiBul(t.ders_id))}</b> ödevi${t.kaynaklar.length ? " — " + esc(t.kaynaklar.join(", ")) : ""}`, (dersBul(t.ders_id) || {}).renk)),
    ...c.sinavlar.filter(s => !gorulen.has(s.ders_id)).map(s => oge("s" + s.id, `🧪 <b>${esc(dersAdiBul(s.ders_id))}</b> sınavı`, (dersBul(s.ders_id) || {}).renk))].join("");
  return `<p class="pl-ic-baslik">${ne ? esc(ne) + " " : ""}<b>${esc(c.gun)}</b> — çantana dersleri sırayla koy:</p>
    <div class="oy-liste">${satirlar || `<span class="pl-soluk">Ders yok</span>`}</div>
    ${disari ? `<small class="pl-ara-baslik">Bunları da unutma</small>${disari}` : ""}`;
}
function haftaHtml() {
  const gunler = plan.veri.gunler.slice(0, 7);
  return `<p class="pl-ic-baslik">Bu hafta hangi gün ne var:</p><div class="pl-hafta">${gunler.map((g, i) => {
    const dersler = [...new Map(g.gorevler.map(t => [t.ders_id, t])).values()];
    return `<div class="pl-hafta-gun${i === 0 ? " bugun" : ""}"><b>${i === 0 ? "Bugün" : i === 1 ? "Yarın" : esc(g.gun)}</b><div class="pl-cipler">${dersler.map(t => {
      const d = dersBul(t.ders_id) || {}; return `<span class="pl-ders-cip" style="--r:${esc(d.renk || "#888")}">${esc(d.kisa || d.ad || "?")}</span>`; }).join("") || `<span class="pl-soluk">serbest</span>`}
      ${g.ozel && g.ozel.not ? `<span class="pl-ozel">★ ${esc(g.ozel.not)}</span>` : ""}</div></div>`; }).join("")}</div>`;
}

/* ---------- İşlemler ---------- */
async function planIslem(govde) {
  await api("POST", "plan/islem", govde);
  try { durum.veri = await api("GET", "veri"); } catch (_) { /* ödev listesi bir sonraki yenilemede gelir */ }
  await planYukle();
  herSeyiYenile();
}
function sonrakiSoyle(onEk) {
  const s = siradakiler()[0];
  const metin = s ? rehber("siradaki", { sonraki: `${dersAdiBul(s.ders_id)} — ${s.parca}` }) : rehber("gun_bitti", {});
  anlikSoyle((onEk ? onEk + " " : "") + metin);
}

function soruPenceresi({ baslik, alanlar, tamam, sil, kaydet, silFn, kur, bilgi }) {
  plan.soru = { kaydet, silFn, tikla: kur };          // kur: pencere içi her tıklamada çağrılır (dinleyici birikmesin)
  $("#plan-soru-baslik").textContent = baslik;
  $("#plan-soru-alanlar").innerHTML = alanlar;
  $("#plan-soru-tamam").textContent = tamam || "Kaydet";
  $("#plan-soru-sil").hidden = !sil;
  $("#plan-soru-vazgec").hidden = !!bilgi;          // yalnız bilgi gösteren pencerede tek "Tamam"
  $("#plan-soru-pencere").showModal();
  if (kur) kur($("#plan-soru-form"));
}
// Seçim düğmeleri (büyük kutular): tıklanan "sec" olur, değeri form.dataset'e yazılır
function secimKutulari(ad, secenekler, secili) {
  return `<div class="pl-secim" data-secim="${ad}">${secenekler.map(([d, simge, yazi]) =>
    `<button type="button" data-deger="${d}" class="${d === secili ? "sec" : ""}"><span>${simge}</span>${yazi}</button>`).join("")}</div>`;
}
function secimDegeri(f, ad) { const b = $(`[data-secim="${ad}"] .sec`, f); return b ? b.dataset.deger : ""; }
// 0.20: "12 sayfanın 3'ünü yaptım" — seçenekler sayıyla: "3 sayfa (… s. 17'ye kadar)"
function nereyeKadarSecenek(o, bas) {
  const bl = birimler(o.kaynaklar || []), kalan = bl.slice(bas);
  const ad = b => b.tur === "sayfa" ? "sayfa" : b.tur === "adet" ? b.ad : "parça";
  const ortak = kalan.every(b => ad(b) === ad(kalan[0])) ? ad(kalan[0]) : "parça";
  return kalan.slice(0, -1).map((b, i) => `<option value="${bas + i + 1}">${i + 1} ${esc(ortak)} — ${esc((o.kaynaklar || []).length ? parcaMetni(o.kaynaklar, bl, bas, bas + i + 1) : birimEtiketi([], b))}</option>`).join("");
}
function kalanBirimYazi(o, bas) {
  const bl = birimler(o.kaynaklar || []), kalan = bl.slice(bas);
  return kalan.length > 1 ? `${kalan.length} ${kalan.every(b => b.tur === "sayfa") ? "sayfa" : kalan.every(b => b.tur === "adet" && b.ad === kalan[0].ad) ? kalan[0].ad : "parça"}` : "";
}

/* 0.27: Birden çok kaynaklı ödevde her kaynak tek tek sorulur (Yaptım / Bir kısmını / Yapmadım).
   Ödev ancak bütün kaynaklar yapılınca "yapıldı" olur; eksik kalan kaynak plana geri döner. */
function kaynakKontrolSor(odevId, { varsayilanYer = "ev", yerSor = true, dk = 0, dkPlan = 0 } = {}) {
  const o = aktifOdevler().find(x => x.id === odevId);
  if (!o) return;
  const ky = o.kaynaklar || [], bl = birimler(ky);
  const ilerleme = Math.min(bl.length, ((plan.veri && plan.veri.ilerleme) || {})[odevId] || 0);
  const birim = ky.map((_, k) => bl.map((b, i) => [b, i]).filter(([b]) => b.k === k));
  const onceden = ky.map((_, k) => birim[k].length > 0 && birim[k].every(([, i]) => i < ilerleme));
  const yarimN = ky.map((_, k) => onceden[k] ? 0 : birim[k].filter(([, i]) => i < ilerleme).length);
  const kalanYazi = k => yarimN[k] ? `${esc(ky[k].sayfa || "")} <em>· önceden ${yarimN[k]} ${birim[k][0][0].tur === "sayfa" ? "sayfa" : "parça"} yapmıştın</em>` : esc(ky[k].sayfa || "");
  const satir = (x, k) => {
    if (onceden[k]) return `<div class="pl-kaynak tamam"><div class="pl-kaynak-ad"><b>${esc(x.ad || "Kaynak " + (k + 1))}</b><small>${esc(x.sayfa || "")}</small></div><span class="pl-kaynak-durum">✓ daha önce bitti</span></div>`;
    const tur = birim[k][0] && birim[k][0][0].tur;
    const secimler = birim[k].slice(yarimN[k], -1).map(([b], j) => {
      const kac = yarimN[k] + j + 1;
      return `<option value="${kac}">${kac} ${tur === "sayfa" ? "sayfa" : tur === "adet" ? esc(b.ad) : "parça"} (${esc(tur === "sayfa" ? "s. " + b.no : b.no + ". " + (b.ad || ""))} dahil)</option>`;
    }).join("");
    const secenek = [["tam", "✅", "Yaptım"]];
    if (secimler) secenek.push(["kismi", "◐", "Bir kısmını"]);
    secenek.push(["yok", "✖", yarimN[k] ? "Daha yapmadım" : "Yapmadım"]);
    return `<div class="pl-kaynak" data-kaynak="${k}"><div class="pl-kaynak-ad"><b>${esc(x.ad || "Kaynak " + (k + 1))}</b><small>${kalanYazi(k)}</small></div>
      ${secimKutulari("k" + k, secenek, "")}
      ${secimler ? `<label class="pl-nereye" data-kismi="${k}" hidden>Nereye kadar yaptın?<select name="kac${k}">${secimler}</select></label>` : ""}</div>`;
  };
  const sorulan = ky.map((_, k) => k).filter(k => !onceden[k]);
  const ozetYaz = f => {
    const c = sorulan.map(k => [k, secimDegeri(f, "k" + k)]);
    const bos = c.filter(([, d]) => !d).length, eksikler = c.filter(([, d]) => d && d !== "tam").map(([k]) => ky[k].ad || "Kaynak " + (k + 1));
    $$("[data-kismi]", f).forEach(l => { l.hidden = secimDegeri(f, "k" + l.dataset.kismi) !== "kismi"; });
    $$(".pl-kaynak[data-kaynak]", f).forEach(d => d.classList.toggle("cevapli", !!secimDegeri(f, "k" + d.dataset.kaynak)));
    const oz = $(".pl-kaynak-ozet", f);
    oz.className = "pl-kaynak-ozet" + (bos ? "" : eksikler.length ? " eksik" : " tamam");
    oz.innerHTML = bos ? `${bos} kaynak için daha seçim yapmadın.`
      : eksikler.length ? `⚠️ <b>${eksikler.map(esc).join(", ")}</b> bitmedi. Ödev “yapıldı” olmayacak; kalanı plana geri döner.`
      : "🎉 Bütün kaynaklar bitti. Ödev “yapıldı” olarak işaretlenecek.";
  };
  soruPenceresi({
    baslik: `${dersAdiBul(o.ders_id)} — hangi kaynakları yaptın?`, tamam: "Kaydet",
    alanlar: `<p class="pl-soru-not">Bu ödevde <b>${ky.length} kaynak</b> var. Her biri için ayrı ayrı seç.</p>
      <div class="pl-kaynaklar">${ky.map(satir).join("")}</div>
      <p class="pl-kaynak-ozet"></p>
      ${yerSor ? `<p class="pl-soru-not">Nerede yaptın?</p>${secimKutulari("yer", [["ev", "🏠", "Evde"], ["okul", "🏫", "Okulda boş vakitte"], ["bekleme", "🚏", "Çıkışta beklerken"]], varsayilanYer)}` : ""}`,
    kur: ozetYaz,
    kaydet: async f => {
      const bos = sorulan.filter(k => !secimDegeri(f, "k" + k));
      if (bos.length) throw new Error(`Önce şunu seç: ${bos.map(k => ky[k].ad || "Kaynak " + (k + 1)).join(", ")} — yaptın mı?`);
      const kaynaklar = sorulan.map(k => ({ i: k, durum: secimDegeri(f, "k" + k), kac: f.elements["kac" + k] ? Number(f.elements["kac" + k].value) : 0 }));
      const hepsi = kaynaklar.every(c => c.durum === "tam");
      if (!hepsi && !kaynaklar.some(c => c.durum !== "yok") && !yarimN.some(Boolean)) throw new Error("Hiçbir kaynağı yapmadıysan “Vazgeç”e bas.");
      const yer = yerSor ? (secimDegeri(f, "yer") || "ev") : varsayilanYer;
      if (zaman && zaman.gorev.odev_id === odevId) zamanBitir();
      await planIslem({ tur: "kaynaklar", odev_id: odevId, kaynaklar, yer, dk_plan: dkPlan, dk_gercek: dk });
      if (hepsi && typeof motivasyonKutla === "function") motivasyonKutla(true);
      sonrakiSoyle(rehber(hepsi ? "gorev_bitti" : "zaten_kismi", { ders: dersAdiBul(o.ders_id) }));
    },
  });
  ozetYaz($("#plan-soru-form"));
}

function zatenYaptimSor(odevId, varsayilanYer) {
  const o = aktifOdevler().find(x => x.id === odevId);
  if (!o) return;
  if ((o.kaynaklar || []).length >= 2) return kaynakKontrolSor(odevId, { varsayilanYer: varsayilanYer || "okul" });
  const g = gorevBul(odevId) || (plan.veri.okul_onerisi || []).find(x => x.odev_id === odevId);
  const bas = g ? g.birim_bas : 0, toplam = birimler(o.kaynaklar || []).length;
  const kismiOlur = toplam - bas > 1;
  soruPenceresi({
    baslik: `${dersAdiBul(o.ders_id)} — zaten yaptın mı? 👏`, tamam: "Kaydet",
    alanlar: `<p class="pl-soru-not">Nerede yaptın?</p>
      ${secimKutulari("yer", [["ev", "🏠", "Evde"], ["okul", "🏫", "Okulda boş vakitte"], ["bekleme", "🚏", "Çıkışta beklerken"]], varsayilanYer || "okul")}
      ${kismiOlur ? `<p class="pl-soru-not">Hepsini mi yaptın? <small>(kalan: ${esc(kalanBirimYazi(o, bas))})</small></p>${secimKutulari("ne", [["hepsi", "✅", "Hepsini"], ["kismi", "◐", "Bir kısmını"]], "hepsi")}
      <label class="pl-nereye" hidden>Ne kadarını yaptın?<select name="kac">${nereyeKadarSecenek(o, bas)}</select></label>` : ""}`,
    kur: f => { const n = $(".pl-nereye", f); if (n) n.hidden = secimDegeri(f, "ne") !== "kismi"; },
    kaydet: async f => {
      const yer = secimDegeri(f, "yer") || "diger", kismi = kismiOlur && secimDegeri(f, "ne") === "kismi";
      const bit = kismi ? Number(f.elements.kac.value) : toplam;
      if (zaman && zaman.gorev.odev_id === odevId) zamanBitir();
      await planIslem({ tur: "bitti", odev_id: odevId, birim_bas: bas, birim_bit: bit, dk_plan: g ? g.dk : 0, dk_gercek: 0, yer });
      if (!kismi && typeof motivasyonKutla === "function") motivasyonKutla(true);
      sonrakiSoyle(rehber(kismi ? "zaten_kismi" : "zaten_" + (yer === "ev" ? "diger" : yer), { ders: dersAdiBul(o.ders_id) }));
    },
  });
}

function baskaOdevSor() {
  const acik = aktifOdevler().filter(o => !o.bitti).sort((a, b) => a.teslim.localeCompare(b.teslim));
  const simdiki = simdikiGorev();
  const gruplar = new Map();
  for (const o of acik) {
    if (simdiki && o.id === simdiki.odev_id) continue;
    const t = teslimEtiketi(o.teslim).metin;
    if (!gruplar.has(t)) gruplar.set(t, []);
    gruplar.get(t).push(o);
  }
  if (!gruplar.size) return anlikSoyle(rehber("karsilama_bos", {}));
  const bugunku = new Set(siradakiler().map(g => g.odev_id));
  soruPenceresi({
    baslik: "Başka bir ödev seç", tamam: "▶ Bununla başla",
    alanlar: `<p class="pl-soru-not">Canın başka bir ders istiyorsa olur. Plan kalanları yeniden düzenler.</p>
      <div class="pl-sec-liste">${[...gruplar].map(([t, l]) => `<small class="pl-ara-baslik">${esc(t)}</small>${l.map(o => {
        const d = dersBul(o.ders_id) || { ad: "Ders", renk: "#888" };
        const erken = o.en_erken && o.en_erken > bugunTarih() ? `<span class="pl-soluk">Öğretmenin önerisi: ${esc(gunuYaz(o.en_erken))} ve sonrası</span>` : "";
        return `<button type="button" class="pl-sec" data-sec="${o.id}" style="--r:${esc(d.renk)}"><span class="pl-nokta"></span><span><b>${esc(d.ad)}</b> ${esc(o.baslik || "")}</span>${erken}</button>`;
      }).join("")}`).join("")}</div>`,
    kur: (f, e) => { const b = e && e.target.closest("[data-sec]"); if (!b) return; $$("[data-sec]", f).forEach(x => x.classList.toggle("sec", x === b)); },
    kaydet: async f => {
      const b = $("[data-sec].sec", f);
      if (!b) throw new Error("Bir ödev seç");
      await simdiSec(b.dataset.sec, bugunku.has(b.dataset.sec), true);
    },
  });
}
async function simdiSec(odevId, planli, basla) {
  await planIslem({ tur: "simdi", odev_id: odevId, planli });
  const g = siradakiler()[0];
  if (basla && g && g.odev_id === odevId) zamanBaslat(g, true);
  anlikSoyle(rehber("secim", { ders: dersAdiBul((g || {}).ders_id) }));
}

function durdurSor() {
  const g = simdikiGorev(), o = aktifOdevler().find(x => x.id === g.odev_id) || {};
  const secenek = nereyeKadarSecenek(o, g.birim_bas);
  soruPenceresi({
    baslik: `${dersAdiBul(g.ders_id)} — durdun. Ne oldu?`, tamam: "Tamam",
    alanlar: `${secimKutulari("ne", [["bitti", "✅", "Bitti"], ["yarim", "◐", "Yarım kaldı"], ["ara", "☕", "Ara veriyorum"]], "bitti")}
      <label class="pl-nereye" hidden>Ne kadarını yaptın?<select name="kac"><option value="${g.birim_bas}">Hiç ilerleyemedim</option>${secenek}</select></label>
      <label class="pl-yarim-not" hidden>Not (isteğe bağlı)<input name="not" maxlength="300" placeholder="Ör. yoruldum, kitabı okulda unuttum"></label>`,
    kur: f => { const y = secimDegeri(f, "ne") === "yarim"; $(".pl-nereye", f).hidden = !y; $(".pl-yarim-not", f).hidden = !y; },
    kaydet: async f => {
      const ne = secimDegeri(f, "ne");
      if (ne === "ara") return araVer();
      if (ne === "bitti") return bittiKaydet(g);
      return yarimKaydet(g, Number(f.elements.kac.value), f.elements.not.value.trim());
    },
  });
}
async function bittiKaydet(g) {
  const o = aktifOdevler().find(x => x.id === g.odev_id);
  if (o && (o.kaynaklar || []).length >= 2) {           // 0.27: kaynaklar tek tek sorulur
    const dk = zamanBitir();
    setTimeout(() => kaynakKontrolSor(g.odev_id, { yerSor: false, varsayilanYer: "ev", dk, dkPlan: g.dk }), 80);
    return;
  }
  const dk = zamanBitir();
  await planIslem({ tur: "bitti", odev_id: g.odev_id, birim_bas: g.birim_bas, birim_bit: g.birim_bit, dk_plan: g.dk, dk_gercek: dk, yer: "ev" });
  if (g.birim_bit >= g.birim_toplam && typeof motivasyonKutla === "function") motivasyonKutla(true);
  sonrakiSoyle(rehber("gorev_bitti", { ders: dersAdiBul(g.ders_id) }));
}
async function yarimKaydet(g, kac, not) {
  const dk = zamanBitir();
  await planIslem({ tur: "yarim", odev_id: g.odev_id, birim_bas: g.birim_bas, birim_bit: kac, birim_plan_bit: g.birim_bit, dk_plan: g.dk, dk_gercek: dk, not });
  anlikSoyle(rehber(kac > g.birim_bas ? "yarim_kaldi" : "hic_baslamadi", { ders: dersAdiBul(g.ders_id) }));
}

function zorSor(g) {
  soruPenceresi({
    baslik: `${dersAdiBul(g.ders_id)} — neresi zor geldi?`, tamam: "Velime bildir",
    alanlar: `<p class="pl-soru-not">Yazdığını velin görecek. İstersen boş bırakabilirsin.</p>
      <label>Not<textarea name="not" rows="3" maxlength="300" placeholder="Ör. 5. soruyu anlamadım"></textarea></label>`,
    kaydet: async f => {
      await planIslem({ tur: "zor", odev_id: g.odev_id, not: f.elements.not.value.trim() });
      anlikSoyle(rehber("zorlandim", { ders: dersAdiBul(g.ders_id) }), 18000);
    },
  });
}

// Arın'ın özel günü: süre sorulmaz, "vaktim az / hiç yok / normal" seçilir (bütçenin yarısı / 0 / ayarın kendisi)
function ozelGunSor() {
  const t0 = bugunTarih(), yarin = tarihStr(gunEkle(strTarih(t0), 1));
  soruPenceresi({
    baslik: "Bugün vaktin farklı mı?", tamam: "Planı düzenle",
    alanlar: `${secimKutulari("gun", [[t0, "📅", "Bugün"], [yarin, "🗓", "Yarın"]], t0)}
      ${secimKutulari("vakit", [["az", "🌗", "Vaktim az"], ["yok", "🚫", "Hiç vaktim yok"], ["normal", "☀️", "Normal"]], "az")}
      <label>Neden? <small>(velin görür)</small><input name="not" maxlength="200" placeholder="Ör. doğum günü, doktor, misafir"></label>
      <p class="pl-soru-not">Teslimi çok yakın olan ödevler yine de o güne kalabilir; gerisi başka günlere geçer.</p>`,
    kaydet: async f => {
      const tarih = secimDegeri(f, "gun") || t0, vakit = secimDegeri(f, "vakit") || "az";
      if (vakit === "normal") await planIslem({ tur: "ozel_gun", tarih, sil: true });
      else {
        const butce = Number(plan.veri.ayarlar.butce[String(strTarih(tarih).getDay())] || 60);
        await planIslem({ tur: "ozel_gun", tarih, dk: vakit === "yok" ? 0 : Math.round(butce / 2 / 5) * 5, not: f.elements.not.value.trim() });
      }
      anlikSoyle(rehber("ozel_gun", {}));
    },
  });
}

async function siraKaydet(yeni, tasinan, asagi) {
  const liste = siradakiler(), g = liste.find(x => x.odev_id === tasinan);
  const riskli = asagi && g && g.zorunlu;
  try {
    await planIslem({ tur: "sira", tarih: bugunTarih(), sira: yeni });
    anlikSoyle(rehber(riskli ? "sira_uyari" : "sira_tamam", { ders: dersAdiBul(g && g.ders_id) }), riskli ? 16000 : 8000);
  } catch (hata) { bildir(hata.message, true); }
}

/* ---------- Çalışma (süre arkada ölçülür, gösterilmez) ---------- */
function zamanKaydet() { try { localStorage.setItem(ZAMAN_ANAHTARI, JSON.stringify(zaman)); } catch (_) {} calismaBildir(); }
// 0.19: Arın çalışırken motor güncelleme kurmasın (yalnız "çalışıyor mu" bilgisi gider)
function calismaBildir() { api("POST", "plan/calisma", { aktif: !!zaman }).catch(() => {}); }
function zamanBaslat(g, sessiz) {
  zaman = { gorev: g, durum: "calisiyor", calisilan: 0, bas: Date.now(), oneri: false };
  zamanKaydet();
  if (!sessiz) anlikSoyle(rehber("basla", { ders: dersAdiBul(g.ders_id) }));
  planCiz();
}
function zamanCalisilan() { return zaman ? zaman.calisilan + (zaman.durum === "calisiyor" ? Date.now() - zaman.bas : 0) : 0; }
function zamanBitir() { const dk = zaman ? Math.max(1, Math.round(zamanCalisilan() / 60000)) : 0; zaman = null; zamanKaydet(); return dk; }
function araVer() {
  if (!zaman) return;
  zaman.calisilan = zamanCalisilan(); zaman.durum = "ara"; zamanKaydet();
  anlikSoyle(rehber("ara", {}), 20000);
  planCiz();
}
function devamEt() {
  if (!zaman) return;
  zaman.durum = "calisiyor"; zaman.bas = Date.now(); zaman.oneri = false; zamanKaydet();
  anlikSoyle(rehber("devam", { ders: dersAdiBul(zaman.gorev.ders_id) }));
  planCiz();
}
// Uzun süre ara vermeden çalışırsa (ayardaki blok süresi) sayı göstermeden nazikçe ara önerir
function zamanTik() {
  if (!zaman || zaman.durum !== "calisiyor" || zaman.oneri || !plan.veri) return;
  const blok = (plan.veri.ayarlar.blok_dk || 25) * 60000;
  if (Date.now() - zaman.bas >= blok) { zaman.oneri = true; zamanKaydet(); anlikSoyle(rehber("ara_oneri", {}), 30000); }
}

/* ---------- Sürükle-bırak ile sıra ---------- */
function surukleKur() {
  const kap = $("#pl-sonra");
  kap.addEventListener("dragstart", e => { const s = e.target.closest(".pl-satir[draggable]"); if (!s) return; plan.surukle = s; s.classList.add("tasiniyor"); e.dataTransfer.effectAllowed = "move"; });
  kap.addEventListener("dragover", e => {
    if (!plan.surukle) return;
    const hedef = e.target.closest(".pl-satir[draggable]");
    if (!hedef || hedef === plan.surukle) return;
    e.preventDefault();
    const r = hedef.getBoundingClientRect(), once = e.clientY < r.top + r.height / 2;
    hedef.parentNode.insertBefore(plan.surukle, once ? hedef : hedef.nextSibling);
  });
  kap.addEventListener("dragend", () => {
    const s = plan.surukle; plan.surukle = null;
    if (!s) return;
    s.classList.remove("tasiniyor");
    const simdiki = simdikiGorev(), satirlar = $$("#pl-liste .pl-satir").map(x => x.dataset.odev);
    const yeni = (simdiki ? [simdiki.odev_id] : []).concat(satirlar);
    const eski = siradakiler().map(g => g.odev_id);
    if (yeni.join() === eski.join()) return;
    siraKaydet(yeni, s.dataset.odev, yeni.indexOf(s.dataset.odev) > eski.indexOf(s.dataset.odev));
  });
}

/* ---------- Veli: özet ve ayarlar (Ayarlar › veli bölümü) ---------- */
async function planVeliCiz() {
  if (!veliAktif()) return;
  let p;
  try { p = await api("GET", "plan"); } catch (hata) { $("#plan-veli-ozet").textContent = hata.message; return; }
  const oz = p.ozet;
  if (!oz) return;
  const gunler = oz.gunler.map(g => `<tr><td>${esc(gunuYaz(g.tarih).split(" ").slice(0, 3).join(" "))}</td><td>${g.planlanan || "–"}</td><td>${g.yapilan || "–"}</td>
      <td>${g.gercek || "–"}</td><td>${g.biten}${g.yarim ? ` <small>+${g.yarim} yarım</small>` : ""}</td><td>${g.zor ? "😕 " + g.zor : ""}</td><td>${g.disarida ? "🏫 " + g.disarida : ""}${g.secim ? ` <small>↪ ${g.secim} seçim</small>` : ""}</td>
      <td>${g.degerlendirme ? { kolay: "😊", iyi: "🙂", zor: "😓" }[g.degerlendirme.deger] + (g.degerlendirme.not ? " " + esc(g.degerlendirme.not) : "") : ""}</td>
      <td>${g.ozel ? `★ ${g.ozel.dk} dk ${esc(g.ozel.not || "")} <small>(${g.ozel.kim === "veli" ? "veli" : "öğrenci"})</small>` : ""}${g.sira_degisti ? " ↕" : ""}</td></tr>`).join("");
  const dersler = oz.dersler.map(d => `<li><b>${esc(dersAdiBul(d.ders_id))}</b>: tahmin ${d.plan} dk, gerçek ${d.gercek} dk
      <span class="${d.gercek > d.plan * 1.25 ? "uyari-yazi" : ""}">(${d.plan ? Math.round(d.gercek / d.plan * 100) : 0}%)</span></li>`).join("");
  const notlar = [...oz.zorlar.map(z => ({ ...z, t: "😕 zorlandı" })), ...oz.yarimlar.map(z => ({ ...z, t: "◐ yarım" }))]
    .sort((a, b) => b.tarih.localeCompare(a.tarih)).slice(0, 12)
    .map(z => `<li>${esc(gunuYaz(z.tarih).split(" ").slice(0, 2).join(" "))} · <b>${esc(dersAdiBul(z.ders_id))}</b> ${z.t}${z.not ? " — “" + esc(z.not) + "”" : ""}</li>`).join("");
  const YER = { okul: "🏫 okulda boş vakitte", bekleme: "🚏 çıkışta beklerken", diger: "başka bir zamanda" };
  const dis = (oz.disarida || []).slice().reverse().slice(0, 10)
    .map(z => `<li>${esc(gunuYaz(z.tarih).split(" ").slice(0, 2).join(" "))} · <b>${esc(dersAdiBul(z.ders_id))}</b> ${YER[z.yer] || ""}</li>`).join("");
  const uyarilar = p.uyarilar.map(u => {
    const o = aktifOdevler().find(x => x.id === u.odev_id);
    if (u.tur === "yogun_gun") return `<li>${esc(gunuYaz(u.tarih))}: bütçenin ${u.dk} dk üstünde iş var</li>`;
    if (u.tur === "gecikti") return `<li><b>${esc(dersAdiBul(o && o.ders_id))}</b> ödevi gecikti (teslim ${esc(gunuYaz(u.teslim))})</li>`;
    return `<li><b>${esc(dersAdiBul(o && o.ders_id))}</b>: ${u.dk} dk planlanamadı</li>`;
  }).join("");
  $("#plan-veli-ozet").innerHTML = `${uyarilar ? `<div class="plan-uyari"><b>Dikkat</b><ul>${uyarilar}</ul></div>` : ""}
    <div class="liste-kap"><table class="plan-ozet-tablo"><tr><th>Gün</th><th>Planlanan</th><th>Yapılan (plan)</th><th>Gerçek süre</th><th>Biten</th><th>Zor</th><th>Okulda / dışarıda</th><th>Gün sonu</th><th>Özel</th></tr>${gunler}</table></div>
    <div class="plan-ozet-iki"><div><b>Tahmin ve gerçek süre (14 gün)</b><ul>${dersler || "<li>Henüz ölçüm yok</li>"}</ul></div>
      <div><b>Zorlandığı ve yarım kalanlar</b><ul>${notlar || "<li>Yok</li>"}</ul></div>
      <div><b>Evde değil, başka yerde yaptıkları</b><ul>${dis || "<li>Yok</li>"}</ul></div></div>`;
  planAyarFormu(p.ayarlar);
}

function planAyarFormu(a) {
  const gunSirasi = [1, 2, 3, 4, 5, 6, 0];
  $("#plan-ayar-form").innerHTML = `<div class="panel-baslik alt-baslik">Plan ayarları</div>
    <div class="plan-ayar-izgara">
      <fieldset><legend>Günlük ödev süresi (dk)</legend><div class="butce-satir">${gunSirasi.map(g => `<label>${PLAN_GUN_KISA[g]}<input type="number" min="0" max="300" step="5" name="butce${g}" value="${a.butce[g]}"></label>`).join("")}</div></fieldset>
      <fieldset><legend>Ödev saati ne zaman başlar?</legend>
        <label class="anahtar"><input type="radio" name="baslangic_tur" value="okul"${a.baslangic_tur === "okul" ? " checked" : ""}> <span>Okul bitişinden <input type="number" name="ara_dk" min="0" max="240" step="5" value="${a.ara_dk}" class="dar"> dk sonra</span></label>
        <label class="anahtar"><input type="radio" name="baslangic_tur" value="sabit"${a.baslangic_tur === "sabit" ? " checked" : ""}> <span>Her gün saat <input name="sabit_saat" class="saat-gir dar" maxlength="5" value="${esc(a.sabit_saat)}"></span></label>
        <label>Hafta sonu başlangıç <input name="hafta_sonu_saat" class="saat-gir dar" maxlength="5" value="${esc(a.hafta_sonu_saat)}"></label>
        <label>En geç bitiş <input name="en_gec" class="saat-gir dar" maxlength="5" value="${esc(a.en_gec)}"></label></fieldset>
      <fieldset><legend>Planlama</legend>
        <label>Teslimden kaç gün önce bitsin <small>(son gün dışında pay)</small><input type="number" name="tampon_gun" min="0" max="3" value="${a.tampon_gun}" class="dar"></label>
        <label>Çalışma bloğu / mola (dk) <span><input type="number" name="blok_dk" min="10" max="60" value="${a.blok_dk}" class="dar"> / <input type="number" name="mola_dk" min="0" max="20" value="${a.mola_dk}" class="dar"></span></label>
        <label class="anahtar"><input type="checkbox" name="arin_sira"${a.arin_sira ? " checked" : ""}> <span>Öğrenci günün sırasını değiştirebilsin</span></label></fieldset>
      <fieldset class="genis"><legend>Her gün yapılacaklar (ödev süresine sayılmaz)</legend>
        <div id="sabit-listesi">${(a.sabitler || []).map(sabitSatiri).join("")}</div>
        <button type="button" class="dugme kucuk" id="sabit-ekle">＋ Ekle</button></fieldset>
    </div>
    <div class="form-alt"><button class="dugme ana-dugme">Plan ayarlarını kaydet</button></div>`;
  $$("#plan-ayar-form .saat-gir").forEach(k => typeof saatKutusuKur === "function" && saatKutusuKur(k));
}
function sabitSatiri(s) {
  return `<div class="sabit-satir" data-id="${esc(s.id || "")}"><input class="sabit-ad" maxlength="60" value="${esc(s.ad || "")}" placeholder="Ör. Kitap okuma">
    <input class="sabit-dk dar" type="number" min="0" max="180" value="${s.dk || 0}"> dk
    <span class="sabit-gunler">${[1, 2, 3, 4, 5, 6, 0].map(g => `<label><input type="checkbox" value="${g}"${(s.gunler || []).includes(g) ? " checked" : ""}>${PLAN_GUN_KISA[g]}</label>`).join("")}</span>
    <button type="button" class="kaynak-sil" data-sabit-sil>✕</button></div>`;
}
async function planAyarKaydet(e) {
  e.preventDefault();
  const f = e.target, al = n => f.elements[n].value.trim();
  const saat = n => { const v = saatDuzelt(al(n)); if (!v) throw new Error("Saatleri 16:30 gibi yaz"); return v; };
  try {
    const govde = {
      butce: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(g => [String(g), Number(al("butce" + g) || 0)])),
      baslangic_tur: f.elements.baslangic_tur.value, ara_dk: Number(al("ara_dk") || 0), sabit_saat: saat("sabit_saat"),
      hafta_sonu_saat: saat("hafta_sonu_saat"), en_gec: saat("en_gec"), tampon_gun: Number(al("tampon_gun") || 0),
      blok_dk: Number(al("blok_dk") || 25), mola_dk: Number(al("mola_dk") || 0), arin_sira: f.elements.arin_sira.checked,
      sabitler: $$(".sabit-satir", f).map(s => ({ id: s.dataset.id, ad: $(".sabit-ad", s).value.trim(), dk: Number($(".sabit-dk", s).value || 0),
        gunler: $$(".sabit-gunler input:checked", s).map(i => Number(i.value)) })).filter(s => s.ad),
    };
    await api("PUT", "plan/ayarlar", govde);
    bildir("Plan ayarları kaydedildi");
    await planYukle(); planVeliCiz();
  } catch (hata) { bildir(hata.message, true); }
}


/* ---------- Olaylar ---------- */
function planOlaylariniKur() {
  listeOlaylariniKur();
  surukleKur();
  $("#sayfa-plan").addEventListener("click", async e => {
    const b = e.target.closest("[data-pl]");
    if (!b) return;
    const ne = b.dataset.pl, satirEl = b.closest("[data-odev]"), odevId = b.dataset.odev || (satirEl && satirEl.dataset.odev);
    try {
      if (ne === "basla") { const g = simdikiGorev(); if (g) zamanBaslat(g); }
      if (ne === "durdur") durdurSor();
      if (ne === "devam") devamEt();
      if (ne === "dur-bitti") await bittiKaydet(simdikiGorev());
      if (ne === "dur-yarim") { araVer(); durdurSor(); setTimeout(() => { const k = $('[data-secim="ne"] [data-deger="yarim"]'); if (k) k.click(); }, 0); }
      if (ne === "zor") zorSor(simdikiGorev());
      if (ne === "zaten") zatenYaptimSor(odevId);
      if (ne === "baska") baskaOdevSor();
      if (ne === "simdi") await simdiSec(odevId, true, false);
      if (ne === "bitenler") { plan.acikBitenler = !plan.acikBitenler; planCiz(); }
      if (ne === "ozel") ozelGunSor();
      if (ne === "tek-odev") pencereAc("odev");
      if (ne === "not") notGoster(odevId);
      if (ne === "yenile") await planiYenile();
    } catch (hata) { bildir(hata.message, true); }
  });
  $("#pl-sonra").addEventListener("click", async e => {
    const g = e.target.closest("[data-geri-al]");
    if (g) { try { await planIslem({ tur: "geri_al", odev_id: g.dataset.geriAl }); bildir("Geri alındı; plan yenilendi"); } catch (h) { bildir(h.message, true); } }
  });
  $("#pl-sekmeler").addEventListener("click", e => { const b = e.target.closest("[data-sekme]"); if (b) { plan.sekme = b.dataset.sekme; sagCiz(); } });
  $("#pl-sekme-ic").addEventListener("change", async e => {
    const s = e.target.closest("[data-sabit]");
    if (s) {
      try {
        await planIslem({ tur: "sabit", id: s.dataset.sabit, bitti: s.checked });
        if (s.checked) anlikSoyle(rehber("sabit_bitti", { ders: s.closest("label").querySelector("span").textContent.trim() }), 8000);
      } catch (h) { bildir(h.message, true); }
      return;
    }
    const k = e.target.closest("[data-canta]");
    if (k && plan.veri.canta) {
      const t = plan.veri.canta.tarih, set = new Set(cantaIsaretleri(t));
      if (k.checked) set.add(k.dataset.canta); else set.delete(k.dataset.canta);
      try { localStorage.setItem("ogretmenim-canta-" + t, JSON.stringify([...set])); } catch (_) {}
    }
  });
  $("#plan-degerlendirme").addEventListener("click", async e => {
    const b = e.target.closest("[data-deg]");
    if (!b) return;
    try {
      await api("POST", "plan/islem", { tur: "degerlendirme", deger: b.dataset.deg, not: ($("#deg-not") || {}).value || "" });
      plan.degerlendirmeCevap = rehber("degerlendirme_" + b.dataset.deg, {});
      await planYukle();
    } catch (h) { bildir(h.message, true); }
  });
  const form = $("#plan-soru-form");
  form.addEventListener("click", e => {
    const b = e.target.closest("[data-secim] button");
    if (b) $$("button", b.parentNode).forEach(x => x.classList.toggle("sec", x === b));
    if (plan.soru && plan.soru.tikla) plan.soru.tikla(form, e);
  });
  $("#plan-soru-vazgec").addEventListener("click", () => $("#plan-soru-pencere").close());
  form.addEventListener("submit", async e => {
    e.preventDefault();
    try { await plan.soru.kaydet(e.target); $("#plan-soru-pencere").close(); } catch (h) { bildir(h.message, true); }
  });
  $("#plan-soru-sil").addEventListener("click", async () => {
    try { await plan.soru.silFn(form); $("#plan-soru-pencere").close(); } catch (h) { bildir(h.message, true); }
  });
  $("#plan-veli-yenile").addEventListener("click", planVeliCiz);
  $("#plan-ayar-form").addEventListener("submit", planAyarKaydet);
  $("#plan-ayar-form").addEventListener("click", e => {
    if (e.target.closest("#sabit-ekle")) $("#sabit-listesi").insertAdjacentHTML("beforeend", sabitSatiri({ gunler: [0, 1, 2, 3, 4, 5, 6], dk: 15 }));
    const s = e.target.closest("[data-sabit-sil]"); if (s) s.closest(".sabit-satir").remove();
  });
  setInterval(zamanTik, 15000);
  setInterval(() => { if ($("#sayfa-plan").classList.contains("aktif") && !$("dialog[open]") && !plan.surukle) planYukle(); }, 120000);
}
