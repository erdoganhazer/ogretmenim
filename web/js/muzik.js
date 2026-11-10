/* ÖğretmeniM — mini müzik çalar (0.11)
   Yüklenen MP3'ler listelenir; seçilen parça sürekli döngüde çalar. Oynat/duraklat, durdur, ses.
   Çalma, sayfa değiştirince sürmeye devam eder (ses öğesi sayfalardan bağımsız). */
"use strict";

const muzik = { ses: new Audio(), secili: null, acik: false };
muzik.ses.loop = true;
muzik.ses.preload = "auto";

function muzikTercihOku() {
  try { return JSON.parse(localStorage.getItem("ogretmenim.muzik") || "{}"); } catch (_) { return {}; }
}
function muzikTercihYaz() {
  try { localStorage.setItem("ogretmenim.muzik", JSON.stringify({ secili: muzik.secili, ses: muzik.ses.volume })); } catch (_) { /* önemli değil */ }
}

function aktifMuzikler() {
  return (durum.veri.koleksiyonlar.muzikler || []).filter(m => !m.silindi)
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
}
function seciliMuzik() { return aktifMuzikler().find(m => m.id === muzik.secili) || null; }

function muzikDurumu() {
  if (!muzik.ses.src) return "durdu";
  if (!muzik.ses.paused) return "caliyor";
  return muzik.ses.currentTime > 0 ? "duraklatildi" : "durdu";
}

function muzikCiz() {
  if (!durum.veri) return;
  const liste = aktifMuzikler();
  if (muzik.secili && !seciliMuzik()) {            // çalan parça silindiyse
    muzik.ses.pause(); muzik.secili = null; muzik.ses.removeAttribute("src");
  }
  if (!muzik.secili && liste.length) muzik.secili = liste[0].id;
  const d = muzikDurumu(), m = seciliMuzik();

  const dugme = $("#muzik-ac");
  dugme.classList.toggle("caliyor", d === "caliyor");
  dugme.title = d === "caliyor" && m ? "Çalıyor: " + m.ad : "Müzik";

  if (!muzik.acik) return;
  $("#muzik-simdi").innerHTML = m
    ? `<span class="muzik-dalga${d === "caliyor" ? " oynuyor" : ""}"><i></i><i></i><i></i><i></i></span><b>${esc(m.ad)}</b>
       <span class="muzik-durum">${{ caliyor: "Çalıyor · sürekli tekrar 🔁", duraklatildi: "Duraklatıldı", durdu: "Hazır" }[d]}</span>`
    : `<span class="muzik-durum">Henüz müzik yok. Aşağıdan bir MP3 ekle 🎧</span>`;
  $("#muzik-oynat").textContent = d === "caliyor" ? "⏸" : "▶";
  $("#muzik-oynat").title = d === "caliyor" ? "Duraklat" : "Çal";
  $("#muzik-oynat").disabled = !m;
  $("#muzik-durdur").disabled = !m || d === "durdu";
  $("#muzik-ses").value = Math.round(muzik.ses.volume * 100);
  $("#muzik-liste").innerHTML = liste.map(x => `
    <div class="muzik-parca${x.id === muzik.secili ? " secili" : ""}" data-parca="${x.id}">
      <span class="muzik-parca-ikon">${x.id === muzik.secili && d === "caliyor" ? "🔊" : "🎵"}</span>
      <span class="muzik-parca-ad">${esc(x.ad)}</span>
      <button class="muzik-sil" data-muzik-sil="${x.id}" title="Listeden çıkar">✕</button>
    </div>`).join("");
}

function kaynagiHazirla() {
  const m = seciliMuzik();
  if (!m) return false;
  const adres = m.yol ? "/muzik/k/" + m.id : "/muzik/" + m.dosya;   // yerinden çalınan ya da eski (kopyalanmış) dosya
  if (!muzik.ses.src.endsWith(adres)) muzik.ses.src = adres;
  return true;
}

async function muzikCal() {
  if (!kaynagiHazirla()) return;
  try { await muzik.ses.play(); }
  catch (hata) {
    muzik.ses.pause();
    // Sunucunun nedenini sor (dosya taşınmış / USB çıkarılmış olabilir); yalnız 1 bayt istenir
    let neden = "";
    try { const r = await fetch(muzik.ses.src, { headers: { Range: "bytes=0-0" } }); if (!r.ok) neden = ((await r.json()).hata) || ""; } catch (_) { /* yok */ }
    bildir("🎵 Çalınamadı: " + (neden || "dosya açılamadı. Yerinden taşınmış ya da USB bellek çıkarılmış olabilir."), true);
  }
  muzikCiz();
}
function muzikDuraklat() { muzik.ses.pause(); muzikCiz(); }
function muzikDurdur() {
  muzik.ses.pause();
  if (muzik.ses.src) muzik.ses.currentTime = 0;
  muzikCiz();
}
function muzikOynatDuraklat() { muzikDurumu() === "caliyor" ? muzikDuraklat() : muzikCal(); }

function parcaSec(id) {
  if (id === muzik.secili) return muzikOynatDuraklat();
  muzik.ses.pause();
  muzik.secili = id;
  muzik.ses.removeAttribute("src");
  muzikTercihYaz();
  muzikCal();
}

/* ---------- MP3 ekle: bilgisayardaki klasörlerde gez, dosya yerinden çalınır (kopyalanmaz) ---------- */
const gozat = { yol: null };
const mgBoyut = b => b >= 1073741824 ? (b / 1073741824).toFixed(1).replace(".", ",") + " GB" : Math.max(1, Math.round(b / 1048576)) + " MB";

