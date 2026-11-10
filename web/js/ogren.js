/* ÖğretmeniM 0.28 — Sade görünüm: "Bugün" ekranındaki sıradaki iş kutusu, "Öğren" sayfası sekmeleri
   ve her yerden açılabilen Sınav provası. */
"use strict";

const ogren = { bolum: "yazili" };

/* ---------- Bugün: sıradaki iş ---------- */
function anaSiradakiCiz() {
  const kap = $("#ana-siradaki");
  if (!kap || !durum.veri) return;
  let g = null;
  try { g = plan.veri ? simdikiGorev() : null; } catch (_) { g = null; }
  const yakin = (typeof hz !== "undefined" && hz.yuklendi) ? siraliYazililar().find(y => { const k = kalanGun(y.tarih); return k != null && k >= 0 && k <= 7; }) : null;
  if (g) {
    const d = dersBul(g.ders_id) || { ad: "Ders", renk: "#888" };
    kap.innerHTML = `<div class="siradaki-kutu" style="--renk:${esc(d.renk)}">
      <div class="sk-yazi"><small>SIRADAKİ İŞ</small><b>${esc(d.ad)} — ${esc(g.parca || "")}</b>
      ${yakin ? `<span>Sonra: ${esc(yakin.ad)} yazılısı için biraz tekrar (${kalanYazi(kalanGun(yakin.tarih)).toLocaleLowerCase("tr")})</span>` : ""}</div>
      <button class="dugme ana sk-dugme" data-git="plan">▶ Çalışmaya başla</button></div>`;
  } else if (yakin) {
    kap.innerHTML = `<div class="siradaki-kutu" style="--renk:${HZ_RENK[yakin.ders] || "#6366F1"}">
      <div class="sk-yazi"><small>BUGÜN ÖDEVİN YOK</small><b>${esc(yakin.ad)} yazılısı · ${esc(kalanYazi(kalanGun(yakin.tarih)))}</b><span>Biraz hazırlanmaya ne dersin?</span></div>
      <button class="dugme ana sk-dugme" data-yazili="${yakin.ders}">🎯 Hazırlan</button></div>`;
  } else {
    kap.innerHTML = `<div class="siradaki-kutu" style="--renk:#34C77B">
      <div class="sk-yazi"><small>BUGÜN</small><b>Ödevin yok 🎉</b><span>İstersen kelime ya da oyunlarla biraz pratik yap.</span></div>
      <button class="dugme ana sk-dugme" data-git="ogren">🎯 Öğren</button></div>`;
  }
}

/* ---------- Öğren sayfası ---------- */
function ogrenCiz() {
  $$("#ogren-sekmeler [data-ogren]").forEach(b => b.classList.toggle("aktif", b.dataset.ogren === ogren.bolum));
  $$("#sayfa-ogren .ogren-bolum").forEach(s => { s.hidden = s.dataset.bolum !== ogren.bolum; });
  if (ogren.bolum === "yazili") { if (typeof yaziliPanelCiz === "function") yaziliPanelCiz(); provaListesiCiz(); }
  if (ogren.bolum === "kelime" && typeof kdPanelCiz === "function") kdPanelCiz();
}

/* ---------- Sınav provası (her zaman açık) ---------- */
function provaListesiCiz() {
  const kap = $("#ogren-prova");
  if (!kap || typeof hz === "undefined" || !hz.yuklendi || !hz.yazililar.length) { if (kap) kap.innerHTML = ""; return; }
  kap.innerHTML = `<div class="prova-kutu"><div class="prova-baslik"><b>📝 Sınav provası</b><small>Yazılıdaki soru dağılımıyla, gerçek sınav gibi. İstediğin zaman, istediğin kadar.</small></div>
    <div class="prova-liste">${siraliYazililar().map(y => {
      const g = kalanGun(y.tarih);
      return `<button class="prova-sec" data-prova-ders="${y.ders}" style="--renk:${HZ_RENK[y.ders] || "#6366F1"}"><span>${y.simge}</span><b>${esc(y.ad)}</b><small>${g == null ? "tarih yok" : g < 0 ? "yapıldı · tekrar et" : esc(kalanYazi(g))}</small></button>`;
    }).join("")}</div></div>`;
}
function provaSecimEkrani() {
  if (typeof hz === "undefined" || !hz.yuklendi || !hz.yazililar.length) return bildir("Prova için yazılı içeriği yüklenmedi", true);
  mufOyunuDurdur();
  const p = $("#oyun-pencere");
  p.style.setProperty("--renk", "#A855F7");
  if (!p.open) p.showModal();
  $("#oyun-baslik").innerHTML = "<span>📝</span> Sınav provası";
  $("#oyun-geri-tus").hidden = true;
  oyunIlerleme(0, 0);
  $("#oyun-alan").innerHTML = `<div class="muf-ust"><h3>Hangi sınavın provasını yapacaksın?</h3><p>Sorular yazılıdaki dağılımla gelir; açık uçlu sorular önce.</p></div>
    <div class="prova-liste buyuk">${siraliYazililar().map(y => {
      const g = kalanGun(y.tarih), top = y.ciktilar.reduce((t, c) => t + (c.soru || 1), 0);
      return `<button class="prova-sec" data-prova-ders="${y.ders}" style="--renk:${HZ_RENK[y.ders] || "#6366F1"}"><span>${y.simge}</span><b>${esc(y.ad)}</b>
        <small>${top} soru · ${g == null ? "tarih yok" : g < 0 ? "yapıldı" : esc(kalanYazi(g))}</small></button>`;
    }).join("")}</div>`;
}
async function provaBaslat(ders) {
  const kod = "y1-" + ders;
  if (!DERSLER[kod]) return;
  await mufPencereAc(kod);
  if (typeof IC_PROFIL !== "undefined" && IC_PROFIL[ders]) return icProvaBaslat(ders);   // 0.31/0.32: üretilen prova
  yaziliDeneme(DERSLER[kod]);
}

function ogrenOlaylariniKur() {
  $("#ogren-sekmeler").addEventListener("click", e => {
    const b = e.target.closest("[data-ogren]");
    if (!b) return;
    ogren.bolum = b.dataset.ogren;
    sesCal("tik");
    ogrenCiz();
  });
  document.addEventListener("click", e => {
    if (e.target.closest("#prova-ac, [data-prova]")) { sesCal("tik"); return provaSecimEkrani(); }
    const s = e.target.closest("[data-prova-ders]");
    if (s) { sesCal("tik"); provaBaslat(s.dataset.provaDers); }
  });
  anaSiradakiCiz();
}
