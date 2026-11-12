/* ÖğretmeniM web — veli ana sayfası (Özet).
   "Bugün her şey yolunda mı · bir şey yapmam gerekiyor mu · bu hafta nasıl gitti" sorularına tek ekranda cevap.
   Uyarılar bildirim sistemiyle aynı anahtarları kullanır (araclar/bildirim/uyarilar.mjs); "Haberim var" denen uyarı
   o gün için ne Özet'te ne bildirimde tekrar çıkar. */
"use strict";

const VO = { bilinen: new Set(), son: null };

/* Uyarıları hesapla: bildirim betiğiyle aynı kurallar */
function veliUyarilari(plan) {
  const bugun = tarihStr(new Date()), yarin = tarihStr(gunEkle(new Date(), 1)), ad = (durum.veri.profil.ogrenci_adi || "Öğrenci").trim();
  const odevler = aktifOdevler(), u = [];
  const gunO = ((plan && plan.ozet && plan.ozet.gunler) || []).find(g => g.tarih === bugun);
  const saat = new Date().getHours();
  const yaklasan = odevler.some(o => !o.bitti && o.teslim <= tarihStr(gunEkle(new Date(), 2)));
  if (gunO && gunO.planlanan > 0 && saat >= 17 && gunO.yapilan < gunO.planlanan * 0.9) {
    const kalan = ((plan.gunler && plan.gunler[0] && plan.gunler[0].gorevler) || []).map(g => dersAdiBul((odevler.find(o => o.id === g.odev_id) || {}).ders_id));
    u.push({ anahtar: `plan:${bugun}`, tur: "uyari", metin: `${ad}: bugünkü planın %${Math.round(100 * gunO.yapilan / gunO.planlanan)} kadarı yapıldı`,
      alt: kalan.length ? "Kalan: " + [...new Set(kalan)].join(", ") : "" });
  } else if (saat >= 17 && !(gunO && (gunO.biten || gunO.yarim)) && yaklasan) {
    u.push({ anahtar: `plan:${bugun}`, tur: "uyari", metin: `${ad} bugün hiç çalışma işaretlemedi`, alt: "Teslimi yaklaşan ödev var" });
  }
  for (const o of odevler.filter(o => !o.bitti && o.teslim < bugun))
    u.push({ anahtar: `geciken:${o.id}`, tur: "dikkat", metin: `${dersAdiBul(o.ders_id)} ödevinin teslimi geçti`, alt: `${o.baslik || ""} · teslim ${tarihYaz(o.teslim)}`, kayit: o.id });
  const ilerleme = (plan && plan.ilerleme) || {};
  for (const o of odevler.filter(o => !o.bitti && o.teslim === yarin && !ilerleme[o.id]))
    u.push({ anahtar: `yarin:${o.id}`, tur: "uyari", metin: `Yarın teslim: ${dersAdiBul(o.ders_id)} ödevine başlanmadı`, alt: o.baslik || "", kayit: o.id });
  for (const m of (durum.veri.koleksiyonlar.mesajlar || []).filter(m => !m.silindi && m.kimden === "ogrenci" && m.tur === "istek" && !m.tamam))
    u.push({ anahtar: `istek:${m.id}`, tur: "istek", metin: `${ad} bir şey istiyor`, alt: m.metin });
  for (const s of aktifEtkinlikler().filter(e => e.tur === "sinav" && e.tarih < bugun && typeof e.puan !== "number" && e.tarih >= tarihStr(gunEkle(new Date(), -30))))
    u.push({ anahtar: `not:${s.id}`, tur: "bilgi", metin: `${dersAdiBul(s.ders_id)} sınavının notu girilmedi`, alt: tarihYaz(s.tarih), sinav: s.id });
  return u;
}

/* Aynı türden çok uyarı tek satırda toplanır ("10 ödevin teslimi geçti"); "Haberim var" hepsini birden kapatır */
function uyarilariGrupla(liste) {
  const GRUP = { geciken: n => `${n} ödevin teslimi geçti`, not: n => `${n} sınavın notu girilmedi` };
  const sonuc = [], turu = u => u.anahtar.split(":")[0];
  for (const [tur, baslik] of Object.entries(GRUP)) {
    const l = liste.filter(u => turu(u) === tur);
    if (l.length > 2) sonuc.push({ anahtar: l.map(u => u.anahtar).join(","), tur: l[0].tur, metin: baslik(l.length),
      alt: l.slice(0, 6).map(u => u.metin.replace(/ ödevinin teslimi geçti| sınavının notu girilmedi/, "")).join(", ") + (l.length > 6 ? "…" : ""),
      git: tur === "geciken" ? "ana" : "dersler" });
  }
  return liste.filter(u => !(GRUP[turu(u)] && liste.filter(x => turu(x) === turu(u)).length > 2)).concat(sonuc)
    .sort((a, b) => ["dikkat", "uyari", "istek", "bilgi"].indexOf(a.tur) - ["dikkat", "uyari", "istek", "bilgi"].indexOf(b.tur));
}

