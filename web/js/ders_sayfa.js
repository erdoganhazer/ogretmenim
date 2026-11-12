/* ÖğretmeniM web — ders sayfası (Derslerim › ders).
   Öğrenci: sınav tarihleri (notsuz), kaynaklar, haftalık saatleri, yazılıya hazırlan, Notlarım (yazar).
   Veli: aynısı + notlar ve ortalama; Notlarım'ı okur, değiştiremez (kural: ders_notlari öğrencinin). */
"use strict";

const DS = { id: null, duzenlenen: null };
const DS_GUN_KISA = ["", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

function dersSayfasiAc(id) {
  DS.id = id; DS.duzenlenen = null;
  sayfaAc("ders");
}
function dersNotlari(id) {
  return (durum.veri.koleksiyonlar.ders_notlari || []).filter(n => !n.silindi && n.ders_id === id)
    .sort((a, b) => (b.onemli ? 1 : 0) - (a.onemli ? 1 : 0) || String(b.degisme).localeCompare(String(a.degisme)));
}
/* Yazılı hazırlık paketinde bu dersin içeriği var mı (Arın'a atanmış paket) */
function dersYaziliKodu(ders) {
  if (typeof hz === "undefined" || !hz.yazililar.length) return null;
  const ad = (ders.ad || "").toLocaleLowerCase("tr");
  const y = hz.yazililar.find(y => { const a = HZ_DERS_ANAHTAR[y.ders] || y.ders; return HZ_DERS_TAM.has(y.ders) ? ad === a : ad.startsWith(a); });
  return y ? "y1-" + y.ders : null;
}

function dersSayfasiCiz() {
  const kap = $("#ders-sayfa");
  const d = DS.id && dersBul(DS.id);
  if (!kap) return;
  if (!d) { kap.innerHTML = `<div class="panel bos-durum">Ders bulunamadı.</div>`; return; }
  const veli = veliAktif(), bugun = tarihStr(new Date());
  const sinavlar = aktifEtkinlikler().filter(e => e.tur === "sinav" && e.ders_id === d.id).sort((a, b) => a.tarih.localeCompare(b.tarih));
  const yaklasan = sinavlar.filter(s => s.tarih >= bugun), gecmis = sinavlar.filter(s => s.tarih < bugun).reverse();
  const notlu = sinavlar.filter(s => typeof s.puan === "number");
  const ort = notlu.length ? notlu.reduce((t, s) => t + s.puan, 0) / notlu.length : null;
  const { saatler, hucreler } = durum.veri.ders_programi;
  const saatList = Object.entries(hucreler).filter(([, v]) => v === d.id).map(([k]) => k.split("-").map(Number))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(([g, s]) => `${DS_GUN_KISA[g]} ${s + 1}. ders${saatler[s] ? ` <small>${saatler[s].bas}</small>` : ""}`);
  const tarihY = t => { const x = strTarih(t); return `${x.getDate()} ${AYLAR[x.getMonth()]} ${GUNLER[x.getDay()]}`; };
  const sinavSatir = s => `<li class="ds-sinav${veli ? " tikla" : ""}" data-id="${s.id}"><span>${tarihY(s.tarih)}${s.bas ? " · " + esc(s.bas) : ""}</span>
      <span class="ds-tur">${SINAV_TURLERI[s.sinav_turu] || "Yazılı"}</span>
      ${veli ? (typeof s.puan === "number" ? `<span class="not-rozet ${notSinifi(s.puan)}">${s.puan}</span>` : `<span class="not-bekle">${s.tarih >= bugun ? "yaklaşıyor" : "not girilmedi"}</span>`) : ""}</li>`;
  const yk = dersYaziliKodu(d);
  const notlar = dersNotlari(d.id), dz = DS.duzenlenen;

  kap.innerHTML = `
    <div class="ds-ust" style="--renk:${esc(d.renk)}">
      <h1 class="sayfa-baslik">${esc(d.ad)}</h1>
      <div class="ds-ozet">${saatList.length ? `Haftada ${saatList.length} saat` : "Programda yok"}${veli && ort !== null ? ` · ortalama <b class="${notSinifi(ort)}">${ortYaz(ort)}</b>` : ""}</div>
      ${yk ? `<button class="dugme ana-dugme" data-yazili="${yk}">🎯 Yazılıya hazırlan</button>` : ""}
    </div>
    <div class="ds-izgara">
      <div class="panel"><div class="panel-baslik">Sınavlar ${veli ? `<button class="dugme kucuk" data-ds-sinav>＋ Sınav</button>` : ""}</div>
        ${yaklasan.length ? `<ul class="ds-liste">${yaklasan.map(sinavSatir).join("")}</ul>` : `<p class="gun-bos">Yaklaşan sınav yok.</p>`}
        ${gecmis.length ? `<details class="ds-gecmis"><summary>Geçmiş sınavlar (${gecmis.length})</summary><ul class="ds-liste">${gecmis.map(sinavSatir).join("")}</ul></details>` : ""}
      </div>
      <div class="panel"><div class="panel-baslik">Kaynaklar</div>
        ${(d.kaynaklar || []).length ? `<ul class="ds-kaynak">${d.kaynaklar.map(k => `<li>📘 ${esc(k)}</li>`).join("")}</ul>` : `<p class="gun-bos">Ödevlere kaynak girildikçe burada toplanır.</p>`}
        <div class="panel-baslik alt-baslik">Ders saatleri</div>
        ${saatList.length ? `<div class="ds-saatler">${saatList.map(x => `<span>${x}</span>`).join("")}</div>` : `<p class="gun-bos">Ders programında yok.</p>`}
      </div>
    </div>
    <div class="panel ds-notlarim">
      <div class="panel-baslik">📝 ${veli ? "Notları" : "Notlarım"} <span class="panel-alt">${veli ? "Öğrencinin bu ders için yazdıkları · yalnız okunur" : "Derste önemli bulduklarını kendi cümlelerinle yaz"}</span>
        ${!veli && !dz ? `<button class="dugme ana-dugme kucuk" data-ds-not="yeni">＋ Not</button>` : ""}</div>
      ${dz ? `<form class="ds-not-form" id="ds-not-form" autocomplete="off">
          <input name="baslik" maxlength="120" placeholder="Başlık (ör. Kesirlerde sadeleştirme)" value="${esc(dz.baslik || "")}">
          <textarea name="metin" rows="8" maxlength="5000" placeholder="Notun…">${esc(dz.metin || "")}</textarea>
          <div class="ds-not-alt"><label class="anahtar"><input type="checkbox" name="onemli" ${dz.onemli ? "checked" : ""}> <span>⭐ Önemli</span></label>
            <span class="bosluk"></span>${dz.id ? `<button type="button" class="dugme sil" data-ds-not="sil">Sil</button>` : ""}
            <button type="button" class="dugme" data-ds-not="vazgec">Vazgeç</button><button class="dugme ana-dugme">Kaydet</button></div>
        </form>` : ""}
      ${notlar.length ? `<div class="ds-notlar">${notlar.map(n => `<article class="ds-not${n.onemli ? " onemli" : ""}" ${veli ? "" : `data-ds-not-ac="${n.id}"`}>
          <h4>${n.onemli ? "⭐ " : ""}${esc(n.baslik || "Not")}</h4><p>${esc(n.metin || "").replace(/\n/g, "<br>")}</p>
          <small>${tarihYaz(String(n.degisme || n.olusturma).slice(0, 10))}</small></article>`).join("")}</div>`
        : dz ? "" : `<p class="gun-bos">${veli ? "Henüz not yazılmamış." : "Henüz notun yok. Derste öğrendiğin önemli bir şeyi yaz; yazılıdan önce buradan tekrar edersin."}</p>`}
    </div>`;
}

async function dersNotuKaydet(e) {
  e.preventDefault();
  const f = e.target, govde = { ders_id: DS.id, baslik: f.elements.baslik.value.trim(), metin: f.elements.metin.value.trim(), onemli: f.elements.onemli.checked };
  if (!govde.baslik && !govde.metin) return bildir("Boş not kaydedilemez", true);
  try {
    if (DS.duzenlenen.id) await api("PUT", "k/ders_notlari/" + DS.duzenlenen.id, govde);
    else await api("POST", "k/ders_notlari", govde);
    durum.veri = await api("GET", "veri");
    DS.duzenlenen = null; bildir("Not kaydedildi ✓"); dersSayfasiCiz();
  } catch (h) { bildir(h.message, true); }
}

function dersSayfaOlaylariniKur() {
  $("#ders-sayfa").addEventListener("click", async e => {
    const n = e.target.closest("[data-ds-not]");
    if (n) {
      const is = n.dataset.dsNot;
      if (is === "yeni") { DS.duzenlenen = { baslik: "", metin: "", onemli: false }; dersSayfasiCiz(); $("#ds-not-form [name=baslik]").focus(); }
      else if (is === "vazgec") { DS.duzenlenen = null; dersSayfasiCiz(); }
      else if (is === "sil" && confirm("Bu not silinsin mi?")) {
        try { await api("DELETE", "k/ders_notlari/" + DS.duzenlenen.id); durum.veri = await api("GET", "veri"); DS.duzenlenen = null; dersSayfasiCiz(); } catch (h) { bildir(h.message, true); }
      }
      return;
    }
    const ac = e.target.closest("[data-ds-not-ac]");
    if (ac && !DS.duzenlenen) { const k = kayitBul("ders_notlari", ac.dataset.dsNotAc); if (k) { DS.duzenlenen = { ...k }; dersSayfasiCiz(); } return; }
    if (e.target.closest("[data-ds-sinav]")) return pencereAc("sinav", null);
    const s = veliAktif() && e.target.closest(".ds-sinav.tikla");
    if (s) { const k = kayitBul("etkinlikler", s.dataset.id); if (k) pencereAc("sinav", k); }
  });
  $("#ders-sayfa").addEventListener("submit", e => { if (e.target.id === "ds-not-form") dersNotuKaydet(e); });
}
