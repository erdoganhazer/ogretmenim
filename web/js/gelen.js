/* ÖğretmeniM — bildirim zili (🔔): son bildirimler ve okunmamış sayısı. Hem öğrenci hem veli ekranında, üst şeritte.
   Kaynak: kişinin gelen kutusu (kisiler/{ben}/gelen) + veliysem seçili öğrencinin velilere giden kutusu (ogrenciler/{oid}/gelen).
   Gelen kutusuna mesaj/duyuru/"ödev bitti" anında yazılır (bulut.js kuyrukKaydi); günlük veli uyarılarını sunucu yazar.
   Ayrıca: öğrenci bir ödevi bitirince velilerine "ödev bitti" bildirimi bırakılır (odevBittiIzle). */
"use strict";

const GELEN = { liste: [], kapat: null, sonOkunmamis: null };
const GELEN_SIMGE = { mesaj: "💬", odev: "✅", duyuru: "📣", uyari: "⏰" };

function gelenBaslat() {
  const ben = typeof girisKisi !== "undefined" && girisKisi;
  if (!ben || typeof Bulut === "undefined" || !Bulut.gelenDinle) return;
  if (GELEN.kapat) GELEN.kapat();
  GELEN.sonOkunmamis = null;
  GELEN.kapat = Bulut.gelenDinle(ben, OTURUM.ogrenci, liste => { GELEN.liste = liste.slice(0, 60); gelenCiz(); });
}

function gelenCiz() {
  const okunmamis = GELEN.liste.filter(g => !g.okundu);
  const r = $("#gelen-sayi");
  if (r) { r.hidden = !okunmamis.length; r.textContent = okunmamis.length > 9 ? "9+" : okunmamis.length; }
  $("#gelen-ac") && $("#gelen-ac").classList.toggle("yeni", okunmamis.length > 0);
  // yeni gelen "ödev bitti"/"duyuru" için kısa haber (mesajlar kendi rozetini zaten gösteriyor)
  if (GELEN.sonOkunmamis !== null && okunmamis.length > GELEN.sonOkunmamis && $("#gelen-panel").hidden) {
    const yeni = okunmamis[0];
    if (yeni && yeni.tur !== "mesaj") bildir(`${GELEN_SIMGE[yeni.tur] || "🔔"} ${yeni.baslik}${yeni.metin ? " — " + yeni.metin.slice(0, 50) : ""}`);
  }
  GELEN.sonOkunmamis = okunmamis.length;
  if (!$("#gelen-panel").hidden) gelenListeCiz();
}

function gelenListeCiz() {
  const kap = $("#gelen-liste");
  kap.innerHTML = GELEN.liste.length ? GELEN.liste.map((g, i) => `
    <button type="button" class="gelen-oge${g.okundu ? "" : " yeni"}" data-gelen="${i}">
      <span class="gelen-simge" aria-hidden="true">${GELEN_SIMGE[g.tur] || "🔔"}</span>
      <span class="gelen-yazi"><b>${esc(String(g.baslik || "ÖğretmeniM").replace(/^[^\p{L}\p{N}]+/u, "") || "ÖğretmeniM")}</b>${g.metin ? `<span>${esc(g.metin)}</span>` : ""}</span>
      <small class="gelen-zaman">${g.zaman ? saatYazisi(g.zaman) : ""}</small>
    </button>`).join("") : `<p class="gelen-bos">Henüz bildirim yok.</p>`;
}

function gelenPanelAc() {
  const p = $("#gelen-panel");
  if (!p.hidden) return gelenPanelKapat();
  gelenListeCiz();
  p.hidden = false;
  // açınca okunmamışlar "okundu" sayılır (listede bu açılışta vurgulu kalır)
  const okunmamis = GELEN.liste.filter(g => !g.okundu);
  if (okunmamis.length) setTimeout(() => Bulut.gelenOkundu(girisKisi, okunmamis), 1200);
}
function gelenPanelKapat() { const p = $("#gelen-panel"); if (p) p.hidden = true; }

function gelenAc(g) {
  gelenPanelKapat();
  const ac = g.ac || "";
  if (ac === "mesaj" || ac.startsWith("konusma:")) return typeof bildirimdenAc === "function" && bildirimdenAc(ac);
  if (ac === "ozet" && veliAktif()) return sayfaAc("ozet");
}

function gelenOlaylariniKur() {
  const dugme = $("#gelen-ac");
  if (!dugme) return;
  dugme.addEventListener("click", e => { e.stopPropagation(); gelenPanelAc(); });
  $("#gelen-liste").addEventListener("click", e => { const b = e.target.closest("[data-gelen]"); if (b) gelenAc(GELEN.liste[+b.dataset.gelen]); });
  $("#gelen-hepsi").addEventListener("click", () => { Bulut.gelenOkundu(girisKisi, GELEN.liste.filter(g => !g.okundu)); });
  document.addEventListener("click", e => { if (!e.target.closest(".gelen-kap")) gelenPanelKapat(); });
}

/* ---------- öğrenci ödev bitirince velilere ----------
   Öğrencinin cihazında, veri değiştiren her istekten önce/sonra bitmiş ödevler karşılaştırılır (app.js api()). */
async function odevBittiOnce() {
  try { const m = await Depo.motorAl(); return new Set(m.veri.koleksiyonlar.odevler.filter(o => o.bitti && !o.silindi).map(o => o.id)); }
  catch (_) { return null; }
}
async function odevBittiSonra(once) {
  if (!once || veliAktif() || !OTURUM.ogrenci || typeof girisKisi === "undefined" || !girisKisi || !Bulut.bildirimKuyruga) return;
  let m; try { m = await Depo.motorAl(); } catch (_) { return; }
  const yeniler = m.veri.koleksiyonlar.odevler.filter(o => o.bitti && !o.silindi && !once.has(o.id));
  const ad = (durum.veri.profil && durum.veri.profil.ogrenci_adi) || girisKisi.ad || "Öğrenci";
  for (const o of yeniler) {
    const ders = (m.veri.koleksiyonlar.dersler.find(d => d.id === o.ders_id) || {}).ad || "Ödev";
    Bulut.bildirimKuyruga(girisKisi, { hedef: { ogrenci_velileri: OTURUM.ogrenci }, tur: "odev", ac: "ozet",
      baslik: `✅ ${ad} bir ödevini bitirdi`, metin: `${ders}${o.baslik ? ": " + o.baslik : ""}` }).catch(() => {});
  }
}