async function veliOzetCiz() {
  if (!veliAktif() || !$("#sayfa-ozet")) return;
  let plan = null;
  try { plan = await api("GET", "plan"); } catch (_) { /* plan yoksa da özet çizilir */ }
  try { VO.bilinen = new Set(await Bulut.bilinenler(OTURUM.ogrenci)); } catch (_) { /* çevrimdışı */ }
  VO.son = plan;
  ozGorevlerCiz(plan);
  const ad = (durum.veri.profil.ogrenci_adi || "Öğrenci").trim(), bugun = tarihStr(new Date());
  $("#oz-baslik").textContent = ad;
  $("#oz-alt").textContent = `${tarihYaz(bugun)} · ${aktifSinif()}. sınıf`;

  /* Durum şeridi */
  const gunO = ((plan && plan.ozet && plan.ozet.gunler) || []).find(g => g.tarih === bugun) || {};
  const geciken = aktifOdevler().filter(o => !o.bitti && o.teslim < bugun).length;
  const acik = aktifOdevler().filter(o => !o.bitti && o.teslim >= bugun).length;
  const oran = gunO.planlanan ? Math.min(100, Math.round(100 * (gunO.yapilan || 0) / gunO.planlanan)) : null;
  const renk = geciken ? "kirmizi" : oran !== null && oran < 50 && new Date().getHours() >= 17 ? "sari" : "yesil";
  const cumle = geciken ? `${geciken} ödevin teslimi geçti.` : oran === null ? (gunO.biten ? "Bugün çalıştı." : "Bugün henüz çalışma işaretlenmedi.")
    : oran >= 90 ? "Bugünkü plan bitti 👏" : oran === 0 ? "Bugünkü plana henüz başlanmadı." : `Bugünkü plan: %${oran} yapıldı.`;
  $("#oz-durum").innerHTML = `<div class="oz-serit ${renk}"><span class="oz-isik"></span><b>${esc(cumle)}</b>
    <span class="oz-sayilar"><span><b>${gunO.biten || 0}</b> iş bitti</span><span><b>${acik}</b> açık ödev</span>${gunO.zor ? `<span><b>${gunO.zor}</b> kez zorlandı</span>` : ""}</span></div>`;

  /* Senden beklenenler */
  const uyarilar = uyarilariGrupla(veliUyarilari(plan).filter(u => !VO.bilinen.has(u.anahtar)));
  $("#oz-beklenen").innerHTML = uyarilar.length ? `<ul class="oz-uyarilar">${uyarilar.map(u => `<li class="oz-u ${u.tur}">
      <div><b>${esc(u.metin)}</b>${u.alt ? `<small>${esc(u.alt)}</small>` : ""}</div>
      <span class="oz-u-dugme">${u.sinav ? `<button class="dugme kucuk" data-oz-sinav="${u.sinav}">Not gir</button>` : ""}${u.kayit ? `<button class="dugme kucuk" data-oz-odev="${u.kayit}">Aç</button>` : ""}${u.git ? `<button class="dugme kucuk" data-git="${u.git}">Gör</button>` : ""}
      <button class="dugme kucuk" data-oz-bildim="${esc(u.anahtar)}" title="Bugün bir daha hatırlatılmaz">✓ Haberim var</button></span></li>`).join("")}</ul>`
    : `<p class="oz-bos">Şu an senden beklenen bir şey yok. 🌿</p>`;

  /* Son 7 gün */
  const gunler = (plan && plan.ozet && plan.ozet.gunler) || [];
  $("#oz-hafta").innerHTML = gunler.length ? `<div class="oz-gunler">${gunler.map(g => {
      const o = g.planlanan ? Math.min(1, (g.yapilan || 0) / g.planlanan) : (g.biten ? 1 : 0);
      const t = strTarih(g.tarih);
      return `<div class="oz-gun${g.tarih === bugun ? " bugun" : ""}" title="${tarihYaz(g.tarih)}: ${g.biten} iş bitti${g.planlanan ? `, plan %${Math.round(o * 100)}` : ""}">
        <div class="oz-cubuk"><i style="height:${Math.round(o * 100)}%"></i></div>
        <b>${GUNLER[t.getDay()].slice(0, 3)}</b><small>${g.biten || "–"}</small>${g.degerlendirme ? `<span class="oz-deg">${{ kolay: "🙂", iyi: "😊", zor: "😓" }[g.degerlendirme.deger] || ""}</span>` : ""}</div>`;
    }).join("")}</div><p class="panel-not">Sütun: planın yapılan kısmı · alttaki sayı: biten iş · yüz: gün sonu değerlendirmesi</p>` : `<p class="oz-bos">Henüz çalışma kaydı yok.</p>`;

  /* Yaklaşan sınavlar + son notlar */
  const sinavlar = aktifEtkinlikler().filter(e => e.tur === "sinav");
  const yk = sinavlar.filter(s => s.tarih >= bugun).sort((a, b) => a.tarih.localeCompare(b.tarih)).slice(0, 5);
  const hazir = {};
  if (typeof hz !== "undefined" && hz.yuklendi) for (const y of hz.yazililar) hazir[y.ders] = Math.round(100 * yaziliOrani(y));
  $("#oz-sinavlar").innerHTML = yk.length ? `<ul class="ds-liste">${yk.map(s => {
      const d = dersBul(s.ders_id) || {}, kalan = Math.round((strTarih(s.tarih) - gunBasi(new Date())) / 864e5);
      const kod = d.ad ? (dersYaziliKodu(d) || "").replace("y1-", "") : "";
      return `<li><span>${esc(d.ad || "Sınav")} <small>${SINAV_TURLERI[s.sinav_turu] || ""}</small></span><span>${kalan === 0 ? "bugün" : kalan === 1 ? "yarın" : kalan + " gün"}</span>
        ${kod && hazir[kod] !== undefined ? `<span class="oz-hazir" title="Yazılı hazırlık">%${hazir[kod]} hazır</span>` : ""}</li>`;
    }).join("")}</ul>` : `<p class="oz-bos">Yaklaşan sınav yok.</p>`;
  const notlu = sinavlar.filter(s => typeof s.puan === "number").sort((a, b) => b.tarih.localeCompare(a.tarih)).slice(0, 5);
  $("#oz-notlar").innerHTML = notlu.length ? `<ul class="ds-liste">${notlu.map(s => `<li class="tikla" data-oz-sinav="${s.id}" title="Notu düzeltmek için dokun"><span>${esc(dersAdiBul(s.ders_id))} <small>${tarihYaz(s.tarih)}</small></span>
      <span class="oz-not-sag"><span class="not-rozet ${notSinifi(s.puan)}">${s.puan}</span><span class="oz-duzelt" aria-hidden="true">✎</span></span></li>`).join("")}</ul>` : `<p class="oz-bos">Henüz not girilmedi.</p>`;
}

