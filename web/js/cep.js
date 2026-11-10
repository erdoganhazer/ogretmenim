/* ÖğretmeniM — Cep Defterim: Arın'ın kendi küçük, renkli notları */
"use strict";

const CEP_RENKLERI = { sari: "#FFE08A", mavi: "#A8D8FF", yesil: "#B9F2C0", pembe: "#FFC4DD", mor: "#D9C8FF", turuncu: "#FFD0A1" };
const cep = { duzenlenen: null };

function cepNotlari() {
  return durum.veri.koleksiyonlar.cep_notlari.filter(n => !n.silindi)
    .sort((a, b) => (b.sabit === true) - (a.sabit === true) || b.degisme.localeCompare(a.degisme));
}

function cepCiz() {
  const kap = $("#cep-izgara");
  if (!kap || !durum.veri) return;
  const notlar = cepNotlari();
  let html = "";
  if (cep.duzenlenen && !cep.duzenlenen.id) html += cepEditoru(cep.duzenlenen);
  html += notlar.map(n => cep.duzenlenen && cep.duzenlenen.id === n.id ? cepEditoru(cep.duzenlenen) : `
    <div class="cep-not${n.sabit ? " sabit" : ""}" style="--kagit:${CEP_RENKLERI[n.renk] || CEP_RENKLERI.sari}" data-cep="${n.id}">
      <div class="cep-ust">
        <button class="cep-igne" data-cep-islem="sabitle" title="${n.sabit ? "İğneyi çıkar" : "En üste iğnele"}">📌</button>
        <span class="cep-tarih">${new Date(n.degisme).getDate()} ${AYLAR[new Date(n.degisme).getMonth()]}</span>
        <button class="cep-sil" data-cep-islem="sil" title="Sil">✕</button>
      </div>
      <div class="cep-metin" data-cep-islem="duzenle" title="Düzenlemek için tıkla">${esc(n.metin).replace(/\n/g, "<br>")}</div>
    </div>`).join("");
  if (!notlar.length && !cep.duzenlenen) html = `<div class="cep-bos">📒 Cep defterin boş.<br><small>"＋ Yeni not" ile ilk notunu yaz. Mesela: "Cuma günü beden eğitimi kıyafetimi unutma!"</small></div>`;
  kap.innerHTML = html;
  const kutu = $(".cep-kutu", kap);
  if (kutu) { kutu.focus(); kutu.setSelectionRange(kutu.value.length, kutu.value.length); }
}

function cepEditoru(d) {
  return `<div class="cep-not duzenleniyor" style="--kagit:${CEP_RENKLERI[d.renk] || CEP_RENKLERI.sari}">
    <textarea class="cep-kutu" maxlength="500" placeholder="Aklından geçeni yaz…">${esc(d.metin || "")}</textarea>
    <div class="cep-renkler">${Object.entries(CEP_RENKLERI).map(([ad, renk]) =>
      `<button class="cep-renk${d.renk === ad ? " secili" : ""}" data-cep-renk="${ad}" style="background:${renk}" title="${ad}"></button>`).join("")}</div>
    <div class="cep-dugmeler">
      <button class="dugme kucuk" data-cep-islem="vazgec">Vazgeç</button>
      <button class="dugme kucuk ana-dugme" data-cep-islem="kaydet">Kaydet</button>
    </div>
  </div>`;
}

async function cepIslemi(islem, id) {
  const oku = () => { const k = $(".cep-kutu"); if (k && cep.duzenlenen) cep.duzenlenen.metin = k.value; };
  try {
    if (islem === "yeni") {
      if (cep.duzenlenen) return;
      cep.duzenlenen = { metin: "", renk: Object.keys(CEP_RENKLERI)[cepNotlari().length % 6] };
      return cepCiz();
    }
    if (islem === "duzenle") {
      if (cep.duzenlenen) return;
      const n = durum.veri.koleksiyonlar.cep_notlari.find(x => x.id === id);
      cep.duzenlenen = { id, metin: n.metin, renk: n.renk || "sari" };
      return cepCiz();
    }
    if (islem === "vazgec") { cep.duzenlenen = null; return cepCiz(); }
    if (islem === "kaydet") {
      oku();
      const d = cep.duzenlenen;
      if (!d.metin.trim()) return bildir("Boş not kaydedilmez, bir şeyler yaz 🙂", true);
      if (d.id) Object.assign(durum.veri.koleksiyonlar.cep_notlari.find(x => x.id === d.id),
                              await api("PUT", "k/cep_notlari/" + d.id, { metin: d.metin.trim(), renk: d.renk }));
      else durum.veri.koleksiyonlar.cep_notlari.push(await api("POST", "k/cep_notlari", { metin: d.metin.trim(), renk: d.renk, sabit: false }));
      cep.duzenlenen = null;
      bildir("Cep defterine yazıldı ✏️");
      return cepCiz();
    }
    const n = durum.veri.koleksiyonlar.cep_notlari.find(x => x.id === id);
    if (islem === "sabitle") { Object.assign(n, await api("PUT", "k/cep_notlari/" + id, { sabit: !n.sabit })); return cepCiz(); }
    if (islem === "sil") {
      if (!confirm("Bu not silinsin mi?")) return;
      await api("DELETE", "k/cep_notlari/" + id); n.silindi = true; cepCiz();
    }
  } catch (hata) { bildir(hata.message, true); }
}

function cepOlaylariniKur() {
  $("#cep-ekle").addEventListener("click", () => cepIslemi("yeni"));
  $("#cep-izgara").addEventListener("click", e => {
    const renk = e.target.closest("[data-cep-renk]");
    if (renk) {
      const k = $(".cep-kutu"); if (k) cep.duzenlenen.metin = k.value;
      cep.duzenlenen.renk = renk.dataset.cepRenk; return cepCiz();
    }
    const is = e.target.closest("[data-cep-islem]");
    if (is) cepIslemi(is.dataset.cepIslem, (is.closest("[data-cep]") || {}).dataset?.cep);
  });
}
