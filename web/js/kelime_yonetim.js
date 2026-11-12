/* 0.33 Kelime listeleri — Veli Paneli'ndeki "Kelimeler" sekmesinin uygulama içindeki karşılığı (Ayarlar › veli).
   Defter aç/düzenle/sil, kelime ekle/düzenle/sil, toplu ekle (kelime = anlam = grup). Yalnız veli şifresiyle görünür. */
const KY = { secili: null, duzenlenen: null, toplu: false, defterForm: null, sonGrup: "" };
const KY_DIL = { en: "İngilizce", de: "Almanca", fr: "Fransızca", tr: "Türkçe", diger: "Diğer" };

function kySatirlar(metin, dil, grup) {
  return metin.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(s => {
    const p = s.split(/\s*(?:=|\t|;| - | – )\s*/);
    if (p.length < 2 || !p[0] || !p[1]) return null;
    const k = { kelime: p[0], anlam: p[1], grup: p[2] || grup, emoji: p[3] || "" };
    if (dil === "de") { const m = /^(der|die|das)\s+(.+)$/i.exec(k.kelime); if (m) { k.artikel = m[1].toLowerCase(); k.kelime = m[2]; } }
    return k;
  });
}

async function kelimeYonetimCiz() {
  const kap = $("#kelime-yonetim");
  if (!kap || !veliAktif()) return;
  let def, kel, oz;
  try {
    [def, kel, oz] = await Promise.all([api("GET", "k/kelime_defterleri"), api("GET", "k/kelimeler"), api("GET", "kelime/ozet").catch(() => null)]);
  } catch (h) { kap.innerHTML = `<div class="gl-bos">Kelime listeleri alınamadı: ${esc(h.message)}</div>`; return; }
  def.sort((a, b) => (a.sira || 0) - (b.sira || 0) || String(a.olusturma).localeCompare(String(b.olusturma)));
  if (!KY.secili || !def.some(x => x.id === KY.secili)) KY.secili = def[0] ? def[0].id : null;
  const dft = def.find(x => x.id === KY.secili);
  const istat = {}; for (const x of ((oz || {}).defterler || [])) for (const k of x.kelimeler) istat[k.id] = k;
  const ad = esc((durum.veri && durum.veri.profil && durum.veri.profil.ogrenci_adi) || "Arın");

  const sol = `<div class="kd-p-defterler">${def.map(x => {
      const n = kel.filter(k => k.defter_id === x.id).length;
      return `<button type="button" class="kd-p-defter${x.id === KY.secili ? " secili" : ""}" style="--r:${esc(x.renk || "#6366F1")}" data-ky-sec="${esc(x.id)}"><span>${esc(x.simge || "📘")}</span><div><b>${esc(x.ad)}</b><small>${n} kelime · ${KY_DIL[x.dil] || ""}</small></div></button>`;
    }).join("")}
    <button type="button" class="dugme" data-ky-yeni-defter>➕ Yeni defter</button></div>`;
  let sag;
  if (KY.defterForm) {
    const f = KY.defterForm === "yeni" ? null : def.find(x => x.id === KY.defterForm);
    sag = `<h3 class="ky-baslik">${f ? "Defteri düzenle" : "Yeni kelime defteri"}</h3>
      <form id="ky-defter-form" class="kd-p-form ky-defter-form" autocomplete="off">
        <label class="genis">Defter adı<input name="ad" required maxlength="40" value="${esc(f ? f.ad : "")}" placeholder="Örn. Unit 3, Hayvanlar"></label>
        <label>Dil<select name="dil">${Object.entries(KY_DIL).map(([k, v]) => `<option value="${k}" ${(f ? f.dil : "en") === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label>Simge<input name="simge" maxlength="8" value="${esc(f ? f.simge || "" : "📘")}"></label>
        <label class="genis">Açıklama<input name="aciklama" maxlength="160" value="${esc(f ? f.aciklama || "" : "")}"></label>
        <label>Renk<input name="renk" type="color" value="${esc(f ? f.renk || "#6366F1" : "#6366F1")}"></label>
        <span class="ky-dugmeler"><button type="button" class="dugme" data-ky-vazgec>Vazgeç</button><button class="dugme ana-dugme">Kaydet</button></span>
      </form>${f ? `<button type="button" class="dugme sil" data-ky-defter-sil="${esc(f.id)}">🗑 Defteri sil</button>` : ""}`;
  } else if (!dft) {
    sag = `<div class="gl-bos">Henüz defter yok. “Yeni defter” ile başla.</div>`;
  } else {
    const ks = kel.filter(k => k.defter_id === dft.id);
    const gruplar = [...new Set(ks.map(k => k.grup || ""))];
    const w = KY.duzenlenen ? ks.find(k => k.id === KY.duzenlenen) : null;
    const dur = s => !s || !s.deneme ? `<span class="ky-yeni">yeni</span>` : s.kutu >= 4 ? `<span class="ky-ogrendi">✓ öğrendi</span>` : `<span class="ky-calisiyor">çalışıyor</span>`;
    const ogr = ks.filter(k => (istat[k.id] || {}).kutu >= 4).length;
    sag = `<div class="kd-p-ust"><h3>${esc(dft.simge || "📘")} ${esc(dft.ad)} <small>${KY_DIL[dft.dil] || ""} · ${ks.length} kelime · ${ad} ${ogr} kelimeyi öğrendi</small></h3>
        <button type="button" class="dugme kucuk" data-ky-defter-duzenle="${esc(dft.id)}">⚙️ Defteri düzenle</button>
        <button type="button" class="dugme kucuk" data-ky-toplu>${KY.toplu ? "Tek tek ekle" : "📥 Toplu ekle"}</button></div>
      ${dft.aciklama ? `<p class="panel-not">${esc(dft.aciklama)}</p>` : ""}
      ${KY.toplu ? `<form id="ky-toplu" class="ky-toplu" autocomplete="off">
          <p class="panel-not">Her satıra bir kelime: <code>kelime = anlam</code>${dft.dil === "de" ? " (isimlerde artikel başta: <code>der Tisch = masa</code>)" : ""}. İstersen sonuna grup: <code>apple = elma = Fruits</code>. Excel'den iki sütun yapıştırabilirsin. Olan kelimenin anlamı güncellenir.</p>
          <label class="ky-grup">Grup <input name="grup" maxlength="40" list="ky-gruplar"></label>
          <textarea name="metin" rows="10" placeholder="${dft.dil === "de" ? "der Apfel = elma" : "apple = elma"}"></textarea>
          <span class="ky-dugmeler"><button class="dugme ana-dugme">Ekle</button><span id="ky-onizleme" class="panel-not"></span></span></form>`
      : `<form id="ky-kelime" class="kd-p-form" autocomplete="off">
          ${dft.dil === "de" ? `<label>Artikel<select name="artikel"><option value="">—</option>${["der", "die", "das"].map(a => `<option ${w && w.artikel === a ? "selected" : ""}>${a}</option>`).join("")}</select></label>` : ""}
          <label>Kelime<input name="kelime" required maxlength="60" value="${esc(w ? w.kelime : "")}"></label>
          <label>Anlamı<input name="anlam" required maxlength="80" value="${esc(w ? w.anlam : "")}"></label>
          <label>Emoji<input name="emoji" maxlength="8" value="${esc(w ? w.emoji || "" : "")}"></label>
          <label>Grup<input name="grup" maxlength="40" list="ky-gruplar" value="${esc(w ? w.grup || "" : KY.sonGrup || "")}"></label>
          <label class="genis">Örnek cümle<input name="ornek" maxlength="200" value="${esc(w ? w.ornek || "" : "")}"></label>
          <span class="ky-dugmeler">${w ? `<button type="button" class="dugme" data-ky-vazgec>Vazgeç</button>` : ""}<button class="dugme ana-dugme">${w ? "Kaydet" : "➕ Ekle"}</button></span>
        </form>`}
      <datalist id="ky-gruplar">${gruplar.filter(Boolean).map(g => `<option value="${esc(g)}">`).join("")}</datalist>
      <div class="ky-tablo-kap"><table class="kd-p-tablo"><thead><tr><th></th><th>Kelime</th><th>Anlamı</th><th>Durum</th><th>Doğruluk</th><th></th></tr></thead><tbody>
      ${gruplar.map(g => `<tr class="kd-p-grup"><td colspan="6">${esc(g || "Grupsuz")}</td></tr>${ks.filter(k => (k.grup || "") === g).map(k => {
        const s = istat[k.id];
        return `<tr><td>${esc(k.emoji || "")}</td><td><b>${esc((k.artikel ? k.artikel + " " : "") + k.kelime)}</b>${k.ornek ? `<br><small>${esc(k.ornek)}</small>` : ""}</td><td>${esc(k.anlam)}</td>
          <td>${dur(s)}</td><td>${s && s.deneme ? `%${s.oran} <small>· ${s.deneme} cevap</small>` : "—"}</td>
          <td class="ky-islem"><button type="button" class="dugme kucuk" data-ky-duzenle="${esc(k.id)}" title="Düzenle">✏️</button> <button type="button" class="dugme kucuk" data-ky-sil="${esc(k.id)}" title="Sil">🗑</button></td></tr>`;
      }).join("")}`).join("") || `<tr><td colspan="6" class="gl-bos">Bu defterde henüz kelime yok.</td></tr>`}
      </tbody></table></div>`;
  }
  kap.innerHTML = `<div class="kd-p">${sol}<div class="ky-sag">${sag}</div></div>`;

  const yenile = async () => { await kelimeYonetimCiz(); if (typeof kdYukle === "function") kdYukle(); };
  const hata = h => bildir(h.message, true);
  $$("[data-ky-sec]", kap).forEach(b => b.onclick = () => { KY.secili = b.dataset.kySec; KY.duzenlenen = null; KY.defterForm = null; kelimeYonetimCiz(); });
  const yd = $("[data-ky-yeni-defter]", kap); if (yd) yd.onclick = () => { KY.defterForm = "yeni"; kelimeYonetimCiz(); };
  $$("[data-ky-vazgec]", kap).forEach(b => b.onclick = () => { KY.defterForm = null; KY.duzenlenen = null; kelimeYonetimCiz(); });
  const dd = $("[data-ky-defter-duzenle]", kap); if (dd) dd.onclick = () => { KY.defterForm = dd.dataset.kyDefterDuzenle; kelimeYonetimCiz(); };
  const tp = $("[data-ky-toplu]", kap); if (tp) tp.onclick = () => { KY.toplu = !KY.toplu; KY.duzenlenen = null; kelimeYonetimCiz(); };
  $$("[data-ky-duzenle]", kap).forEach(b => b.onclick = async () => { KY.duzenlenen = b.dataset.kyDuzenle; KY.toplu = false; await kelimeYonetimCiz(); const i = $("#ky-kelime [name=kelime]"); if (i) { i.focus(); i.scrollIntoView({ block: "center" }); } });
  $$("[data-ky-sil]", kap).forEach(b => b.onclick = async () => {
    const k = kel.find(x => x.id === b.dataset.kySil);
    if (!k || !confirm(`“${k.kelime}” silinsin mi?`)) return;
    try { await api("DELETE", "k/kelimeler/" + k.id); bildir("Kelime silindi"); await yenile(); } catch (h) { hata(h); }
  });
  const ds = $("[data-ky-defter-sil]", kap); if (ds) ds.onclick = async () => {
    const f = def.find(x => x.id === ds.dataset.kyDefterSil);
    if (!f || !confirm(`“${f.ad}” defteri silinsin mi? Kelimeleri de görünmez olur.`)) return;
    try { await api("DELETE", "k/kelime_defterleri/" + f.id); KY.defterForm = null; KY.secili = null; bildir("Defter silindi"); await yenile(); } catch (h) { hata(h); }
  };
  const df = $("#ky-defter-form"); if (df) df.onsubmit = async e => {
    e.preventDefault(); const al = a => df.elements[a].value.trim();
    const kayit = { ad: al("ad"), dil: al("dil"), simge: al("simge") || "📘", renk: al("renk"), aciklama: al("aciklama") };
    if (!kayit.ad) return bildir("Defter adı yaz", true);
    try {
      if (KY.defterForm === "yeni") { const y = await api("POST", "k/kelime_defterleri", { ...kayit, sira: def.length }); KY.secili = y.id; bildir("Defter açıldı"); }
      else { await api("PUT", "k/kelime_defterleri/" + KY.defterForm, kayit); bildir("Defter kaydedildi"); }
      KY.defterForm = null; await yenile();
    } catch (h) { hata(h); }
  };
  const kf = $("#ky-kelime"); if (kf) kf.onsubmit = async e => {
    e.preventDefault(); const al = a => (kf.elements[a] ? kf.elements[a].value.trim() : "");
    const kayit = { defter_id: dft.id, kelime: al("kelime"), anlam: al("anlam"), emoji: al("emoji"), grup: al("grup"), ornek: al("ornek") };
    if (dft.dil === "de") { kayit.artikel = al("artikel"); const m = /^(der|die|das)\s+(.+)$/i.exec(kayit.kelime); if (m) { kayit.artikel = m[1].toLowerCase(); kayit.kelime = m[2]; } }
    if (!kayit.kelime || !kayit.anlam) return bildir("Kelime ve anlamı yaz", true);
    const w = KY.duzenlenen;
    try {
      if (w) await api("PUT", "k/kelimeler/" + w, kayit); else await api("POST", "k/kelimeler", kayit);
      KY.duzenlenen = null; KY.sonGrup = kayit.grup;
      bildir(w ? "Kelime kaydedildi" : `“${kayit.kelime}” eklendi`);
      await yenile();
      const i = $("#ky-kelime [name=kelime]"); if (i) i.focus();
    } catch (h) { hata(h); }
  };
  const tf = $("#ky-toplu"); if (tf) {
    const oniz = () => {
      const c = kySatirlar(tf.elements.metin.value, dft.dil, tf.elements.grup.value.trim()), h = c.filter(x => !x).length;
      $("#ky-onizleme").textContent = c.length ? `${c.length - h} kelime eklenecek${h ? ` · ${h} satır anlaşılamadı` : ""}` : "";
    };
    tf.elements.metin.oninput = oniz; tf.elements.grup.oninput = oniz;
    tf.onsubmit = async e => {
      e.preventDefault();
      const kelimeler = kySatirlar(tf.elements.metin.value, dft.dil, tf.elements.grup.value.trim()).filter(Boolean);
      if (!kelimeler.length) return bildir("Eklenecek satır yok", true);
      try {
        const s = await api("POST", "kelime/toplu", { defter_id: dft.id, kelimeler });
        KY.toplu = false;
        bildir(`${s.eklenen} kelime eklendi${s.guncellenen ? `, ${s.guncellenen} güncellendi` : ""}`);
        await yenile();
      } catch (h) { hata(h); }
    };
  }
}
function kelimeYonetimOlaylariniKur() {
  const b = $("#kelime-yonetim-yenile"); if (b) b.addEventListener("click", kelimeYonetimCiz);
}