/* Bugünün görevleri: kontrol listesi (✓ tamamlanan, ◐ yarım, ☐ eksik) · Haftanın görevleri: yarından itibaren gün gün */
function ozGorevlerCiz(plan) {
  const kap = $("#oz-bugun"), hafta = $("#oz-hafta-gorev");
  if (!kap || !hafta) return;
  if (!plan || !plan.gunler || !plan.gunler.length) { kap.innerHTML = hafta.innerHTML = `<p class="oz-bos">Plan henüz yok.</p>`; $("#oz-gorev-sayac").textContent = ""; return; }
  const bugun = tarihStr(new Date()), g0 = plan.gunler[0], odevler = aktifOdevler();
  const odev = id => odevler.find(o => o.id === id) || {};
  const ders = id => dersBul(id) || { ad: "Ders", renk: "#888" };
  const satir = (durumu, d, metin, alt = "") => `<li class="oz-cl ${durumu}" style="--r:${esc(d.renk)}">
      <span class="oz-cl-kutu" aria-label="${{ tamam: "tamamlandı", yarim: "yarım", eksik: "yapılmadı" }[durumu]}">${{ tamam: "✓", yarim: "◐", eksik: "" }[durumu]}</span>
      <span class="oz-cl-yazi"><b>${esc(d.ad)}</b> ${esc(metin)}${alt ? `<small>${esc(alt)}</small>` : ""}</span></li>`;
  const tamam = [], eksik = [], gosterilen = new Set();
  const etiket = (o, parca) => { const bas = o.baslik || ""; return { metin: parca || bas || "ödev", alt: [bas && bas !== parca ? bas : "", o.teslim === bugun ? "📦 bugün teslim" : ""].filter(Boolean).join(" · ") }; };
  // bugün işaretlenenler (öğrencinin "bitti" / "yarım" dediği çalışmalar)
  for (const c of (plan.bugun_yapilanlar || []).filter(c => ["bitti", "yarim"].includes(c.durum))) {
    const o = odev(c.odev_id), e = etiket(o, c.parca); gosterilen.add(c.odev_id);
    (c.durum === "bitti" ? tamam : eksik).push(satir(c.durum === "bitti" ? "tamam" : "yarim", ders(o.ders_id), e.metin, e.alt));
  }
  // plandaki kalan görevler
  for (const t of g0.gorevler || []) {
    const o = odev(t.odev_id), e = etiket(o, t.parca + (t.parca_sayisi > 1 ? ` (${t.parca_no}/${t.parca_sayisi})` : "")); gosterilen.add(t.odev_id);
    eksik.push(satir("eksik", ders(t.ders_id), e.metin, e.alt));
  }
  // her gün yapılacaklar (kitap okuma vb.)
  const sabitBitti = new Set(((plan.gun_bilgisi || {})[bugun] || {}).sabit || []);
  for (const s of g0.sabitler || []) (sabitBitti.has(s.id) ? tamam : eksik).push(satir(sabitBitti.has(s.id) ? "tamam" : "eksik", { ad: "Her gün", renk: "var(--vurgu)" }, s.ad));
  // bugün teslimi olup yukarıda görünmeyen ödevler
  for (const o of odevler.filter(o => o.teslim === bugun && !gosterilen.has(o.id)))
    (o.bitti ? tamam : eksik).push(satir(o.bitti ? "tamam" : "eksik", ders(o.ders_id), o.baslik || "ödev", "📦 bugün teslim"));
  const top = tamam.length + eksik.length;
  $("#oz-gorev-sayac").textContent = top ? `${tamam.length}/${top} tamam` : "";
  kap.innerHTML = top ? `<div class="oz-gorev-cubuk"><i style="width:${Math.round(100 * tamam.length / top)}%"></i></div>
      <ul class="oz-cl-liste">${eksik.join("")}${tamam.join("")}</ul>` : `<p class="oz-bos">Bugün için görev yok 🎈</p>`;
  // haftanın görevleri: yarından 6 gün
  const acik = odevler.filter(o => !o.bitti);
  hafta.innerHTML = `<div class="oz-hafta-gunler">${plan.gunler.slice(1, 7).map((g, i) => {
    const teslim = acik.filter(o => o.teslim === g.tarih);
    const isler = (g.gorevler || []).map(t => { const d = ders(t.ders_id); return `<li style="--r:${esc(d.renk)}"><b>${esc(d.ad)}</b> ${esc(t.parca)}</li>`; });
    return `<div class="oz-hg${g.ozel ? " ozel" : ""}"><div class="oz-hg-ad"><b>${i === 0 ? "Yarın" : esc(g.gun)}</b><small>${strTarih(g.tarih).getDate()} ${AYLAR[strTarih(g.tarih).getMonth()]}</small></div>
      <ul>${isler.join("") || `<li class="oz-hg-bos">Serbest 🎈</li>`}</ul>
      ${teslim.length ? `<div class="oz-hg-teslim">📦 Teslim: ${teslim.map(o => esc(ders(o.ders_id).ad)).join(", ")}</div>` : ""}</div>`;
  }).join("")}</div>`;
}