async function muzikGozat(yol) {
  const kap = $("#muzik-gozat");
  kap.hidden = false;
  $("#muzik-ekle-ac").hidden = true;
  let g;
  try { g = await api("GET", "muzik/gozat" + (yol ? "?yol=" + encodeURIComponent(yol) : "")); }
  catch (hata) { bildir(hata.message, true); if (!gozat.yol) return muzikGozatKapat(); return; }
  gozat.yol = g.yol;
  const ekli = new Set(aktifMuzikler().filter(m => m.yol).map(m => m.yol));
  const kisa = g.yol.replace(/^\/home\/[^/]+/, "~");
  kap.innerHTML = `<div class="mg-ust"><b>📂 ${esc(kisa)}</b><button class="muzik-sil" data-mg-kapat title="Kapat">✕</button></div>
    <div class="mg-kokler">${g.kokler.map(k => `<button class="mg-kok" data-mg-yol="${esc(k.yol)}">${k.ad.startsWith("Ev") ? "🏠" : "💾"} ${esc(k.ad)}</button>`).join("")}</div>
    <div class="mg-liste">
      ${g.ust ? `<button class="mg-oge klasor" data-mg-yol="${esc(g.ust)}">⬆️ Üst klasör</button>` : ""}
      ${g.klasorler.map(k => `<button class="mg-oge klasor" data-mg-yol="${esc(g.yol + "/" + k)}">📁 ${esc(k)}</button>`).join("")}
      ${g.dosyalar.map(d => {
        const tam = g.yol + "/" + d.ad;
        return `<button class="mg-oge dosya${ekli.has(tam) ? " ekli" : ""}" data-mg-dosya="${esc(tam)}" ${ekli.has(tam) ? "disabled" : ""}>
          🎵 <span>${esc(d.ad)}</span><small>${ekli.has(tam) ? "✓ listede" : mgBoyut(d.boyut)}</small></button>`;
      }).join("")}
      ${!g.klasorler.length && !g.dosyalar.length ? `<div class="mg-bos">Bu klasörde MP3 yok.</div>` : ""}
    </div>
    <div class="mg-not">Dosya kopyalanmaz; bulunduğu yerden çalınır.</div>`;
}
function muzikGozatKapat() {
  $("#muzik-gozat").hidden = true;
  $("#muzik-ekle-ac").hidden = false;
}
async function muzikEkle(yol) {
  try {
    const j = await api("POST", "muzik/ekle", { yol });
    if (!durum.veri.koleksiyonlar.muzikler.some(m => m.id === j.id)) durum.veri.koleksiyonlar.muzikler.push(j);
    if (!muzik.secili) muzik.secili = j.id;
    bildir(`🎵 "${j.ad}" eklendi`);
    muzikCiz();
    muzikGozat(gozat.yol);
  } catch (hata) { bildir(hata.message, true); }
}

async function muzikSil(id) {
  const m = aktifMuzikler().find(x => x.id === id);
  if (!m || !confirm(`"${m.ad}" listeden çıkarılsın mı?`)) return;
  try {
    await api("DELETE", "muzik/" + id);
    m.silindi = true;
    muzikCiz();
  } catch (hata) { bildir(hata.message, true); }
}

function muzikPaneliAc(ac = !muzik.acik) {
  muzik.acik = ac;
  $("#muzik-panel").hidden = !ac;
  $("#muzik-ac").classList.toggle("acik", ac);
  muzikCiz();
}

function muzikOlaylariniKur() {
  const t = muzikTercihOku();
  if (typeof t.ses === "number") muzik.ses.volume = Math.min(1, Math.max(0, t.ses));
  else muzik.ses.volume = 0.6;
  if (t.secili) muzik.secili = t.secili;

  $("#muzik-ac").addEventListener("click", e => { e.stopPropagation(); muzikPaneliAc(); });
  $("#muzik-panel").addEventListener("click", e => e.stopPropagation());
  document.addEventListener("click", () => { if (muzik.acik) muzikPaneliAc(false); });
  $("#muzik-oynat").addEventListener("click", muzikOynatDuraklat);
  $("#muzik-durdur").addEventListener("click", muzikDurdur);
  $("#muzik-ses").addEventListener("input", e => { muzik.ses.volume = e.target.value / 100; muzikTercihYaz(); });
  $("#muzik-ekle-ac").addEventListener("click", () => muzikGozat(gozat.yol));
  $("#muzik-gozat").addEventListener("click", e => {
    if (e.target.closest("[data-mg-kapat]")) return muzikGozatKapat();
    const y = e.target.closest("[data-mg-yol]");
    if (y) return muzikGozat(y.dataset.mgYol);
    const d = e.target.closest("[data-mg-dosya]");
    if (d && !d.disabled) muzikEkle(d.dataset.mgDosya);
  });
  $("#muzik-liste").addEventListener("click", e => {
    const sil = e.target.closest("[data-muzik-sil]");
    if (sil) return muzikSil(sil.dataset.muzikSil);
    const p = e.target.closest("[data-parca]");
    if (p) parcaSec(p.dataset.parca);
  });
  ["play", "pause", "ended"].forEach(o => muzik.ses.addEventListener(o, muzikCiz));
  muzik.ses.addEventListener("error", muzikCiz);
}
