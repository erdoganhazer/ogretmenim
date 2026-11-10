/* ÖğretmeniM 0.23 — Öğrenci raporu görünümü (veli). Rapor motorda (rapor.py) hesaplanır; burada yalnız çizilir.
   RAPOR_ORTAK bölümü Veli Paneli'ne de derlemede gömülür (veli/derle.py). */
/* RAPOR_ORTAK_BAS */
const RAPOR_TUR = { iyi: ["✓", "iyi"], dikkat: ["!", "dikkat"], bilgi: ["i", "bilgi"] };
function raporTarih(s) { const [y, a, g] = String(s).split("-").map(Number); return `${g} ${["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"][a - 1]}`; }
function raporHtml(r, e) {
  if (!r) return `<div class="rp-bos">Rapor hazırlanamadı.</div>`;
  const madde = m => `<div class="rp-m rp-${m.tur}"><span class="rp-rozet">${RAPOR_TUR[m.tur][0]}</span><div>
      <b>${e(m.baslik)}</b>${m.metin ? `<p>${e(m.metin)}</p>` : ""}
      ${m.kanit ? `<small class="rp-kanit">Neye dayanıyor: ${e(m.kanit)}</small>` : ""}
      ${m.oneri ? `<div class="rp-oneri">💡 ${e(m.oneri)}</div>` : ""}</div></div>`;
  const bolum = b => `<section class="rp-bol"><h3>${b.ikon} ${e(b.baslik)}</h3>${b.maddeler.map(madde).join("")}</section>`;
  const aliskanlik = r.bolumler.filter(b => b.baslik !== "Konu durumu"), konu = r.bolumler.filter(b => b.baslik === "Konu durumu");
  const s = r.sayilar, dk = s.calisma_dk;
  if (!r.bolumler.length) return `<div class="rp-ozet">${r.ozet.map(x => `<p>${e(x)}</p>`).join("")}</div>
    <div class="rp-bos">Bu dönemde yorum yapacak kadar kayıt yok. Arın Çalışma Masam'ı, mini oyunları ve Cevap Kontrol'ü kullandıkça rapor dolacak.</div>`;
  return `<div class="rp-ozet">${r.ozet.map(x => `<p>${e(x)}</p>`).join("")}
      <div class="rp-cipler"><span class="rp-cip"><b>${s.biten}/${s.odev}</b> ödev bitti</span>
        <span class="rp-cip"><b>${Math.floor(dk / 60)} sa ${dk % 60} dk</b> kayıtlı çalışma</span>
        <span class="rp-cip"><b>${s.iyi}</b> güçlü yan</span><span class="rp-cip"><b>${s.dikkat}</b> dikkat isteyen</span></div>
      ${(r.kiyas || []).length ? `<div class="rp-kiyas">Önceki döneme göre: ${r.kiyas.map(k => `<span class="rp-k-${k.yon}">${k.yon === "iyi" ? "▲" : "▼"} ${e(k.metin)}</span>`).join("")}</div>` : ""}
    </div>
    ${aliskanlik.length ? `<h2 class="rp-h2">Ödev alışkanlıkları <small>— nasıl, ne zaman, nerede çalışıyor</small></h2><div class="rp-izgara">${aliskanlik.map(bolum).join("")}</div>` : ""}
    ${konu.length ? `<h2 class="rp-h2">Konu durumu <small>— mini oyunlar, Cevap Kontrol ve sınav sonuçları</small></h2><div class="rp-izgara">${konu.map(bolum).join("")}</div>` : ""}
    <p class="rp-not">${r.yetersiz.length ? `Henüz yeterli kayıt olmadığı için yorumlanmayan dersler: ${e(r.yetersiz.join(", "))}. ` : ""}Rapor yalnızca toplanan kayıtlara dayanır; her yorumun altında neye dayandığı yazar. Arın bu raporu görmez.</p>`;
}
function raporUstHtml(r, secili) {
  const d = [["hafta", "Bu hafta"], ["ay", "Son 4 hafta"], ["donem", "Bu dönem"]];
  return `<div class="rp-bas"><div class="rp-donem">${d.map(([k, a]) => `<button type="button" data-rapor-donem="${k}" class="${k === secili ? "sec" : ""}">${a}</button>`).join("")}</div>
    ${r ? `<span class="rp-aralik">${raporTarih(r.bas)} – ${raporTarih(r.bit)}</span>` : ""}
    <button type="button" class="rp-yazdir" data-rapor-yazdir>🖨 Yazdır / PDF</button></div>`;
}
/* RAPOR_ORTAK_BIT */

/* ---------- Arın'ın uygulaması: Ayarlar (veli) › Öğrenci raporu ---------- */
let raporDonem = "hafta";
async function raporCiz() {
  const kap = $("#rapor-ic");
  if (!kap || !veliAktif()) return;
  kap.innerHTML = `<div class="rp-bos">Rapor hazırlanıyor…</div>`;
  try {
    const r = await api("GET", "rapor?donem=" + raporDonem);
    kap.innerHTML = raporUstHtml(r, raporDonem) + raporHtml(r, esc);
  } catch (h) { kap.innerHTML = `<div class="rp-bos">${esc(h.message)}</div>`; }
}
function raporOlaylariniKur() {
  const kap = $("#rapor-ic");
  if (!kap) return;
  kap.addEventListener("click", e => {
    const d = e.target.closest("[data-rapor-donem]");
    if (d) { raporDonem = d.dataset.raporDonem; raporCiz(); }
    if (e.target.closest("[data-rapor-yazdir]")) { document.body.classList.add("rapor-yazdir"); window.print(); setTimeout(() => document.body.classList.remove("rapor-yazdir"), 500); }
  });
}