function raporSayfasiCiz() {
  if (!veliAktif()) return;
  raporCiz(); gelisimCiz(); planVeliCiz();
}

function veliOzetOlaylariniKur() {
  const kap = $("#sayfa-ozet");
  if (!kap) return;
  kap.addEventListener("click", async e => {
    const h = e.target.closest("[data-oz]");
    if (h) {
      const ne = h.dataset.oz;
      if (ne === "odev") return pencereAc("odev");
      if (ne === "sinav") return pencereAc("sinav");
      if (ne === "not") {
        const s = aktifEtkinlikler().filter(x => x.tur === "sinav" && x.tarih <= tarihStr(new Date()) && typeof x.puan !== "number").sort((a, b) => b.tarih.localeCompare(a.tarih))[0];
        return s ? pencereAc("sinav", s) : bildir("Notu girilecek sınav yok. Yeni sınav için 📝 Sınav'a bas.");
      }
      if (ne === "mesaj") return $("#mesaj-ac").click();
      if (ne === "liste") return $("#liste-ac").click();
      if (ne === "ozel") return typeof ozelGunSor === "function" && ozelGunSor();
    }
    const b = e.target.closest("[data-oz-bildim]");
    if (b) {
      try { for (const a of b.dataset.ozBildim.split(",")) { await Bulut.haberimVar(OTURUM.ogrenci, a); VO.bilinen.add(a); } b.closest("li").remove(); bildir("Tamam, bugün bir daha hatırlatılmayacak"); }
      catch (h2) { bildir(h2.message, true); }
      return;
    }
    const s = e.target.closest("[data-oz-sinav]");
    if (s) { const k = kayitBul("etkinlikler", s.dataset.ozSinav); if (k) pencereAc("sinav", k); return; }
    const o = e.target.closest("[data-oz-odev]");
    if (o) { const k = kayitBul("odevler", o.dataset.ozOdev); if (k) pencereAc("odev", k); }
  });
}
